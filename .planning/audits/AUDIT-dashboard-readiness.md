# Dashboard Readiness + Feature-Gap Audit — Majlis (post-redesign)

**Scope:** `server/dashboard.js`, `server/lib/scanner.js`, `server/lib/api.js`, `server/lib/html/` (shell, css, client loader) and the Preact SPA in `server/lib/html/client/` (App, store, 12 views, dashboard slot components).
**Goal:** production-readiness "for any level of usage" — new user with empty project, small project, huge project (1000+ tasks), team lead, CI/wall screen.
**Method:** static code audit, every finding traced to file:line. Severities: **P1** = blocks a core usage level / actively misleads; **P2** = degraded but survivable; **P3** = polish.

---

## 1. Empty / Edge States

### 1.1 No `.rcode` dir → entirely fabricated dashboard — **P1**
`scanState` returns early when the dir is missing (`server/lib/scanner.js:325`) so `state.dashboard` is never built (`scanner.js:484` is unreachable). The client seed then has `project/progress/timeline/tasks/health = null` and `phases = []` (`server/lib/html/client.js:31-44`), which triggers the SAMPLE fallback in **every** overview component:

- `ProgressDonut.js:17` — fake 76% / 18-of-24 tasks donut
- `CurrentPhase.js:19-30` — fake "Phase 8 — Foundation", fake 5-step stepper
- `Timeline.js:17-27` — fake launch "2026-08-01" with countdown
- `Blockers.js:17-21` — **three fabricated blockers** ("Auth token drift", …)
- `RecentDecisions.js:16-20` — three fabricated "Approved" decisions
- `ProgressTimeline.js:17-23` — fake Planning→Launch phase track
- `ProjectHealth.js:17-28` — fake 82% "Healthy" + 7-day sparkline
- `Sidebar.js:39-42` — project "Acme AI Platform", user "Hanzla <hanzla@example.com>"
- `Topbar.js:29` — "Welcome back, Hanzla!" for any user

A brand-new user who runs the dashboard before `/rcode-init` sees a fully populated, healthy-looking project with **no indication anything is fake** and no call-to-action to initialize. The page `<title>` says "No project initialized" (`shell.js:14`) — the only honest pixel. There is no "get started" empty state on Overview at all.

### 1.2 Zero blockers shows fake blockers — **P1**
`Blockers.js:30`: `(S.blockers && S.blockers.length) ? S.blockers : SAMPLE`. A healthy project with an empty `blockers` array — the normal good case — renders the three sample blockers. Identical empty-array-means-sample bug in `RecentDecisions.js:23` (zero decisions → fake decisions) and `ProgressTimeline.js:30` (zero phases → fake phases). The fallbacks were meant for "store not seeded yet" but fire on legitimate empty data because `[]` is indistinguishable from "absent".

### 1.3 Fresh empty project scored "At risk" — **P2**
With zero stories, `pct = 0` (`scanner.js:190`) so `healthPct = 0` and `healthLabel = 'At risk'` (`scanner.js:274-275`). A just-initialized project's sidebar health card shows **0% At risk** in red. "Nothing started yet" and "project in trouble" are conflated.

### 1.4 Corrupted `state.json` is silently swallowed — **P2**
`safeReadJson` returns `{__parseError}` (`scanner.js:10-13`), `scanState` records it in `state.rawParseError` (`scanner.js:328-330`) — and **no consumer exists**: zero references to `rawParseError` anywhere in `client/`, `shell.js`, or `client.js` (verified by grep). The UI renders the no-data path (SAMPLE everywhere, §1.1) with no banner. If corruption happens mid-session, the 30s poll skips the `newState.raw` block (`components/App.js:176`) and silently keeps showing stale data. The only signal is a server-side `console.warn`.

### 1.5 `currentPhase` contract change broke legacy consumers → `[object Object]` — **P2**
`currentPhase` became the contract object `{name, status, milestones[]}` (`scanner.js:206-210`, `client.js:38`). `KanbanView.js:207` was patched (`(currentPhase && currentPhase.name) || currentPhase`) but two consumers were missed:
- `views/TasksView.js:100` — `' ' + S.currentPhase` → empty state renders ``Run `/rcode-plan [object Object]` ``
- `views/MilestonesView.js:97` — `value=${S.currentPhase || '—'}` → "Current Phase: [object Object]" in the attr grid.

