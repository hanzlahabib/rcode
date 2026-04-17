<purpose>
Initialize a new project through unified flow: questioning, research (optional), requirements, roadmap. This is the most leveraged moment in any project — deep questioning here means better plans, better execution, better outcomes. One workflow takes you from idea to ready-for-planning.

</purpose>

<required_reading>
@.rihal/references/output-format.md
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

**Brownfield detection banner** (if existing code found):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► BROWNFIELD DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Existing {stack} code found in {path}. Mapping it first will save
duplication during planning.
```

Then AskUserQuestion to route to /rihal:map-codebase before proceeding.

**Exiting to map-codebase handoff:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► EXITING TO CODEBASE MAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Per the workflow, mapping runs first. After it finishes I'll re-enter
/rihal:new-project automatically with the map in hand.

Handing off to /rihal:map-codebase now.
```
</output_format>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal:new-project <argument-here>
```

**Examples:**
```
/rihal:new-project employee leave request tracker for an Omani government ministry
/rihal:new-project car rental marketplace SEO site for Dubai
/rihal:new-project tasbeeh app with Arabic RTL support for Android
```

STOP — do not proceed.

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid Rihal subagent types (use exact names — do not fall back to 'general-purpose'):
- rihal-project-researcher — Researches project-level technical decisions
- rihal-research-synthesizer — Synthesizes findings from parallel research agents
- rihal-roadmapper — Creates phased execution roadmaps
</available_agent_types>

## Step 0.5 — Detect existing project (redirect)

Before any processing, check if a project already exists in this directory:

```bash
EXISTING=$(node .rihal/bin/rihal-tools.cjs state get 2>/dev/null | grep '"project"' | head -1)
```

If `$EXISTING` is non-empty (project already initialized):

```
⚠ A rihal project already exists here.

To check current state: /rihal:status
To find next action: /rihal:next
To start a fresh phase instead: /rihal:add-phase
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

- File reference: `/rihal:new-project --auto @prd.md`
- Pasted/written text in the prompt

If no document content provided, error:

```
Error: --auto requires an idea document.

Usage:
  /rihal:new-project --auto @your-idea.md
  /rihal:new-project --auto [paste or write your idea here]

The document should describe what you want to build.
```

</auto_mode>

<process>

## 1. Setup

**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init new-project)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS_RESEARCHER=$(node .rihal/bin/rihal-tools.cjs agent-skills rihal-project-researcher 2>/dev/null)
AGENT_SKILLS_SYNTHESIZER=$(node .rihal/bin/rihal-tools.cjs agent-skills rihal-research-synthesizer 2>/dev/null)
AGENT_SKILLS_ROADMAPPER=$(node .rihal/bin/rihal-tools.cjs agent-skills rihal-roadmapper 2>/dev/null)
```

Parse JSON for: `researcher_model`, `synthesizer_model`, `roadmapper_model`, `commit_docs`, `project_exists`, `has_codebase_map`, `planning_exists`, `has_existing_code`, `has_package_file`, `is_brownfield`, `needs_codebase_map`, `has_git`, `project_path`.

**If `project_exists` is true:** Error — project already initialized. Use `/rihal:progress`.

**If `has_git` is false:** Initialize git:

```bash
git init
```

## 2. Project Type Classification

**If auto mode:** Detect project type from provided document context (look for "existing codebase", "migration", "enhancement", or assume greenfield). Skip to Step 4.

**Otherwise:** Ask user to classify the project:

Use AskUserQuestion:

- header: "Project Type"
- question: "Is this a greenfield project or brownfield (existing codebase)?"
- multiSelect: false
- options:
  - "Greenfield" — New project from scratch (default flow)
  - "Brownfield" — Enhancing/modifying existing codebase (narrow discovery to delta questions)

**Store choice:**
```bash
node .rihal/bin/rihal-tools.cjs state set --project-type greenfield|brownfield
```

## 2.1. Brownfield Path (if brownfield selected)

**If `needs_codebase_map` is true** (existing code detected but no codebase map):

Use AskUserQuestion:

- header: "Codebase"
- question: "I detected existing code in this directory. Would you like to map the codebase first?"
- options:
  - "Map codebase first" — Run /rihal:map-codebase to understand existing architecture (Recommended)
  - "Skip mapping" — Proceed with targeted discovery

**If "Map codebase first":**

```
Run `/rihal:map-codebase` first, then return to `/rihal:new-project`
```

Exit command.

**Otherwise:** Continue with narrowed discovery (Step 3b).

## 2.2. Greenfield Path (if greenfield selected)

Continue to Step 3 (standard deep discovery flow).

### Step 3b. Brownfield Discovery (instead of deep questioning)

For brownfield projects, narrow discovery to delta questions:

Instead of full deep questioning (Step 3), use focused questions:

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

Then adapt PRD template:

- Focus on delta: what's NEW or CHANGED
- Reference existing architecture/patterns
- Highlight breaking changes if any
- Identify rollback/migration strategy

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

## Continue from Step 5 (shared with greenfield)

After delta discovery, continue with Step 5 (research, requirements approval, roadmap). Roadmap will be more focused on change scope.

## 2a. Auto Mode Config (auto mode only)

**If auto mode:** Collect config settings upfront before processing the idea document.

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
      { label: "Inherit", description: "Use the current session model for all agents (OpenCode /model)" }
    ]
  }
])
```

