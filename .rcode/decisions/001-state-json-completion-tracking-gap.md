---
title: Fix state.json completion tracking gap (dashboard shows done work as unclosed)
date: 2026-07-30
author: Waleed (CTO/Architect persona)
status: Proposed
---

# ADR-001: `state.json` Completion Tracking Gap

## Status

**Proposed** — root cause confirmed via code investigation. Implementation not started (by design — this persona writes ADRs, not code; hand off to Hanzla/Yousef).

## Context

User-reported symptom: rcode's dashboard shows phases/sprints as open ("unclosed") even after the underlying work is written, merged, and shipped. Investigated end-to-end (file:line citations from `.rcode/bin/rcode-tools.cjs`, `rcode/workflows/execute.md`, `cli/install.js`, `server/lib/scanner.js`).

Two independent, compounding bugs found — not one.

### Bug A — `/rcode-execute` never advances phase-level status

`state.json` has two status fields that matter: sprint-level `status` and phase-level `status`. The documented `/rcode-execute` workflow (`rcode/workflows/execute.md`) only reliably advances the *sprint*-level field:

- `update-progress --sprint` (`rcode-tools.cjs:1488-1509`) is called by `execute-sprint.md:500` and `executor/execution-flow.md:105` — this correctly marks individual sprints `completed`.
- The phase-level completion step does **not exist in the call chain**. `execute.md`'s `aggregate_results` step (line 780-796) calls `state record-execution` (`rcode-tools.cjs:1920-1932`), whose handler **only appends a log entry to `state.executions[]`** — it does not touch `phase.status`. The comment directly above that call in `execute.md` claims the CLI "handles: marking phase checkbox `[x]`, updating Progress table, advancing STATE.md" — **that comment is false**; the code doesn't do any of it. This is a documentation/implementation drift, not a design choice.
- The two commands that *do* set phase status to `completed`/`complete` — `set-phase` (`rcode-tools.cjs:1365-1436`) and `complete-phase` (`rcode-tools.cjs:3204-3238`) — are either called from a different workflow (`execute-milestone.md:102`, not `/rcode-execute`) or **never called by any workflow at all** (`complete-phase`, `sprint complete` — confirmed zero callers repo-wide by grep).

**Net effect:** run `/rcode-execute` exactly as documented, and the phase stays `executing` forever. The one command that would fix it (`sync-from-git`, `rcode-tools.cjs:2095-2228`) is a manual escape hatch nobody is told to run.

### Bug B — the one automatic safety net is silently disabled in every worktree

`cli/install.js` (`ensureRcodePreCommitHook`, lines 981-1018) installs a `pre-commit` hook that runs `state sync --from-disk` when `.planning/`/`.rcode/brain/sources.yaml` changes are staged — this is the only auto-reconciliation mechanism in the whole system. It gates installation on:

```
fs.statSync(path.join(target, '.git')).isDirectory()
```

In a **git worktree**, `.git` is a *file* containing a gitdir pointer, not a directory. `isDirectory()` returns `false`, the function returns `{action:'skipped-no-git'}`, and **the hook is never installed**. rcode's own recommended orchestration pattern — worktree-per-agent, documented in `rcode/skills/actions/4-implementation/rcode-herdr-orchestration/` — runs every single agent in exactly the environment where the only safety net doesn't exist. Confirmed: none of that skill's rules files (`integration-branch.md`, `merge-strategy.md`, `orchestrator-rhythm.md`, `wave-design.md`) mention `state.json` reconciliation as a required step, before or after merge.

### Compounding factor — no cross-worktree or post-merge reconciliation at all

- No `post-merge` git hook exists (only `pre-commit`).
- No CI step touches `state.json` (zero matches in `.github/workflows/*.yml`).
- `server/lib/scanner.js:100-207` only reconciles sprint status against local `*-SUMMARY.md` file presence *within the same checkout it's running in* — it never reads git log or other worktrees, so it can't paper over Bug A or B.

### Blast radius

Purely informational — no data loss, no broken builds. But the dashboard *is* the product's stated differentiator (per project memory: "Memory Bank as product moat — structured + visible + versioned + dashboard-rendered context is the primary differentiator"). A dashboard that lies about completion status directly undermines the thing rcode is selling. Trust damage compounds with every stale phase a user notices.

## Decision

