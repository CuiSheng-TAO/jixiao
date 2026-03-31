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
