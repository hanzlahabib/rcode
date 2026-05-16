# Execution Summary

**Phase:** 32 — Dashboard theming — design tokens and emoji-to-SVG icon sweep
**Sprint:** 32.1 — Token layer audit and icon alignment CSS
**Completed:** 2026-05-16
**Executor:** Claude Sonnet 4.6 (sequential executor)

## What Was Built

Completed the CSS design token layer in `server/lib/html/css.js` by tokenizing the
three known hardcoded literals in rule bodies and adding icon alignment helper classes
needed by sprint 32.2's emoji-to-SVG sweep.

## Stories Completed

| ID | Title | Status |
|----|-------|--------|
| 32.1.1 | Audit css.js for hardcoded literals outside token definitions | done |
| 32.1.2 | Add missing icon CSS classes for SVG icon elements used in sprint 32.2 | done |
| 32.1.3 | Visual regression check — token audit baseline | checkpoint (human verify) |

## Files Modified

| File | Change |
|------|--------|
| `server/lib/html/css.js` | Added exemption comment, 3 new tokens in :root, tokenized 3 literal values in rule bodies, added 4 icon alignment CSS classes |
| `.planning/ROADMAP.md` | Updated Phase 32 status to in-progress with plan list |
| `.planning/STATE.md` | Moved current phase to 32; added phase 32 to M2 table |

## Changes in Detail

### Task 32.1.1 — token layer audit

Added to `:root`:
- `--text-stat: 28px` — stat card value large numeral
- `--h-header-btn: 26px` — topbar button height
- `--size-icon-btn: 32px` — square icon button (hamburger)

Tokenized in rule bodies:
- `.stat .value { font-size: 28px }` → `font-size: var(--text-stat)`
- `.header-btn { gap: 4px; height: 26px }` → `gap: var(--space-2); height: var(--h-header-btn)`
- `.hamburger-btn { gap: 4px; width: 32px; height: 32px }` → token equivalents

Documented intentional rgba exceptions (not tokenized by design):
- `rgba(0,0,0,0.5)` in `#sidebar-backdrop` — one-off overlay tint
- `rgba(8,9,10,0.8)` in `header` — frosted glass tied to --bg-page exact value
- `rgba(245,245,247,0.85)` in `[data-theme="light"] header` — light frosted glass
- `0.4` in `@keyframes pulse-dot` — animation opacity, not a color

Added CLAUDE.md exemption comment at line 1 of css.js (pure CSS data file, exempt
from 1000-line limit).

### Task 32.1.2 — icon alignment CSS classes

Added four CSS rules near end of css.js before the scrollbar block:
- `.ic` — `inline-block; vertical-align: -0.15em; flex-shrink: 0` (baseline alignment)
- `.btn-icon` — `inline-block; vertical-align: -0.1em; flex-shrink: 0`
- `.section-icon` — `inline-flex; align-items: center; gap: var(--space-2)`
- `.tree-icon .ic` — `vertical-align: -0.15em`

## Deviations from Plan

None. All KNOWN EXCEPTIONS from the plan were confirmed present and left as-is.
The sprint-check verdict (pass-with-cautions) had already fixed plan issues in-plan.

## Blockers Encountered

None.

## Verification

- [x] `node -e "require('./server/lib/html/css.js').renderCss()"` — no throw, len=58380+
- [x] `grep -c "font-size: 28px;" server/lib/html/css.js` — 0 hits (tokenized)
- [x] `--text-stat`, `--h-header-btn`, `--size-icon-btn` present in :root
- [x] `var(-- count: 845` (>= 120 required)
- [x] `.ic`, `section-icon`, `vertical-align` all present in renderCss() output
- [ ] Visual regression check (32.1.3) — pending human verify at http://localhost:7717

## Next Steps

Sprint 32.2 — Emoji-to-SVG icon sweep. Replaces all emoji-as-icon usage in Preact
component files with inline SVG icons from `icons.js` / `icons-client.js`. The icon
alignment classes added in this sprint will be consumed immediately.

Human must complete checkpoint 32.1.3 visual verify first:
1. Start dashboard: `node server/dashboard.js`
2. Visit http://localhost:7717
3. Check console for zero errors
4. Toggle light/dark theme; verify all surfaces flip correctly
5. Confirm new tokens (--text-stat, --h-header-btn, --size-icon-btn) visible in
   DevTools :root computed properties
6. Navigate to Overview, Roadmap, Phases, Kanban, Orchestration, Memory views

Report PASS/FAIL per step. Any FAIL blocks sprint 32.2.
