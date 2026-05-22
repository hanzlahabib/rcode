# rcode Dogfeed — Flows & Findings

Live document tracking every workflow tested during dogfeed runs. Use this for documentation and presentations.

---

## Run 1 — Calories Counter React Native App (Fresh project, no existing files)

**Date:** 2026-05-22  
**Project:** `/home/hanzla/development/dogfood-calories-app`  
**Stack:** Expo + React Native + SQLite + Drizzle ORM

### Flow A: `/rihal-new-project`

**What it does:**  
Bootstraps a brand-new project from a single description sentence.

**Steps observed:**
1. Detects project type (React Native / mobile)
2. Spawns 4 parallel researcher agents (stack, architecture, pitfalls, patterns)
3. Synthesizes research into a summary
4. Spawns `rihal-roadmapper` → writes `.planning/ROADMAP.md` (full phase breakdown)
5. Writes `.planning/PROJECT.md`, `.planning/config.json`, `.rihal/config.yaml`
6. Writes `STATE.md`, `CLAUDE.md`
7. Commits everything to git

**Happy path result:** ✅ ROADMAP.md created with proper phases (Foundation → Data Layer → UI → etc.)

**Issues found:**
- `#816` — `project` and `milestone` fields stay `null` in state after completion
- `#809` — `progress init` returns `project: null` in status banner
- `#810` — Phase drift: ROADMAP has 1 phase, state.json has 0 immediately after init

---

### Flow B: `/rihal-plan <phase>`

**What it does:**  
Creates sprint plan files (SPRINT.md) for a phase.

**Steps observed:**
1. Reads ROADMAP.md and locates the requested phase
2. Runs context check (CONTEXT.md optional)
3. Spawns `rihal-planner` → writes 3 SPRINT.md files (1 per wave)
4. Spawns `rihal-sprint-checker` → verifies plan quality
5. Commits SPRINT.md files + updates state

**Happy path result:** ✅ 3 SPRINT.md files written (1855 lines total), checker passed

**Issues found:**
- `#813` — Leading-zero phase numbers fail equality check (`"01" !== "1"`)
- `#817` — `phase_req_ids` empty despite REQ-IDs present in ROADMAP.md
- `#818` — `rihal-roadmapper` wrote SPRINT.md files when only PHASE.md was requested

---

### Flow C: `/rihal-execute` (Sprint execution)

**What it does:**  
Runs the rihal-executor agent against a SPRINT.md file to build actual code.

**Steps observed:**
1. Reads SPRINT.md task list
2. Executes each task: creates files, writes code (babel.config.js, app.json, etc.)
3. Runs TypeScript check after each sprint
4. Calls `state advance-plan` + `state update-progress` after completion
5. Moves to next sprint automatically

**Happy path result:** ✅ Sprint 1-1 scaffolded Expo project, TypeScript clean (exit 0). Sprint 1-2 started (SQLite + Drizzle ORM)

**Issues found:**
- `#820` — `state update-progress` subcommand missing → exits with unknown subcommand
- Sprint completion partially tracked (advance-plan works, update-progress fails)

---

### Flow D: `/rihal-sprint-status`

**What it does:**  
Shows current sprint health, task completion, and blockers.

**Steps observed:**
1. Reads `.rihal/config.yaml` for project state
2. Reads current SPRINT.md
3. Outputs task completion grid + blockers

**Issues found:**
- `#811` — `.rihal/config.json` missing (legacy path) causes Step 1 failure

---

### Flow E: `rcode health` (9-check system health)

**What it does:**  
Runs 9 checks across state, agents, config, roadmap, and sprint files.

**Checks:**
1. `.rihal/config.yaml` exists
2. `state.json` valid
3. Agent manifest populated
4. ROADMAP.md present
5. Current phase set
6. Active sprint exists
7. No critical blockers
8. Git clean (skippable)
9. `state snapshot` subcommand works

**Issues found:**
- `#807` — `state snapshot` subcommand missing → Check 9 always fails
- `#808` — agent-manifest.csv empty after init (global agents not scanned)
- `#812` — Check 8 SKIP counted in pass total → misleading 9/9 display

---

## Run 2 — ReelSpeed App (Existing project, 20-phase ROADMAP.md already present)

**Date:** 2026-05-22  
**Project:** `~/development/reelspeed/services/reelspeed-app`  
**Stack:** Next.js, TypeScript  
**Existing data:** `.planning/ROADMAP.md` (14.4K, 20 phases)

### Flow A: `rcode install` on existing project inside pnpm monorepo

