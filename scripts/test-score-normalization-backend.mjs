import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function parseTs(relativePath) {
  const source = read(relativePath);
  return {
    source,
    file: ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  };
}

function stripPrismaComments(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function parsePrismaModels(source) {
  const models = new Map();
  const lines = stripPrismaComments(source).split(/\r?\n/);
  let current = null;
  let depth = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!current) {
      const match = line.match(/^model\s+(\w+)\s+\{$/);
      if (!match) continue;
      current = { name: match[1], fields: new Map() };
      depth = 1;
      continue;
    }

    depth += (rawLine.match(/\{/g) ?? []).length;
    depth -= (rawLine.match(/\}/g) ?? []).length;

    if (depth === 0) {
      models.set(current.name, current);
      current = null;
      continue;
    }

    if (!line || line.startsWith("@@") || line.startsWith("@")) continue;

    const fieldMatch = line.match(/^(\w+)\s+([^\s]+)\s*(.*)$/);
    if (fieldMatch) {
      current.fields.set(fieldMatch[1], {
        type: fieldMatch[2],
        attrs: fieldMatch[3].trim(),
      });
    }
  }

  return models;
}

function getModel(models, name) {
  const model = models.get(name);
  assert.equal(model != null, true, `schema should define ${name}`);
  return model;
}

function getField(model, name) {
  const field = model.fields.get(name);
  assert.equal(field != null, true, `${model.name} should define field ${name}`);
  return field;
}

function hasModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

function getExportedFunction(file, name) {
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name && hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      return statement;
    }
  }
  return null;
}

function isNextResponseJsonCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText() === "NextResponse" &&
    node.expression.name.text === "json"
  );
}

function resolveObjectLiteralExpression(expression, scopeNode) {
  const target = expression && ts.isParenthesizedExpression(expression) ? expression.expression : expression;
  if (!target) return null;
  if (ts.isObjectLiteralExpression(target)) return target;
  if (!ts.isIdentifier(target)) return null;

  let found = null;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === target.text &&
      node.initializer
    ) {
      const resolved = resolveObjectLiteralExpression(node.initializer, scopeNode);
      if (resolved) found = resolved;
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(scopeNode, visit);
  return found;
}

function getObjectLiteralPropertyNames(objectLiteral) {
  return objectLiteral.properties.flatMap((property) => {
    if (ts.isSpreadAssignment(property)) return [];
    if (ts.isShorthandPropertyAssignment(property)) return [property.name.text];
    if (!ts.isPropertyAssignment(property)) return [];
    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name)) {
      return [property.name.text];
    }
    return [];
  });
}

function hasRelationReference(attrs, fieldName, referencedName) {
  const normalized = attrs.replace(/\s+/g, " ");
  return (
    normalized.includes(`fields: [${fieldName}]`) &&
    normalized.includes(`references: [${referencedName}]`)
  );
}

function collectNextResponseJsonPayloads(functionLike) {
  const payloads = [];
  const body = functionLike.body;
  if (!body || !ts.isBlock(body)) return payloads;

  const visit = (node) => {
    if (isNextResponseJsonCall(node)) {
      const payload = resolveObjectLiteralExpression(node.arguments[0], body);
      if (payload) payloads.push(new Set(getObjectLiteralPropertyNames(payload)));
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(body, visit);
  return payloads;
}

test("schema adds a separate normalization snapshot layer instead of overwriting raw reviews", () => {
  const models = parsePrismaModels(read("prisma/schema.prisma"));

  const snapshot = getModel(models, "ScoreNormalizationSnapshot");
  assert.equal(
    getField(snapshot, "cycleId").type,
    "String",
    "snapshot layer should be anchored to the review cycle",
  );
  assert.equal(
    getField(snapshot, "cycle").type,
    "ReviewCycle",
    "snapshot layer should relate back to the review cycle",
  );
  assert.equal(
    hasRelationReference(getField(snapshot, "cycle").attrs, "cycleId", "id"),
    true,
    "snapshot layer should use a real foreign-key relation back to the cycle",
  );
  assert.equal(
    getField(snapshot, "entries").type,
    "ScoreNormalizationEntry[]",
    "snapshot layer should own the per-entry normalization records",
  );

  const entry = getModel(models, "ScoreNormalizationEntry");
  assert.equal(
    getField(entry, "snapshotId").type,
    "String",
    "entry rows should belong to one normalization snapshot",
  );
  assert.equal(
    getField(entry, "snapshot").type,
    "ScoreNormalizationSnapshot",
    "entry rows should relate back to the snapshot layer",
  );
  assert.equal(
    hasRelationReference(getField(entry, "snapshot").attrs, "snapshotId", "id"),
    true,
    "entry rows should use a foreign-key relation to the snapshot layer",
  );

  const application = getModel(models, "ScoreNormalizationApplication");
  assert.equal(
    getField(application, "snapshotId").type,
    "String",
    "application rows should point at one applied snapshot",
  );
  assert.equal(
    getField(application, "snapshot").type,
    "ScoreNormalizationSnapshot",
    "application rows should relate back to the normalized snapshot layer",
  );
  assert.equal(
    hasRelationReference(getField(application, "snapshot").attrs, "snapshotId", "id"),
    true,
    "application rows should use a foreign-key relation to the applied snapshot",
  );
});

test("workspace route exposes raw and simulated distributions for one source without mutating raw records", () => {
  const { file } = parseTs("src/app/api/score-normalization/workspace/route.ts");
  const getHandler = getExportedFunction(file, "GET");

  assert.equal(getHandler != null, true, "workspace route should export a GET handler");

  const payloads = collectNextResponseJsonPayloads(getHandler);
  const required = ["rawDistribution", "simulatedDistribution", "application"];

  assert.equal(
    payloads.some((payload) => required.every((key) => payload.has(key))),
    true,
    "workspace route should build a JSON payload that carries raw, simulated, and application layers together",
  );
});
