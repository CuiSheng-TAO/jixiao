import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("peer review page loads task sources independently", () => {
  const source = read("src/app/(main)/peer-review/page.tsx");

  assert.equal(
    source.includes("Promise.allSettled(["),
    true,
    "peer review page should not fail the whole screen when one fetch rejects",
  );
  assert.equal(
    source.includes("toast.error(\"环评任务加载失败\""),
    true,
    "peer review page should surface a task loading error instead of silently showing zero",
  );
  assert.equal(
    source.includes("toast.error(\"提名数据加载失败\""),
    true,
    "peer review page should surface a nomination loading error independently",
  );
});
