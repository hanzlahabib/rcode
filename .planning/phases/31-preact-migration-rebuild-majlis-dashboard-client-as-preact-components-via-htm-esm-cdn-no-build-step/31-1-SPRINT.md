---
phase: 31-preact-migration
sprint: 31.1
plan_number: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - server/dashboard.js
  - server/lib/html/client.js
  - server/lib/html/shell.js
  - server/lib/html/icons.js
  - server/lib/html/client/app.js
  - server/lib/html/client/preact.js
  - server/lib/html/client/store.js
  - server/lib/html/client/util.js
  - server/lib/html/client/components/Sidebar.js
  - server/lib/html/client/components/Topbar.js
  - server/lib/html/client/components/App.js
  - server/lib/html/client/views/OverviewView.js
  - server/lib/html/client/views/DecisionsView.js
autonomous: true
requirements: [phase-31-goal]
must_haves:
  truths:
    - "Dashboard loads at http://localhost:7717 with no console errors; the page renders via Preact, not server string-concat views."
    - "Sidebar nav uses SVG icons from icons.js — no emoji glyphs in the nav buttons."
    - "Hash routing works: clicking nav links and reloading on #roadmap keeps the correct view active."
    - "Theme toggle, sidebar collapse, manual refresh, and 30s auto-refresh still work."
  artifacts:
    - "server/lib/html/client/preact.js — single ESM module re-exporting h, render, html (htm bound), hooks."
    - "server/lib/html/client/store.js — shared reactive state holder seeded from window.__S__."
    - "server/lib/html/client/components/App.js — root component owning router + layout."
    - "server/lib/html/icons.js exports an ESM-importable Icon helper / ICONS map for the client."
  key_links:
    - "dashboard.js /js/ route must serve nested paths (components/, views/) — current regex only allows flat names."
    - "client.js must emit <script type=module> for the entry, and inject window.__S__ + window.__ICONS__ before it."
    - "esm.sh imports (preact, preact/hooks, htm) must be pinned to exact versions for cache stability."
---

<objective>
Stand up the Preact + htm runtime with no build step, convert the dashboard shell
(sidebar, topbar, routing, refresh) to components, wire icons.js into the client,
and migrate two simple views (Overview, Decisions) to establish the component
pattern every later sprint copies.

Purpose: every later sprint depends on the module loader, the store, the router,
and the icon helper existing. This sprint is the foundation — nothing else can
start until `/js/` serves nested ESM modules and the App root renders.

Output: a working Preact dashboard with 2 of 12 views migrated; the other 10
still render via the legacy string-concat modules loaded alongside (coexistence
is intentional and temporary — Sprint 31.4 deletes the dead code).
</objective>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<current_state_evidence>
- `server/dashboard.js:105-118` — `/js/` route: `name` matched against `/^[\w.-]+\.js$/` which REJECTS `components/Sidebar.js` (the `/` fails the charset). Must be widened to allow one subdirectory while still blocking `..` traversal.
- `server/lib/html/client.js:38` — `MODULES = ['client-render.js','client-kanban.js','client-main.js']`; `:41-42` emits plain `<script src>` tags (no `type=module`).
- `server/lib/html/shell.js:62` — sets `window.__ORCH_TOKEN__`; there is NO `window.__ICONS__` assignment anywhere (`rg __ICONS__ server` → 0 hits). icons.js comment at `:5` claims it is "embedded as window.__ICONS__" but that wiring was never done.
- `server/lib/html/shell.js:75-93` — sidebar nav: 12 `<button class="nav-link" data-view="...">` each prefixed with an emoji (🏠 ⚡ 🗺 🎯 📋 ⚡ ✓ 🗂 📄 🤝 ⚖ 🧠).
- `server/lib/html/client/client-main.js:43-82` — `route()` hash router, 12 view dispatch; `:191-193` hashchange + nav-link listeners; `:304-348` refresh logic; `:407-422` theme toggle; `:434-448` sidebar toggle.
- `server/lib/html/client/client-render.js:245-345` — `renderOverview()`; `client-main.js:146-189` — `renderDecisions()`.
- icons.js exports `{ ICONS, icon }` via CommonJS `module.exports` (`icons.js:45`) — it is consumed server-side only today.
</current_state_evidence>

<tasks>

