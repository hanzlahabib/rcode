# WF-token-cost — Workflow Audit

**Lens:** Does rcode actually SAVE tokens or spend them? Quantify the cost of a typical plan/execute cycle.
**Date:** 2026-09-16
**Branch:** wf-token-cost
**Auditor scope:** DIAGNOSE-ONLY — no source modifications.

---

## Verdict

rcode's plan/execute pipeline costs roughly **400–600k tokens per phase** for a typical 2-sprint feature delivery — not because the methodology is wasteful in intent, but because six mandatory agent hops each re-read the same ~900 lines of boilerplate before touching a single line of product code. The effort-tier gate (`plan-effort-tier.md`) is the one real cost-saving lever in the system, yet it fires only on keyword absence and sprint count, not on measured context consumption; everything else — `output-format.md` loaded unconditionally by 23 workflows, 38/61 SPRINT files pointing at the 1,110-line orchestrator instead of the 613-line executor, yolo mode silently picking the most expensive execution path — works against it. rcode will save tokens versus an unstructured agentic loop only if the effort-tier gate triggers correctly AND the user does not run in yolo mode; under default installation conditions neither is guaranteed.

---

## The user's actual experience

A Phase 44 reference run (6-task documentation fix, single sprint, 549-line SPRINT.md) consumed **~550k tokens and 175 tool calls** — confirmed by the existing `.planning/audits/AUDIT-token-cost.md`. That is roughly **$1.65–$2.40 at Sonnet 4.x pricing** ($3/M input, $15/M output; rates baked into `rcode-hooks.cjs:1148–1200`) for a change that touched documentation only. The same work done with a single focused agent prompt against the relevant files would cost an order of magnitude less.

The user experiences this as: type `/rcode-plan N`, wait for a researcher agent to spin up and read files it will hand off unchanged to the planner, wait for the planner to produce a sprint the checker will read and mostly approve, wait for the executor to re-read the same sprint and files the planner already read — and finally see a commit. Five of the six agents in the pipeline do non-zero redundant reading. The session-report (`session-report.md` step 5) shows a token summary at the end, but only if `cost.jsonl` is populated — and the Stop hook that writes `cost.jsonl` is **not installed** in this project's `.claude/settings.json` (it exists in `templates/settings-hooks.json` but was never applied). So the user also cannot see how much they spent.

**Typical per-phase cost breakdown (heuristic, 1 token ≈ 4 chars):**

| Phase | Token estimate | Notes |
|---|---|---|
| plan.md required_reading | ~14k | auto-init-guard(131) + output-format(419) + karpathy(11) + conditional refs |
| rcode-phase-researcher | ~80–120k | codebase reads + RESEARCH.md write |
| rcode-planner | ~150–200k | planner-playbook(251) + 5 behaviour refs (~616 lines) + research read + sprint write |
| rcode-sprint-checker | ~60–80k | checker boilerplate(~349 lines) + sprint read + report write |
| execute.md bootstrap | ~10k | git-preflight(130) + execution-protocol(163) + 3 skipped refs if AUTO_CHAINED |
| rcode-executor | ~120–180k | executor boilerplate(~460 lines) + sprint read + file writes |
| **Total** | **~440–600k** | Single 2-sprint phase, no verify skip |

---

## Leaks

**L1 — 38/61 SPRINT.md files reference the 1,110-line orchestrator (`execute.md`) in their `<execution_context>`, not the 613-line executor (`execute-sprint.md`).**
Every one of those sprints loads ~500 extra lines of routing/menu logic the executor never uses. Phases 1–44 are all affected. The template was fixed at Phase 45 but the backlog was never patched.
Evidence: `grep -rn "@.rcode/workflows/execute.md" .planning/phases/` returns 38 matches.

**L2 — `output-format.md` (419 lines) is loaded unconditionally by 23 workflows on every invocation.**
This is a formatting reference. It does not change between runs. Loading it unconditionally into 23 workflows adds ~2,500 tokens per workflow entry, every time. There is no conditional gate, no version hash check, no "skip if already loaded in this session" guard.

**L3 — Agent boilerplate duplicated across all three core agents: ~906 lines total.**
`response-style.md`(98) + `karpathy-guidelines-full.md`(79) are loaded independently by planner, checker, and executor. No shared injection point. Three agents × two files = 6 redundant reads of the same 177 lines per pipeline run (~44k chars ≈ ~11k tokens).

**L4 — yolo mode silently opts the user into the highest-cost execution path.**
`execute.md` lines 130–218 present three options: (A) Autonomous run, (B) Interactive "dramatically lower token usage", (C) Targeted patch. `config.yaml mode: yolo` auto-selects A without ever displaying the menu. A user who set `yolo: true` for convenience gets the most expensive path by default; the token saving in B is real (the code labels it "dramatically lower") but is never surfaced.

**L5 — Stop hook not installed → zero token telemetry active.**
`settings-hooks.json` (the template) includes `cost-track` and `stop-verify` in the Stop block. The installed `.claude/settings.json` on this project has no Stop hook at all. `session-report.md` step 5 falls back to a heuristic estimate when `cost.jsonl` is missing — but the heuristic uses the same hardcoded Sonnet 4.x rates ($3/$15) that may not match the user's actual model. Users cannot see real spend; the system cannot enforce context-budget tier transitions either.

