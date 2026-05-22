---
plan: "03"
title: rcode-planner agent + /rcode-plan command — council follow-ups → PLAN.md files
priority: high
depends_on: ["01", "02"]
estimated_effort: large
---

## Objective

Close the council → execution loop. Right now council sessions produce follow-up action items in a markdown file that go nowhere. This plan creates `rcode-planner`, a subagent that reads a council session artifact (or a list of follow-up items) and produces executable PLAN.md files that `rcode-executor` can run.

## Context

- Council session artifacts live at `.planning/council-sessions/council-{date}-{slug}.md`
- They contain a `## Follow-ups` section with `- [ ] {action item}` checkboxes
- The PLAN.md schema is defined in `rcode/v2/references/execution-protocol.md`
- `rcode-planner` is a subagent (like rcode-executor) — it does one job and exits
- The orchestrator is `/rcode-plan` — it resolves the input, spawns rcode-planner, prints output
- Plans should be written to `.planning/plans/{phase-slug}/PLAN.md` (or a path the user specifies)

## rcode-planner agent design

```
name: rcode-planner
description: Converts council follow-ups or freeform task descriptions into
             executable PLAN.md files. Spawned by /rcode-plan.
tools: Read, Write, Glob, Grep, Bash
model: claude-opus-4-6
```

**What it does:**
1. Reads the input (council session artifact or raw follow-up text)
2. Identifies distinct work streams (each follow-up may map to 1 or more PLAN.md files)
3. For each work stream, produces a valid PLAN.md following execution-protocol.md schema
4. Writes files to `.planning/plans/{slug}/` (creates dirs as needed)
5. Prints a summary: how many plans written, paths, estimated complexity

**What it does NOT do:**
- Does not execute the plans
- Does not modify state.json (that's the orchestrator's job)
- Does not ask clarifying questions (it makes reasonable assumptions and documents them)
- Does not invent tasks not implied by the follow-ups

## Tasks

### Task 1 — Write rcode-planner.md agent definition
type: auto
**Steps:**
1. Create `rcode/v2/agents/rcode-planner.md`
2. Include these sections:

   **`<role>`** — You are the rcode plan writer. You convert council follow-up items into executable PLAN.md files. You are spawned by /rcode-plan. You do not execute plans, advise strategy, or ask questions.

   **`<input_formats>`** — Three input types this agent handles:
   - Council session artifact path: `rcode-plan .planning/council-sessions/council-2026-04-12-foo.md`
   - Raw follow-up text passed directly in the prompt
   - Phase name + loose description: `rcode-plan "set up Next.js project"`

   **`<planning_rules>`**
   - One PLAN.md per distinct work stream (not per follow-up item — group related items)
   - Maximum 8 tasks per plan. If more needed, split into multiple plans with `depends_on`
   - Every task must have: type, steps, done_when, commit message
   - Checkpoint tasks only when human verification is genuinely needed
   - Be specific — "install next-intl" not "set up i18n"
   - Commit messages follow rcode commit-conventions.md format

   **`<output_rules>`**
   - Write plans to `.planning/plans/{slug}/` where slug is kebab-case of the work stream name
   - If writing multiple plans for the same logical phase, number them: `01-setup.md`, `02-content.md`
   - After writing all files, print:
     ```
     📋 Plans written: {n}
     {path} — {objective one-liner} ({task count} tasks)
     {path} — ...

     Run with: /rcode-execute {phase-slug}
     ```

   **`<assumption_documentation>`**
   - Add an `## Assumptions` section at the bottom of each PLAN.md listing what was assumed
   - This makes the plan auditable — executor or human can catch wrong assumptions before running

3. Keep the file under 300 lines. If it grows beyond that, extract rules to `execution-protocol.md`.
**Done when:** `rcode/v2/agents/rcode-planner.md` exists and is complete
**Commit:** `feat(agents): add rcode-planner agent definition`

### Task 2 — Create /rcode-plan slash command and workflow
type: auto
**Steps:**
1. Create `rcode/v2/commands/plan.md`:
   ```yaml
   ---
   name: rcode-plan
   description: Convert council follow-ups or task descriptions into executable PLAN.md files
   argument-hint: "<council-session-path|phase-description> [--phase <name>] [--output <dir>]"
   allowed-tools: [Read, Write, Glob, Grep, Bash, Agent]
   ---
   ```
