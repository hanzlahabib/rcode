# new-project - step 01: Required reading, output format, usage check, existing-project detection, auto mode detection

This step file was split verbatim out of `workflows/new-project.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<required_reading>
@.rcode/references/auto-init-guard.md
@.rcode/references/output-format.md

Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<output_format>
Open with banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► NEW PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use TaskCreate at workflow start to show the full journey:
- TaskCreate: "Detect project type (greenfield / brownfield)"
- TaskCreate: "Collect workflow config (mode, granularity, parallelization, models, agents)"
- TaskCreate: "Write and commit PROJECT.md"
- TaskCreate: "Run domain research (4 parallel agents + synthesizer)" — if research enabled
- TaskCreate: "Define REQUIREMENTS.md"
- TaskCreate: "Spawn rcode-roadmapper to build ROADMAP.md"
- TaskCreate: "Finalize: STATE.md, CLAUDE.md refresh, commit"

Mark one in_progress at a time. Mark completed immediately after each step.

Per-stage banners:
- `rcode ► QUESTIONING`
- `rcode ► RESEARCHING`
- `rcode ► RESEARCH COMPLETE ✓`
- `rcode ► DEFINING REQUIREMENTS`
- `rcode ► CREATING ROADMAP`
- `rcode ► PROJECT INITIALIZED ✓`

**Brownfield detection banner** (if existing code found):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► BROWNFIELD DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Existing {stack} code found in {path}. Mapping it first will save
duplication during planning.
```

Then AskUserQuestion to route to /rcode-map-codebase before proceeding.

**Exiting to map-codebase handoff:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► EXITING TO CODEBASE MAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Per the workflow, mapping runs first. After it finishes I'll re-enter
/rcode-new-project automatically with the map in hand.

Handing off to /rcode-map-codebase now.
```
</output_format>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-new-project <argument-here>
```

**Examples:**
```
/rcode-new-project employee leave request tracker for an Omani government ministry
/rcode-new-project car rental marketplace SEO site for Dubai
/rcode-new-project tasbeeh app with Arabic RTL support for Android
```

STOP — do not proceed.

<available_agent_types>
Valid rcode subagent types (use exact names — do not fall back to 'general-purpose'):
- rcode-project-researcher — Researches project-level technical decisions
- rcode-research-synthesizer — Synthesizes findings from parallel research agents
- rcode-roadmapper — Creates phased execution roadmaps
</available_agent_types>

## Step 0.5 — Detect existing project (stub-aware redirect)

Before any processing, classify the project state into one of:

- **none** — no `.rcode/state.json`, no `.planning/` → proceed
- **stub** — install-seeded scaffolding only (issue #670) → proceed (overwrite stub)
- **real** — a previous `/rcode-new-project` ran here → guard, unless `--force`

```bash
# --force / --reinit bypasses the guard entirely (issue #672).
# --auto implies --force on stub state (issue #674).
FORCE=false
case " $ARGUMENTS " in
  *" --force "*|*" --reinit "*) FORCE=true ;;
esac

# Single source of truth: rcode-tools project-status returns one of
#   uninstalled | uninitialized | stub | real
# (see issue #675 for the contract). Falls back to `none` when
# rcode-tools is unavailable so the workflow still proceeds.
PROJECT_STATE=$(node .rcode/bin/rcode-tools.cjs project-status 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).status||'none')}catch{console.log('none')}})" \
  || echo "none")
[ "$PROJECT_STATE" = "uninstalled" ] || [ "$PROJECT_STATE" = "uninitialized" ] && PROJECT_STATE="none"
```

**If `PROJECT_STATE=real` and `FORCE=false`:** show the guard:

```
⚠ A rcode project already exists here.

Quick actions:
  /rcode-status            check current state
  /rcode-next              find next action
  /rcode-add-phase         add a phase to the current milestone

To start over (overwrites .planning/* and .rcode/state.json):
  /rcode-new-project --force <description>
  npx @hanzlaa/rcode install --reset           nuclear option — wipes config + state
```

STOP — do not proceed.

**If `PROJECT_STATE=stub` (issue #670 install scaffolding):** print a one-liner and proceed:

```
ℹ Install stub detected — overwriting with real project setup.
```

**If `PROJECT_STATE=none`:** proceed silently.

**If `PROJECT_STATE=real` and `FORCE=true`:** create a rollback tag, then proceed:

```bash
if git rev-parse --git-dir >/dev/null 2>&1; then
  TAG="pre-rcode-rewrite-$(date +%Y%m%d-%H%M%S)"
  git tag "$TAG" 2>/dev/null && echo "ℹ Rollback tag created: $TAG"
fi
```

In interactive mode (not `--auto`), confirm via AskUserQuestion before overwriting. In `--auto` or YOLO mode, proceed without confirmation.

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

- File reference: `/rcode-new-project --auto @prd.md`
- Pasted/written text in the prompt

If no document content provided, error:

```
Error: --auto requires an idea document.

Usage:
  /rcode-new-project --auto @your-idea.md
  /rcode-new-project --auto [paste or write your idea here]

The document should describe what you want to build.
```

</auto_mode>

Next: Read `.rcode/workflows/new-project/steps/02-setup-classify.md` before starting it (skip it if its Read-when condition is false).
