"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ScoreNormalizationApplicationShape,
  ScoreNormalizationBucketSummary,
  ScoreNormalizationSource,
} from "./types";
import {
  formatScoreNormalizationDateTime,
  getScoreNormalizationSourceOption,
} from "./types";

type NormalizationOverviewProps = {
  source: ScoreNormalizationSource;
  cycleName: string;
  rawDistribution: ScoreNormalizationBucketSummary[];
  simulatedDistribution: ScoreNormalizationBucketSummary[];
  application: ScoreNormalizationApplicationShape | null;
  shiftedCount: number;
};

export function NormalizationOverview({
  source,
  cycleName,
  rawDistribution,
  simulatedDistribution,
  application,
  shiftedCount,
}: NormalizationOverviewProps) {
  const sourceOption = getScoreNormalizationSourceOption(source);
  const isApplied = application != null && application.revertedAt == null;
  const rawCount = rawDistribution.reduce((sum, item) => sum + item.count, 0);
  const simulatedCount = simulatedDistribution.reduce((sum, item) => sum + item.count, 0);
  const appliedAt = application ? formatScoreNormalizationDateTime(application.appliedAt) : "尚未应用";
  const statusLabel = application
    ? application.revertedAt
      ? "已回退"
      : "已启用标准化口径"
    : "仅预览";

  return (
    <section className="rounded-[28px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,247,241,0.92))] p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{sourceOption.label}</Badge>
            <Badge variant={isApplied ? "success" : "outline"}>{statusLabel}</Badge>
            <Badge variant="secondary">{cycleName}</Badge>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">分布校准分析</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{sourceOption.description}</p>
            <p className="max-w-3xl text-sm leading-7 text-foreground">
              这里先展示原始分和强制分桶后的模拟结果，方便你看清楚分布是否偏高、偏低，以及哪些人会发生变化。
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px] xl:grid-cols-2">
          <Card size="sm" className="border-border/60 shadow-none">
            <CardContent className="space-y-1 py-3">
              <p className="text-xs text-muted-foreground">原始人数</p>
              <p className="text-xl font-semibold text-foreground">{rawCount}</p>
              <p className="text-xs text-muted-foreground">来自当前页签的原始分布</p>
            </CardContent>
          </Card>
          <Card size="sm" className="border-border/60 shadow-none">
            <CardContent className="space-y-1 py-3">
              <p className="text-xs text-muted-foreground">标准化后人数</p>
              <p className="text-xl font-semibold text-foreground">{simulatedCount}</p>
              <p className="text-xs text-muted-foreground">与原始对象一一对应的模拟结果</p>
            </CardContent>
          </Card>
          <Card size="sm" className="border-border/60 shadow-none">
            <CardContent className="space-y-1 py-3">
              <p className="text-xs text-muted-foreground">变化对象</p>
              <p className="text-xl font-semibold text-foreground">{shiftedCount}</p>
              <p className="text-xs text-muted-foreground">分桶发生变化的记录数</p>
            </CardContent>
          </Card>
          <Card size="sm" className="border-border/60 shadow-none">
            <CardContent className="space-y-1 py-3">
              <p className="text-xs text-muted-foreground">最近应用</p>
              <p className="text-xl font-semibold text-foreground">{appliedAt}</p>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

