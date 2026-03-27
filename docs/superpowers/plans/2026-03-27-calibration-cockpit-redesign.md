# Calibration Cockpit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/calibration` into a warmer, clearer executive cockpit that keeps the current final-review rules intact while replacing the table-heavy UI with chart-led decision views.

**Architecture:** Keep all current final-review APIs and mutation routes in place. Refactor the giant page into a thin data container plus focused cockpit components, introduce a small client-side view-model helper for chart/priority datasets, and use `recharts` to render the score-band and star-distribution visuals that drive the new left-rail/right-panel workflow.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Recharts, node:test, ESLint

---

## File Structure

### Existing files to keep and slim down

- `src/app/(main)/calibration/page.tsx`
  Keep fetch/mutation state, polling, selected employee/leader state, and hand off rendering to focused tab components.
- `scripts/test-final-review-ui.mjs`
  Expand the current source-level UI contract tests so the redesign is locked before implementation.

### New files to create

- `src/components/final-review/types.ts`
  Shared client-side workspace types lifted out of the page so the new cockpit components do not duplicate type declarations.
- `src/components/final-review/workspace-view.ts`
  Pure helper functions that convert raw workspace payloads into chart buckets, priority queues, and friendly summary strings.
- `src/components/final-review/cockpit-shell.tsx`
  Shared high-level layout primitives: intro banner, section heading, and split-pane shell.
- `src/components/final-review/score-band-chart.tsx`
  Recharts-based score-band / score-layer visualization for employee weighted scores.
- `src/components/final-review/star-distribution-chart.tsx`
  Recharts-based star distribution chart with soft anomaly highlighting and name tooltip support.
- `src/components/final-review/principles-tab.tsx`
  The redesigned `原则` tab.
- `src/components/final-review/employee-cockpit.tsx`
  The redesigned non-leader final-review tab.
- `src/components/final-review/leader-cockpit.tsx`
  The redesigned leader dual-review tab.
- `src/components/final-review/employee-detail-panel.tsx`
  Right-side decision panel for ordinary employees.
- `src/components/final-review/leader-detail-panel.tsx`
  Right-side decision panel for leader subjects.

### Existing files that may need light style support

- `src/app/globals.css`
  Add only the minimal final-review surface tokens needed for the warmer cockpit look if utility classes alone become noisy.

---

### Task 1: Freeze the redesign contract in UI tests

**Files:**
- Modify: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Add failing source-level tests for the new cockpit structure**

```js
test("calibration page renders the principles tab as a briefing plus overview cockpit", () => {
  const source = read("src/app/(main)/calibration/page.tsx");

  assert.equal(
    source.includes("原则") &&
      source.includes("全公司星级分布") &&
      source.includes("分数带") &&
      source.includes("一句话解读"),
    true,
    "principles tab should combine briefing guidance with a compact visual overview",
  );
});

test("employee final review tab uses chart-led navigation and a fixed decision panel", () => {
  const source = read("src/app/(main)/calibration/page.tsx");

  assert.equal(
    source.includes("重点名单") &&
      source.includes("待拍板") &&
      source.includes("意见分歧大") &&
      source.includes("最终决策"),
    true,
    "employee tab should prioritize queue-based navigation and a right-side decision panel",
  );
});

test("leader final review tab emphasizes dual-review comparison before final confirmation", () => {
  const source = read("src/app/(main)/calibration/page.tsx");

  assert.equal(
    source.includes("双人意见对照") &&
      source.includes("双人提交进度") &&
      source.includes("主管名单"),
    true,
    "leader tab should surface paired reviewer comparison and roster-led navigation",
  );
});
```

- [ ] **Step 2: Run the UI test file to confirm the redesign is not implemented yet**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: FAIL with missing cockpit strings such as `分数带`, `重点名单`, or `双人意见对照`.

- [ ] **Step 3: Commit the red test checkpoint**

```bash
git add scripts/test-final-review-ui.mjs
git commit -m "test: lock calibration cockpit redesign contract"
```

### Task 2: Extract shared client-side final-review types and view helpers

