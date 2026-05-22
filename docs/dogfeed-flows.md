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

### Flow A: `/rihal-new-project` full Q&A flow (brownfield backend)

This documents every question the workflow asks — useful for docs and presentations.

**Step 1 — Greenfield or Brownfield?**
```
Is this a greenfield project or brownfield (existing codebase)?
❯ 1. Brownfield — Enhancing/modifying existing codebase
  2. Greenfield — Treat as new project from scratch
```
→ Selected: **Brownfield**

**Step 2 — Map codebase first or skip?**
```
Existing Node.js/Convex/TypeScript codebase detected. Map it first or skip?
❯ 1. Map first (Recommended) — deeper context for planning
  2. Skip mapping — faster, use description only
```
→ Selected: **Skip mapping** (to keep dogfood fast)

**Step 3a — What is changing? (scope)**
```
What's changing in this project?
❯ 1. New feature on existing architecture
  2. Refactoring existing feature
  3. Bug fixes and tech debt
  4. Performance optimization
```
→ Selected: **New feature**
⚠️ Bug #844: This prompt originally has 5 options — AskUserQuestion max is 4. First call fails, retries with 4.

**Step 3b — Scope of impact?**
```
How much of the codebase does this touch?
❯ 1. Single component/module
  2. Cross-cutting (multiple modules)
  3. Full system
```
→ Selected: **Single component**

**Step 3c — Rollback risk?**
```
Can this be rolled back easily?
❯ 1. Yes — change is isolated
  2. Partially — some migration needed
  3. No — breaking change
```
→ Selected: **Partially**

**Step 4 — How do you want to work? (mode)**
```
How do you want to work?
❯ 1. YOLO (Recommended) — Auto-approve, just execute
  2. Interactive — Confirm at each step
```
→ Selected: **YOLO**

**Step 5a — Phase granularity?**
```
How finely should scope be sliced into phases?
❯ 1. Standard (Recommended) — 5-8 phases, 3-5 plans each
  2. Coarse — 3-5 phases, 1-3 plans each
  3. Fine — 8-12 phases, 5-10 plans each
```
→ Selected: **Standard**

**Step 5b — Execution style?**
```
How should sprints be executed?
❯ 1. Sequential — One sprint at a time
  2. Parallel waves — Batch non-blocking sprints
```

**Step 5c — Commit planning docs?**
```
Commit planning docs to git?
❯ 1. Yes (Recommended) — Planning docs tracked in version control
  2. No — Keep .planning/ local-only
```
→ Selected: **Yes**

**After answering all questions:**  
PROJECT.md committed → researchers spawned → ROADMAP.md created → planning begins

**What this flow tells us:**  
The new-project wizard asks **7 questions** for a brownfield project (fewer for greenfield). Each question is a blocking AskUserQuestion. In automated/orchestrated contexts, the orchestrator must monitor and answer each one — they cannot be skipped.

**Issues found in this flow:**
- `#844` — Step 3a has 5 options (max 4) → InvalidToolParameters on first call, retries with 4

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
| #845 | High | install | list-agents / agent-info / resolve-model return empty — wrong agent lookup path (duplicate of #828) |
| #846 | Low | new-project | brownfield Step 3b still had 5 options per rs-backend audit (closed — duplicate of #844, already fixed in 533cac1) |
| #847 | Medium | new-project | guarded commit emits false-positive 'gitignored' on first run |
| #848 | Medium | state | workflow calls 'state set current_phase' — subcommand is 'state set-phase' |
| #849 | High | state | state.json retains install-stub phase after real project init — duplicate phantom entries |
| #850 | Low | health | rihal-tools health subcommand missing per rs-backend audit (closed — already added in 4a46ca0) |
| #851 | High | workflows | 9 workflow files reference stale .planning/config.json path (should be .rihal/config.yaml) |
| #852 | Medium | install | ts-node bin symlink creation fails during pnpm install in existing monorepo |
| #853 | High | state | state set-phase appends duplicate phantom entries instead of upserting existing phase |
| #854 | Medium | state | set-phase does not mark previous phase as completed when advancing |
| #855 | Medium | state | config-set current_phase and state set-phase write to different stores — can diverge |
| #856 | Medium | roadmap | roadmap list-phases shows wrong phase as in_progress |
| #857 | Low | roadmap | roadmap summary subcommand missing per rs-video audit (closed — duplicate of #835, fixed in 4a46ca0) |
| #858 | Low | roadmap | roadmap get-phase empty per rs-video audit (closed — duplicate of #833, fixed in 4a46ca0) |

---

## Run 4 — ReelSpeed Video Service — Final Verdict

**Date:** 2026-05-22  
**Project:** `~/development/reelspeed/services/reelspeed-video-service`  
**Stack:** Node.js / Remotion / TypeScript

**What worked:**
- `rcode install` completes cleanly ✅
- `/rihal-map-codebase` — 4 parallel mapper agents ran (STACK.md, ARCHITECTURE.md, CONVENTIONS.md, CONCERNS.md) ✅
- Brownfield detection and codebase mapping pipeline fully functional ✅
- `/rihal-new-project` proceeded through full requirements definition flow ✅
- Security requirements identified and categorized correctly ✅

