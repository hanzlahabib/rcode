# Workflow: rihal:plan

<purpose>
Convert council session follow-ups or freeform task descriptions into executable PLAN.md files. Spawns rihal-planner as a single subagent that writes structured plans to `.planning/plans/`.
</purpose>

## Note on reference loading

References (execution-protocol.md, commit-conventions.md) are loaded ONLY when Step 0 determines valid arguments are present. Usage check happens first to print help quickly without reading files.

<available_agent_types>
- `rihal-planner` — plan writer subagent
</available_agent_types>

## Step 0 — Initialize and validate

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init plan "$ARGUMENTS")
```

### Step 0.1 — Detect decision questions (STOP and redirect)

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
- `scope` — detected scope classification (see Step 0.2 below)

**If no arguments:** print usage and stop:
```
Usage: /rihal:plan <council-session.md | "task description"> [--phase <name>] [--output <dir>]

Examples:
  /rihal:plan .planning/council-sessions/council-2026-04-12-affiliate-site.md
  /rihal:plan "set up Next.js 16 project with next-intl for Arabic"
  /rihal:plan .planning/council-sessions/ --phase 01-setup
```

### Step 0.2 — Detect scope and right-size the output

Before spawning the planner, classify the input scope. Match the FIRST signal that applies:

| Scope | Signals | Output |
|-------|---------|--------|
| ticket | "fix", "bug", "typo", "small", "quick", GitHub issue URL, input < 100 chars, single filename mentioned | 1 PLAN.md with 3-5 inline tasks |
| feature | "add", "implement", "build X", 1-3 files mentioned, < 300 chars | 1 PLAN.md with 5-8 tasks |
| phase | "phase", "epic", "sprint", multiple components mentioned, 300-800 chars | 1 PLAN.md with up to 8 tasks + depends_on |
| initiative | "milestone", "initiative", "roadmap", multi-team signals, > 800 chars | Multiple PLAN.md files with waves |

### If scope = ticket AND a single file is mentioned (look for *.py, *.ts, *.js, *.md etc):
Suggest `/rihal:quick` instead:
```
⚠ This looks like a single-file task — /rihal:quick is faster.

/rihal:quick is for single-purpose work: executor spawned directly,
atomic commit, no plan file needed.

Copy-paste to use quick instead:

/rihal:quick $ARGUMENTS

Or proceed with /rihal:plan if you want a planned artifact anyway.
```

Give user a chance to override via AskUserQuestion (proceed with plan / switch to quick).

### If input contains a GitHub issue URL (pattern: github.com/*/issues/N):
Try to fetch the issue's effort label:
```bash
ISSUE_URL="$extracted_url"
LABELS=$(gh issue view "$ISSUE_URL" --json labels -q '.labels[].name' 2>/dev/null)
EFFORT=$(echo "$LABELS" | grep -iE "extra small|xs|small|medium|large|xl" | head -1)
```

Map effort to scope:
- "Extra Small" / XS / <1 day → ticket
- "Small" / S / 1-3 days → feature
- "Medium" / M → phase
- "Large" / XL → initiative

This overrides keyword-based classification when available.

### Pass scope to Step 2.5:
The `INIT` object returned from Step 0 now includes the `scope` field. Extract this and pass it to the planner prompt in Step 2.5.

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

## Step 2 — Research phase (conditional)

**If `flags.research === true`:**

Spawn `rihal-phase-researcher` subagent:

```
Agent tool call:
  subagent_type: "rihal-phase-researcher"
  description: "Research topic and generate context"
  prompt: |
    Research the following topic and generate context:
    
    Topic: {description or follow-ups summary}
    Project: {config.project_name}
    Output directory: {output_dir}
    
    Write findings to: {output_dir}/RESEARCH.md
    
    Include:
    - Background and context
    - Technical considerations
    - Best practices and patterns
    - Relevant tools and libraries
    - Known pitfalls to avoid
```

After researcher completes, read the generated `{output_dir}/RESEARCH.md` file. Include its full contents in the planner prompt (Step 2.5).

**If `flags.research === false`:** Skip to Step 2.5 (spawn planner).

## Step 2.5 — Spawn rihal-planner

Spawn a single `rihal-planner` subagent:

```
Agent tool call:
  subagent_type: "rihal-planner"
  description: "Generate PLAN.md files from council follow-ups"
  prompt: |
    Write executable PLAN.md files from the input below.

    ## Input
    {the follow-ups text or description}

    ## Scope
    {scope detected in Step 0.2: ticket | feature | phase | initiative}
    {if ticket}: Produce ONE PLAN.md with 3-5 inline tasks. Do not split into multiple plans.
    {if feature}: Produce ONE PLAN.md with 5-8 tasks.
    {if phase}: Produce ONE PLAN.md with up to 8 tasks + depends_on where needed.
    {if initiative}: Produce multiple PLAN.md files with dependency waves.

    ## Research context (if available)
    {If RESEARCH.md was generated in Step 2, include its full contents here}

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

## Step 3 — Verify plan

After planner completes, spawn `rihal-plan-checker` subagent to validate the PLAN.md:

```
Agent tool call:
  subagent_type: "rihal-plan-checker"
  description: "Verify PLAN.md structure and completeness"
  prompt: |
    Verify the PLAN.md files in this directory: {output_dir}
    
    Check for:
    - Valid YAML frontmatter (phase, objective, depends_on)
    - All tasks present and properly formatted
    - Checkpoints correctly placed
    - References to execution-protocol.md standards
    
    Return PASS or a list of issues found.
```

### Step 3.5 — Handle verification results

**Initialize retry counter:** `retries = 0`

**If plan-checker returns PASS:**
- Proceed to Step 4 (print output)

**If plan-checker returns issues:**
- If `retries < 2`:
  1. Increment `retries`
  2. Spawn `rihal-planner` again with prompt:
     ```
     The plan had these issues:
     {issues list from plan-checker}
     
     Fix them and regenerate the PLAN.md file(s) at: {output_dir}
     ```
  3. After planner completes, loop back to Step 3.5 (verify again)

- If `retries = 2`:
  1. Print warning:
     ```
     ⚠ Plan verification failed after 2 retries. Saving anyway.
     Issues:
     {issues list}
     ```
  2. Proceed to Step 4 (print output)

## Step 4 — Print planner output

Print the rihal-planner's output **verbatim**. Do not summarize.

## Step 5 — Update state

```bash
node .rihal/bin/rihal-tools.cjs state record-session 2>/dev/null || true
```

Silent — if state.json missing, ignore.

## Success Criteria

- [ ] Plan file(s) written to output_dir with correct naming and YAML frontmatter
- [ ] Plan-checker validation passes (or user proceeds with warnings if retries exhausted)
- [ ] Planner output printed verbatim to user
- [ ] State updated with session record

## On Error

- **No arguments:** print usage block, stop.
- **Decision question detected:** redirect to `/rihal:council` (Step 0.1).
- **Input file not found:** print the path, stop.
- **state.json missing or corrupted:** continue without error — plan artifact is mandatory, state tracking is optional.
- **No follow-ups in session artifact:** fall back to reading full Panel Responses as input.
- **rihal-planner returns empty output:** print "Planner produced no plans. Check input."
- **rihal-plan-checker fails to load:** print the error, proceed to Step 4 anyway (skip verification).
- **rihal-tools.cjs missing:** tell user to run `rihal-code install-v2`.
