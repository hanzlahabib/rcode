# AUDIT: Token Cost of the Plan → Check → Execute → Verify Pipeline

**Scope:** Does rcode's multi-agent plan-check-execute-verify pipeline burn tokens and agent-hops it did not need to?
**Method:** Direct read of `rcode/workflows/plan.md`, `rcode/workflows/execute.md`, `rcode/workflows/plan-spawn-planner.md`, `rcode/workflows/execute-waves.md`, `rcode/workflows/execute-verify-phase-goal.md`, `rcode/workflows/execute-regression-gates.md`, the agent stubs (`rcode/agents/rcode-planner.md`, `rcode-sprint-checker.md`, `rcode-executor.md`) and every `@`-included reference/playbook file they load, cross-checked against the real git history and artifacts of Phase 44 in this repo.
**Verdict: yes.** The pipeline has no scope-aware cost model. A "delete 184 lines from one file, add a 20-line module, fix 3 doc lines" phase is charged the exact same fixed overhead — 6+ mandatory agent hops, ~2,000+ lines of unconditionally-loaded instruction text, and 2–3 independent re-reads of the same source lines — as a 20-file feature phase would be. Below are 15 findings, cited by file:line, ranked by how much of the 550k/175-tool-call bill each one is actually responsible for.

---

## Reference case (verified against real repo state)

- `.planning/phases/44-github-sync-path-drift-*/44-1-SPRINT.md` — the planner produced a **549-line SPRINT.md** for a task the SUMMARY itself later describes as "1027 → 843 lines" of extraction plus "6 lines in METHODOLOGY.md, 1 line in USP.md... 4 lines corrected" in a workflow file.
- `.planning/phases/44-github-sync-path-drift-*/44-CHECK.md:14-21` — the sprint-checker independently re-derived and cited the *exact same* line ranges of `cli/github-sync.js` (148-339, 461-492, 554/690-743/748-832/883-926/928-971) that the planner had already read and embedded in the SPRINT.md's `<read_first>` blocks.
- `git log --name-only 15c45d0..708790e` (the actual execution) shows **6 commits, one per task** — no `REVIEW.md`, no `VERIFICATION.md` ever landed in the tracked history, meaning even the observed 550k/4-hop run under-counts the pipeline's own designed cost (see Findings 1–2): the mandatory `rcode-reviewer` and `rcode-verifier` hops either didn't fire or weren't captured, and the phase correctly stayed at `status: executed`, never `complete`, per the UAT gate (`rcode/workflows/execute.md:796-847`).
- This repo's own `.rcode/config.yaml:4` has **`mode: yolo`** — the actual config phase 44 ran under (see Finding 3).

---

## Findings, most expensive first

### 1. [CRITICAL] Every SPRINT.md embeds the 1000+ line orchestrator workflow as the executor's own context, not the file that's actually for it
**File:** `.rcode/references/planner-playbook.md:171-174` (template the planner copies verbatim) → concretely present in `.planning/phases/44-github-sync-path-drift-*/44-1-SPRINT.md:45-48`
```
<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>
```
Every SPRINT.md the planner writes hard-codes `@.rcode/workflows/execute.md` as its execution context. That file is **1,062 lines** (`rcode/workflows/execute.md` is 1,095 in source) — it's the top-level *orchestrator* wave-dispatch workflow: git-worktree merge/cleanup bash (`execute-waves.md` steps 5.5/5.6), Slack/Discord/Teams webhook payload construction (`execute.md:944-965`), milestone-health nudges, the code-review-gate `Task()` spawn template, wave-parallelism overlap checks. None of that is executor-relevant — the executor's actual per-plan recipe lives in `.rcode/workflows/execute-sprint.md` (613 lines), a *different* file the template doesn't reference here. This means the executor agent's own read of its plan file (mandated by `execute-sprint.md:172`, "Read @context files from prompt") pulls in the wrong 1,000+ line document as if it were instructions, on every single executed plan, forever — independent of whether the phase has 1 task or 40. This is the single largest fixed line-count item found in the whole pipeline and looks like a copy-paste/templating defect, not a deliberate design choice.
**Est. cost:** ~1,000+ lines (a meaningful fraction of a 200k-token executor budget) loaded into every executor invocation, contributing directly to the 196k/97-call executor figure.

