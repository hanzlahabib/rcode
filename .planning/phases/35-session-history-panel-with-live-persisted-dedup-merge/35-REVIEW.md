---
status: issues_found
phase: 35
critical: 0
high: 2
medium: 2
low: 2
generated: 2026-06-13T00:00:00Z
---

# Phase 35 Code Review — Session History Panel with Live/Persisted Dedup-Merge

## HIGH

### H1 — `handleStop` does not call `persistRun`: stopped sessions are silently dropped from history

**File:** `server/orchestrator.js:526-528`

`handleStop` calls `s.proc.kill()` and `setStatus(s, 'stopped')` then responds. It does NOT call `persistRun`. The only `persistRun` call is inside `proc.onExit` (line 500-503).

This means: when the user clicks Stop, `proc.kill()` sends SIGTERM. `node-pty`'s `onExit` fires asynchronously after the PTY drains. If the stop path works correctly, `onExit` will fire and `persistRun` will be called — so most of the time this is fine. However, the status written to the response is `'stopped'` regardless of what `onExit` actually reports. More importantly, **if `proc.kill()` throws (the `try {}` on line 526 swallows all errors) and the process was already dead, `onExit` may never fire, and the run is never persisted.**

Additionally, `setStatus` is called synchronously in `handleStop` (line 527) and will also be called again in `onExit` (line 501). This means `wsSend` fires twice on a clean stop, sending duplicate status frames to all connected WebSocket clients. The second fire (from `onExit`) overwrites the first since both produce `'stopped'`, so it is not a data corruption issue, but it is unnecessary wire traffic.

**Recommended fix:** In `handleStop`, after calling `s.proc.kill()`, do not call `setStatus` eagerly. Let `onExit` be the single authoritative path for status + persist. If immediate UI feedback before `onExit` fires is required, move `persistRun` into `handleStop` under a guard (e.g., `if (s.status === 'running') persistRun(...)`), and remove the duplicate `setStatus` call. At minimum, add a guard in `onExit` that skips `persistRun` if the entry for `storyId` is already in `history` to prevent double-append.

---

### H2 — History grows unbounded in the `history` in-memory array when a storyId is re-run

**File:** `server/orchestrator.js:244-245`

`persistRun` appends unconditionally and only trims when `history.length > HISTORY_MAX`:

```js
history.push(entry);
if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX);
```

If a storyId is re-run multiple times (e.g., `cmd-rcode-status` run 50 times), all 50 entries are stored with the same `storyId`. The client-side `mergeSessionsAndHistory` keys on `storyId` using a `Map`, so only the **last** history entry for each storyId survives the merge — all prior history entries for that storyId are silently discarded.

This means:
1. The persisted file accumulates entries that the UI will never show (they are shadowed by the most-recent entry with the same storyId).
2. The `HISTORY_MAX=200` cap is effectively much lower in terms of visible distinct runs if commands are repeated.

The server and client are not in agreement on the cardinality model: the server stores N entries per storyId; the client displays at most 1 per storyId. This is a semantic mismatch.

**Recommended fix:** Either (a) make the server deduplicate before appending — replace any existing entry with the same `storyId` in `history` rather than appending, or (b) make the client accept multiple history entries per storyId by changing the Map key from `storyId` to `storyId + ':' + startTime`. Pick one model and make both sides agree. Option (a) is simpler and matches the current client UI.

---

## MEDIUM

### M1 — `_poll` fires two concurrent HTTP requests on every 4s tick, including to `/api/history`

**File:** `server/lib/html/client/orchestrator.js:233-243`

`_poll()` runs `Promise.all([fetchSessionsWithStatus(), fetchHistory()])` on every 4-second interval. `/api/history` reads a file on disk (`~/.rcode/orch-history.json`) synchronously via `fs.readFileSync` on every GET (called from `loadHistory` at boot, but `handleHistory` at runtime returns the in-memory `history` array directly — so the HTTP cost is low). The real issue is that history changes only when a session ends: polling it every 4 seconds when no session has ended is wasteful. On a busy session, 900 `/api/history` requests per hour are made.

