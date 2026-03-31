import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFinalReviewConfigValue } from "@/lib/final-review";
import {
  computePeerReviewAverageFromReviews,
  getPeerReviewAbilityAverage,
  getPeerReviewPerformanceAverage,
  getPeerReviewValuesAverage,
} from "@/lib/peer-review-summary";
import { canAccessScoreNormalization } from "@/lib/score-normalization-permissions";
import { getActiveCycle, getSessionUser } from "@/lib/session";
import {
  computeAbilityAverage,
  computeValuesAverage,
  computeWeightedScoreFromDimensions,
  roundToOneDecimal,
} from "@/lib/weighted-score";

type DirectoryUser = {
  id: string;
  name: string;
  department: string;
  role: string;
};

type SupervisorEvalRecord = {
  id: string;
  evaluatorId: string;
  employeeId: string;
  submittedAt: Date | null;
  weightedScore: number | null;
  performanceStars: number | null;
  comprehensiveStars: number | null;
  learningStars: number | null;
  adaptabilityStars: number | null;
  valuesStars: number | null;
  candidStars: number | null;
  progressStars: number | null;
  altruismStars: number | null;
  rootStars: number | null;
  evaluator: {
    name: string;
    department: string | null;
  };
  employee: {
    name: string;
    department: string | null;
  };
};

