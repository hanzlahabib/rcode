---
phase: 37-phase-dependency-graph-and-structured-rejection-dialogs
plan_number: 2
sprint: 37.2
type: execute
wave: 2
depends_on: [37-1]
sequential: true
sequential_after: 37-1
conflicting_files: [server/lib/html/css.js]
autonomous: true
requirements: [GATE-1, GATE-2]
files_modified:
  - server/orchestrator.js
  - server/lib/html/client/orchestrator.js
  - server/lib/html/client/components/RejectDialog.js
  - server/lib/html/client/views/OrchestrationView.js
  - server/lib/html/css.js
must_haves:
  truths:
    - When a session is waiting for input, the user can click a Reject button on its card and a dialog opens.
    - The reject dialog requires a non-empty reason — the submit button stays disabled until a reason is typed.
    - After the user submits a rejection, the reason is sent to the orchestrator service and persisted to disk against that session's storyId.
    - A previously submitted rejection reason for a session is readable later and shown on the session card.
  artifacts:
    - server/lib/html/client/components/RejectDialog.js exists as a new Preact dialog component.
    - server/orchestrator.js exposes POST /api/reject and GET /api/rejections, persisting to ~/.rihal/rejections.json.
  key_links:
    - RejectDialog submit calls a new submitRejection() in client orchestrator.js which POSTs to ORCH_HTTP + /api/reject with the orchestrator Bearer token.
    - orchestrator.js /api/reject reuses the existing authed() token gate — no new auth surface, no write endpoint on dashboard.js.
    - OrchestrationView OrchCard renders the Reject button only for sessions where s.waiting is true; recorded rejections come back via GET /api/rejections merged into the sessions poll.
---

<objective>
Add structured rejection dialogs at checkpoint gates: a Preact dialog that captures a required reason, and orchestrator-side persistence that records the reason against the run for later review.
Purpose: GATE-1 (structured reject dialog with a captured reason) and GATE-2 (reasons recorded against the run/phase, reviewable later).
Output: a `RejectDialog` component, a `submitRejection`/`fetchRejections` client API, a `POST /api/reject` + `GET /api/rejections` endpoint pair on the orchestrator with JSON-file persistence, and supporting CSS.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
</context>

<grounding_notes>
Verified before planning:
- `grep -rn "reject\|checkpoint" server/lib/html/client/` → ZERO hits. No rejection UI and no checkpoint concept exists today — this is greenfield within an existing surface.
- The only "checkpoint" signal that exists is `s.waiting` on a session — `handleSessions` in server/orchestrator.js (line 181) sets `waiting: s.status === 'running' && idleMs > IDLE_THRESHOLD_MS`. OrchestrationView OrchCard reads `s.waiting` (OrchestrationView.js:23). The reject dialog attaches to a waiting session card.
- No dialog/modal component exists — `grep -in "modal\|dialog" server/lib/html/css.js` → only the `#sidebar-backdrop` overlay (css.js:255-261) and `.toast` (css.js:1020-1041). RejectDialog is a brand-new component; project rule forbids `alert()`/`confirm()`.
- `showToast(msg)` exists in components/shared.js (lines 18-24) — reuse it for the post-submit confirmation.
- server/orchestrator.js routing is a flat if-chain in `http.createServer` (lines 350-353); `authed(req)` (lines 92-108) gates every request via the Bearer token. New endpoints slot into the same chain behind the same gate. `parseBody(req)` (lines 118-124) and `json(res, code, body)` (lines 84-87) helpers exist.
- orchestrator.js already requires `path` and `crypto`; it does NOT require `fs` or `os` — both must be added for persistence.
- client orchestrator.js has `ORCH_HTTP` (line 16), `orchToken()` (line 22), and a fetch+Bearer pattern reused across runSession/stopSession (lines 43-62). `submitRejection` follows the same shape.
- OrchestrationView already imports from `../orchestrator.js` (line 15) and from `../icons-client.js` (line 17). Icon `square` exists for a reject glyph; no `x-circle` icon — use `square` or `alert-triangle` (alert-triangle exists in icons-client.js).
- The session poll `_poll()` (client orchestrator.js lines 151-155) writes `activeSessions` into the store. To surface recorded rejections, `_poll` also fetches `/api/rejections` and merges a `rejection` field onto matching sessions by `storyId`.
</grounding_notes>

<tasks>

