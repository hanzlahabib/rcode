# Dashboard Redesign — Gap Audit (current → target mockup)

**Audit type:** AUDIT ONLY — no code changed.
**Target spec:** `.planning/campaign/MOCKUP-SPEC.md`
**Scope:** the Majlis dashboard under `server/` (server-render chrome + Preact client).

This document enumerates **every gap** between what the dashboard renders today
and the target mockup. It covers: (1) missing dashboard sections/cards,
(2) data the scanner does not yet expose, (3) styling gaps vs the design tokens,
and (4) the exact shape `GET /api/state` must return.

All references are `file:line`.

---

## 0. Architecture context (what exists today)

- HTTP server + routing: `server/dashboard.js` (250 lines). `GET /api/state` is wired
  at `server/dashboard.js:72-75` → `handleApiState`.
- `GET /api/state` handler: `server/lib/api.js:8-12` — returns the **entire raw
  `scanState()` dump** verbatim (`JSON.stringify(state, null, 2)`). It is NOT a
  curated UI contract.
- State scanner: `server/lib/scanner.js` (375 lines). `scanState()` at
  `server/lib/scanner.js:124-298` builds the state object.
- HTML shell: `server/lib/html/shell.js` (70 lines). Mounts Preact into `#app-root`
  (`shell.js:53`). Title is "Majlis — …" (`shell.js:23`).
- Client seed: `server/lib/html/client.js:23-44` (`clientState()`) injects
  `window.__S__` with the fields the Preact store reads.
- Design tokens (CSS): `server/lib/html/css.js:11-126` (`:root` + `[data-theme="light"]`).
- Icons: `server/lib/html/icons.js:16-56` (ICONS map).
- Root Preact component: `server/lib/html/client/components/App.js`.
- Landing view: `server/lib/html/client/views/OverviewView.js`.
- Sidebar / Topbar: `server/lib/html/client/components/Sidebar.js`,
  `.../components/Topbar.js`.
- Store: `server/lib/html/client/store.js`.

**Bottom line:** the current dashboard is a "Linear-style" dark IDE panel
(brand "Majlis — The Council", `Topbar.js:33`) with a vertically-stacked Overview.
The target is a **navy analytics dashboard** with a 12-col card grid, donut, steppers,
and charts. None of the 7 target cards exist today.

---

## 1. Missing sections / cards (target Row 1–3 vs current)

Target layout (`MOCKUP-SPEC.md:20-23`): 12-col grid, gap 20px, three rows:
- Row 1: **Project Progress (donut)**, **Current Phase (stepper)**, **Timeline (line chart)**
- Row 2: **Completed Tasks (list)**, **In Progress (list + % badges)**, **Blockers (by severity)**
- Row 3: **Recent Decisions (list + Approved badges)**, **Progress Timeline (horizontal phases)**

Current Overview (`OverviewView.js:246-260`) renders a single vertical column:
`StatusSummary` 4 stat tiles + `VelocitySpark` + `HandoffBanner` + `SprintProgress`
+ `MemorySection` + `CouncilSessions` + `ChainsSection` + `LastSession` + `CmdHints`.

