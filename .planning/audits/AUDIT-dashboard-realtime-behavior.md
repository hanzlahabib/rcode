# Audit: "When will the dashboard show real-time status of tasks/milestones/sprints/phases being executed OR planned?"

Date: 2026-08-11
Scope: `server/dashboard.js`, `server/lib/scanner.js`, `server/orchestrator.js`, `server/lib/html/client/**`
Method: direct source read, no assumptions. Every claim below is cited to a file:line.

---

## Short answer

- **Live agent terminal output (execute or plan, if run through the dashboard's own terminal): real-time**, via WebSocket, with no delay.
- **The orchestrator's session list** (which sessions/agents are running, blocked, idle): near-real-time, polled every **4 seconds**.
- **The summary panels — phases, sprints, milestones, tasks, progress %, backlog, decisions, blockers**: these are on a **client-side 30-second poll**, and the server itself does a **fresh filesystem re-scan on every request** (not a background interval) — so the true worst-case staleness for those panels is **up to 30 seconds**, never longer, as long as the tab stays open.
- **Planning activity (`/rcode-plan` running `rcode-phase-researcher` → `rcode-planner`) is invisible to the phase/sprint/milestone panels until a `SPRINT.md` file is written to disk or `state.json`'s phase status is updated** — both of which happen only *after* planning completes, not while it's running. It is only visible in real time if the planning session itself is launched through the dashboard's own orchestrator terminal (same WebSocket path as execute), which is a different, separate UI surface (Orchestration/Pipeline view), not the phase/sprint/milestone summary cards.

Details and citations below, organized by your five investigation points.

---

## 1. Polling/refresh architecture: client poll vs. server background scan vs. per-request scan

**It is per-request server-side scanning, gated by a request-level cache — not a server background interval.**

- The server has **no `setInterval` that re-scans in the background**. `server/dashboard.js` only starts an HTTP server (`server/dashboard.js:73`) and an auto-spawned orchestrator child process (`server/dashboard.js:229-267`); there is no scheduled re-scan job anywhere in `dashboard.js` or `scanner.js`.
- Every `GET /` and every `GET /api/state` calls `scanState(RCODE_DIR)` directly (`server/dashboard.js:109-112`, `server/dashboard.js:182-188`), which reads `.rcode/state.json`, `.rcode/config.yaml`, `.rcode/HANDOFF.json`, `.rcode/context/active.md`, `.rcode/board-overrides.json`, and every `.md` file under `.planning/phases/` (`server/lib/scanner.js:457-635`) fresh, on that request.
- `scanState()` wraps this in a **short-lived cache**, not a background poll (`server/lib/scanner.js:637-692`):
  - A 2-second TTL fast-path (`SCAN_TTL_MS = 2000`, `server/lib/scanner.js:648`) — dedupes the burst of `/` + `/api/state` calls that happen on a single page load, or multiple tabs hitting the server within the same 2s window.
  - An mtime+size **signature check** (`scanSignature`, `server/lib/scanner.js:656-676`) — if none of the watched files changed since the last scan, the cached state object (with its original `lastScanned` timestamp) is returned instead of re-parsing everything, which is a performance optimization, not a staleness window: a request arriving after the 2s TTL still triggers a fresh `stat()` pass, and if anything changed, a full re-scan happens immediately.

**Conclusion for point 1**: "Refresh: 30s soft poll" (printed at `server/dashboard.js:200`) describes the *client's* auto-refresh cadence, not server staleness. The server has zero background staleness of its own (beyond the 2-second dedupe cache) — it reflects disk state as of the moment each request lands. The true bottleneck is exactly what the client's fetch loop decides to do, which is the 30s interval described in point 2.

---

## 2. What's genuinely real-time (WebSocket) vs. on the 30s poll — confirming/correcting your assumption

Your assumption is correct, with more precision:

**Three distinct refresh tiers exist in the client, not two:**

1. **WebSocket (true real-time, push-based)** — the live agent terminal (xterm.js panel). `server/lib/html/client/components/XtermPanel.js:98-126` opens a `WebSocket` to `/ws/<storyId>` and streams PTY output (`ws.onmessage`, line 112) as it's produced by the orchestrator's spawned agent process (`server/orchestrator.js:709` `attachWebSocket`, and the WS upgrade route at `server/orchestrator.js:798-807`). This is the only genuinely push-based, sub-second-latency channel in the whole dashboard.

2. **4-second poll (`/api/sessions`)** — near-real-time. `server/lib/html/client/orchestrator.js:277-279` starts `setInterval(_poll, 4000)`; `_poll()` (line 287) calls `GET /api/sessions` (server handler `server/orchestrator.js:782`) and writes the result into `store.activeSessions`. This drives: the Orchestration view's Agents/Pipeline cards (`OrchestrationView.js:1-17` — explicitly documented as "fed by /api/sessions... at 4s intervals"), the Sidebar's active-session indicators (`Sidebar.js:67-70`), the dashboard's `ProgressDonut`/`InProgress` cards on the Overview (`ProgressDonut.js:20`, `InProgress.js:15` — both explicitly note they are "refreshed by the 4s poll" and never fetch on their own), and the Kanban orchestrator-reachability dot (`KanbanView.js:120-121`).

3. **30-second poll (`/api/state`)** — this is what drives phases/sprints/milestones/tasks/progress/decisions/blockers/backlog. `server/lib/html/client/components/App.js:242-245`: `setInterval(fetchAndRerender, 30000)`. `fetchAndRerender` (`App.js:186-239`) calls `GET /api/state` and patches the store with `phases`, `progress`, `currentPhase`, `tasks`, `health`, `backlog`, `decisions`, `blockers`, `milestone`, `currentSprint` (`App.js:213-233`) — i.e., every panel your question is about.

**Correction to your assumption**: it's not just "tasks/phases/milestones/sprints on 30s poll, terminal on WS" — there's a middle tier. The orchestrator's live-session state (which agent/story is currently running/blocked/idle, and the Overview's "in progress" donut/list) updates every 4s, not 30s. Only the *filesystem-derived* project structure (phase list, sprint list, story counts, decisions, blockers, backlog) is on the 30s cycle.

