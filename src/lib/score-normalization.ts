export type ScoreNormalizationSource = "PEER_REVIEW" | "SUPERVISOR_EVAL";

export type ScoreNormalizationStrategy = "RANK_BUCKET";

export type ScoreNormalizationRawRecord = {
  id: string;
  subjectId: string;
  subjectName?: string | null;
  score: number | null;
};

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
  strategy: ScoreNormalizationStrategy;
  targetBucketCount: number;
  rawRecordCount: number;
  createdAt: Date;
  entries: ScoreNormalizationEntryShape[];
  simulatedDistribution: ScoreNormalizationBucketSummary[];
};

export type ScoreNormalizationApplicationShape = {
  cycleId: string;
  source: ScoreNormalizationSource;
  snapshotId: string;
  appliedAt: Date;
  revertedAt: Date | null;
  status: "APPLIED" | "REVERTED";
};

export type ScoreNormalizationWorkspacePayload = {
  cycleId: string;
  source: ScoreNormalizationSource;
  strategy: ScoreNormalizationStrategy;
  targetBucketCount: number;
  rawDistribution: ScoreNormalizationBucketSummary[];
  simulatedDistribution: ScoreNormalizationBucketSummary[];
  application: ScoreNormalizationApplicationShape | null;
  snapshot: ScoreNormalizationSnapshotShape;
};

export type ScoreNormalizationApplyResult = ScoreNormalizationWorkspacePayload & {
  application: ScoreNormalizationApplicationShape;
};

export type ScoreNormalizationRevertResult = {
  cycleId: string;
  source: ScoreNormalizationSource;
  where: ReturnType<typeof buildScoreNormalizationApplicationWhere>;
  revertedAt: Date;
};

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeBucketCount(requestedBucketCount: number | null | undefined) {
  if (!Number.isFinite(requestedBucketCount ?? NaN)) return 5;
  return Math.min(5, Math.max(1, Math.round(requestedBucketCount ?? 5)));
}

function bucketLabelForIndex(bucketIndex: number) {
  return ["一星", "二星", "三星", "四星", "五星"][bucketIndex - 1] ?? `${bucketIndex}星`;
}

function buildEmptyBucketSummaries(bucketCount: number) {
  return Array.from({ length: bucketCount }, (_, index) => ({
    bucketIndex: index + 1,
    bucketLabel: bucketLabelForIndex(index + 1),
    count: 0,
    pct: 0,
    names: [] as string[],
  }));
}

function finalizeBucketSummaries(buckets: ScoreNormalizationBucketSummary[], total: number) {
  return buckets.map((bucket) => ({
    ...bucket,
    pct: total > 0 ? roundToOneDecimal((bucket.count / total) * 100) : 0,
    names: [...bucket.names],
  }));
}

function normalizeRawScore(rawScore: number | null | undefined, bucketCount: number) {
  if (rawScore == null || Number.isNaN(rawScore)) return null;
  const rounded = Math.round(rawScore);
  return Math.min(bucketCount, Math.max(1, rounded));
}

function getDisplayName(record: ScoreNormalizationRawRecord) {
  return record.subjectName?.trim() || record.subjectId;
}

export function buildTargetBucketCount(_totalCount: number, requestedBucketCount = 5) {
  return normalizeBucketCount(requestedBucketCount);
}

export type ScoreNormalizationTargetDistribution = {
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
};

export function buildTargetDistributionCounts(totalCount: number): ScoreNormalizationTargetDistribution {
  const normalizedTotal = Math.max(0, Math.floor(totalCount));
  const fiveStarCount = Math.floor(normalizedTotal * 0.1);
  const fourStarCount = Math.floor(normalizedTotal * 0.2);
  const twoStarCount = Math.floor(normalizedTotal * 0.15);
  const oneStarCount = Math.floor(normalizedTotal * 0.05);
  const threeStarCount = Math.max(
    0,
    normalizedTotal - fiveStarCount - fourStarCount - twoStarCount - oneStarCount,
  );

  return {
    oneStarCount,
    twoStarCount,
    threeStarCount,
    fourStarCount,
    fiveStarCount,
  };
}

