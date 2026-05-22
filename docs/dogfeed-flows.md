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

### Run 1 Final Verdict (pane-2 complete report)

**What worked:**
- `/rihal-new-project` end-to-end — full phase research, roadmap generation, PROJECT.md, config.yaml, CLAUDE.md, git commit ✅
- `/rihal-plan` — planner + sprint-checker pipeline, 3 SPRINT.md files generated, checker passed ✅
- Sprint execution through 3 consecutive sprints (1-1 scaffold, 1-2 SQLite+Drizzle, 1-3 Zustand+repos) ✅
- TypeScript clean compile as sprint gate — caught @types/jest gap immediately ✅
- Conventional commit discipline across all sprints ✅
- `rihal-tools state` — reliable read/write for phase state, sprint tracking, wave overlap ✅
- Health check: **8/9 pass** — only Check 4 failed (agent-manifest empty, #825)

**What broke (with issue numbers):**
- `#804 / #825` — `list-agents` always returns empty; agent-manifest.csv is install-stub only; all model lookups fall back to sonnet
- `#816` — `state.project` and `state.milestone` null after new-project — workflow never calls `state set-project`
- `#817 / #833` — `roadmap get-phase 1` returns `plans: []` despite SPRINT.md files on disk — tool only tracks plans registered via `rihal-tools roadmap add-plan`, not filesystem discovery
- `#818` — roadmapper wrote SPRINT.md files during `/rihal-new-project` (scope creep) — causes `has_plans: true` before `/rihal-plan` called
- `#819 / #829` — `init execute` returns `phase_dir: null, plans: []` — sprint execution required manually passing SPRINT.md path to executor
- `#822` — `/rihal-sprint-status` skill expects `sprint-status.yaml` artifact that nothing produces — skill is dead on arrival

---

### Flow C: `/rihal-execute` (Sprint execution — all 3 Phase 1 sprints)

**What it does:**  
Runs rihal-executor against each SPRINT.md file to build actual code.

**Steps observed:**
1. Sprint 1-1: Scaffold Expo project — babel.config.js, app.json, tsconfig, package.json ✅
2. Sprint 1-2: SQLite schema + Drizzle ORM setup ✅ (TypeScript clean)
3. Sprint 1-3: Repository layer + Zustand store ✅
4. TypeScript check (`pnpm typecheck`) as gate after each sprint
5. Conventional commits produced at each step

**What worked well:**
- Planner produced thorough SPRINT.md files with correct frontmatter, evidence blocks, wave dependencies ✅
- Sprint-checker found real issues (table name drift, drizzle-kit version caveat) ✅
- Executor handled deviations autonomously: fixed TypeScript version mismatch and Drizzle format bug, committed cleanly ✅
- Research pipeline (STACK.md, ARCHITECTURE.md, FEATURES.md, PITFALLS.md) — architectural decisions sound ✅

**Issues found:**
- `#820/#837` — `state update-progress` subcommand missing → partial sprint tracking
- `#839` — Planner emitted Drizzle migrations as array `[m0000]` instead of object `{ m0000 }` — executor fixed autonomously
- `#842` — Planner pinned TypeScript ~5.3.3, incompatible with Expo SDK 55 (requires ≥5.4) — executor fixed autonomously
- `#843` — `roadmap update-plan-progress` called with 1 arg in workflow but requires 3

**Final result:** All 3 sprints executed, TypeScript clean, 8 bugs filed ✅

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

## Run 2 — ReelSpeed App (continued) — Data loss assessment

**Final verdict from rs-app agent:**

| Artifact | Status |
|----------|--------|
| `.planning/ROADMAP.md` (14.4K, 20 phases) | **PRESERVED** — not touched by install |
| `.planning/ROADMAP-LAUNCH.md` | **PRESERVED** |
| 20 phases readable via `roadmap list-phases` | ✅ reads ROADMAP.md live |
| 20 phases in `state.json` | ❌ state initialized empty — no import step |
| Phase requirements / acceptance criteria parsed | ❌ ROADMAP.md format not parsed into structured data |

**Key insight:** rcode preserves existing `.planning/` files but does not **import** them into `state.json`. There is no `rcode import-roadmap` command. Existing project data is readable but not integrated into the state machine.

**Issues filed:** #830, #831, #832, #840, #841

**Additional bug (#844):** `/rihal-new-project` Step 3b sends 5 options to AskUserQuestion — tool has max 4. Fails with `Invalid tool parameters`, retries with 4 options.

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
| #822 | **Critical** | sprint-status | skill expects sprint-status.yaml but rihal produces SPRINT.md/SUMMARY.md — dead on arrival |
| #823 | High | install | npx @hanzlaa/rcode fails on npm 11.x (Node v24) — Unknown command |
| #824 | Medium | execute | Write tool fails to overwrite existing SUMMARY.md — sprint summary lost on re-run |
| #825 | High | health | agent-manifest.csv header-only — agents never registered in manifest |
| #826 | **Critical** | new-project | ROADMAP.md left as stub after new-project — roadmapper subagent never spawned (intermittent) |
| #827 | High | plan | roadmap get-phase "1" fails when ROADMAP.md uses "Phase 01" leading-zero format |
| #828 | High | install | list-agents / agent-info look in ~/.rihal/agents/ but agents install to ~/.claude/agents/ |
| #829 | High | execute | init execute can't resolve phase numbers to directories — only finds files named exactly SPRINT.md |
| #830 | Medium | state | state.json project field null after install — never populated with project name |
| #831 | Medium | config | rihal_source_path points to temp npm install dir instead of real project path |
| #832 | **Critical** | install | (duplicate of #821) pnpm monorepo anchors .rihal/ to workspace root |
| #833 | High | roadmap | roadmap get-phase returns empty requirements/success_criteria/plans even when ROADMAP.md has content |
| #834 | Medium | config | init output missing top-level mode field — config.mode not promoted to output |
| #835 | High | roadmap | roadmap summary subcommand does not exist — docs reference it but it's unimplemented |
| #836 | High | health | rihal-tools.cjs health subcommand missing from rihal-tools — CLI dispatches it separately |
| #837 | Medium | execute | (duplicate of #820) state update-progress unknown subcommand |
| #838 | High | install | pnpm add -D exits 0 + prints success but doesn't write package.json when lockfile is broken |
| #839 | Medium | planner | rihal-planner emits wrong Drizzle migrations format (array instead of object) |
| #840 | High | install | (duplicate of #823) npx install fails on npm 11.x |
| #841 | High | install | v3.4.4: Unknown IDE: claude even though claude is listed as supported |
| #842 | Medium | planner | rihal-planner specified TypeScript ~5.3.3 incompatible with Expo SDK 55 (requires ≥5.4) |
| #843 | Low | execute | roadmap update-plan-progress requires 3 args but workflow calls it with 1 — docs wrong |
| #844 | Medium | new-project | AskUserQuestion Step 3b has 5 options — exceeds tool max of 4, fails then retries |

