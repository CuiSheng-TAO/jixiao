import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getActiveCycle } from "@/lib/session";
import { sanitizeText } from "@/lib/validate";

type ImportItem = {
  name: string;
  content: string;
  sourceUrl?: string;
};

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "仅管理员可执行批量导入" }, { status: 403 });
    }

    const cycle = await getActiveCycle();
    if (!cycle) {
      return NextResponse.json({ error: "No active cycle" }, { status: 400 });
    }

    const items: ImportItem[] = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "请提供导入数据数组" }, { status: 400 });
    }

    // Fetch all users for name matching
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true },
    });

    const userMap = new Map<string, string>();
    for (const u of allUsers) {
      userMap.set(u.name, u.id);
    }

    const successes: string[] = [];
    const failures: { name: string; reason: string }[] = [];

    for (const item of items) {
      if (!item.name || !item.content) {
        failures.push({ name: item.name || "(空)", reason: "姓名或内容为空" });
        continue;
      }

      const userId = userMap.get(item.name.trim());
      if (!userId) {
        failures.push({ name: item.name, reason: "未匹配到员工" });
        continue;
      }

      try {
        await prisma.selfEvaluation.upsert({
          where: { cycleId_userId: { cycleId: cycle.id, userId } },
          update: {
            importedContent: sanitizeText(item.content, 20000),
            importedAt: new Date(),
            sourceUrl: item.sourceUrl || undefined,
            status: "IMPORTED",
          },
          create: {
            cycleId: cycle.id,
            userId,
            importedContent: sanitizeText(item.content, 20000),
            importedAt: new Date(),
            sourceUrl: item.sourceUrl || null,
            status: "IMPORTED",
          },
        });
        successes.push(item.name);
      } catch (e) {
        failures.push({ name: item.name, reason: (e as Error).message });
      }
    }

    return NextResponse.json({
      total: items.length,
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
