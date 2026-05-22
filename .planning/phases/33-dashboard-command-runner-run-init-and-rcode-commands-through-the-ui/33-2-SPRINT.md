---
phase: 33-dashboard-command-runner-run-init-and-rcode-commands-through-the-ui
sprint: 33.2
plan_number: 2
type: execute
wave: 2
depends_on: [33.1]
files_modified:
  - server/lib/html/client/views/OrchestrationView.js
  - server/lib/html/client/orchestrator.js
autonomous: true
requirements: [phase-33-goal]
must_haves:
  truths:
    - "The Orchestration view renders a command-picker section above the session grid — a labeled dropdown populated with the same commands as the server allowlist, plus a Run button."
    - "Clicking Run with a selected command calls runAndOpenTerm (or runCommandFromUI) which POSTs to /api/run with a synthetic storyId (cmd-<slug>) and the selected cmd, then opens XtermPanel streaming live output."
    - "No second terminal component is created — XtermPanel reuses the existing store.terminal mechanism."
    - "OrchestrationView.js stays under 200 lines; orchestrator.js client stays under 260 lines."
    - "No new npm dependencies; no new CDN imports beyond what is already in preact.js."
  artifacts:
    - "server/lib/html/client/views/OrchestrationView.js — CommandRunner section added"
    - "server/lib/html/client/orchestrator.js — runCommandFromUI() helper added"
  key_links:
    - "runAndOpenTerm() is orchestrator.js:165-181 — opens store.terminal then POSTs /api/run."
    - "XtermPanel connects WS on store.terminal.storyId change (XtermPanel.js:120-123)."
    - "OrchestrationView root is lines 81-106; insert CommandRunner component before the sessions grid (line 97)."
    - "The storyId for a command session uses the cmd slug: 'cmd-rcode-init' for '/rcode-init'. Must satisfy STORY_ID_RE: /^[A-Za-z0-9._-]+$/ (orchestrator.js:52)."
---

<objective>
Build the command-picker UI in OrchestrationView and wire it to the existing
runAndOpenTerm/XtermPanel stack so the user can select a rcode command from a
dropdown and launch it — watching live output in the existing terminal panel.

Purpose: Sprint 33.1 secured the server side. This sprint delivers the user-visible
feature: pick /rcode-init (or any other allowlisted command), hit Run, see output.

Output: OrchestrationView with a CommandRunner section; orchestrator.js client with
a runCommandFromUI() helper; no new files, no new dependencies.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/33-dashboard-command-runner-run-init-and-rcode-commands-through-the-ui/33-1-SUMMARY.md
</context>

<tasks>

<task id="33.2.1" type="auto">
<title>Add runCommandFromUI() to client orchestrator.js</title>
<read_first>server/lib/html/client/orchestrator.js (lines 155-220, the runAndOpenTerm block)</read_first>
<files>server/lib/html/client/orchestrator.js</files>
<action>
Read the file first (220 lines). Then append a new export at the end of the file
(after the last export, currently runStory/stopStory at lines 210-220).

Add:

```js
// ── Command runner ────────────────────────────────────────────────────────────

/**
 * Client-side allowlist — mirrors the server COMMAND_ALLOWLIST.
 * The server always re-validates; this list drives the picker dropdown only.
 * Update both when adding a new command.
 */
export const ALLOWED_COMMANDS = [
  { cmd: '/rcode-init',         label: 'init — initialise project workspace' },
  { cmd: '/rcode-status',       label: 'status — phase / sprint status' },
  { cmd: '/rcode-progress',     label: 'progress — milestone progress' },
  { cmd: '/rcode-help',         label: 'help — command reference' },
  { cmd: '/rcode-health',       label: 'health — repo health check' },
  { cmd: '/rcode-next',         label: 'next — suggest next action' },
  { cmd: '/rcode-show',         label: 'show — show current plan' },
  { cmd: '/rcode-list-plans',   label: 'list-plans — list all sprint plans' },
  { cmd: '/rcode-sprint-status',label: 'sprint-status — sprint execution status' },
  { cmd: '/rcode-config',       label: 'config — show rcode config' },
  { cmd: '/rcode-diff',         label: 'diff — diff since last checkpoint' },
  { cmd: '/rcode-stats',        label: 'stats — project statistics' },
];

/**
 * Launch an allowlisted rcode command from the dashboard command runner.
 * Uses a synthetic storyId derived from the command slug so it shows up as
 * its own session in the Orchestration grid.
 *
 * storyId format: "cmd-rcode-init" (satisfies STORY_ID_RE /^[A-Za-z0-9._-]+$/).
 *
 * @param {string} cmd  Must be one of ALLOWED_COMMANDS[*].cmd.
 */
export function runCommandFromUI(cmd) {
  if (!cmd) return;
  // Derive a stable session ID: strip leading slash, replace remaining slashes.
  const slug    = cmd.replace(/^\//, '').replace(/\//g, '-');
  const storyId = 'cmd-' + slug;
  const title   = cmd + ' (command runner)';
  runAndOpenTerm(storyId, cmd, title);
}
```

