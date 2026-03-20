import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import { getUserAccessToken, getFeishuUserInfo } from "./feishu";
import { getSessionUser } from "./session";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      id: "feishu",
      name: "飞书登录",
      credentials: {
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const code = credentials?.code as string;
        if (!code) return null;

        try {
          const tokenData = await getUserAccessToken(code);
          const userInfo = await getFeishuUserInfo(tokenData.access_token);

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

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
          };
        } catch (error) {
          console.error("Feishu auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (session.user as any).role = dbUser.role;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (session.user as any).department = dbUser.department;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export async function getCurrentUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;
  return prisma.user.findUnique({ where: { id: sessionUser.id } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("Forbidden");
  return user;
}
