"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NormalizationShell } from "@/components/manager-review-normalization/normalization-shell";
import type { ManagerReviewNormalizationWorkspaceResponse } from "@/components/manager-review-normalization/types";

const ACTION_ENDPOINTS = {
  SUPERVISOR_EVAL: {
    apply: "/api/manager-review-normalization/apply",
    revert: "/api/manager-review-normalization/revert",
  },
  PEER_REVIEW: {
    apply: "/api/score-normalization/apply",
    revert: "/api/score-normalization/revert",
  },
} as const;

type ActionSource = keyof typeof ACTION_ENDPOINTS;
type ActionType = "apply" | "revert";

export default function ManagerReviewNormalizationPage() {
  const [workspace, setWorkspace] = useState<ManagerReviewNormalizationWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<`${ActionSource}:${ActionType}` | null>(null);
  const requestIdRef = useRef(0);

  const loadWorkspace = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/manager-review-normalization/workspace");
      const data = (await response.json()) as ManagerReviewNormalizationWorkspaceResponse & { error?: string };
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        throw new Error(data.error || "加载失败");
      }
      setWorkspace(data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const runAction = useCallback(
    async (source: ActionSource, action: ActionType) => {
      const actionKey = `${source}:${action}` as const;
      setPendingAction(actionKey);
      setError("");

      try {
        const response = await fetch(ACTION_ENDPOINTS[source][action], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmed: true,
            ...(source === "PEER_REVIEW" ? { source: "PEER_REVIEW" } : {}),
          }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "操作失败");
        }
        await loadWorkspace();
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作失败");
      } finally {
        setPendingAction(null);
      }
    },
    [loadWorkspace],
  );

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  if (loading && !workspace) {
    return <PageSkeleton />;
  }

  if (error && !workspace) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="环评及初评正态分布"
          description="用一张 54 人总台账同时查看初评人和环评人的打分样本、均分、偏移，以及展开后的具体打分明细。"
        />
        <Card className="rounded-[28px] border-border/60 shadow-none">
          <CardContent className="space-y-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadWorkspace()}>
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="环评及初评正态分布"
        description="统一查看 54 位评分人的初评与环评打分倾向。主管按初评人/环评人双身份展示，员工按环评人展示。"
      />

      {error ? (
        <Card className="rounded-[20px] border-amber-200 bg-amber-50/70 shadow-none">
          <CardContent className="py-3 text-sm text-amber-900">{error}</CardContent>
        </Card>
      ) : null}

      <NormalizationShell
        cycleName={workspace.cycle.name}
        rosterSummary={workspace.rosterSummary}
        applications={workspace.applications}
        rows={workspace.rows}
        onApplyManagerReview={() => runAction("SUPERVISOR_EVAL", "apply")}
        onRevertManagerReview={() => runAction("SUPERVISOR_EVAL", "revert")}
        onApplyPeerReview={() => runAction("PEER_REVIEW", "apply")}
        onRevertPeerReview={() => runAction("PEER_REVIEW", "revert")}
        applyingManagerReview={pendingAction === "SUPERVISOR_EVAL:apply"}
        revertingManagerReview={pendingAction === "SUPERVISOR_EVAL:revert"}
        applyingPeerReview={pendingAction === "PEER_REVIEW:apply"}
        revertingPeerReview={pendingAction === "PEER_REVIEW:revert"}
      />
    </div>
  );
}
