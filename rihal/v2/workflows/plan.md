# Workflow: rihal:plan

<purpose>
Convert council session follow-ups or freeform task descriptions into executable PLAN.md files. Spawns rihal-planner as a single subagent that writes structured plans to `.planning/plans/`.
</purpose>

## Note on reference loading

References (execution-protocol.md, commit-conventions.md) are loaded ONLY when Step 0 determines valid arguments are present. Usage check happens first to print help quickly without reading files.

<available_agent_types>
- `rihal-planner` — plan writer subagent
</available_agent_types>

## Step 0 — Initialize

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init plan "$ARGUMENTS")
```

### Step 0.5 — Detect decision questions (STOP and redirect)

`/rihal:plan` converts CONCRETE TASKS into PLAN.md files. It does NOT answer strategic questions or weigh options.

**If the input is a question (contains "should we", "should I", "which is better", "A or B", "vs", "worth it", "kya karna", or ends with "?"), STOP immediately and redirect to `/rihal:council`.**

Classify the input by running:
```bash
node .rihal/bin/rihal-tools.cjs classify-question "$ARGUMENTS"
```

If `question_type` is `market`, `discovery`, `greenfield`, or the input matches a decision pattern, print EXACTLY this block and STOP (do not spawn planner):

```
⚠ That's a decision question, not a planning input.

/rihal:plan turns concrete tasks into executable PLAN.md files.
/rihal:council answers "should we do X?" questions with a panel of experts.

Copy-paste this to ask the council instead:

/rihal:council $ARGUMENTS
```

**Important formatting:** the suggested `/rihal:council` command MUST be on a single line with no line breaks, so the user can copy it verbatim. Do not split, wrap, or bullet it.

Only proceed past this step if the input is a concrete task description (e.g., "set up Next.js 16 project") or a council session file path.

Parse:
- `input_type` — `"session"`, `"file"`, or `"description"`
- `resolved_path` — absolute path to the input file (if session/file type)
- `description` — raw text (if description type)
- `phase_slug` — from `--phase` flag or auto-generated from input
- `output_dir` — from `--output` flag or default `.planning/plans/{phase_slug}/`
- `config` — `{ user_name, project_name, language, mode }`
- `paths` — standard rihal paths

**If no arguments:** print usage and stop:
```
Usage: /rihal:plan <council-session.md | "task description"> [--phase <name>] [--output <dir>]

Examples:
  /rihal:plan .planning/council-sessions/council-2026-04-12-affiliate-site.md
  /rihal:plan "set up Next.js 16 project with next-intl for Arabic"
  /rihal:plan .planning/council-sessions/ --phase 01-setup
```

## Step 1 — Resolve input

**If `input_type === "session"`:**
Read the file at `resolved_path`. Extract the `## Follow-ups` section. If no Follow-ups section, read the full `## Panel Responses` section as input.

Print:
```
📖 Planning from council session: {filename}
   Follow-ups found: {count}
```

**If `input_type === "description"`:**
Print:
```
📖 Planning from description: "{first 80 chars}..."
```

## Step 2 — Spawn rihal-planner

Spawn a single `rihal-planner` subagent:

```
Agent tool call:
  subagent_type: "rihal-planner"
  description: "Generate PLAN.md files from council follow-ups"
  prompt: |
    Write executable PLAN.md files from the input below.

    ## Input
    {the follow-ups text or description}

    ## Output directory
    {output_dir}

    ## Phase slug
    {phase_slug}

    ## Project context
    - Project: {config.project_name}
    - Root: {paths.project_root}

    ## PLAN.md schema (follow exactly)
    {contents of execution-protocol.md — the PLAN.md schema section}

    ## Commit conventions
    {contents of commit-conventions.md — the format section}

    Write the plans. Print your summary at the end.
```

## Step 3 — Print planner output

Print the rihal-planner's output **verbatim**. Do not summarize.

## Step 4 — Update state

```bash
node .rihal/bin/rihal-tools.cjs state record-session 2>/dev/null || true
```

Silent — if state.json missing, ignore.

## Errors

- **Input file not found:** print the path, stop.
- **No follow-ups in session artifact:** fall back to reading full Panel Responses as input.
- **rihal-planner returns empty output:** print "Planner produced no plans. Check input."
- **rihal-tools.cjs missing:** tell user to run `rihal-code install-v2`.