WHY a separate helper instead of calling runAndOpenTerm directly from the view:
- Encapsulates the storyId derivation rule (slug format) in one place.
- Keeps the view declarative — it only calls runCommandFromUI(selectedCmd).
- The client ALLOWED_COMMANDS list drives the dropdown, keeping the view free
  of data constants.

AVOID:
- Do NOT modify runAndOpenTerm or any existing export.
- Do NOT import anything new — all symbols (runAndOpenTerm, setState, orchToken)
  are already available in the file.
- Do NOT exceed 260 total lines in this file.
</action>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --input-type=module << 'EOF'
import { ALLOWED_COMMANDS, runCommandFromUI } from './server/lib/html/client/orchestrator.js';
if (!Array.isArray(ALLOWED_COMMANDS) || ALLOWED_COMMANDS.length < 10)
  throw new Error('ALLOWED_COMMANDS missing or short');
const initEntry = ALLOWED_COMMANDS.find(c => c.cmd === '/rcode-init');
if (!initEntry) throw new Error('/rcode-init not in ALLOWED_COMMANDS');
if (typeof runCommandFromUI !== 'function')
  throw new Error('runCommandFromUI not exported');
console.log('OK — ALLOWED_COMMANDS has', ALLOWED_COMMANDS.length, 'entries; runCommandFromUI exported');
EOF
</automated>
</verify>
<done>
- ALLOWED_COMMANDS exported array with >= 10 entries, each `{ cmd, label }`.
- runCommandFromUI(cmd) exported; derives storyId as "cmd-" + slug.
- File remains under 260 lines.
- Node ESM import resolves without error.
</done>
<evidence>
lines: server/lib/html/client/orchestrator.js:165-181 — runAndOpenTerm() which
  runCommandFromUI will delegate to.
lines: server/lib/html/client/orchestrator.js:210-220 — end of file; new exports
  append here.
grep: `rg 'runCommandFromUI' server/lib/html/client/orchestrator.js` → 0 hits before
  edit (confirmed by reading file). This task creates it.
lines: server/orchestrator.js:52 — STORY_ID_RE `/^[A-Za-z0-9._-]+$/` — "cmd-rcode-init"
  satisfies this pattern (only alphanumeric, hyphens, dots).
</evidence>
</task>

<task id="33.2.2" type="auto">
<title>Add CommandRunner section to OrchestrationView.js</title>
<read_first>server/lib/html/client/views/OrchestrationView.js (full file, 106 lines)</read_first>
<files>server/lib/html/client/views/OrchestrationView.js</files>
<action>
Read the full file first (106 lines). Make two edits:

EDIT 1 — Update the import from orchestrator.js (line 15) to add the two new
exports:

Before:
```js
import { stopSession, openTermPanel } from '../orchestrator.js';
```

After:
```js
import { stopSession, openTermPanel, runCommandFromUI, ALLOWED_COMMANDS } from '../orchestrator.js';
```

EDIT 2 — Add a CommandRunner Preact component before the OrchestrationView export
(before line 81). Insert between the sortSessions function (ends ~line 77) and the
OrchestrationView export:

```js
// ── Command runner ────────────────────────────────────────────────────────────

/**
 * CommandRunner — dropdown + Run button for launching allowlisted rcode commands.
 * State is local (useState) — no store changes needed; runCommandFromUI handles
 * all session and terminal state via runAndOpenTerm.
 */
function CommandRunner() {
  const [selected, setSelected] = useState(ALLOWED_COMMANDS[0]?.cmd || '');
  const [busy, setBusy] = useState(false);

  function handleRun() {
    if (!selected || busy) return;
    setBusy(true);
    runCommandFromUI(selected);
    // Reset busy after 2 s — the terminal panel is now open and the session is
    // streaming. We do not block on session completion here.
    setTimeout(() => setBusy(false), 2000);
  }

  return html`
    <div class="cmd-runner">
      <div class="cmd-runner-title">
        <${Icon} name="terminal" size=${14}/> Command Runner
      </div>
      <div class="cmd-runner-row">
        <select class="cmd-runner-select"
          value=${selected}
          onChange=${e => setSelected(e.target.value)}>
          ${ALLOWED_COMMANDS.map(({ cmd, label }) => html`
            <option key=${cmd} value=${cmd}>${label}</option>
          `)}
        </select>
        <button class="cmd-runner-btn${busy ? ' cmd-runner-btn--busy' : ''}"
          onClick=${handleRun}
          disabled=${busy}>
          ${busy ? html`<${Icon} name="hourglass" size=${14}/> Running…` : html`<${Icon} name="play" size=${14}/> Run`}
        </button>
      </div>
    </div>
  `;
}
```