**Files:**
- Create: `src/components/final-review/types.ts`
- Create: `src/components/final-review/workspace-view.ts`
- Modify: `src/app/(main)/calibration/page.tsx`
- Test: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Add a failing test that requires the page to delegate chart and queue shaping to dedicated helpers**

```js
test("calibration page delegates cockpit shaping to shared final-review helpers", () => {
  const page = read("src/app/(main)/calibration/page.tsx");

  assert.equal(
    page.includes('from "@/components/final-review/workspace-view"') &&
      page.includes('from "@/components/final-review/types"'),
    true,
    "the page should stop inlining all workspace types and derived view logic",
  );
});
```

- [ ] **Step 2: Run the focused UI tests to verify the helper extraction is still missing**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: FAIL because the current page still declares all workspace types inline and has no `workspace-view` helper import.

- [ ] **Step 3: Create the shared types file with the extracted workspace types**

```ts
export type DistributionEntry = {
  stars: number;
  count: number;
  pct: number;
  exceeded: boolean;
  delta: number;
  names: string[];
};

export type EmployeeOpinion = {
  reviewerId: string;
  reviewerName: string;
  decision: string;
  decisionLabel: string;
  suggestedStars: number | null;
  reason: string;
  isMine: boolean;
  updatedAt: string | null;
};

export type EmployeeRow = {
  id: string;
  name: string;
  department: string;
  jobTitle: string | null;
  weightedScore: number | null;
  referenceStars: number | null;
  referenceSourceLabel: string;
  officialStars: number | null;
  officialReason: string;
  officialConfirmedAt: string | null;
  officialConfirmerName: string | null;
  finalizable: boolean;
  currentEvaluatorNames: string[];
  currentEvaluatorStatuses: Array<{
    evaluatorId: string;
    evaluatorName: string;
    status: string;
    weightedScore: number | null;
  }>;
  selfEvalStatus: string | null;
  peerAverage: number | null;
  handledCount: number;
  totalReviewerCount: number;
  anomalyTags: string[];
  opinions: EmployeeOpinion[];
};

export type LeaderForm = {
  performanceStars: number | null;
  performanceComment: string;
  abilityStars: number | null;
  abilityComment: string;
  comprehensiveStars: number | null;
  learningStars: number | null;
  adaptabilityStars: number | null;
  valuesStars: number | null;
  valuesComment: string;
  candidStars: number | null;
  candidComment: string;
  progressStars: number | null;
  progressComment: string;
  altruismStars: number | null;
  altruismComment: string;
  rootStars: number | null;
  rootComment: string;
};

export type LeaderEvaluation = {
  evaluatorId: string;
  evaluatorName: string;
  status: string;
  weightedScore: number | null;
  editable: boolean;
  submittedAt: string | null;
  form: LeaderForm;
};

export type LeaderRow = {
  id: string;
  name: string;
  department: string;
  jobTitle: string | null;
  officialStars: number | null;
  officialReason: string;
  officialConfirmedAt: string | null;
  officialConfirmerName: string | null;
  finalizable: boolean;
  evaluations: LeaderEvaluation[];
  bothSubmitted: boolean;
};

export type WorkspacePayload = {
  cycle: {
    id: string;
    name: string;
    status: string;
    calibrationStart: string;
    calibrationEnd: string;
  } | null;
  canAccess: boolean;
  config: {
    accessUsers: Array<{ id: string; name: string; department: string }>;
    finalizers: Array<{ id: string; name: string; department: string }>;
    leaderEvaluators: Array<{ id: string; name: string; department: string }>;
    leaderSubjects: Array<{ id: string; name: string; department: string }>;
  } | null;
  overview: {
    principles: string[];
    chainGuidance: string[];
    distributionHints: string[];
    riskSummary: string[];
    progress: {
      employeeOpinionDone: number;
      employeeOpinionTotal: number;
      employeeConfirmedCount: number;
      employeeTotalCount: number;
      leaderSubmittedCounts: Array<{
        evaluatorId: string;
        evaluatorName: string;
        submittedCount: number;
      }>;
      leaderConfirmedCount: number;
      leaderTotalCount: number;
    };
  } | null;
  employeeReview: {
    overview: {
      companyCount: number;
      initialEvalSubmissionRate: number;
      officialCompletionRate: number;
      pendingOfficialCount: number;
    };
    companyDistribution: DistributionEntry[];
    employeeDistribution: DistributionEntry[];
    departmentDistributions: Array<{
      department: string;
      total: number;
      distribution: DistributionEntry[];
    }>;
    employees: EmployeeRow[];
  } | null;
  leaderReview: {
    overview: {
      leaderCount: number;
      confirmedCount: number;
      evaluatorProgress: Array<{
        evaluatorId: string;
        evaluatorName: string;
        submittedCount: number;
      }>;
    };
    leaders: LeaderRow[];
    leaderDistribution: DistributionEntry[];
    companyDistributions: {
      all: DistributionEntry[];
      leaderOnly: DistributionEntry[];
      employeeOnly: DistributionEntry[];
    };
  } | null;
};
```

