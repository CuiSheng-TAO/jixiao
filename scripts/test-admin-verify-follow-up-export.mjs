import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("admin verify data exposes HR follow-up rows for all users", () => {
  const source = read("src/lib/admin-verify.ts");

  assert.equal(
    source.includes("export type VerifyFollowUpRow = {"),
    true,
    "admin verify data should define a dedicated follow-up row type",
  );
  assert.equal(
    source.includes("followUpSheetRows: VerifyFollowUpRow[];"),
    true,
    "verify payload should expose rows for the HR follow-up sheet",
  );
  assert.equal(
    source.includes("pendingPeerReviewCount: number;"),
    true,
    "follow-up rows should include pending peer review counts",
  );
  assert.equal(
    source.includes("pendingSupervisorEvalCount: number;"),
    true,
    "follow-up rows should include pending supervisor evaluation counts",
  );
});

test("admin verify export writes an xlsx workbook with sheet 2 follow-up columns", () => {
  const source = read("src/app/api/admin/verify/export/route.ts");

  assert.equal(
    source.includes("import * as XLSX from \"xlsx\";"),
    true,
    "verify export route should generate a real Excel workbook",
  );
  assert.equal(
    source.includes("XLSX.utils.book_append_sheet(workbook, rosterSheet, \"Sheet1-数据核验表\");"),
    true,
    "workbook should keep the original verification sheet as sheet 1",
  );
  assert.equal(
    source.includes("XLSX.utils.book_append_sheet(workbook, followUpSheet, \"Sheet2-HR催办表\");"),
    true,
    "workbook should add an HR follow-up sheet as sheet 2",
  );
  assert.equal(
    source.includes("\"还需360环评人数\""),
    true,
    "follow-up sheet should include the pending 360 count column",
  );
  assert.equal(
    source.includes("\"还需初评对象\""),
    true,
    "follow-up sheet should include the pending supervisor evaluation targets column",
  );
  assert.equal(
    source.includes(".xlsx"),
    true,
    "export route should return an xlsx filename",
  );
});

test("admin page downloads the verification export as an Excel workbook", () => {
  const source = read("src/app/(main)/admin/page.tsx");

  assert.equal(
    source.includes("link.download = \"进度核验花名册.xlsx\";"),
    true,
    "admin page should download the verify export with an xlsx filename",
  );
  assert.equal(
    source.includes("导出Excel花名册"),
    true,
    "admin page should label the export button as an Excel export",
  );
});
