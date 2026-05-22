# Full Command Reference

All 96 rcode commands, grouped by purpose. Each entry includes syntax, examples, and related commands.

---

## Router + Lifecycle (8 commands)

### `/rcode-init`
**Purpose:** Initialize rcode in a new or existing project.

Initialize rcode and set project baseline.

```
/rcode-init
```

Detects project state (new / existing / returning), asks for:
- Communication language (English, Urdu, Arabic)
- Model profile (quality, balanced, budget)
- Branching strategy preference

Creates `.rcode/config.yaml` and `.rcode/RIHLA.md` (project journey baseline).

**Related:** `/rcode-settings`, `/rcode-status`

---

### `/rcode-do`
**Purpose:** Interactive router — guided discovery of next action.

```
/rcode-do
```

Routes you based on current project state:
- Fresh project → suggest new-project or research
- Have a decision to make → suggest council debate
- Have a plan → suggest execute
- Mid-execution → suggest continue, pause, or review

**Related:** `/rcode-council`, `/rcode-chain`, `/rcode-plan`, `/rcode-execute`

---

### `/rcode-help`
**Purpose:** List all available commands.

```
/rcode-help
/rcode-help council
```

Shows available commands by category. Optionally filter by keyword.

**Related:** `/rcode-do`

---

### `/rcode-status`
**Purpose:** View project state formatted (phases, decisions, sessions, blockers).

```
/rcode-status
/rcode-status --json
```

Displays:
- Current phase and plan
- All completed phases
- Recent council sessions and chains
- Active blockers and decisions
- Workstream status

Add `--json` for machine-readable output.

**Related:** `/rcode-stats`, `/rcode-health`

---

### `/rcode-stats`
**Purpose:** Project statistics (commands run, artifacts created, tokens used).

```
/rcode-stats
```

Shows:
- Total commands run
- Council sessions completed
- Plans written
- Phases completed
- Total tokens consumed (by model)

**Related:** `/rcode-status`, `/rcode-health`

---

### `/rcode-health`
**Purpose:** Diagnostic check — detect broken state, orphaned files, stale locks.

```
/rcode-health
/rcode-health --fix
```

Checks:
- state.json validity
- Orphaned lock files
- Missing referenced artifacts
- Configuration validity

Add `--fix` to auto-correct safe issues.

**Related:** `/rcode-status`, `/rcode-forensics`

---

### `/rcode-forensics`
**Purpose:** Post-mortem investigation for failed commands.

```
/rcode-forensics --last
/rcode-forensics 2026-04-12
```

Analyzes:
- Last failed command and error
- Logs from a specific date
- State corruption or conflicts
- Orphaned artifacts

**Related:** `/rcode-health`, `/rcode-correct-course`

---

### `/rcode-update`
**Purpose:** Update rcode to latest version.

```
/rcode-update
/rcode-update --dry-run
```

Downloads latest from v2-prototype branch. Add `--dry-run` to preview changes.

**Related:** `/rcode-install`

---

## Discovery + Research (7 commands)

### `/rcode-new-project`
**Purpose:** Deep discovery for greenfield projects.

```
/rcode-new-project build a saas rental platform
```

Spawns a parallel chain:
1. Mariam: Market research + GTM fit
2. Waleed: Technical feasibility + stack
3. Hussain-PM: Scope + feature prioritization

Outputs: MARKET.md, FEASIBILITY.md, SCOPE.md (in `.planning/chains/`).

**Related:** `/rcode-chain`, `/rcode-plan`

---

### `/rcode-map-codebase`
**Purpose:** Analyze and map project structure, dependencies, modules.

```
/rcode-map-codebase
/rcode-map-codebase --depth 2
```

Outputs codebase topology:
- Module/service structure
- Key files and entry points
- Dependency graph
- Technology stack detected

**Related:** `/rcode-scan`, `/rcode-explore`, `/rcode-document-project`

---

### `/rcode-scan`
**Purpose:** Lightweight codebase assessment (faster than map-codebase).

```
/rcode-scan
/rcode-scan --focus=src/auth
```

Quick snapshot of:
- Top-level structure
- File count and size
- Languages and frameworks
- Obvious gaps or red flags

