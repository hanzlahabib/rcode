# Code Quality Audit — rcode v4.0.0

_Scope: `cli/`, `server/`, `rcode/bin/`, `.rcode/bin/lib/` — excludes `dist/rcode.js`_

---

## Summary

| Check | Count | Status |
|---|---|---|
| Files >1000 lines (violation) | 4 | POOR |
| Files >600 lines (warning) | 6 | NEEDS-WORK |
| TODO/FIXME/XXX/HACK | 1 | PASS |
| `console.log` in prod paths | 605 | POOR |
| `var` declarations | 1 | PASS |
| `Object.assign({}, x)` (stale clone pattern) | 5 | NEEDS-WORK |
| `.indexOf()` for membership checks | 39 | NEEDS-WORK |
| Callback `.then()/.catch()` chains | ~15 sites | NEEDS-WORK |
| Functions >100 lines | 13 | POOR |

---

## Top Offenders

### `rcode/bin/rcode-tools.cjs` — 7,366 lines (VIOLATION)

Worst file in the project by a wide margin. Contains 95+ top-level function declarations and multiple monster functions:

- `cmdState()` — **2,310 lines** (single function, spans ~24% of the file)
- `cmdPhase()` — 598 lines
- `cmdProgress()` — 425 lines
- `async main()` — 476 lines
- `cmdBrain()` — 317 lines

**Recommendation:** Split into feature-cohesive modules: `cmd-state.cjs`, `cmd-phase.cjs`, `cmd-progress.cjs`, `cmd-init.cjs`, `main.cjs`. Each should be under 500 lines.

---

### `cli/install.js` — 2,988 lines (VIOLATION)

- `installInner()` — 400-line async function
- 128 `console.log` calls (highest in repo)
- Heavy use of `.indexOf()` for string searching (could use `.includes()`)

**Recommendation:** Extract file-template helpers, platform detection, and validation into separate modules under `cli/lib/`. Target: ≤4 files of ≤700 lines each.

---

### `server/lib/html/css.js` — 2,284 lines (VIOLATION)

- `renderCss()` — single function spanning the entire file (2,279 lines)
- Pure data/template: the whole file is one function returning a CSS string

**Recommendation:** Split into logical CSS sections (base, layout, components, themes) as separate template literals, composed in an `index.js`.

---

### `cli/github-sync.js` — 1,020 lines (VIOLATION)

- Contains 4 hardcoded magic numbers: `.slice(0, 60000)` repeated at lines 691, 772, 892, 937 — no named constant
- `async main()` spans 219 lines

**Recommendation:** Extract `MAX_BODY_CHARS = 60_000` constant. Split GitHub API calls from orchestration logic.

---

### `server/lib/html/client/util.js` — uses `Object.assign({}, ...)` (pattern violations)

Lines 43 and 55 use `Object.assign({}, s, {...})` for shallow clones. Modern idiom is spread: `{ ...s, phaseId: p.id }`.

Same pattern at `server/lib/html/client/views/PhasesView.js:105`, `SprintsView.js:32`, `rcode/bin/rcode-tools.cjs:2774`.

---

### `server/lib/html/client/orchestrator.js` — callback `.then()` chains

Lines 32–77: 8+ chained `.then()/.catch()` blocks on fetch calls. No `async/await` used. Modern ESM client code should prefer `async/await` for readability.

---

## Console.log Noise (605 total)

| File | Count |
|---|---|
| `cli/install.js` | 128 |
| `rcode/bin/rcode-tools.cjs` | 108 |
| `cli/uninstall.js` | 85 |
| `cli/github-sync.js` | 64 |
| `cli/update.js` | 30 |
| `cli/context.js` | 28 |
| `cli/doctor.js` | 28 |

The volume is expected for a CLI tool that communicates via stdout, but 108 bare `console.log` calls in `rcode-tools.cjs` should route through a shared `log()` helper to enable verbosity gating.

---

## Dead Code / Duplication Signals

- Magic number `60000` appears 4 times in `cli/github-sync.js` with no constant — should be `MAX_CONTENT_CHARS`.
- `cli/generate-command-skills.cjs` and `cli/lib/schemas.cjs` share identical `.indexOf('\n---\n', 4)` parsing logic — extract to shared util.
- `rcode/bin/lib/council-panel.cjs` and `.rcode/bin/lib/council-panel.cjs` are byte-for-byte duplicates (both 663 lines). One copy is likely stale.

---

## Score

| Dimension | Rating |
|---|---|
| File size discipline | POOR |
| Function size discipline | POOR |
| Console.log hygiene | POOR (volume expected for CLI, routing not gated) |
| Outdated patterns | NEEDS-WORK |
| TODO debt | PASS |
| Duplicate files | NEEDS-WORK |

**Overall: NEEDS-WORK**

The critical action is splitting `rcode/bin/rcode-tools.cjs` (7,366 lines, `cmdState` at 2,310 lines alone). Everything else is secondary.