- [ ] **Step 4: Create the shared view helper that shapes chart and queue data**

```ts
import type { DistributionEntry, EmployeeRow, LeaderRow } from "./types";

export type ScoreBandBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
  names: string[];
};

export function buildScoreBandBuckets(rows: EmployeeRow[]): ScoreBandBucket[] {
  const bands = [
    { label: "1.0-1.9", min: 1, max: 1.99 },
    { label: "2.0-2.9", min: 2, max: 2.99 },
    { label: "3.0-3.4", min: 3, max: 3.49 },
    { label: "3.5-3.9", min: 3.5, max: 3.99 },
    { label: "4.0-4.4", min: 4, max: 4.49 },
    { label: "4.5-5.0", min: 4.5, max: 5 },
  ];

  return bands.map((band) => {
    const matched = rows.filter((row) => row.weightedScore != null && row.weightedScore >= band.min && row.weightedScore <= band.max);
    return {
      ...band,
      count: matched.length,
      names: matched.map((row) => row.name),
    };
  });
}

export function buildEmployeePriorityGroups(rows: EmployeeRow[]) {
  return {
    pending: rows.filter((row) => !row.officialConfirmedAt),
    disagreement: rows.filter((row) => row.opinions.filter((opinion) => opinion.decision === "OVERRIDE").length > 0),
    anomaly: rows.filter((row) => row.anomalyTags.length > 0),
    highBandPending: rows.filter((row) => (row.weightedScore ?? 0) >= 4 && !row.officialConfirmedAt),
    lowBandAnomaly: rows.filter((row) => (row.weightedScore ?? 99) < 3 && row.anomalyTags.length > 0),
  };
}

export function buildLeaderSubmissionSummary(rows: LeaderRow[]) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    bothSubmitted: row.bothSubmitted,
    submittedCount: row.evaluations.filter((evaluation) => evaluation.status === "SUBMITTED").length,
  }));
}
```

- [ ] **Step 5: Refactor the page to import the shared types and helpers**

```ts
import type {
  WorkspacePayload,
  EmployeeRow,
  LeaderRow,
  LeaderForm,
} from "@/components/final-review/types";
import {
  buildEmployeePriorityGroups,
  buildLeaderSubmissionSummary,
  buildScoreBandBuckets,
} from "@/components/final-review/workspace-view";
```

- [ ] **Step 6: Run the tests again to verify the helper extraction passes**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: PASS for the helper-import assertion, with other redesign assertions still pending until the UI tasks land.

- [ ] **Step 7: Commit the extraction**

```bash
git add src/app/'(main)'/calibration/page.tsx src/components/final-review/types.ts src/components/final-review/workspace-view.ts scripts/test-final-review-ui.mjs
git commit -m "refactor: extract calibration cockpit view helpers"
```

### Task 3: Rebuild the `原则` tab as briefing plus overview

**Files:**
- Create: `src/components/final-review/cockpit-shell.tsx`
- Create: `src/components/final-review/score-band-chart.tsx`
- Create: `src/components/final-review/star-distribution-chart.tsx`
- Create: `src/components/final-review/principles-tab.tsx`
- Modify: `src/app/(main)/calibration/page.tsx`
- Modify: `src/app/globals.css`
- Test: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Add a failing test that requires the dedicated principles tab component and chart components**

