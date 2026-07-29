# Audit: Workflow Orchestrator Complexity — plan.md / execute.md / plan-spawn-planner.md / execute-sprint.md

**Scope:** `rcode/workflows/plan.md`, `rcode/workflows/execute.md`, `rcode/workflows/plan-spawn-planner.md`, `rcode/workflows/execute-sprint.md`, plus every `@`-included workflow/reference file they unconditionally pull into context.

**Verified line counts** (`wc -l`, this worktree, 2026-07-29):

| File | Lines | Cap (AGENTS.md:61) | Over? |
|---|---|---|---|
| `rcode/workflows/plan.md` | **1111** | 1000 | Yes, +111 |
| `rcode/workflows/execute.md` | **1095** | 1000 | Yes, +95 |
| `rcode/workflows/plan-spawn-planner.md` | 363 | 1000 | No |
| `rcode/workflows/execute-sprint.md` | 663 | 1000 | No |

Confirmed: `plan.md` and `execute.md` both breach the repo's own file-size rule. `execute-sprint.md` and `plan-spawn-planner.md` are under the cap on their own, but both are pulled wholesale into the orchestrator's context by `plan.md`/`execute.md`, and `plan-spawn-planner.md` is itself under-audited as a "component" file even though it's really Step 8 of `plan.md` split out — more on that below.

**Verdict up front:** most of the raw line count is legitimate — wave-parallel worktree execution, revert detection, code-review gating, and the deviation/checkpoint protocol are real problems this tool solves and the prose is mostly load-bearing. But there is a specific, fixable category of self-inflicted bloat: **reference files that are loaded unconditionally into every single run but don't match what the workflow actually does**, and **rare-path sections inlined instead of using the conditional-`@include` pattern the codebase already has proof-of-concept for** (`PHASE_GOAL_HAS_UI` at `plan.md:49`). Fixing the top three findings below would cut ~250–900 lines of *context actually loaded per run* without touching a single line of the load-bearing execution logic.

---

## Finding 1 — Two unconditionally-loaded reference files don't describe what the workflow actually does (250 lines/run, 100% of `/rcode-plan` runs)

`plan.md:50-51` unconditionally `@`-includes:

```
@.rcode/references/revision-loop.md
@.rcode/references/gate-prompts.md
```

**`revision-loop.md` (38 lines) is a different revision loop than the one `plan.md` implements.** It describes a generic council-review process: capture reviewer concerns, triage each into Accept/Counter/Defer, "Three revisions is the soft cap," write to a "PLAN.md ... Revision history" section (`rcode/references/revision-loop.md:1-38`). None of that matches Step 12 in `plan.md` (`plan.md:700-801`), which is the actual revision loop this workflow runs: mode-based iteration caps (1 in yolo, 3 in guided — not a flat "three"), a sprint-checker malfunction guard, stall detection with `stall_reentry_count`, and output to `SPRINT.md` (not `PLAN.md`). The two don't share vocabulary, cap values, or output artifact names. This reads as a leftover from an earlier design (or a generic template that was never adapted) rather than something `plan.md` actually consults.

**`gate-prompts.md` (212 lines) documents Safety/Decision/Irreversible-Action gate templates for destructive git operations** — "Delete Feature Branch," "Force-Push to Main," "Delete production data" (`rcode/references/gate-prompts.md:31-146`). `plan.md`'s actual process never performs a destructive git operation; it writes `SPRINT.md` files and calls `AskUserQuestion` for scope/checkpoint decisions using its own inline formats (see `plan.md:346-354`, `plan.md:604-621`), none of which follow the templates in this file. This 212-line file is orchestrator-context weight with no corresponding call site in `plan.md`.

**Impact:** 250 lines loaded into every single `/rcode-plan` invocation (not just an edge case — 100% of runs) for content that isn't applied.

**Suggested split pattern (diagnosis only, not proposing the fix here):** these are prime candidates for deletion or for gating the same way `ui-brand.md` already is (`plan.md:49`, `${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}`) — except unlike `ui-brand.md`, there's no flag under which these two ever become relevant to `plan.md`, which is why deletion (or moving the content to wherever it's actually meant to apply, e.g. `/rcode-council`) is worth considering over gating.

---