**Issues found (new vs duplicates):**
- `#853` — set-phase phantom duplicates (new — fixed)
- `#854` — set-phase doesn't mark previous complete (new)
- `#855` — config-set vs state set-phase store divergence (new)
- `#856` — list-phases wrong in_progress marker (new)
- `#857 / #858` — duplicates of already-fixed #835 / #833 (closed)

---

## Run 5 — ReelSpeed Backend — Final Verdict

**Date:** 2026-05-22  
**Project:** `~/development/reelspeed/services/reelspeed-backend`  
**Stack:** Node.js / Convex / TypeScript

**What worked:**
- `rcode install` runs cleanly; all planning artifacts created ✅
- Brownfield path: 7-question wizard answered correctly ✅
- Codebase map produced (STACK.md, ARCHITECTURE.md, etc.) ✅
- ROADMAP.md created with appropriate phases ✅
- Pre-commit hook (state sync on .planning/ changes) installed correctly ✅
- No data loss — all 3 git commits succeeded ✅

**Issues found (new vs duplicates):**
- `#845` — agent path wrong (duplicate of #828, fixed in d4c4a59)
- `#847` — guarded commit false-positive (new — fix agent working on it)
- `#848` — state set compat missing (new — fixed in cdfac2a with shim)
- `#849` — state stub phase retained (new — fix-state-null agent working on it)
- `#850` — health command missing (duplicate of #836, closed)
- `#851` — stale config.json references (new — fix-config-paths agent working on it)
- `#852` — ts-node symlink failure (new — medium priority, post-launch)

---

## Fix Summary — Session Fixes (v3.6.19 → v3.6.20)

All fixes applied in this session after dogfeed audits from 3 parallel project runs.

### v3.6.19 Batch (commit 4a46ca0)
Fixed 17 issues in one batch commit after initial calories-app dogfeed:

| Issue | Fix |
|-------|-----|
| #807 | `state snapshot` subcommand added to rihal-tools.cjs |
| #810 | install.js parses ROADMAP.md to seed current_phase on fresh install |
| #813 | normalizePhaseNum() strips leading zeros before comparing phase numbers |
| #816 | state init reads project from config.yaml, milestone from ROADMAP.md |
| #819 | cmdInitExecute glob-scans `phases/<N>-*` directories |
| #820 / #837 | `state update-progress` subcommand added |
| #821 / #832 | findPnpmWorkspaceRoot() anchors TARGET_DIR to project, not workspace root |
| #822 | sprint-status skill rewired to read SPRINT.md/SUMMARY.md artifacts |
| #823 / #840 | README updated to recommend `pnpm dlx` over npx |
| #826 | ROADMAP.md stub guard added to new-project-create-roadmap.md |
| #829 | cmdInitExecute glob-scans phase dirs, filters *-SPRINT.md / *-PLAN.md |
| #833 | roadmap get-phase parses both `### Requirements` and `**Requirements:**` styles |
| #835 | `roadmap summary` subcommand added |
| #836 | `health` case added to rihal-tools.cjs dispatch |
| #838 | verifyPnpmAddDevDep() detects silent lockfile failures after pnpm add |
| #841 | `--ide claude-code` normalised to `claude` in install.js |
| #844 | new-project.md Step 3b trimmed from 5 → 4 options |

### Post-v3.6.19 Fixes (pending v3.6.20)

| Issue | Commit | Fix |
|-------|--------|-----|
| #805 / #806 | 8331c5d | agent-manifest falls back to ~/.claude/agents/; .planning/ pre-created |
| #834 | d4c4a59 | `mode` promoted to top-level in cmdInit output |
| #828 / #845 | d4c4a59 | listInstalledAgents() scans ~/.claude/agents/ (correct path) |
| #831 | d4c4a59 | resolveStableSourcePath() avoids temp npm install dirs |
| #848 | cdfac2a | `state set current_phase N` compat shim routes to set-phase |
| #843 | cdfac2a | update-plan-progress accepts 1-arg form (phase only, counts disk) |
| #812 | cdfac2a | health.md Step 7 tracks skipped checks, adjusts denominator |
| #853 | 5870210 | set-phase deduplicates by number+id, not just name |
| #811 | 662de35 | sprint-status workflow.md points to .rihal/config.yaml |
| #847 | fix-config-paths agent (in progress) | guarded commit false-positive |
| #851 | fix-config-paths agent (in progress) | stale .planning/config.json refs in 9 workflows |
| #809 / #830 | fix-state-null agent (in progress) | state project null after install |
| #808 / #825 | fix-state-null agent (in progress) | agent-manifest.csv empty on fresh init |

### Still Open (post-launch backlog)
- `#817` — phase_req_ids empty
- `#818` — roadmapper scope creep (writes SPRINT.md during new-project)
- `#824` — Write tool fails to overwrite SUMMARY.md
- `#839` — Drizzle migrations format wrong from planner
- `#842` — TypeScript version incompatibility from planner
- `#849` — state stub retained after real init (fix-state-null in progress)
- `#852` — ts-node symlink failure
- `#854` — set-phase doesn't mark previous complete
- `#855` — config-set vs state store divergence
- `#856` — list-phases wrong in_progress marker
