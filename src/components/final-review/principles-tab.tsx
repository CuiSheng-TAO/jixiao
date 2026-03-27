"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CockpitShell, type CockpitBriefingBlock, type CockpitMetric } from "./cockpit-shell";
import type { WorkspacePayload } from "./types";

type PrinciplesTabProps = {
  cycle: NonNullable<WorkspacePayload["cycle"]>;
  config: NonNullable<WorkspacePayload["config"]>;
  overview: NonNullable<WorkspacePayload["overview"]>;
  guideDescription: string;
  summaryLabel: string;
  metricCopy: {
    employeeOpinionTitle: string;
    employeeOpinionDescription: string;
    employeeConfirmTitle: string;
    employeeConfirmDescription: string;
    leaderConfirmTitle: string;
    leaderConfirmDescription: string;
    leaderSubmissionTitle: string;
    leaderSubmissionDescription: string;
  };
  distributionChart: ReactNode;
  scoreBandChart: ReactNode;
};

function formatCountdown(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return "已截止";
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}天 ${hours}小时`;
  return `${hours}小时 ${minutes}分钟`;
}

function buildSummary(cycle: NonNullable<WorkspacePayload["cycle"]>, overview: NonNullable<WorkspacePayload["overview"]>) {
  const pendingEmployees = Math.max(overview.progress.employeeTotalCount - overview.progress.employeeConfirmedCount, 0);
  const pendingLeaders = Math.max(overview.progress.leaderTotalCount - overview.progress.leaderConfirmedCount, 0);
  const firstRisk = overview.riskSummary[0];

  if (firstRisk) {
    return `${firstRisk} 目前还剩 ${pendingEmployees} 位普通员工和 ${pendingLeaders} 位主管待正式拍板，距离截止还有 ${formatCountdown(cycle.calibrationEnd)}。`;
  }

  if (pendingEmployees === 0 && pendingLeaders === 0) {
    return `普通员工和主管层都已形成正式结论，当前重点是赶在 ${formatCountdown(cycle.calibrationEnd)} 内完成最后复核。`;
  }

  return `目前还剩 ${pendingEmployees} 位普通员工和 ${pendingLeaders} 位主管待正式拍板，建议先处理意见分歧和高风险名单，再收口最后确认。`;
}

export function PrinciplesTab({
  cycle,
  config,
  overview,
  guideDescription,
  summaryLabel,
  metricCopy,
  distributionChart,
  scoreBandChart,
}: PrinciplesTabProps) {
  const briefingBlocks: CockpitBriefingBlock[] = [
    {
      title: "核心原则",
      content: (
        <div className="flex flex-wrap gap-2">
          {overview.principles.map((item) => (
            <Badge key={item} variant="outline" className="final-review-cockpit-chip rounded-full border px-3 py-1 font-medium">
              {item}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      title: "链路提醒",
      content: (
        <ul className="space-y-2">
          {overview.chainGuidance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "建议分布",
      content: (
        <div className="flex flex-wrap gap-2">
          {overview.distributionHints.map((item) => (
            <Badge key={item} variant="secondary" className="final-review-cockpit-chip rounded-full border px-3 py-1 font-medium">
              {item}
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  const leaderSubmissionText =
    overview.progress.leaderSubmittedCounts.map((item) => `${item.evaluatorName} ${item.submittedCount}`).join(" · ") || "未配置";

  const metrics: CockpitMetric[] = [
    {
      title: metricCopy.employeeOpinionTitle,
      value: `${overview.progress.employeeOpinionDone}/${overview.progress.employeeOpinionTotal}`,
      description: metricCopy.employeeOpinionDescription,
    },
    {
      title: metricCopy.employeeConfirmTitle,
      value: `${overview.progress.employeeConfirmedCount}/${overview.progress.employeeTotalCount}`,
      description: metricCopy.employeeConfirmDescription,
    },
    {
      title: metricCopy.leaderConfirmTitle,
      value: `${overview.progress.leaderConfirmedCount}/${overview.progress.leaderTotalCount}`,
      description: metricCopy.leaderConfirmDescription,
    },
    {
      title: metricCopy.leaderSubmissionTitle,
      value: leaderSubmissionText,
      description: metricCopy.leaderSubmissionDescription,
    },
  ];

  return (
    <CockpitShell
      title="原则与链路"
      description="把本轮终评的判断标准、参与角色和当前全局节奏放进一个更容易扫读的驾驶舱。"
      guideDescription={guideDescription}
      summaryLabel={summaryLabel}
      summary={buildSummary(cycle, overview)}
      briefingBlocks={briefingBlocks}
      metrics={metrics}
      main={
        <div className="grid gap-4 lg:grid-cols-2">
          {distributionChart}
          {scoreBandChart}
        </div>
      }
      aside={
        <>
          <Card className="final-review-cockpit-panel rounded-[var(--radius-2xl)] border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[var(--cockpit-foreground)]">本轮终评角色</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-[var(--cockpit-foreground)]">终评工作台参与人</p>
                <p className="mt-1 leading-6 text-[var(--cockpit-muted-foreground)]">{config.accessUsers.map((user) => user.name).join("、") || "未配置"}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--cockpit-foreground)]">最终确认人</p>
                <p className="mt-1 leading-6 text-[var(--cockpit-muted-foreground)]">{config.finalizers.map((user) => user.name).join("、") || "未配置"}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--cockpit-foreground)]">主管层双人终评填写人</p>
                <p className="mt-1 leading-6 text-[var(--cockpit-muted-foreground)]">{config.leaderEvaluators.map((user) => user.name).join("、") || "未配置"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="final-review-cockpit-panel rounded-[var(--radius-2xl)] border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[var(--cockpit-foreground)]">风险与推进提醒</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="final-review-cockpit-panel-strong rounded-[var(--radius-xl)] p-4">
                <p className="text-sm font-semibold text-[var(--cockpit-foreground)]">校准截止</p>
                <p className="mt-2 text-lg font-semibold text-[var(--cockpit-foreground)]">{formatCountdown(cycle.calibrationEnd)}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--cockpit-muted-foreground)]">
                  双人提交进度：{leaderSubmissionText}
                </p>
              </div>

              <div className="space-y-2">
                {(overview.riskSummary.length > 0 ? overview.riskSummary : ["当前没有额外风险提醒。"]).map((item) => (
                  <div
                    key={item}
                    className="rounded-[var(--radius-xl)] border border-[color:rgba(179,76,40,0.14)] bg-[color:rgba(255,237,230,0.7)] px-3 py-2 text-sm text-[color:#8c3b21]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      }
    />
  );
}
