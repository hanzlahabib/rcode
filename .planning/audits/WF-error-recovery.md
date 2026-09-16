# Audit: WF-error-recovery

**Lens:** error-recovery — What happens when a command or workflow fails?
**Date:** 2026-09-16
**Branch:** wf-error-recovery
**Auditor:** rcode parallel workflow auditor (lens: error-recovery)

---

## Verdict

Error recovery in rcode is **surface-deep**. Individual workflow steps have sensible local guards (dirty-tree check, malformed-REVIEW.md block, init-failure early exit), but the cross-boundary signals that actually matter on a crash are either absent, documented in prose only, or contradict each other. The canonical crash path — a hard session drop mid-sprint — relies on EXECUTION-LOG.md as its only signal, yet `/rcode-execute`'s resumption code never reads it: it re-discovers plans by SUMMARY.md presence and silently re-executes tasks already committed. `PRIOR_WAVE_FAILED` is declared but never set or checked. The two reference files that should codify error-recovery policy (`rihal-error-cleanup.md`, `failure-handling-protocol.md`) do not exist.

The system recovers gracefully from polite failures (user cancels, reviewer crashes, UAT missing). It does not recover gracefully from impolite ones (session drop mid-task, agent hangs, wave failure mid-chain).

---

## The user's actual experience

**Scenario A — session drops mid-sprint, user re-runs `/rcode-execute`:**

The executor re-discovers plans. `phase-plan-index` reads SPRINT.md files and checks for SUMMARY.md presence (`has_summary`). Plans that finished before the crash have SUMMARY.md and are skipped. Plans that were *in progress* at crash time have no SUMMARY.md. The executor re-runs them from task 1. If the crash happened after task 4 of 7 committed, tasks 1–4 are committed a second time. The user gets duplicate commits with identical messages. EXECUTION-LOG.md exists and has the real progress signal, but `execute.md` never reads it — only `resume-work.md` reads it, and only when the user explicitly runs `/rcode-resume-work`, which they probably won't know to do.

Source: `execute.md:1100–1103` ("Re-run `/rcode-execute` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan"), `resume-work.md:131–135` (EXECUTION-LOG.md is the real crash signal), `resume-work.md:163–169` (WARNING about duplicate commits on bare re-run with no completed-task detection).

**Scenario B — Wave 1 fails, Wave 2 is queued:**

`PRIOR_WAVE_FAILED=false` is declared at `execute.md:358`. The comment says "set to true by wave failure handler if a prior wave errored." There is no code path in `execute.md` that sets it to `true`, and it is never read anywhere in the file. Wave 2 will execute regardless of whether Wave 1 succeeded. The `failure_handling` block at `execute.md:1092–1098` documents the intent in prose only: "Wave 1 fails → Wave 2 dependents likely fail → user chooses attempt or skip." No code enforces this. The user's Wave 2 agents run on broken Wave 1 outputs.

**Scenario C — User runs `/rcode-undo --phase NN` after a crash:**

`undo.md:164–178` reads `.planning/.phase-manifest.json` to look up commits for the phase. If the crash happened after some commits were made but before the manifest was updated (which happens in `execute.md:885–934`, late in the flow), the manifest is stale. The fallback is `git log | grep -E "\(phase-pattern\)"`. If the executor used non-conforming commit messages (or the user had parallel agents commit in the same wave without conventional-commit format), the grep finds nothing. The user gets "No commits found for phase NN. Nothing to revert." on a phase that has real changes.

**Scenario D — Code review agent crashes mid-execution:**

`execute.md:720–721`: "Code review encountered an error (non-blocking): {error}" → execution proceeds. The user's phase completes without any code review. There is no record of the skipped review in SUMMARY.md or STATE.md. The next time the user runs `/rcode-audit`, nothing flags the gap.

---

## Leaks

**Leak 1: PRIOR_WAVE_FAILED is a dead variable — wave failure is invisible to the chain.**

`execute.md:358` declares `PRIOR_WAVE_FAILED=false`. No line in `execute.md` assigns it `true`. No line reads it as a condition. The variable exists as documentation intent with zero runtime effect. If Wave 1's Task() agents fail, Wave 2 executes anyway. The failure_handling prose at `execute.md:1092–1098` describes the desired behavior but no code implements it.

Evidence: `grep -n "PRIOR_WAVE_FAILED" rcode/workflows/execute.md` returns exactly one hit — the declaration.

**Leak 2: `/rcode-execute` re-run after crash produces duplicate commits.**

`execute.md:1100–1103` describes the resumption path: discover incomplete plans (no SUMMARY.md) and re-run them. `resume-work.md:163–169` explicitly warns that this is wrong: "/rcode-execute re-run fresh does NOT know this [completed task progress] — it has no automatic completed-task detection, so a bare re-run would redo tasks 1-N and risk duplicate commits." EXECUTION-LOG.md exists at the executor level (`execute-sprint.md` writes it), but `execute.md`'s resumption step never reads it. The user must manually invoke `/rcode-resume-work`, read the warning, and pass an explicit task range — a step that is not prompted anywhere on re-run.

Evidence: `resume-work.md:163–169`, `execute.md:1100–1103`, `execute-sprint.md` (EXECUTION-LOG.md write protocol).

**Leak 3: `--no-verify` suppresses all pre-commit hooks in parallel execution.**

`execute-sprint.md:323`: "Use `--no-verify` on all commits. Pre-commit hooks cause build lock contention when multiple agents commit simultaneously." This silently bypasses every pre-commit hook for every task commit during parallel execution. CLAUDE.md (project rules) says "NEVER use `--no-verify` to bypass hooks." The justification (lock contention) is real, but the scope is unconstrained — it applies to every commit type including security/linting hooks, not just cargo lock. The orchestrator validation "once after all agents complete" (`execute-sprint.md:324`) is the only gate, but its scope is not defined.

