# autonomous - step 01: Required reading, prerequisite check, prepare branch

This step file was split verbatim out of `workflows/autonomous.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<required_reading>

@.rcode/references/output-format.md
@.rcode/references/workstream-flag.md
@.rcode/references/output-realism.md
@.rcode/brain/best-practices/no-autonomous-bypass.md
@.rcode/brain/best-practices/state-sync-rule.md
@.rcode/references/karpathy-guidelines.md

Read all files referenced by the invoking prompt's execution_context before starting.

</required_reading>

<step name="prerequisite_check" priority="before-everything">

## 0. Prerequisite check (greenfield guard)

rcode supports two valid project-initialization paths, and this gate must
accept either:
- **Full chain:** `/rcode-create-prd` → `/rcode-new-milestone` → `/rcode-create-epics-and-stories`
- **Direct roadmap path:** `/rcode-new-project` → `rcode-roadmapper` writes
  ROADMAP.md directly with phases, no prd.md/epics.md produced — this is a
  first-class supported path, not an edge case, and autonomous execution
  only actually needs a ROADMAP.md with real phases in it to do phase work.

Before any phase work, verify at least one path's minimum requirement is met:

```bash
HAS_PRD=$( ( ls .planning/prd.md .planning/PRD.md .planning/prds/*.md .planning/milestones/*/PRD.md 2>/dev/null | head -1 ) && echo true || echo false)
HAS_EPICS=$( ( ls .planning/epics.md .planning/EPICS.md .planning/epics/*.md .planning/milestones/*/EPICS.md 2>/dev/null | head -1 ) && echo true || echo false)
# Milestone marker: accepts heading style ("## Milestone M1"), bold-prose style
# ("**Milestone:** M1 — ..."), or PROJECT.md's own style ("## Current Milestone: M3 — ...")
# — roadmapper's actual output uses the bold-prose form, which the old heading-only
# regex never matched, permanently failing this gate for every project that used
# the direct roadmap path. Fixed live: confirmed against a real project's ROADMAP.md.
HAS_ROADMAP_MILESTONES=$(grep -qEi "milestone[:*]*\s*M[0-9]" .planning/ROADMAP.md 2>/dev/null && echo true || echo false)
# Direct roadmap path's actual minimum: a ROADMAP.md with at least one real phase.
HAS_ROADMAP_PHASES=$(grep -qE "^##\s*Phase\s+[0-9]|^\|\s*[0-9]+\s*\|" .planning/ROADMAP.md 2>/dev/null && echo true || echo false)
SKIP_FLAG=$(echo "$ARGUMENTS" | grep -qE "\-\-skip-prerequisites" && echo true || echo false)

FULL_CHAIN_OK=$([ "$HAS_PRD" = "true" ] && [ "$HAS_ROADMAP_MILESTONES" = "true" ] && [ "$HAS_EPICS" = "true" ] && echo true || echo false)
DIRECT_PATH_OK=$([ "$HAS_ROADMAP_PHASES" = "true" ] && echo true || echo false)
```

If `SKIP_FLAG=false` AND both `FULL_CHAIN_OK` and `DIRECT_PATH_OK` are false, HALT with a clear message:

```
⚠ Cannot run autonomous: no valid project initialization found.

The autonomous flow needs either:
  A) Full chain: /rcode-create-prd → /rcode-new-milestone → /rcode-create-epics-and-stories
  B) Direct roadmap: /rcode-new-project (produces ROADMAP.md with phases directly)

Neither was found — no ROADMAP.md with real phases exists, and the full
chain's artifacts (prd.md, milestone-marked ROADMAP.md, epics.md) are also
missing.

Suggested first step: /rcode-new-project (recommended — simpler, fully
supported) or /rcode-create-prd if you specifically want the full chain.

If you genuinely want to skip this check, re-invoke with:
/rcode-autonomous --skip-prerequisites
```

If `SKIP_FLAG=true`: print a warning that downstream workflows may produce low-quality output without upstream artifacts, then proceed.

</step>

<step name="prepare_branch">

## 1b. Prepare Branch

Autonomous mode MUST NOT run directly on `main` or `master` without explicit opt-in.
This prevents accidental commits to the default branch during long autonomous runs.

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
ALLOW_MAIN=""
# Canonical flag is --on-main (git-preflight.md, execute.md) — #1092.
# --allow-main is a deprecated alias: still works, but warns.
if echo "$ARGUMENTS" | grep -q '\-\-on-main'; then
  ALLOW_MAIN="true"
elif echo "$ARGUMENTS" | grep -q '\-\-allow-main'; then
  ALLOW_MAIN="true"
  echo "⚠ --allow-main is deprecated — use --on-main (it does the same thing; this alias will be removed)"
fi
```

**If `CURRENT_BRANCH` is `main` or `master` AND `ALLOW_MAIN` is NOT set:**

Create a working branch:

```bash
BRANCH_NAME="rcode/autonomous-${milestone_version}-$(date +%Y%m%d-%H%M%S)"
git checkout -b "${BRANCH_NAME}"
```

Display:

```
🔀 Created branch: ${BRANCH_NAME}
   (autonomous mode does not run on main/master — use --on-main to override)
```

**If `CURRENT_BRANCH` is `main` or `master` AND `ALLOW_MAIN` is set:**

Display warning:

```
⚠ Running on ${CURRENT_BRANCH} — --on-main override active
```

Proceed without branch creation.

**If `CURRENT_BRANCH` is any other branch:** Proceed silently — user intentionally set up a working branch.

Store `CURRENT_BRANCH` for the lifecycle step — if autonomous created the branch, it will suggest a PR at completion.

</step>

Next: Read `.rcode/workflows/autonomous/steps/02-init-discover.md` before starting it (skip it if its Read-when condition is false).
