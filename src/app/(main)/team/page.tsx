"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/star-rating";
import { toast } from "sonner";
import { usePreview } from "@/hooks/use-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck } from "lucide-react";

type TeamEval = {
  employee: { id: string; name: string; department: string; jobTitle: string | null };
  evaluation: {
    id: string;
    performanceStars: number | null;
    performanceComment: string;
    abilityStars: number | null;
    abilityComment: string;
    valuesStars: number | null;
    valuesComment: string;
    weightedScore: number | null;
    status: string;
  } | null;
  selfEval: {
    status: string;
    importedContent: string;
  } | null;
  peerReviewSummary: {
    output: number;
    collaboration: number;
    values: number;
    count: number;
  } | null;
};

type Nomination = {
  id: string;
  nominator: { id: string; name: string; department: string };
  nominee: { id: string; name: string; department: string };
  supervisorStatus: string;
};

type FormData = {
  performanceStars: number | null;
  performanceComment: string;
  abilityStars: number | null;
  abilityComment: string;
  valuesStars: number | null;
  valuesComment: string;
};

function computeWeightedScore(fd: FormData): number | null {
  if (fd.performanceStars == null || fd.abilityStars == null || fd.valuesStars == null) return null;
  return fd.performanceStars * 0.5 + fd.abilityStars * 0.3 + fd.valuesStars * 0.2;
}