<task id="37.2.1" type="auto">
<title>Add POST /api/reject and GET /api/rejections with JSON-file persistence to the orchestrator</title>
<read_first>
- server/orchestrator.js (full file — focus on helpers lines 84-124, handleStop 271-280, route chain 350-353)
</read_first>
<files>
server/orchestrator.js
</files>
<interfaces>
- `function authed(req)` → boolean. Already gates every HTTP request.
- `function parseBody(req)` → `Promise<object>`.
- `function json(res, code, body)` → writes a JSON response.
- `function validStoryId(id)` → boolean. Reuse to validate the rejection's `storyId`.
- Route chain pattern (lines 350-353): `if (method === 'POST' && pathOnly === '/api/...') { await handleX(req, res); return; }`.
</interfaces>
<action>
1. At the top of orchestrator.js add `const fs = require('fs');` and `const os = require('os');` alongside the existing requires (lines 27-29).
2. Define `const REJECTIONS_PATH = path.join(os.homedir(), '.rihal', 'rejections.json');` near the other path constants (~line 44).
3. Add `readRejections()`:
   - Read `REJECTIONS_PATH`; `JSON.parse`; if the file is missing or malformed, return `[]`.
   - Return the parsed array.
4. Add `appendRejection(entry)`:
   - `readRejections()`, push `entry`, ensure the `~/.rihal` directory exists with `fs.mkdirSync(dir, { recursive: true })`, then `fs.writeFileSync(REJECTIONS_PATH, JSON.stringify(list, null, 2))`.
   - Wrap the write in try/catch; on failure return `false`, else `true`.
5. Add `async function handleReject(req, res)`:
   - `parseBody`; read `storyId`, `reason`, optional `phase`.
   - `if (!validStoryId(storyId)) return json(res, 400, { error: 'invalid storyId' })`.
   - `const text = String(reason || '').trim(); if (!text) return json(res, 400, { error: 'reason required' });` — server-side enforcement of GATE-1's required-reason rule.
   - Cap the reason length: `if (text.length > 2000) return json(res, 400, { error: 'reason too long' });`.
   - Build `entry = { storyId, phase: phase || null, reason: text, ts: new Date().toISOString() }`.
   - `if (!appendRejection(entry)) return json(res, 500, { error: 'could not persist rejection' });`.
   - `json(res, 200, { ok: true, entry });`.
6. Add `function handleRejections(res)` → `json(res, 200, { rejections: readRejections() })`.
7. Register both routes in the if-chain after `/api/clean-sessions` (line 353):
   - `if (method === 'POST' && pathOnly === '/api/reject') { await handleReject(req, res); return; }`
   - `if (method === 'GET' && pathOnly === '/api/rejections') { handleRejections(res); return; }`
Both sit behind the existing `authed(req)` gate (line 346) — no new auth surface. dashboard.js is NOT touched.
</action>
<acceptance_criteria>
- `grep -q "/api/reject" server/orchestrator.js` exits 0.
- `grep -q "/api/rejections" server/orchestrator.js` exits 0.
- `grep -q "REJECTIONS_PATH" server/orchestrator.js` exits 0.
- `grep -q "reason required" server/orchestrator.js` exits 0.
- `node --check server/orchestrator.js` exits 0.
- `git diff --name-only server/dashboard.js` shows no change (dashboard.js untouched).
</acceptance_criteria>
<verify>
<automated>
node --check server/orchestrator.js && grep -q "'/api/reject'" server/orchestrator.js && grep -q "'/api/rejections'" server/orchestrator.js && grep -q "REJECTIONS_PATH" server/orchestrator.js && grep -q "reason required" server/orchestrator.js && test -z "$(git diff --name-only -- server/dashboard.js)"
</automated>
</verify>
<done>The orchestrator accepts an authenticated POST /api/reject that rejects empty reasons and persists each rejection to ~/.rihal/rejections.json, readable via GET /api/rejections.</done>
</task>

<task id="37.2.2" type="auto">
<title>Add submitRejection/fetchRejections to the client orchestrator API and merge rejections into the poll</title>
<read_first>
- server/lib/html/client/orchestrator.js (full file — ORCH_HTTP line 16, orchToken line 22, runSession 43-50, stopSession 55-62, _poll 151-155)
</read_first>
<files>
server/lib/html/client/orchestrator.js
</files>
<interfaces>
- `ORCH_HTTP` (line 16), `orchToken()` (line 22).
- `runSession(storyId, cmd)` — the fetch+Bearer template to copy.
- `_poll()` (lines 151-155) — currently `fetchSessions().then(sessions => setState({ activeSessions: sessions }))`.
- `setState` from store.js.
</interfaces>
<action>
1. Add `export function submitRejection(storyId, reason, phase)`:
   - `const tok = orchToken();`
   - `return fetch(ORCH_HTTP + '/api/reject', { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, reason, phase: phase || null }) }).then(r => r.json());`
