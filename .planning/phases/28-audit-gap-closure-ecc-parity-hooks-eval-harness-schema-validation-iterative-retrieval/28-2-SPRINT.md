---
phase: 28
plan_number: 2
wave: 1
depends_on: []
files_modified:
  - test/eval/run-eval.cjs
  - test/eval/prompts.json
  - test/eval/normalize.cjs
  - test/eval/baselines/.gitkeep
  - test/agent-behavior-eval.test.cjs
  - scripts/dogfood-check.sh
  - .gitignore
autonomous: true
requirements: [REQ-746]
must_haves:
  truths:
    - "Editing a tracked SKILL.md produces a visible behavior diff against the committed baseline."
    - "Raw agent output is gitignored; normalized baselines are committed."
    - "The harness flags semantic drift for human review and does not auto-pass."
    - "The baseline is re-blessable via an explicit flag."
  artifacts:
    - test/eval/run-eval.cjs (harness entrypoint)
    - test/eval/prompts.json (fixed prompt set per tracked agent/skill)
    - test/eval/normalize.cjs (structured-output normalizer)
    - test/eval/baselines/ (committed normalized baselines)
  key_links:
    - "scripts/dogfood-check.sh must invoke the harness so skill PRs trigger it."
    - "normalize.cjs strips prose so the diff is on structure (decisions/routing/artifact shape), not wording."
---

<objective>
Build a lightweight agent-behavior regression harness under `test/eval/`. A fixed prompt set per key agent/skill captures the agent's *structured* output, normalizes it (drops exact prose), and diffs against a committed baseline. A change flags semantic drift for human review — it does not auto-pass. Baselines are re-blessable; raw output is gitignored. The harness is wired into `scripts/dogfood-check.sh`.
Purpose: Close the agent-behavior regression gap — today a SKILL.md edit can silently change routing/decisions with nothing catching it.
Output: harness entrypoint, prompt set, normalizer, committed baselines, a `node --test` wrapper, dogfood-check wiring.
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
Scope discipline: this harness does NOT call a live model. It is a deterministic snapshot/diff over a *recorded structured representation* of each tracked agent/skill — the harness extracts the structured contract (trigger phrases, declared tools, routing keywords, artifact shape) directly from the SKILL.md / agent .md frontmatter and body, normalizes it, and diffs that. "Behavior" here = the declared decision surface, not a live LLM run. This keeps the harness offline, fast, and deterministic — consistent with the existing `node --test` suite which never calls a model.
`test/eval/` is a new directory — confirmed absent: `ls test/eval` returns nothing today.
</notes>

<tasks>

### Task 2.1 — Create the harness skeleton, prompt set, and normalizer
<read_first>
- test/compliance.test.cjs
- test/bash-guard-hook.test.cjs
- rihal/agents/rihal-phase-researcher.md
</read_first>
<files>
test/eval/prompts.json
test/eval/normalize.cjs
test/eval/run-eval.cjs
test/eval/baselines/.gitkeep
</files>
<action>
Create `test/eval/` directory.

