# Sprint 28-3 Summary — Artifact Schema Validation + Scope Fix (#747, #750)

**Phase:** 28 — Audit Gap Closure
**Sprint:** 28-3
**Branch:** `audit-gap-closure`
**Status:** Complete

## Objective

Add zod schema validation for rihal-code's own artifacts — SKILL.md
frontmatter, agent frontmatter, and `.rihal/state.json` — mirroring the zod
pattern in `cli/lib/config.cjs`. Wire validation into `cli/doctor.js` and
`scripts/dogfood-check.sh`, replace the grep-based 5-component compliance
snippet in `AGENTS.md`, and fix the AGENTS.md scope list so
`test/scope-history-parity.test.cjs` passes (#750).

## Tasks Completed

### Task 3.1 — Fix the AGENTS.md scope list (#750)
- Added `` `kanban` `` and `` `orchestrator` `` as backtick-wrapped tokens to
  the `Scopes allowed:` line in `AGENTS.md`.
- `CLAUDE.md` has **no** `Scopes allowed:` line (only a `## Scope Discipline`
  section) — left untouched, as the task instructed.
- **Deviation:** the task brief only named AGENTS.md/CLAUDE.md, but the Task 3.1
  acceptance criterion requires `test/scope-list-parity.test.cjs` to keep
  passing — that test cross-checks AGENTS.md against `CONTRIBUTING.md`'s
  `### Allowed scopes` block. Both scopes were therefore also added to
  `CONTRIBUTING.md` (one line each, no other changes). Without this the
  acceptance criterion would have failed.

### Task 3.2 — Create the artifact schemas module
- New `cli/lib/schemas.cjs` exporting:
  - `parseFrontmatter(text)` — YAML-frontmatter extractor handling plain
    scalars, folded multiline scalars (`description: >`), and block sequences
    (`triggers:` lists). Needed because real SKILL.md files use folded
    descriptions, which the `test/compliance.test.cjs` parser cannot read.
  - `validateSkillFrontmatter(obj, body?)` — requires `name`, `description`,
    ≥5 trigger phrases, and a negative-boundary clause. `>12` phrases is a
    non-blocking **warning** (see Deviations).
  - `validateAgentFrontmatter(obj)` — requires `name` (`rihal-` prefix),
    `description`, `tools` (string or array), `color`.
  - `validateState(obj)` — validates the real `.rihal/state.json` top-level
    shape (`version`, `project`, `phases`, `schema_version`, plus
    `current_phase`/`current_plan`/`current_sprint`/`velocity_history`/
    `milestones`); permissive (`.passthrough()`) on unknown keys. Carries a
    code comment referencing **issue #735**.
- `zod ^3.24.0` confirmed present in `package.json` — used directly, no new
  dependency added.

### Task 3.3 — Create the schema test file
- New `test/artifact-schema.test.cjs` (`node --test`, modeled on
  `test/bash-guard-hook.test.cjs`): 11 tests covering well-formed fixtures,
  too-few-trigger-phrases, missing negative boundary, missing `name`, missing
  `tools`, non-`rihal-` prefix, real state.json passing, `{}` failing, missing
  `phases` failing, plus an integration test that **every** `rihal/agents/*.md`
  file's frontmatter passes `validateAgentFrontmatter`.

### Task 3.4 — Wire into doctor.js, dogfood-check.sh, AGENTS.md
- `cli/doctor.js`: imports `cli/lib/schemas.cjs`, adds a new `findAgentFiles`
  shallow scan of `rihal/agents/` (no existing agent-file iterator —
  `findSkillFiles` matches only files named `SKILL.md`), and a
  `runSchemaValidation` section that validates every SKILL.md and agent file.
  Hard failures feed the existing non-zero exit path; advisory warnings print
  a `⚠`. Existing compliance checks left intact.
- `scripts/dogfood-check.sh`: appended **Check 9** (running
  `node --test test/artifact-schema.test.cjs`) after Check 8 — no renumbering.
- `AGENTS.md`: the grep-based `^## Output Format` / `^## Examples` compliance
  shell snippet under Testing Rules was replaced with an instruction to run
  `node cli/doctor.js` / `node --test test/artifact-schema.test.cjs`.

## Deviations

1. **CONTRIBUTING.md edited (Task 3.1).** Required to keep
   `scope-list-parity.test.cjs` green — see Task 3.1 above. Two lines added.
2. **`>12` trigger phrases is a warning, not a hard error.** The CLAUDE.md
   5-component standard says "5-12 trigger phrases", but 14 packaged
   agent-persona skills ship with 13-18 quoted activation phrases in their
   descriptions. Treating the upper bound as a hard failure would flag
   legitimately-shipped skills as broken. The must-have ("a SKILL.md with
   fewer than 5 trigger phrases fails") only mandates the lower bound, so the
   upper bound is advisory.
3. **Negative-boundary clause checked in body as well as description.**
   Agent-persona skills carry the boundary in the frontmatter `description`
   ("Do NOT use for: ..."); action skills carry it as a body section
   ("## Do NOT use this skill for" / "Do NOT include:"). `validateSkillFrontmatter`
   accepts an optional `body` argument and treats either location as valid.
4. **5 pre-existing skill-standard gaps surfaced by doctor.js — not fixed
   (out of scope).** Schema validation correctly flags 5 action skills that
   genuinely do not meet the standard:
   - `rihal-prfaq`, `rihal-checkpoint-preview` — only 1 trigger phrase.
   - `rihal-ci`, `rihal-harden`, `rihal-migrate` — no structured
     negative-boundary section (only inline "never"/"don't" advice).
   These are pre-existing content gaps, not introduced by this sprint. Fixing
   them would mean editing 5 unrelated skill files — out of scope for 28-3
   (which adds the validator, not skill content). `node cli/doctor.js` exits
   1 reporting them; the SPRINT acceptance criterion explicitly permits
   exit 1. **Deferred — file a follow-up issue to fix these 5 skills.**

## Verification Results

| Check | Result |
|-------|--------|
| Task 3.1 — `grep kanban/orchestrator` + scope-history + scope-list tests | pass (2/2) |
| Task 3.2 — `node --check schemas.cjs`, exports present, real state.json validates | exit 0 |
| Task 3.3 — `node --check` + `node --test test/artifact-schema.test.cjs` | pass (11/11) |
| Task 3.4 — `node --check doctor.js`, `grep schemas`, `grep artifact-schema.test.cjs`, `bash -n`, grep-snippet removed | exit 0 |
| `node cli/doctor.js` | runs, exits 1 (reports 5 real skill gaps — no crash) |
| `bash scripts/dogfood-check.sh` (incl. Check 9) | all 11 checks pass |

## Full Suite

`node --test` — **341 tests, 338 pass, 2 distinct failures** (the `fail` count
shows 3 because the runner counts its own `✖ failing tests:` summary line):

- `broken @-references do not regress past baseline` — pre-existing baseline
  failure, named in the sprint brief.
- `every command file @-includes its corresponding workflow` — pre-existing
  baseline failure, named in the sprint brief.

Confirmed against a clean baseline (`git stash`): both fail without this
sprint's changes. **No new failures introduced.**

**`test/scope-history-parity.test.cjs` now PASSES** — #750 is fixed.

## Commits (branch `audit-gap-closure`, not pushed)

- `520d931` fix(scopes): add kanban and orchestrator to allowed commit scopes (#750)
- `f401184` feat(cli): add zod schema validators for rihal artifacts (#747)
- `6bbcc4b` feat(cli): wire artifact schema validation into doctor and dogfood (#747)

## Files

- `cli/lib/schemas.cjs` (new)
- `test/artifact-schema.test.cjs` (new)
- `AGENTS.md` (modified — scope line + Testing Rules snippet replacement)
- `CONTRIBUTING.md` (modified — two scope-list lines)
- `cli/doctor.js` (modified — schema-validation section + `findAgentFiles`)
- `scripts/dogfood-check.sh` (modified — appended Check 9)
