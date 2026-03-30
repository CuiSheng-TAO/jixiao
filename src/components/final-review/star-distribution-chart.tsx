"use client";

import type { CSSProperties } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistributionEntry } from "./types";

export type StarDistributionChartProps = {
  title: string;
  description: string;
  distribution: DistributionEntry[];
  showSuggestedGuidance?: boolean;
};

const STAR_RULES = {
  1: { ratio: 0.05, label: "建议上限 5%" },
  2: { ratio: 0.15, label: "建议上限 15%" },
  3: { ratio: 0.5, label: "建议下限 50%" },
  4: { ratio: 0.2, label: "建议上限 20%" },
  5: { ratio: 0.1, label: "建议上限 10%" },
} as const;

export function StarDistributionChart({
  title,
  description,
  distribution,
  showSuggestedGuidance = false,
}: StarDistributionChartProps) {
  const panelStyle: CSSProperties = {
    background: "var(--cockpit-surface)",
    borderColor: "var(--cockpit-border)",
    boxShadow: "var(--shadow-xs)",
  };
  const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);
  const data = distribution.map((item) => ({
    ...item,
    label: `${item.stars}星`,
    namesLabel: item.names.length ? item.names.join("、") : "当前没有员工落在这个星级",
    suggestedCount: Math.round(totalCount * STAR_RULES[item.stars as keyof typeof STAR_RULES].ratio),
    suggestedLabel: STAR_RULES[item.stars as keyof typeof STAR_RULES].label,
  }));

  return (
    <Card className="rounded-[var(--radius-2xl)] border shadow-none" style={panelStyle}>
      <CardHeader>
        <CardTitle className="text-base text-[var(--cockpit-foreground)]">{title}</CardTitle>
        <CardDescription className="text-[var(--cockpit-muted-foreground)]">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(125, 98, 70, 0.14)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--cockpit-muted-foreground)", fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--cockpit-muted-foreground)", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "rgba(212, 166, 104, 0.1)" }}
                contentStyle={{
                  background: "var(--cockpit-surface)",
                  border: "1px solid var(--cockpit-border)",
                  borderRadius: "16px",
                  color: "var(--cockpit-foreground)",
                }}
                formatter={(value, _name, item) => {
                  const row = item.payload;
                  const deltaLabel = row.exceeded ? `，偏离建议分布 ${row.delta} 人` : "";
                  return [`${value} 人${deltaLabel} · 建议约 ${row.suggestedCount} 人`, "当前人数"];
                }}
                labelFormatter={(label, payload) => {
                  const item = payload[0]?.payload;
                  return item ? `${label} · ${item.namesLabel}` : String(label);
                }}
              />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {data.map((item) => (
                  <Cell
                    key={item.label}
                    fill={item.exceeded ? "var(--destructive)" : "var(--cockpit-accent-strong)"}
                    fillOpacity={item.exceeded ? 0.82 : 0.95}
                  />
                ))}
                <LabelList dataKey="count" position="top" fill="var(--cockpit-foreground)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {showSuggestedGuidance ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {data.map((item) => (
              <div key={`guidance:${item.label}`} className="rounded-2xl border px-3 py-3">
                <p className="text-xs text-[var(--cockpit-muted-foreground)]">{item.label}</p>
                <p className="mt-2 text-sm font-medium text-[var(--cockpit-foreground)]">建议约 {item.suggestedCount} 人</p>
                <p className="mt-1 text-xs text-[var(--cockpit-muted-foreground)]">{item.suggestedLabel}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[var(--cockpit-muted-foreground)]">
            当前按系统里的参考星级和已正式确认结果合并统计，红色柱表示偏离建议分布的星级。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