Create `.planning/config.json` with all settings (CLI fills in remaining defaults automatically):

```bash
mkdir -p .planning
node .rihal/bin/rihal-tools.cjs config-new-project '{"mode":"yolo","granularity":"[selected]","parallelization":true|false,"commit_docs":true|false,"model_profile":"quality|balanced|budget|inherit","workflow":{"research":true|false,"plan_check":true|false,"verifier":true|false,"nyquist_validation":true|false,"auto_advance":true}}'
```

**If commit_docs = No:** Add `.planning/` to `.gitignore`.

**Commit config.json:**

```bash
mkdir -p .planning
node .rihal/bin/rihal-tools.cjs commit "chore: add project config" --files .planning/config.json
```

**Persist auto-advance chain flag to config (survives context compaction):**

```bash
node .rihal/bin/rihal-tools.cjs config-set workflow._auto_chain_active true
```

Proceed to Step 4 (skip Steps 3 and 5).

## 3. Deep Questioning

**If auto mode:** Skip (already handled in Step 2a). Extract project context from provided document instead and proceed to Step 4.

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Rihal ► QUESTIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Open the conversation:**

Ask inline (freeform, NOT AskUserQuestion):

"What do you want to build?"

Wait for their response. This gives you the context needed to ask intelligent follow-up questions.

**Research-before-questions mode:** Check if `workflow.research_before_questions` is enabled in `.planning/config.json` (or the config from init context). When enabled, before asking follow-up questions about a topic area:

1. Do a brief web search for best practices related to what the user described
2. Mention key findings naturally as you ask questions (e.g., "Most projects like this use X — is that what you're thinking, or something different?")
3. This makes questions more informed without changing the conversational flow

When disabled (default), ask questions directly as before.

**Follow the thread:**

Based on what they said, ask follow-up questions that dig into their response. Use AskUserQuestion with options that probe what they mentioned — interpretations, clarifications, concrete examples.

Keep following threads. Each answer opens new threads to explore. Ask about:

- What excited them
- What problem sparked this
- What they mean by vague terms
- What it would actually look like
- What's already decided

Consult `questioning.md` for techniques:

- Challenge vagueness
- Make abstract concrete
- Surface assumptions
- Find edges
- Reveal motivation

**Check context (background, not out loud):**

As you go, mentally check the context checklist from `questioning.md`. If gaps remain, weave questions naturally. Don't suddenly switch to checklist mode.

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
PROJECT_TYPES=$(cat .rihal/references/project-types.yaml)
```

**Classify by signals:**

Scan the user's responses from Step 3 (questioning) for keywords from the `signals` list in project-types.yaml. Build a score per type:

- Each signal match adds 1 point to that type's score
- Pick the type with the highest score
- If tie or score < 2, ask the user to clarify

**If score is clear (>2 points for one type):**

Print the detected type with an offer to confirm:

```
📋 Detected project type: {display_name} (based on your description mentioning {signal1}, {signal2}, {signal3})

Proceed with this type? [Y/n]
```

If "n": Ask the user to pick from the list:

```
Which project type best fits?
- API / Backend Service
- Mobile Application
- SaaS / B2B Platform
- Command-Line Interface / Tool
- Web Application / SPA
- Desktop Application
- IoT / Embedded Device
- Developer Tool / Library / SDK
- Other (generic discovery)
```

**Store the detected type:**

```bash
PROJECT_TYPE=$(echo "$PROJECT_TYPES" | yq ".${selected_type}" -o json)
REQUIRED_SECTIONS="$(echo "$PROJECT_TYPE" | jq -r '.required_sections[]')"
SKIP_SECTIONS="$(echo "$PROJECT_TYPE" | jq -r '.skip_sections[]')"
DISCOVERY_QUESTIONS="$(echo "$PROJECT_TYPE" | jq -r '.discovery_questions[]')"
```

**Adapt discovery for this project type:**

When moving to Step 5 (Workflow Preferences), incorporate type-specific discovery questions into questionnaire:

- Add all questions from `DISCOVERY_QUESTIONS` to the discovery questionnaire
- When showing requirements table (Step 5.5+), show REQUIRED_SECTIONS as must-haves
- When offering optional sections, exclude SKIP_SECTIONS

This allows discovery to be tailored per project type while maintaining a consistent flow.

## 4. Write PROJECT.md

**If auto mode:** Synthesize from provided document. No "Ready?" gate was shown — proceed directly to commit.

Synthesize all context into `.planning/PROJECT.md` using the template from `templates/project.md`.

**For greenfield projects:**

Initialize requirements as hypotheses:

```markdown
## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