```js
test("calibration page delegates the principles experience to dedicated cockpit components", () => {
  const page = read("src/app/(main)/calibration/page.tsx");

  assert.equal(
    page.includes('from "@/components/final-review/principles-tab"') &&
      page.includes('from "@/components/final-review/score-band-chart"') &&
      page.includes('from "@/components/final-review/star-distribution-chart"'),
    true,
    "the page should compose the principles tab from focused cockpit components",
  );
});
```

- [ ] **Step 2: Run the UI tests to verify the principles cockpit components do not exist yet**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: FAIL because the page still renders the principles tab inline.

- [ ] **Step 3: Create the shared cockpit shell and chart primitives**

```tsx
export function CockpitShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]">
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
```

```tsx
export function StarDistributionChart({
  title,
  distribution,
}: {
  title: string;
  distribution: DistributionEntry[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={distribution}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="stars" tickFormatter={(value) => `${value}星`} />
        <YAxis allowDecimals={false} />
        <Tooltip formatter={(value) => [`${value} 人`, "人数"]} />
        <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="var(--final-review-accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create the redesigned principles tab component**

```tsx
export function PrinciplesTab({
  cycleName,
  countdownLabel,
  principles,
  chainGuidance,
  riskSummary,
  companyDistribution,
  scoreBands,
  oneLineSummary,
}: PrinciplesTabProps) {
  return (
    <div className="space-y-6">
      <CockpitShell
        eyebrow="Principles"
        title={cycleName}
        description="先统一原则和链路，再看全局分布与分数带，10 秒内知道这轮终评该往哪里看。"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-3xl bg-[var(--final-review-accent-soft)] p-4">{principles.join(" · ")}</section>
            <section className="rounded-3xl border border-[var(--final-review-border)] p-4">{chainGuidance.join(" · ")}</section>
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">{countdownLabel}</section>
          </div>
          <div className="grid gap-4">
            <StarDistributionChart title="全公司星级分布" distribution={companyDistribution} />
            <ScoreBandChart title="分数带" buckets={scoreBands} />
          </div>
        </div>
      </CockpitShell>
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{oneLineSummary}</p>
    </div>
  );
}
```

- [ ] **Step 5: Add only the minimal global tokens needed for the warmer cockpit surfaces**

```css
:root {
  --final-review-accent: oklch(0.62 0.11 240);
  --final-review-accent-soft: oklch(0.96 0.02 240);
  --final-review-surface: oklch(0.99 0.01 95);
  --final-review-border: oklch(0.9 0.02 240);
}
```

- [ ] **Step 6: Replace the inline principles tab in `page.tsx` with the dedicated component**

```tsx
<TabsContent value="battlefield" className="space-y-6">
  <PrinciplesTab
    cycleName={workspace.cycle.name}
    countdownLabel={formatCountdown(workspace.cycle.calibrationEnd)}
    principles={workspace.overview.principles}
    chainGuidance={workspace.overview.chainGuidance}
    riskSummary={workspace.overview.riskSummary}
    companyDistribution={workspace.leaderReview.companyDistributions.all}
    scoreBands={buildScoreBandBuckets(workspace.employeeReview.employees)}
    oneLineSummary={buildPrinciplesNarrative(workspace)}
  />
