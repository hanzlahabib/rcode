<purpose>
Display the complete Rihal command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# Rihal Command Reference

**Rihal** (Council-driven project automation) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/rihal:new-project` - Initialize project (includes research, requirements, roadmap)
2. `/rihal:plan-phase 1` - Create detailed plan for first phase
3. `/rihal:execute-phase 1` - Execute the phase

## Staying Updated

Rihal evolves fast. Update periodically:

```bash
npx -y rihal-code
```

## Strategic Conversations

| Command | When to use |
|---------|-------------|
| /rihal:council {question} | Strategic decision needing multiple perspectives — 3-5 agents debate in parallel, 2 rounds with cross-talk |
| /rihal:discuss {agent} {question} | Quick single-agent sync — fast, conversational, no artifact |
| /rihal:chain {preset} {topic} | Sequential pipeline — Mariam → Hussain-PM → Planner produces typed artifacts |

Examples:
```
/rihal:council should I rewrite this auth layer?
/rihal:discuss waleed what stack for SaaS?
/rihal:chain research-plan dubai affiliate site
```

## Core Workflow

```
/rihal:new-project → /rihal:plan-phase → /rihal:execute-phase → repeat
```

### Project Initialization

**`/rihal:new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.planning/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/rihal:new-project`

**`/rihal:map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.planning/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/rihal:new-project` on existing codebases

Usage: `/rihal:map-codebase`

### Phase Planning

**`/rihal:plan-phase <number>`**
Create detailed execution plan for a specific phase.

- Generates `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple plans per phase supported (XX-01, XX-02, etc.)

Usage: `/rihal:plan-phase 1`
Result: Creates `.planning/phases/01-foundation/01-01-PLAN.md`

**PRD Express Path:** Pass `--prd path/to/requirements.md` to skip discuss-phase entirely. Your PRD becomes locked decisions in CONTEXT.md. Useful when you already have clear acceptance criteria.

### Execution

**`/rihal:execute-phase <phase-number>`**
Execute all plans in a phase, or run a specific wave.

- Groups plans by wave (from frontmatter), executes waves sequentially
- Plans within each wave run in parallel via Task tool
- Optional `--wave N` flag executes only Wave `N` and stops unless the phase is now fully complete
- Verifies phase goal after all plans complete
- Updates REQUIREMENTS.md, ROADMAP.md, STATE.md

Usage: `/rihal:execute-phase 5`
Usage: `/rihal:execute-phase 5 --wave 2`

### Smart Router

**`/rihal:do <description>`**
Route freeform text to the right Rihal command automatically.

- Analyzes natural language input to find the best matching Rihal command
- Acts as a dispatcher — never does the work itself
- Resolves ambiguity by asking you to pick between top matches
- Use when you know what you want but don't know which `/rihal:*` command to run

Usage: `/rihal:do fix the login button`
Usage: `/rihal:do refactor the auth system`
Usage: `/rihal:do I want to start a new milestone`

### Quick Mode

**`/rihal:quick [--full] [--discuss] [--research]`**
Execute small, ad-hoc tasks with Rihal guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns planner + executor (skips researcher, checker, verifier by default)
- Quick tasks live in `.planning/quick/` separate from planned phases
- Updates STATE.md tracking (not ROADMAP.md)

Flags enable additional quality steps:
- `--discuss` — Lightweight discussion to surface gray areas before planning
- `--research` — Focused research agent investigates approaches before planning
- `--full` — Adds plan-checking (max 2 iterations) and post-execution verification

Flags are composable: `--discuss --research --full` gives the complete quality pipeline for a single task.

Usage: `/rihal:quick`
Usage: `/rihal:quick --research --full`
Result: Creates `.planning/quick/NNN-slug/PLAN.md`, `.planning/quick/NNN-slug/SUMMARY.md`

---

**`/rihal:fast [description]`**
Execute a trivial task inline — no subagents, no planning files, no overhead.

For tasks too small to justify planning: typo fixes, config changes, forgotten commits, simple additions. Runs in the current context, makes the change, commits, and logs to STATE.md.

- No PLAN.md or SUMMARY.md created
- No subagent spawned (runs inline)
- ≤ 3 file edits — redirects to `/rihal:quick` if task is non-trivial
- Atomic commit with conventional message

Usage: `/rihal:fast "fix the typo in README"`
Usage: `/rihal:fast "add .env to gitignore"`

### Roadmap Management