**Related:** `/rcode-map-codebase`, `/rcode-explore`

---

### `/rcode-explore`
**Purpose:** Guided codebase exploration by topic.

```
/rcode-explore authentication
/rcode-explore how is state managed?
```

Searches codebase for a topic and produces:
- Relevant file excerpts
- Architecture summary for that area
- Implementation patterns found

**Related:** `/rcode-map-codebase`, `/rcode-scan`

---

### `/rcode-document-project`
**Purpose:** Auto-generate project documentation.

```
/rcode-document-project
/rcode-document-project --sections=arch,api,install
```

Creates or updates:
- Architecture overview
- API documentation
- Installation guide
- Contributing guide

Outputs to `docs/` or specified directory.

**Related:** `/rcode-docs-update`, `/rcode-map-codebase`

---

### `/rcode-analyze-dependencies`
**Purpose:** Audit and suggest dependency updates.

```
/rcode-analyze-dependencies
/rcode-analyze-dependencies --security
```

Analyzes:
- Outdated packages
- Security vulnerabilities
- Unused dependencies
- Major version upgrades available

Add `--security` for security-only scan.

**Related:** `/rcode-map-codebase`, `/rcode-scan`

---

## Planning (7 commands)

### `/rcode-plan`
**Purpose:** Write a detailed PLAN.md with verification.

```
/rcode-plan build user authentication module
/rcode-plan 02 implement payments
```

Flow:
1. Planner writes PLAN.md (tasks, subtasks, success criteria)
2. Plan-checker validates file/symbol references exist
3. On failure, loops back to planner with feedback (max 2 retries)

Outputs: `.planning/phases/{NN}/PLAN.md`.

**Related:** `/rcode-chain`, `/rcode-execute`

---

### `/rcode-chain`
**Purpose:** Sequential pipeline — each agent reads previous output.

```
/rcode-chain research-plan build rental app in dubai
/rcode-chain feasibility migrate to serverless
/rcode-chain custom researcher,architect,planner "your topic"
```

Presets:
- `research-plan` — Mariam → Hussain-PM → Planner
- `feasibility` — Waleed → Architect → Plan-Checker
- `gtm-to-build` — Mariam → Waleed → Hussain-PM → Planner
- `full-discovery` — Researcher → Architect → PM → Planner

Or custom: comma-separated agent names + topic.

Outputs: typed artifacts per stage (RESEARCH.md, SCOPE.md, PLAN.md) in `.planning/chains/`.

**Related:** `/rcode-council`, `/rcode-plan`, `/rcode-discuss`

---

### `/rcode-create-epics-and-stories`
**Purpose:** Break a phase into epics and user stories.

```
/rcode-create-epics-and-stories 02
/rcode-create-epics-and-stories "build payment processing"
```

Outputs: structured epics with acceptance criteria and story points.

**Related:** `/rcode-create-story`, `/rcode-dev-story`, `/rcode-sprint-planning`

---

### `/rcode-create-story`
**Purpose:** Write a single user story.

```
/rcode-create-story "As a user, I want to reset my password"
```

Outputs:
- User story format
- Acceptance criteria
- Definition of done checklist
- Related tasks

**Related:** `/rcode-create-epics-and-stories`, `/rcode-dev-story`

---

### `/rcode-dev-story`
**Purpose:** Convert a user story into a dev task.

```
/rcode-dev-story "As a user, I want to reset my password"
```

Outputs:
- Technical breakdown
- Implementation steps
- File/function/method names needed
- Test cases

**Related:** `/rcode-create-story`, `/rcode-plan`

---

### `/rcode-sprint-planning`
**Purpose:** Plan a sprint from a backlog.

```
/rcode-sprint-planning --backlog=.planning/backlog.md
```

Produces:
- Sprint goals
- Story selection with points
- Capacity check
- Risk assessment

**Related:** `/rcode-plan`, `/rcode-create-epics-and-stories`

---

### `/rcode-brainstorm`
**Purpose:** Open-ended idea generation with the council.

```
/rcode-brainstorm features for a social commerce platform
```

All 5 council agents contribute ideas. Outputs: session artifact with ideas grouped by theme.

