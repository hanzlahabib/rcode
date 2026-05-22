---
phase: 33-dashboard-command-runner-run-init-and-rcode-commands-through-the-ui
sprint: 33.3
plan_number: 3
type: execute
wave: 3
depends_on: [33.2]
files_modified:
  - server/lib/html/client/views/OrchestrationView.js
  - server/lib/html/client/orchestrator.js
  - server/lib/html/css.js
autonomous: true
requirements: [phase-33-goal]
must_haves:
  truths:
    - "Running a command that is already in-progress shows a visual indicator (session card badge or Run button disabled) rather than spawning a duplicate 409 session."
    - "When /api/run returns an error (403, 409, 503), the user sees a toast notification with the error text — not a silent failure."
    - "The command picker label reads 'Command Runner' with an Icon name='terminal' — no emoji, consistent with the SVG icon set from phase 32."
    - "All cmd-runner CSS uses only var(--token) references — no raw hex, no raw pixel spacing outside existing token scale."
    - "The dashboard at :7717 passes a full Orchestration-tab regression with no console errors."
  artifacts:
    - "server/lib/html/client/views/OrchestrationView.js — CommandRunner aware of running cmd sessions"
    - "server/lib/html/client/orchestrator.js — runCommandFromUI() surfaces errors via toast"
    - "server/lib/html/css.js — cmd-runner styles fully token-clean (audit pass)"
  key_links:
    - "runAndOpenTerm() at orchestrator.js:165 calls runSession() which returns the parsed JSON; errors land in the .catch() at line 180."
    - "showToast() is exported from shared.js:18-24 — import it in orchestrator.js to surface errors."
    - "isSessionRunning(storyId) is orchestrator.js:104-107 — use it in CommandRunner to disable the Run button when the derived storyId is already running."
    - "409 from POST /api/run means the session is already running (orchestrator.js:177-180)."
---

<objective>
Polish sprint: harden CommandRunner error handling, add running-state awareness to
the Run button, and sweep the phase-33 code for CSS token cleanliness and
consistency with the phase-32 design system.

Purpose: Sprint 33.2 delivered the happy path. This sprint closes the edge cases —
duplicate runs, server errors, CSS token gaps — so the feature is production-ready.

Output: CommandRunner with error toasts on /api/run failures, Run button disabled
while the derived session is already running, and a confirmed clean CSS token audit
for all cmd-runner rules.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/33-dashboard-command-runner-run-init-and-rcode-commands-through-the-ui/33-2-SUMMARY.md
</context>

<tasks>

<task id="33.3.1" type="auto">
<title>Surface /api/run errors as toasts in runCommandFromUI()</title>
<read_first>
server/lib/html/client/orchestrator.js (lines 155-end, the runAndOpenTerm block and runCommandFromUI)
server/lib/html/client/components/shared.js (lines 17-24, showToast)
</read_first>
<files>server/lib/html/client/orchestrator.js</files>
<action>
Read both files first. Then make two edits to orchestrator.js:

EDIT 1 — Add a dynamic import of showToast at the top of orchestrator.js, alongside
the existing store import. The import already exists in shared.js; add to
orchestrator.js:

Find the import block at the top (lines 13-16):
```js
import { getState, setState } from './store.js';
```

Add after it:
```js
import { showToast } from './components/shared.js';
```

WHY: showToast is the established pattern for user-visible error feedback
(shared.js:18-24). It uses the existing #toast DOM element already wired in the
dashboard HTML. No new UI component needed.

EDIT 2 — Rewrite runCommandFromUI() to call runSession() directly (instead of
delegating via runAndOpenTerm which swallows errors) and show a toast on failure:

Replace the current runCommandFromUI body with:

```js
export function runCommandFromUI(cmd) {
  if (!cmd) return;
  const slug    = cmd.replace(/^\//, '').replace(/\//g, '-');
  const storyId = 'cmd-' + slug;
  const title   = cmd + ' (command runner)';

  // Open the terminal panel immediately so the user gets visual feedback.
  setState({
    terminal: { open: true, storyId, title, minimized: false, fullscreen: false },
  });

  const tok = orchToken();
  if (!tok) { showToast('No orchestrator token — restart the dashboard'); return; }

  runSession(storyId, cmd)
    .then(data => {
      // 409 = already running (not an error — terminal is already attached).
      if (data && data.error && !data.error.includes('already running')) {
        showToast('Command error: ' + data.error);
      }
    })
    .catch(() => showToast('Could not reach orchestrator'));
}
```

WHY explicit runSession() call instead of runAndOpenTerm(): runAndOpenTerm's
runSession() call uses `.catch(() => {})` (line 180) which swallows all errors.
The new version needs to inspect the response to show error toasts. The terminal
state is set the same way as before (setState block) so XtermPanel behaviour is
identical.

