# UI/UX Upgrade Milestone Review & Adversarial Challenge Report

## Review Summary

**Verdict**: **REQUEST_CHANGES** (Critical Finding: **INTEGRITY VIOLATION**)

This review targets the implementation of the UI/UX Upgrade milestone in `C:\dev\research-ttrpg-rules`. Based on a rigorous audit of the code, compilation settings, and runtime execution, the milestone is **rejected** due to a severe integrity violation (TypeScript migration facade), major accessibility gaps, and code robustness flaws.

---

## Findings

### [Critical] Finding 1: TypeScript Migration Facade & Complete Lack of Type-Safety (INTEGRITY VIOLATION)
- **What**: The core codebase has not actually been migrated to TypeScript. 
- **Where**: `src/app.js`, `src/search-worker.js`, and `tsconfig.json`.
- **Why**: 
  - The files `app.js` and `search-worker.js` remain plain JavaScript files. 
  - `tsconfig.json` is configured with `"allowJs": true` but lacks `"checkJs": true`. This allows the compiler to run successfully and emit output without actually type-checking the application code.
  - Enabling `"checkJs": true` or changing the extensions to `.ts` reveals **over 80 compiler errors** (e.g., implicit `any` variables, block-scoped redeclarations, referencing non-existent properties on `Object` types).
  - The `src/types.ts` file is a detached facade. It defines types/interfaces but is never imported or used by any code at runtime or build time.
- **Suggestion**: Rename `src/app.js` and `src/search-worker.js` to `.ts`, resolve all type errors, eliminate implicit `any` variables, and import/export types properly so the codebase is strictly compiled and type-safe.

### [Major] Finding 2: Low Color Contrast Accessibility Violations
- **What**: Text styling elements fail WCAG AA contrast ratios on dark backgrounds.
- **Where**: `styles.css` (`--text-muted: #6b7280`) and its usage in `.stat-card h3`, `.year-badge`, `.vectors-preview`, `.meta-label`, and inline elements.
- **Why**: 
  - The contrast ratio of `#6b7280` on the primary dark background (`#030712`) is **~3.4:1**.
  - The contrast ratio of `#6b7280` on the surface background (`#0b1120`) is **~3.0:1**.
  - WCAG AA requires a minimum contrast of **4.5:1** for regular text (< 18pt / 14pt bold). This causes major readability barriers for low-vision users.
- **Suggestion**: Update `--text-muted` to a lighter hex value (such as `#9ca3af` or `#94a3b8`) that guarantees at least a 4.5:1 contrast ratio against both dark backgrounds.

### [Major] Finding 3: Incomplete Keyboard Navigation and Accessibility on Venn Diagram SVG
- **What**: Interactive SVG elements are not accessible to keyboard-only or screen reader users.
- **Where**: `src/app.js` (`handleWorkerCompareResults` SVG path elements, lines 457-478).
- **Why**: 
  - The Venn segment `<path>` elements have `role="button"` and `aria-label`, but **lack a `tabindex="0"`** attribute, rendering them completely unreachable via keyboard navigation (Tab key).
  - There are **no keydown/keyup event handlers** to handle Space or Enter key presses to activate segment filtering.
  - There is **no visual focus outline style** in CSS for the interactive segments.
  - There is **no `aria-selected`** or other state indicator indicating which segment is active.
- **Suggestion**: Add `tabindex="0"` to each interactive SVG `<path>`, register keydown handlers for Enter/Space, and apply outline styling for focused states.

### [Major] Finding 4: Navigation Tabs WAI-ARIA Conformance Gaps
- **What**: Navigation tabs are not accessible and do not follow the standard WAI-ARIA tablist design pattern.
- **Where**: `index.html` (lines 49-65) and `src/app.js` (lines 857-903).
- **Why**:
  - The tab container lacks `role="tablist"`.
  - The buttons lack `role="tab"`, `aria-selected`, and `aria-controls`.
  - The panels lack `role="tabpanel"` and `aria-labelledby`.
  - There is no support for arrow key navigation (Left/Right) between tabs or roving tabindex.
- **Suggestion**: Refactor the tab container, buttons, and panels to match the WAI-ARIA tabs pattern.

