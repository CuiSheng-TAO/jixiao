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

      if (ts.isIdentifier(expression)) {
        for (const candidate of file.statements) {
          if (!ts.isVariableStatement(candidate)) continue;
          for (const declaration of candidate.declarationList.declarations) {
            if (
              ts.isIdentifier(declaration.name) &&
              declaration.name.text === expression.text &&
              declaration.initializer &&
              (ts.isFunctionExpression(declaration.initializer) || ts.isArrowFunction(declaration.initializer))
            ) {
              return declaration.initializer;
            }
          }
        }
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

function getImportedLocalNames(file, moduleSpecifiers) {
  const wanted = new Set(moduleSpecifiers);
  const names = [];

  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!wanted.has(statement.moduleSpecifier.text) || !statement.importClause) continue;

    const { importClause } = statement;
    if (importClause.name) names.push(importClause.name.text);

    const bindings = importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.push(element.name.text);
      }
    }

    if (bindings && ts.isNamespaceImport(bindings)) {
      names.push(bindings.name.text);
    }
  }

  return names;
}

test("score normalization page exposes the two required analysis tabs", () => {
  const { file } = parseTsx("src/app/(main)/score-normalization/page.tsx");
  const defaultExport = getDefaultExportFunctionLike(file);

  assert.equal(defaultExport != null, true, "score normalization page should export a default page component");

  const returnExpressions = getReturnedExpressions(defaultExport);
  const analysis = analyzeReturnedExpressions(returnExpressions);
  const componentNames = getImportedLocalNames(file, [
    "@/components/score-normalization/apply-panel",
    "@/components/score-normalization/normalization-shell",
  ]);

  assert.equal(
    componentNames.some((name) => analysis.tags.has(name)),
    true,
    "score normalization page should wire in the apply panel or normalization shell component",
  );
  assert.equal(
    (analysis.tags.get("TabsTrigger") ?? 0) >= 2,
    "score normalization page should render the required tab triggers",
  );
  assert.equal(
    analysis.texts.has("360环评分布校准") && analysis.texts.has("绩效初评分布校准"),
    true,
    "score normalization page should expose both required analysis tab labels in the rendered component tree",
  );
});

test("score normalization page includes double-confirm apply and rollback copy", () => {
  const { file } = parseTsx("src/components/score-normalization/apply-panel.tsx");
  const defaultExport = getDefaultExportFunctionLike(file);

  assert.equal(defaultExport != null, true, "apply panel should export a component");

  const returnExpressions = getReturnedExpressions(defaultExport);
  const analysis = analyzeReturnedExpressions(returnExpressions);

  assert.equal(
    analysis.texts.has("我已理解这会影响排名和后续校准展示"),
    true,
    "apply panel should require the double-confirm acknowledgment copy",
  );
  assert.equal(analysis.texts.has("应用标准化结果"), true, "apply panel should use the apply wording for normalized results");
  assert.equal(analysis.texts.has("回退到原始分"), true, "apply panel should expose the rollback wording back to raw scores");
});