<task id="31.1.1" type="auto">
<title>Widen /js/ static route to serve nested ESM modules</title>
<read_first>server/dashboard.js (lines 105-118)</read_first>
<files>server/dashboard.js</files>
<action>
The `/js/` handler currently extracts `name` and tests it against `/^[\w.-]+\.js$/`,
which blocks any path with a `/` — so `components/App.js` 404s. Widen it to allow
exactly one optional subdirectory segment while still rejecting traversal:
- Accept names matching `/^(?:[\w.-]+\/)?[\w.-]+\.js$/`.
- After matching, additionally reject if the resolved absolute path is not inside
  `CLIENT_DIR` (use `path.resolve` + `startsWith(CLIENT_DIR + path.sep)`) — defense
  in depth against `.` / encoded traversal even though the regex blocks `..`.
- Keep the `Content-Type: application/javascript` header and `no-cache`.
Do NOT add directory listing, do NOT add new routes. This is the only change to
dashboard.js in this sprint.
</action>
<acceptance_criteria>
- `grep -n "components" server/dashboard.js` shows the widened regex OR a comment; the regex literal allows a `/`.
- `grep -n "path.resolve" server/dashboard.js` shows the containment check.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && mkdir -p server/lib/html/client/components && printf 'export const x=1;' > server/lib/html/client/components/_probe.js && node -e "const s=require('http');const srv=require('child_process').spawn('node',['server/dashboard.js'],{stdio:'ignore'});setTimeout(()=>{s.get('http://127.0.0.1:7717/js/components/_probe.js',r=>{console.log('nested',r.statusCode);s.get('http://127.0.0.1:7717/js/..%2f..%2fdashboard.js',r2=>{console.log('traversal',r2.statusCode);srv.kill();process.exit(r.statusCode===200&&r2.statusCode!==200?0:1);});});},1500);" ; rm -f server/lib/html/client/components/_probe.js
</automated>
</verify>
<done>Nested module path returns 200; traversal attempt returns non-200; dashboard boots clean.</done>
</task>

<task id="31.1.2" type="auto">
<title>Add Preact/htm ESM runtime module + make icons.js dual-mode</title>
<read_first>server/lib/html/icons.js (full), server/lib/html/client.js (full)</read_first>
<files>
server/lib/html/client/preact.js (create)
server/lib/html/icons.js
</files>
<action>
1. Create `server/lib/html/client/preact.js` — the single dependency surface so
   esm.sh versions are pinned in ONE place. It imports from exact-pinned URLs and
   re-exports:
   `import { h, render } from 'https://esm.sh/preact@10.24.3';`
   `import { useState, useEffect, useRef, useMemo, useCallback } from 'https://esm.sh/preact@10.24.3/hooks';`
   `import htmlib from 'https://esm.sh/htm@3.1.1';`
   `export const html = htmlib.bind(h); export { h, render, useState, useEffect, useRef, useMemo, useCallback };`
   (Verify the current stable versions via Context7 / esm.sh before pinning — do
   not guess; pin whatever is current and stable.)
2. Make `icons.js` consumable from BOTH the Node server and the browser without a
   build step. It currently uses `module.exports` (CommonJS). Keep the existing
   `ICONS` map and `icon()` exactly as-is for the server. Add a SECOND tiny client
   file `server/lib/html/client/icons-client.js` that contains the same `ICONS`
   object literal and an `Icon` Preact component (`html` from preact.js) rendering
   the inline `<svg>`. Do NOT delete or rewrite the server icons.js — duplicating
   the data map (one CJS, one ESM) is the no-build-step cost; add a comment in both
   files cross-referencing each other so they stay in sync.
   Rationale: a CJS file cannot be `import`ed as ESM by the browser, and converting
   icons.js to ESM would break its server-side `require()` consumers in shell.js.
</action>
<acceptance_criteria>
- `grep -n "esm.sh/preact@" server/lib/html/client/preact.js` shows a pinned version (has `@`).
- `grep -n "esm.sh/htm@" server/lib/html/client/preact.js` shows a pinned htm version.
- `grep -c "export" server/lib/html/client/preact.js` is >= 2.
- `server/lib/html/client/icons-client.js` exists and `grep -n "export" server/lib/html/client/icons-client.js` shows an export of `ICONS` and `Icon`.
- `grep -n "in sync\|cross-ref\|icons-client" server/lib/html/icons.js` shows the sync comment.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/preact.js && node --check server/lib/html/client/icons-client.js && node -e "require('./server/lib/html/icons.js')" && for u in $(grep -oE 'https://esm.sh/[^'"'"'\"]+' server/lib/html/client/preact.js); do code=$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 15 "$u"); echo "$u -> $code"; [ "$code" = "200" ] || exit 1; done && echo OK
</automated>
</verify>
<done>preact.js and icons-client.js parse as valid JS; server icons.js still require()s cleanly; every pinned esm.sh URL returns HTTP 200 (a bad version pin fails here, not at the human checkpoint).</done>
</task>