2. Add `export function fetchRejections()`:
   - `const tok = orchToken(); if (!tok) return Promise.resolve([]);`
   - `return fetch(ORCH_HTTP + '/api/rejections', { headers: { 'Authorization': 'Bearer ' + tok } }).then(r => r.ok ? r.json().then(d => (d && d.rejections) || []) : []).catch(() => []);`
3. Modify `_poll()` so the sessions list carries any recorded rejection:
   - `Promise.all([fetchSessions(), fetchRejections()]).then(([sessions, rejections]) => { const byId = {}; for (const r of rejections) byId[r.storyId] = r; const merged = sessions.map(s => byId[s.storyId] ? { ...s, rejection: byId[s.storyId] } : s); setState({ activeSessions: merged }); });`
Keep the existing 4 s interval and the single-poll guard untouched.
</action>
<acceptance_criteria>
- `grep -q "export function submitRejection" server/lib/html/client/orchestrator.js` exits 0.
- `grep -q "export function fetchRejections" server/lib/html/client/orchestrator.js` exits 0.
- `grep -q "/api/reject" server/lib/html/client/orchestrator.js` exits 0.
- `node --input-type=module --check < server/lib/html/client/orchestrator.js` exits 0.
</acceptance_criteria>
<verify>
<automated>
node --input-type=module --check < server/lib/html/client/orchestrator.js && grep -q "export function submitRejection" server/lib/html/client/orchestrator.js && grep -q "export function fetchRejections" server/lib/html/client/orchestrator.js && grep -q "/api/reject" server/lib/html/client/orchestrator.js
</automated>
</verify>
<done>The client can POST a rejection and the session poll annotates any session that has a recorded rejection with a `rejection` field.</done>
</task>

