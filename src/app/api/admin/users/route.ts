import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "HRBP"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        jobTitle: true,
        role: true,
        supervisorId: true,
        supervisor: { select: { id: true, name: true } },
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: body.id },
      data: {
        role: body.role,
        department: body.department,
        supervisorId: body.supervisorId,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
