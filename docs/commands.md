# Full Command Reference

All 69 Rihal commands, grouped by purpose. Each entry includes syntax, examples, and related commands.

---

## Router + Lifecycle (8 commands)

### `/rihal:init`
**Purpose:** Initialize Rihal in a new or existing project.

Initialize Rihal and set project baseline.

```
/rihal:init
```

Detects project state (new / existing / returning), asks for:
- Communication language (English, Urdu, Arabic)
- Model profile (quality, balanced, budget)
- Branching strategy preference

Creates `.rihal/config.yaml` and `.rihal/RIHLA.md` (project journey baseline).

**Related:** `/rihal:settings`, `/rihal:status`

---

### `/rihal:do`
**Purpose:** Interactive router — guided discovery of next action.

```
/rihal:do
```

Routes you based on current project state:
- Fresh project → suggest new-project or research
- Have a decision to make → suggest council debate
- Have a plan → suggest execute
- Mid-execution → suggest continue, pause, or review

**Related:** `/rihal:council`, `/rihal:chain`, `/rihal:plan`, `/rihal:execute`

---

### `/rihal:help`
**Purpose:** List all available commands.

```
/rihal:help
/rihal:help council
```

Shows available commands by category. Optionally filter by keyword.

**Related:** `/rihal:do`

---

### `/rihal:status`
**Purpose:** View project state formatted (phases, decisions, sessions, blockers).

```
/rihal:status
/rihal:status --json
```

Displays:
- Current phase and plan
- All completed phases
- Recent council sessions and chains
- Active blockers and decisions
- Workstream status

Add `--json` for machine-readable output.

**Related:** `/rihal:stats`, `/rihal:health`

---

### `/rihal:stats`
**Purpose:** Project statistics (commands run, artifacts created, tokens used).

```
/rihal:stats
```

Shows:
- Total commands run
- Council sessions completed
- Plans written
- Phases completed
- Total tokens consumed (by model)

**Related:** `/rihal:status`, `/rihal:health`

---

### `/rihal:health`
**Purpose:** Diagnostic check — detect broken state, orphaned files, stale locks.

```
/rihal:health
/rihal:health --fix
```

Checks:
- state.json validity
- Orphaned lock files
- Missing referenced artifacts
- Configuration validity

Add `--fix` to auto-correct safe issues.

**Related:** `/rihal:status`, `/rihal:forensics`

---

### `/rihal:forensics`
**Purpose:** Post-mortem investigation for failed commands.

```
/rihal:forensics --last
/rihal:forensics 2026-04-12
```

Analyzes:
- Last failed command and error
- Logs from a specific date
- State corruption or conflicts
- Orphaned artifacts

**Related:** `/rihal:health`, `/rihal:correct-course`

---

### `/rihal:update`
**Purpose:** Update Rihal to latest version.

```
/rihal:update
/rihal:update --dry-run
```

Downloads latest from v2-prototype branch. Add `--dry-run` to preview changes.

**Related:** `/rihal:install`

---

## Discovery + Research (7 commands)

### `/rihal:new-project`
**Purpose:** Deep discovery for greenfield projects.

```
/rihal:new-project build a saas rental platform
```

Spawns a parallel chain:
1. Mariam: Market research + GTM fit
2. Waleed: Technical feasibility + stack
3. Hussain-PM: Scope + feature prioritization

Outputs: MARKET.md, FEASIBILITY.md, SCOPE.md (in `.planning/chains/`).

**Related:** `/rihal:chain`, `/rihal:plan`

---

### `/rihal:map-codebase`
**Purpose:** Analyze and map project structure, dependencies, modules.

```
/rihal:map-codebase
/rihal:map-codebase --depth 2
```

Outputs codebase topology:
- Module/service structure
- Key files and entry points
- Dependency graph
- Technology stack detected

**Related:** `/rihal:scan`, `/rihal:explore`, `/rihal:document-project`

---

### `/rihal:scan`
**Purpose:** Lightweight codebase assessment (faster than map-codebase).

```
/rihal:scan
/rihal:scan --focus=src/auth
```

Quick snapshot of:
- Top-level structure
- File count and size
- Languages and frameworks
- Obvious gaps or red flags

**Related:** `/rihal:map-codebase`, `/rihal:explore`

---

### `/rihal:explore`
**Purpose:** Guided codebase exploration by topic.

```
/rihal:explore authentication
/rihal:explore how is state managed?
```