<task id="37.2.3" type="auto">
<title>Build the RejectDialog Preact component with required-reason validation</title>
<read_first>
- server/lib/html/client/components/shared.js (showToast lines 18-24, component-export convention)
- server/lib/html/client/preact.js (available exports — html, useState, useEffect)
- server/lib/html/client/orchestrator.js (submitRejection — added in 37.2.2)
</read_first>
<files>
server/lib/html/client/components/RejectDialog.js
</files>
<creates>
server/lib/html/client/components/RejectDialog.js — no existing dialog/modal component exists (verified: only #sidebar-backdrop overlay and .toast). A dedicated component is required because the project rule forbids alert()/confirm().
</creates>
<interfaces>
- `import { html, useState } from '../preact.js';`
- `import { submitRejection } from '../orchestrator.js';`
- `import { showToast } from './shared.js';`
- Props contract: `RejectDialog({ session, onClose })` — `session` is an OrchCard session object (`{ storyId, phase?, ... }`); `onClose` is a callback that clears the dialog from the parent's state.
</interfaces>
<action>
1. Create `RejectDialog({ session, onClose })`:
   - `const [reason, setReason] = useState('');`
   - `const [busy, setBusy] = useState(false);`
   - `const trimmed = reason.trim();` — submit is disabled when `!trimmed || busy` (GATE-1: reason required before submitting).
2. `handleSubmit()`:
   - guard `if (!trimmed || busy) return;`
   - `setBusy(true);`
   - `submitRejection(session.storyId, trimmed, session.phase).then(d => { if (d && d.ok) { showToast('Rejection recorded'); onClose(); } else { showToast('Reject failed: ' + ((d && d.error) || 'unknown')); setBusy(false); } }).catch(() => { showToast('Could not reach orchestrator'); setBusy(false); });`
3. Markup:
   - A full-screen overlay `<div class="reject-overlay" onClick=${onClose}>` containing a `<div class="reject-dialog" onClick=${e => e.stopPropagation()}>` (click-outside closes, click-inside does not).
   - Header: `<div class="reject-dialog-title">Reject checkpoint — ${session.storyId}</div>`.
   - A `<textarea class="reject-dialog-input">` bound to `reason` via `onInput`, with `placeholder="Why is this checkpoint being rejected? (required)"` and `autofocus`.
   - A footer with two buttons: `<button class="reject-cancel" onClick=${onClose}>Cancel</button>` and `<button class="reject-submit" disabled=${!trimmed || busy} onClick=${handleSubmit}>${busy ? 'Recording…' : 'Submit rejection'}</button>`.
   - An Escape-to-close handler via a `useEffect` keydown listener (cleanup on unmount).
4. Export the component: `export function RejectDialog(...)`.
Do NOT use `alert()`/`confirm()`. Do NOT use the `style` attribute — all visuals come from classes added in 37.2.5.
</action>
<acceptance_criteria>
- `test -f server/lib/html/client/components/RejectDialog.js` exits 0.
- `grep -q "export function RejectDialog" server/lib/html/client/components/RejectDialog.js` exits 0.
- `grep -q "disabled=" server/lib/html/client/components/RejectDialog.js` exits 0 (submit is gated).
- `grep -Eq "alert\(|confirm\(" server/lib/html/client/components/RejectDialog.js` exits 1 (no browser dialogs).
- `node --input-type=module --check < server/lib/html/client/components/RejectDialog.js` exits 0.
</acceptance_criteria>
<verify>
<automated>
test -f server/lib/html/client/components/RejectDialog.js && node --input-type=module --check < server/lib/html/client/components/RejectDialog.js && grep -q "export function RejectDialog" server/lib/html/client/components/RejectDialog.js && grep -q "disabled=" server/lib/html/client/components/RejectDialog.js && ! grep -Eq "alert\(|confirm\(" server/lib/html/client/components/RejectDialog.js
</automated>
</verify>
<done>A Preact RejectDialog component renders an overlay with a reason textarea whose Submit button is disabled until a non-empty reason is entered.</done>
</task>

<task id="37.2.4" type="auto">
<title>Wire the Reject button and recorded-rejection display into OrchestrationView OrchCard</title>
<read_first>
- server/lib/html/client/views/OrchestrationView.js (full file — OrchCard lines 21-62, imports 13-17)
- server/lib/html/client/components/RejectDialog.js (created in 37.2.3)
</read_first>
<files>
server/lib/html/client/views/OrchestrationView.js
</files>
<interfaces>
- `OrchCard({ session: s })` — `s` has `status`, `waiting`, `storyId`, `cmd`, and after 37.2.2 optionally `rejection` (`{ reason, ts }`).
- `RejectDialog({ session, onClose })` from `../components/RejectDialog.js`.
- `Icon` from `../icons-client.js` — use `alert-triangle` (verified to exist).
</interfaces>
<action>
1. Add `import { RejectDialog } from '../components/RejectDialog.js';` to the import block (after the icons-client import, line 17).
2. In `OrchCard`, add `const [showReject, setShowReject] = useState(false);` (`useState` is already imported, line 13).
3. In the `orch-card-actions` row (lines 52-59): when `waiting` is true, render a third button after Terminal — `<button class="term-run-btn danger" onClick=${e => { e.stopPropagation(); setShowReject(true); }}><${Icon} name="alert-triangle" size=${14}/> Reject</button>`. The Reject button shows ONLY for waiting (checkpoint) sessions — `${waiting ? html\`...\` : null}`.
4. When `s.rejection` exists, render a `<div class="orch-card-rejection">` below `orch-card-meta` showing `Rejected: ${s.rejection.reason}` — this is the GATE-2 "visible later" surface.
5. At the end of `OrchCard`'s returned tree, conditionally mount the dialog: `${showReject ? html\`<${RejectDialog} session=${s} onClose=${() => setShowReject(false)}/>\` : null}`.
Do NOT use the `style` attribute. Do NOT change the session sort logic or CommandRunner.
</action>
<acceptance_criteria>
- `grep -q "RejectDialog" server/lib/html/client/views/OrchestrationView.js` exits 0.
- `grep -q "orch-card-rejection" server/lib/html/client/views/OrchestrationView.js` exits 0.
- `grep -q "showReject" server/lib/html/client/views/OrchestrationView.js` exits 0.
- `node --input-type=module --check < server/lib/html/client/views/OrchestrationView.js` exits 0.
</acceptance_criteria>
<verify>
<automated>
node --input-type=module --check < server/lib/html/client/views/OrchestrationView.js && grep -q "RejectDialog" server/lib/html/client/views/OrchestrationView.js && grep -q "orch-card-rejection" server/lib/html/client/views/OrchestrationView.js && grep -q "showReject" server/lib/html/client/views/OrchestrationView.js
</automated>
</verify>
<done>A waiting session card shows a Reject button that opens the dialog, and a card with a recorded rejection shows its reason inline.</done>
</task>

<task id="37.2.5" type="auto">
<title>Add design-token CSS for the reject overlay, dialog, and recorded-rejection row</title>
<read_first>
- server/lib/html/css.js (lines 255-261 — #sidebar-backdrop overlay; lines 1020-1041 — Toast block)
</read_first>
<files>
server/lib/html/css.js
</files>
<action>
Append a `/* ── Reject dialog ── */` block to the CSS string. Add rules for:
- `.reject-overlay` — `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; display: flex; align-items: center; justify-content: center;` (z-index above #sidebar-backdrop's 15 and header's 10; matches the established overlay tint convention from #sidebar-backdrop).
- `.reject-dialog` — `background: var(--bg-elev-2); border: 1px solid var(--border); border-radius: var(--radius-3); box-shadow: var(--shadow-lg); padding: var(--space-5); width: min(480px, 90vw);`.
- `.reject-dialog-title` — `font-size: var(--text-md); font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-3);`.
- `.reject-dialog-input` — `width: 100%; min-height: 96px; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border); border-radius: var(--radius-2); padding: var(--space-2); font-family: var(--font-sans); resize: vertical;`.
- A footer row class `.reject-dialog-actions` — `display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4);`.
- `.reject-cancel` and `.reject-submit` — reuse the existing `.term-run-btn` look (grep `.term-run-btn` in css.js and mirror padding/radius); `.reject-submit:disabled` — `opacity: 0.5; cursor: not-allowed;`.
- `.orch-card-rejection` — `margin-top: var(--space-2); font-size: var(--text-xs); color: var(--accent-red); border-left: 2px solid var(--accent-red); padding-left: var(--space-2);`.
Verify each token name with `grep -n "<token>" server/lib/html/css.js` before use — every token above (`--bg-elev-2`, `--border`, `--radius-2`, `--radius-3`, `--shadow-lg`, `--bg-input`, `--font-sans`, `--accent-red`, `--text-md`, `--text-xs`, `--text-primary`, the `--space-*` set) was confirmed present in css.js. If any is absent, fall back to the closest existing token rather than inventing a name.
</action>
<acceptance_criteria>
- `grep -q "reject-overlay" server/lib/html/css.js` exits 0.
- `grep -q "reject-dialog" server/lib/html/css.js` exits 0.
- `grep -q "orch-card-rejection" server/lib/html/css.js` exits 0.
- `node --check server/lib/html/css.js` exits 0.
- `node server/dashboard.js` boots and serves `/` (kill after start).
</acceptance_criteria>
<verify>
<automated>
node --check server/lib/html/css.js && grep -q "reject-overlay" server/lib/html/css.js && grep -q "reject-dialog" server/lib/html/css.js && grep -q "orch-card-rejection" server/lib/html/css.js && timeout 4 node server/dashboard.js >/dev/null 2>&1 & sleep 2 && curl -s localhost:7717 >/dev/null && echo BOOT_OK
</automated>
</verify>
<done>The reject dialog, overlay, and recorded-rejection row render with theme-consistent styling driven by design tokens.</done>
</task>

</tasks>

<verification>
- `node --check server/orchestrator.js` and `node --input-type=module --check` on all three client modules exit 0.
- `node server/dashboard.js` starts clean on :7717; `git diff --name-only -- server/dashboard.js` is empty (view-only boundary intact).
- A manual orchestrator round-trip: `POST /api/reject` with an empty reason returns 400 `reason required`; with a real reason returns 200 and the entry appears in `GET /api/rejections` and in `~/.rihal/rejections.json`.
- The Orchestration view shows a Reject button on waiting sessions and the recorded reason on a session that has one.
</verification>

<success_criteria>
- GATE-1 satisfied: the user rejects a checkpoint through a structured Preact dialog that requires a reason before the Submit button is enabled — no browser `alert()`/`confirm()`.
- GATE-2 satisfied: submitted reasons are persisted to `~/.rihal/rejections.json` by the orchestrator and surfaced back on the session card for later review.
- No new write endpoint on `dashboard.js`; the orchestrator reuses its existing `authed()` Bearer-token gate.
- No new dependency, no build step.
</success_criteria>

<output>
Create `.planning/phases/37-phase-dependency-graph-and-structured-rejection-dialogs/37-2-SUMMARY.md`
</output>
