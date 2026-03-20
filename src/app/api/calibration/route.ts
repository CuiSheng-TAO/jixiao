import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getActiveCycle } from "@/lib/session";
import { validateStars } from "@/lib/validate";

// Get all calibration data
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["HRBP", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const cycle = await prisma.reviewCycle.findFirst({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!cycle) return NextResponse.json([]);

    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true, name: true, department: true, jobTitle: true, role: true },
    });

    const data = await Promise.all(
      users.map(async (u) => {
        const selfEval = await prisma.selfEvaluation.findUnique({
          where: { cycleId_userId: { cycleId: cycle.id, userId: u.id } },
          select: { importedAt: true },
        });

        const supervisorEval = await prisma.supervisorEval.findUnique({
          where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: u.id } },
        });

        const calibration = await prisma.calibrationResult.findUnique({
          where: { cycleId_userId: { cycleId: cycle.id, userId: u.id } },
        });

        const peerReviews = await prisma.peerReview.findMany({
          where: { cycleId: cycle.id, revieweeId: u.id, status: "SUBMITTED" },
        });

        const peerAvg = peerReviews.length > 0
          ? (peerReviews.reduce((s, r) => s + (r.outputScore || 0) + (r.collaborationScore || 0) + (r.valuesScore || 0), 0) / (peerReviews.length * 3)).toFixed(1)
          : null;

        const supervisorWeighted = supervisorEval?.weightedScore ?? null;
        const proposedStars = calibration?.proposedStars != null
          ? Math.round(calibration.proposedStars)
          : supervisorWeighted != null
            ? Math.round(supervisorWeighted)
            : null;

        return {
          user: u,
          selfEvalStatus: selfEval?.importedAt ? "imported" : "not_imported",
          peerAvg,
          supervisorWeighted: supervisorWeighted != null ? Number(supervisorWeighted) : null,
          proposedStars,
          finalStars: calibration?.finalStars ?? null,
        };
      })
    );

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Update calibration result
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["HRBP", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();

    const finalStars = validateStars(body.finalStars);
    if (finalStars === null) {
      return NextResponse.json({ error: "finalStars must be an integer between 1 and 5" }, { status: 400 });
    }

    const cycle = await getActiveCycle();
    if (!cycle) {
      return NextResponse.json({ error: "No active cycle" }, { status: 400 });
    }

    // 周期阶段验证（ADMIN豁免）
    if (user.role !== "ADMIN" && cycle.status !== "CALIBRATION") {
      return NextResponse.json({ error: "当前不在校准阶段，无法执行此操作" }, { status: 400 });
    }

    const result = await prisma.calibrationResult.upsert({
      where: {
        cycleId_userId: { cycleId: cycle.id, userId: body.userId },
      },
      update: {
        finalStars,
        adjustedBy: user.name,
        adjustReason: body.adjustReason || "",
      },
      create: {
        cycleId: cycle.id,
        userId: body.userId,
        finalStars,
        adjustedBy: user.name,
        adjustReason: body.adjustReason || "",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