### 1.6 Milestones view has no empty state — **P3**
`MilestonesView.js:116-135` always renders a single clickable "M1" card (milestone falls back to `'M1'`, also hardcoded in `api.js:176`) even when there are no phases — a 0/0 ring with "— complete". Other views (Tasks `TasksView.js:135-142`, Sprints `SprintsView.js:166-171`, Phases `PhasesView.js:178-183`, Decisions `DecisionsView.js:29-38`, Kanban `KanbanView.js:198-216`) have proper empty states with command hints — good pattern, Milestones is the outlier.

### 1.7 Missing-field tolerance — generally good — **P3**
Scanner defends with `||` fallbacks throughout (`scanner.js:235-241`, `283-291`, `405-415`); string-vs-object blockers handled (`scanner.js:236`); decisions can be plain strings (`DecisionsView.js:80-82`). No crash paths found for absent fields.

---

## 2. Error States

### 2.1 Orchestrator down is invisible — **P1**
`fetchSessions` catches everything and resolves `[]` (`client/orchestrator.js:75-89`). When the orchestrator (port 7718) is down:
- OrchestrationView shows "No active execution" — indistinguishable from idle (`OrchestrationView.js:160-167`).
- Kanban's status dot `#orch-dot` is a **static span never updated by anything** (`KanbanView.js:193,224` — no writer exists; verified by grep).
- "▶ Run" buttons everywhere look functional; clicking opens the terminal panel into a permanent "connecting" state because `runAndOpenTerm` only `console.error`s the failure (`orchestrator.js:181`). Only the CommandRunner path gets a toast (`orchestrator.js:268-276`).

There is no "orchestrator unreachable" banner, dot state, or disabled-buttons state anywhere.

### 2.2 Client orchestrator URL is hardcoded — **P2**
`ORCH_HTTP = 'http://localhost:7718'` (`client/orchestrator.js:17-18`), but the server explicitly tells users to relocate via `ORCH_PORT` on port conflict (`dashboard.js:226`). A relocated orchestrator is permanently unreachable from the client — the run/terminal feature silently dies (per §2.1, invisibly).

### 2.3 `/api/state` failure → banner exists but data goes stale silently — **P2**
The offline path is handled: red banner + status dot (`App.js:69-75`, `160`, `189-192`). Good. But all cards keep rendering the last snapshot with no staleness marker beyond the tiny status-bar "offline" text (`App.js:92`); on a wall/CI screen across the room the cards look current. Banner also lacks `role="alert"`/`aria-live` (§6.3).

### 2.4 No try/catch around the scanner in request handlers — **P2**
`handleApiState` calls `scanState` bare (`api.js:8-12`), as do `/` (`dashboard.js:131`) and `/api/hierarchy` (`api.js:154`). Scanner is defensive, but any unanticipated throw (e.g. a pathological `.planning` symlink loop in `walkPlanning`, `scanner.js:432-442`, which has **no cycle guard and no depth limit**) propagates out of the request handler and crashes the whole server process.

### 2.5 Slow scanner = slow everything, no timeout — **P3**
The scan is synchronous (§4.3), so a slow disk blocks the event loop; the client `fetch('/api/state')` has no timeout/AbortController (`App.js:159`) — a hung request leaves `refreshing: true` ("Syncing…") indefinitely until the browser gives up.

---

## 3. Loading States

### 3.1 Blank screen until CDN ESM resolves — **P1 (shared with §4/§7 CDN finding)**
`#app-root` is empty in the served HTML (`shell.js:51`); everything visible is rendered client-side after `app.js` → `preact.js` resolves **from `https://esm.sh`** (`client/preact.js:12-21`). Until that network round-trip completes the user sees a blank dark page (the SSR nav stubs are `display:none`, `shell.js:38-50`). No spinner, no skeleton, no `<noscript>`. On a CI screen or any machine without internet, the dashboard is **permanently blank** — the single hardest readiness failure for the "any level of usage" goal. Also affected: `marked` + `xterm` from jsdelivr and Google Fonts (`shell.js:21-27`) — FilesView markdown falls back to `<pre>` when marked is absent (`FilesView.js:38-41`, handled), xterm panel does not.

