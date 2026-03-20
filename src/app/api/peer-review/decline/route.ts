import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, getActiveCycle } from "@/lib/session";
import { sanitizeText } from "@/lib/validate";

// Decline a peer review
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 周期阶段验证（ADMIN豁免）
    if (user.role !== "ADMIN") {
      const cycle = await getActiveCycle();
      if (!cycle || cycle.status !== "PEER_REVIEW") {
        return NextResponse.json({ error: "当前不在互评阶段，无法执行此操作" }, { status: 400 });
      }
    }

    const body = await req.json();
    const { reviewId, reason } = body as { reviewId: string; reason: string };

    const sanitizedReason = sanitizeText(reason);
    if (!sanitizedReason) {
      return NextResponse.json({ error: "请填写拒绝原因" }, { status: 400 });
    }

    // Verify the PeerReview exists and current user is the reviewer
    const peerReview = await prisma.peerReview.findUnique({
      where: { id: reviewId },
    });

    if (!peerReview) {
      return NextResponse.json({ error: "评估记录不存在" }, { status: 404 });
    }

    if (peerReview.reviewerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (peerReview.status === "SUBMITTED") {
      return NextResponse.json({ error: "已提交的评估无法拒绝" }, { status: 400 });
    }

    if (peerReview.status === "DECLINED") {
      return NextResponse.json({ error: "已拒绝，无法重复操作" }, { status: 400 });
    }

    // Update PeerReview status
    await prisma.peerReview.update({
      where: { id: reviewId },
      data: {
        status: "DECLINED",
        declinedAt: new Date(),
        declineReason: sanitizedReason,
      },
    });

    // Update the corresponding ReviewerNomination
    // nomination: nomineeId = reviewer, nominatorId = reviewee
    await prisma.reviewerNomination.updateMany({
      where: {
        cycleId: peerReview.cycleId,
        nomineeId: user.id,
        nominatorId: peerReview.revieweeId,
      },
      data: {
        nomineeStatus: "DECLINED",
        declineReason: sanitizedReason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
