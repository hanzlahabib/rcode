# new-project - step 02: Setup, project type classification, brownfield discovery path

This step file was split verbatim out of `workflows/new-project.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<process>

## 1. Setup

**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

```bash
INIT=$(node .rcode/bin/rcode-tools.cjs init new-project 2>/dev/null || node .rcode/bin/rcode-tools.cjs init)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_RESEARCHER=$(node .rcode/bin/rcode-tools.cjs agent-info rcode-project-researcher 2>/dev/null)
AGENT_SYNTHESIZER=$(node .rcode/bin/rcode-tools.cjs agent-info rcode-research-synthesizer 2>/dev/null)
AGENT_ROADMAPPER=$(node .rcode/bin/rcode-tools.cjs agent-info rcode-roadmapper 2>/dev/null)
RESEARCHER_MODEL=$(node .rcode/bin/rcode-tools.cjs resolve-model project-researcher 2>/dev/null || echo "sonnet")
SYNTHESIZER_MODEL=$(node .rcode/bin/rcode-tools.cjs resolve-model research-synthesizer 2>/dev/null || echo "sonnet")
ROADMAPPER_MODEL=$(node .rcode/bin/rcode-tools.cjs resolve-model roadmapper 2>/dev/null || echo "sonnet")
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

**If `project_exists` is true:** Error — project already initialized. Use `/rcode-progress`.

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
  - "Map codebase first" — Run /rcode-map-codebase to understand existing architecture (Recommended)
  - "Skip mapping" — Proceed with targeted discovery

**If "Map codebase first":**

```
Run `/rcode-map-codebase` first, then return to `/rcode-new-project`
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
      "Migration to new tech stack",
      "Bug fixes, refactoring and tech debt",
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

Next: Read `.rcode/workflows/new-project/steps/03-auto-config.md` before starting it (skip it if its Read-when condition is false).