The content-change dedup in `_lastSessionsJson` prevents re-renders, but the network requests still fire. History should be fetched once at startup and re-fetched only when a session status changes to a terminal state (or on a longer interval, e.g., 30s).

**Recommended fix:** Separate the history fetch from the sessions poll. Fetch history once on `startSessionsPoll()` and re-fetch only when `activeSessions` shows a newly-terminal session, or use a 30s interval for history independently of the 4s sessions poll.

---

### M2 — `HistoryRow` `key` prop is placed on the outer `div`, but `key` in tagged-template Preact (htm) must be on the component call site, not the element

**File:** `server/lib/html/client/views/OrchestrationView.js:165-173`

```js
function HistoryRow({ run }) {
  return html`
    <div class="hist-row" key=${run.storyId}>
```

In htm/Preact's tagged-template syntax, `key` on the root element of a component's return value is a no-op for reconciliation purposes — `key` must be passed at the **call site** (`<${HistoryRow} key=${run.storyId} run=${run}/>`) to participate in the Preact diffing algorithm. In this phase, `HistoryRow` is already called with `key` at line 172:

```js
${runs.map(run => html`<${HistoryRow} key=${run.storyId} run=${run}/>`)}
```

So the correct `key` is in place. The redundant `key=${run.storyId}` on the inner `<div>` is inert noise that will confuse future maintainers about where Preact actually reads the key. Remove it from the `<div>`.

Note: this same pattern appears in `HistoryPanel`'s map over `STATUS_ORDER` and `dateMap.entries()` — those outer `<div key=>` usages are similarly inert but the call-site keys there do the real work.

---

## LOW

### L1 — `persistRun` uses a non-atomic write: partial writes corrupt the history file

**File:** `server/orchestrator.js:247-250`

```js
fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
```

`writeFileSync` writes directly to the target path. If the process crashes mid-write (e.g., OOM, forced kill), the file is left partially written. On the next boot, `loadHistory` will catch the `JSON.parse` error and silently return `[]`, losing all history.

The standard mitigation is write-to-temp-then-rename:
```js
const tmp = HISTORY_FILE + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(history, null, 2));
fs.renameSync(tmp, HISTORY_FILE);
```

`renameSync` is atomic on POSIX (both paths on the same filesystem, which `~/.rcode/` guarantees). The sprint plan's acceptance criteria cited atomic write; it is not implemented.

---

### L2 — `sprint 36.1` attribution comment on the `search` icon post-dates phase 35 in both icon files

**Files:** `server/lib/html/icons.js:58`, `server/lib/html/client/icons-client.js:59`

The `search` icon is annotated `// Added in sprint 36.1`. Phase 35 adds the `history` icon (line 36 in both files), which is correct. The `search` icon comment was present before this phase and is not a phase-35 change. This is not introduced by this phase, but both files carry the comment inconsistency — it should read `phase 35 / sprint 35.1` for the `history` entry, not `sprint 36.1` for search (which is already committed from a prior sprint). No action required for phase 35, but the comment drift is noted.

---

## Positive observations

- `mergeSessionsAndHistory` field-aware fallback for `durationMs` and `endTime` using nullish coalescing (`??`) is correct for the intended semantics (line 144-145, `orchestrator.js`).
- `loadHistory` try/catch returning `[]` on parse failure is correct defensive behaviour (line 228-236, `server/orchestrator.js`).
- `GET /api/history` is correctly gated behind `authed(req)` (line 575, `server/orchestrator.js`) and registered as GET-only (line 582).
- No inline styles found in `OrchestrationView.js`. All visual styling flows through `.hist-*` CSS classes in `css.js`.
- No new npm dependencies introduced. All seven modified files are pure stdlib or existing project modules.
- `server/dashboard.js` was modified in this branch, but the change (adding `/api/agents` route, commit `86d83d7`) is not part of phase 35's commit (`9add71d`). Phase 35's commit itself does not touch `dashboard.js`. The plan constraint is met for this phase's changeset.
- `HISTORY_MAX = 200` trim is placed correctly (post-push, pre-persist), preventing unbounded file growth even if the dedup issue in H2 is not fixed immediately.