| # | Target card | Status today | Evidence / gap |
|---|-------------|--------------|----------------|
| 1 | **Project Progress — donut** | ❌ Missing | No donut/ring anywhere. Only a flat `ProgressBar` exists (`OverviewView.js:89`, defined in `components/shared.js`). No SVG arc/conic chart. No aggregate "% of all stories done across project". |
| 2 | **Current Phase — milestone stepper** | ❌ Missing | `StatusSummary` shows current phase as a single tile (`OverviewView.js:50-57`). No multi-step stepper, no per-step "done/active/upcoming" states. Note bug: `S.currentPhase` is a **phase name string** ("Dashboard command runner"), not an id, so `String(p.id) === String(S.currentPhase)` at `OverviewView.js:43-45` never matches → tile shows "—". |
| 3 | **Timeline — line chart** | ⚠ Partial/wrong | Only a velocity **sparkline** exists (`OverviewView.js:100-115`, `VelocitySpark`), gated on `>1` sprint with `velocity_actual` set. Real data has 1 entry (`velocity_history`), so it renders nothing. No axes, no dates, no labelled line chart. |
| 4 | **Completed Tasks — list** | ❌ Missing | No "recently completed tasks" card. `allTasks()` exists (`util.js:52-58`) but Overview never lists done tasks. |
| 5 | **In Progress — list + % badges** | ❌ Missing | No in-progress task list. `SprintProgress` (`OverviewView.js:77-97`) shows only the **current sprint's** aggregate %, not a per-task list with per-item % badges. |
| 6 | **Blockers — by severity** | ❌ Missing | No blockers card at all on Overview. `StatusSummary` shows a "Blocked Tasks" count tile (`OverviewView.js:63-67`) computed from task status, not from `state.blockers`. No High/Medium/Low grouping, no severity colors. `state.blockers` is scanned (`scanner.js:240-242`) but never surfaced as a card. |
| 7 | **Project Health — mini-card (sidebar)** | ❌ Missing | Sidebar (`Sidebar.js:62-85`) has only project label + nav + counts. No health mini-card. No health metric is computed anywhere. |
| 8 | **Recent Decisions — list + Approved badges** | ❌ Missing on Overview | Decisions live only on the dedicated `DecisionsView.js`. Overview has no decisions card. No "Approved" status badge exists — decision objects carry `summary/phase/date` only (`scanner.js:236-238`, sample: `{summary, phase, plan, date}`), no `status`/`approved` field. |
| 9 | **Progress Timeline — horizontal phases** | ❌ Missing | No horizontal phase timeline. `RoadmapView`/`PhasesView` show lists, not a horizontal timeline ribbon. |
| 10 | **Header: "Welcome back, {name}!" + Ask/Share/… + "Auto-synced 2m ago"** | ❌ Missing | Current Topbar (`Topbar.js:19-54`) shows brand "Majlis — The Council", a live dot, "updated N ago", Refresh, Theme, Link buttons. No welcome greeting, no **Ask rcode** button, no **Share** button, no "…" overflow. (`MOCKUP-SPEC.md:6` explicitly allows a new `POST /api/ask` + Share — neither endpoint exists; `dashboard.js:63-138` has no `/api/ask` route.) |
| 11 | **Sidebar: project switcher "Acme AI Platform" + user profile footer** | ❌ Missing | Sidebar shows static "rcode" label + projectName (`Sidebar.js:64-67`). No project switcher control. No user profile footer (avatar + name + email). Target nav set (`MOCKUP-SPEC.md:17`: Overview/Tasks/Decisions/Architecture/Documents/Timeline/Integrations/Settings) differs from current nav (`Sidebar.js:15-43`: Overview/Orchestration/Roadmap/Milestones/Phases/Sprints/Tasks/Kanban/Files/Agents/Decisions/Memory). No Architecture / Documents / Timeline / Integrations / Settings views exist. |

---

## 2. Data the scanner does NOT yet expose

`scanState()` (`server/lib/scanner.js:124-298`) and the client seed
(`client.js:23-44`) are missing fields each target card needs. The components are
required to be **pure / prop-driven** (`MOCKUP-SPEC.md:26-27`), so every value below
must be computed server-side and returned by `/api/state`.