Searches codebase for a topic and produces:
- Relevant file excerpts
- Architecture summary for that area
- Implementation patterns found

**Related:** `/rihal:map-codebase`, `/rihal:scan`

---

### `/rihal:document-project`
**Purpose:** Auto-generate project documentation.

```
/rihal:document-project
/rihal:document-project --sections=arch,api,install
```

Creates or updates:
- Architecture overview
- API documentation
- Installation guide
- Contributing guide

Outputs to `docs/` or specified directory.

**Related:** `/rihal:docs-update`, `/rihal:map-codebase`

---

### `/rihal:analyze-dependencies`
**Purpose:** Audit and suggest dependency updates.

```
/rihal:analyze-dependencies
/rihal:analyze-dependencies --security
```

Analyzes:
- Outdated packages
- Security vulnerabilities
- Unused dependencies
- Major version upgrades available

Add `--security` for security-only scan.

**Related:** `/rihal:map-codebase`, `/rihal:scan`

---

### `/rihal:discuss-phase-power`
**Purpose:** Quick expert discussion without formal artifact.

```
/rihal:discuss-phase-power how should we architect this module?
```

Single agent responds conversationally. No mandatory output artifact.

**Related:** `/rihal:discuss`, `/rihal:council`

---

## Planning (7 commands)

### `/rihal:plan`
**Purpose:** Write a detailed PLAN.md with verification.

```
/rihal:plan build user authentication module
/rihal:plan 02 implement payments
```

Flow:
1. Planner writes PLAN.md (tasks, subtasks, success criteria)
2. Plan-checker validates file/symbol references exist
3. On failure, loops back to planner with feedback (max 2 retries)

Outputs: `.planning/phases/{NN}/PLAN.md`.

**Related:** `/rihal:chain`, `/rihal:execute`, `/rihal:check-implementation-readiness`

---

### `/rihal:chain`
**Purpose:** Sequential pipeline — each agent reads previous output.

```
/rihal:chain research-plan build rental app in dubai
/rihal:chain feasibility migrate to serverless
/rihal:chain custom researcher,architect,planner "your topic"
```

Presets:
- `research-plan` — Mariam → Hussain-PM → Planner
- `feasibility` — Waleed → Architect → Plan-Checker
- `gtm-to-build` — Mariam → Waleed → Hussain-PM → Planner
- `full-discovery` — Researcher → Architect → PM → Planner

Or custom: comma-separated agent names + topic.

Outputs: typed artifacts per stage (RESEARCH.md, SCOPE.md, PLAN.md) in `.planning/chains/`.

**Related:** `/rihal:council`, `/rihal:plan`, `/rihal:discuss`

---

### `/rihal:create-epics-and-stories`
**Purpose:** Break a phase into epics and user stories.

```
/rihal:create-epics-and-stories 02
/rihal:create-epics-and-stories "build payment processing"
```

Outputs: structured epics with acceptance criteria and story points.

**Related:** `/rihal:create-story`, `/rihal:dev-story`, `/rihal:sprint-planning`

---

### `/rihal:create-story`
**Purpose:** Write a single user story.

```
/rihal:create-story "As a user, I want to reset my password"
```

Outputs:
- User story format
- Acceptance criteria
- Definition of done checklist
- Related tasks

**Related:** `/rihal:create-epics-and-stories`, `/rihal:dev-story`

---

### `/rihal:dev-story`
**Purpose:** Convert a user story into a dev task.

```
/rihal:dev-story "As a user, I want to reset my password"
```

Outputs:
- Technical breakdown
- Implementation steps
- File/function/method names needed
- Test cases

**Related:** `/rihal:create-story`, `/rihal:plan`

---

### `/rihal:sprint-planning`
**Purpose:** Plan a sprint from a backlog.

```
/rihal:sprint-planning --backlog=.planning/backlog.md
```

Produces:
- Sprint goals
- Story selection with points
- Capacity check
- Risk assessment

**Related:** `/rihal:plan`, `/rihal:create-epics-and-stories`

---

### `/rihal:brainstorm`
**Purpose:** Open-ended idea generation with the council.

```
/rihal:brainstorm features for a social commerce platform
```

All 5 council agents contribute ideas. Outputs: session artifact with ideas grouped by theme.

**Related:** `/rihal:council`, `/rihal:discuss`

---

## Execution (6 commands)

