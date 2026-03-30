"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistributionEntry } from "./types";

type DepartmentDistributionBoardProps = {
  departments: Array<{
    department: string;
    total: number;
    distribution: DistributionEntry[];
  }>;
};

export function DepartmentDistributionBoard({ departments }: DepartmentDistributionBoardProps) {
  const maxCount = Math.max(
    1,
    ...departments.flatMap((department) => department.distribution.map((bucket) => bucket.count)),
  );

  return (
    <Card className="rounded-[28px] border shadow-none">
      <CardHeader>
        <CardTitle className="text-lg text-[var(--cockpit-foreground)]">第二步：按团队分布</CardTitle>
        <p className="text-sm leading-6 text-[var(--cockpit-muted-foreground)]">
          先看哪个团队的星级分布偏离建议区间；把鼠标停在人数上，可以看到这个星级下具体是谁。
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        {departments.map((item) => (
          <section key={item.department} className="rounded-[24px] border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--cockpit-foreground)]">{item.department}</p>
                <p className="mt-1 text-xs text-[var(--cockpit-muted-foreground)]">{item.total} 人</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {item.distribution.map((bucket) => (
                <div key={`${item.department}:${bucket.stars}`} className="grid min-h-[40px] grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
                  <span className="text-sm text-[var(--cockpit-muted-foreground)]">{bucket.stars}星</span>
                  <div className="relative">
                    <div className="h-8 rounded-[14px] bg-[color:rgba(191,127,65,0.08)]" />
                    <div
                      className={
                        bucket.exceeded
                          ? "absolute inset-y-0 left-0 origin-left rounded-r-[999px] rounded-l-[10px] bg-[color:#f87171]"
                          : "absolute inset-y-0 left-0 origin-left rounded-r-[999px] rounded-l-[10px] bg-[color:#c88a4a]"
                      }
                      style={{ width: `${Math.max((bucket.count / maxCount) * 100, bucket.count > 0 ? 16 : 0)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-[11px] text-[var(--cockpit-muted-foreground)]">
                        {bucket.names.length > 0 ? bucket.names.join("、") : `当前没有员工落在 ${bucket.stars} 星`}
                      </span>
                      <span
                        className={
                          bucket.exceeded
                            ? "text-sm font-medium text-[color:#b45309]"
                            : "text-sm font-medium text-[var(--cockpit-foreground)]"
                        }
                        title={bucket.names.length > 0 ? bucket.names.join("、") : `当前没有员工落在 ${bucket.stars} 星`}
                      >
                        {bucket.count}人
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
