import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";
import { prisma } from "./db";

export type SessionUser = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  department: string;
  supervisorId: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const secret = process.env.AUTH_SECRET!;

    // Try both cookie name formats (secure vs non-secure)
    const secureCookie = cookieStore.get("__Secure-authjs.session-token");
    const plainCookie = cookieStore.get("authjs.session-token");
    const tokenValue = secureCookie?.value || plainCookie?.value;

    if (!tokenValue) return null;

    const salt = secureCookie ? "__Secure-authjs.session-token" : "authjs.session-token";
    const decoded = await decode({ token: tokenValue, secret, salt });

    if (!decoded?.userId && !decoded?.sub) return null;

    const userId = (decoded.userId as string) || (decoded.sub as string);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        department: true,
        supervisorId: true,
      },
    });

    return user;
  } catch (error) {
    console.error("getSessionUser error:", error);
    return null;
  }
}

export async function getActiveCycle() {
  return prisma.reviewCycle.findFirst({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
  });
}
