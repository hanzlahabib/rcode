<purpose>
Initialize a new project through unified flow: questioning, research (optional), requirements, roadmap. This is the most leveraged moment in any project — deep questioning here means better plans, better execution, better outcomes. One workflow takes you from idea to ready-for-planning.

</purpose>

<required_reading>
@.rihal/references/auto-init-guard.md
@.rihal/references/output-format.md

Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<output_format>
Open with banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► NEW PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use TaskCreate at workflow start to show the full journey:
- TaskCreate: "Detect project type (greenfield / brownfield)"
- TaskCreate: "Collect workflow config (mode, granularity, parallelization, models, agents)"
- TaskCreate: "Write and commit PROJECT.md"
- TaskCreate: "Run domain research (4 parallel agents + synthesizer)" — if research enabled
- TaskCreate: "Define REQUIREMENTS.md"
- TaskCreate: "Spawn rihal-roadmapper to build ROADMAP.md"
- TaskCreate: "Finalize: STATE.md, CLAUDE.md refresh, commit"

Mark one in_progress at a time. Mark completed immediately after each step.

Per-stage banners:
- `RIHAL ► QUESTIONING`
- `RIHAL ► RESEARCHING`
- `RIHAL ► RESEARCH COMPLETE ✓`
- `RIHAL ► DEFINING REQUIREMENTS`
- `RIHAL ► CREATING ROADMAP`
- `RIHAL ► PROJECT INITIALIZED ✓`

**Brownfield detection banner** (if existing code found):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► BROWNFIELD DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Existing {stack} code found in {path}. Mapping it first will save
duplication during planning.
```

Then AskUserQuestion to route to /rihal-map-codebase before proceeding.

**Exiting to map-codebase handoff:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► EXITING TO CODEBASE MAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Per the workflow, mapping runs first. After it finishes I'll re-enter
/rihal-new-project automatically with the map in hand.

Handing off to /rihal-map-codebase now.
```
</output_format>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal-new-project <argument-here>
```

**Examples:**
```
/rihal-new-project employee leave request tracker for an Omani government ministry
/rihal-new-project car rental marketplace SEO site for Dubai
/rihal-new-project tasbeeh app with Arabic RTL support for Android
```

STOP — do not proceed.

<available_agent_types>
Valid Rihal subagent types (use exact names — do not fall back to 'general-purpose'):
- rihal-project-researcher — Researches project-level technical decisions
- rihal-research-synthesizer — Synthesizes findings from parallel research agents
- rihal-roadmapper — Creates phased execution roadmaps
</available_agent_types>

## Step 0.5 — Detect existing project (redirect)

Before any processing, check if a project already exists in this directory:

```bash
EXISTING=$(node .rihal/bin/rihal-tools.cjs state read 2>/dev/null | grep '"project"' | head -1)
```

If `$EXISTING` is non-empty (project already initialized):

```
⚠ A rihal project already exists here.

To check current state: /rihal-status
To find next action: /rihal-next
To start a fresh phase instead: /rihal-add-phase
```

Only proceed past this step if no project exists (`$EXISTING` is empty).

<auto_mode>

## Auto Mode Detection

Check if `--auto` flag is present in $ARGUMENTS.

**If auto mode:**

- Skip brownfield mapping offer (assume greenfield)
- Skip deep questioning (extract context from provided document)
- Config: YOLO mode is implicit (skip that question), but ask granularity/git/agents FIRST (Step 2a)
- After config: run Steps 6-9 automatically with smart defaults:
  - Research: Always yes
  - Requirements: Include all table stakes + features from provided document
  - Requirements approval: Auto-approve
  - Roadmap approval: Auto-approve

**Document requirement:**
Auto mode requires an idea document — either:

- File reference: `/rihal-new-project --auto @prd.md`
- Pasted/written text in the prompt

If no document content provided, error:

```
Error: --auto requires an idea document.

Usage:
  /rihal-new-project --auto @your-idea.md
  /rihal-new-project --auto [paste or write your idea here]