**Related:** `/rcode-council`, `/rcode-discuss`

---

## Execution (6 commands)

### `/rcode-execute`
**Purpose:** Execute a plan with atomic commits + post-gates.

```
/rcode-execute .planning/phases/01/PLAN.md
/rcode-execute 02
```

Flow:
1. Load plan tasks
2. Create feature branch (if configured)
3. For each task: spawn executor, commit atomically
4. Run post-execute gates:
   - integration-checker (cross-phase E2E)
   - nyquist-auditor (test coverage)
5. Output: SUMMARY.md + commits

**Related:** `/rcode-quick`, `/rcode-autonomous`, `/rcode-undo`

---

### `/rcode-quick`
**Purpose:** Execute a trivial task inline (no ceremony).

```
/rcode-quick fix the typo in README
/rcode-quick add eslint rule for no-console
```

Shortcut for small changes that don't need a full plan. Single commit, no gates.

**Related:** `/rcode-execute`, `/rcode-autonomous`

---

### `/rcode-autonomous`
**Purpose:** Execute all remaining phases without human input.

```
/rcode-autonomous --until=phase-5
/rcode-autonomous --token-budget=1M
```

Runs all phases sequentially. Options:
- `--until=NAME` — stop at a phase
- `--token-budget=N` — stop if over N tokens
- `--dry-run` — preview without committing

Requires explicit approval.

**Related:** `/rcode-execute`, `/rcode-audit-fix`

---

### `/rcode-audit-fix`
**Purpose:** Autonomous audit-to-fix pipeline.

```
/rcode-audit-fix --focus=src/auth
/rcode-audit-fix --issue-type=security
```

Flow:
1. Code-reviewer audits codebase
2. Edge-case-hunter finds gaps
3. Fixer commits fixes with explanations

**Related:** `/rcode-execute`, `/rcode-review-fix`

---

### `/rcode-undo`
**Purpose:** Safely revert last completed phase.

```
/rcode-undo
/rcode-undo --keep-artifacts
```

Reverts commits from the phase and marks phase incomplete. Keeps artifacts by default; add `--keep-artifacts` to preserve.

**Related:** `/rcode-correct-course`, `/rcode-pause-work`

---

## Observability + Review (11 commands)

### `/rcode-review`
**Purpose:** Review recent code changes.

```
/rcode-review HEAD~3..HEAD
/rcode-review --branch=feature/auth
```

Produces:
- Code quality assessment
- Risk analysis
- Suggestions for improvement
- Compliance check

**Related:** `/rcode-review-fix`, `/rcode-review --karpathy`

---

### `/rcode-review-fix`
**Purpose:** Auto-fix issues found by code-review.

```
/rcode-review-fix HEAD~3..HEAD
```

Runs `/rcode-review`, then automatically fixes all flagged issues.

**Related:** `/rcode-review`, `/rcode-audit-fix`

---

### `/rcode-review --attack`
**Purpose:** Stress-test a design or implementation. Folded into `/rcode-review` as a flag.

```
/rcode-review .planning/phases/01/PLAN.md --attack
/rcode-review "our payment flow" --attack
```

Fatima (QA) and Waleed (CTO) pick apart the design, find worst-case scenarios.

**Related:** `/rcode-review`, `/rcode-review --edge-cases`

---

### `/rcode-review --edge-cases`
**Purpose:** Find edge cases and error paths.

```
/rcode-review --edge-cases src/payment/process.js
```

Audits code for:
- Uncaught exceptions
- Boundary conditions
- Race conditions
- Input validation gaps

**Related:** `/rcode-review`, `/rcode-review --attack`

---

### `/rcode-review --karpathy`
**Purpose:** Audit code vs Karpathy's 4 coding principles. Folded into `/rcode-review` as a flag.

```
/rcode-review HEAD~5..HEAD --karpathy
/rcode-review 03 --files=src/auth/ --karpathy
```

Checks:
1. Think before coding (clear assumptions stated)
2. Simplicity first (no over-engineering)
3. Surgical changes (minimal, focused edits)
4. Goal-driven execution (verifiable success criteria)

