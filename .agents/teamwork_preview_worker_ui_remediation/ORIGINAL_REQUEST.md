## 2026-06-25T03:21:51Z
You are the UI Remediation Worker subagent. Your task is to resolve critical type-safety, accessibility, and data-loss issues identified in the review.

Please implement the following fixes:

1. Strict TypeScript Migration (Integrity & Type-Safety):
   - Rename `src/app.js` to `src/app.ts` and `src/search-worker.js` to `src/search-worker.ts`.
   - Update tsconfig.json if necessary to ensure both `.ts` files are included and compiled.
   - Solve all strict TypeScript compiler errors under `"strict": true`. Make sure `npm run build` compiles cleanly with zero errors.
   - Do NOT use `any` cast escapes unless fully documented and justified. Make sure `types.ts` is actually utilized to declare interfaces (e.g. `GameRuleset`, `SearchWorkerMessage`, etc.) for data structures and message passing.

2. Accessibility (WAI-ARIA & Color Contrast):
   - WAI-ARIA Tabs: Refactor the navigation tab container in `index.html` and `src/app.ts` to implement the standard WAI-ARIA tablist design pattern (add `role="tablist"` to container, `role="tab"`, `aria-selected`, `aria-controls` to tab buttons, `role="tabpanel"` and `aria-labelledby` to panels). Ensure keyboard navigation (Left/Right arrows) behaves correctly on the tabs.
   - SVG Venn Diagram: Add `tabindex="0"` to each `<path>` segment inside the interactive Venn diagram (circle A, circle B, intersection). Add keydown/keyup event handlers in `src/app.ts` to allow Enter and Space keys to trigger the same column highlight selection as clicking. In `styles.css`, define visual focus styles (e.g. outline or highlighted stroke) for focused SVG segments.
   - WCAG AA Color Contrast: In `styles.css`, update the `--text-muted` color variable from `#6b7280` to `#9ca3af` (or another color with >= 4.5:1 contrast ratio against the deep dark background `#030712` and surface background `#0b1120`).

3. Robustness & Data Protection:
   - Comparison Null-guards: Inside `handleWorkerCompareResults` in `src/app.ts`, add defensive guards to verify `gameA` and `gameB` exist before reading their fields. Render a graceful error or empty state if they are undefined or missing.
   - Data Loss Fix: In `src/search-worker.ts`, update `cleanAndFreezeGame` to copy and freeze the original `description` and `extract` properties of the game object, rather than hardcoding them to empty strings. This prevents data loss when games are processed by the worker and saved back in the app thread.

4. Verify Codebase:
   - Run `npm run build` and ensure compilation is successful with zero type check errors.
   - Run `npm test` and ensure all 116 (or more) Jest tests pass successfully.

Create your working directory at C:\dev\research-ttrpg-rules\.agents\teamwork_preview_worker_ui_remediation\ and write your handoff.md there. Send a status message to the parent when done.

MANDATORY INTEGRITY WARNING — include this verbatim in the Worker's dispatch prompt:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