### 3.2 In-view loading: only FilesView and MemoryView have it — **P2**
FilesView has real skeletons and error strings (`FilesView.js:121-126`, `186-199`, `217-218`); MemoryView has a loading flag (`MemoryView.js:82`). All other views render synchronously from the seeded store — acceptable because `window.__S__` is injected server-side (`client.js:106`), but that seeding is exactly what masks empty data behind SAMPLEs (§1.1) instead of a skeleton.

### 3.3 No flash-of-sample on first load for real projects — **P3 (OK)**
Because the seed is server-rendered, a populated project never flashes sample content. The sample-flash risk exists only in the empty-data cases already covered by §1.

---

## 4. Performance

### 4.1 Full-app re-render every 4 seconds — **P1**
Two compounding defects:
1. The session poll writes a **new array identity** into the store every 4s (`orchestrator.js:152-156`: `setState({ activeSessions: sessions })`), and `setState`'s change check is reference equality (`store.js:74-79`) — so it always "changes".
2. Every mounted component subscribes to the **whole store** via `useStore()` (`store.js:120-129` — no selector), and `subscribe` callbacks clone state (`App.js:111`, `store.js:125`).

Net effect: every component in the active view re-renders every 4 seconds, forever, even when nothing changed. Same for the 30s state poll: `App.js:162` stores `lastScanned` into a ref but **never compares it** — the docstring claims "diffs lastScanned" (`App.js:7`) but the code unconditionally builds a patch of fresh object identities (`App.js:165-187`) and commits it. With 1000+ tasks, KanbanView/TasksView rebuild and re-diff every card node ~15×/min.

### 4.2 No list virtualization — **P2**
`TasksView.js:131-134`, `KanbanView.js:230-241`, `SprintsView.js:166-169`, `RoadmapView` all `.map()` the full dataset into the DOM. 1000+ tasks → 1000+ cards × re-render cadence from §4.1. No windowing, no pagination, no `content-visibility` use.

### 4.3 Scanner does a full synchronous disk walk per request — **P2**
Every `/api/state` poll (per client tab, every 30s) and every `/` load runs `scanState`, which: walks all of `.planning/` recursively (`scanner.js:431-443`); reads **every** `*-SPRINT.md` in every phase dir and regex-parses it (`buildPhaseTree`, `scanner.js:46-122`); then **re-reads the same phase dirs a second time** in the `state.phases.map` loop (`scanner.js:361-403` — duplicate `readdirSync`s and the §590 fallback re-parse). All `fs.*Sync` → blocks the event loop. No mtime-based cache, no ETag/`304`, no debounce across concurrent clients. A 100-phase/1000-file project pays the full walk ~120×/hour/tab.

### 4.4 Payload bloat — **P3**
`JSON.stringify(state, null, 2)` pretty-prints the API response (`api.js:11`, `:195`, `:201`) — roughly doubles bytes. The state also ships `context` (full text of `active.md`, `scanner.js:427`) and the entire `planningFiles` list on every poll, plus the full `ICONS` map inline in every page load (`client.js:113`).

### 4.5 Polling never backs off and ignores tab visibility — **P3**
30s state poll (`App.js:196-199`) and 4s session poll (`orchestrator.js:140-145`) run forever, including in hidden/background tabs (no `visibilitychange` handling) and while offline (no exponential backoff — fine for retry, wasteful at 4s against a dead orchestrator).

---

## 5. Responsiveness

### 5.1 Mobile sidebar toggle is broken — class-name mismatch — **P1**
CSS defines the open states as `.sidebar.open` and `#sidebar-backdrop.show` (`css.js:1905`, `:1908`). The JS toggles **different classes**: `sidebar-open`, backdrop `active`, body `sidebar-visible` (`App.js:136-138` and `:223-225`). None of the JS classes exist in the CSS (verified by grep — 0 matches for `sidebar-open`). Result: below 768px the sidebar is off-screen at `left:-240px` (`css.js:1896-1903`) and the hamburger button does nothing visible. **The entire app is unnavigable on mobile** (nav, project name, health card all live in the sidebar).

