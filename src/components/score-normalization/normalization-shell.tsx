"use client";

import { ChangePreviewTable } from "./change-preview-table";
import { DistributionDiffChart } from "./distribution-diff-chart";
import { NormalizationOverview } from "./normalization-overview";
import { ApplyPanel } from "./apply-panel";
import { RaterBiasTable } from "./rater-bias-table";
import type { ScoreNormalizationWorkspaceResponse } from "./types";

type NormalizationShellProps = {
  workspace: ScoreNormalizationWorkspaceResponse;
};

function getRawBucketIndex(score: number | null) {
  if (score == null || Number.isNaN(score)) return null;
  return Math.min(5, Math.max(1, Math.round(score)));
}

export function NormalizationShell({ workspace }: NormalizationShellProps) {
  const shiftedCount = workspace.snapshot.entries.filter((entry) => {
    const rawBucket = getRawBucketIndex(entry.rawScore);
    return rawBucket != null && entry.normalizedScore != null && rawBucket !== entry.normalizedScore;
  }).length;

  return (
    <section className="space-y-5">
      <NormalizationOverview
        source={workspace.source}
        cycleName={workspace.cycle.name}
        rawDistribution={workspace.rawDistribution}
        simulatedDistribution={workspace.simulatedDistribution}
        application={workspace.application}
        shiftedCount={shiftedCount}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <DistributionDiffChart
          rawDistribution={workspace.rawDistribution}
          simulatedDistribution={workspace.simulatedDistribution}
        />
        <RaterBiasTable rawDistribution={workspace.rawDistribution} />
      </div>

      <ChangePreviewTable entries={workspace.snapshot.entries} />

      <ApplyPanel source={workspace.source} application={workspace.application} />
    </section>
  );
}