<task id="31.1.3" type="auto">
<title>Build the reactive store + shared client utilities</title>
<read_first>server/lib/html/client.js (lines 16-34 — clientState fields), server/lib/html/client/client-render.js (lines 4-22 — esc/pct/dateStr helpers), server/lib/html/client/client-main.js (lines 304-348 — refresh)</read_first>
<files>
server/lib/html/client/store.js (create)
server/lib/html/client/util.js (create)
</files>
<action>
1. `store.js`: a minimal observable store — NOT a framework. Hold the scanned
   state. Seed from `window.__S__` (the exact field set client.js injects:
   `phases, milestone, currentPhase, currentSprint, decisions, blockers,
   council_sessions, last_session, chains, workstreams, pendingHandoff,
   memoryBank`). Also hold `activeSessions` (live orchestrator sessions, empty
   array initially). Expose: `getState()`, `setState(patch)`, `subscribe(fn)`.
   Provide a `useStore()` hook (in this file, importing hooks from preact.js)
   that subscribes a component and returns current state.
   `setState` shallow-merges and notifies subscribers.
2. `util.js`: port the pure helpers used across render functions so components
   share one copy. Port verbatim (same logic) from client-render.js:
   `esc`, `pct`, `pctNum`, `dateStr`, `humanDate`, `allSprints`, `allTasks`.
   `allSprints/allTasks` must take `phases` as an argument (no module-global
   `_phases`). Add `chip(status)` returning `{ cls, label }` (NOT an HTML string —
   components render it). Export all as ESM named exports.
Do NOT port string-returning HTML helpers (progressBar, completionRing, runBtn) —
those become components in later tasks.
</action>
<acceptance_criteria>
- `grep -n "window.__S__" server/lib/html/client/store.js` shows the seed.
- `grep -n "subscribe\|setState\|getState\|useStore" server/lib/html/client/store.js` shows all four.
- `grep -n "export" server/lib/html/client/util.js` lists esc, pct, humanDate, allSprints, allTasks, chip.
- `grep -n "_phases" server/lib/html/client/util.js` returns nothing (no module-global).
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/store.js && node --check server/lib/html/client/util.js && echo OK
</automated>
</verify>
<done>Both modules parse cleanly; util has no module-global phase state.</done>
</task>

<task id="31.1.4" type="auto">
<title>App root, Sidebar, Topbar components + hash router</title>
<read_first>server/lib/html/shell.js (lines 67-130 — sidebar+topbar markup), server/lib/html/client/client-main.js (lines 43-82 routing, 191-193 listeners, 304-348 refresh, 407-448 theme/sidebar)</read_first>
<files>
server/lib/html/client/components/App.js (create)
server/lib/html/client/components/Sidebar.js (create)
server/lib/html/client/components/Topbar.js (create)
server/lib/html/client/app.js (create)
</files>
<action>
1. `Sidebar.js`: render the project label + 3 nav sections + 12 nav-link buttons.
   Reuse the EXACT existing CSS classes (`sidebar`, `nav-section`, `nav-link`,
   `data-view`) from css.js — do not invent classes. Replace each emoji with the
   matching icon from icons-client.js (`home, activity, map, target, layers, zap,
   checkSquare, kanban, file, users, scale, database` — these names already exist
   in icons.js:10-32). Active nav link gets the `active` class when its `data-view`
   equals the current route. Clicking sets `location.hash`.
2. `Topbar.js`: render the brand, live dot, updated-ago text, Refresh / theme /
   copy-link buttons. Wire Refresh to a `refresh()` prop, theme button to a
   `toggleTheme()` prop. Keep existing classes (`header-actions`, `header-btn`,
   `live`, `hamburger-btn`).
