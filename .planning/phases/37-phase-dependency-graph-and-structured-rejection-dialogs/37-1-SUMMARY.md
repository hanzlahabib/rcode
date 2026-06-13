---
sprint: 37.1
status: complete
commits:
  - d4f12cf feat(dashboard): parse sprint depends_on and derive phase-level dependsOn in scanner.js
  - 35f9340 feat(dashboard): add PhaseGraph SVG component to RoadmapView with wave-based layout
  - 46a4e09 feat(dashboard): add design-token CSS for phase dependency graph
  - 85f4542 fix(dashboard): handle both NN.S and NN-S sprint ID formats in phase dependsOn derivation
key-files:
  - server/lib/scanner.js
  - server/lib/html/client/views/RoadmapView.js
  - server/lib/html/css.js
---

## What was built

Sprint 37.1 delivers DSH-6: a hand-rolled inline-SVG dependency graph in the Roadmap view.

### Task 37.1.1 — scanner.js depends_on parsing

Added `parseYamlList(text, key)` helper that handles both inline YAML arrays (`key: [a, b]`) and block list format (`key:\n  - a`). In `buildPhaseTree`, each sprint object now carries a `dependsOn` array extracted from its SPRINT.md frontmatter. Phase-level `dependsOn` is derived by aggregating sprint entries, extracting the leading integer to get the dependency phase ID, and dropping sibling-sprint self-references.

One deviation from the spec: the actual sprint IDs in this codebase use `NN-S` (dash) format rather than the spec's stated `NN.S` (dot) format. The extractor uses a leading-integer regex (`/^(\d+)/`) to handle both forms correctly.

Verification: all 18 phaseTree entries carry `dependsOn: []` (no cross-phase dependencies exist in this project — all sprint depends_on entries reference siblings within the same phase).

### Task 37.1.2 — PhaseGraph Preact/SVG component

Added `computeWaves(phases)` (iterative wave assignment, cycle-safe) and `PhaseGraph({ phases })` components to RoadmapView.js. Layout uses plain arithmetic: columns at `24 + wave * 200`, rows at `24 + index * 72`. Nodes are `168×52` rounded rects. Edges are cubic bezier `<path>` elements with an arrowhead `<marker>`. PhaseGraph is rendered inside a `<details open>` element between view-title and filter-bar. No graph library — pure inline SVG.

### Task 37.1.3 — CSS design tokens

Appended a `/* ── Phase dependency graph ── */` block to css.js using only existing tokens: `--bg-elev-2`, `--border`, `--accent-green`, `--accent-amber`, `--accent-blue`, `--text-tertiary`, `--text-primary`, `--text-secondary`, `--text-xs`, `--bg-hover`, `--space-4`.

## Verification results

- `node --check server/lib/scanner.js` — pass
- `node --input-type=module --check < server/lib/html/client/views/RoadmapView.js` — pass
- `node --check server/lib/html/css.js` — pass
- `curl localhost:7717` boots cleanly — pass
- No xyflow/dagre/d3 imports anywhere in client — pass
- All 18 phaseTree entries carry `Array.isArray(p.dependsOn) === true` — pass