type PeerReviewRecord = {
  id: string;
  reviewerId: string;
  revieweeId: string;
  submittedAt: Date | null;
  outputScore: number | null;
  collaborationScore: number | null;
  valuesScore: number | null;
  performanceStars: number | null;
  comprehensiveStars: number | null;
  learningStars: number | null;
  adaptabilityStars: number | null;
  candidStars: number | null;
  progressStars: number | null;
  altruismStars: number | null;
  rootStars: number | null;
  reviewer: {
    name: string;
    department: string | null;
  };
  reviewee: {
    name: string;
    department: string | null;
  };
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => value != null && !Number.isNaN(value));
  if (filtered.length === 0) return null;
  return roundToOneDecimal(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function buildTendency(offset: number | null) {
  if (offset == null) return "正常" as const;
  if (offset > 0.3) return "偏高" as const;
  if (offset < -0.3) return "偏低" as const;
  return "正常" as const;
}

function buildSummary(values: Array<number | null | undefined>, overallAverage: number | null) {
  const averageScore = average(values);
  const sampleCount = values.filter((value) => value != null && !Number.isNaN(value)).length;
  const offset = averageScore != null && overallAverage != null
    ? roundToOneDecimal(averageScore - overallAverage)
    : null;

  return {
    sampleCount,
    averageScore,
    offset,
    tendency: buildTendency(offset),
  };
}

function sortByTargetName(left: { targetName: string }, right: { targetName: string }) {
  return left.targetName.localeCompare(right.targetName, "zh-Hans-CN");
}

function getManagerReviewOverallScore(record: SupervisorEvalRecord) {
  return record.weightedScore ?? computeWeightedScoreFromDimensions({
    performanceStars: record.performanceStars,
    comprehensiveStars: record.comprehensiveStars,
    learningStars: record.learningStars,
    adaptabilityStars: record.adaptabilityStars,
    candidStars: record.candidStars,
    progressStars: record.progressStars,
    altruismStars: record.altruismStars,
    rootStars: record.rootStars,
  });
}

function buildManagerReviewDetails(records: SupervisorEvalRecord[]) {
  return records
    .map((record) => ({
      sourceRecordId: record.id,
      targetId: record.employeeId,
      targetName: record.employee.name,
      targetDepartment: record.employee.department,
      overallScore: getManagerReviewOverallScore(record),
      performanceScore: roundToOneDecimal(record.performanceStars),
      abilityScore: computeAbilityAverage(
        record.comprehensiveStars,
        record.learningStars,
        record.adaptabilityStars,
      ),
      valuesScore: record.valuesStars ?? computeValuesAverage(
        record.candidStars,
        record.progressStars,
        record.altruismStars,
        record.rootStars,
      ),
      submittedAt: record.submittedAt?.toISOString() ?? null,
    }))
    .sort(sortByTargetName);
}

function getPeerReviewOverallScore(record: PeerReviewRecord) {
  return computePeerReviewAverageFromReviews([record]);
}

function buildPeerReviewDetails(records: PeerReviewRecord[]) {
  return records
    .map((record) => ({
      sourceRecordId: record.id,
      targetId: record.revieweeId,
      targetName: record.reviewee.name,
      targetDepartment: record.reviewee.department,
      overallScore: getPeerReviewOverallScore(record),
      performanceScore: getPeerReviewPerformanceAverage(record),
      abilityScore: getPeerReviewAbilityAverage(record),
      valuesScore: getPeerReviewValuesAverage(record),
      submittedAt: record.submittedAt?.toISOString() ?? null,
    }))
    .sort(sortByTargetName);
}

function buildApplicationState(
  application:
    | { snapshotId: string; appliedAt: Date; revertedAt: Date | null }
    | null,
) {
  if (!application || application.revertedAt != null) {
    return {
      workspaceState: "RAW" as const,
      appliedAt: null,
      revertedAt: application?.revertedAt?.toISOString() ?? null,
      snapshotId: null,
      rollbackVisible: false,
    };
  }

  return {
    workspaceState: "STANDARDIZED" as const,
    appliedAt: application.appliedAt.toISOString(),
    revertedAt: null,
    snapshotId: application.snapshotId,
    rollbackVisible: true,
  };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonError("未登录", 401);
    }
    if (!canAccessScoreNormalization(user)) {
      return jsonError("无权查看打分分布校准", 403);
    }

    const cycle = await getActiveCycle();
    if (!cycle) {
      return jsonError("当前无活动周期", 404);
    }

    const [
      rawDirectoryUsers,
      configRecord,
      supervisorEvals,
      peerReviews,
      managerReviewApplication,
      peerReviewApplication,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          department: true,
          role: true,
        },
      }),
      prisma.finalReviewConfig.findUnique({
        where: { cycleId: cycle.id },
        select: {
          accessUserIds: true,
          finalizerUserIds: true,
          leaderEvaluatorUserIds: true,
          leaderSubjectUserIds: true,
          employeeSubjectUserIds: true,
          referenceStarRanges: true,
        },
      }),
      prisma.supervisorEval.findMany({
        where: { cycleId: cycle.id, status: "SUBMITTED" },
        select: {
          id: true,
          evaluatorId: true,
          employeeId: true,
          submittedAt: true,
          weightedScore: true,
          performanceStars: true,
          comprehensiveStars: true,
          learningStars: true,
          adaptabilityStars: true,
          valuesStars: true,
          candidStars: true,
          progressStars: true,
          altruismStars: true,
          rootStars: true,
          evaluator: {
            select: {
              name: true,
              department: true,
            },
          },
          employee: {
            select: {
              name: true,
              department: true,
            },
          },
        },
      }),
      prisma.peerReview.findMany({
        where: { cycleId: cycle.id, status: "SUBMITTED" },
        select: {
          id: true,
          reviewerId: true,
          revieweeId: true,
          submittedAt: true,
          outputScore: true,
          collaborationScore: true,
          valuesScore: true,
          performanceStars: true,
          comprehensiveStars: true,
          learningStars: true,
          adaptabilityStars: true,
          candidStars: true,
          progressStars: true,
          altruismStars: true,
          rootStars: true,
          reviewer: {
            select: {
              name: true,
              department: true,
            },
          },
          reviewee: {
            select: {
              name: true,
              department: true,
            },
          },
        },
      }),
      prisma.managerReviewNormalizationApplication.findUnique({
        where: {
          cycleId_source: {
            cycleId: cycle.id,
            source: "SUPERVISOR_EVAL",
          },
        },
        select: {
          snapshotId: true,
          appliedAt: true,
          revertedAt: true,
        },
      }),
      prisma.scoreNormalizationApplication.findUnique({
        where: {
          cycleId_source: {
            cycleId: cycle.id,
            source: "PEER_REVIEW",
          },
        },
        select: {
          snapshotId: true,
          appliedAt: true,
          revertedAt: true,
        },
      }),
    ]);

    const directoryUsers: DirectoryUser[] = rawDirectoryUsers.map((entry) => ({
      id: entry.id,
      name: entry.name,
      department: entry.department ?? "",
      role: entry.role,
    }));

    const usersById = new Map(directoryUsers.map((entry) => [entry.id, entry]));
    const config = getFinalReviewConfigValue(cycle.id, configRecord, directoryUsers);

    const leaderUsers = config.leaderSubjectUserIds
      .map((id) => usersById.get(id))
      .filter((entry): entry is DirectoryUser => Boolean(entry));
    const leaderIdSet = new Set(leaderUsers.map((entry) => entry.id));
    const employeeUsers = config.employeeSubjectUserIds
      .filter((id) => !leaderIdSet.has(id))
      .map((id) => usersById.get(id))
      .filter((entry): entry is DirectoryUser => Boolean(entry));

    const overallManagerAverage = average(
      supervisorEvals.map((record) => getManagerReviewOverallScore(record)),
    );
    const overallPeerAverage = average(
      peerReviews.map((record) => getPeerReviewOverallScore(record)),
    );

    const rows = [
      ...leaderUsers.map((person) => {
        const managerRecords = supervisorEvals.filter((record) => record.evaluatorId === person.id);
        const peerRecords = peerReviews.filter((record) => record.reviewerId === person.id);
        const managerDetails = buildManagerReviewDetails(managerRecords);
        const peerDetails = buildPeerReviewDetails(peerRecords);

        return {
          userId: person.id,
          name: person.name,
          department: person.department || null,
          segment: "主管" as const,
          roles: ["初评人", "环评人"] as Array<"初评人" | "环评人">,
          managerReview: {
            summary: buildSummary(
              managerDetails.map((entry) => entry.overallScore),
              overallManagerAverage,
            ),
            details: managerDetails,
          },
          peerReview: {
            summary: buildSummary(
              peerDetails.map((entry) => entry.overallScore),
              overallPeerAverage,
            ),
            details: peerDetails,
          },
        };
      }),
      ...employeeUsers.map((person) => {
        const peerRecords = peerReviews.filter((record) => record.reviewerId === person.id);
        const peerDetails = buildPeerReviewDetails(peerRecords);

        return {
          userId: person.id,
          name: person.name,
          department: person.department || null,
          segment: "员工" as const,
          roles: ["环评人"] as Array<"初评人" | "环评人">,
          managerReview: {
            summary: buildSummary([], overallManagerAverage),
            details: [],
          },
          peerReview: {
            summary: buildSummary(
              peerDetails.map((entry) => entry.overallScore),
              overallPeerAverage,
            ),
            details: peerDetails,
          },
        };
      }),
    ];

    return NextResponse.json({
      cycle: {
        id: cycle.id,
        name: cycle.name,
      },
      rosterSummary: {
        total: rows.length,
        leaderCount: leaderUsers.length,
        employeeCount: employeeUsers.length,
      },
      applications: {
        managerReview: buildApplicationState(managerReviewApplication),
        peerReview: buildApplicationState(peerReviewApplication),
      },
      rows: rows,
    });
  } catch (error) {
    return jsonError((error as Error).message, 500);
  }
}
