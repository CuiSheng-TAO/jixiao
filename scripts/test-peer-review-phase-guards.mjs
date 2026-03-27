import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("peer review submit route no longer checks cycle stage", () => {
  const source = read("src/app/api/peer-review/route.ts");

  assert.equal(
    source.includes("当前不在互评阶段，无法执行此操作"),
    false,
    "submit route should not reject writes outside peer review stages",
  );
  assert.equal(
    source.includes("cycle.status !== \"PEER_REVIEW\" && cycle.status !== \"SUPERVISOR_EVAL\""),
    false,
    "submit route should not gate writes on cycle status",
  );
});

test("peer review decline route no longer checks cycle stage", () => {
  const source = read("src/app/api/peer-review/decline/route.ts");

  assert.equal(
    source.includes("当前不在互评阶段，无法执行此操作"),
    false,
    "decline route should not reject outside peer review stage",
  );
  assert.equal(
    source.includes("cycle.status !== \"PEER_REVIEW\""),
    false,
    "decline route should not gate declines on cycle status",
  );
});

test("peer review nomination route still keeps its stage guard", () => {
  const source = read("src/app/api/peer-review/nominate/route.ts");

  assert.equal(
    source.includes("cycle.status !== \"SELF_EVAL\" && cycle.status !== \"PEER_REVIEW\" && cycle.status !== \"SUPERVISOR_EVAL\""),
    true,
    "nomination route should continue enforcing allowed stages",
  );
});
