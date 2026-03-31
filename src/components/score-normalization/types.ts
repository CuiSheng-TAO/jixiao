export type ScoreNormalizationSource = "PEER_REVIEW" | "SUPERVISOR_EVAL";

export type ScoreNormalizationBucketSummary = {
  bucketIndex: number;
  bucketLabel: string;
  count: number;
  pct: number;
  names: string[];
};

export type ScoreNormalizationEntryShape = {
  sourceRecordId: string;
  subjectId: string;
  subjectName: string | null;
  rawScore: number | null;
  rankIndex: number | null;
  bucketIndex: number | null;
  bucketLabel: string | null;
  normalizedScore: number | null;
};

export type ScoreNormalizationSnapshotShape = {
  cycleId: string;
  source: ScoreNormalizationSource;
  strategy: string;
  targetBucketCount: number;
  rawRecordCount: number;
  createdAt: string;
  entries: ScoreNormalizationEntryShape[];
  simulatedDistribution: ScoreNormalizationBucketSummary[];
};

export type ScoreNormalizationApplicationShape = {
  cycleId: string;
  source: ScoreNormalizationSource;
  snapshotId: string;
  appliedAt: string;
  revertedAt: string | null;
  status: "APPLIED" | "REVERTED";
};

export type ScoreNormalizationWorkspacePayload = {
  cycleId: string;
  source: ScoreNormalizationSource;
  strategy: string;
  targetBucketCount: number;
  rawDistribution: ScoreNormalizationBucketSummary[];
  simulatedDistribution: ScoreNormalizationBucketSummary[];
  application: ScoreNormalizationApplicationShape | null;
  snapshot: ScoreNormalizationSnapshotShape;
};

export type ScoreNormalizationWorkspaceResponse = ScoreNormalizationWorkspacePayload & {
  cycle: {
    id: string;
    name: string;
  };
};

export type ScoreNormalizationSourceOption = {
  source: ScoreNormalizationSource;
  label: string;
  shortLabel: string;
  description: string;
};

export const SCORE_NORMALIZATION_SOURCE_OPTIONS: ScoreNormalizationSourceOption[] = [
  {
    source: "PEER_REVIEW",
    label: "360环评分布校准",
    shortLabel: "360环评",
    description: "先看被评人收到的 360 结果，再判断是否出现整体偏高或偏低的打分倾向。",
  },
  {
    source: "SUPERVISOR_EVAL",
    label: "绩效初评分布校准",
    shortLabel: "绩效初评",
    description: "先看直属上级初评分布，再对照排名和分桶后的模拟结果。",
  },
];

export const SCORE_NORMALIZATION_TARGET_BANDS = [
  { bucketIndex: 1, bucketLabel: "一星", targetPct: 5 },
  { bucketIndex: 2, bucketLabel: "二星", targetPct: 15 },
  { bucketIndex: 3, bucketLabel: "三星", targetPct: 50 },
  { bucketIndex: 4, bucketLabel: "四星", targetPct: 20 },
  { bucketIndex: 5, bucketLabel: "五星", targetPct: 10 },
];

export function getScoreNormalizationSourceOption(source: ScoreNormalizationSource) {
  return SCORE_NORMALIZATION_SOURCE_OPTIONS.find((item) => item.source === source) ?? SCORE_NORMALIZATION_SOURCE_OPTIONS[0];
}

export function formatScoreNormalizationDateTime(value: string | null | undefined) {
  if (!value) return "尚未应用";

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}

export function resolveScoreNormalizationSource(value: string | null | undefined): ScoreNormalizationSource {
  return value === "SUPERVISOR_EVAL" ? "SUPERVISOR_EVAL" : "PEER_REVIEW";
}

