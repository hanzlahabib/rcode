---
phase: 45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001
plan_number: 4
wave: 1
depends_on: []
autonomous: true
files_modified:
  - rcode/workflows/create-epics-and-stories.md
  - rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md
  - rcode/skills/actions/2-plan/rcode-create-story/SKILL.md
  - rcode/skills/actions/2-plan/rcode-edit-prd/SKILL.md
  - rcode/skills/actions/2-plan/rcode-create-prd/SKILL.md
  - rcode/skills/actions/2-plan/rcode-validate-prd/SKILL.md
  - rcode/skills/actions/1-analysis/rcode-prfaq/SKILL.md
  - rcode/skills/actions/1-analysis/rcode-document-project/SKILL.md
  - rcode/skills/actions/3-solutioning/rcode-check-implementation-readiness/SKILL.md
  - rcode/skills/actions/3-solutioning/rcode-create-architecture/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-retrospective/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-checkpoint-preview/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-correct-course/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-sprint-status/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-dev-story/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-code-review/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-debug/SKILL.md
  - rcode/skills/actions/4-implementation/rcode-scaffold-project/SKILL.md
  - docs/commands.md
requirements: []
must_haves:
  truths:
    - rcode/workflows/create-epics-and-stories.md and the epics/stories skill tree carry a clear, honest notice that the epics/stories/dev-story pipeline has no execution consumer today (rcode-executor only reads SPRINT.md) — framed as experimental/unsupported, not deleted or rewired
    - the 17 unbridged skill/workflow pairs identified in AUDIT-redundant-work.md finding 3 each carry a one-line "not currently invoked by any rcode/workflows/*.md file" bridge-status note
    - docs/commands.md's /rcode-plan, /rcode-sprint-planning, and /rcode-create-story sections match their actual current flags/behavior instead of the 3 misdocumented claims found in the audit
    - rcode/workflows/create-epics-and-stories.md has exactly one "Next Up" section, not two disagreeing ones
  artifacts:
    - none new — this sprint is documentation/notice-only, no new files, no deletions, no behavior changes
  key_links:
    - rcode/agents/rcode-executor.md's own <role> (27 lines total) is the ground truth this sprint cites for "no epics/stories execution consumer exists" — confirmed via direct read, zero mentions of epics/stories/dev-sessions anywhere in that file
---

<objective>
Fix GitHub issues #994, #995, #996 — three documentation/notice-level findings from
AUDIT-redundant-work.md about planning-pipeline paths that exist in the codebase but are either
disconnected from execution, unbridged from their workflow twin, or misdocumented. Per explicit
phase-45 planning guidance: since no user decision was captured for #994 (deprecate vs wire-up vs
keep-as-is), this sprint takes the safest, most reversible action — document the finding honestly
and add a clear experimental/unsupported notice. It does NOT delete any file, does NOT build new
execution wiring, and does NOT change any runtime behavior. This keeps the door open for a future
real decision while stopping the docs from silently overstating what these paths do today.

This is a repo-maintenance/bugfix phase — no numbered requirement IDs apply (`requirements: []`).
</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/audits/AUDIT-redundant-work.md
</context>

<tasks>

