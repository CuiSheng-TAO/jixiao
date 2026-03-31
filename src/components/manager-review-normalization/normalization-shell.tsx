"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ManagerReviewNormalizationWorkspaceResponse,
  NormalizationApplicationState,
  NormalizationLedgerDetail,
  NormalizationLedgerRow,
  NormalizationLedgerSummary,
} from "./types";

type NormalizationShellProps = {
  cycleName: string;
  rosterSummary: ManagerReviewNormalizationWorkspaceResponse["rosterSummary"];
  applications: ManagerReviewNormalizationWorkspaceResponse["applications"];
  rows: ManagerReviewNormalizationWorkspaceResponse["rows"];
  onApplyManagerReview: () => Promise<void> | void;
  onRevertManagerReview: () => Promise<void> | void;
  onApplyPeerReview: () => Promise<void> | void;
  onRevertPeerReview: () => Promise<void> | void;
  applyingManagerReview?: boolean;
  revertingManagerReview?: boolean;
  applyingPeerReview?: boolean;
  revertingPeerReview?: boolean;
};

function formatScore(value: number | null) {
  return value == null ? "—" : value.toFixed(1);
}

function formatOffset(value: number | null) {
  if (value == null) return "—";
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function getTendencyVariant(tendency: NormalizationLedgerSummary["tendency"]) {
  if (tendency === "偏高") return "warning" as const;
  if (tendency === "偏低") return "info" as const;
  return "secondary" as const;
}

function getStateVariant(state: NormalizationApplicationState["workspaceState"]) {
  return state === "STANDARDIZED" ? ("success" as const) : ("outline" as const);
}

function ApplicationCard({
  title,
  description,
  state,
  onApply,
  onRevert,
  applying = false,
  reverting = false,
}: {
  title: string;
  description: string;
  state: NormalizationApplicationState;
  onApply: () => Promise<void> | void;
  onRevert: () => Promise<void> | void;
  applying?: boolean;
  reverting?: boolean;
}) {
  const isApplied = state.workspaceState === "STANDARDIZED";
  return (
    <Card className="rounded-[24px] border-border/60 shadow-none">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={getStateVariant(state.workspaceState)}>
            {isApplied ? "已启用标准化" : "当前为原始分"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">当前口径</dt>
            <dd className="mt-1 text-sm font-medium">{isApplied ? "标准化结果" : "原始结果"}</dd>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">应用时间</dt>
            <dd className="mt-1 text-sm font-medium">{state.appliedAt ? new Date(state.appliedAt).toLocaleString("zh-CN") : "未应用"}</dd>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">快照</dt>
            <dd className="mt-1 text-sm font-medium">{state.snapshotId ? state.snapshotId.slice(0, 8) : "—"}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onApply} disabled={applying || reverting}>
            {applying ? "应用中..." : "应用标准化"}
          </Button>
          <Button type="button" variant="outline" onClick={onRevert} disabled={!state.rollbackVisible || applying || reverting}>
            {reverting ? "回退中..." : "回退到原始分"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSection({
  title,
  details,
}: {
  title: string;
  details: NormalizationLedgerDetail[];
}) {
  return (
    <div className="space-y-3 rounded-[20px] border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">{title}</h4>
        <Badge variant="outline">{details.length} 条</Badge>
      </div>
      {details.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无打分记录。</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>被评人</TableHead>
              <TableHead>部门</TableHead>
              <TableHead>总分</TableHead>
              <TableHead>业绩</TableHead>
              <TableHead>个人能力</TableHead>
              <TableHead>价值观</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.map((detail) => (
              <TableRow key={detail.sourceRecordId}>
                <TableCell className="font-medium">{detail.targetName}</TableCell>
                <TableCell>{detail.targetDepartment || "—"}</TableCell>
                <TableCell>{formatScore(detail.overallScore)}</TableCell>
                <TableCell>{formatScore(detail.performanceScore)}</TableCell>
                <TableCell>{formatScore(detail.abilityScore)}</TableCell>
                <TableCell>{formatScore(detail.valuesScore)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function LedgerRowView({ row }: { row: NormalizationLedgerRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{row.name}</TableCell>
        <TableCell>{row.department || "—"}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1.5">
            {row.roles.map((role) => (
              <Badge key={role} variant={role === "初评人" ? "warning" : "info"}>
                {role}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>{row.managerReview.summary.sampleCount}</TableCell>
        <TableCell>{formatScore(row.managerReview.summary.averageScore)}</TableCell>
        <TableCell>{formatOffset(row.managerReview.summary.offset)}</TableCell>
        <TableCell>
          <Badge variant={getTendencyVariant(row.managerReview.summary.tendency)}>
            {row.managerReview.summary.tendency}
          </Badge>
        </TableCell>
        <TableCell>{row.peerReview.summary.sampleCount}</TableCell>
        <TableCell>{formatScore(row.peerReview.summary.averageScore)}</TableCell>
        <TableCell>{formatOffset(row.peerReview.summary.offset)}</TableCell>
        <TableCell>
          <Badge variant={getTendencyVariant(row.peerReview.summary.tendency)}>
            {row.peerReview.summary.tendency}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button type="button" variant="link" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "收起详情" : "展开详情"}
          </Button>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={12} className="bg-muted/10 p-0">
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <DetailSection title="初评打分明细" details={row.managerReview.details} />
              <DetailSection title="环评打分明细" details={row.peerReview.details} />
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function NormalizationShell({
  cycleName,
  rosterSummary,
  applications,
  rows,
  onApplyManagerReview,
  onRevertManagerReview,
  onApplyPeerReview,
  onRevertPeerReview,
  applyingManagerReview = false,
  revertingManagerReview = false,
  applyingPeerReview = false,
  revertingPeerReview = false,
}: NormalizationShellProps) {
  const { leaders, employees } = useMemo(() => ({
    leaders: rows.filter((row) => row.segment === "主管"),
    employees: rows.filter((row) => row.segment === "员工"),
  }), [rows]);

  return (
    <section className="space-y-5">
      <Card className="rounded-[28px] border-border/60 shadow-none">
        <CardHeader className="gap-3">
          <div className="space-y-1">
            <CardTitle>评分人总台账</CardTitle>
            <CardDescription>
              当前周期：{cycleName}。一张表同时查看 54 位评分人的初评与环评打分倾向，展开即可看到这个人给其他人的具体打分。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-border/60 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">总人数</p>
            <p className="mt-2 text-3xl font-semibold">{rosterSummary.total}</p>
          </div>
          <div className="rounded-[22px] border border-border/60 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">主管（11人）</p>
            <p className="mt-2 text-3xl font-semibold">{rosterSummary.leaderCount}</p>
          </div>
          <div className="rounded-[22px] border border-border/60 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">员工（43人）</p>
            <p className="mt-2 text-3xl font-semibold">{rosterSummary.employeeCount}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <ApplicationCard
          title="绩效初评标准化"
          description="对主管给下属的初评打分做标准化应用与回退。"
          state={applications.managerReview}
          onApply={onApplyManagerReview}
          onRevert={onRevertManagerReview}
          applying={applyingManagerReview}
          reverting={revertingManagerReview}
        />
        <ApplicationCard
          title="360 环评标准化"
          description="对同事之间的 360 环评打分做标准化应用与回退。"
          state={applications.peerReview}
          onApply={onApplyPeerReview}
          onRevert={onRevertPeerReview}
          applying={applyingPeerReview}
          reverting={revertingPeerReview}
        />
      </div>

      <Card className="rounded-[28px] border-border/60 shadow-none">
        <CardHeader className="gap-3">
          <div className="space-y-1">
            <CardTitle>评分台账明细</CardTitle>
            <CardDescription>主管优先展示在上方，员工展示在下方。每行可展开查看这个人给其他人的具体打分明细。</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>评分人</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>身份</TableHead>
                <TableHead>初评样本</TableHead>
                <TableHead>初评均分</TableHead>
                <TableHead>初评偏移</TableHead>
                <TableHead>初评倾向</TableHead>
                <TableHead>环评样本</TableHead>
                <TableHead>环评均分</TableHead>
                <TableHead>环评偏移</TableHead>
                <TableHead>环评倾向</TableHead>
                <TableHead className="text-right">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableCell colSpan={12} className="py-3 text-sm font-medium text-foreground">
                  主管（11人）
                </TableCell>
              </TableRow>
              {leaders.map((row) => (
                <LedgerRowView key={row.userId} row={row} />
              ))}
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableCell colSpan={12} className="py-3 text-sm font-medium text-foreground">
                  员工（43人）
                </TableCell>
              </TableRow>
              {employees.map((row) => (
                <LedgerRowView key={row.userId} row={row} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