EDIT 3 — In the OrchestrationView return (around line 85), add the `html` import for
useState if not already present. Check line 13:

```js
import { html } from '../preact.js';
```

If useState is not imported, change it to:
```js
import { html, useState } from '../preact.js';
```

EDIT 4 — Insert `<${CommandRunner}/>` into the OrchestrationView JSX, between the
subtitle div (line 89) and the sessions conditional (line 92). Place it as:

```js
      <${CommandRunner}/>

      ${sessions.length === 0 ? html`
```

WHY before the grid: the command runner is a top-level action, not tied to a
session card. It should be discoverable even when no sessions exist.

AVOID:
- Do NOT introduce a new store field for CommandRunner state.
- Do NOT import useStore in CommandRunner — it does not need active session data.
- Do NOT exceed 200 lines in this file after edits.
- Do NOT add style attributes — all styling via CSS class names (cmd-runner,
  cmd-runner-title, cmd-runner-row, cmd-runner-select, cmd-runner-btn,
  cmd-runner-btn--busy). Sprint 33.3 will add the CSS rules.
</action>
<verify>
<automated>
cd /home/hanzla/development/rcode && node -e "
const src = require('fs').readFileSync('server/lib/html/client/views/OrchestrationView.js','utf8');
const checks = [
  ['CommandRunner component', src.includes('function CommandRunner(')],
  ['runCommandFromUI import', src.includes('runCommandFromUI')],
  ['ALLOWED_COMMANDS import', src.includes('ALLOWED_COMMANDS')],
  ['cmd-runner class', src.includes('cmd-runner')],
  ['useState import', src.includes('useState')],
  ['CommandRunner used in view', (src.match(/CommandRunner/g)||[]).length >= 2],
];
let ok = true;
for (const [label, pass] of checks) {
  console.log((pass ? 'OK' : 'FAIL') + ' — ' + label);
  if (!pass) ok = false;
}
const lines = src.split('\n').length;
console.log('Line count: ' + lines + (lines <= 200 ? ' (OK)' : ' (EXCEEDS 200 — FAIL)'));
if (!ok || lines > 200) process.exit(1);
"
</automated>
</verify>
<done>
- CommandRunner component defined; imports runCommandFromUI and ALLOWED_COMMANDS.
- `<${CommandRunner}/>` rendered inside OrchestrationView before the session grid.
- useState imported from preact.js.
- CSS class names applied; no style attributes.
- File under 200 lines.
</done>
<evidence>
lines: server/lib/html/client/views/OrchestrationView.js:13-15 — existing imports
  (preact, store, orchestrator); this edit extends the orchestrator import.
lines: server/lib/html/client/views/OrchestrationView.js:81-106 — OrchestrationView
  export; CommandRunner inserts between line 78 and 81.
lines: server/lib/html/client/views/OrchestrationView.js:85-104 — view return JSX;
  CommandRunner inserts at line 91 (after subtitle div).
grep: `rg 'CommandRunner' server/lib/html/client/views/OrchestrationView.js` → 0 hits
  before edit. This task creates it.
</evidence>
</task>

<task id="33.2.3" type="auto">
<title>Add cmd-runner CSS rules to css.js</title>
<read_first>server/lib/html/css.js (last 40 lines to find the insertion point)</read_first>
<files>server/lib/html/css.js</files>
<action>
Read the end of css.js to find the last rule block and the closing backtick of the
template literal. Insert the following CSS block immediately before the closing
backtick, after the last existing rule:

```css