</TabsContent>
```

- [ ] **Step 7: Run the tests and confirm the principles cockpit contract now passes**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: PASS for the `原则` tab overview assertions and component import assertions, with employee/leader cockpit assertions still pending.

- [ ] **Step 8: Commit the principles cockpit**

```bash
git add src/app/globals.css src/app/'(main)'/calibration/page.tsx src/components/final-review/cockpit-shell.tsx src/components/final-review/principles-tab.tsx src/components/final-review/score-band-chart.tsx src/components/final-review/star-distribution-chart.tsx scripts/test-final-review-ui.mjs
git commit -m "feat: redesign calibration principles cockpit"
```

### Task 4: Rebuild the non-leader final review tab into left analytics + right decision panel

**Files:**
- Create: `src/components/final-review/employee-cockpit.tsx`
- Create: `src/components/final-review/employee-detail-panel.tsx`
- Modify: `src/app/(main)/calibration/page.tsx`
- Modify: `src/components/final-review/workspace-view.ts`
- Test: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Add a failing test for the employee cockpit composition**

```js
test("employee tab composes a left analytics rail and a right employee detail panel", () => {
  const page = read("src/app/(main)/calibration/page.tsx");

  assert.equal(
    page.includes('from "@/components/final-review/employee-cockpit"') &&
      page.includes('from "@/components/final-review/employee-detail-panel"'),
    true,
    "employee final review UI should be split into cockpit components rather than rendered inline",
  );
});
```

- [ ] **Step 2: Run the test file to verify the employee cockpit components are still missing**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: FAIL because the employee tab is still a large inline render block.

- [ ] **Step 3: Expand the view helper with friendly queue labels and narrative summaries**

```ts
export function buildEmployeePriorityCards(rows: EmployeeRow[]) {
  const groups = buildEmployeePriorityGroups(rows);
  return [
    { key: "pending", title: "待拍板", rows: groups.pending, accent: "slate" },
    { key: "disagreement", title: "意见分歧大", rows: groups.disagreement, accent: "amber" },
    { key: "anomaly", title: "超线敏感区", rows: groups.anomaly, accent: "rose" },
    { key: "highBandPending", title: "高分带未定", rows: groups.highBandPending, accent: "blue" },
    { key: "lowBandAnomaly", title: "低分带异常", rows: groups.lowBandAnomaly, accent: "violet" },
  ];
}
```

- [ ] **Step 4: Create the right-side employee decision panel**

```tsx
export function EmployeeDetailPanel({
  employee,
  opinionForm,
  confirmForm,
  onOpinionChange,
  onConfirmChange,
  onSaveOpinion,
  onConfirm,
}: EmployeeDetailPanelProps) {
  if (!employee) {
    return <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/75 p-8 text-sm text-slate-500">从左侧重点名单中选择一位员工，右侧会显示最终决策区、意见汇总和证据摘要。</div>;
  }

  return (
    <aside className="sticky top-6 space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">最终决策</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{employee.name}</h3>
        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span>参考星级</span><strong>{employee.referenceStars ?? "—"} 星</strong></div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span>当前官方星级</span><strong>{employee.officialStars ?? "待确认"}</strong></div>
          <Button onClick={onSaveOpinion}>保存我的终评意见</Button>
          <Button onClick={onConfirm} variant="secondary">提交最终确认</Button>
        </div>
      </section>
    </aside>
  );
}
```

- [ ] **Step 5: Create the chart-led employee cockpit wrapper**

```tsx
export function EmployeeCockpit({
  workspace,
  selectedEmployee,
  priorityCards,
  scoreBands,
  onSelectEmployee,
  ...actions
}: EmployeeCockpitProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
      <div className="space-y-6">
        <ScoreBandChart title="分数带" buckets={scoreBands} />
        <StarDistributionChart title="当前星级分布" distribution={workspace.employeeReview.employeeDistribution} />
        <section className="grid gap-4 md:grid-cols-2">
          {priorityCards.map((card) => (
            <button key={card.key} type="button" className="rounded-[24px] border border-slate-200 bg-white p-4 text-left" onClick={() => card.rows[0] && onSelectEmployee(card.rows[0].id)}>
              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
              <p className="mt-1 text-xs text-slate-500">{card.rows.slice(0, 3).map((row) => row.name).join("、") || "当前为空"}</p>
            </button>
          ))}
        </section>
      </div>
      <EmployeeDetailPanel employee={selectedEmployee} {...actions} />
    </div>
  );
}
```

- [ ] **Step 6: Replace the inline employee tab render block with the new cockpit component**

```tsx
<TabsContent value="employees" className="space-y-6">
  <EmployeeCockpit
    workspace={workspace}
    selectedEmployee={selectedEmployee}
    priorityCards={buildEmployeePriorityCards(workspace.employeeReview.employees)}
    scoreBands={buildScoreBandBuckets(workspace.employeeReview.employees)}
    onSelectEmployee={setSelectedEmployeeId}
    opinionForm={selectedOpinionForm}
    confirmForm={selectedConfirmForm}
    onOpinionChange={updateOpinionForm}
    onConfirmChange={updateConfirmForm}
    onSaveOpinion={submitOpinion}
    onConfirm={submitEmployeeConfirmation}
  />
