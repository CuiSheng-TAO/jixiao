import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("admin verify data tracks pending peer review assignee names", () => {
  const source = read("src/lib/admin-verify.ts");

  assert.equal(
    source.includes("peerReviewReceivedPendingReviewerNames: string[];"),
    true,
    "verify roster rows should expose pending reviewer names for peer reviews received by the user",
  );
  assert.equal(
    source.includes("peerReviewAssignedPendingRevieweeNames: string[];"),
    true,
    "verify roster rows should expose pending reviewee names for peer reviews assigned to the user",
  );
  assert.equal(
    source.includes("const peerReviewReceivedPendingReviewerNames = peerReviewReceived.pendingReviewerNames;"),
    true,
    "verify data should compute a pending reviewer name list per reviewee",
  );
  assert.equal(
    source.includes("const peerReviewAssignedPendingRevieweeNames = peerReviewAssigned.pendingRevieweeNames;"),
    true,
    "verify data should compute a pending reviewee name list per reviewer",
  );
});

test("admin verify export includes pending peer review assignee names", () => {
  const source = read("src/app/api/admin/verify/export/route.ts");

  assert.equal(
    source.includes("\"待完成360评价人\""),
    true,
    "csv export should include a column for pending peer reviewers",
  );
  assert.equal(
    source.includes("\"待完成360评价对象\""),
    true,
    "csv export should include a column for pending peer review targets",
  );
  assert.equal(
    source.includes("row.peerReviewReceivedPendingReviewerNames.join(\"、\")"),
    true,
    "csv export should write the pending peer reviewer names",
  );
  assert.equal(
    source.includes("row.peerReviewAssignedPendingRevieweeNames.join(\"、\")"),
    true,
    "csv export should write the pending peer review target names",
  );
});

test("admin verify page renders pending peer review assignee names", () => {
  const source = read("src/app/(main)/admin/page.tsx");

  assert.equal(
    source.includes("peerReviewReceivedPendingReviewerNames: string[];"),
    true,
    "admin page row type should carry pending peer reviewer names",
  );
  assert.equal(
    source.includes("peerReviewAssignedPendingRevieweeNames: string[];"),
    true,
    "admin page row type should carry pending peer review target names",
  );
  assert.equal(
    source.includes("row.peerReviewReceivedPendingReviewerNames.length > 0"),
    true,
    "admin page should show pending peer reviewer names when the user is still waiting on others",
  );
  assert.equal(
    source.includes("row.peerReviewAssignedPendingRevieweeNames.length > 0"),
    true,
    "admin page should show pending peer review target names when the reviewer is incomplete",
  );
});