Apply the **Boring-tech default** and **Rule of Three** — this is two concrete, small, reversible bugs, not a reason to redesign state architecture. Fix in place:

1. **Fix the worktree-detection bug in `ensureRcodePreCommitHook`** (`cli/install.js:984-987`). Replace `fs.statSync(...).isDirectory()` with `fs.existsSync(path.join(target, '.git'))` (a worktree's `.git` file still satisfies `existsSync`). This alone closes Bug B for every future worktree without touching workflow logic.
2. **Close the Bug A gap in `/rcode-execute`.** When a phase's last sprint reaches `completed` via `update-progress --sprint`, the phase's own `status` must advance too. Concretely: either (a) make `update-progress --sprint` phase-aware — when it detects all sibling sprints for a phase are `completed`, roll the phase to `complete` in the same call, or (b) add an explicit `state complete-phase` call to `execute.md`'s `aggregate_results` step, replacing the currently-false comment with what the code actually does. Prefer (a) — single command, no new call sites to keep in sync, matches existing `update-progress` responsibility.
3. **Fix the misleading comment in `execute.md`** regardless of which of the above ships — a comment claiming behavior the code doesn't have is worse than no comment (per this repo's own Karpathy guidelines: don't ship stale/false comments).
4. **Document the merge step in `rcode-herdr-orchestration`.** Add one line to `rules/merge-strategy.md`: after merging a worktree branch into the integration branch, run `state sync-from-git` in the integration checkout. This is a docs change, not new code, and is the cheapest way to close the residual gap for any worktree merge that happens before item 1 ships everywhere (existing installs won't get the pre-commit fix until they re-run `rcode install`/upgrade).

Do **not**: build a new cross-worktree state daemon, a shared database, or a state-merge algorithm. That's a one-way door (Reversibility test fails) for a problem two small patches solve. Revisit only if items 1-4 ship and the symptom recurs.

## Consequences

**Positive:**
- Every new install gets automatic state reconciliation in worktrees, not just the main checkout (item 1).
- `/rcode-execute` run exactly as documented actually produces a `complete` phase — no manual escape hatch required for the common case (item 2).
- Removes a false comment that actively misleads whoever next reads `execute.md` (item 3).

**Negative / costs:**
- Item 1 requires a version bump + users re-running install/upgrade to get the hook fix in existing projects; it does not retroactively fix already-broken installs.
- Item 2 touches `rcode-tools.cjs`'s `update-progress` handler, which is a hot path called by every sprint completion — needs a regression test (per this repo's testing rules) to confirm it doesn't fire early (partial sprint completion must not roll the phase forward).
- Does not fix worktrees created *before* the install.js fix ships — those still need one manual `state sync-from-git` per worktree (this is what closed the immediate siraaj2 case).

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Patch the two concrete bugs (chosen)** | Small, reversible, boring, ships fast | Doesn't prevent a *third* undiscovered gap in the same class | Chosen — Rule of Three not yet met (2 known instances) |
| Add a `post-merge` hook that force-runs `sync-from-git` | Fully automatic, closes the merge-time gap without relying on docs | Every worktree merge pays a git-log-scan cost; hook maintenance burden; still doesn't fix Bug A | Deferred — revisit if item 4 (docs-only) proves insufficient in practice |
| Redesign state.json as a shared/synced store across worktrees | Structurally eliminates the whole class of drift | One-way door, multi-week effort, new failure modes (merge conflicts on a JSON file, race conditions) for a problem that's informational-only blast radius | Rejected — fails Reversibility test and Blast-radius cap for the actual severity |
| Make dashboard reconcile against git log live, ignore state.json's raw status entirely | No workflow changes needed | Scanner already does this for sprints when a phase directory exists (`scanner.js:100-207`) but not phases; extending it papers over the root cause instead of fixing why state.json drifts in the first place, and doesn't help the CLI/state consumers outside the dashboard | Rejected — treats the symptom, not the cause |

## Handoff

Implementation goes to **Yousef** (CLI/state internals — items 1, 2, 3 touch `cli/install.js` and `rcode-tools.cjs`) and **Hanzla** (docs update to `rules/merge-strategy.md`, item 4). Recommend filing as a single GitHub issue with the four items as a checklist (per this project's tickets-first convention) before either starts — this repo's rule is: file the ticket, then work.
