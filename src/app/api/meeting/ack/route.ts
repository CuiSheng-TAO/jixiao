import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Employee acknowledges meeting result
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    // TOCTOU fix: check ownership before updating
    const meeting = await prisma.meeting.findUnique({ where: { id: body.meetingId } });
    if (!meeting || meeting.employeeId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.meeting.update({
      where: { id: body.meetingId },
      data: { employeeAck: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
