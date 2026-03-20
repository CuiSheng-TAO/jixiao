import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getActiveCycle } from "@/lib/session";
import { sanitizeText } from "@/lib/validate";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cycle = await getActiveCycle();
    if (!cycle) return NextResponse.json(null);

    const selfEval = await prisma.selfEvaluation.findUnique({
      where: { cycleId_userId: { cycleId: cycle.id, userId: user.id } },
      select: {
        importedContent: true,
        importedAt: true,
        sourceUrl: true,
        status: true,
      },
    });

    return NextResponse.json(selfEval);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only ADMIN and HRBP can import
    if (user.role !== "ADMIN" && user.role !== "HRBP") {
      return NextResponse.json({ error: "仅HR可执行导入操作" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, content, sourceUrl } = body;

    if (!userId || !content) {
      return NextResponse.json({ error: "userId and content are required" }, { status: 400 });
    }

    const cycle = await getActiveCycle();
    if (!cycle) {
      return NextResponse.json({ error: "No active cycle" }, { status: 400 });
    }

    // 周期阶段验证（ADMIN豁免）
    if (user.role !== "ADMIN" && cycle.status !== "SELF_EVAL") {
      return NextResponse.json({ error: "当前不在自评阶段，无法执行此操作" }, { status: 400 });
    }

    const selfEval = await prisma.selfEvaluation.upsert({
      where: { cycleId_userId: { cycleId: cycle.id, userId } },
      update: {
        importedContent: sanitizeText(content, 20000),
        importedAt: new Date(),
        sourceUrl: sourceUrl || undefined,
        status: "IMPORTED",
      },
      create: {
        cycleId: cycle.id,
        userId,
        importedContent: sanitizeText(content, 20000),
        importedAt: new Date(),
        sourceUrl: sourceUrl || null,
        status: "IMPORTED",
      },
    });

    return NextResponse.json(selfEval);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