The document should describe what you want to build.
```

</auto_mode>

<process>

## 1. Setup

**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init new-project 2>/dev/null || node .rihal/bin/rihal-tools.cjs init)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_RESEARCHER=$(node .rihal/bin/rihal-tools.cjs agent-info rihal-project-researcher 2>/dev/null)
AGENT_SYNTHESIZER=$(node .rihal/bin/rihal-tools.cjs agent-info rihal-research-synthesizer 2>/dev/null)
AGENT_ROADMAPPER=$(node .rihal/bin/rihal-tools.cjs agent-info rihal-roadmapper 2>/dev/null)
RESEARCHER_MODEL=$(node .rihal/bin/rihal-tools.cjs resolve-model rihal-project-researcher 2>/dev/null || echo "sonnet")
SYNTHESIZER_MODEL=$(node .rihal/bin/rihal-tools.cjs resolve-model rihal-research-synthesizer 2>/dev/null || echo "sonnet")
ROADMAPPER_MODEL=$(node .rihal/bin/rihal-tools.cjs resolve-model rihal-roadmapper 2>/dev/null || echo "sonnet")
```

Parse JSON for: `commit_docs`, `project_exists`, `has_codebase_map`, `planning_exists`, `has_existing_code`, `has_package_file`, `is_brownfield`, `needs_codebase_map`, `has_git`, `project_path`.

**Detect runtime and set instruction file name:**

Derive `RUNTIME` from the invoking prompt's `execution_context` path:
- Path contains `/.codex/` → `RUNTIME=codex`
- Path contains `/.gemini/` → `RUNTIME=gemini`
- Path contains `/.config/opencode/` or `/.opencode/` → `RUNTIME=opencode`
- Otherwise → `RUNTIME=claude`

Fallback via env vars:
```bash
if [ -n "$CODEX_HOME" ]; then RUNTIME="codex"
elif [ -n "$GEMINI_CONFIG_DIR" ]; then RUNTIME="gemini"
elif [ -n "$OPENCODE_CONFIG_DIR" ] || [ -n "$OPENCODE_CONFIG" ]; then RUNTIME="opencode"
else RUNTIME="claude"; fi
```

Set instruction file variable:
```bash
if [ "$RUNTIME" = "codex" ]; then INSTRUCTION_FILE="AGENTS.md"; else INSTRUCTION_FILE="CLAUDE.md"; fi
```

All subsequent references to the project instruction file use `$INSTRUCTION_FILE`.

**If `project_exists` is true:** Error — project already initialized. Use `/rihal-progress`.

**If `has_git` is false:** Initialize git:

```bash
git init
```

## 2. Project Type Classification

**If auto mode:** Detect project type from provided document context. Skip to Step 4.

**Otherwise:** Ask user to classify the project via AskUserQuestion:

- header: "Project Type"
- question: "Is this a greenfield project or brownfield (existing codebase)?"
- multiSelect: false
- options:
  - "Greenfield" — New project from scratch (default flow)
  - "Brownfield" — Enhancing/modifying existing codebase (narrow discovery to delta questions)

## 2.1. Brownfield Path (if brownfield selected)

**If `needs_codebase_map` is true** (existing code detected but no codebase map):

Use AskUserQuestion:

- header: "Codebase"
- question: "I detected existing code in this directory. Would you like to map the codebase first?"
- options:
  - "Map codebase first" — Run /rihal-map-codebase to understand existing architecture (Recommended)
  - "Skip mapping" — Proceed with targeted discovery

**If "Map codebase first":**

```
Run `/rihal-map-codebase` first, then return to `/rihal-new-project`
```

Exit command.

**Otherwise:** Continue with narrowed discovery (Step 3b).

## 2.2. Greenfield Path (if greenfield selected)

Continue to Step 3 (standard deep discovery flow).

### Step 3b. Brownfield Discovery (instead of deep questioning)

For brownfield projects, narrow discovery to delta questions:

```
AskUserQuestion([
  {
    header: "Change Scope",
    question: "What's changing in this project?",
    multiSelect: false,
    options: [
      "New feature on existing architecture",
      "Refactoring existing feature",
      "Migration to new tech stack",
      "Bug fixes and tech debt",
      "Performance optimization"
    ]
  },
  {
    header: "Change Impact",
    question: "Scope of impact?",
    multiSelect: false,
    options: [
      "Single component/module",
      "Multiple components",
      "Entire system (breaking changes)"
    ]
  },
  {
    header: "Rollback Risk",
    question: "Can this be rolled back easily?",
    multiSelect: false,
    options: [
      "Yes — change is isolated",
      "Partially — some migration needed",
      "No — breaking change"
    ]
  }
])
```