## Finding 2 — Rare-mode sections inlined instead of using the codebase's own proven conditional-include pattern (~419 combined lines, direct cause of both files breaching the 1000-line cap)

The codebase already has the pattern for this — `plan.md:49`:
```
${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}
```
254 lines of `ui-brand.md` are only pulled into context when the phase goal actually mentions UI. This is exactly the right idiom for "content most runs don't need." It is applied to exactly one reference file and nowhere else in either `plan.md` or `execute.md`, despite both files containing multiple inline sections that are gated on a flag/condition and only relevant to a minority of runs:

**`plan.md`:**
| Section | Lines | Gate | Approx size |
|---|---|---|---|
| `--gaps` mode detection + full gap-closure flow (3.6) | `plan.md:133-142`, `plan.md:229-315` | `GAPS_MODE=true` only | ~110 lines |
| `--from-stub` mode | `plan.md:67-75`, `plan.md:144-170` | `--from-stub` flag only | ~45 lines |
| `<windows_troubleshooting>` block | `plan.md:1067-1089` | Windows users only | ~23 lines |
| 9b. Phase Split Recommendation | `plan.md:595-626` | Only when planner returns `PHASE SPLIT RECOMMENDED` | ~32 lines |
| 13c. Milestone-health nudge | `plan.md:909-925` | Only relevant every N phases | ~17 lines |
| Thinking-partner tradeoff block | `plan.md:681-698` | Only if `features.thinking_partner` enabled | ~18 lines |

Subtotal: **~245 lines** of `plan.md`'s 1111 are edge-case sections that a normal single-phase, non-Windows, non-gap-closure run never executes but always reads.

**`execute.md`:**
| Section | Lines | Gate | Approx size |
|---|---|---|---|
| Interactive mode (`check_interactive_mode`) | `execute.md:333-380` | `--interactive` flag only | ~48 lines |
| `close_parent_artifacts` (decimal/polish phases) | `execute.md:738-786` | Phase number has a `.` (X.Y) only | ~49 lines |
| `notify_on_completion` (Slack/Discord/Teams webhooks) | `execute.md:944-965` | Only fires if webhook URLs configured (rare) | ~22 lines |
| `auto_copy_learnings` | `execute.md:899-920` | "Skip entirely (feature disabled by default)" — literally off by default | ~22 lines |
| `generate_tests` offer | `execute.md:967-992` | Advisory only | ~26 lines |
| Copilot runtime-compatibility carve-outs | `execute.md:162-178`, `execute.md:270-277` | Non-Claude-Code runtime only | ~25 lines |

Subtotal: **~192 lines** of `execute.md`'s 1095 are runtime/mode-specific carve-outs.

**Why this matters beyond line count:** these are exactly the sections that would bring both files under the 1000-line cap if extracted into sibling files and `@`-included conditionally (mirroring `PHASE_GOAL_HAS_UI`) — `plan.md` at 1111 − 245 ≈ 866, `execute.md` at 1095 − 192 ≈ 903. Both would clear AGENTS.md's own limit without cutting a single line of logic, just by relocating the parts that already have a natural boolean gate.

---

## Finding 3 — `plan.md` and `execute.md` both re-read the same required-reading files during an `--auto` chain (526 lines duplicated per chained run)

`plan.md` required_reading (`plan.md:44-55`) includes `auto-init-guard.md` (117 lines), `output-format.md` (398 lines), and `karpathy-guidelines.md` (11 lines). `execute.md` required_reading (`execute.md:181-190`) independently lists the *same three files again*: `auto-init-guard.md`, `output-format.md`, `karpathy-guidelines.md`.

That overlap is harmless if `plan.md` and `execute.md` always run as separate, fresh invocations. But they don't: when `workflow.auto_advance` (or `--auto`) is set, `plan.md` step 15 explicitly launches `execute.md` **inline, in the same context**, specifically to avoid a fresh subagent:

> "Launch execute-phase using the Skill tool to avoid nested Task sessions (which cause runtime freezes due to deep agent nesting)" — `plan.md:965`
> `Skill(skill="rcode-execute", args="${PHASE} --auto --no-transition ${RCODE_WS}")` — `plan.md:967`

