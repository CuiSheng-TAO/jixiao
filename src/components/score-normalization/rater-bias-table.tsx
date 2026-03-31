"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SCORE_NORMALIZATION_TARGET_BANDS,
  type ScoreNormalizationBucketSummary,
} from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RaterBiasTableProps = {
  rawDistribution: ScoreNormalizationBucketSummary[];
};

function formatSignedPct(value: number) {
  const amount = Math.abs(value).toFixed(1);
  if (value > 0) return `+${amount}%`;
  if (value < 0) return `-${amount}%`;
  return "0%";
}

export function RaterBiasTable({ rawDistribution }: RaterBiasTableProps) {
  return (
    <Card className="rounded-[28px] border-border/60 shadow-none">
      <CardHeader>
        <CardTitle className="text-base text-foreground">评分倾向偏差</CardTitle>
        <CardDescription className="text-muted-foreground">
          这里先看当前分布相对目标口径是偏高还是偏低，方便判断哪些星级最需要校准。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>星级</TableHead>
              <TableHead>实际人数</TableHead>
              <TableHead>实际占比</TableHead>
              <TableHead>目标占比</TableHead>
              <TableHead>偏离</TableHead>
              <TableHead className="text-right">判断</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawDistribution.map((bucket) => {
              const target = SCORE_NORMALIZATION_TARGET_BANDS.find((item) => item.bucketIndex === bucket.bucketIndex);
              const targetPct = target?.targetPct ?? 0;
              const diff = bucket.pct - targetPct;
              const tone = diff > 0 ? "warning" : diff < 0 ? "info" : "secondary";
              const label = diff > 0 ? "偏高" : diff < 0 ? "偏低" : "匹配";

              return (
                <TableRow key={bucket.bucketIndex}>
                  <TableCell className="font-medium text-foreground">{bucket.bucketLabel}</TableCell>
                  <TableCell>{bucket.count}</TableCell>
                  <TableCell>{bucket.pct.toFixed(1)}%</TableCell>
                  <TableCell>{targetPct.toFixed(1)}%</TableCell>
                  <TableCell>{formatSignedPct(diff)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={tone}>{label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

