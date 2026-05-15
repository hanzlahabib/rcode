---
phase: 28
plan_number: 3
wave: 2
depends_on: ["28-2"]
files_modified:
  - cli/lib/schemas.cjs
  - cli/doctor.js
  - scripts/dogfood-check.sh
  - test/artifact-schema.test.cjs
  - AGENTS.md
  - CLAUDE.md
files_renamed_from: []
autonomous: true
requirements: [REQ-747, REQ-750]
must_haves:
  truths:
    - "cli/doctor.js reports a SKILL.md with malformed frontmatter as a failure."
    - "A SKILL.md with fewer than 5 trigger phrases fails validation."
    - "node --test test/scope-history-parity.test.cjs passes."
    - "The grep-based 5-component compliance prose in AGENTS.md is replaced by a schema-validation reference."
  artifacts:
    - cli/lib/schemas.cjs (zod schemas for SKILL.md frontmatter, agent frontmatter, state.json)
    - test/artifact-schema.test.cjs (test coverage for the schemas)
  key_links:
    - "doctor.js must import and run the schemas in its compliance section."
    - "dogfood-check.sh must run schema validation so PRs trigger it."
    - "state.json schema must match the real shape in .rihal/state.json and reference issue #735."
---

<objective>
Add schema validation for rihal's own artifacts — SKILL.md frontmatter, agent frontmatter, and `.rihal/state.json` — mirroring the existing zod pattern in `cli/lib/config.cjs`. Wire validation into `cli/doctor.js` and `scripts/dogfood-check.sh`, replace the grep-based 5-component compliance check prose in `AGENTS.md` with schema validation, and fix the AGENTS.md scope list so `test/scope-history-parity.test.cjs` passes (#750).
Purpose: Close the artifact-validation gap — today malformed SKILL.md/agent frontmatter is only caught by brittle grep checks, and Phase 27's `kanban`/`orchestrator` scopes break the scope-parity test.
Output: a schemas module, doctor.js + dogfood wiring, a test file, AGENTS.md/CLAUDE.md edits.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.rihal/state.json
</context>

<notes>
`cli/lib/config.cjs` is the zod pattern to mirror — confirm `zod` is already a dependency before adding (it is referenced by config.cjs). If `zod` is NOT in package.json dependencies, use the JSON Schema + a tiny stdlib validator path instead and note the choice in SUMMARY — do NOT add a new dependency without it already being present.
Editing `AGENTS.md` and `CLAUDE.md` is a meta-rule change (flagged in CLAUDE.md red-flags). The edits here are narrowly scoped: (a) add `kanban` and `orchestrator` to the "Scopes allowed:" list, (b) replace the grep-based compliance snippet with a schema-validation invocation. No other AGENTS.md content changes.
`test/scope-history-parity.test.cjs` reads the `Scopes allowed:` line from AGENTS.md via regex `` `([a-z0-9-]+)` `` — the two new scopes must be added as backtick-wrapped tokens on that single line.
</notes>

<tasks>

### Task 3.1 — Fix the AGENTS.md scope list (#750)
<read_first>
- AGENTS.md
- CLAUDE.md
- test/scope-history-parity.test.cjs
</read_first>
<files>
AGENTS.md
CLAUDE.md
</files>
<action>
In `AGENTS.md`, locate the `Scopes allowed:` line under Commit Rules (currently `` `agents`, `skills`, `workflows`, `templates`, `dashboard`, `docs`, `config`, `github`, `phases`, `references`, `cli` ``). Append `` , `kanban`, `orchestrator` `` so both Phase 27 commit scopes are listed as backtick-wrapped tokens.
Check `CLAUDE.md` for a duplicated scope list — `grep -n "Scopes allowed" CLAUDE.md`. If present, apply the identical addition there too. If absent, leave CLAUDE.md untouched and note it in SUMMARY.
Change ONLY the scope line — no other AGENTS.md/CLAUDE.md content.
</action>
<acceptance_criteria>
- `grep -q '\`kanban\`' AGENTS.md` and `grep -q '\`orchestrator\`' AGENTS.md` both succeed.
- `node --test test/scope-history-parity.test.cjs` passes.
- `node --test test/scope-list-parity.test.cjs` still passes (no regression).
</acceptance_criteria>
<verify>
<automated>
grep -q '`kanban`' AGENTS.md && grep -q '`orchestrator`' AGENTS.md && node --test test/scope-history-parity.test.cjs test/scope-list-parity.test.cjs
</automated>
</verify>
<done>`kanban` and `orchestrator` are in the AGENTS.md allowed-scopes list and the scope-history-parity test passes.</done>

