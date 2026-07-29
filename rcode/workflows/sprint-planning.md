# Workflow: rcode-sprint-planning

<purpose>
Plan the next sprint. Authoritative implementation lives in the
`rcode-sprint-planning` skill — this workflow delegates to it so every
safety rail (capacity gate per #127, halt-at-menu per #124, state-sync
per #198) fires identically whether the user invokes the slash command
or the phrase-activated skill.

The skill MUST be loaded before the in-line steps below run. If the skill
file is missing (broken install), report and stop — do not silently fall
back to the in-line implementation.
</purpose>

<delegate_to_skill>
Required skill: `rcode-sprint-planning`
Path:           `.rcode/skills/rcode-sprint-planning/SKILL.md`
Workflow ref:   `.rcode/skills/rcode-sprint-planning/workflow.md`
Fallback path:  `.claude/skills/rcode-sprint-planning/SKILL.md`

Behaviour:
1. Load the skill's `SKILL.md` and `workflow.md`. Apply every Critical
   Rule from the workflow's `## CRITICAL RULES (NO EXCEPTIONS)` block,
   including the capacity gate (step n="0") which MUST halt for
   numeric capacity inputs before any story is committed.
2. Run the skill's step files in order. The in-line steps below this
   block are a fallback summary for legacy installs that lack the skill;
   they are NOT the authoritative behaviour.
3. After SPRINT.md is written, ALWAYS run:
   `node .rcode/bin/rcode-tools.cjs state sync --from-disk`
   so state.sprints[] reflects the new sprint.

If skill files are missing: print
"Sprint-planning skill not installed. Run: npx @hanzlaa/rcode install"
and exit non-zero. Do not proceed with the legacy in-line steps because
they bypass the capacity gate.
</delegate_to_skill>

<required_reading>
@.rcode/references/output-format.md
@.rcode/brain/best-practices/no-autonomous-bypass.md
@.rcode/brain/best-practices/state-sync-rule.md
@.rcode/references/karpathy-guidelines.md
</required_reading>

<output_format>
Open with banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PLANNING SPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
TaskCreate: "Load phase scope + velocity", "Capacity gate (halt for numbers)", "Curate stories with user", "Register sprint + stories in state", "Write SPRINT.md", "Sync state", "Start sprint".
Closure: `rcode ► SPRINT {NN.S} READY ✓ ({N} stories, {M} points)`
Next Up: `/rcode-execute .planning/phases/{phase}/{phase}-{plan}-SPRINT.md`
</output_format>

<process>
## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rcode-sprint-planning [--phase <NN>] [--velocity <points>] [--goal "Sprint goal"]
```

**Examples:**
```
/rcode-sprint-planning
/rcode-sprint-planning --phase 01 --goal "Auth system MVP"
/rcode-sprint-planning --velocity 13
```

STOP — do not proceed.

## Preflight — Project-status check

```bash
PROJECT_STATUS=$(node .rcode/bin/rcode-tools.cjs project-status 2>/dev/null || echo uninitialized)
```

If `PROJECT_STATUS` is `uninstalled`, `uninitialized`, or `stub`:

```
Project not initialized. Run /rcode-init first (or /rcode-new-project for a greenfield project), then return here.
```

Stop. Do not proceed until `project-status` returns `real`.

## Preflight — Dependency check

If a `package.json` exists in the project root but `node_modules/` is absent or empty, emit a WARNING before planning begins:

```
⚠ WARNING: package.json found but node_modules/ is missing or empty.
  Run: pnpm install   (or npm install if pnpm is not available)
  Sprint planning can continue, but the resulting sprint tasks will fail at execution time
  unless dependencies are installed first.
```

Do NOT auto-run the install. Emit the message and let the user decide.

## Step 1 — Load context

```bash
STATE=$(node .rcode/bin/rcode-tools.cjs state read)
VELOCITY=$(node .rcode/bin/rcode-tools.cjs state sprint velocity)
```

Extract:
- Current phase from state
- Velocity history + average from velocity output
- Phase scope from `.planning/phases/{phase}/REQUIREMENTS.md` (preferred) or `SCOPE.md` (legacy alias) — both are acceptable; REQUIREMENTS.md is the file created by the standard planning pipeline

If no phases in state:
```
No phases found. If you have a ROADMAP.md, sync state first:
  node .rcode/bin/rcode-tools.cjs state sync --from-disk
Otherwise run /rcode-new-project first to create a roadmap.
```
Exit.

## Step 2 — Determine capacity

**If velocity history exists:**
- Use rolling 3-sprint average as capacity baseline
- Commit max 80% of average (buffer for interrupts + unknowns)

**If no velocity history (first sprint):**
- If `--velocity <N>` flag was supplied, use that value directly and skip the prompt.
- If `mode == "yolo"` (config) and no `--velocity` flag, default to 10 points and proceed.
- Otherwise ask user: "This is your first sprint. How many story points can you commit to? (Typical: 8-13 for solo dev + AI)"

Store as `velocity_target`.

## Step 3 — Curate stories

Read phase scope (REQUIREMENTS.md preferred, fall back to SCOPE.md or the ROADMAP.md phase section).

For each requirement/feature in scope:
1. Break into stories: `As a [user], I want [action] so that [outcome]`
2. Estimate: XS(1) / S(2) / M(3) / L(5) / XL(8)
3. Stories > 8 points → split immediately
4. Prioritize: must-have first, nice-to-have last

Present story table to user:

```markdown
| # | Story | Points | Priority | Acceptance |
|---|-------|--------|----------|------------|
| 1 | Login endpoint | 5 | must | Returns JWT on valid creds |
| 2 | Register endpoint | 3 | must | Creates user, hashes password |
| 3 | Rate limiting | 2 | should | 429 after 10 req/min |
```

**Capacity check:** Total committed points <= velocity_target.
If over: "We're at {N} points vs {target} capacity. Move story #{X} to next sprint?"

**Automation escape:** if `mode == "yolo"` or `--auto` flag was passed, skip the
confirmation; automatically move lowest-priority over-capacity stories to backlog
and proceed. Otherwise wait for user confirmation before proceeding.

## Step 4 — Create sprint

After user confirms stories:

```bash
# Register sprint in state
node .rcode/bin/rcode-tools.cjs state sprint add \
  --phase "{phase_name}" \
  --goal "{sprint_goal}" \
  --velocity {velocity_target}

# Register each story
node .rcode/bin/rcode-tools.cjs state story add \
  --title "{story_title}" \
  --points {points}
```

Write SPRINT.md to `.planning/phases/{phase_slug}/{phase}-{plan}-SPRINT.md`. Use `.rcode/templates/sprint.md` as a template if it exists; otherwise produce the file inline with these sections (the template file may be absent in this install). Fill in:
- Sprint goal
- Stories table (from user-confirmed list)
- Capacity section (velocity target, average, buffer)
- Dependencies
- Risks (if identified during estimation)

## Step 5 — Start sprint

```bash
# Extract the sprint id written by state sprint add in Step 4 (format: NN.S, e.g. "1.1")
node .rcode/bin/rcode-tools.cjs state sprint start --sprint "{sprint_id}"
```

If `sprint_id` is unavailable, omit the flag — the tool will attempt to start the most recently added sprint. The `--sprint NN.S` flag is required when no sprint is marked active.

## Step 6 — Summary

```
Sprint {sprint_id} created and started.

Goal: {sprint_goal}
Stories: {count} ({total_points} points)
Capacity: {velocity_target} points ({buffer}% buffer)

Next:
  /rcode-execute .planning/phases/{phase}/{phase}-{plan}-SPRINT.md   ← execute the sprint
  /rcode-sprint-status                                ← check progress anytime
```

## Output Format

- SPRINT.md at `.planning/phases/{phase_slug}/{phase}-{plan}-SPRINT.md`
- Sprint + stories registered in `.rcode/state.json`
- Console summary with next-step commands

## Examples

### Happy Path
**Input:** `/rcode-sprint-planning --phase 01 --goal "Auth MVP"`
**Expected:** Load phase scope, estimate stories, present table, confirm, create SPRINT.md + register in state, start sprint.

### Edge Case: Over capacity
**Input:** 15 points of stories but velocity avg is 10
**Expected:** Flag over-commitment, suggest deferring lowest-priority story.

### Edge Case: No scope
**Input:** Phase has no SCOPE.md or requirements
**Expected:** "No scope found for this phase. Run /rcode-new-project or write a SCOPE.md first."

### Negative Test
**Input:** `/rcode-sprint-planning` with no phases in state
**Expected:** Graceful exit suggesting /rcode-new-project.

</process>

## Next Up

- `/rcode-execute-sprint` — execute the planned sprint
- `/rcode-sprint-status` — check sprint progress during execution