**What happens:**
1. `pnpm add -D @hanzlaa/rcode@latest` from workspace member → pnpm hoists to workspace root
2. `./node_modules/.bin/rcode install --yes` runs from project dir
3. **Bug:** `.rihal/` created at workspace root (`services/`) not project dir (`reelspeed-app/`)
4. `config.yaml` shows `project_name: services`
5. Existing 20-phase ROADMAP.md → **not imported** → `phases: []`

**Issue filed:**
- `#821` — **CRITICAL**: rcode installs to pnpm workspace root instead of project subdirectory

**Impact:** Complete data loss of existing roadmap. All phase/milestone history gone.

---

## Run 3 — ReelSpeed Backend (Fresh init, brownfield detection)

**Date:** 2026-05-22  
**Project:** `~/development/reelspeed/services/reelspeed-backend`  
**Stack:** Node.js / Convex / TypeScript

### Flow A: `/rihal-new-project` on brownfield backend

**What happens:**
1. Install completes
2. `/rihal-new-project` detects `project-status: stub`
3. **Brownfield banner shown** ("Existing Node.js/TypeScript code found in src/. Mapping it first...")
4. Spawns `rihal-codebase-mapper` agents before planning

**Happy path result:** ✅ Brownfield detection working correctly

---

## Run 4 — ReelSpeed Video Service (Phase completion tracking)

**Date:** 2026-05-22  
**Project:** `~/development/reelspeed/services/reelspeed-video-service`

### Flow: `/rihal-map-codebase` + phase completion

**What happens:**
1. Install completes
2. 4 parallel `rihal-codebase-mapper` agents spawned
3. Maps tech stack, architecture, conventions, concerns simultaneously
4. Writes `.planning/codebase/` docs

**Status:** In progress — mappers still running

---

## Run 4 — ReelSpeed Video Service (continued) — `/rihal-map-codebase`

**What it does:**  
Before running new-project on a brownfield repo, rcode maps the existing codebase using 4 parallel agents.

**Steps observed:**
1. Detects existing code in `src/` → triggers brownfield path
2. Spawns 4 parallel `rihal-codebase-mapper` agents:
   - Map tech stack → writes `STACK.md`, `INTEGRATIONS.md`
   - Map architecture → writes `ARCHITECTURE.md`
   - Map conventions and testing → writes `CONVENTIONS.md`
   - Map concerns and technical debt → writes `CONCERNS.md`
3. All docs land in `.planning/codebase/`
4. Main agent waits for all 4 to complete before proceeding to `/rihal-new-project`

**Happy path result:** ✅ First mapper (tech stack) completed — `STACK.md` (168 lines), `INTEGRATIONS.md` (173 lines). Remaining 3 still running.

---

## Run 5 — ReelSpeed Backend — Brownfield new-project

**Date:** 2026-05-22  
**Project:** `~/development/reelspeed/services/reelspeed-backend`  
**Stack:** Node.js / Convex / TypeScript

### Flow: Brownfield question prompt in `/rihal-new-project`

**What happens:**
1. `rcode install` completes (brownfield detected — existing `src/` code)
2. `/rihal-new-project` runs
3. **Interactive prompt appears:**
   ```
   Is this a greenfield project or brownfield (existing codebase)?
   ❯ 1. Brownfield — Enhancing/modifying the existing reelspeed-backend
     2. Greenfield — Treat as new project from scratch
   ```
4. User (or orchestrator) selects Brownfield → continues with codebase mapping

**Note:** This interactive AskUserQuestion prompt will block automated orchestration unless the orchestrator monitors and answers it. This is expected behavior but worth documenting for automation scripts.

---

## Summary of All Issues Filed

| # | Severity | Area | Title |
|---|----------|------|-------|
| #807 | High | health | state snapshot subcommand missing — Check 9 always fails |
| #808 | High | install | agent-manifest.csv empty after init |
| #809 | Medium | state | progress init returns project: null |
| #810 | High | state | Phase drift immediately after fresh init |
| #811 | High | sprint-status | .rihal/config.json missing causes Step 1 failure |
| #812 | Low | health | Check 8 SKIP counted in pass total |
| #813 | High | plan | Leading-zero phase numbers fail equality check |
| #816 | High | state | project/milestone fields null after new-project |
| #817 | Medium | roadmapper | phase_req_ids empty despite REQ-IDs in ROADMAP.md |
| #818 | Medium | roadmapper | SPRINT.md written when only PHASE.md requested |
| #819 | High | init | phase_dir:null and plans:[] for existing phases |
| #820 | Medium | execute | state update-progress subcommand missing |
| #821 | **Critical** | install | rcode installs to pnpm workspace root in monorepos |
| #823 | High | install | npx @hanzlaa/rcode fails on npm 11.x (Node v24) — Unknown command |
| #824 | Medium | execute | Write tool fails to overwrite existing SUMMARY.md — sprint summary lost on re-run |

