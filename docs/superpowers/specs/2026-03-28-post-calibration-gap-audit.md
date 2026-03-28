# Post-Calibration Gap Audit

Date: 2026-03-28

## Purpose

Record the remaining product gaps after the calibration rewrite so the next implementation batch can start from a clear checklist.

## Current Status

The calibration workspace for pages 1-3 has been brought into line with the core principle that company-level calibration is handled by two people only: `吴承霖` and `邱翔`.

The remaining gaps are now outside the calibration scope and sit mainly in:

- `绩效面谈`
- `申诉窗口`
- supporting copy in `指南 / 仪表盘 / 导航`

## Gap 1: Meeting Flow Is Still Too Thin

### Required Product Shape

Supervisor side:

- show each employee
- show a simple summary of their 360 feedback
- show both the direct manager initial rating and the calibrated final rating
- show clearly if the final rating changed during calibration
- provide a meeting summary written by the supervisor and shown to the employee
- provide a meeting completion button

Employee side:

- show a greeting and the final performance level
- show the final performance comment
- provide a confirmation button after the meeting

### Current Product Shape

`src/app/(main)/meetings/page.tsx` currently supports:

- a list of employees
- a meeting date
- a free-text note
- an employee acknowledgement flag

It does **not** yet provide:

- 360 summary
- side-by-side initial vs final rating
- visible calibration change indicator
- a dedicated employee-facing meeting summary section with the requested framing
- a clearly separated leader view vs employee view with the final result explanation

### Conclusion

The current meeting flow is operational but not aligned with the product brief. It needs a redesign, not just wording edits.

## Gap 2: Appeal Flow Is More Complex Than Requested

### Required Product Shape

The latest brief says no appeal workflow needs to be developed now.

Only one sentence is required in the interface:

> If the employee has an objection to the result, they should contact HRBP and submit a written appeal, which will be handled and responded to through the process.

### Current Product Shape

`src/app/(main)/appeal/page.tsx` and `src/app/api/appeal/route.ts` already implement a full appeal submission and handling workflow:

- employee submission
- window checks
- HR handling
- status tracking
- resolution text

### Conclusion

The product currently exceeds the requirement. If the brief remains unchanged, this area should probably be simplified rather than expanded.

## Gap 3: Guide, Dashboard, and Navigation Still Reflect the Older Process

The surrounding product surfaces still assume the older shape of the later-stage process:

- `src/app/(main)/guide/guide-client.tsx`
- `src/app/(main)/dashboard/page.tsx`
- `src/components/nav.tsx`

These areas need a follow-up pass once the meeting and appeal decisions are settled, otherwise the product story stays inconsistent even if the main pages are corrected.

## Recommended Next Batch

1. Redesign `绩效面谈` into separate supervisor and employee experiences that match the brief.
2. Decide whether `申诉窗口` should be reduced to a simple informational page.
3. Align `指南 / 仪表盘 / 导航` with those final decisions.

## Recommendation

Do the next implementation batch in this order:

1. `绩效面谈`
2. `申诉窗口`
3. supporting guidance and entry points

This keeps the user-facing process coherent from calibration result to employee communication.
