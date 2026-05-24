# Workflow: rcode-sprint-planning

<purpose>
Plan the next sprint. Authoritative implementation lives in the
`rihal-sprint-planning` skill — this workflow delegates to it so every
safety rail (capacity gate per #127, halt-at-menu per #124, state-sync
per #198) fires identically whether the user invokes the slash command
or the phrase-activated skill.

The skill MUST be loaded before the in-line steps below run. If the skill
file is missing (broken install), report and stop — do not silently fall
back to the in-line implementation.
</purpose>

<delegate_to_skill>
Required skill: `rihal-sprint-planning`
Path:           `.claude/skills/rihal-sprint-planning/SKILL.md`
Workflow ref:   `.claude/skills/rihal-sprint-planning/workflow.md`

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
@rcode/brain/best-practices/no-autonomous-bypass.md
@rcode/brain/best-practices/state-sync-rule.md
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
Next Up: `/rihal-execute .planning/phases/{phase}/SPRINT.md`
</output_format>

<process>
## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rihal-sprint-planning [--phase <NN>] [--velocity <points>] [--goal "Sprint goal"]
```

**Examples:**
```
/rihal-sprint-planning
/rihal-sprint-planning --phase 01 --goal "Auth system MVP"
/rihal-sprint-planning --velocity 13
```

STOP — do not proceed.

## Step 1 — Load context

```bash
STATE=$(node .rcode/bin/rcode-tools.cjs state read)
VELOCITY=$(node .rcode/bin/rcode-tools.cjs state sprint velocity)
```

Extract:
- Current phase from state
- Velocity history + average from velocity output
- Phase scope from `.planning/phases/{phase}/SCOPE.md` (if exists)

If no phases in state:
```
No phases found. Run /rihal-new-project first to create a roadmap.
```
Exit.

## Step 2 — Determine capacity

**If velocity history exists:**
- Use rolling 3-sprint average as capacity baseline
- Commit max 80% of average (buffer for interrupts + unknowns)

**If no velocity history (first sprint):**
- Ask user: "This is your first sprint. How many story points can you commit to? (Typical: 8-13 for solo dev + AI)"
- Or use `--velocity` flag

Store as `velocity_target`.

## Step 3 — Curate stories

Read phase scope (SCOPE.md, REQUIREMENTS.md, or ROADMAP.md phase section).

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

Wait for user confirmation before proceeding.

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

Write SPRINT.md to `.planning/phases/{phase_slug}/SPRINT.md` using the template at `rcode/templates/sprint.md`. Fill in:
- Sprint goal
- Stories table (from user-confirmed list)
- Capacity section (velocity target, average, buffer)
- Dependencies
- Risks (if identified during estimation)

## Step 5 — Start sprint

```bash
node .rcode/bin/rcode-tools.cjs state sprint start
```

## Step 6 — Summary

```
Sprint {sprint_id} created and started.

Goal: {sprint_goal}
Stories: {count} ({total_points} points)
Capacity: {velocity_target} points ({buffer}% buffer)

Next:
  /rihal-execute .planning/phases/{phase}/SPRINT.md   ← execute the sprint
  /rihal-sprint-status                                ← check progress anytime
```

## Output Format

- SPRINT.md at `.planning/phases/{phase_slug}/SPRINT.md`
- Sprint + stories registered in `.rcode/state.json`
- Console summary with next-step commands

## Examples

### Happy Path
**Input:** `/rihal-sprint-planning --phase 01 --goal "Auth MVP"`
**Expected:** Load phase scope, estimate stories, present table, confirm, create SPRINT.md + register in state, start sprint.

### Edge Case: Over capacity
**Input:** 15 points of stories but velocity avg is 10
**Expected:** Flag over-commitment, suggest deferring lowest-priority story.

### Edge Case: No scope
**Input:** Phase has no SCOPE.md or requirements
**Expected:** "No scope found for this phase. Run /rihal-new-project or write a SCOPE.md first."

### Negative Test
**Input:** `/rihal-sprint-planning` with no phases in state
**Expected:** Graceful exit suggesting /rihal-new-project.

</process>