Evidence: `execute-sprint.md:317–333`, `CLAUDE.md` "Commit Rules" section.

**Leak 4: `record-execution` failure logs a warning but leaves state.json corrupted.**

`execute.md:891–901`: `record-execution` call uses `|| echo "WARN: record-execution failed: $REC"`. The comment explains the old `2>/dev/null || true` caused 35 executed sprints with `executions: 0` in state.json. The fix improved from silent to loud, but the state ledger is still wrong if the call fails — the phase is marked complete in ROADMAP.md but `executions` in state.json is not incremented. Dashboard, `/rcode-progress`, and any metric derived from execution count will undercount. There is no retry and no rollback.

Evidence: `execute.md:894–901`, inline comment "35 executed sprints with `executions: 0`".

**Leak 5: Code review gate error is silently non-blocking and leaves no audit trail.**

`execute.md:720–721`: reviewer agent error is non-blocking. If the `rcode-reviewer` agent crashes or times out, execution proceeds with a log line in the current session only — not in SUMMARY.md, not in STATE.md, not in any file the user or a future audit can read. `/rcode-audit` has no mechanism to detect "this phase ran without code review." The malformed-REVIEW.md gate at `execute.md:758–764` correctly blocks on missing/malformed files, but that gate only fires if the review step started and wrote an incomplete file — a crashed reviewer before file creation bypasses it.

Evidence: `execute.md:720–721`, `execute.md:758–764`, no corresponding field in SUMMARY.md schema for "review skipped".

**Leak 6: The two dedicated error-recovery reference files do not exist.**

`rcode/references/rihal-error-cleanup.md` — **does not exist** (confirmed: `ls rcode/references/` — file absent).
`rcode/references/failure-handling-protocol.md` — **does not exist** (confirmed: same).

These are the canonical locations where error-recovery protocol should live. Their absence means every workflow that needs to describe error handling inlines it inconsistently. `undo.md` has a clean protocol. `execute.md` has partial prose. `resume-work.md` has a strong crash signal (EXECUTION-LOG.md) but no cross-workflow authority. There is no single source of truth for "what does rcode do when X breaks."

Evidence: `ls rcode/references/ | grep -E "error|fail|cleanup|recovery"` returns nothing.

---

## Strengthenings

These are the patterns that work correctly and should be preserved or extended.

**1. undo.md dirty-tree guard is the right shape for all destructive operations.**

`undo.md:291–300`: before any `git revert`, runs `git status --porcelain` and aborts if non-empty. Clear message, clean exit. This pattern should be replicated verbatim in any workflow that mutates git history or working tree. `execute.md` does not run this guard before spawning wave agents; a dirty tree entering an execution wave corrupts agent commits.

**2. Malformed-REVIEW.md defaults to block, not pass.**

`execute.md:758–764`: if REVIEW.md is missing or unparseable, `CRITICAL_COUNT=1` is forced, triggering the block gate. The comment at line 759 explicitly names the failure mode ("a blocking finding. The gate must NEVER silently pass when it can't read the report (#602)"). This is the correct default for any binary gate — unknown state → fail safe, not fail open.

**3. EXECUTION-LOG.md is the right crash signal architecture.**

`resume-work.md:131–135`: EXECUTION-LOG.md, written by the executor per completed task as `{timestamp} | {task-id} | completed | {commit-sha}`, is a durable, parseable, per-task record that survives session drops. It correctly distinguishes "task 4 finished" from "plan finished." The architecture is sound. The problem (Leak 2) is that `/rcode-execute` doesn't read it on re-run — not that the signal is wrong.

**4. Snapshot tag + `--to-snapshot` is the cleanest rollback path.**

`undo.md:134–159`: `rcode/snapshot/phase-NN` git tag created by `execute.md:410` provides a fixed revert point. `--to-snapshot` mode reverts the full `TAG..HEAD` range — no manifest dependency, no commit grep, no manifest accuracy assumption. When the snapshot exists, this is guaranteed-complete rollback. Missing snapshot gives a clear error with alternatives. Clean, adversarial-safe design.

---

## Kill your darlings

These patterns add complexity or false confidence without delivering recovery.

**1. The `failure_handling` prose block in execute.md is not code.**

`execute.md:1092–1098` is a bullet list describing failure scenarios and resolutions. It names `PRIOR_WAVE_FAILED`, dependency chain breaks, and "user chooses attempt or skip." None of this is implemented. It reads like a specification that was never built. A future reader will assume this behavior exists; it doesn't. Delete it or replace it with "see execute-waves.md" once actual recovery code exists.

**2. `PRIOR_WAVE_FAILED` should be removed until it is actually set and read.**

Declaring a variable that is never assigned and never checked is a lie the code tells about itself. It implies a safety net that isn't there. Any auditor, any future developer, any agent reading `execute.md` will believe wave failures are tracked. They aren't. Remove the variable declaration until the wave failure handler actually sets it.

**3. The `resumption` block in execute.md describes a happy path, not crash recovery.**

`execute.md:1100–1103`: "Re-run `/rcode-execute {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan." This is accurate for a graceful restart, not a crash. For a crash, the description is subtly wrong: "resumes from first incomplete plan" means task 1 of that plan, not task N+1. The comment sounds like recovery; it is not. Replace or remove it. The actual crash recovery path lives in `resume-work.md:86–137` and should be referenced from here, not replaced by an incomplete summary.
