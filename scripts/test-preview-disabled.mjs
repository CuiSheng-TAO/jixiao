import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("preview query parameter is ignored globally", () => {
  const source = read("src/lib/preview.ts");

  assert.equal(
    source.includes("export function isPreviewMode(searchParams: URLSearchParams): boolean {\n  void searchParams;\n  return false;\n}"),
    true,
    "preview mode should stay disabled even if a preview query parameter is present",
  );
  assert.equal(
    source.includes("export function getPreviewRole(searchParams: URLSearchParams): PreviewRole | null {\n  void searchParams;\n  return null;\n}"),
    true,
    "preview role should always resolve to null",
  );
});

test("admin navigation no longer exposes role preview controls", () => {
  const source = read("src/components/nav.tsx");

  assert.equal(
    source.includes("角色预览"),
    false,
    "navigation should not render the role preview section anymore",
  );
  assert.equal(
    source.includes("enterPreview("),
    false,
    "navigation should not offer preview switching actions",
  );
});