### Task 3.2 — Create the artifact schemas module
<read_first>
- cli/lib/config.cjs
- rihal/agents/rihal-phase-researcher.md
- .rihal/state.json
- .rihal/references/state-schema.md
</read_first>
<files>
cli/lib/schemas.cjs
</files>
<action>
Create `cli/lib/schemas.cjs` exporting three validators, mirroring the zod usage style of `cli/lib/config.cjs` (or JSON Schema + stdlib validator if zod is not a dependency — see notes):

1. `skillFrontmatterSchema` / `validateSkillFrontmatter(obj)`: requires `name` (string), `description` (string). Requires the description (or a dedicated trigger field) to contain at least 5 and at most 12 trigger phrases — count the quoted activation phrases in the description body. Requires a negative-boundary clause (e.g. text matching `not for|does not|negative`). Return `{ ok, errors[] }`.
2. `agentFrontmatterSchema` / `validateAgentFrontmatter(obj)`: requires `name` (string, `rihal-` prefix), `description` (string), `tools` (comma-or-array list), `color` (string). Return `{ ok, errors[] }`.
3. `stateSchema` / `validateState(obj)`: validates `.rihal/state.json` top-level shape — `version`, `project`, `phases` (array), `schema_version` (number), plus the fields actually present in the current `.rihal/state.json` (`current_phase`, `current_plan`, `current_sprint`, `velocity_history`, `milestones`). Be permissive on optional/unknown keys. Add a code comment referencing issue #735 (coordinate state.json schema). Return `{ ok, errors[] }`.

Also export a `parseFrontmatter(text)` helper (a YAML-frontmatter extractor) if one isn't already importable — keep it minimal, matching the parser already used in `test/compliance.test.cjs`.
Keep the file under 1000 lines, pure of side effects (exports only).
</action>
<acceptance_criteria>
- `node --check cli/lib/schemas.cjs` exits 0.
- `node -e "const s=require('./cli/lib/schemas.cjs');['validateSkillFrontmatter','validateAgentFrontmatter','validateState'].forEach(f=>{if(typeof s[f]!=='function')process.exit(1)})"` exits 0.
- `node -e "const s=require('./cli/lib/schemas.cjs');const st=require('./.rihal/state.json');if(!s.validateState(st).ok)process.exit(1)"` exits 0 (the real state.json validates clean).
</acceptance_criteria>
<verify>
<automated>
node --check cli/lib/schemas.cjs && node -e "const s=require('./cli/lib/schemas.cjs');['validateSkillFrontmatter','validateAgentFrontmatter','validateState'].forEach(f=>{if(typeof s[f]!=='function')process.exit(1)});const st=require('./.rihal/state.json');if(!s.validateState(st).ok)process.exit(1)"
</automated>
</verify>
<done>`cli/lib/schemas.cjs` exports three working validators and the real state.json validates clean.</done>

### Task 3.3 — Create the schema test file
<read_first>
- cli/lib/schemas.cjs
- test/compliance.test.cjs
- test/bash-guard-hook.test.cjs
</read_first>
<files>
test/artifact-schema.test.cjs
</files>
<action>
Create `test/artifact-schema.test.cjs` (`node --test`, following `test/bash-guard-hook.test.cjs` structure). Cover:
- `validateSkillFrontmatter`: a well-formed fixture object passes; an object with only 3 trigger phrases fails with an error mentioning the phrase count; an object missing the negative-boundary clause fails; a missing `name` fails.
- `validateAgentFrontmatter`: a well-formed agent fixture passes; missing `tools` fails; a `name` without `rihal-` prefix fails.
- `validateState`: the real `.rihal/state.json` (require it) passes; a `{}` object fails; an object missing `phases` fails.
- An integration assertion: every `rihal/agents/*.md` file's parsed frontmatter passes `validateAgentFrontmatter` (this locks the package source clean).
</action>
<acceptance_criteria>
- `node --check test/artifact-schema.test.cjs` exits 0.
- `node --test test/artifact-schema.test.cjs` passes.
</acceptance_criteria>
<verify>
<automated>
node --check test/artifact-schema.test.cjs && node --test test/artifact-schema.test.cjs
</automated>
</verify>
<done>The schema test file passes, including an integration check that all packaged agent files validate.</done>

