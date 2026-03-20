import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const cycles = await prisma.reviewCycle.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(cycles);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();

    const cycle = await prisma.reviewCycle.create({
      data: {
        name: body.name,
        selfEvalStart: new Date(body.selfEvalStart),
        selfEvalEnd: new Date(body.selfEvalEnd),
        peerReviewStart: new Date(body.peerReviewStart),
        peerReviewEnd: new Date(body.peerReviewEnd),
        supervisorStart: new Date(body.supervisorStart),
        supervisorEnd: new Date(body.supervisorEnd),
        calibrationStart: new Date(body.calibrationStart),
        calibrationEnd: new Date(body.calibrationEnd),
        meetingStart: new Date(body.meetingStart),
        meetingEnd: new Date(body.meetingEnd),
        ...(body.appealStart ? { appealStart: new Date(body.appealStart) } : {}),
        ...(body.appealEnd ? { appealEnd: new Date(body.appealEnd) } : {}),
        status: body.status || "DRAFT",
      },
    });

    return NextResponse.json(cycle);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

const statusFlow = ["DRAFT", "SELF_EVAL", "PEER_REVIEW", "SUPERVISOR_EVAL", "CALIBRATION", "MEETING", "APPEAL", "ARCHIVED"];

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();

    if (!statusFlow.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const cycle = await prisma.reviewCycle.update({
      where: { id: body.id },
      data: { status: body.status },
    });

    return NextResponse.json(cycle);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
