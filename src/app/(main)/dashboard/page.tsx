"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Users, UserCheck, BarChart3, MessageSquare, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { usePreview } from "@/hooks/use-preview";
import { cycleStatusConfig } from "@/lib/status";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardData = {
  user: { name: string; role: string };
  cycle: { name: string; status: string } | null;
  selfEvalStatus: string | null;
  pendingPeerReviews: number;
  pendingTeamEvals: number;
  hasAppeal: boolean;
};

function DashboardContent() {
  const { preview, previewRole, getData } = usePreview();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (preview && previewRole) {
      const previewData = getData("dashboard") as DashboardData;
      setData(previewData);
      setLoading(false);
      return;
    }

    // Fetch real data via API calls
    async function loadData() {
      try {
        const res = await fetch("/api/self-eval");
        const selfEval = await res.json();

        // We need to get user/cycle info - fetch from dashboard API or session
        // For now, use a combined approach
        const userRes = await fetch("/api/users?me=true");
        const userData = await userRes.json();

        setData({
          user: { name: userData.name || "用户", role: userData.role || "EMPLOYEE" },
          cycle: userData.cycle || null,
          selfEvalStatus: selfEval?.status || null,
          pendingPeerReviews: userData.pendingPeerReviews || 0,
          pendingTeamEvals: userData.pendingTeamEvals || 0,
          hasAppeal: userData.hasAppeal || false,
        });
      } catch {
        // Fallback: still try to render something
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [preview, previewRole, getData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          无法加载数据
        </CardContent>
      </Card>
    );
  }

  const isSupervisor = ["SUPERVISOR", "HRBP", "ADMIN"].includes(data.user.role);
  const isAdmin = ["HRBP", "ADMIN"].includes(data.user.role);

  // 预览模式的链接带 preview 参数
  function buildHref(href: string): string {
    if (!preview) return href;
    return `${href}?preview=${previewRole}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">你好，{data.user.name}</h1>
        {data.cycle && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-muted-foreground">当前周期：{data.cycle.name}</span>
            <Badge variant={cycleStatusConfig[data.cycle.status]?.variant as any}>
              {cycleStatusConfig[data.cycle.status]?.label || data.cycle.status}
            </Badge>
          </div>
        )}
      </div>

      {!data.cycle && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无进行中的考核周期
            {data.user.role === "ADMIN" && (
              <p className="mt-2">
                <Link href={buildHref("/admin")} className="text-primary hover:underline">
                  前往创建考核周期
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {data.cycle && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href={buildHref("/self-eval")}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3">
                <ClipboardList className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-base">个人自评</CardTitle>
                  <CardDescription>
                    {data.selfEvalStatus === "SUBMITTED"
                      ? "已提交"
                      : data.selfEvalStatus
                        ? "草稿中"
                        : "未开始"}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href={buildHref("/peer-review")}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3">
                <Users className="h-8 w-8 text-purple-600" />
                <div>
                  <CardTitle className="text-base">360环评</CardTitle>
                  <CardDescription>
                    {data.pendingPeerReviews > 0
                      ? `${data.pendingPeerReviews} 条待完成`
                      : "暂无待办"}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {isSupervisor && (
            <>
              <Link href={buildHref("/team")}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <UserCheck className="h-8 w-8 text-orange-600" />
                    <div>
                      <CardTitle className="text-base">团队评估</CardTitle>
                      <CardDescription>
                        {data.pendingTeamEvals > 0
                          ? `${data.pendingTeamEvals} 人待评估`
                          : "暂无待办"}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href={buildHref("/meetings")}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                    <div>
                      <CardTitle className="text-base">面谈记录</CardTitle>
                      <CardDescription>记录绩效面谈</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          {isAdmin && (
            <Link href={buildHref("/calibration")}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-amber-600" />
                  <div>
                    <CardTitle className="text-base">绩效校准</CardTitle>
                    <CardDescription>查看与调整绩效等级</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )}

          {data.hasAppeal && (
            <Link href={buildHref("/appeal")}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3">
                  <MessageSquareWarning className="h-8 w-8 text-rose-600" />
                  <div>
                    <CardTitle className="text-base">绩效申诉</CardTitle>
                    <CardDescription>
                      {isAdmin ? "查看与处理申诉" : "对绩效结果提出申诉"}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-5 w-64" /></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-24 w-full" />))}</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
