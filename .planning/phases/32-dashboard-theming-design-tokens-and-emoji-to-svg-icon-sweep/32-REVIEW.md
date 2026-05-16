---
status: clean
phase: 32
critical: 0
high: 0
medium: 0
low: 1
generated: 2026-05-16T01:16:36Z
resolved: 2026-05-16
---
<!-- M1, M2, L1, L3 applied. L2 (18 unused legacy compat tokens) deferred — pre-existing accumulation, no phase 32 mandate; tracked for a future housekeeping sprint. -->

# Phase 32 Code Review

**Phase:** 32 — Dashboard theming — design tokens and emoji-to-SVG icon sweep
**Reviewer:** rihal-code-reviewer
**Branch:** 31-preact-migration
**Commit range:** a7a7ca1..HEAD (sprints 32.1–32.3)

---

## Pattern Check

Icons-to-SVG sweep follows the existing `Icon` Preact component pattern established before phase 32. Token additions extend the existing `:root` block consistently. Commit messages are conventional-commit formatted, no AI attribution found. `dashboard.js` is untouched across all phase 32 commits (confirmed via `git log a7a7ca1..HEAD -- server/dashboard.js`).

---

## Risk Assessment

No breakage-class bugs found. Theme toggle logic (`App.js:96–99`) correctly reads from `theme` state (not the DOM attribute as the old code did), closes over the current value via `useCallback`, and the `setAttribute('data-theme', next === 'dark' ? '' : next)` pattern correctly removes the attribute for dark mode (CSS defaults are dark). The state→prop→Topbar flow is intact.

SSE classifier characters (`⚙ ⚠ ✗ ✅ ▶ ◉ ■`) in `OrchPanel.js:136–147` are string comparisons only — not rendered as UI icons. Correct.

`XtermPanel.js:216` `⛶ Full` label is U+26F6, not in the emoji scan range, pre-existing, and intentionally preserved. `OrchPanel.js:282` `■ Stop` and `OrchPanel.js:264` `✎` are U+25A0 / U+270E — typographic, not emoji, all pre-existing.

---

## Icon Sync Verification

`icons.js` and `icons-client.js`: **35 icons each, zero divergence.** Every key and every SVG path string matched exactly (automated diff). All icons use `stroke="currentColor"` / `fill="none"` at the `<svg>` wrapper level (`icons.js:63–65`, `icons-client.js:72–83`). No hardcoded color values in any icon path data.

---

## Findings

### Medium

**M1 — `server/lib/html/css.js:270,285,300` — Intentional rgba exemptions lack inline documentation**

The sprint 32.1 SUMMARY states: *"Documented intentional rgba exceptions (not tokenized by design): rgba(0,0,0,0.5) in #sidebar-backdrop — one-off overlay tint; rgba(8,9,10,0.8) in header — frosted glass tied to --bg-page exact value; rgba(245,245,247,0.85) in [data-theme="light"] header — light frosted glass."*

None of these three comments appear in `css.js`. The file has the rgba values at lines 270, 285, and 300 but no explanatory comment beside them. A future developer running a token audit will flag all three as untokenized literals without understanding why. The SUMMARY documents intent that the code does not reflect.

Recommended fix: Add a one-line comment to each rule body explaining the exemption, matching what the SUMMARY already states. Example:

```css
/* rgba — intentional: one-off overlay tint, not a theme color */
background: rgba(0,0,0,0.5);
```

---

**M2 — `server/lib/html/client/components/Topbar.js:21,40` — Pre-existing inline `style=` attributes with hardcoded literals, not remediated during phase 32 touch**

`CLAUDE.md` mandates: *"NEVER use Style Attribute — use regular className and css classes and tailwind declarations instead."*

Line 21: `<div style="display:flex;align-items:center;gap:12px;">` — hardcoded `gap:12px` is not a token reference; CSS class `.brand-wrapper` or similar would be correct.

Line 40: `<span id="updated-ago" style="font-size:11px;color:var(--text-muted);">` — `font-size:11px` is a raw literal; the codebase has `--text-2xs` for 10px text. Neither is a phase 32 introduction, but phase 32 modified `Topbar.js` (adding the Icon import and sweeping emoji) without remediating these two violations that were already present. Per `read-existing-first`: a touch to a file that contains a known violation is the right moment to remediate.

