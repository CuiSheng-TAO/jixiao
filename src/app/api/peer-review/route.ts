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

    return NextResponse.json(reviews);
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
      if (!cycle || cycle.status !== "PEER_REVIEW") {
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

    const outputScore = validateStars(body.outputScore);
    const collaborationScore = validateStars(body.collaborationScore);
    const valuesScore = validateStars(body.valuesScore);
    const innovationScore = validateStars(body.innovationScore);

    if (isSubmit) {
      if (!outputScore || !collaborationScore || !valuesScore) {
        return NextResponse.json({ error: "请完成所有必填评分（业绩产出、协作配合、价值观）" }, { status: 400 });
      }
    }

    const review = await prisma.peerReview.update({
      where: { id: body.id },
      data: {
        outputScore,
        outputComment: sanitizeText(body.outputComment),
        collaborationScore,
        collaborationComment: sanitizeText(body.collaborationComment),
        valuesScore,
        valuesComment: sanitizeText(body.valuesComment),
        innovationScore,
        innovationComment: sanitizeText(body.innovationComment),
        status: isSubmit ? "SUBMITTED" : "DRAFT",
        submittedAt: isSubmit ? new Date() : undefined,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