### Task 3.4 — Wire schema validation into doctor.js, dogfood-check.sh, and AGENTS.md
<read_first>
- cli/doctor.js
- cli/lib/schemas.cjs
- scripts/dogfood-check.sh
- AGENTS.md
</read_first>
<files>
cli/doctor.js
scripts/dogfood-check.sh
AGENTS.md
</files>
<action>
In `cli/doctor.js` compliance section (which already validates `model-profiles.json` and detects manifest drift): import `cli/lib/schemas.cjs` and add a compliance check that runs `validateSkillFrontmatter` over every `SKILL.md` in the package source and `validateAgentFrontmatter` over every `rihal/agents/*.md`. Note: the existing `findSkillFiles` helper (cli/doctor.js:23) matches only files literally named `SKILL.md` — reuse it for the skill pass, but you must ADD a new small glob/scan for `rihal/agents/*.md` (a one-level `fs.readdirSync` filtered to `.md`) for the agent pass; there is no existing agent-file iterator. Print malformed artifacts with their errors. Any failure contributes to the existing non-zero exit path. Do not remove the existing compliance checks — add alongside.

In `scripts/dogfood-check.sh`: append a numbered check (follow the existing `Check N —` + `pass`/`fail` pattern) that runs `node --test test/artifact-schema.test.cjs` and maps its exit code to `pass`/`fail`.

In `AGENTS.md`: replace the grep-based 5-component compliance shell snippet (under Testing Rules) with an instruction to run schema validation instead — e.g. "Run `node cli/doctor.js` (or `node --test test/artifact-schema.test.cjs`) — schema validation enforces the 5-component skill standard." Keep the surrounding Testing Rules section intact; replace only the obsolete grep block.
</action>
<acceptance_criteria>
- `grep -q "schemas" cli/doctor.js` succeeds.
- `node --check cli/doctor.js` exits 0 and `node cli/doctor.js` runs without throwing (exit 0 or 1, not a crash).
- `grep -q "artifact-schema.test.cjs" scripts/dogfood-check.sh` succeeds and `bash -n scripts/dogfood-check.sh` exits 0.
- `AGENTS.md` no longer contains the `grep -q "^## Output Format"` compliance snippet: `! grep -q 'grep -q "\^## Output Format"' AGENTS.md`.
</acceptance_criteria>
<verify>
<automated>
node --check cli/doctor.js && grep -q "schemas" cli/doctor.js && grep -q "artifact-schema.test.cjs" scripts/dogfood-check.sh && bash -n scripts/dogfood-check.sh && ! grep -q 'grep -q "\^## Output Format"' AGENTS.md
</automated>
</verify>
<done>doctor.js and dogfood-check.sh run schema validation, and AGENTS.md references schema validation in place of the grep-based compliance check.</done>

</tasks>

<verification>
- `node --test test/artifact-schema.test.cjs test/scope-history-parity.test.cjs test/scope-list-parity.test.cjs` — all pass.
- `node cli/doctor.js` runs and reports malformed SKILL.md/agent frontmatter when present.
- `bash scripts/dogfood-check.sh` includes and passes the schema check.
- `node --test` over the full suite shows no new failures.
</verification>

<success_criteria>
- doctor.js reports malformed SKILL.md / agent / state.json artifacts.
- A SKILL.md with <5 trigger phrases fails validation.
- scope-history-parity test passes; grep-based compliance prose replaced.
</success_criteria>

<output>
Create `.planning/phases/28-audit-gap-closure-ecc-parity-hooks-eval-harness-schema-validation-iterative-retrieval/28-3-SUMMARY.md`
</output>
