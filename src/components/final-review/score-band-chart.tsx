"use client";

import type { CSSProperties } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreBandBucket } from "./workspace-view";

export type ScoreBandChartProps = {
  title: string;
  description: string;
  bands: ScoreBandBucket[];
};

export function ScoreBandChart({
  title,
  description,
  bands,
}: ScoreBandChartProps) {
  const panelStyle: CSSProperties = {
    background: "var(--cockpit-surface)",
    borderColor: "var(--cockpit-border)",
    boxShadow: "var(--shadow-xs)",
  };
  const data = bands.map((band) => ({
    ...band,
    namesLabel: band.names.length ? band.names.join("、") : "当前没有员工落在这个分数带",
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
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, bottom: 8, left: 0 }}>
              <CartesianGrid horizontal={false} stroke="rgba(125, 98, 70, 0.14)" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--cockpit-muted-foreground)", fontSize: 12 }} />
              <YAxis
                dataKey="label"
                type="category"
                width={68}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--cockpit-muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(212, 166, 104, 0.1)" }}
                contentStyle={{
                  background: "var(--cockpit-surface)",
                  border: "1px solid var(--cockpit-border)",
                  borderRadius: "16px",
                  color: "var(--cockpit-foreground)",
                }}
                formatter={(value) => [`${value} 人`, "人数"]}
                labelFormatter={(label, payload) => {
                  const item = payload[0]?.payload;
                  return item ? `${label} · ${item.namesLabel}` : String(label);
                }}
              />
              <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                {data.map((band) => (
                  <Cell
                    key={band.label}
                    fill={band.count > 0 ? "var(--cockpit-accent-strong)" : "var(--cockpit-accent)"}
                    fillOpacity={band.count > 0 ? 0.95 : 0.55}
                  />
                ))}
                <LabelList dataKey="count" position="right" fill="var(--cockpit-foreground)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--cockpit-muted-foreground)]">
          按普通员工当前初评加权分分桶，方便先看哪些分段的人数明显堆积。
        </p>
      </CardContent>
    </Card>
  );
}
