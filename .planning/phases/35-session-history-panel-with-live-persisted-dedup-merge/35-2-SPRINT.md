---
phase: 35-session-history-panel-with-live-persisted-dedup-merge
plan_number: 2
wave: 2
depends_on: [35-1-SPRINT]
autonomous: true
files_modified:
  - server/lib/html/client/orchestrator.js
  - server/lib/html/client/views/OrchestrationView.js
  - server/lib/html/icons.js
  - server/lib/html/client/icons-client.js
  - server/lib/html/css.js
requirements: [HIST-1, HIST-2, HIST-3]
must_haves:
  truths:
    - "The Orchestration view shows a history panel of past runs grouped by status and date."
    - "Each past-run row shows its duration and its final status."
    - "A run present in both the live session poll and persisted history renders exactly once."
  artifacts:
    - "fetchHistory() in client/orchestrator.js calling GET /api/history."
    - "mergeSessionsAndHistory() — field-aware dedup-merge keyed on storyId, live wins for status, persisted duration preserved."
    - "HistoryPanel component in OrchestrationView.js grouped by status then date."
  key_links:
    - "mergeSessionsAndHistory keyed on storyId — if the key is wrong, double rows appear (HIST-3 fails)."
    - "mergeSessionsAndHistory must keep persisted durationMs/endTime — live handleSessions rows omit them, so a wholesale overwrite breaks HIST-2 for recently-ended runs."
    - "history store field fed by the poll — if startSessionsPoll does not also fetch history, the panel stays empty."
---

# Sprint 35.2 — Session history panel and live/persisted dedup-merge

