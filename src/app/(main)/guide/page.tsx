import { getActiveCycle } from "@/lib/session";
import { GuidePage } from "./guide-client";
import type { CycleData } from "./guide-client";

export default async function GuidePageServer() {
  let cycleData: CycleData | null = null;

  try {
    const cycle = await getActiveCycle();
    if (cycle) {
      cycleData = {
        name: cycle.name,
        status: cycle.status,
        selfEvalStart: cycle.selfEvalStart?.toISOString() ?? null,
        selfEvalEnd: cycle.selfEvalEnd?.toISOString() ?? null,
        peerReviewStart: cycle.peerReviewStart?.toISOString() ?? null,
        peerReviewEnd: cycle.peerReviewEnd?.toISOString() ?? null,
        supervisorStart: cycle.supervisorStart?.toISOString() ?? null,
        supervisorEnd: cycle.supervisorEnd?.toISOString() ?? null,
        calibrationStart: cycle.calibrationStart?.toISOString() ?? null,
        calibrationEnd: cycle.calibrationEnd?.toISOString() ?? null,
        meetingStart: cycle.meetingStart?.toISOString() ?? null,
        meetingEnd: cycle.meetingEnd?.toISOString() ?? null,
        appealStart: cycle.appealStart?.toISOString() ?? null,
        appealEnd: cycle.appealEnd?.toISOString() ?? null,
      };
    }
  } catch {
    // fallback to null, client will default to step 0
  }

  return <GuidePage cycle={cycleData} />;
}
