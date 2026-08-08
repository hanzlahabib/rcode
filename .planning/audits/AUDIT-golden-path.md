# AUDIT — Golden Path, Live Token Trace

**Date:** 2026-08-08
**Method:** Live measurement, not static review. A disposable scratch project (`/tmp/rcode-golden-path-test`, now deleted) was created and walked through the smallest real slice of the golden path — `/rcode-init` → `/rcode-add-phase` → `/rcode-plan` → `/rcode-execute` — for a single one-file, one-paragraph phase ("add CONTRIBUTING.md"). Every workflow file was actually read, every subagent actually spawned (model: `sonnet`, per the session's temporary budget rule), every gate actually hit. This is not a simulation — it's what the current install genuinely does for the smallest task that still exercises the full pipeline.

**Two kinds of numbers below:**
- **Measured (hard):** subagent `usage` blocks returned by the Agent tool — exact `subagent_tokens` counts for each of the 5 real agent spawns.
- **Estimated (soft):** orchestrator-side (my own) context cost from reading workflow/reference `.md` files, at a rough **~10 tokens/line** for dense instructional markdown. Labeled wherever used. My own visible context/status-line number was not exposed inside this harness for this session, so line-count-based estimation was the only available proxy — this is a real methodology limitation, noted up front rather than glossed over.

**The estimate is a floor, not a ceiling.** I skipped re-reading `output-format.md` / `karpathy-guidelines.md` / `auto-init-guard.md` for `/rcode-execute` (already loaded once earlier in the same session, so re-reading felt redundant) even though the literal workflow spec requires it unless explicitly chained (`AUTO_CHAINED_FROM_PLAN`), and I never opened `execute-regression-gates.md` (136 lines) at all. A fully literal run — the way a genuinely fresh session with no prior context would experience it — would cost strictly more than what's reported here.

---

## Step-by-step trace

| # | Command | Orchestrator cost (estimated, reading workflow docs) | Subagent cost (measured) | Cumulative total (approx) | What it actually delivered |
|---|---|---|---|---|---|
| 0 | **Prerequisite:** `pnpm install` + `node cli/install.js <target> --yes --force` (not a golden-path command — required because a fresh project has no `.rcode/bin/rcode-tools.cjs` yet) | ~1,500 tok (install output, file tree checks) | — | ~1,500 | 856 files installed, `.rcode/`, `.claude/`, `.cursor/`, `.antigravity/`, `.planning/` scaffolding, config.yaml + state.json written |
| 1 | `/rcode-init` | ~4,500 tok (`init.md` 357 lines ≈ 3,570 tok + bash detection calls + writing JOURNEY.md/active.md/project-brief.md) | — | ~6,000 | JOURNEY.md, active.md, project-brief.md populated (state was `returning` + JOURNEY missing → recovery path, not full first-run path) |
| 2 | `/rcode-add-phase` | ~4,000 tok (`add-phase.md` 194 lines ≈ 1,940 tok + `init phase-op` JSON dump, ~60 lines incl. full 45-agent `installed_agents` list + `phase add` call + STATE.md edit) | — | ~10,000 | Phase 1 directory + ROADMAP.md entry for "Add CONTRIBUTING.md..." |
| 3 | `/rcode-plan 1` | **~30,000 tok** (`plan.md` 1,001 lines + 7 mandatory required-reading files: auto-init-guard 117, output-format 398, karpathy 11, thinking-models-planning 127, plan-prd-express 113, plan-research-validation 320, plan-spawn-planner 362 = **2,449 lines ≈ 24,500 tok**, plus config-get/init JSON round-trips) | **87,768 tok** (planner: 51,195 / 15 tool calls / 91s + sprint-checker: 36,573 / 5 tool calls / 56s) | ~128,000 | One `1-1-SPRINT.md` (95 lines, 1 task) — verified, `## VERIFICATION PASSED` |
| 4 | `/rcode-execute 1` | **~19,400 tok** (`execute.md` 997 lines + git-preflight 117 + execution-protocol 155 + execute-waves 505 + execute-verify-phase-goal 168 = **1,942 lines ≈ 19,400 tok** — floor estimate, see caveat above) | **115,090 tok** (executor: 43,428 / 20 tool calls / 237s + reviewer: 35,599 / 4 tool calls / 35s + verifier: 36,063 / 5 tool calls / 37s) | ~262,500 | `CONTRIBUTING.md` (1 paragraph), `1-1-SUMMARY.md`, `1-REVIEW.md` (clean), `1-VERIFICATION.md` (passed), phase marked `complete` |

**Grand total: ≈ 262,500 tokens (a floor — real literal-compliance cost is higher) and ≈ 7.6 minutes of subagent wall-clock (455s across 5 sequential spawns) to ship one Markdown file containing one paragraph of text.**

Breakdown of the measured (hard-number) portion alone: **202,858 tokens across 5 subagents, 49 tool calls, 455 seconds** — this is real, not estimated.

---

## What felt surprisingly expensive relative to what it accomplished

1. **`/rcode-plan` and `/rcode-execute`'s required-reading load is flat-rate, not scaled to phase size.** Together they mandate reading ~4,400 lines of workflow/reference markdown (planner prompt template alone is 362 lines built around cross-sprint file manifests, aggregator-file collision rules, and a named post-mortem — `calorie-calculator-ai, 2026-05-26` — about multi-file merge conflicts). None of that machinery has anything to do with a plan that creates one file. The same apparatus fires identically for a 1-file docs phase and a 20-file feature phase.

2. **The planner and sprint-checker cost 87,768 tokens combined to produce and approve a 95-line SPRINT.md with one task.** That's ~920 tokens of subagent spend per line of plan output. `thinking-models-planning.md` (pre-mortem, MECE decomposition, constraint analysis, reversibility testing) is loaded unconditionally even though none of the four models are remotely proportionate to "write one paragraph."

3. **`/rcode-execute` spawns three full subagents (executor, reviewer, verifier) — 115,090 tokens — to ship, review, and verify one file.** The code-review gate and phase-goal verifier are both mandatory, non-skippable steps in the golden path for even the smallest phase. There is no "trivial phase" fast lane.

4. **The golden path breaks at the very first real gate a brand-new project hits.** `/rcode-execute`'s pre-flight refuses to run on branch `master`/`main` — the default branch name for any freshly `git init`'d project — regardless of `git.branching_strategy: none` in config (the pre-flight branch check is unconditional and ignores that setting entirely). A first-time user following init → add-phase → plan → execute in the most natural possible order hits a hard stop before their first line of code ships, and has to know to manually `git switch -c <phase>-<plan>-<slug>`.

---

## Concrete bugs/gaps found along the way (not fixed — pure measurement per instructions)

1. **`add-phase.md`'s `roadmap_exists` check can never fire.** `.rcode/workflows/add-phase.md:41-46` checks `INIT.roadmap_exists` from `node rcode-tools.cjs init phase-op`, but that command's actual JSON output (verified live) has no `roadmap_exists` key at all (keys are: `workflow, question, agent_id, flags, panel, scores, domain, question_type, question_signals, mode, response_language, config, installed_agents, paths, state_exists`). The guard against "no roadmap found" is dead code.

2. **Override flag name mismatch for the same gate.** `.rcode/workflows/execute.md:41` tells the user to pass `--allow-main` to bypass the protected-branch check. The shared contract it `@`-includes, `.rcode/references/git-preflight.md:38,64,69,104`, defines the flag as `--on-main`. A user following execute.md's own instructions literally would pass a flag that does nothing.

3. **`executor_model` returned by `init execute` is an unresolved profile name, not a model id.** `.rcode/bin/rcode-tools.cjs:963` — `executor_model: config.executor_model || config.model_profile || null` — returns the literal string `"balanced"` (verified live: `init execute "1"` → `"executor_model": "balanced"`). `.rcode/workflows/execute-waves.md:136` spawns the executor with `model="{executor_model}"` directly — i.e. `model="balanced"` — never resolved. A working resolver exists (`rcode-tools.cjs resolve-model executor` → `{"model":"claude-sonnet-4-6","profile":"balanced","agent":"executor"}`) and IS used correctly elsewhere in the same file for the reviewer spawn (`execute.md:581`), but not for the main executor spawn.

4. **`init execute`'s JSON is missing most fields the workflow says to parse.** `execute.md:241` lists `parallelization, branching_strategy, phase_found, phase_number, phase_name, phase_slug, plan_count, incomplete_count, roadmap_exists, phase_req_ids` as top-level fields to extract. The actual live output (captured in full) has none of these at top level — `branching_strategy` exists only nested under `config.branching_strategy`, and the rest are simply absent.

5. **The "`config-get` exits 0 with empty output" bug (already known and patched in three places in `plan.md`) recurs unpatched in at least 4 other gates:** `SECURITY_CFG`/`SECURITY_ASVS`/`SECURITY_BLOCK` (`plan-research-validation.md:160-162`), `UI_PHASE_CFG`/`UI_GATE_CFG` (`plan-research-validation.md:186-187`), and `USE_WORKTREES` (`execute.md:248`) all use `$(... || echo "true")`, which never fires because the command exits 0 with empty stdout when the key is absent — verified live (`config-get workflow.security_enforcement --raw` returned empty, not `"true"`). `plan.md` itself already documents the fix pattern (`${VAR:-default}` with an explicit comment) at lines 100, 246, 488 — it just wasn't applied to the sibling files.

6. **Duplicate milestone-health computation.** `add-phase.md`'s `milestone_health_check` step spawns 4 separate subprocess calls (1 `milestone-health` + 3 `node -e` JSON-field extractions) to get data that `rcode-tools.cjs phase add` already returns inline in the same call (verified live — the `phase add` response included a full `milestone_health: {...}` object).

7. **`/rcode-init`'s context-refresh step is a guaranteed no-op on first run.** Step 4b calls `node rcode-tools.cjs context refresh`, which reported (live) `".rcode/sources.yaml not found — no context to refresh."` Nothing in the installer or init workflow ever creates `sources.yaml`, so this call fails silently on every fresh project, every time.

8. **Stale `RIHAL ►` banner examples survive the v4.0.0 rihal→rcode rebrand.** `.rcode/references/output-format.md:45,72,331` still show `RIHAL ► {STAGE}` in its canonical banner examples, while the actual workflow files (`plan.md`, `execute.md`, `plan-research-validation.md`, `plan-prd-express.md`) all correctly emit `rcode ►`.

---

## Cleanup

Scratch project `/tmp/rcode-golden-path-test` deleted after the trace was captured. This document and the trace above are the only artifacts kept.