### `/rihal:execute`
**Purpose:** Execute a plan with atomic commits + post-gates.

```
/rihal:execute .planning/phases/01/PLAN.md
/rihal:execute 02
```

Flow:
1. Load plan tasks
2. Create feature branch (if configured)
3. For each task: spawn executor, commit atomically
4. Run post-execute gates:
   - integration-checker (cross-phase E2E)
   - nyquist-auditor (test coverage)
5. Output: SUMMARY.md + commits

**Related:** `/rihal:quick`, `/rihal:autonomous`, `/rihal:undo`

---

### `/rihal:quick`
**Purpose:** Execute a trivial task inline (no ceremony).

```
/rihal:quick fix the typo in README
/rihal:quick add eslint rule for no-console
```

Shortcut for small changes that don't need a full plan. Single commit, no gates.

**Related:** `/rihal:execute`, `/rihal:autonomous`

---

### `/rihal:autonomous`
**Purpose:** Execute all remaining phases without human input.

```
/rihal:autonomous --until=phase-5
/rihal:autonomous --token-budget=1M
```

Runs all phases sequentially. Options:
- `--until=NAME` — stop at a phase
- `--token-budget=N` — stop if over N tokens
- `--dry-run` — preview without committing

Requires explicit approval.

**Related:** `/rihal:execute`, `/rihal:audit-fix`

---

### `/rihal:audit-fix`
**Purpose:** Autonomous audit-to-fix pipeline.

```
/rihal:audit-fix --focus=src/auth
/rihal:audit-fix --issue-type=security
```

Flow:
1. Code-reviewer audits codebase
2. Edge-case-hunter finds gaps
3. Fixer commits fixes with explanations

**Related:** `/rihal:execute`, `/rihal:code-review-fix`

---

### `/rihal:undo`
**Purpose:** Safely revert last completed phase.

```
/rihal:undo
/rihal:undo --keep-artifacts
```

Reverts commits from the phase and marks phase incomplete. Keeps artifacts by default; add `--keep-artifacts` to preserve.

**Related:** `/rihal:correct-course`, `/rihal:pause-work`

---

### `/rihal:check-implementation-readiness`
**Purpose:** Verify a plan is ready before execution.

```
/rihal:check-implementation-readiness .planning/phases/01/PLAN.md
```

Checks:
- All file references exist
- All symbol definitions reachable
- Dependencies installed
- Test infrastructure present

**Related:** `/rihal:plan`, `/rihal:execute`

---

## Observability + Review (11 commands)

### `/rihal:code-review`
**Purpose:** Review recent code changes.

```
/rihal:code-review HEAD~3..HEAD
/rihal:code-review --branch=feature/auth
```

Produces:
- Code quality assessment
- Risk analysis
- Suggestions for improvement
- Compliance check

**Related:** `/rihal:code-review-fix`, `/rihal:karpathy-audit`

---

### `/rihal:code-review-fix`
**Purpose:** Auto-fix issues found by code-review.

```
/rihal:code-review-fix HEAD~3..HEAD
```

Runs `/rihal:code-review`, then automatically fixes all flagged issues.

**Related:** `/rihal:code-review`, `/rihal:audit-fix`

---

### `/rihal:review-adversarial`
**Purpose:** Stress-test a design or implementation.

```
/rihal:review-adversarial .planning/phases/01/PLAN.md
/rihal:review-adversarial "our payment flow"
```

Fatima (QA) and Waleed (CTO) pick apart the design, find worst-case scenarios.

**Related:** `/rihal:code-review`, `/rihal:review-edge-case-hunter`

---

### `/rihal:review-edge-case-hunter`
**Purpose:** Find edge cases and error paths.

```
/rihal:review-edge-case-hunter src/payment/process.js
```

Audits code for:
- Uncaught exceptions
- Boundary conditions
- Race conditions
- Input validation gaps

**Related:** `/rihal:code-review`, `/rihal:review-adversarial`

---

### `/rihal:karpathy-audit`
**Purpose:** Audit code vs Karpathy's 4 coding principles.

```
/rihal:karpathy-audit HEAD~5..HEAD
/rihal:karpathy-audit 03 --files=src/auth/
```

Checks:
1. Think before coding (clear assumptions stated)
2. Simplicity first (no over-engineering)
3. Surgical changes (minimal, focused edits)
4. Goal-driven execution (verifiable success criteria)

**Related:** `/rihal:code-review`, `/rihal:execute`