**Related:** `/rcode-review`, `/rcode-execute`

---

### `/rcode-secure-phase`
**Purpose:** Security-focused verification of a phase.

```
/rcode-secure-phase 02
/rcode-secure-phase .planning/phases/02/PLAN.md
```

Audits:
- Input validation
- Authentication/authorization checks
- Data sensitivity handling
- Third-party integrations

**Related:** `/rcode-review`, `/rcode-review --attack`

---

### `/rcode-show`
**Purpose:** Display artifact by ID (phase, plan, task, session).

```
/rcode-show M1
/rcode-show 02.01
/rcode-show council-2026-04-12-auth
```

Outputs full content of:
- Milestone
- Phase
- Plan
- Task
- Council session
- Chain output

**Related:** `/rcode-why`, `/rcode-status`

---

### `/rcode-why`
**Purpose:** Explain why a specific agent was chosen.

```
/rcode-why 02
/rcode-why council-2026-04-12
```

Shows:
- Reasoning for agent selection
- Panel scoring breakdown
- Classifier decision (if multilingual)
- Keyword matches

**Related:** `/rcode-show`, `/rcode-council --explain`

---

### `/rcode-rerun`
**Purpose:** Re-execute a previous command/session.

```
/rcode-rerun M1
/rcode-rerun council-2026-04-12-auth
```

Re-spawns the same agents with the same context. Useful for:
- Testing changes to agent personas
- Re-verifying decisions
- Updating outputs after code changes

**Related:** `/rcode-show`, `/rcode-correct-course`

---

### `/rcode-diff`
**Purpose:** Compare two artifacts or phases.

```
/rcode-diff 01 02
/rcode-diff PLAN.md PLAN.md.old
/rcode-diff council-session-1 council-session-2
```

Shows:
- Changes between versions
- What was added/removed
- Scope creep detection
- Decision evolution

**Related:** `/rcode-show`, `/rcode-status`

---

## Recovery + Correction (4 commands)

### `/rcode-pause-work`
**Purpose:** Save session context and pause.

```
/rcode-pause-work
```

Writes:
- `.rcode/HANDOFF.json` — machine-readable context
- `.planning/.continue-here.md` — human-readable summary

Captures:
- Current phase and plan
- Blocking decisions
- Last command output
- Unfinished tasks

**Related:** `/rcode-resume-work`, `/rcode-correct-course`

---

### `/rcode-resume-work`
**Purpose:** Resume from a pause.

```
/rcode-resume-work
/rcode-resume-work --handoff=.rcode/HANDOFF.json
```

Loads HANDOFF.json and surfaces:
- Where you left off
- Blocking constraints
- Last artifacts
- Suggested next action

**Related:** `/rcode-pause-work`, `/rcode-do`

---

### `/rcode-correct-course`
**Purpose:** Recover from a failed or derailed phase.

```
/rcode-correct-course
/rcode-correct-course 02 --reason="stack incompatibility"
```

Analyzes failure and suggests:
- Rollback to previous phase
- Skip current phase and continue
- Pivot to different approach
- Re-plan with new constraints

**Related:** `/rcode-undo`, `/rcode-pause-work`

---

### `/rcode-next`
**Purpose:** Move to the next phase.

```
/rcode-next
/rcode-next --phase=03
```

Marks current phase complete and advances. Shows:
- Phase transition summary
- Next phase goals
- Suggested first command

**Related:** `/rcode-status`, `/rcode-do`

---

## Multi-Agent Modes (3 commands)

### `/rcode-council`
**Purpose:** Parallel debate — all agents respond simultaneously.

