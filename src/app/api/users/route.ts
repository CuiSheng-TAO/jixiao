import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Get all users (for peer review nomination etc.)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const users = await prisma.user.findMany({
      select: { id: true, name: true, department: true },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