3. `App.js`: root component. Owns:
   - hash router: a `useState` for the current `[view, subId]`, a `useEffect`
     adding a `hashchange` listener (port `route()` parse logic from
     client-main.js:45-49 — split on first `/`).
   - layout: `<Sidebar>` + content area with `<Topbar>` + the active view.
   - view dispatch: a map `{ overview: OverviewView, decisions: DecisionsView }`
     for migrated views; for the 10 not-yet-migrated views, render a placeholder
     `<div id="view-${view}" class="view active">` so the LEGACY client modules
     (still loaded) can fill it. Unknown hash → overview (port the #263 fallback).
   - 30s auto-refresh: `useEffect` with `setInterval` calling `/api/state`,
     diffing `lastScanned`, calling `store.setState` on change (port
     client-main.js:341-347 logic).
   - theme: port toggleTheme + the saved-theme boot from client-main.js:407-422.
4. `app.js`: the ESM entry. `import { render } from './preact.js'`, import App,
   `render(html\`<${App}/>\`, document.getElementById('app-root'))`.
NOTE: shell.js must provide an `<div id="app-root">` mount — that change is task
31.1.5. For now App renders into a div the next task adds.

COEXISTENCE-SEAM RULE (checker WARNING — highest-risk part of the migration):
the legacy `client-main.js` route() and its `hashchange`/nav-link listeners
(client-main.js:191-193) MUST keep working for the 10 un-migrated views. App owns
the Preact-rendered nav buttons, so legacy's `.nav-link[data-view]` query will
find nothing — that is fine for nav highlighting, but legacy route()'s `.view`
class toggling must still fire on hashchange. Therefore:
- Do NOT remove or rename the legacy `<div id="view-X" class="view">` host divs
  that App renders for un-migrated views — legacy route() toggles their `active`
  class by id.
- App MUST render those placeholder hosts as STABLE nodes: render them once and
  never let a Preact re-render (auto-refresh, theme toggle) unmount or replace
  them — otherwise the legacy-injected innerHTML is destroyed. Use a keyed,
  content-less host whose children Preact does not manage (App renders the empty
  `<div id="view-X">` and never touches its children).
- The legacy `hashchange` listener stays registered — App's router and legacy
  route() both listen; both must coexist. Verify legacy route() still toggles the
  correct host on nav for a legacy view (e.g. Kanban).
</action>
<acceptance_criteria>
- `grep -n "data-view" server/lib/html/client/components/Sidebar.js` shows 12 occurrences (one per view).
- `grep -c "Icon" server/lib/html/client/components/Sidebar.js` is >= 12 (icon per nav link).
- `grep -n "hashchange" server/lib/html/client/components/App.js` shows the router listener.
- `grep -n "setInterval" server/lib/html/client/components/App.js` shows the auto-refresh.
- `grep -n "app-root" server/lib/html/client/app.js` shows the mount target.
- No emoji char appears in Sidebar.js: `grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" server/lib/html/client/components/Sidebar.js` returns nothing.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && for f in components/App.js components/Sidebar.js components/Topbar.js app.js; do node --check "server/lib/html/client/$f" || exit 1; done && echo OK
</automated>
</verify>
<done>All four component files parse cleanly; Sidebar has 12 icon-bearing nav links and zero emoji.</done>
</task>

<task id="31.1.5" type="auto">
<title>Migrate Overview + Decisions views; wire entry into shell.js + client.js</title>
<read_first>server/lib/html/shell.js (full), server/lib/html/client.js (full), server/lib/html/client/client-render.js (245-345 renderOverview), server/lib/html/client/client-main.js (146-189 renderDecisions)</read_first>
<files>
server/lib/html/client/views/OverviewView.js (create)
server/lib/html/client/views/DecisionsView.js (create)
server/lib/html/shell.js
server/lib/html/client.js
</files>
<action>
1. `OverviewView.js`: a Preact component reproducing `renderOverview()` output —
   the stats grid, current-sprint progress, velocity sparkline, council sessions,
   chains/workstreams, last-session, pending-handoff banner, memory-bank summary,
   Active Context `<pre>`, and the command-hints accordion. Read state via
   `useStore()`. Keep every existing CSS class (`stats`, `stat`, `section`,
   `ctx-pre`, `attr-grid`, etc.). Build small inline sub-components for
   `ProgressBar` and `CmdHints` in THIS file (they get promoted to shared
   components in Sprint 31.2 — leave a `// TODO(31.2): promote to components/`).
2. `DecisionsView.js`: reproduce `renderDecisions()` — group-by-phase, filter
   input, rationale rows, command hints. Filtering is component state
   (`useState` for the query), not the DOM `filterItems` hack.
3. `shell.js`: add `<div id="app-root">` as the mount. Strategy for zero
   regressions: keep the existing server-rendered `<div class="view">` containers
   for the 10 un-migrated views (the legacy modules still need them), but the
   Preact App renders the chrome (sidebar/topbar) and the 2 migrated views. The
   cleanest seam: put `<div id="app-root">` as the new shell, and have App render
   placeholder `<div id="view-X">` hosts for legacy views (per task 31.1.4). Remove
   the static server-rendered sidebar/topbar markup (lines ~70-122) since App now
   owns them. Keep the orch-panel and term-panel markup (lines 250-337) untouched —
   those are wrapped in Sprint 31.4.
4. `client.js`: change `renderClientJs` to ALSO emit `window.__ICONS__` (from the
   server `ICONS` map) and a `<script type="module" src="/js/app.js">` entry,
   loaded AFTER the legacy `<script src>` modules (legacy still fills the 10
   un-migrated views). Keep `window.__S__`. The legacy `client-render.js` etc. stay
   non-module for now.
</action>
<acceptance_criteria>
- `grep -n "app-root" server/lib/html/shell.js` shows the mount div.
- `grep -n "type=\"module\"\|type='module'" server/lib/html/client.js` shows the module entry.
- `grep -n "__ICONS__" server/lib/html/client.js` shows the icons injection.
- `grep -n "useStore" server/lib/html/client/views/OverviewView.js server/lib/html/client/views/DecisionsView.js` shows both views read the store.
- `grep -n "TODO(31.2)" server/lib/html/client/views/OverviewView.js` shows the promotion marker.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/OverviewView.js && node --check server/lib/html/client/views/DecisionsView.js && node -e "const {renderHtml}=require('./server/lib/html/shell.js');const h=renderHtml({exists:true,planningFiles:[],blockers:[],raw:{phases:[],decisions:[]}},'tok');if(!h.includes('app-root'))process.exit(1);if(!h.includes('/js/app.js'))process.exit(1);if(!h.includes('__ICONS__'))process.exit(1);console.log('OK');"
</automated>
</verify>
<done>renderHtml emits app-root mount, module entry, and __ICONS__; both view modules parse cleanly.</done>
</task>

<task id="31.1.6" type="checkpoint:human-verify">
<title>Manual regression sweep — foundation</title>
<read_first>this sprint's must_haves block</read_first>
<files></files>
<action>
Start the dashboard (`node server/dashboard.js`) and verify in a browser at
http://localhost:7717:
1. Page loads, NO console errors, NO failed esm.sh requests (Network tab).
2. Sidebar shows SVG icons (not emoji); all 12 nav links present.
3. Click each nav link — the right view activates; the 10 legacy views still
   render their content; Overview + Decisions render via Preact.
4. Reload on `#roadmap` — roadmap stays active (router survives reload).
5. Theme toggle flips dark/light and persists across reload.
6. Hamburger collapses/expands the sidebar.
7. Manual Refresh button works; wait/observe the 30s auto-refresh does not blank
   the view.
8. Decisions view filter input narrows the list as you type.
9. COEXISTENCE CHECK (checker WARNING): navigate to a LEGACY view (e.g. Kanban),
   confirm it renders, then trigger a manual Refresh (and wait one 30s auto-refresh
   cycle). The legacy view's content MUST survive — it must not blank or get
   unmounted by the Preact re-render. Then switch to Overview and back to Kanban —
   legacy content still renders.
Report PASS/FAIL per item. Any FAIL blocks Sprint 31.2.
</action>
<done>All 8 checks PASS; tester confirms no console errors.</done>
</task>

</tasks>

<verification>
- `node server/dashboard.js` boots clean on :7717 (no thrown errors in stdout).
- `for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo BAD $f; done` prints no BAD lines.
- All esm.sh imports are pinned (no bare `https://esm.sh/preact` without `@version`).
</verification>

<success_criteria>
- Preact + htm load via esm.sh with no build step; App root renders chrome + 2 views.
- icons.js wired into the client; sidebar emoji replaced with SVG icons.
- Hash routing, auto-refresh, theme toggle, sidebar collapse all functional.
- 10 legacy views still render (coexistence) — zero regressions.
</success_criteria>

<output>
Create `.planning/phases/31-preact-migration-rebuild-majlis-dashboard-client-as-preact-components-via-htm-esm-cdn-no-build-step/31-1-SUMMARY.md`
</output>