---

## 3. Is planning-phase activity (rcode-plan → rcode-phase-researcher → rcode-planner) visible before a SPRINT.md exists?

**No — not on the phase/sprint/milestone panels. There is no "planning in progress" signal anywhere in the scanner.**

- `scanner.js`'s `toState()` (`server/lib/scanner.js:242-246`) — the single function that maps a phase's status string to the UI's `done | active | todo` — only recognizes: `complete|done` → done; `active|in_progress|progress|executing` → active; everything else (including no status, or a hypothetical `"planning"`/`"researching"` value) → **todo**. There is no `planning` or `researching` branch.
- Confirmed against the actual `/rcode-plan` workflow source: `rcode/workflows/plan.md:805` — "After plans pass all gates, **record that planning is complete** so STATE.md reflects the new phase status" — i.e., `state.json`'s phase status field is written **only after** planning finishes and gates pass, not while `rcode-phase-researcher` or `rcode-planner` are actively running. There is no intermediate "planning started" write.
- `buildPhaseTree()` (`server/lib/scanner.js:113-222`), which derives the sprint list shown in the UI, only produces sprint rows when it finds `*-SPRINT.md` files on disk (`server/lib/scanner.js:132`: `files.filter(f => /-SPRINT\.md$/i.test(f))`). Before the planner writes a `SPRINT.md`, that phase has **zero sprints** in the tree — nothing to show as "planning in progress," just an absence.
- The only planning-adjacent artifact the scanner reads is `.rcode/context/active.md` (`server/lib/scanner.js:603-616`), which is surfaced as a byte count / line count / mtime under `memoryBank.active` — not as a phase-tree state, and it isn't rendered as "planning in progress" anywhere in the phase/sprint/milestone views (only used in the Memory Bank view's summary line).

**Where planning activity IS visible**: if `/rcode-plan` is launched as a session through the dashboard's own orchestrator (the same `POST /api/run` + WebSocket mechanism used for execute — `server/orchestrator.js:502-638`, generic over any `storyId`/`cmd`, not execute-specific), it becomes a live PTY session and appears in the Orchestration view's Pipeline/Agents cards on the 4-second poll, with live terminal output over WebSocket — exactly like an execute session would. But this is the **raw terminal transcript of the planning agent**, surfaced in a separate UI area (Orchestration view), not integrated into the phase/sprint/milestone summary cards. If planning is instead run outside the dashboard (e.g. directly in a Claude Code session, which is the common case), it produces **no dashboard signal at all** until `SPRINT.md` lands or `state.json` is updated.

**Conclusion for point 3**: Planning is invisible to the Overview/Phases/Sprints/Milestones panels for its entire duration. The dashboard has no data source that represents "a planner is currently working on phase N" — only "a SPRINT.md now exists" (after the fact) or "phase status is now X" (also after the fact, written at completion per `plan.md:805`).

---

## 4. Can the 30s poll interval be reduced for the demo?

**No config option, no query param, no env var exists. It is a hardcoded literal.**

