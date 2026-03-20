import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encode } from "next-auth/jwt";

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

async function getTenantToken() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get tenant token: ${data.msg}`);
  }
  return data.tenant_access_token;
}

async function getUserToken(code: string, tenantToken: string) {
  const res = await fetch(`${FEISHU_BASE}/authen/v1/oidc/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({ grant_type: "authorization_code", code }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get user token: ${data.msg}`);
  }
  return data.data;
}

async function getUserInfo(userAccessToken: string) {
  const res = await fetch(`${FEISHU_BASE}/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get user info: ${data.msg}`);
  }
  return data.data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const tenantToken = await getTenantToken();
    const tokenData = await getUserToken(code, tenantToken);
    const userInfo = await getUserInfo(tokenData.access_token);

    const user = await prisma.user.upsert({
      where: { feishuOpenId: userInfo.open_id },
      update: {
        name: userInfo.name,
        email: userInfo.email,
        avatarUrl: userInfo.avatar_url,
      },
      create: {
        feishuOpenId: userInfo.open_id,
        feishuUnionId: userInfo.union_id,
        name: userInfo.name,
        email: userInfo.email,
        avatarUrl: userInfo.avatar_url,
        department: "",
        role: "EMPLOYEE",
      },
    });

    const isSecure = req.url.startsWith("https");
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

    const token = await encode({
      token: { userId: user.id, name: user.name, email: user.email, sub: user.id },
      secret: process.env.AUTH_SECRET!,
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
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
