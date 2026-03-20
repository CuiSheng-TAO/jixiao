import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

const isDev = process.env.FEISHU_APP_ID === "your_app_id" || process.env.DEV_LOGIN_ENABLED === "true";

// GET: list demo users for login page
export async function GET() {
  if (process.env.NODE_ENV === "production" && process.env.DEV_LOGIN_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isDev) {
    return NextResponse.json({ error: "Dev mode disabled" }, { status: 403 });
  }

  try {
    const { prisma } = await import("@/lib/db");
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, department: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: String(error), message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST: dev login
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.DEV_LOGIN_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isDev) {
    return NextResponse.json({ error: "Dev login disabled" }, { status: 403 });
  }

  try {
    const { prisma } = await import("@/lib/db");
    const body = await req.json();
    const { userId } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const secret = process.env.AUTH_SECRET!;
    const isSecure = req.url.startsWith("https");

    // Try both cookie name formats
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

    const token = await encode({
      token: {
        userId: user.id,
        name: user.name,
        email: user.email,
        sub: user.id,
      },
      secret,
      salt: cookieName,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role },
    });

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: String(error), message: (error as Error).message },
      { status: 500 }
    );
  }
}
