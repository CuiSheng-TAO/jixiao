import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Get meetings
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const cycle = await prisma.reviewCycle.findFirst({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!cycle) return NextResponse.json([]);

    const isSupervisor = ["SUPERVISOR", "HRBP", "ADMIN"].includes(user.role);

    if (isSupervisor) {
      const meetings = await prisma.meeting.findMany({
        where: { cycleId: cycle.id, supervisorId: user.id },
        include: {
          employee: { select: { id: true, name: true, department: true } },
        },
      });
      return NextResponse.json(meetings);
    }

    // Employee: see own meeting
    const meeting = await prisma.meeting.findUnique({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: user.id } },
      include: {
        supervisor: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(meeting ? [meeting] : []);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Create or update meeting
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["SUPERVISOR", "HRBP", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();

    // 上下级关系验证（ADMIN豁免）
    if (user.role !== "ADMIN") {
      const employee = await prisma.user.findUnique({ where: { id: body.employeeId } });
      if (!employee || employee.supervisorId !== user.id) {
        return NextResponse.json({ error: "你不是该员工的直属上级" }, { status: 403 });
      }
    }

    const cycle = await prisma.reviewCycle.findFirst({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!cycle) {
      return NextResponse.json({ error: "No active cycle" }, { status: 400 });
    }

    const meeting = await prisma.meeting.upsert({
      where: {
        cycleId_employeeId: { cycleId: cycle.id, employeeId: body.employeeId },
      },
      update: {
        notes: body.notes || "",
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : null,
      },
      create: {
        cycleId: cycle.id,
        employeeId: body.employeeId,
        supervisorId: user.id,
        notes: body.notes || "",
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : null,
      },
    });

    return NextResponse.json(meeting);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
