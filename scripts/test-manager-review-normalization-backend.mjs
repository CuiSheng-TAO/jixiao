import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("workspace route builds a configured 54-person roster and includes both manager-review and peer-review data", () => {
  const source = read("src/app/api/manager-review-normalization/workspace/route.ts");

  assert.equal(
    source.includes("getFinalReviewConfigValue"),
    true,
    "workspace route should derive its 54-person roster from the current final-review config",
  );
  assert.equal(
    source.includes("leaderSubjectUserIds") && source.includes("employeeSubjectUserIds"),
    true,
    "workspace route should read both leader and employee subject lists",
  );
  assert.equal(
    source.includes("peerReview.findMany") && source.includes("supervisorEval.findMany"),
    true,
    "workspace route should load both submitted peer reviews and submitted supervisor reviews",
  );
  assert.equal(
    source.includes("rows:") && source.includes("applications:"),
    true,
    "workspace route should return a ledger row list plus per-source application states",
  );
  assert.equal(
    source.includes("初评人") && source.includes("环评人"),
    true,
    "workspace route should label supervisors as manager reviewers and peer reviewers",
  );
});

test("normalization workspace types expose a single ledger row with split manager-review and peer-review detail sections", () => {
  const source = read("src/components/manager-review-normalization/types.ts");

  assert.equal(
    source.includes("roles: Array<\"初评人\" | \"环评人\">"),
    true,
    "types should model the per-row role tags explicitly",
  );
  assert.equal(
    source.includes("managerReview") && source.includes("peerReview"),
    true,
    "types should keep manager-review and peer-review summaries side by side on each ledger row",
  );
  assert.equal(
    source.includes("details:") && source.includes("sampleCount") && source.includes("averageScore"),
    true,
    "types should expose sample count, averages, and expandable detail lists",
  );
});

test("manager-review page keeps separate apply and revert paths for manager-review and peer-review normalization", () => {
  const source = read("src/app/(main)/manager-review-normalization/page.tsx");

  assert.equal(
    source.includes("/api/manager-review-normalization/apply") &&
      source.includes("/api/manager-review-normalization/revert"),
    true,
    "page should keep the manager-review apply and revert routes for supervisor-eval normalization",
  );
  assert.equal(
    source.includes("/api/score-normalization/apply") &&
      source.includes("/api/score-normalization/revert"),
    true,
    "page should also keep peer-review apply and revert routes for 360 normalization",
  );
});