| Target card | Missing data | Where it must be added |
|-------------|--------------|------------------------|
| Progress donut | Aggregate project counts — `{ storiesDone, storiesTotal, pct }` across ALL phases. Per-phase `storiesDone`/`stories` exist (`scanner.js:204-206, 222-232`) but are never summed. | new top-level `progress` object in `scanState()` |
| Current Phase stepper | An **ordered phase list with per-phase status + which is "current"**. `state.phases` exists (`scanner.js:171-233`) but `current_phase` is stored as a **name string** ("Dashboard command runner"), not an id — there is no reliable "active phase index". Stepper also needs phase ordinal/label per step. | resolve `currentPhaseId` in `scanState()`; expose `phases[].order` |
| Timeline line chart | A dated series. `velocity_history` is `[{sprint, points, completed_at}]` (1 entry in real data) — not exposed in the client seed at all (`client.js:23-44` omits it). No cumulative "stories completed over time" series exists. | add `velocity_history` (and/or a derived `timeline` series) to seed + `/api/state` |
| Completed Tasks list | A flat "recently done tasks with dates" list. Stories have `id/title/status` (`scanner.js:89-96`) but **no completion date** and no project-wide sorted "recent" list. | derive `recentCompletedTasks` server-side |
| In Progress list | Per-task `status:'in_progress'` + per-task percent. Stories are only `done`/`todo` (`scanner.js:92`, `204`) — there is **no in_progress status** and no per-task percentage. | needs richer story status in scanner |
| Blockers by severity | Severity field. `state.blockers` is filtered to strings/`{title}` only (`scanner.js:240-242`) — **no `severity` field** is read or normalized (target needs High/Medium/Low per `MOCKUP-SPEC.md:12`). Blockers are also **omitted from `client.js` seed** (`client.js` injects `blockers` at the store but Overview never groups them). | normalize `blockers[].severity` in scanner |
| Project Health | A health score/metric. **Nothing computes health today.** Needs e.g. `{ score, label, signals }` derived from blockers + velocity + on-track phases. | net-new derivation in `scanState()` |
| Recent Decisions + Approved badge | Decision `status`/`approved`. Decision objects are `{summary, phase, plan, date}` (`scanner.js:236-238`) — **no approval status**. | scanner must read/emit `decisions[].status` |
| Progress Timeline (phases) | Per-phase `started`/`completed` dates for horizontal placement. `completed_at` exists per phase (`scanner.js:230`) but `started`/order are not consistently exposed. | expose `phases[].started`/`completed`/`order` |
| Sidebar Project Health + profile | User identity (name, email, avatar) + project list for switcher. **None scanned** — no user identity source, no multi-project registry in `scanState()`. | new `user` + `projects` shape (or documented static) |
| Header greeting + "Auto-synced" | `user.name` for "Welcome back, {name}!" and a `lastScanned` already exists (`scanner.js:140`) but is not surfaced as a relative "synced Xm ago" in the seed. | add `user.name`; reuse `lastScanned` |

---

## 3. Styling gaps vs the design tokens (`MOCKUP-SPEC.md:8-14`)

Current tokens live in `server/lib/html/css.js:11-126`. They are a **Linear dark**
palette and do not match the target navy/teal system.

| Token (target) | Target value | Current value | File:line |
|----------------|--------------|---------------|-----------|
| Background base | `#0F1729` (deep navy) | `--bg-page: #08090a` (near-black) | `css.js:13` |
| Card surface | `#0E1626` / `#111A2E` | `--bg-elev-2: #161718` | `css.js:15` |
| Card border | `#1E2A44` (1px) | `--border-default: #23252a` | `css.js:23` |
| Card radius | `14px` | `--radius-5: 12px` (max) — no 14px token | `css.js:81-86` |
| Accent teal | `#2DD4BF` | none — brand is `--accent-primary: #5e6ad2` | `css.js:33` |
| Accent purple | `#A78BFA` | `--violet: #bf7af0` (different) | `css.js:44` |
| Accent blue | `#3B82F6` | `--blue: #26b5ce` (cyan, different) | `css.js:43` |
| Accent amber | `#F59E0B` | `--amber: #f2c94c` (yellower) | `css.js:41` |
| Severity High | `#F87171` | `--red: #eb5757` (close, not exact) | `css.js:42` |
| Severity Medium | `#FBBF24` | `--status-progress: #f2c94c` | `css.js:48` |
| Severity Low | `#9CA3AF` | none (no neutral-gray severity token) | — |
| Text primary | `#E6EDF7` | `--text-primary: #f7f8f8` | `css.js:27` |
| Text muted | `#8595AD` | `--text-muted: #62666d` | `css.js:30` |
| Card "subtle inner glow" | required (`MOCKUP-SPEC.md:10`) | only `--shadow-lg` outer shadow exists | `css.js:89` |

**Other style gaps:**
- No 12-col grid utility. Overview uses ad-hoc `.stats`/`.stat`/`section` blocks
  (`OverviewView.js:247-259`); target is a 12-col grid, gap 20px (`MOCKUP-SPEC.md:15`).
- **Inline `style=` attributes are pervasive** (`App.js:71-94, 218`; `OverviewView.js:50-244`;
  `Topbar.js:40-46`; `DecisionsView.js:77-84`) — target hard rule bans inline styles
  (`MOCKUP-SPEC.md:30`); they must move to CSS classes/tokens.
- Sidebar is 240px in spec (`MOCKUP-SPEC.md:16`); current `.sidebar` width is set in
  `css.js` (not 240 — verify/realign).
- Brand string "Majlis — The Council" (`Topbar.js:33`) / title "Majlis — …"
  (`shell.js:23`) vs target sidebar logo "rcode" + greeting header.