<task id="45.4.1" type="auto">
<title>Add an experimental/no-execution-consumer notice to the epics/stories pipeline</title>
<read_first>
- rcode/agents/rcode-executor.md (all 27 lines — confirm `<role>` is scoped to "Execute SPRINT.md files atomically... produce SUMMARY.md" with zero mentions of epics/stories/dev-sessions)
- rcode/workflows/create-epics-and-stories.md lines 226-244 (Step 4 — writes .planning/epics/EPIC-NN.md + per-story files)
- rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md line 43 (claims a different output: single consolidated .rcode/phases/{phase}/epics.md)
- rcode/workflows/create-story.md lines 127-132 and rcode/skills/actions/2-plan/rcode-create-story/SKILL.md line 43 (same split pattern one level down)
- rcode/workflows/dev-story.md lines 342, 391, 405, 413 (the manual `/rcode {dev-prompt-file}` instruction — the only way to "execute" a story today, with none of /rcode-execute's atomic-commit/checkpoint/wave/verification machinery)
</read_first>
<files>rcode/workflows/create-epics-and-stories.md, rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md, rcode/skills/actions/2-plan/rcode-create-story/SKILL.md</files>
<action>
Add a short, honest notice block near the top of each file (immediately after frontmatter/purpose, before the first process step) — do not delete or rewire anything, do not change any step's behavior:

```markdown
> **Note (experimental, no execution consumer):** the epics/stories/dev-story pipeline this
> workflow is part of is not wired to `/rcode-execute` today — `rcode-executor` only reads
> `*-SPRINT.md` files (see `rcode/agents/rcode-executor.md`). The only way to "run" a story
> produced here is the manual `/rcode {dev-prompt-file}` invocation documented in
> `rcode/workflows/dev-story.md`, which has none of `/rcode-execute`'s atomic-commit,
> checkpoint, wave, or verification machinery. Treat this pipeline as experimental /
> unsupported for production execution until a decision is made to either wire it to
> `/rcode-execute` or deprecate it in favor of the SPRINT.md pipeline (see
> `AUDIT-redundant-work.md` finding 2).
```
Apply this exact (or file-appropriately-adapted, e.g. skill files use a different heading level) notice to all 3 files. Do not touch `rcode/workflows/dev-story.md`, `rcode/agents/rcode-executor.md`, or any code file — this is a documentation-only addition confined to the 3 files that most directly claim/describe the epics/stories track's output.
</action>
<acceptance_criteria>
- `grep -q "no execution consumer" rcode/workflows/create-epics-and-stories.md`
- `grep -q "no execution consumer" rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md`
- `grep -q "no execution consumer" rcode/skills/actions/2-plan/rcode-create-story/SKILL.md`
</acceptance_criteria>
<verify>
<automated>
grep -q "no execution consumer" rcode/workflows/create-epics-and-stories.md && \
grep -q "no execution consumer" rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md && \
grep -q "no execution consumer" rcode/skills/actions/2-plan/rcode-create-story/SKILL.md && \
echo PASS
</automated>
</verify>
<done>All 3 files carry an honest, non-destructive notice that the epics/stories pipeline has no execution consumer today — no files deleted, no new execution wiring built.</done>
<evidence>AUDIT-redundant-work.md finding 2: "the epics/stories pipeline and the SPRINT.md pipeline never talk to each other... Neither branch of this pipeline is ever consumed by rcode-executor — confirmed by reading the full executor agent contract (rcode/agents/rcode-executor.md, 27 lines total)... grep -n \"epics\\|stories\" rcode/agents/rcode-executor.md returns nothing." Confirmed via direct read this session.</evidence>
</task>

<task id="45.4.2" type="auto">
<title>Add a bridge-status notice to the 17 unbridged workflow/skill pairs</title>
<read_first>
- AUDIT-redundant-work.md finding 3 (full list of 18 pairs; `grep -l "delegate_to_skill" rcode/workflows/*.md` returns exactly one file, sprint-planning.md — the 17 others have zero cross-reference)
- rcode/skills/actions/2-plan/rcode-create-prd/SKILL.md lines 1-5 (representative example of the frontmatter shape these 17 files share — confirms insertion point)
</read_first>
<files>rcode/skills/actions/2-plan/rcode-edit-prd/SKILL.md, rcode/skills/actions/2-plan/rcode-create-prd/SKILL.md, rcode/skills/actions/2-plan/rcode-validate-prd/SKILL.md, rcode/skills/actions/1-analysis/rcode-prfaq/SKILL.md, rcode/skills/actions/1-analysis/rcode-document-project/SKILL.md, rcode/skills/actions/3-solutioning/rcode-check-implementation-readiness/SKILL.md, rcode/skills/actions/3-solutioning/rcode-create-architecture/SKILL.md, rcode/skills/actions/4-implementation/rcode-retrospective/SKILL.md, rcode/skills/actions/4-implementation/rcode-checkpoint-preview/SKILL.md, rcode/skills/actions/4-implementation/rcode-correct-course/SKILL.md, rcode/skills/actions/4-implementation/rcode-sprint-status/SKILL.md, rcode/skills/actions/4-implementation/rcode-dev-story/SKILL.md, rcode/skills/actions/4-implementation/rcode-code-review/SKILL.md, rcode/skills/actions/4-implementation/rcode-debug/SKILL.md, rcode/skills/actions/4-implementation/rcode-scaffold-project/SKILL.md, rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md, rcode/skills/actions/2-plan/rcode-create-story/SKILL.md</files>
<action>
For each of the 17 SKILL.md files listed in `<files>` (this is the full set of "18 pairs minus sprint-planning, the one bridged pair" from AUDIT-redundant-work.md finding 3 — `rcode-create-epics-and-stories` and `rcode-create-story` are listed here too since they also get the notice from task 45.4.1, but this task's specific one-line addition is distinct and additive, not a duplicate), insert one line immediately after the frontmatter closing `---`:

```markdown
<!-- Bridge status: not currently invoked by any rcode/workflows/*.md file (no delegate_to_skill
     cross-reference exists in either direction). Reachable only via direct phrase-trigger match
     or explicit @-inclusion. See AUDIT-redundant-work.md finding 3. -->
```
This is a single HTML-comment line per file — invisible in rendered output, purely informational for the next maintainer or agent reading the file. Do not add this line to `rcode/skills/actions/4-implementation/rcode-sprint-planning/SKILL.md` (that is the one already-bridged pair, and it's out of scope here — it was already corrected for a different reason in Sprint 45-1). Do not modify any other section of these 17 files.
</action>
<acceptance_criteria>
- `for f in <the 17 files>; do grep -q "Bridge status: not currently invoked" "$f" || echo "MISSING: $f"; done` prints nothing
</acceptance_criteria>
<verify>
<automated>
FILES="rcode/skills/actions/2-plan/rcode-edit-prd/SKILL.md rcode/skills/actions/2-plan/rcode-create-prd/SKILL.md rcode/skills/actions/2-plan/rcode-validate-prd/SKILL.md rcode/skills/actions/1-analysis/rcode-prfaq/SKILL.md rcode/skills/actions/1-analysis/rcode-document-project/SKILL.md rcode/skills/actions/3-solutioning/rcode-check-implementation-readiness/SKILL.md rcode/skills/actions/3-solutioning/rcode-create-architecture/SKILL.md rcode/skills/actions/4-implementation/rcode-retrospective/SKILL.md rcode/skills/actions/4-implementation/rcode-checkpoint-preview/SKILL.md rcode/skills/actions/4-implementation/rcode-correct-course/SKILL.md rcode/skills/actions/4-implementation/rcode-sprint-status/SKILL.md rcode/skills/actions/4-implementation/rcode-dev-story/SKILL.md rcode/skills/actions/4-implementation/rcode-code-review/SKILL.md rcode/skills/actions/4-implementation/rcode-debug/SKILL.md rcode/skills/actions/4-implementation/rcode-scaffold-project/SKILL.md rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md rcode/skills/actions/2-plan/rcode-create-story/SKILL.md"
MISSING=0
for f in $FILES; do grep -q "Bridge status: not currently invoked" "$f" || { echo "MISSING: $f"; MISSING=1; }; done
[ "$MISSING" -eq 0 ] && echo PASS
</automated>
</verify>
<done>All 17 unbridged skill files carry a one-line, non-destructive bridge-status comment documenting they're not wired to any workflow — no behavior change, no deletions.</done>
<evidence>AUDIT-redundant-work.md finding 3: "grep -l 'delegate_to_skill' rcode/workflows/*.md returns exactly one file: sprint-planning.md. All 17 other pairs have zero cross-reference in either direction... internal: true skills... install to .rcode/skills/ — reachable only via explicit @-inclusion from a workflow. Since 17/18 workflows never include their counterpart, these are shipped, installed, dead code." Confirmed via direct find/grep this session — all 17 directories verified to exist at the paths listed.</evidence>
</task>

<task id="45.4.3" type="auto">
<title>Fix docs/commands.md's 3 misdocumented commands and the duplicate Next-Up sections</title>
<read_first>
- docs/commands.md lines 266-279 (`/rcode-plan` claims `.planning/phases/{NN}/PLAN.md` output and "max 2 retries" — actual: `*-SPRINT.md` via plan.md, mode-dependent 1-or-3 iteration cap per plan.md:700-710)
- docs/commands.md lines 320-327 (`/rcode-create-story` claims free-text story description — actual: requires an `<EPIC-file.md>` path argument per create-story.md:28-45, errors if missing)
- docs/commands.md lines 355-361 (`/rcode-sprint-planning --backlog=.planning/backlog.md` — actual flags are `--phase`, `--velocity`, `--goal` per sprint-planning.md:64 and rcode/commands/sprint-planning.md:4; no `--backlog` flag exists anywhere)
- rcode/workflows/create-epics-and-stories.md lines 379-388 (two separate "Next Up" headers: `## ▶ Next Up` at ~379 listing 3 commands, `## Next Up` at ~385 listing 2 different commands)
</read_first>
<files>docs/commands.md, rcode/workflows/create-epics-and-stories.md</files>
<action>
1. `docs/commands.md` — fix the 3 misdocumented sections:
   - `/rcode-plan` (lines 266-279): change output to `.planning/phases/{phase-slug}/{phase}-{plan}-SPRINT.md` and the flow description to match `plan.md`'s actual `rcode-planner` → `rcode-sprint-checker` step, with a mode-dependent iteration cap (1 in yolo, 3 in guided) instead of "max 2 retries".
   - `/rcode-create-story` (lines 320-327): change the usage example to require an EPIC file argument: `/rcode-create-story .planning/epics/EPIC-01.md [--story <id>]`, matching `create-story.md:28-45`'s actual required-argument behavior (errors if the file doesn't exist).
   - `/rcode-sprint-planning` (lines 355-361): remove the fabricated `--backlog=` flag example; replace with the real flags: `/rcode-sprint-planning [--phase <NN>] [--velocity <points>] [--goal "Sprint goal"]`, matching `sprint-planning.md:64`.

2. `rcode/workflows/create-epics-and-stories.md` — merge the two disagreeing "Next Up" sections (`## ▶ Next Up` and `## Next Up`) into a single section listing the union of both command lists (`/rcode-sprint-planning`, `/rcode-dev-story {story-id}`, `/rcode-edit-prd`, `/rcode-create-story`), removing the duplicate heading.
</action>
<acceptance_criteria>
- `grep -q "max 2 retries" docs/commands.md` fails (claim removed)
- `grep -q -- "--backlog" docs/commands.md` fails (fabricated flag removed)
- `grep -c "^## .*Next Up" rcode/workflows/create-epics-and-stories.md` returns exactly `1`
</acceptance_criteria>
<verify>
<automated>
! grep -q "max 2 retries" docs/commands.md && \
! grep -q -- "--backlog" docs/commands.md && \
[ "$(grep -c '^## .*Next Up' rcode/workflows/create-epics-and-stories.md)" -eq 1 ] && \
echo PASS
</automated>
</verify>
<done>docs/commands.md's /rcode-plan, /rcode-create-story, and /rcode-sprint-planning sections match their actual current flags and output paths; create-epics-and-stories.md has exactly one Next Up section listing the union of both prior lists.</done>
<evidence>AUDIT-redundant-work.md finding 5 (docs/commands.md's 3 misdocumented commands, exact line numbers cited) and finding 6 ("duplicate, conflicting Next Up sections in the same file... at line 379... and a second, plain ## Next Up at line 385"). Confirmed via direct read this session (docs/commands.md:266-279,320-327,355-361; create-epics-and-stories.md:379-388).</evidence>
</task>

</tasks>

<verification>
- `grep -q "no execution consumer" rcode/workflows/create-epics-and-stories.md` succeeds
- `grep -q "Bridge status: not currently invoked" rcode/skills/actions/2-plan/rcode-create-prd/SKILL.md` succeeds (spot check)
- `grep -q "max 2 retries" docs/commands.md` fails
- `grep -c "^## .*Next Up" rcode/workflows/create-epics-and-stories.md` returns 1
- No file listed in `files_modified` had any code/logic changed — `git diff --stat` for this sprint should show only markdown/comment insertions, zero `.cjs`/`.js` files touched
</verification>

<success_criteria>
- The epics/stories pipeline and its 17 unbridged skill siblings are honestly documented as experimental/unbridged, without deleting anything or building new execution wiring
- docs/commands.md no longer misleads a reader about 3 commands' actual behavior
- create-epics-and-stories.md's closing section is internally consistent
</success_criteria>

<output>
Create `.planning/phases/45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001/45-4-SUMMARY.md`
</output>

## Files Touched

**Creates:**
<!-- none -->

**Modifies:**
- `rcode/workflows/create-epics-and-stories.md` — notice block added; duplicate Next Up sections merged into one
- 16 other `rcode/skills/actions/**/SKILL.md` files — one-line bridge-status comment each (see frontmatter `files_modified` for the full list)
- `docs/commands.md` — 3 misdocumented command sections corrected

**Tests:**
<!-- none — documentation/notice-only sprint, no test file asserts on these doc sections -->