export function assignRankBuckets(
  rawRecords: ScoreNormalizationRawRecord[],
  _bucketCount = 5,
): ScoreNormalizationEntryShape[] {
  const distribution = buildTargetDistributionCounts(rawRecords.filter((record) => record.score != null && !Number.isNaN(record.score as number)).length);
  const scoredRecords = rawRecords
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.score != null && !Number.isNaN(record.score as number))
    .sort((left, right) => {
      const scoreDiff = (right.record.score as number) - (left.record.score as number);
      if (scoreDiff !== 0) return scoreDiff;
      return left.record.id.localeCompare(right.record.id);
    });

  const fiveBoundary = distribution.fiveStarCount;
  const fourBoundary = fiveBoundary + distribution.fourStarCount;
  const threeBoundary = fourBoundary + distribution.threeStarCount;
  const twoBoundary = threeBoundary + distribution.twoStarCount;

  const assignedEntries = scoredRecords.map(({ record }, index) => {
    const bucketIndex = index < fiveBoundary
      ? 5
      : index < fourBoundary
        ? 4
        : index < threeBoundary
          ? 3
          : index < twoBoundary
            ? 2
            : 1;
    return {
      sourceRecordId: record.id,
      subjectId: record.subjectId,
      subjectName: record.subjectName?.trim() || null,
      rawScore: record.score,
      rankIndex: index + 1,
      bucketIndex,
      bucketLabel: bucketLabelForIndex(bucketIndex),
      normalizedScore: bucketIndex,
    };
  });

  const unscoredEntries = rawRecords
    .filter((record) => record.score == null || Number.isNaN(record.score as number))
    .map((record) => ({
      sourceRecordId: record.id,
      subjectId: record.subjectId,
      subjectName: record.subjectName?.trim() || null,
      rawScore: record.score,
      rankIndex: null,
      bucketIndex: null,
      bucketLabel: null,
      normalizedScore: null,
    }));

  return [...assignedEntries, ...unscoredEntries];
}

export function summarizeRawScoreDistribution(
  rawRecords: ScoreNormalizationRawRecord[],
  bucketCount = 5,
): ScoreNormalizationBucketSummary[] {
  const buckets = buildEmptyBucketSummaries(normalizeBucketCount(bucketCount));
  let counted = 0;

  for (const record of rawRecords) {
    const bucketIndex = normalizeRawScore(record.score, buckets.length);
    if (bucketIndex == null) continue;
    counted += 1;
    const bucket = buckets[bucketIndex - 1];
    bucket.count += 1;
    bucket.names.push(getDisplayName(record));
  }

  return finalizeBucketSummaries(buckets, counted);
}

export function summarizeSimulatedDistribution(
  entries: ScoreNormalizationEntryShape[],
  bucketCount = 5,
): ScoreNormalizationBucketSummary[] {
  const buckets = buildEmptyBucketSummaries(normalizeBucketCount(bucketCount));
  let counted = 0;

  for (const entry of entries) {
    if (entry.bucketIndex == null) continue;
    counted += 1;
    const bucket = buckets[entry.bucketIndex - 1];
    bucket.count += 1;
    bucket.names.push(entry.subjectName?.trim() || entry.subjectId);
  }

  return finalizeBucketSummaries(buckets, counted);
}

export function shapeScoreNormalizationSnapshot(params: {
  cycleId: string;
  source: ScoreNormalizationSource;
  rawRecords: ScoreNormalizationRawRecord[];
  targetBucketCount?: number;
  strategy?: ScoreNormalizationStrategy;
}) {
  const targetBucketCount = buildTargetBucketCount(
    params.rawRecords.length,
    params.targetBucketCount ?? 5,
  );
  const entries = assignRankBuckets(params.rawRecords, targetBucketCount);

  return {
    cycleId: params.cycleId,
    source: params.source,
    strategy: params.strategy ?? "RANK_BUCKET",
    targetBucketCount,
    rawRecordCount: params.rawRecords.length,
    createdAt: new Date(),
    entries,
    simulatedDistribution: summarizeSimulatedDistribution(entries, targetBucketCount),
  } satisfies ScoreNormalizationSnapshotShape;
}

