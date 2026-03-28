# Final Review Panel Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the final-review workspace into a queue-first panel layout where the left side picks people and the right side focuses on one current person at a time.

**Architecture:** Keep the existing three-tab final-review workspace and all current data routes, but reorganize the employee and leader cockpits around a two-column “queue + single-person panel” structure. Add a lightweight distribution drawer for employee-wide context, keep confirmation on the current person without auto-advance, and reuse the same interaction language across the employee and leader tabs.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, node:test, ESLint

---

## File Structure

### Existing files to modify

- `scripts/test-final-review-ui.mjs`
  Lock the panel-layout contract and the new queue/drawer/status tokens.
- `src/app/(main)/calibration/page.tsx`
  Keep it as the container, but pass the new panel-layout props and copy.
- `src/components/final-review/employee-cockpit.tsx`
  Rebuild the employee tab shell into a left queue rail and right single-person panel host.
- `src/components/final-review/employee-detail-panel.tsx`
  Restructure the right-side employee panel into the new single-column flow and show the post-confirmation hint label.
- `src/components/final-review/leader-cockpit.tsx`
  Mirror the same panel treatment for the leader tab.
- `src/components/final-review/leader-detail-panel.tsx`
  Reorder the leader right-side panel into the same queue-first workflow.
- `src/components/final-review/workspace-view.ts`
  Add queue groups and summaries that match the left-side tabs.

### New files to create

- `src/components/final-review/distribution-drawer.tsx`
  Shared collapsible “查看整体分布” panel used by the employee tab.
- `src/components/final-review/queue-tabs.tsx`
  Shared queue-tab header used to switch between `待拍板 / 有分歧 / 全部员工` and the leader equivalent.

---

### Task 1: Freeze the panel-layout contract in tests

**Files:**
- Modify: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Add failing UI tests for the employee queue-first layout**

```js
test("employee cockpit uses queue tabs plus a single-person detail panel", () => {
  const cockpit = read("src/components/final-review/employee-cockpit.tsx");
  const detail = read("src/components/final-review/employee-detail-panel.tsx");

  assert.equal(
    cockpit.includes("待拍板") && cockpit.includes("有分歧") && cockpit.includes("全部员工"),
    true,
    "employee cockpit should expose the three queue tabs on the left rail",
  );
  assert.equal(
    cockpit.includes("查看整体分布"),
    true,
    "employee cockpit should move company-wide charts behind a lightweight distribution drawer",
  );
  assert.equal(
    detail.includes("已确认，可切换下一位"),
    true,
    "employee detail panel should keep the current employee selected and show a post-confirmation hint instead of auto-advancing",
  );
});
```

- [ ] **Step 2: Add failing UI tests for the leader tab panel layout**

```js
test("leader cockpit mirrors the queue-first panel layout", () => {
  const cockpit = read("src/components/final-review/leader-cockpit.tsx");
  const detail = read("src/components/final-review/leader-detail-panel.tsx");

  assert.equal(
    cockpit.includes("待拍板") && cockpit.includes("待双人齐备") && cockpit.includes("全部主管"),
    true,
    "leader cockpit should expose the new queue tabs on the left rail",
  );
  assert.equal(
    detail.includes("当前结论") && detail.includes("双人意见摘要") && detail.includes("过程留痕"),
    true,
    "leader detail panel should follow the single-column decision flow",
  );
});
```

- [ ] **Step 3: Run the UI test file to confirm it is red**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: FAIL on missing tokens such as `查看整体分布`, `全部员工`, `全部主管`, or `已确认，可切换下一位`.

- [ ] **Step 4: Commit the red checkpoint**

```bash
git add scripts/test-final-review-ui.mjs
git commit -m "test: lock final review panel layout contract"
```

### Task 2: Rebuild the employee tab into a queue rail plus single-person panel

**Files:**
- Create: `src/components/final-review/distribution-drawer.tsx`
- Create: `src/components/final-review/queue-tabs.tsx`
- Modify: `src/components/final-review/employee-cockpit.tsx`
- Modify: `src/components/final-review/employee-detail-panel.tsx`
- Modify: `src/components/final-review/workspace-view.ts`
- Test: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Add a shared queue-tab component**

```tsx
type QueueTabItem = {
  key: string;
  label: string;
  count: number;
};

export function QueueTabs({
  items,
  activeKey,
  onChange,
}: {
  items: QueueTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={
            activeKey === item.key
              ? "rounded-2xl border border-[color:var(--cockpit-accent-strong)] bg-[color:var(--cockpit-accent)]/20 px-4 py-3 text-left"
              : "rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-left hover:border-[color:var(--cockpit-accent)]"
          }
        >
          <span>{item.label}</span>
          <span>{item.count}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add a lightweight employee distribution drawer**

```tsx
export function DistributionDrawer({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[28px] border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-[var(--cockpit-muted-foreground)]">{description}</p>
        </div>
        <Button variant="outline" onClick={() => setOpen((current) => !current)}>
          {open ? "收起整体分布" : "查看整体分布"}
        </Button>
      </div>

      {open ? <div className="mt-4 grid gap-4 2xl:grid-cols-2">{children}</div> : null}
    </section>
  );
}
```

- [ ] **Step 3: Replace the employee left column with queue tabs + roster rail**

```tsx
const queueItems = [
  { key: "pending", label: "待拍板", count: pendingRows.length },
  { key: "disagreement", label: "有分歧", count: disagreementRows.length },
  { key: "all", label: "全部员工", count: allEmployees.length },
];

