import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("peer review page keeps non-terminal review statuses editable", () => {
  const source = read("src/app/(main)/peer-review/page.tsx");

  assert.equal(
    source.includes("const isDisabled = review.status === \"SUBMITTED\" || review.status === \"DECLINED\";"),
    true,
    "peer review form should only disable submitted or declined records",
  );
  assert.equal(
    source.includes("const editableCount = reviews.filter(r => r.status !== \"SUBMITTED\" && r.status !== \"DECLINED\").length;"),
    true,
    "peer review tab count should include any editable non-terminal status",
  );
});

test("dashboard pending peer review count includes all non-terminal statuses", () => {
  const source = read("src/app/api/users/route.ts");

  assert.equal(
    source.includes("status: { notIn: [\"SUBMITTED\", \"DECLINED\"] }"),
    true,
    "dashboard pending count should not hide PENDING peer reviews",
  );
});
