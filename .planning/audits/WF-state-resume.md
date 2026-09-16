# Workflow Audit — state-resume lens

**Lens**: STATE + RESUME  
**Files**: `.rcode/state.json`, `rcode/workflows/resume-work.md`, `rcode/bin/rcode-tools.cjs`, `rcode/bin/lib/state-phase-lifecycle.cjs`  
**Commit audited against**: `404ea87a` (resume-work crash-recovery fix)  
**Date**: 2026-09-16

---

## Verdict

**BROKEN in 4 distinct ways, one of which is a safety hazard.**

Commit `404ea87a` fixed real bugs (undefined init fields, wrong glob substitution, vaporware `interrupted_agent_id`) but left the system in a state where: crash detection produces false alarms on legitimately complete phases; the primary crash-recovery signal (EXECUTION-LOG.md) is documented but never written by any executor; `last_intent` — the only field that distinguishes "resuming a plan session" from "resuming a build session" — is absent from the live `state.json` despite `set-intent` being called; and `<quick_resume>` auto-executes on "continue" or "go", bypassing the explicit safeguard that says resume must never start execution. The state file is structurally consistent but carries 109 days of staleness in `last_session` while every other timestamp is current. A user who types "continue" after a planning session can silently launch a build.

---

## The user's actual experience

The user left a session mid-phase. They come back a week later and type "continue".

**What they expect**: The workflow shows them where they were, confirms scope (plan or build?), and waits.

**What actually happens**:

1. `init resume` runs. Before `404ea87a` it silently returned undefined for `roadmap_exists`/`project_exists`/`planning_exists`, so every branch was taken or skipped at random. After the fix this works correctly.

2. The crash-detection loop scans `*-SPRINT.md` files. Phase 20 (`20-dashboard-ux-quick-wins`) has a SPRINT named `20-1-SPRINT.md` and a SUMMARY named `20-01-SUMMARY.md`. The substitution `${plan/SPRINT/SUMMARY}` → `20-1-SUMMARY.md` which does not exist → the loop fires `"Incomplete: .planning/phases/20-dashboard-ux-quick-wins/20-1-SPRINT.md"` on every single resume. Phase 20 is complete. This alarm is always wrong.

3. The loop checks for EXECUTION-LOG.md to determine how far execution got. Zero such files exist anywhere in `.planning/phases/`. The entire crash-recovery path degrades to "No EXECUTION-LOG.md — plan may have crashed before task 1 completed", which is indistinguishable from genuine data loss and from a false alarm.

4. The `.rcode/.continue-here.md` file exists and is 4 months stale (created `2026-05-22`). It says "Phase: Dashboard command runner / Milestone: M2". The project is on M3 / Phase 47. The resume workflow checks for `.rcode/.continue-here.md` — if it finds one it flags "Found mid-plan checkpoint". The user sees a 4-month-old checkpoint as if it is current.

5. The `<quick_resume>` block fires on "continue" or "go". It loads state silently and "Executes immediately without presenting options." The `offer_options` step contains an explicit safeguard: "Never begin implementation from a resume." `<quick_resume>` overrides this safeguard with no gate. If `last_intent` says 'build' the user sees execution start. If `last_intent` is absent (the current live state) the workflow has no scope signal at all and must guess.

6. The `offer_options` step reads `last_intent` from `state read`. The live `state.json` contains no `last_intent` field. `set-intent` is called by `execute.md:43` and `plan.md:110`. Neither of those ran on this project (the most recent execution record predates the `set-intent` feature). So the scope guard is absent, and has been absent the whole time. The resume workflow reads it and gets `undefined`, then presents "Last recorded scope: unknown — tell me plan or build." in the best case. In the worst case it skips the check entirely.

7. `last_session` reads `2026-05-16T06:27:35.015Z`. `updated` reads `2026-09-03T04:35:53.269Z`. The gap is 109 days. Every display that says "Last activity: [date]" shows May 16 while 26 commits landed after that date. The user reads a banner claiming work stopped in May.

---

## Leaks

**L1 — Crash detection produces a guaranteed false positive on Phase 20.**  
`20-1-SPRINT.md` → substitution → `20-1-SUMMARY.md` → not found → alarm. Actual file is `20-01-SUMMARY.md` (zero-padded). The naming mismatch predates `404ea87a`; the fix landed a correct substitution key (`SPRINT→SUMMARY`) but could not account for this zero-padding divergence. Every resume session flags Phase 20 as crashed.

**L2 — EXECUTION-LOG.md is promised but never written.**  
`rcode/agents/rules/executor/execution-flow.md:82` documents the format and contract. Zero files match `find .planning/phases -name "EXECUTION-LOG.md"`. The crash-recovery path in `check_incomplete_work` says "parse last entry" — there is nothing to parse. The recovery is structurally sound but operationally dead.