Adapt PRD template — focus on delta: what's NEW or CHANGED, reference existing architecture/patterns, highlight breaking changes, identify rollback/migration strategy.

**Brownfield PRD Template:**

```markdown
# PRD — {project_name}

## Existing Context

- Current architecture: {from codebase map}
- Tech stack: {from codebase analysis}
- What exists today: {brief}

## What's Changing

- New features: {list}
- Refactored components: {list}
- Removed features: {list}
- Tech debt addressed: {list}

## Change Impact

- Breaking changes: {yes/no, list if yes}
- Rollback strategy: {how to back out}
- Migration path: {if moving data/state}

## Success Criteria

- {delta-focused acceptance criteria}

## Non-functional Requirements

- Backward compatibility: {required version range}
- Data migration: {strategy}
- Performance impact: {acceptable degradation}
```

After delta discovery, continue with Step 5 (research, requirements approval, roadmap).

## 2a. Auto Mode Config (auto mode only)

**If auto mode:** Collect config settings upfront.

YOLO mode is implicit (auto = YOLO). Ask remaining config questions:

**Round 1 — Core settings (3 questions, no Mode question):**

```
AskUserQuestion([
  {
    header: "Granularity",
    question: "How finely should scope be sliced into phases?",
    multiSelect: false,
    options: [
      { label: "Coarse (Recommended)", description: "Fewer, broader phases (3-5 phases, 1-3 plans each)" },
      { label: "Standard", description: "Balanced phase size (5-8 phases, 3-5 plans each)" },
      { label: "Fine", description: "Many focused phases (8-12 phases, 5-10 plans each)" }
    ]
  },
  {
    header: "Execution",
    question: "Run plans in parallel?",
    multiSelect: false,
    options: [
      { label: "Parallel (Recommended)", description: "Independent plans run simultaneously" },
      { label: "Sequential", description: "One plan at a time" }
    ]
  },
  {
    header: "Git Tracking",
    question: "Commit planning docs to git?",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Planning docs tracked in version control" },
      { label: "No", description: "Keep .planning/ local-only (add to .gitignore)" }
    ]
  }
])
```

**Round 2 — Workflow agents (same as Step 5):**

```
AskUserQuestion([
  {
    header: "Research",
    question: "Research before planning each phase? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Investigate domain, find patterns, surface gotchas" },
      { label: "No", description: "Plan directly from requirements" }
    ]
  },
  {
    header: "Plan Check",
    question: "Verify plans will achieve their goals? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Catch gaps before execution starts" },
      { label: "No", description: "Execute plans without verification" }
    ]
  },
  {
    header: "Verifier",
    question: "Verify work satisfies requirements after each phase? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Confirm deliverables match phase goals" },
      { label: "No", description: "Trust execution, skip verification" }
    ]
  },
  {
    header: "AI Models",
    question: "Which AI models for planning agents?",
    multiSelect: false,
    options: [
      { label: "Balanced (Recommended)", description: "Sonnet for most agents — good quality/cost ratio" },
      { label: "Quality", description: "Opus for research/roadmap — higher cost, deeper analysis" },
      { label: "Budget", description: "Haiku where possible — fastest, lowest cost" },
      { label: "Inherit", description: "Use the current session model for all agents" }
    ]
  }
])
```

Create `.planning/config.json`:

```bash
mkdir -p .planning
cat > .planning/config.json <<EOF
{
  "mode": "yolo",
  "granularity": "[selected]",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "nyquist_validation": true,
    "auto_advance": true,
    "_auto_chain_active": true
  }
}
EOF
```

**If commit_docs = No:** Add `.planning/` to `.gitignore`.

**Commit config.json (guarded):**

```bash
git add .planning/config.json 2>/dev/null \
  && git commit -m "chore: add project config" 2>/dev/null \
  || echo "ℹ .planning/ gitignored — config written, not committed"
```

Proceed to Step 4 (skip Steps 3 and 5).

## 3. Deep Questioning

**If auto mode:** Skip (already handled in Step 2a). Extract project context from provided document instead and proceed to Step 4.

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► QUESTIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Open the conversation:**

Ask inline (freeform, NOT AskUserQuestion):

"What do you want to build?"