### Out of Scope

- [Exclusion 1] — [why]
- [Exclusion 2] — [why]
```

All Active requirements are hypotheses until shipped and validated.

**For brownfield projects (codebase map exists):**

Infer Validated requirements from existing code:

1. Read `.planning/codebase/ARCHITECTURE.md` and `STACK.md`
2. Identify what the codebase already does
3. These become the initial Validated set

```markdown
## Requirements

### Validated

- ✓ [Existing capability 1] — existing
- ✓ [Existing capability 2] — existing
- ✓ [Existing capability 3] — existing

### Active

- [ ] [New requirement 1]
- [ ] [New requirement 2]

### Out of Scope

- [Exclusion 1] — [why]
```

**Key Decisions:**

Initialize with any decisions made during questioning:

```markdown
## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| [Choice from questioning] | [Why] | — Pending |
```

**Last updated footer:**

```markdown
---
*Last updated: [date] after initialization*
```

**Evolution section** (include at the end of PROJECT.md, before the footer):

```markdown
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/rihal:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/rihal:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
```

Do not compress. Capture everything gathered.

**Commit PROJECT.md:**

```bash
mkdir -p .planning
node .rihal/bin/rihal-tools.cjs commit "docs: initialize project" --files .planning/PROJECT.md
```

## 5. Workflow Preferences

**If auto mode:** Skip — config was collected in Step 2a. Proceed to Step 5.5.

Proceed with the questions below.

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

All recommended for important projects. Skip for quick experiments.

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
      { label: "Inherit", description: "Use the current session model for all agents (OpenCode /model)" }
    ]
  }
]
```

Create `.planning/config.json` with all settings (CLI fills in remaining defaults automatically):

```bash
mkdir -p .planning
node .rihal/bin/rihal-tools.cjs config-new-project '{"mode":"[yolo|interactive]","granularity":"[selected]","parallelization":true|false,"commit_docs":true|false,"model_profile":"quality|balanced|budget|inherit","workflow":{"research":true|false,"plan_check":true|false,"verifier":true|false,"nyquist_validation":[false if granularity=coarse, true otherwise]}}'
```

**Note:** Run `/rihal:settings` anytime to update model profile, workflow agents, branching strategy, and other preferences.

**If commit_docs = No:**

- Set `commit_docs: false` in config.json
- Add `.planning/` to `.gitignore` (create if needed)

**If commit_docs = Yes:**

- No additional gitignore entries needed

**Commit config.json:**

```bash
node .rihal/bin/rihal-tools.cjs commit "chore: add project config" --files .planning/config.json
```

## 5.1. Sub-Repo Detection

**Detect multi-repo workspace:**

Check for directories with their own `.git` folders (separate repos within the workspace):

```bash
find . -maxdepth 1 -type d -not -name ".*" -not -name "node_modules" -exec test -d "{}/.git" \; -print
```

**If sub-repos found:**

Strip the `./` prefix to get directory names (e.g., `./backend` → `backend`).

Use AskUserQuestion:

- header: "Multi-Repo Workspace"
- question: "I detected separate git repos in this workspace. Which directories contain code that Rihal should commit to?"
- multiSelect: true
- options: one option per detected directory
  - "[directory name]" — Separate git repo

**If user selects one or more directories:**

- Set `planning.sub_repos` in config.json to the selected directory names array (e.g., `["backend", "frontend"]`)
- Auto-set `planning.commit_docs` to `false` (planning docs stay local in multi-repo workspaces)
- Add `.planning/` to `.gitignore` if not already present

Config changes are saved locally — no commit needed since `commit_docs` is `false` in multi-repo mode.

**If no sub-repos found or user selects none:** Continue with no changes to config.

## 5.5. Resolve Model Profile

Use models from init: `researcher_model`, `synthesizer_model`, `roadmapper_model`.


---

## 6. Research Phase

Load and execute the research subworkflow:

@.rihal/workflows/new-project-research.md

After research completes (or is skipped), continue below.

---

## 7–9. Requirements, Roadmap, and Done

Load and execute the requirements + roadmap subworkflow:

@.rihal/workflows/new-project-roadmap.md