/* ── Command runner (Sprint 33.2) ───────────────────────────────────────────── */
.cmd-runner {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-5);
}
.cmd-runner-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.cmd-runner-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
.cmd-runner-select {
  flex: 1;
  background: var(--bg-input, var(--bg-sidebar));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  cursor: pointer;
}
.cmd-runner-select:focus {
  outline: none;
  border-color: var(--accent-blue);
}
.cmd-runner-btn {
  background: var(--accent-blue);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: opacity 0.15s;
  white-space: nowrap;
}
.cmd-runner-btn:hover:not(:disabled) { opacity: 0.85; }
.cmd-runner-btn:disabled,
.cmd-runner-btn--busy { opacity: 0.6; cursor: not-allowed; }
```

WHY css.js (not a separate file): the dashboard has no build step; all CSS is
emitted from renderCss() in css.js and served as a single blob. Adding a separate
file would require wiring up a new static route in dashboard.js, which must stay
minimal. All prior sprint CSS additions also land in css.js.

AVOID:
- Do NOT use any hardcoded hex colors — use only var(--token) references.
- Do NOT use style attributes in the component (task 33.2.2).
- If --bg-input is not yet defined in the :root block, fall back to
  var(--bg-input, var(--bg-sidebar)) as shown — the fallback keeps it working
  without a new token.
</action>
<verify>
<automated>
cd /home/hanzla/development/rcode && node -e "
const src = require('fs').readFileSync('server/lib/html/css.js','utf8');
const checks = [
  ['.cmd-runner {', src.includes('.cmd-runner {')],
  ['.cmd-runner-select', src.includes('.cmd-runner-select')],
  ['.cmd-runner-btn', src.includes('.cmd-runner-btn')],
  ['no hardcoded hex in cmd-runner block', !src.split('.cmd-runner')[1]?.match(/#[0-9a-fA-F]{3,6}(?!fff)/)],
];
let ok = true;
for (const [l, p] of checks) { console.log((p?'OK':'FAIL')+' — '+l); if(!p)ok=false; }
if(!ok) process.exit(1);
" && node -e "
// Verify dashboard boots (loads css.js) without throwing
const css = require('./server/lib/html/css.js');
if (typeof css.renderCss !== 'function') throw new Error('renderCss not exported');
const out = css.renderCss();
if (!out.includes('.cmd-runner')) throw new Error('cmd-runner rules not in renderCss output');
console.log('OK — renderCss() includes cmd-runner rules');
"
</automated>
</verify>
<done>
- css.js renderCss() output includes .cmd-runner, .cmd-runner-select, .cmd-runner-btn rules.
- All color values use var(--...) tokens, no raw hex.
- `node -e "require('./server/lib/html/css.js').renderCss()"` runs without error.
</done>
<evidence>
grep: `rg 'cmd-runner' server/lib/html/css.js` → 0 hits before edit. This task creates the rules.
grep: `rg 'renderCss' server/lib/html/css.js` → confirms the function exists and returns
  a template literal — appending before the closing backtick is the established pattern
  (used in every prior sprint that adds CSS).
</evidence>
</task>

<task id="33.2.4" type="checkpoint:human-verify">
<title>Browser regression sweep — command picker visible, launch works, terminal opens</title>
<read_first>none</read_first>
<files></files>
<action>
Open the dashboard at http://localhost:7717. Navigate to the Orchestration tab.

Verify each item and mark pass/fail:

1. LAYOUT — A "Command Runner" section appears above the session grid (or above the
   "No agent sessions yet" empty state). It contains a dropdown and a "Run" button.

2. DROPDOWN — The dropdown lists at least 10 entries. The first entry is
   "/rcode-init — initialise project workspace" (or similar label). No JavaScript
   console errors on page load.

3. LAUNCH — Select "/rcode-init" from the dropdown. Click "Run".
   Expected:
   a. The XtermPanel terminal overlay opens immediately (title: "/rcode-init (command runner)").
   b. The terminal shows output from the Claude PTY session.
   c. A new session card appears in the Orchestration grid with storyId "cmd-rcode-init".

4. BUSY STATE — While a command is running, the Run button is briefly disabled
   ("Running…" label with a loader icon). It re-enables after ~2 s.

5. EXISTING BUTTONS — The "Run" buttons on Phase/Sprint cards in other views still
   work (no regression). Run one to confirm a separate session launches.

6. CONSOLE — No uncaught JS errors in DevTools console across any of the above steps.

7. STOP — In the Orchestration grid, the cmd-rcode-init card shows a "Stop" button
   while running. Clicking it terminates the session.

Report: pass/fail for each of the 7 items above.
</action>
<evidence>
creates: none — human verification against the live dashboard at :7717.
</evidence>
</task>

</tasks>

<verification>
- `rg 'CommandRunner' server/lib/html/client/views/OrchestrationView.js` → >= 2 hits
- `rg 'runCommandFromUI' server/lib/html/client/orchestrator.js` → >= 1 hit
- `rg 'ALLOWED_COMMANDS' server/lib/html/client/orchestrator.js` → >= 1 hit
- `rg 'cmd-runner' server/lib/html/css.js` → >= 3 hits
- `wc -l server/lib/html/client/views/OrchestrationView.js` → <= 200
- `wc -l server/lib/html/client/orchestrator.js` → <= 260
- `node -e "require('./server/lib/html/css.js').renderCss()"` → no error, output contains "cmd-runner"
</verification>

<success_criteria>
The Orchestration tab shows a command picker. Selecting /rcode-init and clicking Run
opens XtermPanel with live PTY output. The session appears in the grid with storyId
"cmd-rcode-init". Existing Run buttons on phase/sprint cards are unaffected.
</success_criteria>

<output>
Create `.planning/phases/33-dashboard-command-runner-run-init-and-rcode-commands-through-the-ui/33-2-SUMMARY.md`
</output>
