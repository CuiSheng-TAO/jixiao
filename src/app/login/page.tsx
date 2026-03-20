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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-80">
          <CardContent className="flex flex-col items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
    EMPLOYEE: <Users className="h-4 w-4 text-primary" />,
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "管理员",
    SUPERVISOR: "主管",
    HRBP: "HRBP",
    EMPLOYEE: "员工",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-96">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-xl">绩效考核系统</CardTitle>
          <CardDescription>
            {showDemo ? "选择角色体验系统" : "使用飞书账号登录"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
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
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                  >
                    {roleIcons[u.role] || roleIcons.EMPLOYEE}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.department}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {roleLabels[u.role] || u.role}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  正在加载用户列表...
                </p>
              )}
              <button
                onClick={() => setShowDemo(false)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
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