- Searched the entire client tree (`server/lib/html/client/`, excluding vendored Preact) for `30000`, `pollInterval`, `REFRESH_MS`, and any config/query-param plumbing: the only hit is the literal `30000` at `server/lib/html/client/components/App.js:243`. Same search for the 4s poll: the only hit is the literal `4000` at `server/lib/html/client/orchestrator.js:279`.
- No `URLSearchParams` read, no `window.__CONFIG__`-style injected value, no environment variable feeds either interval. Both are plain numeric literals in `setInterval(fn, N)` calls.
- **For the demo**, the only ways to get faster updates without a code change are: (a) click the dashboard's manual refresh action, if one exists in the UI (`fetchAndRerender` is registered via `registerRefresh` at `App.js:249-251`, implying a manual-refresh button/hotkey calls the same function — worth confirming in the running UI before the demo), or (b) edit `App.js:243`'s `30000` literal to a smaller number (e.g. `5000`) as a temporary demo-only change and restart the dashboard. That is a one-line, low-risk edit, but it is a code change, not a runtime toggle — flagging it as a recommendation rather than making it, per your instruction not to fix things during this diagnose-only pass.

---

## 5. Other real-time gaps found while reading this code

- **No page-visibility handling.** Neither `App.js`'s 30s timer nor `orchestrator.js`'s 4s timer check `document.hidden`/`visibilitychange` (confirmed by grep — zero matches for `visibilitychange` or `document.hidden` anywhere in the client tree outside vendor code). Both `setInterval` calls run unconditionally once mounted. In practice, browsers throttle/deprioritize `setInterval` in backgrounded tabs (commonly to ~1/min after the tab has been hidden for a while), so a dashboard tab left in the background during a demo could lag well past 30s until it's brought back into focus — there is no code-level fallback (like `visibilitychange` triggering an immediate re-fetch) to compensate. **Recommendation**: if the demo involves switching away from the dashboard tab and back, do a manual refresh (or reload) right before showing it, since the background-tab poll cadence is not guaranteed.
- **Silent staleness on repeated identical scans.** When the server's mtime signature says nothing changed, `App.js:196-201` intentionally skips the store patch and only bumps the "updated Xs ago" display — this is correct behavior (avoids needless re-renders), not a bug, but it means the "Updated Ns ago" text resets on every poll tick regardless of whether real data changed, which could visually suggest more freshness than actually occurred. This is minor and not worth flagging as a fix.
- **Network failure handling exists and is reasonable**: on a failed `/api/state` fetch, the client sets `offline: true` and shows a banner (`App.js:82`, `App.js:236-238`), but keeps retrying via the same 30s interval — it does not back off or speed up, so if the dashboard server briefly restarts (e.g., mid-demo), the reconnect could take up to 30s.
- **No manual "refresh now" affordance was found to be verified live** — `registerRefresh(fetchAndRerender)` (`App.js:249-251`) suggests one exists elsewhere in the UI, but this audit did not trace every consumer of `registerRefresh`; recommend clicking through the running dashboard once before the demo to confirm a manual refresh control is present and wired correctly, rather than assuming from this one call site.

---

## Direct answer to the literal question

**"When will the dashboard show real-time status of tasks, milestones, sprints, phases being executed OR being planned?"**

- **Executed** phases/sprints/tasks: the summary cards (Overview, Phases, Sprints, Milestones, Tasks) reflect execution progress **within 30 seconds** of a `state.json` update or a `SUMMARY.md`/`SPRINT.md` file change on disk (client poll cadence, `App.js:243`), because the server itself has no meaningful staleness beyond that (per-request scan, `server/dashboard.js:109-112` + `scanner.js:678-692`). The *fact that an agent is currently running* (as opposed to file-level progress) is visible **within 4 seconds** via the Orchestration view and Overview in-progress cards (`orchestrator.js:279`), and the agent's live output is visible **instantly** via WebSocket (`XtermPanel.js:108`) — but only for sessions launched through the dashboard's own orchestrator, not for `/rcode-execute` runs started from an external terminal (those still only surface via the 30s file-scan and, if state.json/SPRINT.md tracks them, the 4s session poll won't show them at all since they were never registered as orchestrator sessions).
- **Planned** (in-flight `/rcode-plan` / researcher / planner activity): **never**, on the phase/sprint/milestone panels, for the entire duration of planning — there is no on-disk or in-memory signal the scanner reads that means "planning is in progress." The panels only update once planning finishes and either writes a `SPRINT.md` (making sprints appear) or updates `state.json`'s phase status (`rcode/workflows/plan.md:805`). If planning is run through the dashboard's own terminal (like an execute session would be), its raw output is visible in real time in the Orchestration view specifically — but that is not the same as the tasks/milestones/sprints/phases panels updating.