---

### `/rihal:secure-phase`
**Purpose:** Security-focused verification of a phase.

```
/rihal:secure-phase 02
/rihal:secure-phase .planning/phases/02/PLAN.md
```

Audits:
- Input validation
- Authentication/authorization checks
- Data sensitivity handling
- Third-party integrations

**Related:** `/rihal:code-review`, `/rihal:review-adversarial`

---

### `/rihal:show`
**Purpose:** Display artifact by ID (phase, plan, task, session).

```
/rihal:show M1
/rihal:show 02.01
/rihal:show council-2026-04-12-auth
```

Outputs full content of:
- Milestone
- Phase
- Plan
- Task
- Council session
- Chain output

**Related:** `/rihal:why`, `/rihal:status`

---

### `/rihal:why`
**Purpose:** Explain why a specific agent was chosen.

```
/rihal:why 02
/rihal:why council-2026-04-12
```

Shows:
- Reasoning for agent selection
- Panel scoring breakdown
- Classifier decision (if multilingual)
- Keyword matches

**Related:** `/rihal:show`, `/rihal:council --explain`

---

### `/rihal:rerun`
**Purpose:** Re-execute a previous command/session.

```
/rihal:rerun M1
/rihal:rerun council-2026-04-12-auth
```

Re-spawns the same agents with the same context. Useful for:
- Testing changes to agent personas
- Re-verifying decisions
- Updating outputs after code changes

**Related:** `/rihal:show`, `/rihal:correct-course`

---

### `/rihal:diff`
**Purpose:** Compare two artifacts or phases.

```
/rihal:diff 01 02
/rihal:diff PLAN.md PLAN.md.old
/rihal:diff council-session-1 council-session-2
```

Shows:
- Changes between versions
- What was added/removed
- Scope creep detection
- Decision evolution

**Related:** `/rihal:show`, `/rihal:status`

---

### `/rihal:report`
**Purpose:** Generate a phase report (progress, decisions, blockers).

```
/rihal:report 02
/rihal:report --since=2026-04-01
```

Includes:
- Phase summary
- Decisions made
- Blockers encountered
- Time spent per task
- Risk assessment

**Related:** `/rihal:status`, `/rihal:session-report`

---

## Recovery + Correction (4 commands)

### `/rihal:pause-work`
**Purpose:** Save session context and pause.

```
/rihal:pause-work
```

Writes:
- `.rihal/HANDOFF.json` — machine-readable context
- `.planning/.continue-here.md` — human-readable summary

Captures:
- Current phase and plan
- Blocking decisions
- Last command output
- Unfinished tasks

**Related:** `/rihal:resume-work`, `/rihal:correct-course`

---

### `/rihal:resume-work`
**Purpose:** Resume from a pause.

```
/rihal:resume-work
/rihal:resume-work --handoff=.rihal/HANDOFF.json
```

Loads HANDOFF.json and surfaces:
- Where you left off
- Blocking constraints
- Last artifacts
- Suggested next action

**Related:** `/rihal:pause-work`, `/rihal:do`

---

### `/rihal:correct-course`
**Purpose:** Recover from a failed or derailed phase.

```
/rihal:correct-course
/rihal:correct-course 02 --reason="stack incompatibility"
```

Analyzes failure and suggests:
- Rollback to previous phase
- Skip current phase and continue
- Pivot to different approach
- Re-plan with new constraints

**Related:** `/rihal:undo`, `/rihal:pause-work`

---

### `/rihal:next`
**Purpose:** Move to the next phase.

```
/rihal:next
/rihal:next --phase=03
```

Marks current phase complete and advances. Shows:
- Phase transition summary
- Next phase goals
- Suggested first command

**Related:** `/rihal:status`, `/rihal:do`

---

## Multi-Agent Modes (3 commands)

### `/rihal:council`
**Purpose:** Parallel debate — all agents respond simultaneously.

```
/rihal:council should we rewrite the auth system?
/rihal:council --agents=waleed,fatima,sadiq "our tech debt"
/rihal:council --explain "should we migrate to microservices?"
```

Flow:
1. Round 1: All agents answer independently
2. Round 2: Each agent responds to others' points
3. Orchestrator flags sharpest disagreements

Options:
- `--agents=X,Y,Z` — override panel selection
- `--explain` — show panel scoring logic
- `--full` — force all 5 agents