</TabsContent>
```

- [ ] **Step 7: Run the UI tests to confirm the employee cockpit contract passes**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: PASS for the employee cockpit composition and queue-language assertions.

- [ ] **Step 8: Commit the employee cockpit redesign**

```bash
git add src/app/'(main)'/calibration/page.tsx src/components/final-review/employee-cockpit.tsx src/components/final-review/employee-detail-panel.tsx src/components/final-review/workspace-view.ts scripts/test-final-review-ui.mjs
git commit -m "feat: redesign employee final review cockpit"
```

### Task 5: Rebuild the leader dual-review tab into paired-review analytics + detail panel

**Files:**
- Create: `src/components/final-review/leader-cockpit.tsx`
- Create: `src/components/final-review/leader-detail-panel.tsx`
- Modify: `src/app/(main)/calibration/page.tsx`
- Modify: `src/components/final-review/workspace-view.ts`
- Test: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Add a failing test for the dedicated leader cockpit composition**

```js
test("leader tab composes a dual-review cockpit with paired comparison and detail panel", () => {
  const page = read("src/app/(main)/calibration/page.tsx");

  assert.equal(
    page.includes('from "@/components/final-review/leader-cockpit"') &&
      page.includes('from "@/components/final-review/leader-detail-panel"'),
    true,
    "leader final review UI should be split into dedicated cockpit components",
  );
});
```

- [ ] **Step 2: Run the tests to verify the leader cockpit components are still absent**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: FAIL because the leader tab is still inline in `page.tsx`.

- [ ] **Step 3: Add leader-side summary helpers**

```ts
export function buildLeaderPriorityCards(rows: LeaderRow[]) {
  return [
    { key: "pending", title: "待拍板", rows: rows.filter((row) => !row.officialConfirmedAt) },
    { key: "awaitingDualSubmission", title: "待双人齐备", rows: rows.filter((row) => !row.bothSubmitted) },
    { key: "ready", title: "可拍板", rows: rows.filter((row) => row.bothSubmitted) },
  ];
}
```

- [ ] **Step 4: Create the leader detail panel with final decision first and paired-review comparison second**

```tsx
export function LeaderDetailPanel({
  leader,
  confirmForm,
  onConfirmChange,
  onSubmitEvaluation,
  onConfirm,
}: LeaderDetailPanelProps) {
  if (!leader) {
    return <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/75 p-8 text-sm text-slate-500">从左侧主管名单选择一位主管，右侧会显示最终决策、双人意见对照和问卷详情。</div>;
  }

  return (
    <aside className="sticky top-6 space-y-4">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">最终决策</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{leader.name}</h3>
        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"><span>当前官方星级</span><strong>{leader.officialStars ?? "待确认"}</strong></div>
          <Textarea value={confirmForm.reason} onChange={(event) => onConfirmChange("reason", event.target.value)} placeholder="主管层最终确认理由" />
          <Button onClick={onConfirm}>提交主管层最终确认</Button>
        </div>
      </section>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">双人意见对照</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {leader.evaluations.map((evaluation) => (
            <div key={evaluation.evaluatorId} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{evaluation.evaluatorName}</p>
              <p className="mt-1 text-slate-600">状态：{evaluation.status}</p>
              <p className="text-slate-600">加权分：{evaluation.weightedScore ?? "—"}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
```

- [ ] **Step 5: Create the left-rail leader cockpit wrapper**

```tsx
export function LeaderCockpit({
  workspace,
  selectedLeader,
  priorityCards,
  onSelectLeader,
  ...actions
}: LeaderCockpitProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_440px]">
      <div className="space-y-6">
        <StarDistributionChart title="主管层正式分布" distribution={workspace.leaderReview.leaderDistribution} />
        <section className="grid gap-4">
          {workspace.leaderReview.overview.evaluatorProgress.map((item) => (
            <div key={item.evaluatorId} className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm">
              {item.evaluatorName} 已提交 {item.submittedCount} 份
            </div>
          ))}
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.leaderReview.leaders.map((leader) => (
              <button key={leader.id} type="button" className="rounded-[24px] border border-slate-200 bg-white p-4 text-left" onClick={() => onSelectLeader(leader.id)}>
                <p className="font-semibold text-slate-900">{leader.name}</p>
                <p className="mt-1 text-xs text-slate-500">{leader.bothSubmitted ? "双人已齐备" : "待双人齐备"}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
      <LeaderDetailPanel leader={selectedLeader} {...actions} />
    </div>
  );
}
```

- [ ] **Step 6: Replace the inline leader tab with the new cockpit component**

```tsx
<TabsContent value="leaders" className="space-y-6">
  <LeaderCockpit
    workspace={workspace}
    selectedLeader={selectedLeader}
    priorityCards={buildLeaderPriorityCards(workspace.leaderReview.leaders)}
    onSelectLeader={setSelectedLeaderId}
    leaderForms={leaderForms}
    onLeaderFormChange={updateLeaderForm}
    onSubmitEvaluation={submitLeaderEvaluation}
    confirmForm={selectedLeaderConfirmForm}
    onConfirmChange={updateLeaderConfirmForm}
    onConfirm={submitLeaderConfirmation}
  />
</TabsContent>
```

- [ ] **Step 7: Run the UI tests and verify the leader cockpit contract passes**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: PASS for the leader cockpit composition and dual-review wording assertions.

- [ ] **Step 8: Commit the leader cockpit redesign**

```bash
git add src/app/'(main)'/calibration/page.tsx src/components/final-review/leader-cockpit.tsx src/components/final-review/leader-detail-panel.tsx src/components/final-review/workspace-view.ts scripts/test-final-review-ui.mjs
git commit -m "feat: redesign leader final review cockpit"
```

### Task 6: Polish the warm executive styling, preserve behavior, and verify end-to-end

**Files:**
- Modify: `src/app/(main)/calibration/page.tsx`
- Modify: `src/components/final-review/*.tsx`
- Modify: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Do a focused behavior pass to preserve existing final-review mechanics**

```tsx
useEffect(() => {
  const timer = setInterval(loadWorkspace, 30000);
  return () => clearInterval(timer);
}, [loadWorkspace]);

const selectedEmployee = workspace.employeeReview.employees.find((row) => row.id === selectedEmployeeId)
  ?? workspace.employeeReview.employees[0]
  ?? null;
```

Keep these behaviors intact while polishing:
- 30-second auto-refresh stays on
- selected employee / leader remains stable after refresh when still present
- all existing submit handlers keep using the current API routes
- the redesign remains explanation-first for admins and final-review participants

- [ ] **Step 2: Run the source-level regression tests**

Run: `node --test scripts/test-final-review-ui.mjs scripts/test-final-review-backend.mjs`

Expected: PASS

- [ ] **Step 3: Lint the redesigned files**

Run: `npx eslint --no-warn-ignored scripts/test-final-review-ui.mjs scripts/test-final-review-backend.mjs 'src/app/(main)/calibration/page.tsx' src/components/final-review/*.tsx src/components/final-review/*.ts src/app/globals.css`

Expected: PASS

- [ ] **Step 4: Run a production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 5: Smoke-test the cockpit locally against the existing workspace routes**

Run:

```bash
npm run dev
```

Manual checks:
- `原则` tab shows briefing + overview, not a metric-card wall
- `非主管员工终评` tab shows score-band chart, star distribution, priority queues, and a fixed right decision panel
- `主管层双人终评` tab shows dual-review progress, leader roster cards, and a right comparison panel
- employee and leader mutation flows still save successfully
- top-level explanations remain visible and readable for admins

- [ ] **Step 6: Commit and push**

```bash
git add src/app/'(main)'/calibration/page.tsx src/app/globals.css src/components/final-review scripts/test-final-review-ui.mjs scripts/test-final-review-backend.mjs
git commit -m "feat: redesign calibration cockpit experience"
git push origin feat/final-review-workbench
```
