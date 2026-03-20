import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getActiveCycle } from "@/lib/session";

// GET: 获取申诉记录
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cycle = await getActiveCycle();
    if (!cycle) return NextResponse.json({ appeals: [], cycle: null });

    const isHR = ["HRBP", "ADMIN"].includes(user.role);

    if (isHR) {
      // HRBP/ADMIN: 返回所有申诉记录
      const appeals = await prisma.appeal.findMany({
        where: { cycleId: cycle.id },
        include: {
          user: { select: { id: true, name: true, department: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // 获取每个申诉员工的校准结果（最终星级）
      const userIds = appeals.map((a) => a.userId);
      const calibrations = await prisma.calibrationResult.findMany({
        where: { cycleId: cycle.id, userId: { in: userIds } },
      });
      const calibrationMap = new Map(calibrations.map((c) => [c.userId, c]));

      const appealsWithStars = appeals.map((appeal) => ({
        ...appeal,
        finalStars: calibrationMap.get(appeal.userId)?.finalStars ?? null,
      }));

      return NextResponse.json({ appeals: appealsWithStars, cycle, role: user.role });
    }

    // 员工: 返回自己的申诉记录
    const appeal = await prisma.appeal.findUnique({
      where: { cycleId_userId: { cycleId: cycle.id, userId: user.id } },
    });

    // 获取自己的最终星级
    const calibration = await prisma.calibrationResult.findUnique({
      where: { cycleId_userId: { cycleId: cycle.id, userId: user.id } },
    });

    return NextResponse.json({
      appeals: appeal ? [appeal] : [],
      cycle,
      finalStars: calibration?.finalStars ?? null,
      role: user.role,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: 提交申诉 / 处理申诉
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    const cycle = await getActiveCycle();
    if (!cycle) return NextResponse.json({ error: "No active cycle" }, { status: 400 });

    if (action === "submit") {
      // 周期阶段验证（ADMIN豁免）
      if (user.role !== "ADMIN" && cycle.status !== "APPEAL") {
        return NextResponse.json({ error: "当前不在申诉阶段，无法执行此操作" }, { status: 400 });
      }

      // 员工提交申诉
      const { reason } = body;
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: "申诉理由不能为空" }, { status: 400 });
      }

      // 检查申诉窗口期
      const now = new Date();
      if (cycle.appealStart && cycle.appealEnd) {
        if (now < new Date(cycle.appealStart) || now > new Date(cycle.appealEnd)) {
          return NextResponse.json({ error: "当前不在申诉窗口期内" }, { status: 400 });
        }
      }

      // 检查是否已提交过申诉
      const existing = await prisma.appeal.findUnique({
        where: { cycleId_userId: { cycleId: cycle.id, userId: user.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "已提交过申诉，不可重复提交" }, { status: 400 });
      }

      const appeal = await prisma.appeal.create({
        data: {
          cycleId: cycle.id,
          userId: user.id,
          reason: reason.trim(),
          status: "PENDING",
        },
      });

      return NextResponse.json(appeal);
    }

    if (action === "handle") {
      // HRBP/ADMIN 处理申诉
      if (!["HRBP", "ADMIN"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { appealId, status, resolution } = body;
      if (!appealId) {
        return NextResponse.json({ error: "缺少 appealId" }, { status: 400 });
      }
      if (!["APPROVED", "REJECTED"].includes(status)) {
        return NextResponse.json({ error: "status 必须为 APPROVED 或 REJECTED" }, { status: 400 });
      }

      const appeal = await prisma.appeal.update({
        where: { id: appealId },
        data: {
          status,
          resolution: resolution?.trim() || "",
          handledBy: user.id,
          handledAt: new Date(),
        },
      });

      return NextResponse.json(appeal);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