### 5.2 Redesign re-declares `.sidebar` on top of the mobile rules — **P2**
`css.js:2849+` re-declares `.sidebar` (flex, `height:100%`, padding) after the mobile block. The comment claims "later-wins per property; mobile position/transform … preserved" (`css.js:2841-2844`), but combined with §5.1 the mobile path has clearly never been exercised end-to-end since the redesign. Needs a real device pass once 5.1 is fixed.

### 5.3 Grid behavior is otherwise sane — **P3 (OK with notes)**
`dash-grid` collapses all cards to full-width at ≤1100px (`css.js:2308-2312`); progress-track stacks at ≤700px (`css.js:2849` region); topbar hides subtitle/sync chip at ≤760px (`css.js:2991-2995`). Kanban keeps 4×260px columns with horizontal scroll on mobile (`css.js:1913`) — acceptable. Gap: between 769-1100px the fixed 240px sidebar + 12-col grid leaves cards cramped; no tablet-specific tuning.

---

## 6. Accessibility

### 6.1 Focus indicators almost entirely absent — **P2**
The whole stylesheet contains **three** `:focus` rules (`css.js:829`, `:969`, `:2276`) — two filter inputs and the command-runner select, the last of which sets `outline: none` (`css.js:2277`). Every nav link, topbar button, "View all" button, kanban card, sprint/phase card, and theme toggle relies on whatever the browser default is against custom dark backgrounds; several are `<div onClick>` (e.g. `item-clickable` in `MilestonesView.js:120`) which are **not focusable at all**. No `:focus-visible` styling anywhere.

### 6.2 Keyboard support is vestigial and falsely advertised — **P2**
Server startup banner advertises "Keys: R=refresh 1-9=views F=filter" (`dashboard.js:149`) — **none of these exist**; the only key handlers in the SPA are RoadmapView's E/C expand-collapse (`RoadmapView.js:167-178`) and XtermPanel's Escape (`XtermPanel.js:133-141`). Kanban drag-and-drop (`KanbanView.js:155-184`) has no keyboard alternative. Clickable `<div>`s (§6.1) can't be reached by Tab.

### 6.3 No live-region semantics — **P3**
Toast (`shell.js:56` + `shared.js:19-25`) has no `aria-live`; OfflineBanner (`App.js:69-75`) has no `role="alert"`; "Syncing…"/"updated Ns ago" status changes are unannounced. Charts: Timeline sparkline has `role="img"` + label (`Timeline.js:86-87`) — good; ProgressDonut SVG has no text alternative (visible pct text partially compensates); ProjectHealth sparkline is `aria-hidden` with visible pct — acceptable.

### 6.4 Misc — **P3**
No skip-to-content link; active nav uses class only, no `aria-current="page"` (`Sidebar.js:84-92`); contrast of `--dash-text-muted` on `--dash-bg` and the teal-on-dark badge text are unverified against WCAG AA (needs a contrast pass); `lang="en" dir="ltr"` hardcoded (`shell.js:8`) despite the product's Arabic branding (مجلس).

---

## 7. Feature Gaps vs a Real PM Dashboard

### 7.1 Sidebar navigation points at views that don't exist — **P1**
`NAV_LINKS` (`Sidebar.js:27-36`) routes to `architecture`, `documents`, `timeline`, `integrations`, `settings` — **none are in `PREACT_VIEWS`** (`App.js:37-50`), so `parseHash` silently falls back to Overview (`App.js:64`) and the nav highlight just vanishes. Meanwhile **9 of the 12 real views** — roadmap, milestones, phases, sprints, kanban, files, agents, memory, orchestration — are unreachable from the UI; the only working nav entries are Overview, Tasks, Decisions. Users can reach the rest only by hand-typing `#kanban` etc. The redesign chrome shipped against the mockup, not the product.

### 7.2 Multi-project switcher is decorative — **P1**
The `sb-switcher` button (`Sidebar.js:75-79`) renders the project name with a dropdown chevron and a hover affordance, but has **no `onClick` and no menu**. There is no multi-project capability anywhere (server scans exactly one `RCODE_DIR`, `dashboard.js:39`). Either wire it or remove the chevron — as shipped it promises a feature that doesn't exist.