Recommended fix: Extract to a dedicated CSS class in `css.js` (e.g. `.topbar-start-group` for line 21, `.updated-ago` for line 40) and use `class=` in `Topbar.js`.

---

### Low

**L1 — `server/lib/html/client/components/Topbar.js:42` — Theme icon convention is "next state", not "current state" — undocumented**

`name=${themeLabel === 'light' ? 'moon' : 'sun'}`: when the UI is in dark mode (`themeLabel === 'dark'`) the icon displayed is `sun`, meaning "clicking will switch to light". This is the "show target state" convention rather than the more common "show current state" convention (where dark mode would show a moon). The choice is defensible but undocumented. A maintainer adding a tooltip or screen reader label six months from now will assume the opposite convention.

Recommended fix: Add a one-line comment above the button explaining the convention. No behaviour change needed.

---

**L2 — `server/lib/html/css.js` — 18 tokens defined in `:root` are never consumed via `var()`**

The following tokens are defined but have zero `var(--x)` references anywhere in `css.js`:

```
accent-red, bg, bg-card, border, ease-in, orange, radius-lg, radius-md,
radius-sm, shadow-focus, shadow-md, shadow-modal, shadow-sm, space-9,
t-view, text-2xl, text-on-accent, -spacing
```

None of these were added by phase 32 (the three new tokens — `--text-stat`, `--h-header-btn`, `--size-icon-btn` — are all correctly consumed). This is pre-existing dead-token accumulation. The legacy compat aliases (`--bg`, `--bg-card`, `--border`, `--radius-*`, `--accent-red`) were likely added during a naming migration and are candidates for removal. The shadow and `text-on-accent` tokens suggest planned but never-implemented usage.

Phase 32 had no mandate to clean these up, so this is informational. A future housekeeping sprint should prune or document these.

---

**L3 — `server/lib/html/client/components/OrchPanel.js:219,280,285,286` — Pre-existing inline `style=` attributes not remediated**

Same class of violation as M2. Four `style=` occurrences in OrchPanel: `padding:6px 8px;font-size:11px;color:var(--text-muted)` (line 219), conditional `display:none` (line 280), `flex:1` (line 285), `font-size:11px;color:var(--text-muted)` (line 286). Phase 32 touched `OrchPanel.js` for the emoji sweep without addressing these. Lower severity than M2 because OrchPanel is a more complex overlay component and the `display:none` toggle (line 280) would require a CSS class approach with state awareness.

---

## Test Coverage

Sprint verification was automated only against `node --check` (syntax), icon count assertions, and a Unicode scan. No unit or integration tests exist for the theme persistence logic or the SSE classifier character behaviour. This is pre-existing test debt, not introduced by phase 32, and the dashboard has no test harness at all. Out of scope for this review but worth tracking.

Human checkpoint steps in 32.1.3, 32.2.7, and 32.3.5 serve as the acceptance gate. Per the SUMMARY files, all three remain pending human verification at `http://localhost:7717`.

---

## Maintainability Notes

The two-file duplication in `icons.js` / `icons-client.js` is correctly documented with sync warnings at the top of each file. The no-build-step constraint makes this unavoidable and the comment is sufficient. No 6-month curse risk here as long as the sync warnings are not removed.

The `CLAUDE.md` exemption comment at line 1 of `css.js` correctly documents the file-size exception. The file is at 2219 lines and growing; a separate sprint to split it into `css-base.js`, `css-views.js`, and `css-components.js` would make audits easier but is not required by any current rule.

---

## Required Fixes

2 findings require action before phase 32 is considered complete:

1. **M1** — Add inline exemption comments to the three `rgba` literals in `css.js` at lines 270, 285, and 300.
2. **M2** — Either: (a) extract the two `Topbar.js` `style=` occurrences to CSS classes, or (b) file a tracked GitHub issue and merge the deferred fix into a follow-up phase. The current state leaves a CLAUDE.md violation in a file that was modified in this phase.

---

## Optional Improvements

- **L1**: Document theme icon convention with a one-line comment in `Topbar.js`.
- **L2**: Audit and prune the 18 unused legacy compat tokens in `css.js` `:root`.
- **L3**: File a tracking issue for the `OrchPanel.js` `style=` removals.
