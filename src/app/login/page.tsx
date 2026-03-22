"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Shield, UserCheck, Users } from "lucide-react";

type DemoUser = {
  id: string;
  name: string;
  role: string;
  department: string;
};

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const [loading, setLoading] = useState(!!code);
  const [error, setError] = useState("");
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const [codeUsed, setCodeUsed] = useState(false);

  useEffect(() => {
    if (code && !codeUsed) {
      setCodeUsed(true);
      setLoading(true);
      fetch("/api/auth/feishu-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            router.push("/dashboard");
            router.refresh();
          } else {
            setError(data.error || "登录失败，请重试");
            setLoading(false);
          }
        })
        .catch(() => {
          setError("登录失败，请重试");
          setLoading(false);
        });
    }
  }, [code, codeUsed, router]);

  const loadDemoUsers = async () => {
    try {
      const res = await fetch("/api/auth/dev-login");
      const users = await res.json();
      if (Array.isArray(users)) {
        setDemoUsers(users);
      }
    } catch {
      // ignore
    }
    setShowDemo(true);
  };

  const devLogin = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "登录失败");
        setLoading(false);
      }
    } catch {
      setError("登录失败");
      setLoading(false);
    }
  };

  const handleFeishuLogin = () => {
    const redirectUri = `${window.location.origin}/login`;
    const state = Math.random().toString(36).slice(2);
    const appId = process.env.NEXT_PUBLIC_FEISHU_APP_ID;

    if (!appId) {
      loadDemoUsers();
      return;
    }

    window.location.href = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.02]">
        <Card className="w-80 shadow-lg">
          <CardContent className="flex flex-col items-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
            <p className="mt-4 text-sm text-muted-foreground">正在登录...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleIcons: Record<string, React.ReactNode> = {
    ADMIN: <Shield className="h-4 w-4 text-red-500" />,
    SUPERVISOR: <UserCheck className="h-4 w-4 text-orange-500" />,
    HRBP: <Shield className="h-4 w-4 text-purple-500" />,
    EMPLOYEE: <Users className="h-4 w-4 text-blue-500" />,
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "管理员",
    SUPERVISOR: "主管",
    HRBP: "HRBP",
    EMPLOYEE: "员工",
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.02]">
      {/* Decorative elements */}
      <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/[0.03] blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-primary/[0.04] blur-3xl" />

      <Card className="relative w-[400px] shadow-xl">
        <CardHeader className="pb-2 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl font-semibold">绩效考核系统</CardTitle>
          <CardDescription className="mt-1">
            {showDemo ? "选择角色体验系统" : "使用飞书账号登录"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {error && (
            <div className="rounded-lg bg-destructive/[0.06] px-3 py-2 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {!showDemo ? (
            <Button onClick={handleFeishuLogin} className="w-full" size="lg">
              飞书登录
            </Button>
          ) : (
            <div className="space-y-2">
              {demoUsers.length > 0 ? (
                demoUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => devLogin(u.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/50 p-3.5 text-left transition-all duration-[var(--transition-base)] hover:border-border hover:bg-muted/40 hover:shadow-xs"
                  >
                    {roleIcons[u.role] || roleIcons.EMPLOYEE}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.department}</p>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {roleLabels[u.role] || u.role}
                    </span>
                  </button>
                ))
              ) : (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
                </div>
              )}
              <button
                onClick={() => setShowDemo(false)}
                className="w-full pt-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                返回飞书登录
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
