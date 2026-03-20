"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePreview } from "@/hooks/use-preview";

const starLabels: Record<number, string> = {
  1: "1星",
  2: "2星",
  3: "3星",
  4: "4星",
  5: "5星",
};

const distributionLimits: Record<number, number> = {
  5: 10,
  4: 20,
  3: 50,
  2: 15,
  1: 5,
};

const distributionLabels: Record<number, string> = {
  5: "≤10%",
  4: "≤20%",
  3: "50%+",
  2: "≤15%",
  1: "≤5%",
};

type CalibrationItem = {
  user: { id: string; name: string; department: string; jobTitle: string | null };
  selfEvalStatus: "imported" | "not_imported";
  peerAvg: string | null;
  supervisorWeighted: number | null;
  proposedStars: number | null;
  finalStars: number | null;
};

function CalibrationContent() {
  const { preview, previewRole, getData } = usePreview();
  const [data, setData] = useState<CalibrationItem[]>([]);
  const [filter, setFilter] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editStars, setEditStars] = useState<number | null>(null);
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    if (preview && previewRole) {
      const previewData = getData("calibration") as Record<string, unknown>;
      const items = (previewData.data as CalibrationItem[]) || [];
      setData(items);
      return;
    }

    fetch("/api/calibration").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setData(d);
    });
  }, [preview, previewRole, getData]);

  const departments = [...new Set(data.map((d) => d.user.department).filter(Boolean))];

  const filtered = filter ? data.filter((d) => d.user.department === filter) : data;

  const total = filtered.length;
  const distribution = [1, 2, 3, 4, 5].map((s) => {
    const count = filtered.filter((d) => (d.finalStars ?? d.proposedStars ?? 0) === s).length;
    const pct = total > 0 ? (count / total) * 100 : 0;
    const limit = distributionLimits[s];
    const exceeded = s === 3 ? pct < limit : pct > limit;
    return { stars: s, count, pct, exceeded };
  });

  const saveCalibration = async (userId: string) => {
    if (preview) return;
    try {
      await fetch("/api/calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          finalStars: editStars,
          adjustReason: editReason,
        }),
      });
      toast.success("校准已保存");
      setEditingUser(null);
      const newData = await fetch("/api/calibration").then((r) => r.json());
      if (Array.isArray(newData)) setData(newData);
    } catch {
      toast.error("保存失败");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">绩效校准</h1>

      {/* Distribution Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">星级分布</CardTitle>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="">全公司</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4" style={{ height: 240 }}>
            {distribution.map((d) => {
              const barHeight = Math.max(8, (d.count / Math.max(total, 1)) * 200);
              const refHeight = (distributionLimits[d.stars] / 100) * 200;

              return (
                <div key={d.stars} className="relative flex flex-1 flex-col items-center gap-1" style={{ height: "100%" }}>
                  {/* Reference line */}
                  <div
                    className="absolute w-full border-t-2 border-dashed border-border"
                    style={{ bottom: `${refHeight + 40}px` }}
                    title={`参考线: ${distributionLabels[d.stars]}`}
                  >
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
                      {distributionLabels[d.stars]}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className={`text-sm font-medium ${d.exceeded ? "text-red-600" : ""}`}>
                      {d.count}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        d.exceeded ? "bg-red-500" : "bg-primary"
                      }`}
                      style={{ height: `${barHeight}px` }}
                    />
                    <span className="text-sm font-bold">{d.stars}星</span>
                    <span className={`text-xs ${d.exceeded ? "font-bold text-red-600" : "text-muted-foreground"}`}>
                      {d.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                <th className="px-4 py-3 text-left font-medium">姓名</th>
                <th className="px-4 py-3 text-left font-medium">部门</th>
                <th className="px-4 py-3 text-center font-medium">自评状态</th>
                <th className="px-4 py-3 text-center font-medium">360均分</th>
                <th className="px-4 py-3 text-center font-medium">上级加权分</th>
                <th className="px-4 py-3 text-center font-medium">最终星级</th>
                <th className="px-4 py-3 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.user.id} className="border-b hover:bg-muted">
                  <td className="px-4 py-3 font-medium">{item.user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.user.department}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={item.selfEvalStatus === "imported" ? "default" : "outline"}>
                      {item.selfEvalStatus === "imported" ? "已导入" : "未导入"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">{item.peerAvg || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {item.supervisorWeighted != null ? (
                      <Badge variant="outline">{item.supervisorWeighted.toFixed(1)}</Badge>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.finalStars != null ? (
                      <Badge>{starLabels[item.finalStars]}</Badge>
                    ) : item.proposedStars != null ? (
                      <Badge variant="outline">{starLabels[item.proposedStars]}</Badge>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={preview}
                      onClick={() => {
                        if (preview) return;
                        setEditingUser(item.user.id);
                        setEditStars(item.finalStars ?? item.proposedStars ?? null);
                        setEditReason("");
                      }}
                    >
                      调整
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser && !preview} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              调整绩效星级 - {data.find((d) => d.user.id === editingUser)?.user.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">最终星级</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditStars(s)}
                    className={`rounded-lg border-2 px-4 py-2 font-bold transition-colors ${
                      editStars === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-border"
                    }`}
                  >
                    {s}星
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">调整原因</label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="请说明调整原因..."
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>取消</Button>
              <Button onClick={() => editingUser && saveCalibration(editingUser)} disabled={!editStars}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CalibrationPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-60 w-full" /><Skeleton className="h-48 w-full" /></div>}>
      <CalibrationContent />
    </Suspense>
  );
}
