## Verdict

**Leaky.** The safety perimeter (git-preflight, no-unauthorized-git-ops) is well-specified and correct. But the worktree/branch lifecycle has concrete, reproducible failure modes that leave users with corrupted planning artifacts or orphaned branches, and the post-phase merge handoff is completely absent from the user-facing flow. New users running the default config get silent worktree creation the reference docs say requires consent.

---

## The user's actual experience

1. User runs `/rcode-execute 3`. `execute.md` creates a `rcode/snapshot/phase-3` git tag and (if `workflow.use_worktrees` is unset, which defaults to `true`) dispatches each sprint via `execute-sprint.md` Pattern A with `isolation="worktree"`.
2. Sprints land on `worktree-agent-*` branches. User sees no branches yet — they're inside Claude Code worktrees.
3. Wave completes. `execute-waves.md` Step 5.5 merges each `worktree-agent-*` branch back into the orchestrator's branch, then runs `git worktree remove` and `git branch -D`.
4. If any single sprint has a merge conflict, the merge is skipped, the backup temp files for STATE.md / ROADMAP.md are deleted (but the restore never ran), and the loop continues to the next sprint. The user is told "resolve manually" with no guidance on which branch to merge from — and that branch was NOT deleted, so it silently accumulates.
5. After execution, user is told: "Next Up: `/rcode-ship`". There is no step explaining they are still on `phase/3-slug`, how to get back to `main`, or that unmerged `worktree-agent-*` branches may exist.
6. User runs `/rcode-ship 3`. It pushes `phase/3-slug` and opens a PR. Whether the `worktree-agent-*` branches were cleanly absorbed is invisible at this point.

---

## Leaks

**🔴 LEAK-1 — `handle_branching` in execute.md abandons the user after branch creation**
`execute.md` lines 449-459: creates `phase/N-slug` via `git checkout -b`, then the entire merge-back story is one comment: `# User handles merging`. There are zero steps, zero links, and no pointer to `/rcode-ship` or any other command. A user who completes a phase on `feature-branch` strategy has no documented path back to `main`. The gap is not a workflow edge case — it is the normal completion path for the most common branching strategy.

**🔴 LEAK-2 — Merge conflict in execute-waves.md Step 5.5 leaks temp files and leaves branches orphaned**
`execute-waves.md` lines 350-357 (conflict block):
```bash
git merge "$WT_BRANCH" --no-edit ... || {
  echo "⚠ Merge conflict from worktree $WT_BRANCH — resolve manually"
  rm -f "$STATE_BACKUP" "$ROADMAP_BACKUP"   # ← backups deleted here
  continue                                   # ← restore never runs
}
# cp "$STATE_BACKUP" .planning/STATE.md     ← only reached on clean merge
```
On conflict: (a) the temp files for STATE.md and ROADMAP.md are deleted without restoring, so `.planning/STATE.md` and `.planning/ROADMAP.md` remain at whatever the conflicted merge left them — potentially corrupted. (b) `git worktree remove` and `git branch -D` for the conflicted branch are after the `continue`, so the `worktree-agent-*` branch is never cleaned up. (c) The user message says "resolve manually" but does not tell them which branch name to `git merge` or where to find it. Running `/rcode-audit worktrees` is not mentioned.

**🟡 LEAK-3 — `no-unauthorized-git-ops.md` bans worktree creation, but execute-sprint.md silently creates worktrees by default**
`no-unauthorized-git-ops.md` explicitly bans `git worktree add` without explicit consent. `execute.md` line 346: `USE_WORKTREES=$(node rcode-tools.cjs config-get workflow.use_worktrees)` — if unset, the value is falsy-undefined which the workflow treats as `true` (no null guard, checked by reading the surrounding logic). Result: every new user who has not set `workflow.use_worktrees: false` in their config gets worktrees silently. The reference doc says to ask; the workflow does not ask. The ban and the default are in direct conflict.

**🟡 LEAK-4 — Phase snapshot tag is overwritten on re-execution without warning**
`execute.md` step `create_phase_snapshot` runs `git tag -f rcode/snapshot/phase-N`. The `-f` force-flag silently replaces any existing tag. If the user runs `/rcode-execute 3` twice (e.g. to add a sprint), the first snapshot — their only local rollback point — is gone. There is no warning, no archiving to `rcode/snapshot/phase-N-attempt-2`, and no mention in the execution banner.

**🟡 LEAK-5 — git-integration.md worktree-isolation example references a non-existent command**
`rcode/references/git-integration.md` (worktree-isolation section) shows `/rcode-do --worktree phase/2-auth` as the invocation example. This flag does not exist on `/rcode-do` (checked: `do.md` has no `--worktree` flag and no routing branch for it). A user reading the reference to understand how worktree-isolation works will try the example command and get a dispatcher mismatch or silent fallback. The reference is the canonical spec for the feature; its example being wrong erodes trust in the entire doc.

**🟢 LEAK-6 — `execute-sprint.md` `<worktree_branch_check>` reset is silent and destructive**
`execute-sprint.md` (Pattern A, `worktree_branch_check`): if `git merge-base HEAD {EXPECTED_BASE}` differs, it runs `git reset --soft {EXPECTED_BASE}`. This discards all commits the executor made that are not on `EXPECTED_BASE` — silently, with no log entry visible to the orchestrator. The comment says "Windows bug fix" but the condition fires whenever the worktree branched from an unexpected point, including legitimate orchestrator activity between sprint dispatch and sprint start. Work is quietly erased with no recovery path.

---

## Strengthenings

1. **Document the merge-back path in execute.md `handle_branching`** — add 3 lines after branch creation: "When the phase is complete, merge this branch back to `{BASE_BRANCH}` manually, or run `/rcode-ship` to push and PR." Link to `git-integration.md#merge-back`.

2. **Fix the conflict handler's temp-file leak in execute-waves.md Step 5.5** — move `rm -f "$STATE_BACKUP" "$ROADMAP_BACKUP"` to after the restore block (or a `trap`), not inside the conflict bail path. After `continue`, emit the branch name and a one-liner: `git merge worktree-agent-<id> && /rcode-audit worktrees --prune`.

3. **Gate `USE_WORKTREES` default on explicit config presence** — change `execute.md` line 346 to: `USE_WORKTREES=$(node rcode-tools.cjs config-get workflow.use_worktrees 2>/dev/null)` and treat an empty/null result as `false`, not `true`. New users without config get no-worktree behavior (predictable) until they opt in. Existing users with `workflow.use_worktrees: true` are unaffected.

4. **Warn before overwriting snapshot tag** — in `create_phase_snapshot`, check `git tag -l rcode/snapshot/phase-N` before the `-f` tag. If it already exists, print: `⚠ Overwriting existing snapshot rcode/snapshot/phase-N (was: $(git rev-parse rcode/snapshot/phase-N))` so the user sees the hash they are losing.

5. **Fix or remove the `/rcode-do --worktree` example in git-integration.md** — either wire the flag or replace the example with a working command (`workflow.use_worktrees: worktree-isolation` in state.json, then `/rcode-execute`).

---

## Kill your darlings

**The `<worktree_branch_check>` reset block in execute-sprint.md should be killed or made opt-in.** It was added as a Windows workaround for a specific merge-base divergence bug. Its effect — silently resetting the executor's entire commit history to an expected base — is more dangerous than the bug it fixes. Any orchestrator activity between sprint dispatch and start (a STATE.md commit, a tag, a preflight write) can trigger it. The "fix" erases real work. Delete the block and instead document the Windows merge-base issue as a known limitation, directing Windows users to set `workflow.use_worktrees: false` until the root cause is addressed in rcode-tools.