### 2. [CRITICAL] `mode: yolo` (this repo's own default) forecloses the one documented low-cost execution path without ever offering it
**File:** `.rcode/config.yaml:4` (`mode: yolo`) × `rcode/workflows/execute.md:94-100`
```
CONFIG_MODE=$(node .rcode/bin/rcode-tools.cjs config-get mode 2>/dev/null || echo "guided")
...
If CONFIG_MODE == "yolo" ... Skip the menu. Auto-select A) Autonomous run
```
The three-option menu (`execute.md:101-118`) explicitly documents **B) Interactive mode** as "No subagent overhead — dramatically lower token usage" (`execute.md:373-377`, "Benefits of interactive mode"). But under `mode: yolo` — which is this project's own live config, the config phase 44 ran under — the menu is never shown; **A) Autonomous run** (highest token cost, per the menu's own label at `execute.md:103-106`) is auto-selected unconditionally. The cheapest documented path in the entire codebase is reachable only by a user who (a) knows it exists and (b) manually flips `mode` back to `guided` or passes `--interactive`. Nothing nudges toward it for small phases.
**Est. cost:** this is a multiplier on everything else — it's the difference between "0 extra subagent spawns, inline execution" and "full worktree + subagent + merge/cleanup machinery" for every phase, including 6-task ones.

### 3. [CRITICAL] Identical ~460–800 line boilerplate stack re-paid from zero at every agent hop
**File:** `rcode/agents/rcode-planner.md:8-12`, `rcode/agents/rcode-sprint-checker.md:8-10`, `rcode/agents/rcode-executor.md:8-13`
```
rcode-planner.md:     @response-style.md(81) @karpathy-guidelines-full.md(79) @output-realism.md(52) @no-theoretical-suggestions.md(56) @planner-playbook.md(217)        = 485 lines
rcode-sprint-checker.md: @response-style.md(81) @karpathy-guidelines-full.md(79) @sprint-checker-playbook.md(128)                                                     = 288 lines
rcode-executor.md:    @response-style.md(81) @karpathy-guidelines-full.md(79) @output-realism.md(52) @no-unauthorized-git-ops.md(73) @no-theoretical-suggestions.md(56) @executor-playbook.md(119) = 460 lines
```
`response-style.md` (81) and `karpathy-guidelines-full.md` (79) — 160 lines, byte-identical — are loaded independently by all three agents (480 lines of pure duplication across the pipeline). Each agent spawn is a fresh context window, so there is no cross-agent reuse: every hop pays full price for the same generic style/guideline prose regardless of task size. This is architecturally inherent to "fresh context per subagent" (a real and often correct tradeoff), but it means the *fixed cost per hop* is large and constant — so every unnecessary hop (Findings 4, 5) multiplies it, and no mechanism scales it down for a 6-task phase vs a 40-task one.
**Est. cost:** ~1,200+ lines of instruction-only text loaded across the 3 core hops before any phase-specific content is read.

### 4. [HIGH] Code review and goal verification are mandatory hops with no per-run skip flag — the "4 agent hops" figure under-counts the pipeline's own designed cost
**File:** `rcode/workflows/execute.md:603-736` (code_review_gate), `rcode/workflows/execute-verify-phase-goal.md:5-40` (verify_phase_goal)
- `execute.md:608`: `CODE_REVIEW_ENABLED=$(... || echo "true")` — default on. The only way off is a **persistent config edit** (`workflow.code_review_enabled=false`); there is no `--skip-review` flag analogous to `/rcode-plan`'s `--skip-verify`.
- `execute-verify-phase-goal.md:15-39` spawns `rcode-verifier` **unconditionally** — no config gate, no CLI flag exists to skip it at all. The only way to avoid this hop is to never run `/rcode-execute`'s verification step, which leaves the phase permanently stuck at `status: executed` (`execute.md:796-847`, the UAT gate) rather than `complete`.
- Net effect: the pipeline's real minimum hop count for a phase that wants to reach `status: complete` is not 3 (planner/checker/executor) or 4 as cited, it's **6**: phase-researcher (off by default, fine) → planner → sprint-checker → executor → rcode-reviewer → rcode-verifier. The 550k/4-hop number for Phase 44 is the pipeline running *cheaper than its own default design* because REVIEW.md/VERIFICATION.md never landed.
**Est. cost:** 2 additional full agent spawns (reviewer + verifier), each paying the ~300-500 line fixed-boilerplate tax from Finding 3, plus re-reading all `SUMMARY.md`/`SPRINT.md`/source files a 4th and 5th time.

