"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePreview } from "@/hooks/use-preview";
import { evalStatusConfig } from "@/lib/status";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";

type PeerReview = {
  id: string;
  reviewee: { id: string; name: string; department: string };
  outputScore: number | null;
  outputComment: string;
  collaborationScore: number | null;
  collaborationComment: string;
  valuesScore: number | null;
  valuesComment: string;
  innovationScore: number | null;
  innovationComment: string;
  declinedAt: string | null;
  declineReason: string;
  status: string;
};

type Nomination = {
  id: string;
  nominee: { id: string; name: string; department: string };
  supervisorStatus: string;
  nomineeStatus: string;
};

type User = {
  id: string;
  name: string;
  department: string;
};

function ScoreSelector({ value, onChange, disabled }: { value: number | null; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => !disabled && onChange(n)}
          disabled={disabled}
          className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${
            value === n ? "border-primary bg-primary text-white" : "border-border hover:border-primary/30"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const nominationSupervisorConfig: Record<string, { label: string; variant: string }> = {
  APPROVED: { label: "上级已确认", variant: evalStatusConfig.APPROVED.variant },
  REJECTED: { label: "上级已拒绝", variant: evalStatusConfig.DECLINED.variant },
  PENDING: { label: "上级待确认", variant: evalStatusConfig.PENDING.variant },
};

const nominationNomineeConfig: Record<string, { label: string; variant: string }> = {
  ACCEPTED: { label: "已接受", variant: evalStatusConfig.CONFIRMED.variant },
  DECLINED: { label: "已拒绝", variant: evalStatusConfig.DECLINED.variant },
  PENDING: { label: "待接受", variant: evalStatusConfig.PENDING.variant },
};

function NominationStatusBadges({ nomination }: { nomination: Nomination }) {
  const supervisor = nominationSupervisorConfig[nomination.supervisorStatus] || nominationSupervisorConfig.PENDING;
  const nominee = nominationNomineeConfig[nomination.nomineeStatus] || nominationNomineeConfig.PENDING;

  return (
    <div className="flex gap-1.5">
      <Badge variant={supervisor.variant as any}>{supervisor.label}</Badge>
      <Badge variant={nominee.variant as any}>{nominee.label}</Badge>
    </div>
  );
}

function PeerReviewContent() {
  const { preview, previewRole, getData } = usePreview();
  const [reviews, setReviews] = useState<PeerReview[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const [declineDialog, setDeclineDialog] = useState<{ open: boolean; reviewId: string; revieweeName: string }>({ open: false, reviewId: "", revieweeName: "" });
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (preview && previewRole) {
      const previewData = getData("peer-review") as Record<string, unknown>;
      setReviews((previewData.reviews as PeerReview[]) || []);
      setNominations((previewData.nominations as Nomination[]) || []);
      setSelectedUsers(
        ((previewData.nominations as Nomination[]) || []).map((n) => n.nominee.id)
      );
      return;
    }

    fetch("/api/peer-review").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setReviews(d); });
    fetch("/api/peer-review/nominate").then((r) => r.json()).then((noms) => {
      if (Array.isArray(noms)) {
        setNominations(noms);
        setSelectedUsers(noms.map((n: Nomination) => n.nominee.id));
      }
    });
    fetch("/api/users").then((r) => r.json()).then((users) => {
      if (Array.isArray(users)) setAllUsers(users);
    });
  }, [preview, previewRole, getData]);

  const saveNominations = async () => {
    if (preview) return;
    if (selectedUsers.length < 3) {
      toast.error("请至少选择3位评估人");
      return;
    }
    try {
      const res = await fetch("/api/peer-review/nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomineeIds: selectedUsers }),
      });
      const result = await res.json();
      setNominations(result);
      toast.success("评估人提名已保存");
    } catch {
      toast.error("保存失败");
    }
  };

  const saveReview = async (review: PeerReview, action: "save" | "submit") => {
    if (preview) return;
    if (action === "submit") {
      if (!review.outputScore || !review.collaborationScore || !review.valuesScore) {
        toast.error("请完成所有必填评分（业绩产出、协作配合、价值观）");
        return;
      }
      if (!review.outputComment.trim() || !review.collaborationComment.trim() || !review.valuesComment.trim()) {
        toast.error("请填写所有必填维度的评语描述");
        return;
      }
      if (!confirm("提交后将无法修改，确认提交？")) return;
    }

    try {
      const res = await fetch("/api/peer-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...review, action }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "操作失败");
        return;
      }
      setReviews((prev) => prev.map((r) => (r.id === result.id ? { ...r, ...result } : r)));
      toast.success(action === "submit" ? "评估已提交" : "已保存");
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDecline = async () => {
    if (preview) return;
    if (!declineReason.trim()) {
      toast.error("请填写拒绝原因");
      return;
    }
    setDeclining(true);
    try {
      const res = await fetch("/api/peer-review/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: declineDialog.reviewId, reason: declineReason.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "操作失败");
        return;
      }
      setReviews((prev) => prev.map((r) => r.id === declineDialog.reviewId ? { ...r, status: "DECLINED", declineReason: declineReason.trim(), declinedAt: new Date().toISOString() } : r));
      setDeclineDialog({ open: false, reviewId: "", revieweeName: "" });
      setDeclineReason("");
      toast.success("已拒绝评估");
    } catch {
      toast.error("操作失败");
    } finally {
      setDeclining(false);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      (u.name.includes(searchQuery) || u.department.includes(searchQuery)) &&
      !selectedUsers.includes(u.id)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">360环评</h1>

      {/* 环评原则/导向说明区 */}
      <Card>
        <CardHeader className="cursor-pointer pb-2" onClick={() => setGuideOpen(!guideOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">环评说明与原则</CardTitle>
            <span className="text-sm text-muted-foreground">{guideOpen ? "收起" : "展开"}</span>
          </div>
        </CardHeader>
        {guideOpen && (
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">环评原则</p>
              <p>员工自主邀请协作密切的相关方参与评估，需覆盖上级、平级、跨团队协作方。</p>
            </div>
            <div>
              <p className="font-medium text-foreground">环评导向</p>
              <p>360环评仅作为绩效考评参考依据，不直接换算为绩效。</p>
            </div>
            <div>
              <p className="font-medium text-foreground">环评维度</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>业绩产出质量 -- 结合实际产出和对合作结果的贡献度</li>
                <li>协作配合度 -- 协作沟通与配合表现</li>
                <li>价值观践行 -- ROOT 4条中至少2条评估</li>
                <li>创新能力/解决问题/组织贡献（可选）</li>
              </ul>
            </div>
            <div className="rounded-md bg-primary/10 px-3 py-2 text-primary">
              360环评采用匿名模式
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="nominate">
        <TabsList>
          <TabsTrigger value="nominate">提名评估人</TabsTrigger>
          <TabsTrigger value="review">我的环评任务 ({reviews.filter(r => r.status === "DRAFT").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="nominate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>选择360评估人</CardTitle>
              <CardDescription>
                邀请人数不高于5人，重要/核心岗可邀请多于5人。需覆盖上级、平级、跨团队协作方。提交后由上级确认。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((uid) => {
                  const user = allUsers.find((u) => u.id === uid) || nominations.find((n) => n.nominee.id === uid)?.nominee;
                  if (!user) return null;
                  return (
                    <Badge key={uid} variant="secondary" className="gap-1 py-1">
                      {user.name}
                      <button
                        onClick={() => !preview && setSelectedUsers((prev) => prev.filter((id) => id !== uid))}
                        className="ml-1 text-muted-foreground hover:text-muted-foreground"
                        disabled={preview}
                      >
                        x
                      </button>
                    </Badge>
                  );
                })}
              </div>

              {!preview && (
                <Input
                  type="text"
                  placeholder="搜索同事姓名或部门..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              )}

              {searchQuery && !preview && (
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {filteredUsers.slice(0, 10).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUsers((prev) => [...prev, u.id]);
                        setSearchQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>{u.name}</span>
                      <span className="text-muted-foreground">{u.department}</span>
                    </button>
                  ))}
                </div>
              )}

              <Button onClick={saveNominations} disabled={preview || selectedUsers.length < 3}>
                保存提名 ({selectedUsers.length}人)
              </Button>
            </CardContent>
          </Card>

          {nominations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>提名状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {nominations.map((n) => (
                    <div key={n.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span>{n.nominee.name} ({n.nominee.department})</span>
                      <NominationStatusBadges nomination={n} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <Inbox className="h-10 w-10 text-muted-foreground/50" />
                暂无待完成的环评任务
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => {
              const isDraft = review.status === "DRAFT";
              const isDeclined = review.status === "DECLINED";
              const isDisabled = !isDraft || preview;

              return (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        评估 {review.reviewee.name}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {review.reviewee.department}
                        </span>
                      </CardTitle>
                      <Badge variant={evalStatusConfig[review.status]?.variant as any ?? "secondary"}>
                        {evalStatusConfig[review.status]?.label || "待完成"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isDeclined ? (
                      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                        拒绝原因：{review.declineReason}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <div>
                            <label className="mb-1 block text-sm font-medium">业绩产出质量 <span className="text-red-500">*</span></label>
                            <p className="mb-2 text-xs text-muted-foreground">请结合员工周期内实际产出和对合作结果的贡献度综合评定，需提供数据/案例作证和描述</p>
                            <ScoreSelector
                              value={review.outputScore}
                              onChange={(v) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, outputScore: v } : r))}
                              disabled={isDisabled}
                            />
                            <Textarea
                              value={review.outputComment}
                              onChange={(e) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, outputComment: e.target.value } : r))}
                              placeholder="请提供数据或案例说明..."
                              rows={2}
                              className="mt-2"
                              disabled={isDisabled}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium">协作配合度 <span className="text-red-500">*</span></label>
                            <p className="mb-2 text-xs text-muted-foreground">请结合员工周期内协作配合度综合评定，需提供数据/案例作证和描述</p>
                            <ScoreSelector
                              value={review.collaborationScore}
                              onChange={(v) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, collaborationScore: v } : r))}
                              disabled={isDisabled}
                            />
                            <Textarea
                              value={review.collaborationComment}
                              onChange={(e) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, collaborationComment: e.target.value } : r))}
                              placeholder="请提供数据或案例说明..."
                              rows={2}
                              className="mt-2"
                              disabled={isDisabled}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium">价值观践行 <span className="text-red-500">*</span></label>
                            <p className="mb-2 text-xs text-muted-foreground">请结合员工周期内价值观践行综合评定，选取ROOT 4条中的至少2条进行评估</p>
                            <ScoreSelector
                              value={review.valuesScore}
                              onChange={(v) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, valuesScore: v } : r))}
                              disabled={isDisabled}
                            />
                            <Textarea
                              value={review.valuesComment}
                              onChange={(e) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, valuesComment: e.target.value } : r))}
                              placeholder="请选取ROOT 4条中的至少2条进行说明..."
                              rows={2}
                              className="mt-2"
                              disabled={isDisabled}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              创新能力/解决问题/组织贡献
                              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">可选</span>
                            </label>
                            <p className="mb-2 text-xs text-muted-foreground">请围绕你所选择的维度，进行综合评定</p>
                            <ScoreSelector
                              value={review.innovationScore}
                              onChange={(v) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, innovationScore: v } : r))}
                              disabled={isDisabled}
                            />
                            <Textarea
                              value={review.innovationComment}
                              onChange={(e) => setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, innovationComment: e.target.value } : r))}
                              placeholder="评语（选填）..."
                              rows={2}
                              className="mt-2"
                              disabled={isDisabled}
                            />
                          </div>
                        </div>

                        {isDraft && (
                          <div className="flex justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => setDeclineDialog({ open: true, reviewId: review.id, revieweeName: review.reviewee.name })}
                              disabled={preview}
                            >
                              拒绝评估
                            </Button>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => saveReview(review, "save")} disabled={preview}>
                                保存
                              </Button>
                              <Button size="sm" onClick={() => saveReview(review, "submit")} disabled={preview}>
                                提交
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* 拒绝评估对话框 */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => { if (!open) { setDeclineDialog({ open: false, reviewId: "", revieweeName: "" }); setDeclineReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝评估 {declineDialog.revieweeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">拒绝后将无法恢复，请确认并填写拒绝原因。</p>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="请填写拒绝原因（必填）..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeclineDialog({ open: false, reviewId: "", revieweeName: "" }); setDeclineReason(""); }}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={declining || !declineReason.trim() || preview}>
              {declining ? "处理中..." : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PeerReviewPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>}>
      <PeerReviewContent />
    </Suspense>
  );
}