### 7.3 Dead "View all" / broken self-links — **P2**
- Blockers "View all" (`Blockers.js:36`) — no `onClick`, and no blockers view exists to link to.
- ProgressTimeline "View full timeline" → `location.hash = 'timeline'` (`ProgressTimeline.js:43-45`) → unknown view → bounces to Overview, i.e. the button reloads the view it's already on.
- CompletedTasks/InProgress/RecentDecisions "View all" → `#tasks` / `#decisions` — these work.

### 7.4 Search / filter / sort coverage — **P2 (partial)**
TasksView has text filter + status filter + sort (`TasksView.js:36-86`) — good. Sprints/Phases/Decisions have text filters. **Gaps:** no global cross-view search; no filter for the Kanban board (the view that needs it most at 1000 tasks); filter/sort state is not in the URL hash so it's lost on refresh and unshareable.

### 7.5 No task detail view / deep link — **P2**
Phases (`#phases/2`) and sprints (`#sprints/2.1`) have detail routes with breadcrumbs; tasks do not — no `#tasks/<id>` route (`TasksView` ignores `subId`), no detail panel from a kanban card. For a PM dashboard, "click a task, see its acceptance criteria/history" is table stakes.

### 7.6 Charts run on fabricated series — **P2** (see §8)
Velocity bars render only when `velocity_actual/target` exist (`PhasesView.js:31-33`, `MilestonesView.js:26-27`) — honest. But the Overview Timeline/Health sparklines synthesize their series when `velocity_history` is absent (`scanner.js:218-225`) and present them as real trends.