Wait for their response. This gives you the context needed to ask intelligent follow-up questions.

**Research-before-questions mode:** Check if `workflow.research_before_questions` is enabled in `.planning/config.json`. When enabled, before asking follow-up questions about a topic:

1. Do a brief web search for best practices related to what the user described
2. Mention key findings naturally as you ask questions
3. This makes questions more informed without changing the conversational flow

When disabled (default), ask questions directly.

**Follow the thread:**

Based on what they said, ask follow-up questions via AskUserQuestion with options that probe what they mentioned — interpretations, clarifications, concrete examples.

Keep following threads. Ask about:

- What excited them
- What problem sparked this
- What they mean by vague terms
- What it would actually look like
- What's already decided

Techniques:

- Challenge vagueness
- Make abstract concrete
- Surface assumptions
- Find edges
- Reveal motivation

**Check context (background, not out loud):**

Mentally check the context checklist. If gaps remain, weave questions naturally. Don't suddenly switch to checklist mode.

**Decision gate:**

When you could write a clear PROJECT.md, use AskUserQuestion:

- header: "Ready?"
- question: "I think I understand what you're after. Ready to create PROJECT.md?"
- options:
  - "Create PROJECT.md" — Let's move forward
  - "Keep exploring" — I want to share more / ask me more

If "Keep exploring" — ask what they want to add, or identify gaps and probe naturally.

Loop until "Create PROJECT.md" selected.

## 3.5. Detect Project Type

**If auto mode:** Skip — project type will be inferred from document in Step 4.

**Goal:** Classify the project into one of 9 types (api-backend, mobile-app, saas-b2b, cli-tool, web-app, desktop-app, iot, dev-tool, other). This shapes discovery questions and discovery section requirements.

**Load project type signals:**

```bash
PROJECT_TYPES=$(cat .rihal/references/project-types.yaml 2>/dev/null || true)
```

**Classify by signals:**

Scan the user's responses from Step 3 for keywords from the `signals` list. Build a score per type:

- Each signal match adds 1 point
- Pick the type with the highest score
- If tie or score < 2, ask the user to clarify

**If score is clear (>2 points for one type):**

```
📋 Detected project type: {display_name} (based on your description mentioning {signal1}, {signal2}, {signal3})

Proceed with this type? [Y/n]
```

If "n": Ask the user to pick from the list.

**Store the detected type** in a shell variable for Step 5 discovery adaptation. Add required-sections and discovery questions from project-types.yaml to the upcoming questionnaire.

## 4. Write PROJECT.md

**If auto mode:** Synthesize from provided document. No "Ready?" gate was shown — proceed directly to commit.

Synthesize all context into `.planning/PROJECT.md`. If `.rihal/templates/project.md` exists, use it. Otherwise use this inline template:

```markdown
# Project: {name}

## What This Is

{1-2 sentence description}

## Core Value

{The ONE thing that must work}

## Requirements

### Validated

{For greenfield: "(None yet — ship to validate)"}
{For brownfield: list existing capabilities}

### Active

- [ ] {Requirement 1}
- [ ] {Requirement 2}
- [ ] {Requirement 3}

### Out of Scope

- {Exclusion 1} — {why}
- {Exclusion 2} — {why}

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| {Choice} | {Why} | — Pending |

## Constraints

- {Budget / timeline / tech}

## Context

{Current state, tech stack, user feedback themes}

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/rihal-discuss-phase` + `/rihal-plan`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/rihal-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: {date} after initialization*
```

**For greenfield projects:** Initialize requirements as hypotheses (all Active).

**For brownfield projects (codebase map exists):** Read `.planning/codebase/ARCHITECTURE.md` and `STACK.md`. Identify what the codebase already does — these become the initial Validated set.

**Key Decisions:** Initialize with any decisions made during questioning.

Do not compress. Capture everything gathered.

**Commit PROJECT.md (guarded):**

```bash
mkdir -p .planning
git add .planning/PROJECT.md 2>/dev/null \
  && git commit -m "docs: initialize project" 2>/dev/null \
  || echo "ℹ .planning/ gitignored — PROJECT.md written, not committed"