---

## 4. Exact shape `GET /api/state` must return

Today `GET /api/state` (`api.js:8-12`) returns the raw `scanState()` object — a large
internal dump (keys: `exists, projectName, raw, rawParseError, phases, decisions,
blockers, councilSessions, milestone, currentPhase, currentSprint, planningFiles,
context, lastScanned, projectRoot, phaseTree, pendingHandoff, memoryBank`). Per
`MOCKUP-SPEC.md:25-27`, components are pure and read a **single curated shape**. The
endpoint must return (or add) the following so every target card is prop-driven:

```jsonc
{
  "project":   { "name": "Acme AI Platform", "switcherOptions": ["…"] },  // sidebar switcher + header greeting
  "user":      { "name": "…", "email": "…", "avatar": "…" },              // sidebar footer + "Welcome back, {name}!"
  "syncedAt":  "<ISO>",                  // reuse scanner.lastScanned → "Auto-synced 2m ago"

  // Row 1
  "progress":  { "done": 0, "total": 0, "pct": 0 },                       // donut — aggregate across all phases
  "currentPhase": {                                                        // stepper
    "id": "33", "name": "Dashboard command runner", "index": 13, "total": 18,
    "steps": [ { "id": "20", "name": "…", "status": "done|active|upcoming" } ]
  },
  "timeline":  [ { "date": "<ISO>", "value": 0, "label": "Sprint 04.1" } ], // line chart series

  // Row 2
  "completedTasks": [ { "id": "…", "title": "…", "phase": "…", "completedAt": "<ISO>" } ],
  "inProgressTasks": [ { "id": "…", "title": "…", "pct": 0 } ],            // each with % badge
  "blockers": [ { "id": "…", "title": "…", "severity": "high|medium|low" } ],

  // Row 3
  "recentDecisions": [ { "id": "…", "title": "…", "status": "approved", "date": "<ISO>" } ],
  "progressTimeline": [ { "id": "20", "name": "…", "status": "complete", "started": "<ISO>", "completed": "<ISO>" } ],

  // Sidebar mini-card
  "health":   { "score": 0, "label": "On track|At risk", "signals": [ "…" ] }
}
```

**Wiring required (none exist today):**
- `progress` — sum `phases[].storiesDone` / `phases[].stories` (`scanner.js:204-206`).
- `currentPhase.steps` — derive ordered phases + resolve the active one (current bug:
  `current_phase` is a name not an id — `scanner.js:164`).
- `timeline` — from `velocity_history` (`state.raw.velocity_history`), currently NOT in
  the client seed (`client.js:23-44`).
- `completedTasks` / `inProgressTasks` — need richer per-story status + dates than the
  scanner emits today (`done`/`todo` only, no dates — `scanner.js:89-96, 204`).
- `blockers[].severity` — scanner must read severity (`scanner.js:240-242` strips to
  `string`/`{title}` only).
- `recentDecisions[].status` — scanner must emit decision status (`scanner.js:236-238`
  emits `{summary, phase, plan, date}` only).
- `health` — net-new server-side derivation.
- `POST /api/ask` and Share — new routes the spec authorizes (`MOCKUP-SPEC.md:6`); no
  handler exists in `dashboard.js:63-138`.

---

## 5. Summary of net-new work

1. **7 new card components** (donut, phase stepper, timeline line-chart, completed-tasks,
   in-progress, blockers-by-severity, progress-timeline) + sidebar Project-Health mini-card
   + user-profile footer + header greeting/Ask/Share — none exist today.
2. **Scanner additions** (`scanner.js`): aggregate `progress`, ordered phase steps with a
   correctly-resolved current phase, decision `status`, blocker `severity`, per-task
   `in_progress` + dates, `health`, `user`/`project` identity.
3. **Curated `/api/state` contract** (`api.js:8-12`) replacing the raw dump, plus client
   seed (`client.js:23-44`) parity.
4. **Token re-theme** (`css.js:11-126`): navy base, teal/purple/blue/amber accents, exact
   severity colors, 14px radius, inner glow, 12-col grid; remove inline `style=` usage.
5. **New routes** `POST /api/ask` + Share (`dashboard.js`).

Every item above is grounded in a concrete `file:line`; nothing here assumes a symbol
that was not verified to exist (or verified to be absent).