2. Create `rcode/v2/workflows/plan.md`:

   **Step 0 — Init:**
   ```bash
   node .rcode/bin/rcode-tools.cjs init plan "$ARGUMENTS"
   ```
   Returns: `{ input_type, resolved_path, phase_slug, output_dir, config, paths }`

   **Step 1 — Resolve input:**
   - If arg ends in `.md` and exists → read file, extract `## Follow-ups` section
   - If arg is a path pattern → glob for council session files, pick most recent
   - If arg is plain text → treat as freeform task description
   - Print: `📖 Planning from: {source description}`

   **Step 2 — Spawn rcode-planner:**
   Spawn a single `rcode-planner` subagent with:
   - The resolved input content
   - The output directory
   - The execution-protocol.md schema (include verbatim or @-reference)
   - Commit conventions reference

   **Step 3 — Print results verbatim** from planner output (no summarization)

   **Step 4 — Update state:**
   ```bash
   node .rcode/bin/rcode-tools.cjs state record-session
   ```
3. Register `/rcode-plan` in skills manifest
**Done when:** workflow and command files exist
**Commit:** `feat(workflows): add /rcode-plan command and workflow`

### Task 3 — Extend rcode-tools.cjs with init plan subcommand
type: auto
**Steps:**
1. Add `init plan "<args>"` to rcode-tools.cjs:
   - Parse `--phase <name>` flag → `phase_slug`
   - Parse `--output <dir>` flag → `output_dir` (default: `.planning/plans/`)
   - If arg ends in `.md`: `input_type = "session"`, `resolved_path = <arg>`
   - If arg is a path that exists: `input_type = "file"`, `resolved_path = <arg>`
   - Otherwise: `input_type = "description"`, `description = <arg>`
   - Return JSON blob
2. Add `plan list` subcommand — glob `.planning/plans/**/*.md`, return array of `{ path, phase, plan, objective }` parsed from frontmatter
**Done when:** `node .rcode/bin/rcode-tools.cjs init plan` works for all three input types
**Commit:** `feat(cli): add init plan and plan list to rcode-tools`

### Task 4 — Wire planner into install-v2.js
type: auto
**Steps:**
1. Add `rcode-planner.md` to agent copy step in `install-v2.js`
2. Add `plan.md` command to slash-command copy step
3. Add `plan.md` workflow to workflow copy step
4. Add planner row to agent-manifest template:
   `planner,.claude/agents/rcode-planner.md,rcode-planner,"Plan writer — spawned by /rcode-plan to convert council follow-ups or task descriptions into executable PLAN.md files.",cyan`
**Done when:** fresh install includes rcode-planner agent and /rcode-plan command
**Commit:** `feat(install): wire rcode-planner and /rcode-plan into install pipeline`

### Task 5 — Validate: plan from today's council session
type: checkpoint:human-verify
**What executor does:** Runs `/rcode-plan .planning/council-sessions/council-2026-04-12-yar-aik-affiliate-site-bnanai.md` against the test project.
**Verify:**
- At least 2 PLAN.md files are written to `.planning/plans/`
- Each file has valid frontmatter (phase, plan, type, depends_on fields present)
- Each file has Objective, Success criteria, and at least 2 Tasks sections
- Each task has type, Steps, Done when, and Commit fields
- Plans reference the affiliate site context (Next.js, noon.ae, Hammad bhai) — not generic boilerplate

## Success criteria
- [ ] `rcode-planner.md` agent exists and is installed by `install-v2.js`
- [ ] `/rcode-plan <session-path>` produces valid PLAN.md files from a council artifact
- [ ] `/rcode-plan "set up a Next.js project"` produces a valid PLAN.md from plain text
- [ ] All produced PLAN.md files pass the execution-protocol.md schema (can be manually checked)
- [ ] `rcode-tools.cjs plan list` returns the generated plans
- [ ] Produced plans can be run by `/rcode-execute` without schema errors