function TeamContent() {
  const { preview, previewRole, getData } = usePreview();
  const [evals, setEvals] = useState<TeamEval[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, FormData>>({});

  useEffect(() => {
    if (preview && previewRole) {
      const previewData = getData("team") as Record<string, unknown>;
      const previewEvals = (previewData.evals as TeamEval[]) || [];
      const previewNominations = (previewData.nominations as Nomination[]) || [];
      setEvals(previewEvals);
      setNominations(previewNominations);
      const initial: Record<string, FormData> = {};
      for (const e of previewEvals) {
        initial[e.employee.id] = {
          performanceStars: e.evaluation?.performanceStars || null,
          performanceComment: e.evaluation?.performanceComment || "",
          abilityStars: e.evaluation?.abilityStars || null,
          abilityComment: e.evaluation?.abilityComment || "",
          valuesStars: e.evaluation?.valuesStars || null,
          valuesComment: e.evaluation?.valuesComment || "",
        };
      }
      setFormData(initial);
      return;
    }

    fetch("/api/supervisor-eval").then((r) => r.json()).then((data) => {
      setEvals(data);
      const initial: Record<string, FormData> = {};
      for (const e of data) {
        initial[e.employee.id] = {
          performanceStars: e.evaluation?.performanceStars || null,
          performanceComment: e.evaluation?.performanceComment || "",
          abilityStars: e.evaluation?.abilityStars || null,
          abilityComment: e.evaluation?.abilityComment || "",
          valuesStars: e.evaluation?.valuesStars || null,
          valuesComment: e.evaluation?.valuesComment || "",
        };
      }
      setFormData(initial);
    });
    fetch("/api/peer-review/confirm").then((r) => r.json()).then(setNominations);
  }, [preview, previewRole, getData]);

  const saveEval = async (employeeId: string, action: "save" | "submit") => {
    if (preview) return;
    const fd = formData[employeeId];
    if (action === "submit" && (!fd.performanceStars || !fd.abilityStars || !fd.valuesStars)) {
      toast.error("请完成所有维度的星级评分");
      return;
    }
    if (action === "submit" && !confirm("确认提交？提交后无法修改。")) return;

    try {
      await fetch("/api/supervisor-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, ...fd, action }),
      });
      toast.success(action === "submit" ? "评估已提交" : "已保存");
      const data = await fetch("/api/supervisor-eval").then((r) => r.json());
      setEvals(data);
    } catch {
      toast.error("操作失败");
    }
  };

  const confirmNominations = async (ids: string[]) => {
    if (preview) return;
    try {
      await fetch("/api/peer-review/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominationIds: ids }),
      });
      toast.success("已确认");
      const data = await fetch("/api/peer-review/confirm").then((r) => r.json());
      setNominations(data);
    } catch {
      toast.error("操作失败");
    }
  };

  const selectedEval = evals.find((e) => e.employee.id === selected);
  const isSubmitted = selectedEval?.evaluation?.status === "SUBMITTED";
  const currentForm = selected ? formData[selected] : null;
  const liveWeightedScore = currentForm ? computeWeightedScore(currentForm) : null;

  const updateField = (field: keyof FormData, value: FormData[keyof FormData]) => {
    if (!selected || preview) return;
    setFormData((prev) => ({
      ...prev,
      [selected]: { ...prev[selected], [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">团队评估</h1>

      <Tabs defaultValue="evaluate">
        <TabsList>
          <TabsTrigger value="evaluate">上级评估</TabsTrigger>
          <TabsTrigger value="confirm">确认环评人 ({nominations.filter(n => n.supervisorStatus === "PENDING").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="evaluate">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Employee list */}
            <div className="space-y-2 lg:col-span-1">
              {evals.map((e) => (
                <button
                  key={e.employee.id}
                  onClick={() => setSelected(e.employee.id)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                    selected === e.employee.id ? "border-primary bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  <div>
                    <p className="font-medium">{e.employee.name}</p>
                    <p className="text-xs text-muted-foreground">{e.employee.department} {e.employee.jobTitle || ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.evaluation?.weightedScore != null && (
                      <Badge variant="outline" className="text-xs">{e.evaluation.weightedScore.toFixed(1)}分</Badge>
                    )}
                    {e.evaluation?.status === "SUBMITTED" ? (
                      <Badge>已评估</Badge>
                    ) : (
                      <Badge variant="secondary">待评估</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Evaluation detail */}
            <div className="lg:col-span-2">
              {selectedEval ? (
                <div className="space-y-4">
                  {/* Self evaluation */}
                  {selectedEval.selfEval && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">员工自评 - {selectedEval.employee.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm">
                          {selectedEval.selfEval.importedContent || "未填写"}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Peer review summary */}
                  {selectedEval.peerReviewSummary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">360环评汇总 ({selectedEval.peerReviewSummary.count}人)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold">{selectedEval.peerReviewSummary.output.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">业绩产出</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{selectedEval.peerReviewSummary.collaboration.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">协作配合</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{selectedEval.peerReviewSummary.values.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">价值观</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Weighted score display */}
                  {liveWeightedScore != null && (
                    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-4 py-3">
                      <span className="text-sm font-medium">加权总分</span>
                      <span className="text-lg font-bold text-primary">{liveWeightedScore.toFixed(1)} 分</span>
                    </div>
                  )}

                  {/* Three-dimension evaluation form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">上级评估 - 三维度星级评分</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Performance */}
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-sm font-semibold">业绩产出</h3>
                          <span className="text-xs text-muted-foreground">权重50%</span>
                        </div>
                        <StarRating
                          value={formData[selected!]?.performanceStars}
                          onChange={(v) => updateField("performanceStars", v)}
                          disabled={!!isSubmitted || preview}
                        />
                        <Textarea
                          value={formData[selected!]?.performanceComment || ""}
                          onChange={(e) => updateField("performanceComment", e.target.value)}
                          placeholder="请结合员工工作总结自评 + 周期内实际产出结果 + OKR完成度 + 团队内贡献度综合评定，需提供数据/案例作证和描述"
                          rows={3}
                          disabled={isSubmitted || preview}
                        />
                      </div>

                      {/* Ability */}
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-sm font-semibold">个人能力</h3>
                          <span className="text-xs text-muted-foreground">权重30%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          请结合员工综合能力 + 学习能力 + 适应能力综合评定
                        </p>
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer font-medium">查看子项说明</summary>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            <li><span className="font-medium">综合能力：</span>复杂问题解决与业务闭环、专业纵深与角色履职、跨边界协同与组织价值创造、团队赋能与价值带动、vibe coding（必含）</li>
                            <li><span className="font-medium">学习能力：</span>问题分析与判断力、推动执行力、主动性与批判性思考</li>
                            <li><span className="font-medium">适应能力：</span>AI-first工作方式落地与AI-native交付适配度</li>
                          </ul>
                        </details>
                        <StarRating
                          value={formData[selected!]?.abilityStars}
                          onChange={(v) => updateField("abilityStars", v)}
                          disabled={!!isSubmitted || preview}
                        />
                        <Textarea
                          value={formData[selected!]?.abilityComment || ""}
                          onChange={(e) => updateField("abilityComment", e.target.value)}
                          placeholder="请结合员工综合能力 + 学习能力 + 适应能力综合评定"
                          rows={3}
                          disabled={isSubmitted || preview}
                        />
                      </div>

                      {/* Values */}
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-sm font-semibold">价值观</h3>
                          <span className="text-xs text-muted-foreground">权重20%</span>
                        </div>
                        <StarRating
                          value={formData[selected!]?.valuesStars}
                          onChange={(v) => updateField("valuesStars", v)}
                          disabled={!!isSubmitted || preview}
                        />
                        <Textarea
                          value={formData[selected!]?.valuesComment || ""}
                          onChange={(e) => updateField("valuesComment", e.target.value)}
                          placeholder='请针对价值观更新：从「始终创业」到「ROOT」的组织导向升级4条进行评估'
                          rows={3}
                          disabled={isSubmitted || preview}
                        />
                      </div>

                      {/* Actions */}
                      {!isSubmitted && (
                        <div className="flex justify-end gap-2 border-t pt-4">
                          <Button variant="outline" onClick={() => saveEval(selected!, "save")} disabled={preview}>保存</Button>
                          <Button onClick={() => saveEval(selected!, "submit")} disabled={preview}>提交评估</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                    <UserCheck className="h-10 w-10 text-muted-foreground/50" />
                    选择左侧的员工开始评估
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="confirm" className="space-y-4">
          {nominations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无待确认的环评提名
              </CardContent>
            </Card>
          ) : (
            Object.entries(
              nominations.reduce<Record<string, Nomination[]>>((acc, n) => {
                const key = n.nominator.id;
                if (!acc[key]) acc[key] = [];
                acc[key].push(n);
                return acc;
              }, {})
            ).map(([, noms]) => (
              <Card key={noms[0].nominator.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{noms[0].nominator.name} 的环评提名</CardTitle>
                    {noms.some((n) => n.supervisorStatus === "PENDING") && (
                      <Button
                        size="sm"
                        onClick={() => confirmNominations(noms.filter((n) => n.supervisorStatus === "PENDING").map((n) => n.id))}
                        disabled={preview}
                      >
                        全部确认
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {noms.map((n) => (
                      <div key={n.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>{n.nominee.name} ({n.nominee.department})</span>
                        {n.supervisorStatus === "APPROVED" ? (
                          <Badge variant="default">已确认</Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => confirmNominations([n.id])} disabled={preview}>
                            确认
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Skeleton className="h-8 w-40" /><div className="grid gap-4 lg:grid-cols-3"><div className="space-y-2 lg:col-span-1">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-16 w-full" />))}</div><Skeleton className="h-64 w-full lg:col-span-2" /></div></div>}>
      <TeamContent />
    </Suspense>
  );
}
