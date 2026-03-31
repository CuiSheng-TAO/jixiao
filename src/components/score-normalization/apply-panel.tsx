"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScoreNormalizationApplicationShape, ScoreNormalizationSource } from "./types";
import { formatScoreNormalizationDateTime, getScoreNormalizationSourceOption } from "./types";

type ApplyPanelProps = {
  source: ScoreNormalizationSource;
  application: ScoreNormalizationApplicationShape | null;
};

export function ApplyPanel({ source, application }: ApplyPanelProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const sourceOption = getScoreNormalizationSourceOption(source);
  const isApplied = application != null && application.revertedAt == null;
  const appliedAt = application ? formatScoreNormalizationDateTime(application.appliedAt) : "尚未应用";

  return (
    <Card className="rounded-[28px] border-amber-200/70 bg-amber-50/40 shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base text-foreground">最终确认区</CardTitle>
          <Badge variant={isApplied ? "success" : "outline"}>{isApplied ? "当前已启用" : "仅分析预览"}</Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          {sourceOption.shortLabel} 这一步会改变后续展示和排名口径，所以这里先保留一个明显的确认区。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-foreground">
          如果后续真的要切换口径，需要先确认这会影响排名和后续校准展示。当前页面只做分析预览，不会真正提交变更。
        </p>

        <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/30"
          />
          <span>我已理解这会影响排名和后续校准展示</span>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled>
            应用标准化结果
          </Button>
          <Button type="button" variant="outline" disabled>
            回退到原始分
          </Button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          当前页仅用于分析预览，按钮暂不接入实际操作。最近应用：{appliedAt}
        </p>
      </CardContent>
    </Card>
  );
}
