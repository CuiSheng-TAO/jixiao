import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function parseTsx(relativePath) {
  const source = read(relativePath);
  return {
    source,
    file: ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
  };
}

function hasModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

function getDefaultExportFunctionLike(file) {
  for (const statement of file.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      hasModifier(statement, ts.SyntaxKind.ExportKeyword) &&
      hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
    ) {
      return statement;
    }

    if (ts.isExportAssignment(statement)) {
      const expression = statement.expression;
      if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
        return expression;
      }
    }
  }
  return null;
}

function getReturnedExpressions(functionLike) {
  if (ts.isArrowFunction(functionLike) && !ts.isBlock(functionLike.body)) {
    return [functionLike.body];
  }

  const body = functionLike.body;
  if (!body || !ts.isBlock(body)) return [];

  const expressions = [];
  const visit = (node) => {
    if (ts.isReturnStatement(node) && node.expression) {
      expressions.push(node.expression);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(body, visit);
  return expressions;
}

function jsxTagName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.getText();
  return null;
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function analyzeReturnedExpressions(expressions) {
  const texts = new Set();
  const tags = new Map();

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const text = normalizeText(node.getText());
      if (text) texts.add(text);
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = normalizeText(node.text);
      if (text) texts.add(text);
    }

    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = jsxTagName(node.tagName);
      if (tag) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }

    if (ts.isJsxElement(node)) {
      const tag = jsxTagName(node.openingElement.tagName);
      if (tag) tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }

    ts.forEachChild(node, visit);
  };

  for (const expression of expressions) {
    ts.forEachChild(expression, visit);
  }

  return { texts, tags };
}

test("manager review normalization page exposes the unified scoring normalization ledger", () => {
  const pagePath = path.join(rootDir, "src/app/(main)/manager-review-normalization/page.tsx");
  assert.equal(fs.existsSync(pagePath), true, "manager-review normalization page should exist");
  if (!fs.existsSync(pagePath)) return;

  const { file, source } = parseTsx("src/app/(main)/manager-review-normalization/page.tsx");
  const defaultExport = getDefaultExportFunctionLike(file);

  assert.equal(defaultExport != null, true, "page should export a default component");
  assert.equal(
    source.includes('from "@/components/manager-review-normalization/normalization-shell"'),
    true,
    "page should delegate rendering to the dedicated normalization shell",
  );
  if (!defaultExport) return;

  const analysis = analyzeReturnedExpressions(getReturnedExpressions(defaultExport));

  assert.equal(
    analysis.texts.has("绩效打分分布校准"),
    true,
    "page should present the unified scoring normalization ledger title",
  );
  assert.equal(
    analysis.tags.has("NormalizationShell"),
    true,
    "page should render the unified normalization shell",
  );
  assert.equal(
    source.includes("/api/manager-review-normalization/workspace"),
    true,
    "page should load the unified 54-person workspace payload",
  );
  assert.equal(
    source.includes("/api/manager-review-normalization/apply") &&
      source.includes("/api/manager-review-normalization/revert"),
    true,
    "page should keep the manager-review apply and revert actions",
  );
  assert.equal(
    source.includes("/api/score-normalization/apply") &&
      source.includes("/api/score-normalization/revert"),
    true,
    "page should also wire peer-review normalization apply and revert actions",
  );
});

test("normalization shell is a single 54-person ledger with expandable manager-review and peer-review detail sections", () => {
  const shellPath = path.join(
    rootDir,
    "src/components/manager-review-normalization/normalization-shell.tsx",
  );
  assert.equal(fs.existsSync(shellPath), true, "normalization shell should exist");
  if (!fs.existsSync(shellPath)) return;

  const source = read("src/components/manager-review-normalization/normalization-shell.tsx");

  assert.equal(
    source.includes("评分人总台账"),
    true,
    "shell should label the main table as the scoring ledger",
  );
  assert.equal(
    source.includes("主管（11人）") && source.includes("员工（43人）"),
    true,
    "shell should explain the 11 supervisors / 43 employees roster split",
  );
  assert.equal(
    source.includes("初评打分明细") && source.includes("环评打分明细"),
    true,
    "expanded rows should split manager-review details from peer-review details",
  );
  assert.equal(
    source.includes("展开详情") && source.includes("收起详情"),
    true,
    "each row should support an explicit expand/collapse control",
  );
  assert.equal(
    source.includes("DistributionDiffChart") || source.includes("ChangePreviewTable"),
    false,
    "shell should no longer render the old chart-heavy manager-review-only blocks",
  );
});

test("navigation points to the unified scoring normalization ledger", () => {
  const navSource = read("src/components/nav.tsx");

  assert.equal(
    navSource.includes('href: "/manager-review-normalization"'),
    true,
    "navigation should keep the normalization route visible",
  );
  assert.equal(
    navSource.includes('label: "绩效打分分布校准"'),
    true,
    "navigation should rename the entry to the unified scoring normalization label",
  );
});