```

## 5. Workflow Preferences

**If auto mode:** Skip — config was collected in Step 2a. Proceed to Step 5.5.

**Check for global defaults** at `~/.rihal/defaults.json`. If the file exists, offer to use saved defaults:

```
AskUserQuestion([
  {
    question: "Use your saved default settings? (from ~/.rihal/defaults.json)",
    header: "Defaults",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Use saved defaults, skip settings questions" },
      { label: "No", description: "Configure settings manually" }
    ]
  }
])
```

If "Yes": read `~/.rihal/defaults.json`, use those values for config.json, skip to **Commit config.json** below.

If "No" or file doesn't exist: proceed with the questions below.

**Round 1 — Core workflow settings (4 questions):**

```
questions: [
  {
    header: "Mode",
    question: "How do you want to work?",
    multiSelect: false,
    options: [
      { label: "YOLO (Recommended)", description: "Auto-approve, just execute" },
      { label: "Interactive", description: "Confirm at each step" }
    ]
  },
  {
    header: "Granularity",
    question: "How finely should scope be sliced into phases?",
    multiSelect: false,
    options: [
      { label: "Coarse", description: "Fewer, broader phases (3-5 phases, 1-3 plans each)" },
      { label: "Standard", description: "Balanced phase size (5-8 phases, 3-5 plans each)" },
      { label: "Fine", description: "Many focused phases (8-12 phases, 5-10 plans each)" }
    ]
  },
  {
    header: "Execution",
    question: "Run plans in parallel?",
    multiSelect: false,
    options: [
      { label: "Parallel (Recommended)", description: "Independent plans run simultaneously" },
      { label: "Sequential", description: "One plan at a time" }
    ]
  },
  {
    header: "Git Tracking",
    question: "Commit planning docs to git?",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Planning docs tracked in version control" },
      { label: "No", description: "Keep .planning/ local-only (add to .gitignore)" }
    ]
  }
]
```

**Round 2 — Workflow agents:**

These spawn additional agents during planning/execution. They add tokens and time but improve quality.

| Agent | When it runs | What it does |
|-------|--------------|--------------|
| **Researcher** | Before planning each phase | Investigates domain, finds patterns, surfaces gotchas |
| **Plan Checker** | After plan is created | Verifies plan actually achieves the phase goal |
| **Verifier** | After phase execution | Confirms must-haves were delivered |

```
questions: [
  {
    header: "Research",
    question: "Research before planning each phase? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Investigate domain, find patterns, surface gotchas" },
      { label: "No", description: "Plan directly from requirements" }
    ]
  },
  {
    header: "Plan Check",
    question: "Verify plans will achieve their goals? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Catch gaps before execution starts" },
      { label: "No", description: "Execute plans without verification" }
    ]
  },
  {
    header: "Verifier",
    question: "Verify work satisfies requirements after each phase? (adds tokens/time)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Confirm deliverables match phase goals" },
      { label: "No", description: "Trust execution, skip verification" }
    ]
  },
  {
    header: "AI Models",
    question: "Which AI models for planning agents?",
    multiSelect: false,
    options: [
      { label: "Balanced (Recommended)", description: "Sonnet for most agents — good quality/cost ratio" },
      { label: "Quality", description: "Opus for research/roadmap — higher cost, deeper analysis" },
      { label: "Budget", description: "Haiku where possible — fastest, lowest cost" },
      { label: "Inherit", description: "Use the current session model for all agents" }
    ]
  }
]
```

Create `.planning/config.json` with all settings:

```bash
mkdir -p .planning
cat > .planning/config.json <<EOF
{
  "mode": "[yolo|interactive]",
  "granularity": "[selected]",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "[quality|balanced|budget|inherit]",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "nyquist_validation": true
  }
}
EOF
```

**Note:** Run `/rihal-settings` anytime to update model profile, workflow agents, branching strategy, and other preferences.

**If commit_docs = No:**

- Set `commit_docs: false` in config.json
- Add `.planning/` to `.gitignore` (create if needed)

**Commit config.json (guarded):**

```bash
git add .planning/config.json 2>/dev/null \
  && git commit -m "chore: add project config" 2>/dev/null \
  || echo "ℹ .planning/ gitignored — config written, not committed"
