import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getActiveCycle } from "@/lib/session";
import { sanitizeText, validateStars } from "@/lib/validate";

// Get peer reviews assigned to current user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const cycle = await prisma.reviewCycle.findFirst({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!cycle) return NextResponse.json([]);

    const reviews = await prisma.peerReview.findMany({
      where: { cycleId: cycle.id, reviewerId: user.id },
      include: { reviewee: { select: { id: true, name: true, department: true } } },
    });

    // Attach self-eval sourceUrl for each reviewee
    const revieweeIds = [...new Set(reviews.map(r => r.revieweeId))];
    const selfEvals = await prisma.selfEvaluation.findMany({
      where: { cycleId: cycle.id, userId: { in: revieweeIds } },
      select: { userId: true, sourceUrl: true },
    });
    const selfEvalMap = new Map(selfEvals.map(s => [s.userId, s.sourceUrl]));

    return NextResponse.json(reviews.map(r => ({
      ...r,
      revieweeSelfEvalUrl: selfEvalMap.get(r.revieweeId) || null,
    })));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Submit a peer review
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 周期阶段验证（ADMIN豁免）
    if (user.role !== "ADMIN") {
      const cycle = await getActiveCycle();
      if (!cycle || (cycle.status !== "PEER_REVIEW" && cycle.status !== "SUPERVISOR_EVAL")) {
        return NextResponse.json({ error: "当前不在互评阶段，无法执行此操作" }, { status: 400 });
      }
    }

    const body = await req.json();

    const isSubmit = body.action === "submit";

    // TOCTOU fix: check ownership and status before updating
    const existing = await prisma.peerReview.findUnique({ where: { id: body.id } });
    if (!existing || existing.reviewerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.status === "SUBMITTED") {
      return NextResponse.json({ error: "已提交，无法修改" }, { status: 400 });
    }
    if (existing.status === "DECLINED") {
      return NextResponse.json({ error: "已拒评，无法修改" }, { status: 400 });
    }

    // 新维度（与绩效初评一致）
    const performanceStars = validateStars(body.performanceStars);
    const comprehensiveStars = validateStars(body.comprehensiveStars);
    const learningStars = validateStars(body.learningStars);
    const adaptabilityStars = validateStars(body.adaptabilityStars);
    const candidStars = validateStars(body.candidStars);
    const progressStars = validateStars(body.progressStars);
    const altruismStars = validateStars(body.altruismStars);
    const rootStars = validateStars(body.rootStars);

    if (isSubmit) {
      if (!performanceStars || !comprehensiveStars || !learningStars || !adaptabilityStars || !candidStars || !progressStars || !altruismStars || !rootStars) {
        return NextResponse.json({ error: "请完成所有维度的星级评分" }, { status: 400 });
      }
      const pc = sanitizeText(body.performanceComment);
      const compc = sanitizeText(body.comprehensiveComment);
      const lc = sanitizeText(body.learningComment);
      const adpc = sanitizeText(body.adaptabilityComment);
      const cc = sanitizeText(body.candidComment);
      const prc = sanitizeText(body.progressComment);
      const alc = sanitizeText(body.altruismComment);
      const rc = sanitizeText(body.rootComment);
      if (!pc || !compc || !lc || !adpc || !cc || !prc || !alc || !rc) {
        return NextResponse.json({ error: "请填写所有维度的文字评语" }, { status: 400 });
      }
    }

    const review = await prisma.peerReview.update({
      where: { id: body.id },
      data: {
        performanceStars,
        performanceComment: sanitizeText(body.performanceComment),
        comprehensiveStars,
        comprehensiveComment: sanitizeText(body.comprehensiveComment),
        learningStars,
        learningComment: sanitizeText(body.learningComment),
        adaptabilityStars,
        adaptabilityComment: sanitizeText(body.adaptabilityComment),
        abilityComment: sanitizeText(body.abilityComment),
        candidStars,
        candidComment: sanitizeText(body.candidComment),
        progressStars,
        progressComment: sanitizeText(body.progressComment),
        altruismStars,
        altruismComment: sanitizeText(body.altruismComment),
        rootStars,
        rootComment: sanitizeText(body.rootComment),
        status: isSubmit ? "SUBMITTED" : "DRAFT",
        submittedAt: isSubmit ? new Date() : undefined,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