And `execute.md` itself confirms the same "stay in this context" intent for its own downstream transition: "Execute the transition workflow inline (do NOT use Task — orchestrator context is ~10-15%, transition needs phase completion data already in context)" — `execute.md:1039`.

Since `Skill()` here is explicitly chosen over `Task()` *to keep everything in one context* (not spawn a fresh one), an `--auto`-chained plan→execute run reads `auto-init-guard.md` + `output-format.md` + `karpathy-guidelines.md` twice — once when `plan.md`'s required_reading loads, and again when `execute.md`'s required_reading loads inside the same accumulating context. That's 117 + 398 + 11 = **526 lines read twice** in a flow this codebase already treats as common enough to have dedicated `--auto`/`--chain` flag plumbing (`plan.md:930-992`).

---

## Finding 4 — Orchestrator-facing `required_reading` contains subagent-facing content that's never forwarded to the subagent

`plan.md:55` unconditionally includes `thinking-models-planning.md` (127 lines — pre-mortem analysis, MECE decomposition, constraint analysis, reversibility testing prompt templates aimed at whoever is *writing* a plan). The orchestrator (`plan.md`) never writes a plan itself — its entire job is to assemble a prompt and call `Task(subagent_type="rcode-planner", ...)` (`plan-spawn-planner.md:351-357`). The actual mechanism for giving the planner subagent behavioral guidance is the `${AGENT_SKILLS_PLANNER}` variable, populated separately via `node rcode-tools.cjs agent-skills rcode-planner` (`plan.md:99`) and interpolated into the planner's prompt at `plan-spawn-planner.md:105`. `thinking-models-planning.md`'s content is not part of that interpolation — it sits in the orchestrator's own context, read but never passed downstream to the agent it's written for.

The same shape applies more mildly to `karpathy-guidelines.md` (11 lines, small enough not to worry about) — "Four hard constraints for every agent that writes, reviews, or modifies code" (`rcode/references/karpathy-guidelines.md:3`) is guidance for code-writing subagents, loaded into an orchestrator that writes no code.

**Impact:** ~127 lines/run of content the orchestrator reads but has no mechanism to act on or relay.

---

## Finding 5 — `git-preflight.md` and `execution-protocol.md` (both unconditional `execute.md` includes) actively contradict what `execute.md` itself does

Two separate, independently-verifiable contradictions between `execute.md`'s always-loaded references and its own inline logic — not just duplication, but content that would produce wrong guidance if followed literally:

1. **Branch naming.** `execute.md`'s own pre-flight step suggests, verbatim: `git switch -c <phase>-<plan>-<slug>` with the worked example `git switch -c 8-1-aria` (`execute.md:39-40`). But `git-preflight.md` — unconditionally `@`-included at `execute.md:183` — defines `BRANCH_OK` via a regex that requires a `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, `perf/`, `style/`, `build/`, `ci/`, `issue-`, or `task-` prefix (`rcode/references/git-preflight.md:20-22`). `8-1-aria` matches none of those patterns — the branch name `execute.md` tells the user to create would fail the branch-name check in the reference file loaded three lines above it in the same required-reading block.

2. **Zero-padded IDs.** `execution-protocol.md` (unconditionally included at `execute.md:187`) documents the canonical SPRINT.md frontmatter schema with zero-padded IDs: `phase: "01"`, `plan: "02"` (`rcode/references/execution-protocol.md:11-15`). This directly contradicts the project's own explicit rule, stated inline in `plan.md` itself: `# Issue #652 — no leading zeros in planning artifacts. Phase 8 not 08, plan 2 not 02.` (`plan.md:276`). `execution-protocol.md`'s schema example also doesn't match what `plan-spawn-planner.md` actually instructs the planner to emit (frontmatter fields `phase`, `plan_number`, `gap_closure`, `wave`, `depends_on`, `files_modified`, `autonomous` — no `id`, no `milestone`, no zero-padding; see `plan-spawn-planner.md:53-62`). This reads as a stale reference doc that predates issue #652's fix and was never updated.

These aren't line-count issues — they're evidence that the unconditionally-loaded reference files aren't being kept in sync with the workflows that include them, which is a stronger argument for splitting/gating them than pure token cost: content nobody re-verifies against the thing it documents drifts, and stale-but-present docs get followed by whichever agent happens to read them literally.

