# UI/UX UPGRADE DESIGN SPECIFICATION

## Overview
This specification details the technical architecture and design requirements for the UI/UX Upgrade milestone of the Systems Indexer application. The upgrade will establish a Premium Dark Glassmorphic Theme, replace the current DOM-based overlap approximation with a true SVG-based interactive Venn Diagram, introduce hardware-accelerated fluid layout transitions, and enforce regression-free test and type parity.

---

## 1. Premium Dark Glassmorphic Theme (R1)
To project a modern, premium aesthetic suited for high-density mechanical gameplay vectors, the UI utilizes a dark background with blurred, glowing surface overlays.

### A. Typography & Fonts
We introduce **Outfit** for primary headings and badges, while keeping **Inter** as the highly readable default body typeface. Monospaced indicators use **Space Grotesk** or standard code/consolas.
- **Heading/Accent Font**: `'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Body Font**: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Mono Font**: `'Space Grotesk', Consolas, "Liberation Mono", monospace`

### B. Core CSS Theme Variables
Define the following root custom properties in `styles.css`:
```css
:root {
  /* Colors */
  --bg-primary: #030712;             /* Deep rich dark gray/black background */
  --bg-surface: #0b1120;             /* Surface cards and panels dark blue-gray */
  --bg-surface-glass: rgba(15, 23, 42, 0.45); /* Translucent base for backdrop blur */
  --bg-surface-glass-hover: rgba(30, 41, 59, 0.6);
  
  /* Borders */
  --border-glass: rgba(255, 255, 255, 0.08);
  --border-glass-hover: rgba(255, 255, 255, 0.16);
  --border-accent: rgba(99, 102, 241, 0.45);
  
  /* Accents */
  --color-accent: #6366f1;           /* Indigo */
  --color-accent-hover: #4f46e5;
  --color-accent-light: rgba(99, 102, 241, 0.1);
  --color-ttrpg: #c084fc;            /* Soft Purple */
  --color-ttrpg-gradient: linear-gradient(135deg, #a78bfa, #6366f1);
  --color-boardgame: #22d3ee;        /* Soft Cyan */
  --color-boardgame-gradient: linear-gradient(135deg, #06b6d4, #0d9488);
  
  /* Shadows & Glows */
  --shadow-glass: 
    0 8px 32px 0 rgba(0, 0, 0, 0.4), 
    inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
  --shadow-ttrpg-glow: 0 0 25px rgba(167, 139, 250, 0.15);
  --shadow-boardgame-glow: 0 0 25px rgba(34, 211, 238, 0.15);
  
  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
}
```

### C. Glassmorphism Design Rules
For all container cards (stats, filters sidebar, compare panels, dictionary sidebar, editor panels, details drawer modal), apply:
```css
.glass-panel {
  background: var(--bg-surface-glass);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  transition: border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
}

.glass-panel:hover {
  background: var(--bg-surface-glass-hover);
  border-color: var(--border-glass-hover);
}
```

---

## 2. Interactive Venn Diagram Visualization (R2)
To replace overlapping HTML circles with an elegant vector-accurate representation, the Venn tool uses an inline SVG element.

### A. Layout Coordinates (SVG viewBox)
The SVG element is configured with a viewBox of `0 0 500 300` to maintain scale and rendering logic across desktop and mobile screens.

```
       (0,0) ------------------- Width: 500px ------------------- (500,0)
         |                                                           |
         |         Circle A                   Circle B               |
         |        Center: (180, 150)         Center: (320, 150)      |
         |         Radius: 100                Radius: 100            |
         |           _______                    _______              |
         |          /       \                  /       \             |
         |         /  Only   \    Overlap     /  Only   \            |
         |        |     A     |   (250,150)  |     B     |           |
         |         \         /                \         /            |
         |          \_______/                  \_______/             |
         |                                                           |
       (0,300) ----------------- Height: 300px ----------------- (500,300)
```

- **Canvas Dimensions**: Width = `500`, Height = `300`
- **Circle A (Left)**: Center $(X_a, Y_a) = (180, 150)$, Radius $R_a = 100$
- **Circle B (Right)**: Center $(X_b, Y_b) = (320, 150)$, Radius $R_b = 100$
- **Overlap Intersection Shape**: Calculated using mathematical arcs between intersection points $(250, 78.6)$ and $(250, 221.4)$.

### B. SVG Path Definitions
```xml
<svg viewBox="0 0 500 300" class="venn-diagram-svg">
  <!-- Circle A (Exclusive Left Side) -->
  <!-- Utilizes clip-path or complex arc paths to avoid overlap visual clashes -->
  <path d="M 250 78.6 A 100 100 0 1 0 250 221.4 A 100 100 0 0 0 250 78.6" 
        class="venn-segment segment-a" 
        role="button" 
        aria-label="Game A Exclusive Vectors"
        onclick="highlightCompareColumn('a')" />

  <!-- Circle B (Exclusive Right Side) -->
  <path d="M 250 78.6 A 100 100 0 0 0 250 221.4 A 100 100 0 1 0 250 78.6" 
        class="venn-segment segment-b" 
        role="button" 
        aria-label="Game B Exclusive Vectors"
        onclick="highlightCompareColumn('b')" />

  <!-- Intersection (Overlap Segment) -->
  <path d="M 250 78.6 A 100 100 0 0 1 250 221.4 A 100 100 0 0 1 250 78.6 Z" 
        class="venn-segment segment-both" 
        role="button" 
        aria-label="Shared Vectors"
        onclick="highlightCompareColumn('both')" />
        
  <!-- Interactive Text Labels (Positioned overlay) -->
  <g class="venn-labels">
    <!-- Game A Label -->
    <text x="130" y="140" class="venn-text title-label" id="venn-label-title-a">Game A Title</text>
    <text x="130" y="165" class="venn-text count-label" id="venn-label-count-a">0 Exclusive</text>

    <!-- Game B Label -->
    <text x="370" y="140" class="venn-text title-label" id="venn-label-title-b">Game B Title</text>
    <text x="370" y="165" class="venn-text count-label" id="venn-label-count-b">0 Exclusive</text>

    <!-- Shared Label -->
    <text x="250" y="145" class="venn-text title-label shared-label" id="venn-label-title-both">Shared</text>
    <text x="250" y="170" class="venn-text count-label shared-label" id="venn-label-count-both">0 Shared</text>
  </g>
</svg>
```

### C. Style Mapping
Ensure JSDOM-friendly classes remain supported while updating CSS to style the SVG nodes:
- `.venn-circle.circle-a` styles map to `.venn-segment.segment-a`.
- `.venn-circle.circle-b` styles map to `.venn-segment.segment-b`.
- `.venn-circle-intersection` styles map to `.venn-segment.segment-both`.
- Maintain selector strings inside test assertions (e.g. `expect(document.querySelector('.circle-a .venn-count').textContent).toBe('...')`) by keeping lightweight DOM wrapper tags or populating hidden DOM nodes to guarantee backward compatibility with Jest.
- Add CSS transitions on path fills:
  ```css
  .venn-segment {
    fill-opacity: 0.12;
    stroke-width: 2px;
    stroke-dasharray: 4px;
    transition: fill-opacity 0.2s, stroke-width 0.2s, stroke-dasharray 0.2s;
    cursor: pointer;
  }
  .segment-a {
    fill: var(--color-ttrpg);
    stroke: var(--color-ttrpg);
  }
  .segment-b {
    fill: var(--color-boardgame);
    stroke: var(--color-boardgame);
  }
  .segment-both {
    fill: var(--color-accent);
    stroke: var(--color-accent);
    stroke-style: solid;
    stroke-dasharray: 0;
    fill-opacity: 0.35;
  }
  .venn-segment:hover {
    fill-opacity: 0.25;
    stroke-width: 3px;
  }
  .segment-both:hover {
    fill-opacity: 0.55;
  }
  .venn-text {
    fill: var(--text-primary);
    font-family: var(--font-mono);
    text-anchor: middle;
    pointer-events: none; /* Let clicks pass through to paths */
  }
  .title-label {
    font-size: 11px;
    font-weight: 500;
  }
  .count-label {
    font-size: 13px;
    font-weight: 700;
  }
  ```

### D. Hover Cards & Tooltip Elements
Hover cards are rendered dynamically via an HTML tooltip overlay that tracks the cursor over the SVG, showing a preview of vectors.
- Target elements: `.segment-a`, `.segment-b`, `.segment-both`.
- On `mouseenter` or `mousemove`: Render a relative positioned tooltip `.venn-hover-card` listing the first 3 vectors inside that slice, with an indicator to "Click segment to inspect all vectors".

---

## 3. Responsive Layout & Layout Transitions (R3)

### A. Mobile-Responsive Breakpoints
Build grid behaviors with strict breakpoints matching high-density monitors down to small smartphones:
1. **Desktop / Ultra-wide (1200px to 1920px+)**: Dual/Triple columns for layout views. Explorer grid: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`.
2. **Tablet / Medium Width (768px to 1199px)**:
   - Sidebar filters stack above grid on Explorer (`grid-template-columns: 1fr`).
   - Comparison grid shifts to a 2-column or 1-column layout depending on space.
3. **Mobile (320px to 767px)**:
   - Grid cards span 100% width.
   - Tabs navigator handles horizontal overflow (`overflow-x: auto; white-space: nowrap`).
   - Navigation button badges scale down.

### B. Hardware-Accelerated 60 FPS Transitions
Tab changes and filter animations must not trigger CPU-based reflow/repaint calculations.
- Use `will-change` properties on transition wrapper panels:
  ```css
  .view-panel {
    display: none;
    opacity: 0;
    transform: scale(0.98) translateY(6px);
    transition: opacity 0.2s cubic-bezier(0.25, 1, 0.5, 1), 
                transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform, opacity;
  }
  .view-panel.active {
    display: block;
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  ```
- Animating tabs selection underline using `transform: translateX()` instead of changing `left` or `width` values.

---

## 4. Maintenance of Type and Performance Parity (R4)

### A. Type Safety
Maintain 100% typescript compliance during UI upgrades. 
- Ensure all DOM elements query casts (e.g. `document.getElementById(...) as HTMLInputElement`) are correctly typed.
- Verify autocomplete functions handle type conversions between event targets and values safely.
- Keep `tsconfig.json` settings: no regressions to current strict parameters.

### B. Performance Parity
To guarantee the UI remains highly responsive, even with a massive rules database:
1. **Progressive Rendering Batches**: Keep `requestAnimationFrame` render batches at <= 3ms blocks. If rendering a view (like Explorer Grid or Vector Dictionary list) exceeds 10 items, partition calculations.
2. **Main Thread Blocking**: Confirm main thread remains unblocked (0ms block during typing benchmarks). Input events on the search bar must use debounced filtering (150ms).
3. **Web Worker Offloading**: Retain full data query execution inside the Web Worker (`src/search-worker.js`), leaving the UI thread solely responsible for visual layout updates.

---

## 5. Verification Plan

To verify that the upgrade is fully backward-compatible and does not cause regressions, developers must run the following check routines:

### A. Test Execution Routine
Before and after implementing the UI upgrade, run:
```powershell
# Clean and verify types compiled
npm run build

# Run all E2E & unit test suites
npm test
```

### B. Test-Specific Assertions to Protect
1. **Venn Rendering (`tests/tier12.test.js`)**:
   - `F3-T1-03: Select Game A & B to Render Venn Diagram` checks for exclusive & shared text content.
   - `F3-T1-04: Click Venn Segments to Highlight Comparison Columns` triggers `.venn-circle.circle-a` click handler. Ensure class mapping or selector wrappers continue returning JSDOM elements correctly.
2. **Dashboard Counter Rendering (`tests/smoke.test.js`)**:
   - Total count updates must populate `#stat-total-games`, `#stat-total-ttrpgs`, `#stat-total-boardgames`, and `#stat-total-vectors` correctly.
3. **Dictionary Navigation and Persistence (`tests/tier34.test.js`)**:
   - Transitioning between tabs must preserve state (e.g. active dictionary sidebar domain filter selection).