const visibleRows = activeQueueKey === "pending"
  ? pendingRows
  : activeQueueKey === "disagreement"
    ? disagreementRows
    : allEmployees;
```

Use that queue state to drive both the compact queue cards and the searchable roster list. Keep the selected employee stable when the user confirms someone.

- [ ] **Step 4: Reorder the employee detail panel into the approved single-column flow**

```tsx
<>
  <section>当前结论</section>
  <section>证据摘要</section>
  <section>初评评语摘要</section>
  <section>意见汇总</section>
  <section>最终确认</section>
  <section>过程留痕</section>
</>
```

Add the explicit post-confirmation hint near the top:

```tsx
{employee.officialStars != null ? (
  <Badge variant="secondary">已确认，可切换下一位</Badge>
) : (
  <Badge variant="outline">待拍板</Badge>
)}
```

- [ ] **Step 5: Run the UI test file to verify employee layout turns green**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: PASS for the employee queue/drawer/hint assertions.

- [ ] **Step 6: Commit the employee panel task**

```bash
git add src/components/final-review/distribution-drawer.tsx src/components/final-review/queue-tabs.tsx src/components/final-review/employee-cockpit.tsx src/components/final-review/employee-detail-panel.tsx src/components/final-review/workspace-view.ts scripts/test-final-review-ui.mjs
git commit -m "feat: reshape employee final review into panel layout"
```

### Task 3: Mirror the same interaction model for the leader tab

**Files:**
- Modify: `src/components/final-review/leader-cockpit.tsx`
- Modify: `src/components/final-review/leader-detail-panel.tsx`
- Reuse: `src/components/final-review/queue-tabs.tsx`
- Test: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Replace the leader top blocks with the same queue-first shell**

```tsx
const queueItems = [
  { key: "pending", label: "待拍板", count: pendingCount },
  { key: "awaitingDual", label: "待双人齐备", count: awaitingDualCount },
  { key: "all", label: "全部主管", count: allLeaders.length },
];
```

The left column should prioritize those queues and the roster rail; full-distribution context should become secondary.

- [ ] **Step 2: Reorder the leader detail panel into a single-person decision flow**

```tsx
<>
  <section>当前结论</section>
  <section>双人意见摘要</section>
  <section>详细双人问卷</section>
  <section>最终确认</section>
  <section>过程留痕</section>
</>
```

Keep the existing permission gates intact while changing only the order and surface hierarchy.

- [ ] **Step 3: Run the UI test file to verify the leader layout turns green**

Run: `node --test scripts/test-final-review-ui.mjs`

Expected: PASS for the leader queue-tab and single-column detail-panel assertions.

- [ ] **Step 4: Commit the leader panel task**

```bash
git add src/components/final-review/leader-cockpit.tsx src/components/final-review/leader-detail-panel.tsx scripts/test-final-review-ui.mjs
git commit -m "feat: mirror panel layout for leader final review"
```

### Task 4: Integrate container wiring and run full verification

**Files:**
- Modify: `src/app/(main)/calibration/page.tsx`
- Recheck: `src/components/final-review/employee-cockpit.tsx`
- Recheck: `src/components/final-review/leader-cockpit.tsx`
- Test: `scripts/test-final-review-ui.mjs`

- [ ] **Step 1: Update the page-level copy and props for the new panel layout**

```tsx
<EmployeeCockpit
  guideDescription="这一页用于逐个处理普通员工终评：左侧选人，右侧只处理当前这一个人。"
  priorityBoardTitle="处理队列"
  priorityBoardDescription="默认先看待拍板，也可以切到有分歧或全部员工。"
/>

<LeaderCockpit
  guideDescription="这一页用于逐个处理主管层终评：左侧选主管，右侧只处理当前这一个人。"
  progressTitle="处理队列"
  progressDescription="默认先看待拍板，也可以切到待双人齐备或全部主管。"
/>
```

- [ ] **Step 2: Verify selection behavior does not auto-advance after confirmation**

Run the existing page logic and keep:

```tsx
onConfirm={() => {
  if (selectedEmployee) {
    void confirmEmployee(selectedEmployee);
  }
}}
```

Do not add any `setSelectedEmployeeId(nextId)` or `setSelectedLeaderId(nextId)` behavior after a successful confirmation.

- [ ] **Step 3: Run full verification**

Run:

```bash
node --test scripts/test-*.mjs
npx eslint src/components/final-review/distribution-drawer.tsx src/components/final-review/queue-tabs.tsx src/components/final-review/employee-cockpit.tsx src/components/final-review/employee-detail-panel.tsx src/components/final-review/leader-cockpit.tsx src/components/final-review/leader-detail-panel.tsx 'src/app/(main)/calibration/page.tsx' src/components/final-review/workspace-view.ts scripts/test-final-review-ui.mjs
npm run build
```

Expected:

- `node --test`: all tests pass
- `eslint`: exit code `0`
- `npm run build`: succeeds; existing dynamic-route cookie warnings may still appear, but build must complete

- [ ] **Step 4: Commit the integrated panel-layout rewrite**

```bash
git add src/app/(main)/calibration/page.tsx src/components/final-review/distribution-drawer.tsx src/components/final-review/queue-tabs.tsx src/components/final-review/employee-cockpit.tsx src/components/final-review/employee-detail-panel.tsx src/components/final-review/leader-cockpit.tsx src/components/final-review/leader-detail-panel.tsx src/components/final-review/workspace-view.ts scripts/test-final-review-ui.mjs
git commit -m "feat: rebuild final review into panel layout"
```
