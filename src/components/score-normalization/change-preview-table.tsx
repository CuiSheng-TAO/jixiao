"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoreNormalizationEntryShape } from "./types";

type ChangePreviewTableProps = {
  entries: ScoreNormalizationEntryShape[];
};

function getMovement(entry: ScoreNormalizationEntryShape) {
  if (entry.rawScore == null || entry.normalizedScore == null) {
    return { delta: null, label: "待定", tone: "secondary" as const };
  }

  const rawBucket = Math.min(5, Math.max(1, Math.round(entry.rawScore)));
  const delta = entry.normalizedScore - rawBucket;
  if (delta > 0) return { delta, label: "上调", tone: "success" as const };
  if (delta < 0) return { delta, label: "下调", tone: "warning" as const };
  return { delta, label: "不变", tone: "secondary" as const };
}

export function ChangePreviewTable({ entries }: ChangePreviewTableProps) {
  const orderedEntries = [...entries].sort((left, right) => {
    const leftMovement = getMovement(left).delta ?? 0;
    const rightMovement = getMovement(right).delta ?? 0;
    if (Math.abs(rightMovement) !== Math.abs(leftMovement)) {
      return Math.abs(rightMovement) - Math.abs(leftMovement);
    }
    return (left.rankIndex ?? Number.MAX_SAFE_INTEGER) - (right.rankIndex ?? Number.MAX_SAFE_INTEGER);
  });

  const visibleEntries = orderedEntries.slice(0, 12);
  const extraCount = orderedEntries.length - visibleEntries.length;

  return (
    <Card className="rounded-[28px] border-border/60 shadow-none">
      <CardHeader>
        <CardTitle className="text-base text-foreground">变化明细预览</CardTitle>
        <CardDescription className="text-muted-foreground">
          这里列出会被重新分桶的人，方便先确认谁会升档、降档或保持不变。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>排名</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>原始分</TableHead>
              <TableHead>标准化分</TableHead>
              <TableHead>变化</TableHead>
              <TableHead className="text-right">方向</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEntries.map((entry) => {
              const movement = getMovement(entry);
              const displayName = entry.subjectName || entry.subjectId;

              return (
                <TableRow key={entry.sourceRecordId}>
                  <TableCell className="text-muted-foreground">{entry.rankIndex ?? "—"}</TableCell>
                  <TableCell className="font-medium text-foreground">{displayName}</TableCell>
                  <TableCell>{entry.rawScore == null ? "—" : entry.rawScore.toFixed(1)}</TableCell>
                  <TableCell>{entry.normalizedScore == null ? "—" : `${entry.normalizedScore} 星`}</TableCell>
                  <TableCell>{movement.delta == null ? "—" : movement.delta > 0 ? `+${movement.delta}` : `${movement.delta}`}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={movement.tone}>{movement.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {extraCount > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">还有 {extraCount} 条变化明细未展开。</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