Outputs: `.planning/council-sessions/council-{date}-{slug}.md`.

**Related:** `/rihal:chain`, `/rihal:discuss`, `/rihal:brainstorm`

---

### `/rihal:chain`
(See Planning section)

---

### `/rihal:discuss`
**Purpose:** Single agent, conversational tone.

```
/rihal:discuss waleed can we use redis for caching?
/rihal:discuss what's our biggest technical risk?
/rihal:discuss fatima is the test coverage adequate?
```

If no agent named, scorer picks top match based on question keywords.

**Related:** `/rihal:council`, `/rihal:chain`

---

## Configuration + Setup (4 commands)

### `/rihal:settings`
**Purpose:** Interactive configuration.

```
/rihal:settings
```

Edit:
- User name and project name
- Communication language
- Model profile (quality/balanced/budget)
- Mode (guided/yolo)
- Branching strategy
- Workflow toggles (plan-checker, post-gates)

**Related:** `/rihal:init`, `/rihal:profile-user`, `/rihal:config`

---

### `/rihal:install`
**Purpose:** Install specific modules or update installation.

```
/rihal:install --module=core
/rihal:install --module=execution --force
/rihal:install --ide=cursor
```

Modules:
- `core` — 5 council agents, council/discuss/status
- `execution` — executor, planner, verifier + gates
- `discovery` — codebase-mapper, researcher, code-review

**Related:** `/rihal:update`, `/rihal:init`

---

### `/rihal:enable-hooks`
**Purpose:** Install opt-in pre/post-workflow hooks.

```
/rihal:enable-hooks
/rihal:enable-hooks --hook=pre-edit
```

Installs into `.claude/settings.json`:
1. **pre-edit** — enforces read-before-edit
2. **pre-workflow** — soft intent warnings
3. **post-commit** — blocks AI attribution, validates format

**Related:** `/rihal:settings`

---

### `/rihal:profile-user`
**Purpose:** Generate your behavioral profile for agent personalization.

```
/rihal:profile-user
```

Asks about:
- Decision-making style
- Risk tolerance
- Communication preference
- Technical strengths

Profile guides agent response styles.

**Related:** `/rihal:settings`, `/rihal:init`

---

### `/rihal:config`
**Purpose:** View or edit config directly.

```
/rihal:config
/rihal:config --set=model_profile=quality
```

Shows current `.rihal/config.yaml`. Add `--set=KEY=VALUE` to update single field.

**Related:** `/rihal:settings`

---

## Lifecycle + Phases (9 commands)

### `/rihal:insert-phase`
**Purpose:** Insert urgent work as a decimal phase mid-cycle.

```
/rihal:insert-phase 02 "fix critical bug in auth"
```

Creates phase `02.1` (inserted between 02 and 03). Useful for:
- Emergency fixes
- Discovered blockers
- Regulatory/security requirements

**Related:** `/rihal:new-milestone`, `/rihal:next`

---

### `/rihal:new-milestone`
**Purpose:** Start a new milestone cycle.

```
/rihal:new-milestone "M2: Scaling Phase"
```

Marks:
- Previous milestone complete
- New milestone (M2, M3, etc.)
- Resets phase counter (01, 02, etc.)

Outputs: summary of previous milestone.

**Related:** `/rihal:complete-milestone`, `/rihal:audit-milestone`

---

### `/rihal:audit-milestone`
**Purpose:** Audit a milestone's completion.

```
/rihal:audit-milestone M1
```

Verifies:
- All phases completed or skipped
- All decisions documented
- Deliverables match scope
- No orphaned tasks

**Related:** `/rihal:complete-milestone`, `/rihal:milestone-summary`

---

### `/rihal:complete-milestone`
**Purpose:** Mark a milestone complete and generate summary.

```
/rihal:complete-milestone
/rihal:complete-milestone M1
```

Produces:
- Comprehensive summary
- Decision log
- Metrics (phases, hours, tokens)
- Retrospective notes

**Related:** `/rihal:new-milestone`, `/rihal:milestone-summary`

---

### `/rihal:milestone-summary`
**Purpose:** Generate comprehensive milestone report.

```
/rihal:milestone-summary M1
```

Outputs:
- Timeline and phases
- Major decisions
- Deliverables
- Blockers encountered
- Lessons learned

**Related:** `/rihal:complete-milestone`, `/rihal:report`

---

### `/rihal:new-workspace`
**Purpose:** Create an isolated workspace for parallel tracks.

