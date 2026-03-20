import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Get nominations for supervisor's subordinates (with dual status)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["SUPERVISOR", "HRBP", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const cycle = await prisma.reviewCycle.findFirst({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!cycle) return NextResponse.json([]);

    // Get subordinates
    const subordinates = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    const subIds = subordinates.map((s) => s.id);

    const nominations = await prisma.reviewerNomination.findMany({
      where: { cycleId: cycle.id, nominatorId: { in: subIds } },
      include: {
        nominator: { select: { id: true, name: true, department: true } },
        nominee: { select: { id: true, name: true, department: true } },
      },
    });

    return NextResponse.json(
      nominations.map((n) => ({
        id: n.id,
        nominator: n.nominator,
        nominee: n.nominee,
        supervisorStatus: n.supervisorStatus,
        nomineeStatus: n.nomineeStatus,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Confirm nominations (supervisor only updates supervisorStatus)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["SUPERVISOR", "HRBP", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const { nominationIds } = body as { nominationIds: string[] };

    const cycle = await prisma.reviewCycle.findFirst({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!cycle) {
      return NextResponse.json({ error: "No active cycle" }, { status: 400 });
    }

    // Confirm nominations - only for supervisor's subordinates
    const subordinates = await prisma.user.findMany({
      where: { supervisorId: user.id },
      select: { id: true },
    });
    const subIds = new Set(subordinates.map((s) => s.id));

    const allNominations = await prisma.reviewerNomination.findMany({
      where: { id: { in: nominationIds } },
    });

    // Filter to only nominations from the supervisor's own subordinates
    const nominations = allNominations.filter((nom) => subIds.has(nom.nominatorId));

    for (const nom of nominations) {
      await prisma.reviewerNomination.update({
        where: { id: nom.id },
        data: { supervisorStatus: "APPROVED" },
      });

      // Create PeerReview record
      await prisma.peerReview.upsert({
        where: {
          cycleId_reviewerId_revieweeId: {
            cycleId: cycle.id,
            reviewerId: nom.nomineeId,
            revieweeId: nom.nominatorId,
          },
        },
        update: {},
        create: {
          cycleId: cycle.id,
          reviewerId: nom.nomineeId,
          revieweeId: nom.nominatorId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
