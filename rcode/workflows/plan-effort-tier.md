<purpose>
Sub-step of plan.md — Step 4.5 (Effort-Tier Pre-Plan Gate) and the Post-Plan
Gate applied later at step 9. Implements #950's effort-tier auto-scaling as
two independent, additive gates on top of the flags the pipeline already
reads (`--skip-research`, `--skip-verify`) — not a second parallel code path.

**Why two gates and not one classifier.** #950 originally asked for a single
upfront "effort tier" (trivial/small/normal/complex) detected before planning
starts, keyed partly on sprint count. Sprint count isn't knowable until AFTER
`rcode-planner` runs (plan.md step 9 already proves this — it counts
`*-SPRINT.md` files post-planning). So this file implements the tier as two
independent signals applied at the two points where each is actually known:

- **Research** is gated on risk keywords, known before planning (this file,
  applied inline at step 4.5).
- **Verification** is gated on sprint count, known only after planning
  (this file's Post-Plan Gate section — read now, applied later at step 9).

Neither gate touches the other's flag. A phase can skip research and still
get the full checker + revision loop, or vice versa, exactly as `--skip-research`
and `--skip-verify` already behave as independent flags today.
</purpose>

## Tier Override Resolution

**Skip if `EFFORT_TIER_OVERRIDE` (from step 2) is empty.** Nothing below in
this section applies — fall through to the keyword scan and sprint-count gate
as normal.

`--tier` never introduces a new mechanism — it sets the exact flags this
workflow already reads, exactly as if the user had typed them:

| `--tier` value | Effect |
|---|---|
| `trivial` or `small` | `EFFORT_TIER_SKIP_RESEARCH=true` (same as `--skip-research`) AND `EFFORT_TIER_SKIP_VERIFY=true` (same as `--skip-verify`) |
| `normal` | No effect — both stay unset. This is today's default pipeline. |
| `complex` | Force the full pipeline: `EFFORT_TIER_SKIP_RESEARCH=false`, `EFFORT_TIER_SKIP_VERIFY=false`, and treat `RISK_KEYWORDS_FOUND` as `true` for the rest of this run (so the Post-Plan Gate below never fires either, even if the planner happens to produce a single sprint). |
| anything else | Ignored — treat as if `--tier` was not passed. Do not error; this is a low-stakes UX flag. |

When `EFFORT_TIER_OVERRIDE` is `trivial` or `small`, skip the keyword scan
below entirely (the override already answered the question) and go straight
to setting the two flags. When it's `complex`, likewise skip the scan — the
answer is already "yes, treat as risky." Only `normal` (or empty) falls
through to the scan.

## Pre-Plan Gate (Piece 2 of #950)

**Skip if:** `EFFORT_TIER_OVERRIDE` is `trivial`, `small`, or `complex` (already resolved above).

Scan the phase goal, CONTEXT.md, and TASKS.md (whichever exist) for risk
terms. This reuses the same bash-grep keyword-scan shape plan.md step 1
already uses for `PHASE_GOAL_HAS_UI` (glob the phase's CONTEXT.md + the
roadmap, `grep -iEl`, check for any match) — not the `classify-tech`
subcommand from step 0.6. `classify-tech` is a fixed frontend-stack
classifier (react/vue/django/…) with no risk-keyword vocabulary and its
return object has no boolean field a gate could key on; it does not fit this
job. The reusable *mechanism* is the grep-based scan, and that's what this
gate follows.

```bash
RISK_KEYWORDS_MATCH=$(grep -iEl "security|migration|auth|payment|schema" \
  "${PHASE_DIR}"/*-CONTEXT.md \
  "${TASKS_FILE}" \
  <(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}" --pick section 2>/dev/null) \
  2>/dev/null | head -1)
if [[ -n "$RISK_KEYWORDS_MATCH" ]]; then
  RISK_KEYWORDS_FOUND=true
else
  RISK_KEYWORDS_FOUND=false
fi
```

**If `RISK_KEYWORDS_FOUND` is `true`:** Do nothing — this is the "complex"
case and it matches today's behavior exactly (no flag set, full pipeline
runs).

**If `RISK_KEYWORDS_FOUND` is `false`:** Set `EFFORT_TIER_SKIP_RESEARCH=true`.
Step 5 (`plan-research-validation.md`) treats this identically to
`--skip-research` having been passed on the command line — same branch, same
code path, no new behavior to maintain.

Display one line either way, so the skip is never silent:
```
Effort-tier scan: {risk keywords found in {file} — full research pipeline | no risk keywords — research will be skipped}
```

## Post-Plan Gate (Piece 1 of #950)

**This section is not applied here.** It's loaded into context now (via the
step 4.5 include) and applied later, at plan.md step 9, once `SPRINT_COUNT`
is known — the same front-load-then-apply-later pattern plan.md's own
`required_reading` already uses for `ui-brand.md`.

**Skip if:** `EFFORT_TIER_OVERRIDE` is set (already resolved above — `trivial`/
`small` forces `EFFORT_TIER_SKIP_VERIFY=true` unconditionally; `normal` and
`complex` force it `false` unconditionally; nothing below re-evaluates it).

At step 9, after `SPRINT_COUNT` is computed and before the `> MAX_SPRINTS`
check, set:

```bash
if [[ "$SPRINT_COUNT" -eq 1 && "$RISK_KEYWORDS_FOUND" != "true" && "$FILE_OWNERSHIP_COLLISIONS" -eq 0 ]]; then
  EFFORT_TIER_SKIP_VERIFY=true
else
  EFFORT_TIER_SKIP_VERIFY=false
fi
```

Where `FILE_OWNERSHIP_COLLISIONS` is the creation-collision + modify-collision
count from step 8.5 (the "K creation collisions" / "J sequential flags added"
counters that step already reports — 0 means the "✓ no collisions" case).

`SPRINT_COUNT` of 2 or 3 always falls through to `else` here — there is no
`SPRINT_COUNT == 1` branch to enter, so this gate cannot touch the 2-3 sprint
case. `SPRINT_COUNT >= 4` also always falls through to `else` for the same
reason, and separately still hits the existing `> MAX_SPRINTS` warning
unchanged.

When `EFFORT_TIER_SKIP_VERIFY` is `true`: step 9's `## PLANNING COMPLETE`
handler treats it exactly like `--skip-verify` was passed — same branch
(`skip to step 13`), not a new one. Display one line so the skip is never
silent:
```
Effort-tier: single-sprint phase, no risk keywords, no file-ownership
conflicts — verification skipped (equivalent to --skip-verify).
```

## Next Up

This is a sub-step invoked by `/rcode-plan`. If you reached this directly:

- `/rcode-plan` — re-enter the parent flow which applies these gates in order