<objective>
Surface the persisted run history (from Sprint 35.1's `GET /api/history`) in the
Orchestration view as a panel grouped by status and date, each row showing duration and
final status (HIST-1, HIST-2). Merge the persisted history with the live
`activeSessions` poll so a run that is both live and persisted renders exactly once
(HIST-3).

Purpose: Sprint 35.1 added the server endpoint but nothing in the client reads it.
`OrchestrationView` (server/lib/html/client/views/OrchestrationView.js:140-167) renders
only `activeSessions`; there is no history surface and no dedup logic.

Output: a `HistoryPanel` in OrchestrationView, a `fetchHistory`/`mergeSessionsAndHistory`
pair in client/orchestrator.js, a `history` store field, and supporting CSS + one icon.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
</context>

<constraints>
- Client is Preact via htm + ESM CDN — NO build step, no new dependency. No `React.FC`.
  No inline `style` attribute — CSS classes only (per CLAUDE.md).
- The `history` store field is added to the existing seed object in store.js the same
  way `activeSessions: []` already exists (server/lib/html/client/store.js:31).
- Dedup-merge key: `storyId`. When the same `storyId` is in both `activeSessions` and
  `history`, the LIVE entry wins for STATUS — but the merge is FIELD-AWARE: persisted
  `durationMs`/`endTime` are kept when the live entry omits them. The merged list must
  contain each `storyId` exactly once.
- New icon `history` MUST be added to BOTH server/lib/html/icons.js (CJS) and
  server/lib/html/client/icons-client.js (ESM) — the file headers state they must stay
  in sync. No `history`/`archive`/`calendar` icon exists today (verified via grep).
</constraints>

<tasks>

<task id="35.2.1" type="auto">
<title>Add fetchHistory, the history store field, the dedup-merge helper, and wire them into the poll</title>
<read_first>
- server/lib/html/client/orchestrator.js (fetchSessions lines 67-78, startSessionsPoll lines 140-155, _poll lines 151-155, ORCH_HTTP line 16)
- server/lib/html/client/store.js (seed object lines 16-40 — note `activeSessions: []` line 31)
- server/orchestrator.js (handleSessions lines 163-185 — CONFIRM the emitted object has NO endTime and NO durationMs key)
</read_first>
<files>
server/lib/html/client/store.js
server/lib/html/client/orchestrator.js
</files>
<interfaces>
Existing, follow these patterns exactly:
  export function fetchSessions() { ... }     // orchestrator.js:67-78 — token guard, 401 self-heal, .catch(()=>[])
  function _poll() { fetchSessions().then(sessions => setState({ activeSessions: sessions })); }  // :151-155
New:
  export function fetchHistory(): Promise<Array>        // GET /api/history → d.history || []
  export function mergeSessionsAndHistory(live, hist): Array
    // returns one row per storyId; live wins for STATUS but the merge is FIELD-AWARE:
    // persisted durationMs/endTime are preserved when the live entry lacks them.
Modified:
  function _poll()  // now fetches BOTH sources via Promise.all and writes both store fields.

CRITICAL — handleSessions in server/orchestrator.js:163-185 iterates the ENTIRE
sessions Map and emits { storyId, status, pid, cmd, startTime, clients, filesChanged,
idleSeconds, waiting } — it has NO `endTime` and NO `durationMs`. Ended-but-uncleaned
sessions stay in the Map with status done/exited/stopped but still carry no duration.
The persisted history entry (from persistRun, Sprint 35.1) DOES have `durationMs` and
`endTime`. A wholesale `{ ...h, ...s }` overwrite would STRIP duration from exactly the
recently-ended runs users most want to see — breaking HIST-2. The merge MUST fall back
to persisted `durationMs`/`endTime` whenever the live entry omits them.
</interfaces>
<action>
1. store.js — add `history: [],` to the seed object immediately after the
   `activeSessions: []` line (server/lib/html/client/store.js:31), with comment
   `// Persisted past runs (populated by startSessionsPoll → fetchHistory)`.

2. orchestrator.js — add `fetchHistory()` modeled on `fetchSessions()`
   (server/lib/html/client/orchestrator.js:67-78):
   - Read token via `orchToken()`; if falsy, `return Promise.resolve([])`.
   - `fetch(ORCH_HTTP + '/api/history', { headers: { 'Authorization': 'Bearer ' + tok } })`
   - On `r.status === 401` call `refreshOrchToken()` and return `[]`.
   - Otherwise `r.json().then(d => (d && d.history) || [])`.
   - `.catch(() => [])`.

3. orchestrator.js — add `mergeSessionsAndHistory(live, hist)` with a FIELD-AWARE merge:
   - `const byId = new Map();`
   - First insert every history entry: `for (const h of hist || []) byId.set(h.storyId, { ...h, source: 'history' });`
   - Then merge live entries so live WINS for STATUS but persisted duration survives:
     ```
     for (const s of live || []) {
       const h = byId.get(s.storyId) || {};
       byId.set(s.storyId, {
         ...h,
         ...s,
         source: 'live',
         durationMs: s.durationMs ?? h.durationMs,   // live rows omit durationMs — keep persisted
         endTime:    s.endTime    ?? h.endTime,      // live rows omit endTime    — keep persisted
       });
     }
     ```
   - `return [...byId.values()];`
   - This guarantees each `storyId` appears exactly once (HIST-3) AND a recently-ended
     run that is still in the live `sessions` Map keeps its persisted `durationMs`
     (HIST-2).

4. orchestrator.js — rewrite `_poll()` (server/lib/html/client/orchestrator.js:151-155)
   so the 4-second poll loads BOTH sources. Without this step the `history` store field
   stays `[]` forever and HistoryPanel always shows "No past runs yet" — the whole phase
   is non-functional. Replace:
   ```
   function _poll() {
     fetchSessions().then(sessions => {
       setState({ activeSessions: sessions });
     });
   }
   ```
   with:
   ```
   function _poll() {
     Promise.all([fetchSessions(), fetchHistory()])
       .then(([sessions, history]) => {
         setState({ activeSessions: sessions, history });
       });
   }
   ```
   Both `fetchSessions()` and `fetchHistory()` already `.catch(() => [])`, so one
   failing endpoint never rejects the `Promise.all` — the other source still updates.
</action>
<acceptance_criteria>
- `grep -q "history: \[\]" server/lib/html/client/store.js` exits 0
- `grep -q "export function fetchHistory" server/lib/html/client/orchestrator.js` exits 0
- `grep -q "export function mergeSessionsAndHistory" server/lib/html/client/orchestrator.js` exits 0
- `grep -q "/api/history" server/lib/html/client/orchestrator.js` exits 0
- `_poll` is rewritten to load both sources:
  `grep -q "Promise.all(\[fetchSessions(), fetchHistory()\])" server/lib/html/client/orchestrator.js` exits 0
- `_poll` writes the history store field:
  `grep -q "setState({ activeSessions: sessions, history })" server/lib/html/client/orchestrator.js` exits 0
- The merge is field-aware, not a wholesale overwrite:
  `grep -q "durationMs: s.durationMs ?? h.durationMs" server/lib/html/client/orchestrator.js` exits 0
- Behavioral — overlapping storyId keeps persisted duration: a one-shot Node assertion
  passes (live row has `{storyId:'X',status:'done'}` with NO durationMs, persisted has
  `{storyId:'X',status:'exited',durationMs:42000,endTime:'2026-05-16T10:00:00Z'}`):
  ```
  node --input-type=module -e "import {mergeSessionsAndHistory} from './server/lib/html/client/orchestrator.js'; \
  const m = mergeSessionsAndHistory([{storyId:'X',status:'done'}], [{storyId:'X',status:'exited',durationMs:42000,endTime:'2026-05-16T10:00:00Z'}]); \
  if (m.length !== 1) throw new Error('expected 1 row, got '+m.length); \
  if (m[0].status !== 'done') throw new Error('live status must win'); \
  if (m[0].durationMs !== 42000) throw new Error('persisted durationMs must be preserved'); \
  if (m[0].endTime !== '2026-05-16T10:00:00Z') throw new Error('persisted endTime must be preserved'); \
  console.log('OK');"
  ```
- `node --input-type=module --check < server/lib/html/client/orchestrator.js` exits 0
- `node --input-type=module --check < server/lib/html/client/store.js` exits 0
</acceptance_criteria>
<verify>
<automated>
node --input-type=module --check < server/lib/html/client/orchestrator.js
node --input-type=module --check < server/lib/html/client/store.js
grep -q "export function fetchHistory" server/lib/html/client/orchestrator.js
grep -q "export function mergeSessionsAndHistory" server/lib/html/client/orchestrator.js
grep -q "Promise.all(\[fetchSessions(), fetchHistory()\])" server/lib/html/client/orchestrator.js
grep -q "setState({ activeSessions: sessions, history })" server/lib/html/client/orchestrator.js
grep -q "history: \[\]" server/lib/html/client/store.js
grep -q "durationMs: s.durationMs ?? h.durationMs" server/lib/html/client/orchestrator.js
node --input-type=module -e "import {mergeSessionsAndHistory} from './server/lib/html/client/orchestrator.js'; const m = mergeSessionsAndHistory([{storyId:'X',status:'done'}], [{storyId:'X',status:'exited',durationMs:42000,endTime:'2026-05-16T10:00:00Z'}]); if (m.length !== 1) throw new Error('rows'); if (m[0].status !== 'done') throw new Error('status'); if (m[0].durationMs !== 42000) throw new Error('duration'); console.log('OK');"
</automated>
</verify>
<done>The 4-second poll loads persisted history into the store via `Promise.all([fetchSessions(), fetchHistory()])`, and a field-aware dedup-merge keyed on storyId — live wins for status, persisted duration/endTime survive — is available to views.</done>
</task>

<task id="35.2.2" type="auto">
<title>Add the history icon to both icon modules</title>
<read_first>
- server/lib/html/client/icons-client.js (header lines 1-16, ICONS map starting line 16 — `home`, `activity`, `clock` entries)
- server/lib/html/icons.js (CJS counterpart, same map structure)
</read_first>
<files>
server/lib/html/icons.js
server/lib/html/client/icons-client.js
</files>
<interfaces>
Existing ICONS map entry shape (icons-client.js:17):
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
viewBox is 0 0 24 24, stroke = currentColor.
</interfaces>
<action>
1. Add a `history` entry to the ICONS map in server/lib/html/client/icons-client.js,
   placed next to the `clock` entry. Use the Lucide "history" glyph inner markup
   (clock-with-rewind-arrow), viewBox 0 0 24 24:
   `history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',`

2. Add the IDENTICAL `history` entry to the ICONS map in server/lib/html/icons.js
   (the CJS counterpart) — the file headers in both files state they must stay in
   sync. Same key, same SVG markup string.
</action>
<acceptance_criteria>
- `grep -q "history:" server/lib/html/client/icons-client.js` exits 0
- `grep -q "history:" server/lib/html/icons.js` exits 0
- The two markup strings are identical: this returns nothing —
  `diff <(grep -oE "history: '.*'," server/lib/html/icons.js) <(grep -oE "history: '.*'," server/lib/html/client/icons-client.js)`
- `node --input-type=module --check < server/lib/html/client/icons-client.js` exits 0
- `node --check server/lib/html/icons.js` exits 0
</acceptance_criteria>
<verify>
<automated>
node --check server/lib/html/icons.js
node --input-type=module --check < server/lib/html/client/icons-client.js
grep -q "history:" server/lib/html/icons.js
grep -q "history:" server/lib/html/client/icons-client.js
diff <(grep -oE "history: '.*'," server/lib/html/icons.js) <(grep -oE "history: '.*'," server/lib/html/client/icons-client.js)
</automated>
</verify>
<done>A `history` icon is available to Preact components via the Icon component, defined identically in both icon modules.</done>
</task>

<task id="35.2.3" type="auto">
<title>Render the HistoryPanel in OrchestrationView grouped by status and date</title>
<read_first>
- server/lib/html/client/views/OrchestrationView.js (whole file — OrchCard lines 21-62, OrchestrationView root lines 140-167)
- server/lib/html/client/util.js (humanDate lines 36-44, dateStr lines 31-34, orchElapsed lines 95-103, chip lines 77-86)
- server/lib/html/client/orchestrator.js (mergeSessionsAndHistory — added in task 35.2.1)
</read_first>
<files>
server/lib/html/client/views/OrchestrationView.js
</files>
<interfaces>
Existing helpers to import and use:
  import { humanDate } from '../util.js';            // "May 16, 2026" — for date grouping label
  import { useStore } from '../store.js';            // exposes { activeSessions, history }
  import { mergeSessionsAndHistory } from '../orchestrator.js';
  import { Icon } from '../icons-client.js';         // <${Icon} name="history" size=.../>
HistoryEntry fields from the server (Sprint 35.1): storyId, cmd, status, startTime, endTime, durationMs.
Live session fields (handleSessions): storyId, status, cmd, startTime — NO durationMs/endTime;
the field-aware merge from 35.2.1 backfills durationMs/endTime from the persisted entry.
</interfaces>
<action>
1. Add a `durationLabel(ms)` local helper near `sortSessions`
   (server/lib/html/client/views/OrchestrationView.js:66): converts a `durationMs`
   number to a short string — `< 60000` → `Ns`, `< 3600000` → `Nm Ns`, else `Nh Nm`.
   Return `'—'` when `ms` is not a finite positive number.

2. Add a `HistoryRow({ run })` component: a single past-run row showing
   - status dot: `<span class=${'term-status-dot ' + run.status}></span>` (reuse existing dot class — note task 35.2.4 adds the `.exited` modifier so an exited run is not a grey default dot)
   - `run.storyId` in `.hist-row-id`
   - `run.cmd` in `.hist-row-cmd`
   - duration: `<${Icon} name="clock" size=${12}/> ${durationLabel(run.durationMs)}`
   - the final status text in `.hist-row-status`

3. Add a `HistoryPanel()` component:
   - Read `{ activeSessions, history } = useStore()`.
   - Build the deduped list: `const merged = mergeSessionsAndHistory(activeSessions, history);`
   - Keep only ENDED runs for the history panel — filter to
     `run.status !== 'running'` (running runs already show in the live `orch-grid`).
   - GROUP BY STATUS first: build groups for `done`, `exited`, `stopped`, `error`
     (skip any group that is empty).
   - Within each status group, GROUP BY DATE using
     `humanDate(run.endTime || run.startTime)` as the sub-heading label, newest date first.
   - Sort runs within a date newest-first by `endTime`.
   - Render: a panel header `<${Icon} name="history" size=${16}/> Run History`, then for
     each status group a `.hist-group` with a `.hist-group-title`, then per date a
     `.hist-date` sub-heading and the `HistoryRow`s.
   - If `merged` has no ended runs, render `<div class="empty">No past runs yet.</div>`.

4. Render `<${HistoryPanel}/>` inside `OrchestrationView`'s returned markup
   (server/lib/html/client/views/OrchestrationView.js:144-166) — place it AFTER the
   live `orch-grid`/empty block, before the closing `</div>` of `#view-orchestration`.

5. Use `key=${run.storyId}` on each `HistoryRow` in the `.map` so Preact reconciles
   correctly.
</action>
<acceptance_criteria>
- `grep -q "function HistoryPanel" server/lib/html/client/views/OrchestrationView.js` exits 0
- `grep -q "function HistoryRow" server/lib/html/client/views/OrchestrationView.js` exits 0
- `grep -q "mergeSessionsAndHistory" server/lib/html/client/views/OrchestrationView.js` exits 0
- `grep -q "name=\"history\"" server/lib/html/client/views/OrchestrationView.js` exits 0
- `grep -q "durationLabel" server/lib/html/client/views/OrchestrationView.js` exits 0
- `grep -q "humanDate" server/lib/html/client/views/OrchestrationView.js` exits 0
- Behavioral — `mergeSessionsAndHistory` collapses overlapping live+persisted runs to one
  row per storyId (this is the dedup contract HistoryPanel depends on):
  ```
  node --input-type=module -e "import {mergeSessionsAndHistory} from './server/lib/html/client/orchestrator.js'; \
  const m = mergeSessionsAndHistory([{storyId:'A',status:'done'},{storyId:'B',status:'running'}], \
  [{storyId:'A',status:'exited',durationMs:1000},{storyId:'C',status:'error',durationMs:2000}]); \
  const ids = m.map(r=>r.storyId).sort().join(','); \
  if (ids !== 'A,B,C') throw new Error('expected A,B,C got '+ids); \
  if (m.filter(r=>r.storyId==='A').length !== 1) throw new Error('A must appear once'); \
  console.log('OK');"
  ```
- `node --input-type=module --check < server/lib/html/client/views/OrchestrationView.js` exits 0
- No inline style attribute added: `grep -c "style=" server/lib/html/client/views/OrchestrationView.js` returns 0
</acceptance_criteria>
<verify>
<automated>
node --input-type=module --check < server/lib/html/client/views/OrchestrationView.js
grep -q "function HistoryPanel" server/lib/html/client/views/OrchestrationView.js
grep -q "function HistoryRow" server/lib/html/client/views/OrchestrationView.js
grep -q "mergeSessionsAndHistory" server/lib/html/client/views/OrchestrationView.js
grep -q "name=\"history\"" server/lib/html/client/views/OrchestrationView.js
test "$(grep -c 'style=' server/lib/html/client/views/OrchestrationView.js)" = "0"
node --input-type=module -e "import {mergeSessionsAndHistory} from './server/lib/html/client/orchestrator.js'; const m = mergeSessionsAndHistory([{storyId:'A',status:'done'},{storyId:'B',status:'running'}], [{storyId:'A',status:'exited',durationMs:1000},{storyId:'C',status:'error',durationMs:2000}]); const ids = m.map(r=>r.storyId).sort().join(','); if (ids !== 'A,B,C') throw new Error('ids'); if (m.filter(r=>r.storyId==='A').length !== 1) throw new Error('dup'); console.log('OK');"
</automated>
</verify>
<done>The Orchestration view shows a Run History panel grouped by status then date, each row showing duration and final status, with each storyId rendered exactly once.</done>
</task>

<task id="35.2.4" type="auto">
<title>Add history panel CSS and the missing .exited status-dot modifier</title>
<read_first>
- server/lib/html/css.js (term-status-dot block lines 2008-2019 — note modifiers exist for running/done/error/stopped/connecting but NOT exited)
- server/lib/html/css.js (orch block lines 2123-2186 — note token usage like var(--bg-elev-2), var(--space-4), var(--text-sm))
</read_first>
<files>
server/lib/html/css.js
</files>
<interfaces>
Design tokens already defined (server/lib/html/css.js:11-60+):
  --bg-elev-1, --bg-elev-2, --border-subtle, --text-primary, --text-secondary,
  --text-tertiary, --text-muted, --space-2..5, --radius-2/4, --text-sm/xs/2xs,
  --accent-green, --accent-amber, --accent-blue.
Existing term-status-dot modifiers (css.js:2015-2019): running, done, error, stopped,
connecting. There is NO `.exited` modifier — an exited run currently renders the
default grey `var(--text-muted)` dot. The error-dot uses `#ff4444` (css.js:2017); the
exited/error orch-card border uses the same red.
Existing reused class: .term-status-dot (status dot) and .empty.
</interfaces>
<action>
1. Add a `.term-status-dot.exited` modifier immediately after the existing
   `.term-status-dot.connecting` rule (server/lib/html/css.js:2019). An exited run
   groups visually with `error` — use the SAME red the error dot uses:
   `.term-status-dot.exited { background: #ff4444; animation: none; }`
   (`#ff4444` is the established error color at css.js:2017 — reuse it verbatim, do not
   invent a new shade.)

2. Add a `/* ── Run history panel ── */` block immediately after the existing
   `.orch-card-actions` rule (server/lib/html/css.js:2186). Add these classes, every
   value sourced from the design tokens above — NO hardcoded colors/sizes except where a
   token genuinely does not exist:
- `.hist-panel` — `margin-top: var(--space-6);` (top separation from orch-grid)
- `.hist-panel-title` — flex row, `gap: var(--space-2)`, `font-size: var(--text-md)`,
  `color: var(--text-primary)`, `margin-bottom: var(--space-4)`
- `.hist-group` — `margin-bottom: var(--space-5)`
- `.hist-group-title` — `font-size: var(--text-xs)`, uppercase, `letter-spacing: 0.06em`,
  `color: var(--text-tertiary)`, `margin-bottom: var(--space-2)`
- `.hist-date` — `font-size: var(--text-2xs)`, `color: var(--text-muted)`,
  `margin: var(--space-3) 0 var(--space-2)`
- `.hist-row` — flex row, `align-items: center`, `gap: var(--space-3)`,
  `padding: var(--space-2) var(--space-3)`, `background: var(--bg-elev-2)`,
  `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-2)`,
  `margin-bottom: var(--space-2)`
- `.hist-row-id` — `font-weight: 600`, `font-size: var(--text-sm)`, `color: var(--text-primary)`
- `.hist-row-cmd` — `font-family: var(--font-mono)`, `font-size: var(--text-2xs)`,
  `color: var(--text-secondary)`, `flex: 1`, `overflow: hidden`, `text-overflow: ellipsis`,
  `white-space: nowrap`
- `.hist-row-status` — `margin-left: auto`, `font-size: var(--text-2xs)`,
  `text-transform: uppercase`, `letter-spacing: 0.06em`, `color: var(--text-muted)`
</action>
<acceptance_criteria>
- `grep -q ".term-status-dot.exited" server/lib/html/css.js` exits 0
- The exited dot reuses the error red, not a new color:
  `grep -q ".term-status-dot.exited { background: #ff4444" server/lib/html/css.js` exits 0
- `grep -q ".hist-panel" server/lib/html/css.js` exits 0
- `grep -q ".hist-row" server/lib/html/css.js` exits 0
- `grep -q ".hist-group-title" server/lib/html/css.js` exits 0
- The block uses tokens: `grep -q "var(--bg-elev-2)" server/lib/html/css.js` exits 0
- `node --check server/lib/html/css.js` exits 0
</acceptance_criteria>
<verify>
<automated>
node --check server/lib/html/css.js
grep -q ".term-status-dot.exited { background: #ff4444" server/lib/html/css.js
grep -q ".hist-panel" server/lib/html/css.js
grep -q ".hist-row" server/lib/html/css.js
grep -q ".hist-group-title" server/lib/html/css.js
</automated>
</verify>
<done>The Run History panel renders with token-driven styling consistent with the orch-card surface, and an exited run shows a red status dot instead of a default grey one.</done>
</task>

</tasks>

<verification>
- `node server/dashboard.js` starts clean on :7717; `server/dashboard.js` itself is unchanged this sprint.
- Opening the Orchestration view shows the live `orch-grid` AND a `Run History` panel below it.
- A run that ended while live-polled appears once: it is in `history` (persisted by 35.1)
  and may still be in `activeSessions` until cleaned — `mergeSessionsAndHistory` keys on
  `storyId` so it renders a single row, and the field-aware merge keeps the persisted
  `durationMs` even though the live `handleSessions` row omits it.
- An exited run renders a red status dot (`.term-status-dot.exited`), not a grey default.
- All three icon/store/css files pass `node --check` (or ESM `--check`).
- No inline `style=` attribute anywhere in OrchestrationView.js.
</verification>

<success_criteria>
- HIST-1: a history panel lists past orchestration runs grouped by status and date.
- HIST-2: each past-run row shows its duration (`durationLabel`) and final status —
  including recently-ended runs still in the live poll, because the field-aware merge
  preserves persisted `durationMs`.
- HIST-3: live and persisted runs render as a single deduplicated list — each `storyId`
  appears exactly once because `mergeSessionsAndHistory` collapses on `storyId` with live
  winning for status.
- No new dependency, no build step, no inline styles, dashboard.js view-only boundary intact.
</success_criteria>

<output>
Create `.planning/phases/35-session-history-panel-with-live-persisted-dedup-merge/35-2-SUMMARY.md`
</output>
</content>
</invoke>
