# Sprint 28-2 Summary — Agent-Behavior Regression Harness (#746)

**Phase:** 28 — Audit Gap Closure
**Sprint:** 28-2
**Branch:** `audit-gap-closure`
**Status:** Complete

## Objective

Build a lightweight, offline agent-behavior regression harness under `test/eval/`.
It snapshots the *structured* decision surface of key SKILL.md / agent .md files
(trigger phrases, declared tools, routing keywords, negative boundaries),
normalizes it (drops prose), and diffs against committed baselines. Drift flags
for human review — it does not auto-pass. Baselines are re-blessable; raw output
is gitignored. Wired into `scripts/dogfood-check.sh`.

## Tasks Completed

### Task 2.1 — Harness skeleton, prompt set, normalizer
- `test/eval/prompts.json` — maps 5 tracked artifacts to fixed probe-scenario keys:
  - `rihal/skills/agents/raees-orchestrator/SKILL.md` (classifier-routed orchestrator skill)
  - `rihal/agents/rihal-phase-researcher.md`
  - `rihal/agents/rihal-research-synthesizer.md`
  - `rihal/agents/rihal-planner.md`
  - `rihal/agents/rihal-codebase-mapper.md`
  - All 5 paths verified present on disk before listing.
- `test/eval/normalize.cjs` — exports `normalize(artifactPath)` returning a
  deterministic JSON object: sorted trigger phrases (from both the YAML
  `triggers:` list and quoted phrases in the description's "Activates when…"
  clause), sorted `tools`, sorted negative-boundary phrases ("Do NOT use for:"),
  and sorted routing/decision keywords (headings, route/spawn/dispatch verbs,
  referenced `rihal-*` agent names). Free prose excluded; every collection sorted
  for byte-identical output.
- `test/eval/run-eval.cjs` — Node-stdlib CLI: default mode diffs each artifact
  against `test/eval/baselines/<slug>.json` and exits 1 on drift (with a
  unified-style diff); `--bless` rewrites all baselines and exits 0.
- `test/eval/baselines/.gitkeep` added.

### Task 2.2 — Bless baselines and add test wrapper
- Ran `node test/eval/run-eval.cjs --bless` → 5 committed baseline JSON files.
- `test/agent-behavior-eval.test.cjs` — `node --test` wrapper spawning
  `run-eval.cjs` (no `--bless`), asserting exit 0; plus an assertion that a
  known baseline file exists and parses as JSON. Modeled on
  `test/bash-guard-hook.test.cjs`.
- `.gitignore` — added a defensive raw-output rule (`test/eval/raw/`,
  `test/eval/*.raw.json`). The harness writes no raw artifacts today; the rule
  is preventive so future raw dumps are never committed, while
  `test/eval/baselines/` stays tracked.

### Task 2.3 — Wire into dogfood-check.sh + verify drift detection
- Appended `Check 8` to `scripts/dogfood-check.sh` following the existing
  numbered-`Check N` / `pass`/`fail` pattern. No existing checks reordered.
  On drift it points to `node test/eval/run-eval.cjs --bless`.
- **Manual drift verification:** temporarily added a `"DRIFT_TEST_TRIGGER"`
  trigger to `raees-orchestrator/SKILL.md`; `run-eval.cjs` exited **1** and
  printed a unified diff showing the new trigger. The SKILL.md edit was then
  reverted (`git status` confirmed clean) and a re-run exited 0.

## Deviation

During the Task 2.3 manual drift verification the first drift run unexpectedly
passed. Root cause: `normalize.cjs` used `\Z` in three regexes — `\Z` is **not**
a valid JavaScript regex anchor (it is treated as a literal `Z`), so the YAML
`triggers:` block was being skipped entirely and only description-prose triggers
were captured. Fixed by replacing the lookahead with `(?=^\S|$(?![\r\n]))`.
Baselines were re-blessed after the fix (trigger count for the orchestrator skill
went 12 → 29 as the YAML list was now correctly included). This is a Rule 1
auto-fix (logic bug directly in the code authored by this sprint).

## Verification Results

| Check | Result |
|-------|--------|
| `node --check test/eval/normalize.cjs` / `run-eval.cjs` | exit 0 |
| `prompts.json` parses, ≥5 keys, every path exists | exit 0 |
| `ls test/eval/baselines/*.json` | 5 files |
| `node --test test/agent-behavior-eval.test.cjs` | pass (2/2) |
| `.gitignore` has `test/eval` raw rule, baselines not ignored | confirmed |
| `bash -n scripts/dogfood-check.sh` | exit 0 |
| `bash scripts/dogfood-check.sh` (incl. Check 8) | all checks pass |
| Drift detection (temp trigger edit) | exit 1 + visible diff, reverted clean |
| `--bless` then re-run | re-blessable and stable (exit 0) |

## Full Suite

`node --test` — 3 failures, all pre-existing baseline failures named in the
sprint brief; **no new failures introduced**:
- `scope-history-parity` — `kanban`, `orchestrator` scopes not in AGENTS.md
- `broken @-references do not regress past baseline`
- `every command file @-includes its corresponding workflow`

`test/agent-behavior-eval.test.cjs` passes.

## Commits (branch `audit-gap-closure`, not pushed)

- `afaa3c2` feat(cli): add agent-behavior regression harness (#746)
- `cea0397` feat(config): wire agent-behavior harness into dogfood-check (#746)

## Files

- `test/eval/prompts.json` (new)
- `test/eval/normalize.cjs` (new)
- `test/eval/run-eval.cjs` (new)
- `test/eval/baselines/.gitkeep` + 5 baseline `.json` (new)
- `test/agent-behavior-eval.test.cjs` (new)
- `scripts/dogfood-check.sh` (modified — appended Check 8)
- `.gitignore` (modified — raw-output rule)