```

## 5.1. Sub-Repo Detection

**Detect multi-repo workspace:**

```bash
find . -maxdepth 1 -type d -not -name ".*" -not -name "node_modules" -exec test -d "{}/.git" \; -print
```

**If sub-repos found:**

Strip the `./` prefix (e.g., `./backend` → `backend`).

Use AskUserQuestion:

- header: "Multi-Repo Workspace"
- question: "I detected separate git repos in this workspace. Which directories contain code that Rihal should commit to?"
- multiSelect: true
- options: one option per detected directory

**If user selects one or more directories:**

- Set `planning.sub_repos` in config.json to the selected directory names array
- Auto-set `planning.commit_docs` to `false` (planning docs stay local in multi-repo workspaces)
- Add `.planning/` to `.gitignore` if not already present

**If no sub-repos found or user selects none:** Continue with no changes to config.

## 5.5. Resolve Model Profile

Use models resolved in Step 1: `RESEARCHER_MODEL`, `SYNTHESIZER_MODEL`, `ROADMAPPER_MODEL`.


@rihal/workflows/new-project-research-decision.md



@rihal/workflows/new-project-define-requirements.md



@rihal/workflows/new-project-create-roadmap.md

## 9. Done

Present completion summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[Project Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.planning/PROJECT.md`      |
| Config         | `.planning/config.json`     |
| Research       | `.planning/research/`       |
| Requirements   | `.planning/REQUIREMENTS.md` |
| Roadmap        | `.planning/ROADMAP.md`      |
| Project guide  | `$INSTRUCTION_FILE`         |

**[N] phases** | **[X] requirements** | Ready to build ✓
```

**If auto mode:**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → DISCUSS PHASE 1        ║
╚══════════════════════════════════════════╝
```

Exit skill and invoke `/rihal-discuss-phase 1 --auto`.

**If interactive mode:**

Check if Phase 1 has UI indicators in ROADMAP.md:

```bash
PHASE1_SECTION=$(sed -n '/^## Phase 1/,/^## Phase /p' .planning/ROADMAP.md)
PHASE1_HAS_UI=$(echo "$PHASE1_SECTION" | grep -qiE "UI|interface|frontend|component|layout|page|screen|view|form|dashboard|widget" && echo "true" || echo "false")
```

**If Phase 1 has UI:**

```
───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase 1: [Phase Name]** — [Goal from ROADMAP.md]

/clear then:

/rihal-discuss-phase 1 — gather context and clarify approach

---

**Also available:**
- /rihal-ui-phase 1 — generate UI design contract (recommended for frontend phases)
- /rihal-plan 1 — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```

**If Phase 1 has no UI:**

```
───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase 1: [Phase Name]** — [Goal from ROADMAP.md]

/clear then:

/rihal-discuss-phase 1 — gather context and clarify approach

---

**Also available:**
- /rihal-plan 1 — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```

</process>

<output>

- `.planning/PROJECT.md`
- `.planning/config.json`
- `.planning/research/` (if research selected)
  - `STACK.md`
  - `FEATURES.md`
  - `ARCHITECTURE.md`
  - `PITFALLS.md`
  - `SUMMARY.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `$INSTRUCTION_FILE` (`AGENTS.md` for Codex, `CLAUDE.md` for all other runtimes)

</output>

<success_criteria>

- [ ] .planning/ directory created
- [ ] Git repo initialized
- [ ] Brownfield detection completed
- [ ] Deep questioning completed (threads followed, not rushed)
- [ ] PROJECT.md captures full context → **committed (or noted as gitignored)**
- [ ] config.json has workflow mode, granularity, parallelization → **committed**
- [ ] Research completed (if selected) — 4 parallel agents spawned → **committed**
- [ ] Requirements gathered (from research or conversation)
- [ ] User scoped each category (v1/v2/out of scope)
- [ ] REQUIREMENTS.md created with REQ-IDs → **committed**
- [ ] rihal-roadmapper spawned with context
- [ ] Roadmap files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] ROADMAP.md created with phases, requirement mappings, success criteria
- [ ] STATE.md initialized
- [ ] REQUIREMENTS.md traceability updated
- [ ] `$INSTRUCTION_FILE` generated (if missing) with rihal workflow guidance
- [ ] User knows next step is `/rihal-discuss-phase 1`
- [ ] No `git push` issued by the workflow (per AGENTS.md)

**Atomic commits:** Each phase commits its artifacts immediately. If context is lost, artifacts persist. When `.planning/` is gitignored, files are written but commit is skipped gracefully.

</success_criteria>