```
/rcode-council should we rewrite the auth system?
/rcode-council --agents=waleed,fatima,sadiq "our tech debt"
/rcode-council --explain "should we migrate to microservices?"
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

**Related:** `/rcode-chain`, `/rcode-discuss`, `/rcode-brainstorm`

---

### `/rcode-chain`
(See Planning section)

---

### `/rcode-discuss`
**Purpose:** Single agent, conversational tone.

```
/rcode-discuss waleed can we use redis for caching?
/rcode-discuss what's our biggest technical risk?
/rcode-discuss fatima is the test coverage adequate?
```

If no agent named, scorer picks top match based on question keywords.

**Related:** `/rcode-council`, `/rcode-chain`

---

## Configuration + Setup (4 commands)

### `/rcode-settings`
**Purpose:** Interactive configuration.

```
/rcode-settings
```

Edit:
- User name and project name
- Communication language
- Model profile (quality/balanced/budget)
- Mode (guided/yolo)
- Branching strategy
- Workflow toggles (plan-checker, post-gates)

**Related:** `/rcode-init`, `/rcode-profile-user`, `/rcode-config`

---

### `/rcode-install`
**Purpose:** Install specific modules or update installation.

```
/rcode-install --module=core
/rcode-install --module=execution --force
/rcode-install --ide=cursor
```

Modules:
- `core` — 5 council agents, council/discuss/status
- `execution` — executor, planner, verifier + gates
- `discovery` — codebase-mapper, researcher, code-review

**Related:** `/rcode-update`, `/rcode-init`

---

### `/rcode-enable-hooks`
**Purpose:** Install opt-in pre/post-workflow hooks.

```
/rcode-enable-hooks
/rcode-enable-hooks --hook=pre-edit
```

Installs into `.claude/settings.json`:
1. **pre-edit** — enforces read-before-edit
2. **pre-workflow** — soft intent warnings
3. **post-commit** — blocks AI attribution, validates format

**Related:** `/rcode-settings`

---

### `/rcode-profile-user`
**Purpose:** Generate your behavioral profile for agent personalization.

```
/rcode-profile-user
```

Asks about:
- Decision-making style
- Risk tolerance
- Communication preference
- Technical strengths

Profile guides agent response styles.

**Related:** `/rcode-settings`, `/rcode-init`

---

### `/rcode-config`
**Purpose:** View or edit config directly.

```
/rcode-config
/rcode-config --set=model_profile=quality
```

Shows current `.rcode/config.yaml`. Add `--set=KEY=VALUE` to update single field.

**Related:** `/rcode-settings`

---

## Lifecycle + Phases (9 commands)

### `/rcode-insert-phase`
**Purpose:** Insert urgent work as a decimal phase mid-cycle.

```
/rcode-insert-phase 02 "fix critical bug in auth"
```

Creates phase `02.1` (inserted between 02 and 03). Useful for:
- Emergency fixes
- Discovered blockers
- Regulatory/security requirements

**Related:** `/rcode-new-milestone`, `/rcode-next`

---

### `/rcode-new-milestone`
**Purpose:** Start a new milestone cycle.

```
/rcode-new-milestone "M2: Scaling Phase"
```

Marks:
- Previous milestone complete
- New milestone (M2, M3, etc.)
- Resets phase counter (01, 02, etc.)

Outputs: summary of previous milestone.

**Related:** `/rcode-complete-milestone`, `/rcode-audit-milestone`

---

### `/rcode-audit-milestone`
**Purpose:** Audit a milestone's completion.

```
/rcode-audit-milestone M1
```

Verifies:
- All phases completed or skipped
- All decisions documented
- Deliverables match scope
- No orphaned tasks

**Related:** `/rcode-complete-milestone`, `/rcode-milestone-summary`

---

### `/rcode-complete-milestone`
**Purpose:** Mark a milestone complete and generate summary.

```
/rcode-complete-milestone
/rcode-complete-milestone M1
```

Produces:
- Comprehensive summary
- Decision log
- Metrics (phases, hours, tokens)
- Retrospective notes

**Related:** `/rcode-new-milestone`, `/rcode-milestone-summary`

---

### `/rcode-milestone-summary`
**Purpose:** Generate comprehensive milestone report.

```
/rcode-milestone-summary M1
```

Outputs:
- Timeline and phases
- Major decisions
- Deliverables
- Blockers encountered
- Lessons learned

**Related:** `/rcode-complete-milestone`, `/rcode-session-report`

---

### `/rcode-new-workspace`
**Purpose:** Create an isolated workspace for parallel tracks.

```
/rcode-new-workspace "experimental-auth"
```

Isolates:
- Config
- State
- Artifacts
- Phases

Useful for A/B testing approaches or parallel R&D.

**Related:** `/rcode-list-workspaces`, `/rcode-remove-workspace`

---

### `/rcode-list-workspaces`
**Purpose:** Show all workspaces and which is active.

```
/rcode-list-workspaces
```

Displays:
- Workspace names
- Active workspace
- Phase progress in each

**Related:** `/rcode-new-workspace`, `/rcode-remove-workspace`

---

### `/rcode-remove-workspace`
**Purpose:** Delete a workspace.

```
/rcode-remove-workspace experimental-auth
```

Removes workspace and all its artifacts. Requires confirmation.

**Related:** `/rcode-new-workspace`, `/rcode-list-workspaces`

---

### `/rcode-workstream`
**Purpose:** Manage work that spans multiple phases.

```
/rcode-workstream add --name="Refactor Auth" --phases=02,03,04
/rcode-workstream list
/rcode-workstream status auth-refactor
```

Tracks work across phases:
- Cross-phase dependencies
- Consolidated progress
- Risk rollup

**Related:** `/rcode-plan`, `/rcode-status`

---

## Docs + Notes + Reporting (8 commands)

### `/rcode-docs-update`
**Purpose:** Auto-update project documentation.

```
/rcode-docs-update
/rcode-docs-update --section=API
/rcode-docs-update --files=src/payment/
```

Updates:
- README (quickstart, features)
- Architecture guide
- API documentation
- Deployment guide

**Related:** `/rcode-document-project`, `/rcode-note`

---

### `/rcode-note`
**Purpose:** Quick zero-friction idea capture.

```
/rcode-note discovered edge case in payment retry logic
```

Appends to `.planning/notes/[phase].md`. No ceremony.

**Related:** `/rcode-add-todo`, `/rcode-docs-update`

---

### `/rcode-session-report`
**Purpose:** Generate comprehensive session summary.

```
/rcode-session-report
/rcode-session-report --since=2026-04-01
```

Includes:
- Commands run
- Artifacts created
- Decisions made
- Token usage
- Time breakdown

**Related:** `/rcode-status`, `/rcode-stats`

---

### `/rcode-add-todo`
**Purpose:** Add task to phase backlog.

```
/rcode-add-todo "write database migration tests"
/rcode-add-todo --phase=02 "implement payment webhooks"
```

Appends to phase's task list.

**Related:** `/rcode-note`, `/rcode-plan`

---

### `/rcode-import`
**Purpose:** Import external plans or documents.

```
/rcode-import ./external-plan.md --as=phase-01
/rcode-import --from-confluence --doc-id=123
```

Converts external plan to rcode format and integrates with state.

**Related:** `/rcode-document-project`, `/rcode-plan`

---

### `/rcode-inbox`
**Purpose:** Review and process captured notes/todos.

```
/rcode-inbox
```

Shows:
- Pending notes
- Pending todos
- Unprocessed ideas

Lets you organize into phases/plans.

**Related:** `/rcode-note`, `/rcode-add-todo`

---

## UI Design (2 commands)

### `/rcode-ui-phase`
**Purpose:** Generate UI design contract for a phase.

```
/rcode-ui-phase 02
/rcode-ui-phase --component=auth-flow
```

Produces:
- Component list
- Wire frames (ASCII)
- Design system usage
- Accessibility checklist

Outputs: `UI-SPEC.md` in phase directory.

**Related:** `/rcode-ui-review`, `/rcode-plan`

---

### `/rcode-ui-review`
**Purpose:** Retroactive UI/UX 6-pillar audit.

```
/rcode-ui-review src/components/
```

Audits:
1. Visual hierarchy
2. Accessibility
3. Responsive design
4. Interaction model
5. Brand consistency
6. Performance

**Related:** `/rcode-ui-phase`, `/rcode-review`

---

## Tips

- **Stuck?** Run `/rcode-do` — it routes you based on state.
- **Wrong command?** Workflows have **intent guards** (Step 0.5) that redirect with a copy-paste fix.
- **More info?** Run `/rcode-help` or see `docs/` directory.
- **Debug mode?** Add `--explain` or `--verbose` to most commands.

See the main README.md for quick examples and 3-mode mental model.
