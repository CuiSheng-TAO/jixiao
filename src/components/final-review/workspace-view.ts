import type { EmployeeRow, LeaderRow } from "./types";

export type ScoreBandBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
  names: string[];
};

export function buildScoreBandBuckets(rows: EmployeeRow[]): ScoreBandBucket[] {
  const bands = [
    { label: "1.0-1.9", min: 1, max: 1.99 },
    { label: "2.0-2.9", min: 2, max: 2.99 },
    { label: "3.0-3.4", min: 3, max: 3.49 },
    { label: "3.5-3.9", min: 3.5, max: 3.99 },
    { label: "4.0-4.4", min: 4, max: 4.49 },
    { label: "4.5-5.0", min: 4.5, max: 5 },
  ];

  return bands.map((band) => {
    const matched = rows.filter((row) => row.weightedScore != null && row.weightedScore >= band.min && row.weightedScore <= band.max);
    return {
      ...band,
      count: matched.length,
      names: matched.map((row) => row.name),
    };
  });
}

export function buildEmployeePriorityGroups(rows: EmployeeRow[]) {
  return {
    pending: rows.filter((row) => !row.officialConfirmedAt),
    disagreement: rows.filter((row) => row.opinions.some((opinion) => opinion.decision === "OVERRIDE")),
    anomaly: rows.filter((row) => row.anomalyTags.length > 0),
    highBandPending: rows.filter((row) => (row.weightedScore ?? 0) >= 4 && !row.officialConfirmedAt),
    lowBandAnomaly: rows.filter((row) => (row.weightedScore ?? 99) < 3 && row.anomalyTags.length > 0),
  };
}

export function buildLeaderSubmissionSummary(rows: LeaderRow[]) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    bothSubmitted: row.bothSubmitted,
    submittedCount: row.evaluations.filter((evaluation) => evaluation.status === "SUBMITTED").length,
  }));
}
