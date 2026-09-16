# WF Audit: branch-protection lens

**Lens:** branch-protection  
**Date:** 2026-09-16  
**Auditor:** branch-protection parallel auditor  
**Scope:** All workflows and references that gate or should gate commits to protected branches (`main master develop v2-prototype`)

---

## Verdict

The shared `git-preflight.md` guard was hardened in commits #1014 (`9a8c9281`, `1bc8c756`) and genuinely covers the four workflows it is included by — but the actual commit surface (the executor subagent `execute-sprint.md`) bypasses it entirely, and `autonomous.md` uses a different override flag that makes the guard inconsistent with documented usage. A user running `/rcode-execute` on `main` with `branching_strategy: none` will silently accumulate commits on `main` through the executor — by design — but nothing in the UX warns them that every safety gate has been disarmed.

---

## The user's actual experience

A developer on a monorepo where direct-to-main commits are standard sets `git.branching_strategy: none` and runs `/rcode-execute 3`. They chose `none` because the config docs say "just commit to current branch" with no caveat. The execute orchestrator's pre_flight runs but skips the protected-branch check because `branching_strategy` is `none`. The orchestrator creates worktrees, dispatches `rcode-hanzla` or `rcode-executor` subagents, and the executors — running `execute-sprint.md` — commit sprint tasks directly. When the wave completes, `execute-waves.md` merges all worktree branches back into the current branch, which is `main`. There was no warning, no consent prompt, no gate. The user committed 12 files directly to `main` across three sprints.

Separately: a developer trying to protect against this reads the docs for `/rcode-autonomous` and passes `--on-main` because the docs for `/rcode-execute` say that is the override flag. It has no effect — `autonomous.md` checks for `--allow-main` (a different string). The user has no idea the flag was silently ignored.

---

## Leaks

### L1 — `execute-sprint.md` task-commit protocol has zero protected-branch check (🔴 HIGH)

**File:** `rcode/workflows/execute-sprint.md`, lines 335–395 (`<task_commit>`)  
**Evidence:** The `<task_commit>` preflight (lines 341–345) runs only `git rev-parse --git-dir` to confirm a repo exists, then proceeds to stage and commit. There is no check against `PROTECTED` branches, no read of `branching_strategy`, no `@.rcode/references/git-preflight.md` include. Line 9 includes `@.rcode/references/git-integration.md` (a strategy documentation reference) — not the enforcement reference.  

`execute-sprint.md` is where every executor subagent (`rcode-executor`, `rcode-hanzla`, `rcode-noor`, `rcode-omar`, `rcode-yousef`) commits. The orchestrator's pre_flight check in `execute.md` runs once at startup, but the executor commits happen later in spawned subagents that never inherited that check. This is the most trafficked commit path in the entire framework and it is completely unguarded.

---

### L2 — `autonomous.md` uses `--allow-main`; every other doc uses `--on-main` (🔴 HIGH)

**File:** `rcode/workflows/autonomous.md`, lines 116, 134, 998  
**Evidence:** Line 116: `if echo "$ARGUMENTS" | grep -q '\-\-allow-main'`. Line 134 (user message): "autonomous mode does not run on main/master — use `--allow-main` to override". Commit `9a8c9281` standardized the flag as `--on-main` in `execute.md` and `git-preflight.md`, but `autonomous.md` was not updated.  