**`/rihal:insert-phase <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/rihal:insert-phase 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

### Progress Tracking

**`/rihal:progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/rihal:progress`

### Session Management

**`/rihal:resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/rihal:resume-work`

### Debugging

**`/rihal:debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.planning/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/rihal:debug` with no args to resume
- Archives resolved issues to `.planning/debug/resolved/`

Usage: `/rihal:debug "login button doesn't work"`
Usage: `/rihal:debug` (resume active session)

### Todo Management

**`/rihal:add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.planning/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates STATE.md todo count

Usage: `/rihal:add-todo` (infers from conversation)
Usage: `/rihal:add-todo Add auth token refresh`

### Utility Commands

**`/rihal:cleanup`**
Archive accumulated phase directories from completed milestones.

- Identifies phases from completed milestones still in `.planning/phases/`
- Shows dry-run summary before moving anything
- Moves phase dirs to `.planning/milestones/v{X.Y}-phases/`
- Use after multiple milestones to reduce `.planning/phases/` clutter

Usage: `/rihal:cleanup`

**`/rihal:help`**
Show this command reference.

**`/rihal:update`**
Update Rihal to latest version with changelog preview.

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx -y rihal-code`

Usage: `/rihal:update`

## Files & Structure

```
.planning/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── RETROSPECTIVE.md      # Living retrospective (updated per milestone)
├── config.json           # Workflow mode & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── milestones/
│   ├── v1.0-ROADMAP.md       # Archived roadmap snapshot
│   ├── v1.0-REQUIREMENTS.md  # Archived requirements
│   └── v1.0-phases/          # Archived phase dirs (via /rihal:cleanup or --archive-phases)
│       ├── 01-foundation/
│       └── 02-core-features/
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/rihal:new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.planning/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.planning/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.planning/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```
/rihal:new-project        # Unified flow: questioning → research → requirements → roadmap
/clear
/rihal:plan-phase 1       # Create plans for first phase
/clear
/rihal:execute-phase 1    # Execute all plans in phase
```

**Resuming work after a break:**

```
/rihal:progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/rihal:insert-phase 5 "Critical security fix"
/rihal:plan-phase 5.1
/rihal:execute-phase 5.1
```

**Completing a milestone:**

```
/rihal:complete-milestone 1.0.0
/clear
/rihal:new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```
/rihal:add-todo                    # Capture from conversation context
/rihal:add-todo Fix modal z-index  # Capture with explicit description
/rihal:check-todos                 # Review and work on todos
/rihal:check-todos api             # Filter by area
```

**Debugging an issue:**

```
/rihal:debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/rihal:debug                                    # Resume from where you left off
```

## Getting Help

- Read `.planning/PROJECT.md` for project vision
- Read `.planning/STATE.md` for current context
- Check `.planning/ROADMAP.md` for phase status
- Run `/rihal:progress` to check where you're up to

## Roadmap / Planned

The following commands are planned for future releases:

- `/rihal:plan-phase` — Create detailed phase plan
- `/rihal:execute-phase` — Execute all plans in a phase
- `/rihal:plan-milestone-gaps` — Create phases to close audit gaps
- `/rihal:add-phase` — Add new phase to end of milestone
- `/rihal:remove-phase` — Remove a future phase and renumber
- `/rihal:new-milestone` — Start a new milestone cycle
- `/rihal:complete-milestone` — Archive completed milestone
- `/rihal:audit-milestone` — Audit milestone completion
- `/rihal:research-phase` — Comprehensive ecosystem research
- `/rihal:discuss-phase` — Gather phase context
- `/rihal:plant-seed` — Capture forward-looking idea
- `/rihal:note` — Zero-friction idea capture
- `/rihal:ship` — Create PR from completed phase
- `/rihal:verify-work` — Validate built features through UAT
- `/rihal:pause-work` — Create context handoff
- `/rihal:pr-branch` — Create clean PR branch
- `/rihal:review` — Cross-AI peer review
- `/rihal:check-todos` — List and work on todos
- `/rihal:cleanup` — Archive completed phase directories
- `/rihal:fast` — Execute trivial task inline
- `/rihal:audit-uat` — Audit all outstanding UAT items
- `/rihal:list-phase-assumptions` — See agent's intended approach
- `/rihal:settings` — Configure workflow toggles
- `/rihal:join-discord` — Join Rihal Discord community
</reference>

## Success Criteria

- [ ] Command reference is displayed in full
- [ ] No extra analysis or commentary added
- [ ] User can understand all available commands
- [ ] Usage examples are clear and executable

## On Error

- If unable to load or render reference: Display fallback message "See rihal/v2/workflows/help.md for full reference"
- Handle missing sections gracefully without breaking output