`test/eval/prompts.json`: a JSON object mapping each tracked artifact path to a fixed list of probe prompts. Track at minimum these 5 high-traffic SKILL.md/agent files (verify each path exists before listing it; drop any that don't): the classifier-routed `do` skill, `rihal-phase-researcher.md`, `rihal-research-synthesizer.md`, plus 2 more agent .md files chosen from `rihal/agents/`. Each entry: `{ "<path>": { "probes": ["short scenario string", ...] } }`. Probes are scenario descriptors used only as stable keys — the harness does not send them to a model.

`test/eval/normalize.cjs`: exports `normalize(artifactPath)` → a deterministic JSON object capturing the STRUCTURED contract of that artifact: parsed frontmatter trigger phrases (sorted), declared `tools` list (sorted), negative-boundary phrases, and a sorted list of routing/decision keywords extracted from the body (e.g. headings, `route to`, `spawn`, agent names referenced). Explicitly EXCLUDE free prose — only structural tokens. Same input must always yield byte-identical output (sort every collection).

`test/eval/run-eval.cjs`: a CLI. `node test/eval/run-eval.cjs` → for each artifact in prompts.json, compute `normalize()`, compare to `test/eval/baselines/<slug>.json`. If a baseline is missing or differs, print a unified-style diff and exit 1 (drift = human review). `node test/eval/run-eval.cjs --bless` → (re)write all baselines from current normalized output and exit 0. Use only Node stdlib.
Add `test/eval/baselines/.gitkeep` so the dir is tracked.
</action>
<acceptance_criteria>
- `node --check test/eval/normalize.cjs` and `node --check test/eval/run-eval.cjs` exit 0.
- `node -e "JSON.parse(require('fs').readFileSync('test/eval/prompts.json','utf8'))"` exits 0 and the object has at least 5 keys.
- Every path key in prompts.json exists on disk: `node -e "const p=require('./test/eval/prompts.json');const fs=require('fs');for(const k of Object.keys(p)){if(!fs.existsSync(k))process.exit(1)}"` exits 0.
</acceptance_criteria>
<verify>
<automated>
node --check test/eval/normalize.cjs && node --check test/eval/run-eval.cjs && node -e "const p=require('./test/eval/prompts.json');const fs=require('fs');const ks=Object.keys(p);if(ks.length<5)process.exit(1);for(const k of ks){if(!fs.existsSync(k))process.exit(1)}"
</automated>
</verify>
<done>The harness skeleton, prompt set, and normalizer exist; every tracked artifact path resolves to a real file.</done>

### Task 2.2 — Bless the initial baselines and add the test wrapper
<read_first>
- test/eval/run-eval.cjs
- test/eval/normalize.cjs
- test/bash-guard-hook.test.cjs
- .gitignore
</read_first>
<files>
test/eval/baselines/.gitkeep
test/agent-behavior-eval.test.cjs
.gitignore
</files>
<action>
Run `node test/eval/run-eval.cjs --bless` to generate the committed baseline JSON files under `test/eval/baselines/` (one per tracked artifact).

Create `test/agent-behavior-eval.test.cjs` — a `node --test` wrapper that spawns `node test/eval/run-eval.cjs` (no `--bless`) and asserts exit 0, so behavior drift fails the standard `node --test` run. Add one assertion that a known baseline file exists and parses as JSON. Follow the structure of `test/bash-guard-hook.test.cjs`.

Update `.gitignore`: add a rule to ignore raw/uncommitted eval output (e.g. `test/eval/raw/` or `test/eval/*.raw.json`) while keeping `test/eval/baselines/` tracked. If the harness writes no raw artifacts, still add the rule defensively and note it in the SUMMARY.
</action>
<acceptance_criteria>
- `ls test/eval/baselines/*.json` lists at least 5 files.
- `node --test test/agent-behavior-eval.test.cjs` passes (baselines match a fresh normalize run).
- `.gitignore` contains a `test/eval/` raw-output rule and does NOT ignore `test/eval/baselines/`.
</acceptance_criteria>
<verify>
<automated>
test "$(ls test/eval/baselines/*.json 2>/dev/null | wc -l)" -ge 5 && node --test test/agent-behavior-eval.test.cjs && grep -q "test/eval" .gitignore
</automated>
</verify>
<done>Committed normalized baselines exist for all tracked artifacts and `node --test` passes against them.</done>

### Task 2.3 — Wire the harness into dogfood-check.sh and verify drift detection
<read_first>
- scripts/dogfood-check.sh
- test/eval/run-eval.cjs
</read_first>
<files>
scripts/dogfood-check.sh
</files>
<action>
Add a new numbered check to `scripts/dogfood-check.sh` (follow the existing `Check N —` comment + `pass`/`fail` helper pattern visible near the end of the file). The check runs `node test/eval/run-eval.cjs`; on exit 0 call `pass "agent-behavior baselines unchanged (#746)"`, on non-zero call `fail` with guidance: drift detected, review the diff, and if intentional re-bless with `node test/eval/run-eval.cjs --bless`.
Do not reorder or alter existing checks — append only.

To verify drift detection works: temporarily edit a tracked SKILL.md (add a trigger phrase), run `node test/eval/run-eval.cjs`, confirm it exits non-zero and prints a diff, then REVERT the SKILL.md edit. Document this manual verification step in the task SUMMARY — do not leave the SKILL.md modified.
</action>
<acceptance_criteria>
- `grep -q "run-eval.cjs" scripts/dogfood-check.sh` succeeds.
- `bash -n scripts/dogfood-check.sh` exits 0 (valid shell syntax).
- `bash scripts/dogfood-check.sh` runs the new check and the eval check reports `pass` (baselines unchanged, no tracked SKILL.md left modified).
</acceptance_criteria>
<verify>
<automated>
bash -n scripts/dogfood-check.sh && grep -q "run-eval.cjs" scripts/dogfood-check.sh && node test/eval/run-eval.cjs
</automated>
</verify>
<done>dogfood-check.sh runs the behavior harness and a tracked SKILL.md edit produces a visible, reverted-after diff.</done>

</tasks>

<verification>
- `node --check test/eval/run-eval.cjs test/eval/normalize.cjs` exits 0.
- `node --test test/agent-behavior-eval.test.cjs` passes.
- `node test/eval/run-eval.cjs --bless` then `node test/eval/run-eval.cjs` exits 0 (baselines re-blessable and stable).
- `bash scripts/dogfood-check.sh` includes and passes the new eval check.
</verification>

<success_criteria>
- Editing a tracked SKILL.md produces a visible structural diff in the harness.
- Baselines committed normalized; raw output gitignored.
- Harness is re-blessable and wired into the dogfood check.
</success_criteria>

<output>
Create `.planning/phases/28-audit-gap-closure-ecc-parity-hooks-eval-harness-schema-validation-iterative-retrieval/28-2-SUMMARY.md`
</output>