A user following execute documentation (or `git-preflight.md`'s documented `--on-main`) and passing `--on-main` to `/rcode-autonomous` gets no error — the flag is silently ignored and `autonomous.md` creates a new branch anyway, treating the user as having NOT authorized main-branch work. This is both a correctness bug (wrong branch created) and a silent contract violation (user granted consent that was discarded).

---

### L3 — `execute-waves.md` merge-back has no protected-branch gate (🟡 MED)

**File:** `rcode/workflows/execute-waves.md`, lines 322–404 (wave cleanup)  
**Evidence:** The merge-back loop does: `git merge "$WT_BRANCH" --no-edit`. There is no check before this that `$CURRENT_BRANCH` is not in the protected list. If the orchestrator was launched on `main` (via `--on-main` or `branching_strategy: none`), all worktree commits land on `main` via this merge. The consent was granted at orchestrator launch, not at merge time — and the worktree branches were themselves committed to by executor subagents that had no knowledge of the consent flag.

The blast radius is large: one `/rcode-execute` invocation can merge N sprints × M tasks of unreviewed commits directly to `main` without a single additional gate.

---

### L4 — Named-persona executors carry no branch-protection logic (🟡 MED)

**Files:** `rcode/agents/rcode-hanzla.md`, `rcode/agents/rcode-noor.md`, `rcode/agents/rcode-omar.md`  
**Evidence:** Each persona loads `@.rcode/references/persona-executor-mode.md`. That reference (line 51–52) says only: "Still never push without explicit authorization (`no-unauthorized-git-ops.md`)." Push is banned. Committing to a protected branch is not mentioned anywhere in `persona-executor-mode.md` or in the agent definitions themselves. The `rcode-executor` agent (generic) includes `@.rcode/references/no-unauthorized-git-ops.md` directly; named personas rely on the indirect reference in `persona-executor-mode.md`, which covers push but not protected-branch commits.

---

### L5 — `ship.md` protected-branch check is advisory, not a hard stop (🟢 LOW)

**File:** `rcode/workflows/ship.md`, line 146  
**Evidence:** "If on `${BASE_BRANCH}`: warn — should be on a feature branch." The verb is `warn`. `git-preflight.md` halts with a banner on the same condition. `ship.md` does not include `@.rcode/references/git-preflight.md`; it has its own inline preflight that uses softer language. A user running `/rcode-ship` from `main` with `branching_strategy: none` will see a warning and still get a PR opened (the guard reads "offer to create a branch now" — it does not stop).

---

### L6 — `git-integration.md` `none` strategy presents main commits as normal with no warning (🟢 LOW)

**File:** `rcode/references/git-integration.md`  
**Evidence:** The `none` strategy entry says "Just commit to current branch" with no callout that this disarms all `git-preflight.md` guards. A developer reading the strategy docs before choosing has no information that `none` is a complete bypass. The `none` strategy documentation should call out that it disarms `git-preflight.md`'s protected-branch check — currently it reads as a neutral "low-overhead" choice with no security trade-off disclosed.

---

## Strengthenings

**S1 — Add `@.rcode/references/git-preflight.md` include to `execute-sprint.md`**  
Insert it in the `<task_commit>` preflight block (before the `git add` stage), exactly as `execute.md` and `code-review-fix.md` do. The executor already runs `git rev-parse --git-dir` here; add the preflight check after that. Executors that are dispatched on worktree branches will always pass (worktrees are never on `main`); executors on `main` with `branching_strategy: none` will pass because the preflight skips them; executors on `main` without `branching_strategy: none` will be caught. Net: zero false positives, the leak closes.

**S2 — Align `autonomous.md` override flag to `--on-main`**  
Replace `--allow-main` with `--on-main` in `autonomous.md` lines 116, 134, and 998. Add an alias check that logs a deprecation notice if `--allow-main` is detected, so existing users get a clear error rather than silent failure. One grep-and-replace; one line of logging added.

**S3 — Add a protected-branch guard to `execute-waves.md` merge-back**  
Before `git merge "$WT_BRANCH" --no-edit`, read `CURRENT_BRANCH` and check it against `$PROTECTED`. If protected AND `branching_strategy` is NOT `none`: print a banner and halt. If `branching_strategy` is `none`, proceed but print a one-line notice "Merging $WT_BRANCH into protected branch $CURRENT_BRANCH (branching_strategy: none)". This creates an audit trail without blocking the legitimate `none` workflow.

**S4 — Add `@.rcode/references/no-unauthorized-git-ops.md` directly to named-persona agent definitions**  
`rcode-hanzla.md`, `rcode-noor.md`, `rcode-omar.md` each need a direct `@.rcode/references/no-unauthorized-git-ops.md` include (not just the indirect path through `persona-executor-mode.md`). `rcode-executor.md` already does this — named personas should match it. This is a one-line addition to each file.

**S5 — Document the security trade-off in `git-integration.md` for `branching_strategy: none`**  
Add a callout under the `none` strategy: "⚠️ Choosing `none` disarms the protected-branch check in `git-preflight.md`. You are responsible for ensuring you are not on `main`/`master` when running workflows that commit." This is documentation-only but closes the "user chose `none` without knowing what it does" gap.

---

## Kill your darlings

**`execute.md`'s inline pre_flight branch check (lines 73–88) is now redundant.**  
The orchestrator does its own inline check AND then includes `@.rcode/references/git-preflight.md` at line 280, which runs the same check again. If S1 lands (executor-level check), the orchestrator-level check becomes a third redundant gate. Two of three are identical; the inline one in `execute.md` pre_flight can be removed once `git-preflight.md` is the single source of truth at the point where commits actually happen. Keeping three gates invites them to drift out of sync — which is how the `--allow-main` vs `--on-main` inconsistency in L2 was born.

The pattern to kill: "orchestrator checks branch at startup, then @-includes the shared check at a different step." The real fix is: the shared check runs at commit time (in the executor), which is the only moment that matters. Orchestrator-level checks are theater — they protect against a condition that cannot lead to a commit (no code has been written yet) while missing the condition that can (executor committing mid-sprint).