---

## Finding 6 — Two independent revert-detection gates in `execute-sprint.md`, same underlying problem

`execute-sprint.md` has two separately-named, separately-implemented "did this task's write actually survive?" gates, back to back:

- `<hook_revert_detection_gate>` (`execute-sprint.md:378-392`, ~15 lines) — runs `git diff --name-only HEAD` after each write; if the target file shows *no* diff, concludes a hook silently reverted it.
- `<post_step_revert_gate>` (`execute-sprint.md:394-437`, ~44 lines) — runs after every task commit, computes `PLAN_START_SHA`, and flags a revert if a previously-modified file now has *fewer lines*, or a previously-added function/class is missing, or the diff-stat shows net deletions.

Both exist to catch the same failure mode (a task's work getting silently undone — one by a pre-commit hook, one by an unrelated prior-task regression), triggered at overlapping points (after a write / after a commit), using two different heuristics (no-diff-at-all vs. line-count-decreased). They are not obviously redundant — the hook-revert gate catches "reverted to exactly the prior state," the post-step gate catches "modified but shrunk" — but the two were evidently added independently (different heading styles, different trigger wording: "After each task that writes or edits files" vs. "After every `git commit` that records a task completion") rather than designed as one mechanism with two checks. Worth a second look at whether one subsumes the other, or whether they should be merged into a single named gate with two detection modes, purely so a maintainer reading `execute-sprint.md` doesn't have to figure out on their own that these are related.

---

## Finding 7 (direct answer to the "revision loop vs wave-overlap vs banner gate" question)

The prompt asked specifically whether the revision loop's max-iteration logic (`plan.md:700-801`), the wave-overlap checker (`plan.md:803-846`), and the banner-emission gate (`plan.md:996-1024`) are each independently necessary, or whether two of them solve the same problem twice.

**They are not all the same problem.** The wave-overlap checker (12.5) is a mechanical, structural check — does any pair of same-wave plans' `files_modified` lists intersect — with no relationship to plan *quality* or the sprint-checker's verdict. It's independently necessary; nothing else in the file catches file-collision-across-parallel-plans.

**The revision loop and the banner-emission gate, however, are two mechanisms answering the same question: "is this plan actually good enough to tell the user it's done?"** The revision loop (Step 12) tracks pass/fail state *during* the run via `iteration_count`, `issue_count`, and `stall_reentry_count`, and decides when to stop revising. The banner-emission gate (bottom of the file, `plan.md:996-1024`) then independently re-derives the same "did this actually pass" answer from scratch immediately before printing `PLANNED ✓`, by re-checking for a passing `CHECK.md` on disk / an explicit override / `plan_checker_enabled=false` — it does not reference `iteration_count` or `issue_count` at all, even though those variables already encode the same fact in-context from twenty lines earlier in the same file's control flow. This is two independently-implemented sources of truth for one boolean ("is the plan verified"), one process-based (the loop) and one artifact-based (the gate re-reading `CHECK.md` from disk). They happen not to be able to drift apart in practice only because the loop's exit paths all either produce a passing `CHECK.md` or force an explicit user override — i.e., the gate's disk-based check is a re-verification of something the loop already knows, not a check against independent new information. Worth asking whether the gate should just consume the loop's own exit state instead of re-deriving it from the filesystem.

---

## Finding 8 — Same known-runtime-bug workaround documented independently three times, two of which are in the same accumulated context

The `classifyHandoffIfNeeded is not defined` Claude Code runtime bug workaround ("if an agent reports failed with this specific error, spot-check instead of trusting the failure") is written out independently in three places:
- `execute.md:1078` (`<failure_handling>`)
- `execute-waves.md:435` (step 7)
- `execute-sprint.md:167` (`segment_execution`)

`execute-waves.md` is `@`-included directly into `execute.md` at `execute.md:438` — so the first two copies are not just "the same fact documented in different files" but the same fact appearing twice within the *same assembled orchestrator context*, a few hundred lines apart. `execute-sprint.md`'s copy is a separate subagent context, so that one is arguably justified (subagents don't inherit the orchestrator's context) — but the `execute.md` / `execute-waves.md` duplication has no such excuse.

---

## Finding 9 — Two independent, overlapping "is this project initialized" checks at the top of `plan.md`

`plan.md` Step 0 (`plan.md:77-89`) calls `node .rcode/bin/rcode-tools.cjs project-status` and branches on `uninstalled`/`uninitialized`/`stub`/`real`. Separately, `plan.md:44`'s required_reading unconditionally includes `auto-init-guard.md`, whose entire job (`rcode/references/auto-init-guard.md:5-9`) is also detecting whether the project is initialized — via a *different* mechanism (`test -f .rcode/config.yaml`) — and, if not, running its own inline bootstrap flow. These aren't textually identical (one checks a CLI-computed status enum, the other checks raw file existence) and it's possible they're intentionally layered (config.yaml existence as a cheap pre-check, `project-status` as the authoritative one) — but nothing in `plan.md` explains that relationship, and a reader has to reconcile two different init-detection code paths that both fire at the start of the same run to understand which one is actually authoritative.

---

## Finding 10 (minor, not a complexity finding — flagging because it undermines confidence in the file) — duplicate kwarg bug

`plan-spawn-planner.md:351-357`:
```
Task(
  prompt=filled_prompt,
  subagent_type="rcode-planner",
  model="{model}",
  model="{planner_model}",
  description="Plan Phase {phase}"
)
```
`model=` is passed twice with different placeholder names (`{model}` and `{planner_model}`) in the same call. This is dead/leftover text, not functional — pseudocode `Task()` calls aren't executed literally — but it's evidence this 363-line file isn't being proofread end-to-end, which is exactly the kind of thing that accumulates in files this long.

---

## Ranked by estimated context-token savings if addressed

1. **Finding 1** — orphaned `revision-loop.md` + `gate-prompts.md`: **250 lines removed from literally every `/rcode-plan` run** (100% occurrence — the single highest-confidence, highest-total-impact fix; likely candidates for deletion rather than gating, since no flag makes them relevant).
2. **Finding 3** — duplicate required_reading in `--auto` chains: **526 lines/chained-run**, high per-occurrence savings, but scoped to the (common but not universal) auto-advance path.
3. **Finding 2** — rare-mode sections not using the existing `PHASE_GOAL_HAS_UI`-style conditional include: **~245 lines in `plan.md` + ~192 lines in `execute.md` (~437 total)**, and this is the category that would directly pull both files under the AGENTS.md 1000-line cap if extracted.
4. **Finding 4** — subagent-facing `thinking-models-planning.md` loaded into orchestrator context with no forwarding path: **~127 lines/`/rcode-plan` run**.
5. **Finding 6** — dual revert-detection gates in `execute-sprint.md`: ~59 lines combined; savings smaller, but consolidating removes a maintenance/understanding tax, not just tokens.
6. **Finding 8** — triplicated bug-workaround text: small (~10-15 lines recoverable), flagged for hygiene not size.
7. **Finding 9** — dual init-detection paths: no direct line savings (both checks may be intentionally layered), flagged for clarity, not removal.
8. **Finding 5** — `git-preflight.md` / `execution-protocol.md` contradictions: zero line-count impact, but the highest-severity *correctness* finding — a reference doc actively wrong relative to the code that includes it, and stale relative to a fixed issue (#652) referenced elsewhere in the same file family.
9. **Finding 10** — duplicate `model=` kwarg: cosmetic, flagged as a maintenance-quality signal only.

## What was explicitly NOT flagged

`execute-waves.md` (468 lines, unconditionally included into `execute.md`) was read in full and found to be substantially load-bearing: worktree sequential-dispatch locking (to avoid `.git/config.lock` contention), the Windows `EnterWorktree`-branches-from-main workaround, orchestrator-file-protection during worktree merges, and worktree-leak detection are all concrete, evidenced fixes for real failure modes (each cites a specific bug or incident), not speculative edge-case handling. Same verdict for the bulk of `execute-sprint.md`'s deviation rules, checkpoint protocol, and TDD execution steps, and for `execute-regression-gates.md`'s schema-drift gate (real false-positive-verification bug it prevents, even though it's dead weight for non-database projects — see Finding 2's category, not called out separately to avoid double-counting).