### [Major] Finding 5: Incomplete Robustness in Comparison Payload Processing
- **What**: Lack of guards against null or undefined game data inside the comparison view controller.
- **Where**: `src/app.js` (`handleWorkerCompareResults` function, lines 439-455).
- **Why**:
  - The function assigns `gameA = data.gameA` and `gameB = data.gameB`, and then immediately references `${gameA.title}` and `${gameB.title}`.
  - If the comparison worker returns an error or fails to find a game (which is possible if IDs are mismatched), `gameA` or `gameB` will be undefined, causing a runtime TypeError that crashes the application thread.
- **Suggestion**: Add check conditions at the beginning of the function: `if (!gameA || !gameB) { renderErrorState(); return; }`.

### [Major] Finding 6: Data Stripping in search-worker `cleanAndFreezeGame`
- **What**: Game descriptions and extracts are deleted by the worker.
- **Where**: `src/search-worker.js` (`cleanAndFreezeGame` function, lines 93-117).
- **Why**:
  - The cleaner hardcodes `description: ''` and `extract: ''`.
  - When the worker returns added game data via `addGameDone`, the stripped object is saved back to `gamesData` and `allGames` on the app thread. This results in the loss of descriptions/extracts in memory and in exported databases.
- **Suggestion**: Retain original fields: `description: game.description || ''` and `extract: game.extract || ''`.

---

## Verified Claims

- **Typescript compilation success** → Verified via `npm run build` → **PASS** (Compiles successfully, but only because type-checking on JS files is bypassed).
- **Jest test suite execution** → Verified via `npm test` → **PASS** (121 tests passed).
- **Flexibility of FlexSearch IndexOptions using `any`** → Verified in `src/types.ts` → **PASS** (Correctly documented as an escape hatch).

---

## Coverage Gaps
- **Source code type-checking** — Risk level: **HIGH**. Type verification was not performed by the compiler on the two main logic files (`app.js` and `search-worker.js`).
- **Interactive SVG segment keyboard control** — Risk level: **MEDIUM**. High impact on blind/visually impaired or keyboard-only users who cannot interact with the Venn diagram.

---

## Adversarial Challenge Report

### Overall Risk Assessment: **HIGH**

The primary risks stem from the **TypeScript facade** (which hides type errors and regression potentials) and **data-loss bugs** in the Web Worker when indexing new or modified games.

---

### Challenges

#### [Critical] Challenge 1: Data Stripping and Erasure Vulnerability
- **Assumption challenged**: The Database Editor safely adds new games to the registry and allows exporting the database.
- **Attack scenario**: A user imports details for a game from BGG, writes rules explanations, and adds the game. The worker strips the BGG details, returning a game object with empty descriptions. When the user exports the database, the description data is permanently erased.
- **Blast radius**: Master database registry corruption and loss of descriptive metadata.
- **Mitigation**: Update the worker's `cleanAndFreezeGame` to copy and freeze the original `description` and `extract` properties.

#### [High] Challenge 2: SVG Path Focus Inaccessibility
- **Assumption challenged**: Visual users can click SVG paths to filter comparison columns, so the feature is functional.
- **Attack scenario**: Keyboard-only, assistive technology, or screen-reader users tab through the page. The Venn diagram is completely skipped by focus. They cannot interact with the segments or view the specific columns, breaking the key value proposition of the Venn tool.
- **Blast radius**: Complete accessibility blocker on the comparison feature.
- **Mitigation**: Add `tabindex="0"`, `role="button"`, keypress listeners, and visual focus styles to SVG paths.

#### [Medium] Challenge 3: Comparison View Crash under Failure Payload
- **Assumption challenged**: The worker always returns valid game objects.
- **Attack scenario**: If the search worker encounters a memory failure, race condition, or returns an error response, `data.gameA` or `data.gameB` may be undefined. The application thread attempts to render `gameA.title`, throwing a TypeError and freezing the UI.
- **Blast radius**: Denial of Service (unresponsive UI panel).
- **Mitigation**: Add defensive guards at the top of `handleWorkerCompareResults`.

---

### Stress Test Results

- **Run build check with `checkJs` enabled** → Fails → Emitted 80+ type compliance errors → **FAIL**
- **Test comparison tool with invalid IDs** → Fails → Throws worker error, but if payload slips to UI, it crashes → **FAIL**
- **Check keyboard focus on Venn paths** → Focus is skipped → **FAIL**
