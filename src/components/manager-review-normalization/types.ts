export type NormalizationRole = "初评人" | "环评人";

export type NormalizationTendency = "偏高" | "偏低" | "正常";

export type NormalizationApplicationState = {
  workspaceState: "RAW" | "STANDARDIZED";
  appliedAt: string | null;
  revertedAt: string | null;
  snapshotId: string | null;
  rollbackVisible: boolean;
};

export type NormalizationLedgerSummary = {
  sampleCount: number;
  averageScore: number | null;
  offset: number | null;
  tendency: NormalizationTendency;
};

export type NormalizationLedgerDetail = {
  sourceRecordId: string;
  targetId: string;
  targetName: string;
  targetDepartment: string | null;
  overallScore: number | null;
  performanceScore: number | null;
  abilityScore: number | null;
  valuesScore: number | null;
  submittedAt: string | null;
};

export type NormalizationLedgerSection = {
  summary: NormalizationLedgerSummary;
  details: NormalizationLedgerDetail[];
};

export type NormalizationLedgerRow = {
  userId: string;
  name: string;
  department: string | null;
  segment: "主管" | "员工";
  roles: Array<"初评人" | "环评人">;
  managerReview: NormalizationLedgerSection;
  peerReview: NormalizationLedgerSection;
};

export type ManagerReviewNormalizationWorkspaceResponse = {
  cycle: {
    id: string;
    name: string;
  };
  rosterSummary: {
    total: number;
    leaderCount: number;
    employeeCount: number;
  };
  applications: {
    managerReview: NormalizationApplicationState;
    peerReview: NormalizationApplicationState;
  };
  rows: NormalizationLedgerRow[];
};

// Compatibility aliases for legacy manager-review-normalization components
export type ManagerReviewNormalizationApplicationState = NormalizationApplicationState;

export type ManagerReviewNormalizationSummary = {
  currentSourceCount: number;
  abnormalRaterCount: number;
  shiftedPeopleCount: number;
  skewedDepartmentCount: number;
  workspaceState: NormalizationApplicationState["workspaceState"];
};

export type ManagerReviewNormalizationBucketSummary = {
  bucketIndex: number;
  bucketLabel: string;
  count: number;
  pct: number;
  names: string[];
};

export type ManagerReviewNormalizationRaterBiasRow = {
  raterId: string;
  raterName: string;
  raterDepartment: string | null;
  sampleCount: number;
  averageScore: number | null;
  offset: number | null;
  tendency: NormalizationTendency;
  isAbnormal: boolean;
};

export type ManagerReviewNormalizationMovementRow = {
  sourceRecordId: string;
  subjectId: string;
  subjectName: string | null;
  subjectDepartment: string | null;
  rawScore: number | null;
  rawBucket: number | null;
  reviewerNormalizedBucket: number | null;
  departmentNormalizedBucket: number | null;
  rankDelta: number | null;
  movementLabel: "上调" | "下调" | "不变" | "待定";
};