**L6 — `context-budget.md` is advisory, not enforced.**
The file defines 4 degradation tiers (PEAK/GOOD/DEGRADING/POOR) with clear thresholds (>80% used = emergency mode). It is only loaded in `execute.md` "if context degradation guidance is needed" — a conditional that fires on human judgment, not on a measured token count. No workflow checks `tokens_used / context_window_tokens` at runtime. The POOR-tier warning ("Suggest /rcode-pause-work") can never fire automatically.

**L7 — `token-meter.md` and `token-strategy.md` referenced in the audit brief do not exist.**
There is no formal token strategy document in `rcode/references/`. The closest artifacts are `context-budget.md` (advisory tiers) and the Stop hook's `costTrack()` function (`rcode-hooks.cjs:741–787`). Token cost is not a first-class concern in the methodology's written documentation.

---

## Strengthenings

**S1 — `plan-effort-tier.md` is the one real gate and it works correctly when it fires.**
Pre-plan gate: grep phase goal for `security|migration|auth|payment|schema`; no match → `EFFORT_TIER_SKIP_RESEARCH=true` (skips the ~80–120k researcher hop). Post-plan gate: single sprint + no risk keywords + no file-ownership collisions → `EFFORT_TIER_SKIP_VERIFY=true` (skips the ~60–80k checker hop). For a genuine 1-sprint doc fix, this gate could save ~150–200k tokens — around 30–35% of the total. The `--tier trivial` override also works correctly.

**S2 — `AUTO_CHAINED_FROM_PLAN` prevents triple-loading shared refs.**
`plan.md:1214` sets `AUTO_CHAINED_FROM_PLAN=true` before handing off to `execute.md`. `execute.md:276–288` conditionally skips `auto-init-guard`(131), `output-format`(419), and `karpathy-guidelines`(11) when this flag is set. This saves ~2,250 tokens per chained plan→execute run. The mechanism is correct; it is the non-chained (`/rcode-execute` standalone) path that still pays the full load.

**S3 — Sprint template fixed for new phases (Phase 45+).**
`rcode/templates/sprint.md` lines 33–36 now correctly point to `@.rcode/workflows/execute-sprint.md`. New phases generated after Phase 45 will not exhibit L1. This is a zero-cost fix that has already been applied to the template — it just needs backfilling to existing sprints.

**S4 — Effort-tier `--tier complex` forces full pipeline even if heuristics would skip it.**
The override resolution table in `plan-effort-tier.md` sets `RISK_KEYWORDS_FOUND=true` for `--tier complex`, blocking both skip gates. This is the correct safety valve: a user who knows their phase touches auth or schema can force full research+verify even when grep misses it.

---

## Kill your darlings

**K1 — Kill the unconditional `output-format.md` load in non-interactive workflows.**
419 lines of formatting guidance loaded by 23 workflows on every invocation, including programmatic/chained runs where no human reads the formatted output. A one-line guard (`if [[ "$AUTO_CHAINED_FROM_PLAN" != "true" ]]`) in each workflow's required_reading block, or a single shared "already loaded this session" sentinel, would eliminate ~2,500 tokens × 23 workflows of waste for users running the full pipeline.

**K2 — Kill the per-agent duplication of `response-style.md` + `karpathy-guidelines-full.md`.**
These two files (177 lines combined) are loaded independently into planner, checker, and executor. They contain no agent-specific content. A single shared injection at the orchestrator level (plan.md / execute.md), excluded by the downstream agents, would cut ~11k tokens per pipeline run and reduce the agent stub maintenance surface by 6 files.

**K3 — Backfill the 38 broken SPRINT.md `<execution_context>` blocks.**
A one-time `sed` pass replacing `@.rcode/workflows/execute.md` with `@.rcode/workflows/execute-sprint.md` in `.planning/phases/**/` would fix all 38 affected sprints, saving ~250k chars (~62k tokens) across the backlog and eliminating the risk of an executor loading the full orchestrator by accident. This is a 10-minute scripted fix, not a refactor.

**K4 — Kill the yolo→Autonomous default or expose the Interactive option's cost label.**
Either: (a) make yolo mode select Interactive (B) by default and require `--tier autonomous` to opt into Autonomous, or (b) at minimum, when auto-selecting A, print the one-liner `"Autonomous mode selected (higher token usage). Pass --tier small to use Interactive."`. Option (b) is a 1-line change to execute.md's yolo branch; option (a) is a behavioral change that requires a CLAUDE.md/config note to avoid surprising existing yolo users.

**K5 — Install the Stop hook by default.**
The `settings-hooks.json` template already has `cost-track` and `stop-verify` in the Stop block. The install script (`cli/lib/install-hooks.cjs`) supports `'stop'` in `VALID_SUBS`. The only missing step is ensuring `install-hooks.cjs` writes the Stop block to `.claude/settings.json` during `npx @hanzlaa/rcode install`. Without this, token telemetry is permanently dark and the session-report falls back to estimates that may be wrong by 2–5× depending on model selection.
