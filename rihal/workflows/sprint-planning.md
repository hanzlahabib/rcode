# Workflow: rihal:sprint-planning

<purpose>
Plan the next sprint: read epic/story files, compute capacity, prioritize, identify dependencies and risks. Produces a sprint plan document and optional sprint-status.yaml for tracking.

Prefer the phrase-activated skill `rihal-sprint-planning` (say "plan a sprint") for the full guided ceremony. This slash command is a faster direct entry point.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rihal:sprint-planning [--epics <dir>] [--sprints <count>] [--velocity <days>]
```

**Examples:**
```
/rihal:sprint-planning
/rihal:sprint-planning --epics .planning/epics --sprints 2
/rihal:sprint-planning --velocity 10
```

## Step 1 — Discover stories

Default epics/stories location: `.planning/stories/` or `.planning/epics/`. Override with `--epics <dir>`.

If no stories found:
```
❌ No stories discovered.
Run /rihal:create-epics-and-stories first, or say "create a story" to use the skill.
```
Exit.

## Step 2 — Load context

Read `.rihal/state.json` for current phase/milestone. Read `.rihal/config.yaml` for velocity defaults. Override velocity with `--velocity` flag.

## Step 3 — Compute plan

For each story:
- Effort estimate (XS/S/M/L/XL or story points)
- Dependencies (blockers, sequences)
- Priority (from PRD alignment + user impact)

Distribute into sprints based on velocity. Flag any story that can't fit.

## Step 4 — Write plan

Output to `.planning/sprints/sprint-<N>-plan.md` with sections:
- Goal
- Committed stories (with effort + dep)
- At-risk / stretch
- Dependencies graph (ASCII if possible)
- Blockers to resolve before start

Also write `.planning/sprints/sprint-<N>-status.yaml` as a tracking template (state: planned).

## Step 5 — Report

Print a compact summary:
- N sprints planned, M stories total
- Committed vs at-risk count per sprint
- Blockers needing resolution

## Output Format

- `.planning/sprints/sprint-<N>-plan.md` per sprint
- `.planning/sprints/sprint-<N>-status.yaml` tracking stub
- Console summary with next action suggestion

## Examples

### Happy Path
**Input:** `/rihal:sprint-planning`
**Expected:** 2 sprints planned from 8 stories, status yaml scaffolded, summary printed.

### Edge Case: No stories
**Input:** `/rihal:sprint-planning` (empty stories dir)
**Expected:** Graceful exit suggesting create-epics-and-stories or the skill.

### Negative Test
**Input:** `/rihal:sprint-planning --velocity abc`
**Expected:** Reject non-numeric velocity, print usage.