### 5. [HIGH] The same source-file line ranges get independently read/re-verified by 3 separate agents
**File:** `.planning/phases/44-.../44-1-SPRINT.md:59-64` (planner's `<read_first>` for task 44.1.1) vs `.planning/phases/44-.../44-CHECK.md:14-21` (checker's independent re-grep) vs `.rcode/workflows/execute-sprint.md:175` (executor's mandatory read_first gate)

The planner reads `cli/github-sync.js` to write task 44.1.1's read_first citing lines 148-282 and 336-339, plus `server/lib/scanner.js:113-222` and `cli/lib/github.cjs:360-377`. The sprint-checker then independently re-reads and re-cites overlapping/extended line ranges of the same file (148-339, 461-492, six more locations) "all confirmed via direct `grep -n`" — this is not incidental, it's **mandated**: `.rcode/references/sprint-checker-playbook.md:79` ("Run a sample of the cited greps yourself; if the planner's claimed '13 hits' actually returns 4, downgrade to BLOCKER"). Then `.rcode/workflows/execute-sprint.md:175` states: *"MANDATORY read_first gate ... Do not skip files because you 'already know' what's in them — read them."* — so the executor reads `cli/github-sync.js`, `server/lib/scanner.js`, and `cli/lib/github.cjs` a **third** time. Three separate context windows independently pay to load and reason over the same file regions, with zero context sharing between them.
**Est. cost:** 2 redundant full/partial reads of the primary source file(s) beyond the first necessary one — directly inflates all three agents' tool-call counts (part of the 52+26+97=175 total).

### 6. [HIGH] ~900-1,000 lines of orchestrator "required reading" loaded unconditionally regardless of phase size
**File:** `rcode/workflows/plan.md:43-56`, `rcode/workflows/execute.md:180-191`
```
plan.md required_reading:    auto-init-guard.md(117) + output-format.md(398) + revision-loop.md(38)
                            + gate-prompts.md(212) + karpathy-guidelines.md(11) + thinking-models-planning.md(127) = 903 lines
execute.md required_reading: auto-init-guard.md(117) + output-format.md(398) + git-preflight.md(117)
                            + karpathy-guidelines.md(11) + execution-protocol.md(155)                              = 798 lines
```
None of these are gated on phase size or complexity. `gate-prompts.md` (212 lines of Safety/Decision/Escalation gate templates) is loaded even when the phase does no deletes, no force-pushes, no irreversible actions — as was true for Phase 44 (a doc-line + extraction fix). `thinking-models-planning.md` (127 lines: pre-mortem, MECE decomposition, constraint analysis, reversibility testing) is loaded unconditionally even though it's only ever *used* when `features.thinking_partner` is enabled AND the checker happens to flag an architectural tradeoff keyword (`plan.md:681-698`) — a conditional feature with an unconditional read cost. `output-format.md` at 398 lines is the single largest item in both required-reading blocks and is loaded twice (once per workflow invocation) for banner/formatting rules that don't scale with task complexity.
**Est. cost:** ~900 lines (plan) + ~800 lines (execute) of orchestrator-context overhead per phase, independent of phase size — this doesn't hit the subagent token totals directly but is real prompt-processing cost paid by the main loop on every `/rcode-plan` and `/rcode-execute` invocation.

### 7. [MEDIUM] Evidence-grounding is verified twice — once by the tool that exists specifically to automate it, then again by hand
**File:** `.rcode/references/planner-playbook.md:29-33,102-131` (planner must grep/Read to justify every task claim) vs `.rcode/references/sprint-checker-playbook.md:89-93` (automated CLI check) vs `sprint-checker-playbook.md:79` (manual re-grep instruction, same dimension)
```
sprint-checker-playbook.md:89-93:
  node .rcode/bin/rcode-tools.cjs plan validate-evidence <phase> --spot-check
  Exit code 0 = pass, 1 = at least one task violation.

sprint-checker-playbook.md:79 (same "Evidence Grounding" dimension):
  "Run a sample of the cited greps yourself; if the planner's claimed
   '13 hits' actually returns 4, downgrade to BLOCKER."
```
There's a deterministic, cheap CLI tool (`plan validate-evidence --spot-check`) that programmatically checks every task has real evidence — and the same playbook, in the same verification dimension, *also* instructs the checker agent to manually re-run a sample of the cited greps itself. The manual step duplicates what the CLI tool is explicitly built to do, adding LLM-driven tool calls (Bash/Grep invocations, each with its own round-trip and reasoning overhead) on top of a check that's already automated and cheap.
**Est. cost:** a handful of extra Bash/Grep tool calls per checker run, scaling with number of `<evidence>` blocks in the plan — contributes to the checker's 26-call figure.

### 8. [MEDIUM] File-existence verification forces up to 2 tool calls per file path, for every path in `files_modified`, on every plan
**File:** `.rcode/references/planner-playbook.md:133-156`
```bash
test -f "<candidate>" && echo "OK" && exit 0
find . -type f \( -name "<basename>" -o -iname "*$<short-slug>*" \) \
  -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null
```
This is applied to *every* candidate path before it's allowed into `files_modified`. Phase 44's sprint had 6 files in `files_modified` (`44-1-SPRINT.md:7-13`) — at minimum 6 `test -f` calls, with a `find` fallback fired for any that don't hit on the first try. This is a legitimate anti-hallucination guard (addressing real issue #441), but it's flat per-path cost with no exemption for "this file was already `Read` two paragraphs ago in this same planning session" — the planner already opened `cli/github-sync.js` to write the read_first block; verifying it exists via a fresh `test -f` shell-out afterward is redundant with the Read that already happened.
**Est. cost:** ~6-12 extra Bash tool calls per plan, purely mechanical, contributing to the planner's 52-call figure.

### 9. [MEDIUM] Wave-overlap and file-ownership machinery runs even when there is exactly one plan in one wave — the only case where overlap is structurally impossible
**File:** `rcode/workflows/plan.md:492-557` (Step 8.5 File-Ownership & Conflict-Avoidance) and `plan.md:803-846` (Step 12.5 Wave Parallelism File-Overlap Check)
Both steps run unconditionally after the planner returns, building a "cross-sprint file manifest" and invoking `node rcode-tools.cjs plan check-wave-overlaps`. For Phase 44 there was exactly one SPRINT.md (`44-1-SPRINT.md`) in exactly one wave — no second plan exists to overlap with, so both checks are guaranteed to report "no collisions" / "no conflicts" before they even run. The checks exist to catch a real, cited failure mode (the calorie-calculator-ai overnight parallel-build incident referenced at `plan.md:495-497` and `planner-playbook`'s Codebase Discovery section) — but that failure mode requires ≥2 sprints in the same wave, a precondition neither step checks before doing the (cheap but nonzero) work of building the manifest and shelling out to the CLI helper.
**Est. cost:** low per-call (fast CLI invocations, not LLM reasoning), but it's tool-call count that's charged unconditionally on single-plan phases where the answer is knowable in advance from `plan_count == 1`.

### 10. [MEDIUM] Requirements Coverage Gate runs its grep even when `phase_req_ids` is an empty array, not `null`/`TBD`
**File:** `rcode/workflows/plan.md:848-852`
```
**Skip if:** `phase_req_ids` is null or TBD (no requirements mapped to this phase).
```
Phase 44's `44-CHECK.md:39-41` states `phase_req_ids: []` (an empty array — this is explicitly a repo-maintenance phase with `requirements: []` at `44-1-SPRINT.md:14`). The skip condition as written only checks for `null` or the literal string `"TBD"` — an empty array is neither, so this gate's grep-and-compare logic (`plan.md:854-857`, extracting `requirements_addressed`/`requirements:` from every SPRINT.md and diffing against an empty ID list) executes for no purpose on every requirement-free maintenance phase.
**Est. cost:** one extra grep + comparison pass per plan run, small but avoidable with a one-line condition fix (`phase_req_ids is null, TBD, or empty`) — flagged here as diagnosis only, per instructions.

### 11. [LOW] Post-step revert-detection gate runs a full diff/xargs/diff loop after every task commit
**File:** `.rcode/workflows/execute-sprint.md:350-393`
The gate runs "After every `git commit` that records a task completion" and does a `git diff --name-only`, then for each changed file shells out to `git show`+`diff` to compare against the plan-start SHA — a real anti-regression check (closes issue #737), but unconditional per-task, not scoped to risk level. For Phase 44's 6-task, single-agent, sequential (no parallel worktree contention) sprint, this fires up to 6 times. The file does include one exemption ("Skip this check on tasks with zero deletions"), which is good, but for tasks that touch existing files (like the 3 doc-line fixes and the CLI rewire, which all involve deletions), the full diff loop still runs even though a single-agent sequential execution on its own branch has no plausible source of an "accidental revert by another agent" — the failure mode this gate defends against.
**Est. cost:** small per-invocation (a git diff + a handful of `git show`/`diff` pipes), but repeats per task with no task-count-aware budget, adding to the executor's 97-call figure.

### 12. [LOW] `sprint-checker` runs by default for every phase with no scope-based exemption
**File:** `.rcode/config.yaml:12` (`plan_checker: true`) × `.rcode/bin/rcode-tools.cjs:576` (`plan_checker_enabled = String(wf.plan_checker ?? 'true') !== 'false'`)
There's a real off-switch (`--skip-verify` on `/rcode-plan`, or setting `workflow.plan_checker: false`), but it's opt-out, not scope-aware. A 6-task, single-file-extraction, 3-doc-line phase gets the full 12-dimension goal-backward verification pass (`.rcode/references/sprint-checker-playbook.md:65-83`) — Requirement Coverage, Task Completeness, Dependency Correctness, Key Links, Scope Sanity, Verification Derivation, Nyquist Compliance, Cross-Sprint Data Contracts, CLAUDE.md Compliance, File References, Evidence Grounding — the same 12 dimensions a 40-task multi-service phase gets. There's no "small phase, lighter check" tier; it's binary (full checker or none via `--skip-verify`).
**Est. cost:** this is the full 118k/26-call checker run for Phase 44 — the finding isn't that the checker is wasteful in general (it caught real things historically, per the calorie-calculator-ai and #649/#441 incidents cited throughout the playbooks), it's that its cost doesn't scale down with plan size, and the only lever is all-or-nothing.

---

## Config knobs that could shrink this but are not the default

| Knob | Where | Default | Effect if changed |
|---|---|---|---|
| `mode` | `.rcode/config.yaml:4` | `yolo` | Setting to `guided` restores the 3-option menu at `execute.md:101-118`, surfacing **Interactive mode** ("dramatically lower token usage", `execute.md:374-377`) as a real choice instead of auto-selecting Autonomous. |
| `--interactive` flag | `rcode/workflows/execute.md:333-380` | off | Executes plans inline in the orchestrator's own context — **no subagent spawn at all**. Never suggested or auto-applied for small phases; user must know the flag exists. |
| `workflow.code_review_enabled` | `execute.md:608` | `true` | Set to `false` to remove the mandatory `rcode-reviewer` hop (Finding 4). No per-invocation flag exists — config-only, persistent. |
| `--skip-verify` | `rcode/workflows/plan.md:127` | off | Skips the sprint-checker (step 10) entirely — the single biggest opt-out lever that exists, but the user has to remember to type it every time; there's no size-based auto-skip. |
| `workflow.plan_checker` | `.rcode/config.yaml:12` | `true` | Same effect as `--skip-verify` but persistent. |
| `workflow.use_worktrees` | referenced at `execute.md:244-247`, `execute-waves.md:74` | `true` | `false` forces sequential execution on the main tree, skipping all worktree create/merge/cleanup machinery (`execute-waves.md:284-391`) — real savings on single-plan phases where parallelism was never possible anyway. |
| `workflow.max_checker_iterations` | `plan.md:702-710` | 1 in yolo / 3 in guided | Already scoped by mode — this is one of the few genuinely cost-aware defaults found in the pipeline. |
| Nothing gates `rcode-verifier` | `execute-verify-phase-goal.md:15-39` | always on | **No config knob and no CLI flag exist** to skip this hop at all (Finding 4) — the only way to avoid it is to never call verification, which blocks the phase from ever reaching `status: complete`. |

---

## Same-file redundant reads across agents (consolidated)

| File | Read by planner | Read by checker | Read by executor |
|---|---|---|---|
| `cli/github-sync.js` | Yes — `44-1-SPRINT.md:59-64` cites lines 148-282, 336-339 | Yes — `44-CHECK.md:14-21`, independently re-grepped 148-339, 461-492, + 6 more locations | Yes — mandated by `execute-sprint.md:175` read_first gate |
| `server/lib/scanner.js` | Yes — `44-1-SPRINT.md:62` cites lines 113-222 | Not cited in CHECK.md, but the checker's "Evidence Grounding" dimension (`sprint-checker-playbook.md:79`) requires it to at least sample-verify claims that reference it | Yes — read_first gate |
| `cli/lib/github.cjs` | Yes — `44-1-SPRINT.md:63` cites lines 360-377 | Implicitly, via evidence spot-check | Yes — read_first gate |
| `.rcode/workflows/execute.md` (1,062 lines) | N/A | N/A | Yes — pulled in as `<execution_context>` per Finding 1, despite being the orchestrator's file, not the executor's |

No mechanism exists to pass a "here's what the planner already confirmed about this file" digest forward to the checker or executor beyond the plan text itself — each agent independently re-establishes ground truth on the same source regions from a cold context window.