```
/rihal:new-workspace "experimental-auth"
```

Isolates:
- Config
- State
- Artifacts
- Phases

Useful for A/B testing approaches or parallel R&D.

**Related:** `/rihal:list-workspaces`, `/rihal:remove-workspace`

---

### `/rihal:list-workspaces`
**Purpose:** Show all workspaces and which is active.

```
/rihal:list-workspaces
```

Displays:
- Workspace names
- Active workspace
- Phase progress in each

**Related:** `/rihal:new-workspace`, `/rihal:remove-workspace`

---

### `/rihal:remove-workspace`
**Purpose:** Delete a workspace.

```
/rihal:remove-workspace experimental-auth
```

Removes workspace and all its artifacts. Requires confirmation.

**Related:** `/rihal:new-workspace`, `/rihal:list-workspaces`

---

### `/rihal:workstream`
**Purpose:** Manage work that spans multiple phases.

```
/rihal:workstream add --name="Refactor Auth" --phases=02,03,04
/rihal:workstream list
/rihal:workstream status auth-refactor
```

Tracks work across phases:
- Cross-phase dependencies
- Consolidated progress
- Risk rollup

**Related:** `/rihal:plan`, `/rihal:status`

---

## Docs + Notes + Reporting (8 commands)

### `/rihal:docs-update`
**Purpose:** Auto-update project documentation.

```
/rihal:docs-update
/rihal:docs-update --section=API
/rihal:docs-update --files=src/payment/
```

Updates:
- README (quickstart, features)
- Architecture guide
- API documentation
- Deployment guide

**Related:** `/rihal:document-project`, `/rihal:note`

---

### `/rihal:note`
**Purpose:** Quick zero-friction idea capture.

```
/rihal:note discovered edge case in payment retry logic
```

Appends to `.planning/notes/[phase].md`. No ceremony.

**Related:** `/rihal:add-todo`, `/rihal:docs-update`

---

### `/rihal:report`
(See Observability section)

---

### `/rihal:session-report`
**Purpose:** Generate comprehensive session summary.

```
/rihal:session-report
/rihal:session-report --since=2026-04-01
```

Includes:
- Commands run
- Artifacts created
- Decisions made
- Token usage
- Time breakdown

**Related:** `/rihal:status`, `/rihal:stats`

---

### `/rihal:add-todo`
**Purpose:** Add task to phase backlog.

```
/rihal:add-todo "write database migration tests"
/rihal:add-todo --phase=02 "implement payment webhooks"
```

Appends to phase's task list.

**Related:** `/rihal:note`, `/rihal:plan`

---

### `/rihal:import`
**Purpose:** Import external plans or documents.

```
/rihal:import ./external-plan.md --as=phase-01
/rihal:import --from-confluence --doc-id=123
```

Converts external plan to Rihal format and integrates with state.

**Related:** `/rihal:document-project`, `/rihal:plan`

---

### `/rihal:inbox`
**Purpose:** Review and process captured notes/todos.

```
/rihal:inbox
```

Shows:
- Pending notes
- Pending todos
- Unprocessed ideas

Lets you organize into phases/plans.

**Related:** `/rihal:note`, `/rihal:add-todo`

---

## UI Design (2 commands)

### `/rihal:ui-phase`
**Purpose:** Generate UI design contract for a phase.

```
/rihal:ui-phase 02
/rihal:ui-phase --component=auth-flow
```

Produces:
- Component list
- Wire frames (ASCII)
- Design system usage
- Accessibility checklist

Outputs: `UI-SPEC.md` in phase directory.

**Related:** `/rihal:ui-review`, `/rihal:plan`

---

### `/rihal:ui-review`
**Purpose:** Retroactive UI/UX 6-pillar audit.

```
/rihal:ui-review src/components/
```

Audits:
1. Visual hierarchy
2. Accessibility
3. Responsive design
4. Interaction model
5. Brand consistency
6. Performance

**Related:** `/rihal:ui-phase`, `/rihal:code-review`

---

## Tips

- **Stuck?** Run `/rihal:do` — it routes you based on state.
- **Wrong command?** Workflows have **intent guards** (Step 0.5) that redirect with a copy-paste fix.
- **More info?** Run `/rihal:help` or see `docs/` directory.
- **Debug mode?** Add `--explain` or `--verbose` to most commands.

See the main README.md for quick examples and 3-mode mental model.