export function simulateScoreNormalizationLayer(params: {
  cycleId: string;
  source: ScoreNormalizationSource;
  rawRecords: ScoreNormalizationRawRecord[];
  targetBucketCount?: number;
  strategy?: ScoreNormalizationStrategy;
}) {
  return shapeScoreNormalizationSnapshot(params);
}

export function buildScoreNormalizationApplicationRecord(params: {
  cycleId: string;
  source: ScoreNormalizationSource;
  snapshotId: string;
  appliedAt?: Date;
  revertedAt?: Date | null;
}): ScoreNormalizationApplicationShape {
  return {
    cycleId: params.cycleId,
    source: params.source,
    snapshotId: params.snapshotId,
    appliedAt: params.appliedAt ?? new Date(),
    revertedAt: params.revertedAt ?? null,
    status: params.revertedAt ? "REVERTED" : "APPLIED",
  };
}

export function buildScoreNormalizationApplicationWhere(params: {
  cycleId: string;
  source: ScoreNormalizationSource;
}) {
  return {
    cycleId: params.cycleId,
    source: params.source,
  } as const;
}

export function buildScoreNormalizationWorkspacePayload(params: {
  cycleId: string;
  source: ScoreNormalizationSource;
  rawRecords: ScoreNormalizationRawRecord[];
  application?: ScoreNormalizationApplicationShape | null;
  targetBucketCount?: number;
  strategy?: ScoreNormalizationStrategy;
}): ScoreNormalizationWorkspacePayload {
  const snapshot = shapeScoreNormalizationSnapshot(params);
  return {
    cycleId: snapshot.cycleId,
    source: snapshot.source,
    strategy: snapshot.strategy,
    targetBucketCount: snapshot.targetBucketCount,
    rawDistribution: summarizeRawScoreDistribution(params.rawRecords, snapshot.targetBucketCount),
    simulatedDistribution: snapshot.simulatedDistribution,
    application: params.application ?? null,
    snapshot,
  };
}

export function applyScoreNormalizationLayer(params: {
  cycleId: string;
  source: ScoreNormalizationSource;
  snapshotId: string;
  rawRecords: ScoreNormalizationRawRecord[];
  application?: ScoreNormalizationApplicationShape | null;
  targetBucketCount?: number;
  strategy?: ScoreNormalizationStrategy;
  appliedAt?: Date;
}): ScoreNormalizationApplyResult {
  const snapshot = shapeScoreNormalizationSnapshot(params);
  const application =
    params.application ??
    buildScoreNormalizationApplicationRecord({
      cycleId: params.cycleId,
      source: params.source,
      snapshotId: params.snapshotId,
      appliedAt: params.appliedAt,
    });

  return {
    cycleId: snapshot.cycleId,
    source: snapshot.source,
    strategy: snapshot.strategy,
    targetBucketCount: snapshot.targetBucketCount,
    rawDistribution: summarizeRawScoreDistribution(params.rawRecords, snapshot.targetBucketCount),
    simulatedDistribution: snapshot.simulatedDistribution,
    application,
    snapshot,
  };
}

export function revertScoreNormalizationLayer(params: {
  cycleId: string;
  source: ScoreNormalizationSource;
  revertedAt?: Date;
}): ScoreNormalizationRevertResult {
  return {
    cycleId: params.cycleId,
    source: params.source,
    where: buildScoreNormalizationApplicationWhere(params),
    revertedAt: params.revertedAt ?? new Date(),
  };
}

export function getAppliedNormalizationMap(
  applications: ScoreNormalizationApplicationShape[],
) {
  const map = new Map<string, ScoreNormalizationApplicationShape>();
  for (const application of applications) {
    if (application.revertedAt) continue;
    map.set(`${application.cycleId}:${application.source}`, application);
  }
  return map;
}
