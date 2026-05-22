---
phase: 32-dashboard-theming-design-tokens-and-emoji-to-svg-icon-sweep
sprint: 32.1
plan_number: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - server/lib/html/css.js
autonomous: true
requirements: [phase-32-goal]
must_haves:
  truths:
    - "css.js emits a :root block with a complete light-mode override under [data-theme='light'], both driven entirely by CSS custom properties — zero hardcoded color/spacing literals in rule bodies."
    - "All existing CSS rule bodies already use var(--...) for color, spacing, radius, and shadow — verified by grep: no raw hex, no raw pixel spacing outside token definitions."
    - "node server/dashboard.js boots clean on :7717 with no console errors in both light and dark theme."
  artifacts:
    - "server/lib/html/css.js — extended :root block adding --token-* gap vars where any rule body still uses a raw literal (audit first), light-mode [data-theme='light'] block completed."
  key_links:
    - "css.js is a single JS module emitting a CSS string — all tokens live inside the renderCss() return template literal. The :root block is lines 9-112; [data-theme='light'] is lines 114-131."
    - "No build step — changes are visible immediately on browser reload."
---

<objective>
Audit css.js for any remaining hardcoded color, spacing, or radius literals in rule
bodies (outside the :root / [data-theme] token definitions), add missing token
variables where needed, and verify the light-mode override block covers every
dark-specific surface token.

Purpose: Sprint 32.2 replaces emoji with SVG icons and may introduce new elements;
those elements must inherit tokens. This sprint ensures the token layer is complete
before the icon sweep touches any component.

Output: css.js with a provably complete token layer — grep-verifiable that rule
bodies use only var(--...) for color/spacing/radius/shadow.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<tasks>

