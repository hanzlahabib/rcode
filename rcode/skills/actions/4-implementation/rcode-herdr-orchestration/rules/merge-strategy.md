# Merge Strategy + TSC Gate

How to merge wave output **into the campaign integration branch** without regressing. Master is never touched during the campaign — see `integration-branch.md`.

## Purpose
Parallel branches stomp on shared files. Merging requires a discipline: smallest first, TSC at every step, abort on first sign of trouble.

## Rules

### Order: smallest first
Sort campaign branches by `git rev-list --count campaign-integration..<branch>` ascending. Merge the smallest one first.
- Validates the merge flow on low-risk content.
- Lets big branches rebase on top of small ones (less conflict per merge step).

### TSC baseline gate
Before any wave:
```bash
TSC_BASELINE=$(pnpm tsc --noEmit 2>&1 | grep -c "error TS")
```
After every merge:
```bash
TSC_NEW=$(pnpm tsc --noEmit 2>&1 | grep -c "error TS")
if [ "$TSC_NEW" -gt "$TSC_BASELINE" ]; then
  echo "Regression on this merge — reverting"
  git reset --hard HEAD~1
fi
```
**Never compound regressions across waves.**

### Per-agent verification gate (beyond compile)
A passing TSC count proves the tree compiles — it does NOT prove the agent did the work it claimed. Before merging a branch, verify **inside the worktree**:

1. **Task/audit doc exists and claims the work.** The agent's `.planning/audits/AUDIT-<area>.md` (or task doc) must exist and describe what it changed. No doc → no merge.
2. **`pnpm test` (or the project test command) passes for the affected area.** Run the scoped suite, not just the type-checker.
3. **Lint is clean or unchanged.** Run the project linter; a new lint regression blocks the merge the same way a TSC regression does.
4. **The diff is non-trivial and on-topic.** `git diff campaign-integration..<branch> --stat` — an empty diff, a whitespace-only diff, or edits outside the agent's area mean the agent didn't actually do the work. Reject and re-dispatch.

Only after all four pass does the branch enter the smallest-first merge order.

### Resolvable provenance
A wave is NOT "verified" until each claimed change has an **openable evidence reference** — a passing test name you can run, a diff hunk you can read, a real `file:line` you can open. A self-declared boolean (`verified: true`, `confidence: 0.94`) is not provenance; it's a claim about provenance.

**If provenance can't resolve, the gate FAILS** — treat the change as unverified and block the merge.

Failure mode to watch for: a verifier that stamps `"verified / 94% confidence"` while its citation layer actually renders `[object Object]` has verified *nothing*. The boolean looks green; the evidence underneath is broken. Always click through to the citation — if the reference doesn't open to the thing it claims, the verification is void regardless of the confidence number.

### Conflict resolution (delegates to herdr-orchestration)
- Content conflicts: read both sides, keep the **more-complete superset side**, remove markers, syntax-check, stage, commit. (See herdr-orchestration rules.)
- AA conflicts (add/add): peek both versions; if nearly identical, keep the canonical owner's version. The "owner" is the branch whose audit doc claimed the feature.
- Unable to resolve safely: `git merge --abort`, mark the branch as `[needs-rebase]` in STATE.md, queue for next wave's resolution pass.

### Push policy
**During the campaign**: NEVER `git push origin campaign-integration`. The orchestrator is on the integration branch, not master.

Pushing the integration branch itself is permitted (it's not master, it's isolated), but ASK ONCE at Phase 0:
```bash
git push -u origin campaign-integration 2>&1 | tail -3
```
Once that question is answered yes, the orchestrator may push the integration branch silently after each wave merge (helpful for PR previews and survival across restarts).

**At Phase 3 only**: ask the user how to land the campaign. Options: PR, local merge to master, squash, or leave. Push master ONLY if they say "yes, merge and push to master" — explicit, never inferred. Never rely on `git push 2>/dev/null || true` patterns (they swallow auth failures and diverge silently).

### Worktree cleanup
After a branch is merged AND pushed:
```bash
git worktree remove --force ../sm-worktrees/camp-<area>
git branch -d campaign-<area>
```
Frees space and keeps `git worktree list` readable.

## Examples

### Single-wave merge sweep

```bash
for B in $(git branch --format="%(refname:short)" | grep "^campaign-"); do
  C=$(git rev-list --count master..$B 2>/dev/null)
  [ "$C" = "0" ] && continue
  echo "=== merging $B ($C commits) ==="
  if git merge "$B" --no-edit 2>&1 | tail -5 | grep -q "CONFLICT"; then
    echo "CONFLICT — aborting and queueing $B for resolution"
    git merge --abort
    echo "$B" >> .planning/campaign/NEEDS-REBASE.md
  else
    NEW=$(pnpm tsc --noEmit 2>&1 | grep -c "error TS")
    if [ "$NEW" -gt "$TSC_BASELINE" ]; then
      echo "TSC regressed ($TSC_BASELINE → $NEW) — reverting $B"
      git reset --hard HEAD~1
    fi
  fi
done
git push origin campaign-integration
```

### Aborted merge handling

When a conflict aborts:
1. The branch stays alive — work isn't lost.
2. The orchestrator's next turn dispatches a single rebase agent specifically for `NEEDS-REBASE.md` items.
3. After rebase, retry merge.

## Anti-Patterns

### Auto-resolving conflicts with `-X theirs` or `-X ours`

**Problem**: Strategy options pick a whole side, discarding the other branch's work without inspection.
**Instead**: Read both sides; superset rule; if uncertain, abort and queue.

### Merging while sub-agents are still active on overlapping files

**Problem**: Sub-agent's later commit invalidates the merge you just made.
**Instead**: Only merge branches whose status is `idle`/`done`. `working` branches stay queued.

### Skipping the TSC check

**Problem**: A type error silently lands on master, next wave forks from broken master, regression compounds.
**Instead**: TSC after every merge. Revert immediately on regression.

### Force-pushing master to "fix" a regression

**Problem**: Destroys local work, can lose unpushed wave output.
**Instead**: `git reset --hard HEAD~1` (no force-push) to undo a bad local merge before pushing.

## Related
- `orchestrator-rhythm.md` — merges happen during heartbeat ticks, not in the middle of dispatch
- `wave-design.md` — wave composition determines conflict surface area
- `composition-with-herdr.md` — herdr conflict-resolution superset rule

## Changelog
- 2026-05-26: Initial.
