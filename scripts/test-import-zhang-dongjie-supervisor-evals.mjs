import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const scriptUrl = pathToFileURL(
  path.resolve(import.meta.dirname, "./import-zhang-dongjie-supervisor-evals.ts"),
).href;

const {
  EVALUATOR_NAME,
  SCREENSHOT_RESULTS,
  buildImportPlan,
  createSupervisorEvalPayload,
} = await import(scriptUrl);

test("screenshot source is the fixed Zhang Dongjie -> total star mapping", () => {
  assert.equal(EVALUATOR_NAME, "张东杰");
  assert.deepEqual(
    SCREENSHOT_RESULTS,
    [
      ["李泽龙", 5],
      ["沈楚城", 5],
      ["许斯荣", 4],
      ["赖永涛", 4],
      ["陈毅强", 4],
      ["曹文跃", 4],
      ["陈家兴", 4],
      ["张福强", 3],
      ["胡毅薇", 3],
      ["严骏", 3],
      ["洪炯腾", 3],
      ["余一铭", 3],
      ["江培章", 3],
      ["薛琳蕊", 3],
      ["陈佳杰", 3],
      ["张建生", 2],
      ["顾元舜", 2],
      ["刘一", 1],
    ],
  );
});

test("payload flattens the screenshot star onto all supervisor-eval subdimensions and marks submitted", () => {
  const now = new Date("2026-03-30T09:00:00.000Z");
  const payload = createSupervisorEvalPayload(4, now);

  assert.equal(payload.performanceStars, 4);
  assert.equal(payload.comprehensiveStars, 4);
  assert.equal(payload.learningStars, 4);
  assert.equal(payload.adaptabilityStars, 4);
  assert.equal(payload.abilityStars, 4);
  assert.equal(payload.candidStars, 4);
  assert.equal(payload.progressStars, 4);
  assert.equal(payload.altruismStars, 4);
  assert.equal(payload.rootStars, 4);
  assert.equal(payload.valuesStars, 4);
  assert.equal(payload.weightedScore, 4);
  assert.equal(payload.status, "SUBMITTED");
  assert.equal(payload.submittedAt?.toISOString(), now.toISOString());
  assert.match(
    payload.performanceComment,
    /由截图补录导入：原始记录仅包含总星级 4 星，详细维度评语待补充/,
  );
  assert.equal(payload.performanceComment, payload.abilityComment);
  assert.equal(payload.performanceComment, payload.valuesComment);
  assert.equal(payload.performanceComment, payload.candidComment);
  assert.equal(payload.performanceComment, payload.progressComment);
  assert.equal(payload.performanceComment, payload.altruismComment);
  assert.equal(payload.performanceComment, payload.rootComment);
});

test("import plan only creates missing current assignments and blocks invalid screenshot targets", () => {
  const now = new Date("2026-03-30T10:00:00.000Z");
  const plan = buildImportPlan({
    cycle: { id: "cycle-1", name: "2025年下半年绩效考核", status: "SUPERVISOR_EVAL" },
    evaluatorName: "张东杰",
    screenshotResults: [
      ["余一铭", 3],
      ["曹文跃", 4],
      ["张福强", 3],
    ],
    users: [
      { id: "u-evaluator", name: "张东杰", supervisorId: "boss", supervisor: { id: "boss", name: "吴承霖" } },
      { id: "u-yy", name: "余一铭", supervisorId: "boss", supervisor: { id: "boss", name: "吴承霖" } },
      { id: "u-cwy", name: "曹文跃", supervisorId: "boss", supervisor: { id: "boss", name: "吴承霖" } },
      { id: "u-zfq", name: "张福强", supervisorId: "boss", supervisor: { id: "boss", name: "吴承霖" } },
      { id: "boss", name: "吴承霖", supervisorId: null, supervisor: null },
    ],
    existingSupervisorEvals: [
      {
        employeeId: "u-cwy",
        evaluatorId: "u-evaluator",
        evaluatorName: "张东杰",
      },
    ],
    now,
  });

  assert.equal(plan.totalSourceCount, 3);
  assert.equal(plan.rowsToCreate.length, 1);
  assert.equal(plan.rowsToCreate[0].employeeName, "余一铭");
  assert.equal(plan.rowsToCreate[0].data.weightedScore, 3);
  assert.equal(plan.skippedExisting.length, 1);
  assert.equal(plan.skippedExisting[0].employeeName, "曹文跃");
  assert.equal(plan.invalidTargets.length, 1);
  assert.match(plan.invalidTargets[0].reason, /不是张东杰当前有效评估对象/);
});

