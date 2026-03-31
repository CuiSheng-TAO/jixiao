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

function readFirstExisting(relativePaths) {
  let lastError = null;
  for (const relativePath of relativePaths) {
    try {
      return {
        relativePath,
        source: read(relativePath),
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`None of the candidate paths exist: ${relativePaths.join(", ")}`);
}

function parseTsCandidates(relativePaths) {
  const { relativePath, source } = readFirstExisting(relativePaths);
  return {
    relativePath,
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
      current = { name: match[1], fields: new Map(), attributes: [] };
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

    if (!line) continue;
    if (line.startsWith("@@")) {
      current.attributes.push(line);
      continue;
    }
    if (line.startsWith("@")) continue;

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

function getModelAttributes(model) {
  return model.attributes ?? [];
}

function hasUniqueConstraint(model, fields) {
  const normalized = fields.join(",");
  return getModelAttributes(model).some((attribute) =>
    attribute.replace(/\s+/g, "").includes(`@@unique([${normalized}])`),
  );
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

function getExportedCallableNames(file) {
  const names = [];
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword) && statement.name) {
      names.push(statement.name.text);
      continue;
    }
    if (!ts.isVariableStatement(statement) || !hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
      ) {
        names.push(declaration.name.text);
      }
    }
  }
  return names;
}

function getImportedLocalNames(file, modulePrefix) {
  const names = [];
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!statement.moduleSpecifier.text.startsWith(modulePrefix) || !statement.importClause) continue;
    const { importClause } = statement;
    if (importClause.name) names.push(importClause.name.text);
    const bindings = importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.push(element.name.text);
      }
    } else if (bindings && ts.isNamespaceImport(bindings)) {
      names.push(bindings.name.text);
    }
  }
  return names;
}

function getCalleeName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAwaitExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current))
  ) {
    current = current.expression;
  }
  return current ?? null;
}

function getVariableInitializer(scopeNode, name) {
  let initializer = null;
  const visit = (node) => {
    if (initializer) return;
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(scopeNode, visit);
  return initializer;
}

function expressionUsesImportedHelper(expression, importedNames, scopeNode) {
  const current = unwrapExpression(expression);
  if (!current) return false;

  if (ts.isIdentifier(current)) {
    const initializer = getVariableInitializer(scopeNode, current.text);
    return initializer ? expressionUsesImportedHelper(initializer, importedNames, scopeNode) : false;
  }

  if (ts.isCallExpression(current)) {
    const calleeName = getCalleeName(current.expression);
    if (calleeName && importedNames.has(calleeName)) return true;
    return (
      expressionUsesImportedHelper(current.expression, importedNames, scopeNode) ||
      current.arguments.some((argument) => expressionUsesImportedHelper(argument, importedNames, scopeNode))
    );
  }

  if (ts.isPropertyAccessExpression(current)) {
    return expressionUsesImportedHelper(current.expression, importedNames, scopeNode);
  }

  if (ts.isElementAccessExpression(current)) {
    return (
      expressionUsesImportedHelper(current.expression, importedNames, scopeNode) ||
      expressionUsesImportedHelper(current.argumentExpression, importedNames, scopeNode)
    );
  }

  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.some((element) => expressionUsesImportedHelper(element, importedNames, scopeNode));
  }

  if (ts.isObjectLiteralExpression(current)) {
    return current.properties.some((property) => {
      if (ts.isSpreadAssignment(property)) return expressionUsesImportedHelper(property.expression, importedNames, scopeNode);
      if (!ts.isPropertyAssignment(property)) return false;
      return expressionUsesImportedHelper(property.initializer, importedNames, scopeNode);
    });
  }

  return false;
}

function getPropertyAccessChain(expression) {
  const current = unwrapExpression(expression);
  if (!current) return [];
  if (ts.isIdentifier(current)) return [current.text];
  if (ts.isPropertyAccessExpression(current)) {
    return [...getPropertyAccessChain(current.expression), current.name.text];
  }
  return [];
}

function isNextResponseJsonCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText() === "NextResponse" &&
    node.expression.name.text === "json"
  );
}

function hasRelationReference(attrs, fieldName, referencedName) {
  const normalized = attrs.replace(/\s+/g, " ");
  return (
    normalized.includes(`fields: [${fieldName}]`) &&
    normalized.includes(`references: [${referencedName}]`)
  );
}

function hasCallToImportedHelper(functionLike, importedNames) {
  const body = functionLike.body;
  if (!body || !ts.isBlock(body)) return false;

  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return;
    }
    if (ts.isCallExpression(node)) {
      const calleeName = getCalleeName(node.expression);
      if (calleeName && importedNames.has(calleeName)) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(body, visit);
  return found;
}

