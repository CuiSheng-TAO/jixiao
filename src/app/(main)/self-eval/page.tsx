"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePreview } from "@/hooks/use-preview";

type SelfEvalData = {
  importedContent: string;
  importedAt: string | null;
  sourceUrl: string | null;
  status: string;
};

type CycleInfo = {
  id: string;
  selfEvalEnd: string | null;
  status: string;
};

function SelfEvalContent() {
  const { preview, previewRole, getData } = usePreview();
  const [data, setData] = useState<SelfEvalData | null>(null);
  const [selfEvalEnd, setSelfEvalEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (preview && previewRole) {
      const previewData = getData("self-eval") as Record<string, unknown>;

      if (previewRole === "EMPLOYEE") {
        setData(previewData as unknown as SelfEvalData);
      } else {
        // 主管/管理员视角：显示提示信息
        setData(null);
      }
      setLoading(false);
      return;
    }

    // 获取活跃周期的截止日期
    fetch("/api/admin/cycle")
      .then((r) => r.json())
      .then((cycles: CycleInfo[]) => {
        if (Array.isArray(cycles)) {
          const activeCycle = cycles.find((c) => c.status !== "ARCHIVED");
          if (activeCycle?.selfEvalEnd) {
            setSelfEvalEnd(activeCycle.selfEvalEnd);
          }
        }
      })
      .catch(() => {
        // 获取失败则不显示截止日期
      });

    fetch("/api/self-eval")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.importedContent) {
          setData(d);
        }
      })
      .finally(() => setLoading(false));
  }, [preview, previewRole, getData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  // 预览模式下非员工角色的视图
  if (preview && previewRole && previewRole !== "EMPLOYEE") {
    const previewData = getData("self-eval") as { viewType: string; message: string };
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">个人自评</h1>
            <p className="text-muted-foreground">
              {previewRole === "SUPERVISOR" ? "主管视角" : "管理员视角"}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {previewData.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isImported = data && data.importedContent;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">个人自评</h1>
          <p className="text-muted-foreground">
            {isImported ? "自评内容已导入" : "通过飞书多维表格提交个人自评"}
          </p>
        </div>
        <Badge variant={isImported ? "default" : "secondary"}>
          {isImported
            ? data.status === "SUBMITTED"
              ? "已确认"
              : "已导入"
            : "未导入"}
        </Badge>
      </div>

      {isImported ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>自评内容</CardTitle>
              <CardDescription>
                导入时间：{data.importedAt ? new Date(data.importedAt).toLocaleString("zh-CN") : "-"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed text-foreground">
                {data.importedContent}
              </div>
            </CardContent>
          </Card>

          {data.sourceUrl && (
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <span className="text-sm text-muted-foreground">原始文档：</span>
                <a
                  href={preview ? undefined : data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline hover:text-primary/80"
                  onClick={preview ? (e) => e.preventDefault() : undefined}
                >
                  {data.sourceUrl}
                </a>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>提交自评</CardTitle>
              <CardDescription>
                个人自评通过飞书多维表格提交，提交后由HR统一导入系统
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm text-primary">
                  请点击下方按钮前往飞书表单填写并提交你的个人自评。提交后，HR会统一将自评内容导入绩效系统。
                </p>
              </div>

              <a
                href="https://deepwisdom.feishu.cn/share/base/form/shrcnCS3SrdluG2wmoTlDeWBAhh"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full" disabled={preview}>
                  前往提交自评
                </Button>
              </a>
            </CardContent>
          </Card>

          {selfEvalEnd && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>自评截止时间：<strong>{selfEvalEnd.slice(0, 10)}</strong></span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function SelfEvalPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl py-12 text-center text-muted-foreground">加载中...</div>}>
      <SelfEvalContent />
    </Suspense>
  );
}