### 7.7 Not present at all — **P3**
Notifications (blocker added, sprint finished), data export (CSV/JSON), burndown by date (no real date axis anywhere), per-user/assignee dimension (no assignee field in the data model), kanban drag persistence (explicitly visual-only with toast, `KanbanView.js:175-179` — correct for a view-only server but means the board can't be used to manage work).

### 7.8 Remote/team access — **P3**
Server binds `127.0.0.1` only (`dashboard.js:142`). Fine for the local dev, but the "team lead checks the dashboard" and "CI screen" personas need a documented (and auth-guarded) way to expose it; today the orchestrator token is embedded in the HTML for anyone who can reach the page (`shell.js:28`).

---

## 8. Data Correctness — every fabricated/hardcoded value the UI presents as real

| # | Value shown | Source | Truth |
|---|------------|--------|-------|
| 1 | **Projected Launch date** + "In N days" | `scanner.js:226-231` — `created + 120 days` | Pure invention; comment admits "~4-month horizon when no explicit target exists". No config key for a real target is even read. |
| 2 | **"No major delays"** footer | `Timeline.js:107` — hardcoded string | Always shown, even with high-severity blockers / `onTrack=false`. |
| 3 | **"On track"** badge | `scanner.js:303` — `onTrack: blockers.length === 0` | Schedule-free heuristic; any blocker = "At risk", zero blockers = "On track" regardless of velocity. |
| 4 | **In-progress task %** (blue pills) | `scanner.js:255` — `pct: 50` for every active story; `scanner.js:266` — fallback `pct \|\| 25` | Hardcoded; no actual progress tracking exists. |
| 5 | **Project Health %** + label | `scanner.js:274-275` — `pct − 10×blockers`, thresholds 80/50 | Invented composite; the sidebar presents it as a measured KPI. |
| 6 | **Health/Timeline sparkline series** | `scanner.js:218-225`, `276-278` — synthesized from phase-done counts when no `velocity_history` | A fabricated "trend" with fake axis labels (P1, P2, …). |
| 7 | **Decision status "Approved"** | `scanner.js:287` — `status: d.status \|\| 'Approved'` | Every status-less decision gets a green Approved badge (`RecentDecisions.js:24-29`). |
| 8 | **User name/greeting** | `scanner.js:295-297` — server OS `process.env.USER`, capitalized | "Welcome back, Root!" on a root shell; not project config. Email defaults to `''` or sample `hanzla@example.com` (`Sidebar.js:41`). |
| 9 | **All SAMPLE constants** | §1.1 list — 8 components + Sidebar/Topbar | Render as real data whenever a slice is null/empty; nothing marks them as placeholders. |
| 10 | **Story statuses in phase tree** | `scanner.js:92,106` — `phaseComplete ? 'done' : 'todo'` | All-or-nothing per phase: a 90%-done active phase shows every story "todo"; donut/stepper/kanban all inherit this distortion. |
| 11 | **Milestone "M1"** | `api.js:176`, `MilestonesView.js` | Hardcoded fallback presented as a real milestone. |
| 12 | **CurrentPhase "milestones" stepper** | `scanner.js:203-205` — neighbouring *phases* relabeled as the current phase's milestones when it has no sprints | Mislabeled data. |
| 13 | **"Active development phase"** subtitle | `CurrentPhase.js:81` — hardcoded | Shown even when the "current" phase is `planned` (the find() falls through to first todo / last phase, `scanner.js:194-196`). |

---

## TOP-10 PRIORITIZED FIX LIST

1. **P1 — Kill the SAMPLE-as-real-data pattern.** Distinguish "not yet loaded" from "legitimately empty" in every dashboard component (`Blockers.js:30`, `RecentDecisions.js:23`, `ProgressTimeline.js:30`, `ProgressDonut.js:17`, `CurrentPhase.js`, `Timeline.js`, `ProjectHealth.js`, `Sidebar.js:39-42`, `Topbar.js:29`); render honest empty states ("No blockers 🎉", "Run /rcode-init to get started") and add a first-run Overview state when `.rcode` is missing (`scanner.js:325`).
2. **P1 — Vendor the client runtime.** Serve preact/htm (and xterm/marked/fonts) from `/js/` instead of esm.sh/jsdelivr (`client/preact.js:12-21`, `shell.js:21-27`); add a minimal SSR loading shell in `#app-root`. Without this, offline/air-gapped/CI usage is a blank page.
3. **P1 — Fix the sidebar nav.** Remove or implement the five dead links and expose the nine orphaned real views (`Sidebar.js:27-36` vs `App.js:37-50`); make the project switcher functional or visually inert (`Sidebar.js:75-79`).
4. **P1 — Fix mobile.** Align the toggle classes (`App.js:136-138,223-225` → `.sidebar.open`/`#sidebar-backdrop.show` at `css.js:1905-1909`), then do a real ≤768px pass over the redesigned chrome.
5. **P1 — Stop the 4s/30s full-app re-renders.** Compare `lastScanned` before patching (`App.js:162`), deep-compare or hash `activeSessions` before `setState` (`orchestrator.js:152-156`), and add slice-level subscription (selector arg to `useStore`, `store.js:120-129`). Then add list virtualization or pagination to Tasks/Kanban for the 1000+ case (§4.2).
6. **P2 — Make failure visible.** Surface `rawParseError` as a banner (§1.4); add an orchestrator-reachable indicator + disable Run buttons when down, and wire or delete the dead `#orch-dot` (§2.1); make `ORCH_HTTP` configurable/injected (§2.2); wrap request handlers in try/catch and add a cycle/depth guard to `walkPlanning` (§2.4).
7. **P2 — Fix the `[object Object]` regressions** at `TasksView.js:100` and `MilestonesView.js:97` (currentPhase is now an object), and audit remaining `currentPhase` consumers.
8. **P2 — Cache the scanner.** Mtime-keyed cache (or short TTL) for `scanState`, deduplicate the double phase-dir walk (`scanner.js:46-122` vs `:361-403`), drop pretty-printed JSON (`api.js:11`), and stop shipping `context` full text + `planningFiles` on every poll.
9. **P2 — Stop fabricating metrics.** Remove or clearly label launch date, health %, on-track, 50% in-progress, "Approved" default, "No major delays", synthesized sparklines (§8 items 1-8). Show "—" / "not tracked" instead; an honest dashboard beats a confident fake one.
10. **P2 — Accessibility baseline.** Add `:focus-visible` styles for all interactive chrome, convert clickable `<div>`s to buttons, `aria-current` on nav, `role="alert"` on OfflineBanner + `aria-live="polite"` on toast, a keyboard path for kanban, and either implement or remove the advertised R/1-9/F shortcuts (`dashboard.js:149`).

---

*Audit performed 2026-06-12 on branch `dash-g1-audit` (worktree g1-audit). View-only audit; no code was modified.*