function hasPrismaScoreNormalizationMutationUsingImportedHelper(functionLike, importedNames) {
  const body = functionLike.body;
  if (!body || !ts.isBlock(body)) return false;
  const allowedMethods = new Set(["upsert", "update", "updateMany", "create", "deleteMany", "delete"]);

  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return;
    }
    if (ts.isCallExpression(node)) {
      const chain = getPropertyAccessChain(node.expression);
      if (
        chain.includes("scoreNormalizationApplication") &&
        allowedMethods.has(chain.at(-1) ?? "") &&
        node.arguments.some((argument) => expressionUsesImportedHelper(argument, importedNames, body))
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(body, visit);
  return found;
}

test("score normalization library exports workspace, simulation, apply, and revert helpers", () => {
  const { file } = parseTsCandidates([
    "src/lib/score-normalization.ts",
    "src/lib/score-normalization/index.ts",
  ]);
  const exportedNames = getExportedCallableNames(file);

  assert.equal(
    exportedNames.some((name) => /workspace|builder|payload/i.test(name)),
    true,
    "score normalization library should expose a workspace builder or payload helper",
  );
  assert.equal(
    exportedNames.some((name) => /simulate/i.test(name)),
    true,
    "score normalization library should expose a simulation helper",
  );
  assert.equal(
    exportedNames.some((name) => /apply/i.test(name)),
    true,
    "score normalization library should expose an apply helper",
  );
  assert.equal(
    exportedNames.some((name) => /revert/i.test(name)),
    true,
    "score normalization library should expose a revert helper",
  );
});

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
    getField(application, "source").type,
    "String",
    "application rows should be keyed by source as well as cycle",
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
  assert.equal(
    hasUniqueConstraint(application, ["cycleId", "source"]),
    true,
    "application rows should stay one-per-cycle-and-source via a unique invariant",
  );
});

test("workspace route delegates to a normalization builder helper instead of hand-building static json", () => {
  const { file } = parseTs("src/app/api/score-normalization/workspace/route.ts");
  const getHandler = getExportedFunction(file, "GET");

  assert.equal(getHandler != null, true, "workspace route should export a GET handler");
  const importedNames = new Set(getImportedLocalNames(file, "@/lib/score-normalization"));
  assert.equal(importedNames.size > 0, true, "workspace route should import a dedicated normalization helper");

  assert.equal(
    hasCallToImportedHelper(getHandler, importedNames),
    true,
    "workspace route should call the imported normalization builder helper",
  );
  assert.equal(
    (() => {
      const body = getHandler.body;
      if (!body || !ts.isBlock(body)) return false;
      let found = false;
      const visit = (node) => {
        if (found) return;
        if (isNextResponseJsonCall(node)) {
          const arg = node.arguments[0];
          if (arg && expressionUsesImportedHelper(arg, importedNames, body)) {
            found = true;
            return;
          }
        }
        ts.forEachChild(node, visit);
      };
      ts.forEachChild(body, visit);
      return found;
    })(),
    true,
    "workspace route should thread the builder result into the JSON response",
  );
});

test("apply route updates normalization application state through dedicated helpers", () => {
  const { file } = parseTs("src/app/api/score-normalization/apply/route.ts");
  const postHandler = getExportedFunction(file, "POST");

  assert.equal(postHandler != null, true, "apply route should export a POST handler");
  const importedNames = new Set(getImportedLocalNames(file, "@/lib/score-normalization").filter((name) => /apply/i.test(name)));
  assert.equal(importedNames.size > 0, true, "apply route should import a dedicated apply helper");
  assert.equal(
    hasCallToImportedHelper(postHandler, importedNames),
    true,
    "apply route should call the dedicated apply helper",
  );
  assert.equal(
    hasPrismaScoreNormalizationMutationUsingImportedHelper(postHandler, importedNames),
    true,
    "apply route should update the scoreNormalizationApplication table using the helper result",
  );
});

test("revert route rolls normalization application state back through dedicated helpers", () => {
  const { file } = parseTs("src/app/api/score-normalization/revert/route.ts");
  const postHandler = getExportedFunction(file, "POST");

  assert.equal(postHandler != null, true, "revert route should export a POST handler");
  const importedNames = new Set(getImportedLocalNames(file, "@/lib/score-normalization").filter((name) => /revert/i.test(name)));
  assert.equal(importedNames.size > 0, true, "revert route should import a dedicated revert helper");
  assert.equal(
    hasCallToImportedHelper(postHandler, importedNames),
    true,
    "revert route should call the dedicated revert helper",
  );
  assert.equal(
    hasPrismaScoreNormalizationMutationUsingImportedHelper(postHandler, importedNames),
    true,
    "revert route should update the scoreNormalizationApplication table using the helper result",
  );
});