AVOID:
- Do NOT modify runAndOpenTerm — it is used by other callers (RunBtn, runStory).
- Do NOT add a new import for runSession — it is already in scope in the file.
- Do NOT exceed 280 lines total in orchestrator.js after edits.
</action>
<verify>
<automated>
cd /home/hanzla/development/rcode && node -e "
const src = require('fs').readFileSync('server/lib/html/client/orchestrator.js','utf8');
const checks = [
  ['showToast import', src.includes(\"import { showToast } from './components/shared.js'\")],
  ['toast on error', src.includes('showToast(')],
  ['409 allowed through', src.includes('already running')],
  ['runSession called', src.includes('runSession(storyId, cmd)')],
  ['setState terminal open', src.includes('open: true')],
];
let ok = true;
for (const [l,p] of checks){console.log((p?'OK':'FAIL')+' — '+l);if(!p)ok=false;}
const lines = src.split('\n').length;
console.log('Lines: '+lines+(lines<=280?' (OK)':' (EXCEEDS 280 — FAIL)'));
if(!ok||lines>280)process.exit(1);
"
</automated>
</verify>
<done>
- orchestrator.js imports showToast from shared.js.
- runCommandFromUI() calls showToast on non-409 errors and on network failure.
- 409 "already running" response does NOT show an error toast.
- runAndOpenTerm is unchanged.
- File under 280 lines.
</done>
<evidence>
lines: server/lib/html/client/orchestrator.js:165-181 — runAndOpenTerm, the function
  whose error handling this task improves by splitting the concern into runCommandFromUI.
lines: server/lib/html/client/orchestrator.js:180 — `.catch(() => {})` — confirms
  runAndOpenTerm silently swallows errors; justifies the separate call in runCommandFromUI.
lines: server/lib/html/client/components/shared.js:18-24 — showToast() definition;
  already used by CmdHint copy action, safe to import here.
lines: server/orchestrator.js:177-180 — the 409 path in handleRun() that fires when
  a session is already running — the client must not show this as an error.
</evidence>
</task>

<task id="33.3.2" type="auto">
<title>Disable Run button in CommandRunner when the session is already running</title>
<read_first>
server/lib/html/client/views/OrchestrationView.js (full file — post Sprint 33.2 state)
server/lib/html/client/orchestrator.js (lines 97-107, isSessionRunning)
</read_first>
<files>server/lib/html/client/views/OrchestrationView.js</files>
<action>
Read both files first. Then edit OrchestrationView.js:

EDIT 1 — Update the orchestrator import to include isSessionRunning:

Find the line:
```js
import { stopSession, openTermPanel, runCommandFromUI, ALLOWED_COMMANDS } from '../orchestrator.js';
```

Add isSessionRunning:
```js
import { stopSession, openTermPanel, runCommandFromUI, ALLOWED_COMMANDS, isSessionRunning } from '../orchestrator.js';
```

EDIT 2 — Update the useStore import to also pull activeSessions, so CommandRunner
can react when a cmd session starts or stops. CommandRunner currently has no store
subscription. Add useStore to its scope:

In CommandRunner(), add at the top of the function body:
```js
  const { activeSessions } = useStore();
```

WHY useStore inside CommandRunner: isSessionRunning() reads activeSessions from
getState() (a snapshot). But we need the component to RE-RENDER when the session
starts/stops. useStore() subscribes to activeSessions changes, triggering a
re-render each time the 4 s poll updates sessions — which updates the disabled state.

EDIT 3 — Derive isRunning from the selected command inside CommandRunner, and apply
it to the button:

After the `const [busy, setBusy] = useState(false);` line, add:
```js
  const slug      = selected ? selected.replace(/^\//, '').replace(/\//g, '-') : '';
  const sessionId = slug ? 'cmd-' + slug : '';
  const isRunning = sessionId ? isSessionRunning(sessionId) : false;
  const disabled  = busy || isRunning;
```

Update the button to use disabled:
```js
        <button class=${'cmd-runner-btn' + (disabled ? ' cmd-runner-btn--busy' : '')}
          onClick=${handleRun}
          disabled=${disabled}>
          ${isRunning
            ? html`<${Icon} name="hourglass" size=${14}/> Running…`
            : busy
              ? html`<${Icon} name="hourglass" size=${14}/> Starting…`
              : html`<${Icon} name="play" size=${14}/> Run`}
        </button>
```

WHY two disabled states (busy vs isRunning): busy is the 2-second local cooldown
after clicking Run. isRunning is the authoritative server-side state — the button
stays disabled while the PTY session is alive, re-enabling once it completes.

AVOID:
- Do NOT add a new poll timer inside CommandRunner — the global 4 s poll
  (startSessionsPoll in orchestrator.js:138-142) already keeps activeSessions fresh.
- Do NOT exceed 210 lines total in OrchestrationView.js after edits.
</action>
<verify>
<automated>
cd /home/hanzla/development/rcode && node -e "
const src = require('fs').readFileSync('server/lib/html/client/views/OrchestrationView.js','utf8');
const checks = [
  ['isSessionRunning import', src.includes('isSessionRunning')],
  ['useStore in CommandRunner', (src.match(/useStore/g)||[]).length >= 1],
  ['isRunning derived', src.includes('isRunning')],
  ['disabled prop applied', src.includes('disabled=\${disabled}')],
  ['activeSessions destructured', src.includes('activeSessions')],
];
let ok = true;
for (const [l,p] of checks){console.log((p?'OK':'FAIL')+' — '+l);if(!p)ok=false;}
const lines = src.split('\n').length;
console.log('Lines: '+lines+(lines<=210?' (OK)':' (EXCEEDS 210 — FAIL)'));
if(!ok||lines>210)process.exit(1);
"
</automated>
</verify>
<done>
- isSessionRunning imported from orchestrator.js.
- CommandRunner derives sessionId from selected command slug.
- Button is disabled when isRunning || busy.
- Button label changes: "Running…" when isRunning, "Starting…" when busy, "Run" otherwise.
- File under 210 lines.
</done>
<evidence>
lines: server/lib/html/client/orchestrator.js:104-107 — isSessionRunning() reads
  activeSessions from getState(); this task makes CommandRunner subscribe via useStore
  so it re-renders when the poll fires.
lines: server/lib/html/client/orchestrator.js:138-142 — startSessionsPoll() keeps
  store.activeSessions fresh every 4 s; CommandRunner reacts to this automatically.
lines: server/orchestrator.js:177-180 — 409 response for already-running session;
  this UI change makes it rare because the button is disabled while running.
</evidence>
</task>

<task id="33.3.3" type="auto">
<title>CSS token audit — verify all cmd-runner rules use var(--token) only</title>
<read_first>server/lib/html/css.js (the cmd-runner block added in Sprint 33.2)</read_first>
<files>server/lib/html/css.js</files>
<action>
Read the cmd-runner block in css.js (added by Sprint 33.2). Run a focused grep to
confirm no raw hex or raw pixel spacing literals exist in the block:

```bash
# Extract the cmd-runner block and check for raw literals
node -e "
const src = require('fs').readFileSync('server/lib/html/css.js','utf8');
const start = src.indexOf('.cmd-runner {');
const end   = src.indexOf('\n/* ──', start + 1) || src.length;
const block = src.slice(start, end);
const hexHits = (block.match(/#[0-9a-fA-F]{3,6}\b/g) || []).filter(h => h !== '#fff');
const rawPx   = (block.match(/:\s*\d+px/g) || []);
console.log('hex hits (excl #fff):', hexHits);
console.log('raw px:', rawPx);
if (hexHits.length > 0) throw new Error('Raw hex found in cmd-runner CSS');
if (rawPx.length > 0) throw new Error('Raw px found in cmd-runner CSS: ' + rawPx);
console.log('OK — all cmd-runner rules use var(--token) only');
"
```

If any raw literal is found, replace it with the appropriate var(--token) reference.
Consult the :root block in css.js (lines 9-112) for available tokens.

Common mappings (from the phase-32 token set — verify each exists in :root before
using):
- 12px → var(--text-xs) or var(--space-3)
- 14px → var(--text-sm)
- 16px → var(--space-4)
- 4px  → var(--space-2) or var(--radius-sm)
- 8px  → var(--space-3) (if --space-3 = 8px in the scale)
- #fff → acceptable in button text (white on blue) — leave as-is

If ALL checks pass with no changes needed, commit a no-op for this task with the
audit output as evidence.

AVOID:
- Do NOT change any CSS rule outside the cmd-runner block.
- Do NOT add new :root tokens unless a raw literal cannot be expressed by an
  existing token — check first.
</action>
<verify>
<automated>
cd /home/hanzla/development/rcode && node -e "
const src = require('fs').readFileSync('server/lib/html/css.js','utf8');
const start = src.indexOf('.cmd-runner {');
if (start === -1) { console.error('cmd-runner block not found'); process.exit(1); }
const block = src.slice(start, src.indexOf('\n}', src.lastIndexOf('.cmd-runner-btn--busy')) + 2);
const hexHits = (block.match(/#[0-9a-fA-F]{3,6}\b/g) || []).filter(h => h !== '#fff');
const rawPx   = (block.match(/:\s*\d+px/g) || []);
console.log('Hex hits (excl #fff):', hexHits.length ? hexHits : 'none');
console.log('Raw px:', rawPx.length ? rawPx : 'none');
if (hexHits.length > 0) { console.error('FAIL — raw hex'); process.exit(1); }
if (rawPx.length > 0) { console.error('FAIL — raw px'); process.exit(1); }
console.log('OK — cmd-runner CSS is token-clean');
"
</automated>
</verify>
<done>
- `grep` on the cmd-runner block finds zero raw hex values (except #fff on the Run button, which is intentional for white text on blue).
- Zero raw pixel spacing values outside token references.
- Audit output logged and included in SUMMARY.
</done>
<evidence>
lines: server/lib/html/css.js — cmd-runner block added in Sprint 33.2 (task 33.2.3).
grep: `rg '#[0-9a-fA-F]' server/lib/html/css.js` → baseline of known hex exceptions
  in css.js are the glass-effect rgba values. The cmd-runner block must add no new
  raw hex values (except #fff on the Run button, which is intentional).
creates: no new files — this is an audit task over the cmd-runner CSS block.
</evidence>
</task>

<task id="33.3.4" type="checkpoint:human-verify">
<title>Full phase-33 regression sweep — error handling, disabled state, no console errors</title>
<read_first>none</read_first>
<files></files>
<action>
Open the dashboard at http://localhost:7717. Open DevTools console before loading.
Navigate to the Orchestration tab.

Run each check and mark pass/fail:

1. ERROR TOAST — In the browser console, run:
   ```js
   fetch('http://localhost:7718/api/run', {
     method: 'POST',
     headers: { 'Authorization': 'Bearer ' + window.__ORCH_TOKEN__, 'Content-Type': 'application/json' },
     body: JSON.stringify({ storyId: 'cmd-rcode-badcmd', cmd: '/rcode-badcmd' }),
   }).then(r => r.json()).then(console.log)
   ```
   Then from the command picker, select any command and click Run — confirm a toast
   notification appears when the server rejects a non-allowlisted cmd (simulate by
   temporarily selecting a cmd that would be rejected — or observe that /rcode-init
   does NOT produce an error toast).

2. DISABLED STATE — Click Run for /rcode-init. Confirm the Run button shows
   "Starting…" and is disabled for ~2 s. After the session starts, confirm the button
   label changes to "Running…" (driven by isSessionRunning) and remains disabled
   while the session is active. Once the session finishes (done/exited), confirm the
   button re-enables and shows "Run" again.

3. DUPLICATE RUN PREVENTION — While /rcode-init is running (button shows "Running…"),
   confirm clicking the button has no effect (disabled). A 409 from the server should
   NOT produce an error toast (it means "already running" which is expected).

4. EXISTING BUTTONS UNAFFECTED — Navigate to Phases or Roadmap view. Confirm Run
   buttons on phase/sprint cards still work. Return to Orchestration — both session
   types (cmd-* and phase-*/sprint-*) appear in the grid.

5. NO CONSOLE ERRORS — Zero uncaught errors or unhandled promise rejections in the
   DevTools console across all of the above steps.

6. STOP WORKS — A cmd-* session card shows a "Stop" button while running. Clicking
   it terminates the session within 5 s (status changes to "stopped").

Report: pass/fail for each of the 6 items above. Include any console error text if
item 5 fails.
</action>
<evidence>
creates: none — human verification against the live dashboard at :7717.
</evidence>
</task>

</tasks>

<verification>
- `rg 'showToast' server/lib/html/client/orchestrator.js` → >= 2 hits (import + call)
- `rg 'isSessionRunning' server/lib/html/client/views/OrchestrationView.js` → >= 1 hit
- `rg 'isRunning' server/lib/html/client/views/OrchestrationView.js` → >= 1 hit
- `node -e "..."` CSS audit script exits 0 (no raw hex/px in cmd-runner block)
- `wc -l server/lib/html/client/views/OrchestrationView.js` → <= 210
- `wc -l server/lib/html/client/orchestrator.js` → <= 280
- `node server/orchestrator.js` boots clean (no new errors)
- `node server/dashboard.js` boots clean (no new errors; no new endpoints added)
</verification>

<success_criteria>
The command runner shows a toast on server errors (403, 503, network failure).
The Run button is disabled and labeled "Running…" while the PTY session for the
selected command is active. The feature passes a full in-browser regression sweep
with zero console errors and no regressions to existing phase/sprint run buttons.
</success_criteria>

<output>
Create `.planning/phases/33-dashboard-command-runner-run-init-and-rcode-commands-through-the-ui/33-3-SUMMARY.md`
</output>