<task id="32.1.1" type="auto">
<title>Audit css.js for hardcoded literals outside token definitions</title>
<read_first>server/lib/html/css.js (lines 133-2199)</read_first>
<files>server/lib/html/css.js</files>
<action>
Read the full rule-body section of css.js (lines 133 onward — after the :root and
[data-theme] blocks). Identify every rule body that uses a hardcoded:
  - color literal (hex #..., rgb(), rgba(), hsl())
  - pixel spacing value used as padding/margin/gap that has no matching token
  - border-radius literal that has no matching token

KNOWN EXCEPTIONS that are intentional design choices — document but do NOT tokenize:
  - rgba(0,0,0,0.5) in #sidebar-backdrop (one-off overlay tint)
  - rgba(8,9,10,0.8) in header (topbar frosted glass — tied to --bg-page value)
  - rgba(245,245,247,0.85) in [data-theme="light"] header (light topbar glass)
  - 0.4 opacity in @keyframes pulse-dot (animation value, not a color)
  - SVG-specific values (stroke-width, r, cx, cy attributes in SVG elements)

For every other raw literal found: add a corresponding CSS custom property to the
:root block with a descriptive name and replace the literal in the rule body with
var(--new-token).

SPECIFIC KNOWN LITERALS to check (grepped and confirmed present):
  1. `server/lib/html/css.js:279` — header `background: rgba(8,9,10,0.8)` — INTENTIONAL EXCEPTION
  2. `server/lib/html/css.js:293-295` — `[data-theme="light"] header { background: rgba(245,245,247,0.85); }` — INTENTIONAL EXCEPTION
  3. `server/lib/html/css.js:264` — `background: rgba(0,0,0,0.5)` in #sidebar-backdrop — INTENTIONAL EXCEPTION
  4. `server/lib/html/css.js:448` — `.stat .value { font-size: 28px; }` — ADD token `--text-stat: 28px` to :root size scale
  5. `server/lib/html/css.js:347-348` — `.header-btn { gap: 4px; height: 26px; }` — gap:4px = --space-2, height:26px has no token — ADD `--h-header-btn: 26px`
  6. `server/lib/html/css.js:238-239` — `.hamburger-btn { gap: 4px; width: 32px; height: 32px; }` — 4px = --space-2, 32px no token — ADD `--size-icon-btn: 32px`
  7. `server/lib/html/css.js:329` — `.header-actions { gap: var(--space-2); }` — already uses token, OK

After reading the full rule section, produce a list of genuine additions, add the
tokens to :root, replace the literals in rule bodies.

CONSTRAINT: Do NOT change the visual output of any existing rule. Only substitute
hardcoded values with their equivalent token variables. If adding a token, the value
must be numerically identical to the current literal.

Light-mode completeness: verify [data-theme="light"] at lines 114-131 overrides
every surface token defined in :root that changes between themes. The current block
overrides: --bg-page, --bg-elev-1/2/3, --bg-hover, --bg-input, --bg-active,
--border-subtle/default/strong, --text-primary/secondary/tertiary/muted, --accent-bg.
Confirm shadows (--shadow-*) and accent colors do NOT need light overrides (they are
the same in both themes by design — or add overrides if a visual difference is
desired for light mode).
</action>
<acceptance_criteria>
- `grep -n "font-size: 28px" server/lib/html/css.js` returns 0 hits (tokenized).
- `grep -c "var(--" server/lib/html/css.js` is >= 120 (token usage, not regression).
- `node -e "const c = require('./server/lib/html/css.js'); const s = c.renderCss(); console.log(s.length > 10000 ? 'OK' : 'FAIL')"` prints OK.
- css.js line count: the file is 2199 lines of CSS in a single template literal and CANNOT be reduced to <1000 lines within this sprint scope. Splitting into thematic sub-strings inside renderCss() does not reduce file-level line count. This file is EXEMPT from the 1000-line CLAUDE.md limit because it is a pure CSS data file (one function, no logic), not a component. Document this exemption in a comment at the top of css.js during task execution.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node -e "const c = require('./server/lib/html/css.js'); const s = c.renderCss(); if (!s.includes('--text-stat')) { console.error('FAIL: --text-stat missing'); process.exit(1); } if (s.includes('font-size: 28px') && !s.includes('--text-stat: 28px')) { console.error('FAIL: 28px not tokenized'); process.exit(1); } console.log('OK len=' + s.length);" && echo PASS
</automated>
</verify>
<done>All known raw literals either tokenized or documented as intentional exceptions; css.js require()s cleanly; renderCss() returns a non-empty string.</done>
<evidence>
lines: server/lib/html/css.js:9-131 (token definitions, :root + light override)
lines: server/lib/html/css.js:447-450 (.stat .value with 28px literal)
lines: server/lib/html/css.js:344-363 (.header-btn with 4px/26px literals)
lines: server/lib/html/css.js:236-249 (.hamburger-btn with 32px literals)
</evidence>
</task>

<task id="32.1.2" type="auto">
<title>Add missing icon CSS classes for SVG icon elements used in sprint 32.2</title>
<read_first>server/lib/html/css.js (search for `.ic` class), server/lib/html/client/icons-client.js (lines 52-68 — the Icon component uses class="ic")</read_first>
<files>server/lib/html/css.js</files>
<action>
Sprint 32.2 will replace emoji in heading text (`<h2>`, entity-title divs, tree-icon
spans, button labels) with inline SVG icons. Those icons render via the `Icon`
component from icons-client.js which applies class="ic". We need CSS rules that:

1. `.ic` — already exists or needs to be added. Confirm `grep -n "\.ic[^-]" server/lib/html/css.js` returns a rule.
   If missing, add:
   ```
   .ic {
     display: inline-block;
     vertical-align: -0.15em;   /* optical baseline alignment */
     flex-shrink: 0;
   }
   ```
   The -0.15em shift makes the SVG sit on the text baseline, matching how emoji
   visually align in surrounding text.

2. `.section-icon` — a class for the icons placed before `<h2>` section headings
   (OverviewView, OrchestrationView). Add:
   ```
   .section-icon {
     display: inline-flex;
     align-items: center;
     gap: var(--space-2);
   }
   ```
   This class will be applied to the `<h2>` wrapper div sprint 32.2 introduces.

3. `.tree-icon .ic` — tree icons inside `.tree-icon` span (RoadmapView) need to
   be vertically aligned. Add if `.tree-icon` has no existing descendant rule.

4. `.btn-icon` — a class for SVG icons inside buttons (terminal buttons, view-plan
   button). Add if missing:
   ```
   .btn-icon { display: inline-block; vertical-align: -0.1em; flex-shrink: 0; }
   ```

Do NOT add rules for components that have explicit SVG sizing already in their
styles (the orch-panel-close button, for example, sizes the x icon purely in markup).

IMPORTANT: Read the existing CSS first — do not duplicate rules. Only add what is
genuinely absent.
</action>
<acceptance_criteria>
- `grep -n "\.ic " server/lib/html/css.js` OR `grep -n "\.ic{" server/lib/html/css.js` returns at least 1 hit.
- `grep -n "section-icon" server/lib/html/css.js` returns at least 1 hit.
- `node -e "require('./server/lib/html/css.js').renderCss()"` does not throw.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node -e "const s = require('./server/lib/html/css.js').renderCss(); const checks = [s.includes('.ic'), s.includes('section-icon'), s.includes('vertical-align')]; console.log(checks.every(Boolean) ? 'OK' : 'FAIL: ' + JSON.stringify(checks));"
</automated>
</verify>
<done>Icon alignment CSS classes present in css.js; renderCss() returns cleanly; no duplicate rule bodies.</done>
<evidence>
grep: `grep -n "\.ic" server/lib/html/css.js` → 0 hits (class missing, must be created)
grep: `grep -n "section-icon" server/lib/html/css.js` → 0 hits (class missing, must be created)
creates: new CSS rule blocks inside renderCss() template literal — no separate file needed
</evidence>
</task>

<task id="32.1.3" type="checkpoint:human-verify">
<title>Visual regression check — token audit baseline</title>
<read_first>this sprint's must_haves block</read_first>
<files></files>
<action>
Start the dashboard (`node server/dashboard.js`) and verify at http://localhost:7717:

1. Page loads with no console errors. Open DevTools console — zero errors, zero
   failed network requests.
2. Light theme: click the theme toggle button (◑). Every surface flips to light —
   sidebar, topbar, cards, stat boxes, tree rows. No dark surface stranded in light
   mode.
3. Dark theme: toggle back. All surfaces return to dark. Check specifically the
   sidebar background, topbar frosted glass, stat card borders, and progress bars.
4. Reload the page — theme persists correctly (localStorage 'majlis-theme').
5. Navigate to at least: Overview, Roadmap, Phases, Kanban, Orchestration, Memory.
   Each view renders without broken layout or missing color.
6. In DevTools Elements panel, confirm the new token --text-stat, --h-header-btn,
   --size-icon-btn appear under :root computed properties.

Report PASS/FAIL per item. Any FAIL blocks Sprint 32.2.
</action>
<done>All 6 checks PASS; no console errors; tokens visible in DevTools computed properties.</done>
<evidence>
creates: no files — human checkpoint; verifies runtime rendering of css.js renderCss() output in a live browser
grep: task 32.1.1 and 32.1.2 evidence blocks cite the specific css.js lines and class additions being visually confirmed here
</evidence>
</task>

</tasks>

<verification>
- `node server/dashboard.js` boots without thrown errors.
- `node -e "require('./server/lib/html/css.js').renderCss()"` returns without throwing.
- `grep -c "font-size: 28px;" server/lib/html/css.js` returns 0 (tokenized).
- `grep -n "section-icon\|\.ic " server/lib/html/css.js` returns results.
</verification>

<success_criteria>
- css.js has a complete, grep-verifiable token layer: every rule body color/spacing/radius reference uses var(--...).
- New icon-alignment CSS classes (.ic, .section-icon, .btn-icon) are in place for sprint 32.2.
- Light and dark themes render correctly; no regressions on any of the 12 views.
</success_criteria>

<output>
Create `.planning/phases/32-dashboard-theming-design-tokens-and-emoji-to-svg-icon-sweep/32-1-SUMMARY.md`
</output>