**L3 — `last_intent` is absent from state.json.**  
`set-intent` was introduced after this project's last execution. The resume workflow reads it for scope enforcement. The field is not there. Every session restart is scopeless. The `<quick_resume>` path is the most dangerous consumer: it auto-executes "immediately without presenting options" with no intent check.

**L4 — `last_session` is updated by the wrong writers.**  
`record-session` (which writes `last_session`) is called by `council.md`, `discuss.md`, `discuss-phase.md`, `execute-sprint.md`, and `chain.md`. It is NOT called by `execute.md` directly — `execute.md` calls `execute-sprint.md` which calls it. If any execution path bypasses `execute-sprint.md`, `last_session` goes stale. Currently: 109 days stale against `updated`, meaning normal state writes updated the file but `record-session` was never called after May 2026.

**L5 — `.continue-here.md` has no TTL and misleads indefinitely.**  
The file is a graceful-pause artifact from May 2026. The workflow treats its presence as a signal that "work was paused here." No expiry, no staleness check, no comparison to current phase or milestone. A file written 4 months ago about a milestone that has since closed surfaces as a live checkpoint.

**L6 — `<quick_resume>` bypasses the safe-resume safeguard.**  
`offer_options` contains an explicit policy: "Never begin implementation from a resume." The `<quick_resume>` block (lines 351–358) runs on "continue" / "go" and says "Execute immediately without presenting options." These two sections are in direct contradiction. One of them wins at runtime — the quick-resume wins, because it fires before `offer_options` is reached.

**L7 — `phases[25].completed` is null despite `status: "complete"`.**  
This is ADR-001 Bug A. `record-execution` appends to `executions[]` but never updates `phases[N].status` or `phases[N].completed`. Phase 47's phase-level record is `status: "complete"` (set manually or by a later operation) but `completed: null`. Any display or downstream check that reads `completed` to determine when a phase finished gets `null`.

---

## Strengthenings

**S1 — `404ea87a` meaningfully fixed the three worst initialization bugs.**  
Before the fix: `init resume` silently returned undefined for `roadmap_exists`, `project_exists`, `planning_exists`. Every state-detection branch fired incorrectly. The PLAN→SUMMARY glob substitution used `PLAN` as the key when files are named `*-SPRINT.md`. The vaporware `$has_interrupted_agent` / `$interrupted_agent_id` variables from `init` were referenced but never set. All three are now correct.

**S2 — The `set-intent` / `last_intent` design is exactly right.**  
The concept of recording the last authorized scope (plan/build/research/audit) and surfacing it on resume is the correct solution to the "resume silently starts a build" failure mode. The implementation in `state-phase-lifecycle.cjs:278` is clean. The gap is adoption: the feature needs to be present in `state.json` before it can guard anything.

**S3 — EXECUTION-LOG.md crash recovery design is sound.**  
The line format (`{timestamp} | {task-id} | completed | {commit-sha}`) is machine-parseable, append-only, and survives a mid-task crash. If the executor wrote these lines, recovery would be exact: "task 4 of 7 completed, resume from task 5." The design requires only that `execute-sprint.md` actually append after each task.

**S4 — The `offer_options` safe-resume policy is well-articulated.**  
The prose at lines 222–237 of `resume-work.md` is explicit: resume restores position, never scope; never begin implementation from a resume; say what the last authorized scope was. This is the right policy. It is undermined only by `<quick_resume>`.

---

## Kill your darlings

**Kill `<quick_resume>`.** Or demote it to a display shortcut, never an execution trigger.

The feature was meant to save keystrokes for returning users. In practice it is a footgun: it fires on the most ambiguous inputs ("continue", "go"), it bypasses the only safeguard that distinguishes "resume where you left off" from "resume and keep building", and it does so when `last_intent` is most likely absent (older projects that predate the field). A user who typed "continue" expecting a status summary can find execution already running.

The right shortcut is: `<quick_resume>` loads and displays state silently, then drops to `offer_options`. It does not execute anything. The one-liner "Continuing from [state]... [action]" should become "Continuing from [state]... here's where things stand." The user presses 1 instead of 2 — the keystrokes saved do not justify a safety bypass.

**Kill `.continue-here.md` presence as a resume signal.** Replace it with a staleness check.

The file's existence is a binary signal with no expiry. A 4-month-old `.continue-here.md` is not a checkpoint — it is a historical artifact. The workflow should compare the file's timestamp against `state.json`'s `updated` field. If `.continue-here.md` is older than the most recent state write, it is stale and should be flagged as such ("Found old checkpoint from [date] — project has moved on since then") or silently ignored, not surfaced as a live resumption point.
