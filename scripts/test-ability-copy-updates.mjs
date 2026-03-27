import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

const comprehensiveCopy = "vibe coding能力（必含，对所有岗位生效）、复杂问题解决与业务闭环、专业纵深与角色履职、跨边界协同与组织价值创造、团队赋能与价值带动、领导力-基础管理执行（限leader）";
const learningCopy = "问题分析与判断力、推动执行力、主动性与批判性思考。";
const adaptabilityCopy = "指的是，面对业务复杂性、场景变化、节奏加速、组织调整或目标切换时，能够快速调整认知、情绪、方法和资源配置，持续保持有效产出的能力。";

test("peer review page uses the requested ability descriptions", () => {
  const source = read("src/app/(main)/peer-review/page.tsx");

  assert.equal(source.includes(comprehensiveCopy), true);
  assert.equal(source.includes(learningCopy), true);
  assert.equal(source.includes(adaptabilityCopy), true);
});

test("supervisor evaluation page uses the requested ability descriptions", () => {
  const source = read("src/app/(main)/team/page.tsx");

  assert.equal(source.includes(comprehensiveCopy), true);
  assert.equal(source.includes(learningCopy), true);
  assert.equal(source.includes(adaptabilityCopy), true);
});
