# Workflow: audit-worktrees

<purpose>
Scan for orphaned executor worktrees and branches left behind by rcode-execute.
Reports each orphan with its age, merge status, and safe-to-delete verdict.
With --prune, deletes confirmed-safe orphans automatically.
</purpose>

## Step 0 — Parse arguments

- `--prune` → `PRUNE=true` — delete safe orphans after reporting
- `--help` or `-h` → print usage and stop:
  ```
  /rcode-audit worktrees [--prune]
  ```

## Step 1 — Scan for orphaned worktrees

Executor agents use branches prefixed `worktree-agent-`. Find all such branches
and worktrees still present in the repo:

```bash
# Active worktrees with executor branches
git worktree list --porcelain \
  | awk 'BEGIN{p=""} /^worktree /{p=$2} /^branch /{if($2~/refs\/heads\/worktree-agent-/) print p"\t"$2}' \
  > /tmp/rcode-active-wts.txt

# Local branches with executor prefix (includes detached/removed worktrees)
git branch --list 'worktree-agent-*' --format='%(refname:short)' \
  > /tmp/rcode-orphan-br.txt

ACTIVE_WT_COUNT=$(wc -l < /tmp/rcode-active-wts.txt)
ORPHAN_BR_COUNT=$(wc -l < /tmp/rcode-orphan-br.txt)
TOTAL=$((ACTIVE_WT_COUNT + ORPHAN_BR_COUNT))
```

If `TOTAL` is 0:

```
✓ No orphaned executor worktrees or branches found.
```

Stop.

## Step 2 — For each orphan, gather intelligence

For each entry (worktree or branch), run:

```bash
# Is it merged into the current branch?
MERGED=$(git branch --merged HEAD --list '<branch>' 2>/dev/null | grep -c '<branch>')

# When was the last commit on this branch?
LAST_COMMIT=$(git log -1 --format="%ar %s" '<branch>' 2>/dev/null || echo "unknown")

# How many commits does it have that are NOT on HEAD?
AHEAD=$(git rev-list HEAD..'<branch>' --count 2>/dev/null || echo "?")
```

Build a report table:

```
rcode ► WORKTREE AUDIT
══════════════════════════════════════════════════════════

Orphaned executor artifacts: {TOTAL}

  Branch                          Merged  Ahead  Last commit
  ──────────────────────────────  ──────  ─────  ──────────────────────
  worktree-agent-abc123           YES     0      3 days ago  feat: add auth
  worktree-agent-def456           NO      2      1 hour ago  wip: migrations
  ...

Active worktrees still pointing to executor branches:
  .claude/worktrees/agent-abc123  →  worktree-agent-abc123
  ...
```

## Step 3 — Classify each orphan

For each branch/worktree:

- **SAFE** → `MERGED=YES` AND `AHEAD=0` — all commits are on HEAD, nothing to lose
- **STALE** → `MERGED=YES` AND `AHEAD>0` — commits are ahead but branch is in merged list (rebased/squash-merged); verify before deleting
- **UNMERGED** → `MERGED=NO` — DO NOT auto-delete; show explicitly and warn

Print classification next to each entry.

## Step 4 — Report summary

```
Summary:
  SAFE to delete:     {N}  (merged, 0 ahead)
  STALE (check first): {N}  (merged but ahead — may be rebase/squash)
  UNMERGED (keep):    {N}  (not merged — manual review required)

  To prune SAFE orphans: /rcode-audit worktrees --prune
  To inspect UNMERGED:   git log HEAD..<branch> --oneline
```

If `PRUNE=false`, stop here.

## Step 5 — Prune (only when --prune passed)

Delete SAFE entries only. Never touch STALE or UNMERGED.

**Confirm with the user before deleting anything.** Print the SAFE list with its
merge evidence and ask for an explicit go-ahead. `--prune` is a request to prune,
not standing authorization — a merged branch is still the only record that a piece
of work happened, and deleting it silently is unrecoverable.

If the user declines (or does not answer), do NOT delete. Instead flag each SAFE
branch so a future audit can tell "already merged, safe to ignore" from "needs
review", and remove only the worktree:

```bash
git tag merged/<branch> '<branch>' 2>/dev/null && echo "  ✓ flagged: merged/<branch>"
```

Only after an explicit yes, for each SAFE branch:

```bash
# Remove the worktree if it still exists
WT_PATH=$(awk -F'\t' '$2=="refs/heads/<branch>"{print $1}' /tmp/rcode-active-wts.txt)
if [ -n "$WT_PATH" ] && [ -d "$WT_PATH" ]; then
  git worktree remove "$WT_PATH" --force 2>/dev/null \
    && echo "  ✓ removed worktree: $WT_PATH" \
    || echo "  ⚠ could not remove worktree: $WT_PATH"
fi

# Delete the branch
git branch -D '<branch>' 2>/dev/null \
  && echo "  ✓ deleted branch: <branch>" \
  || echo "  ⚠ could not delete branch: <branch>"
```

After all deletes, re-run Step 1 scan and confirm `TOTAL=0` for SAFE entries.

Print final report:

```
Pruned: {N} safe orphans removed
Kept:   {N} unmerged branches (manual review required)

✓ Worktree cleanup complete
```

## Step 6 — Post-audit health note

If any UNMERGED branches remain, print:

```
⚠ {N} unmerged executor branch(es) still present.
  These have commits NOT on your current branch.
  Inspect before deleting:

  git log HEAD..worktree-agent-<id> --oneline
  git show worktree-agent-<id>:<file>   # inspect specific file

  To delete after manual review:
  git worktree remove .claude/worktrees/<id> --force
  git branch -D worktree-agent-<id>
```

## Success Criteria

- [ ] All `worktree-agent-*` branches and worktrees found and reported
- [ ] Each classified as SAFE / STALE / UNMERGED based on actual merge status
- [ ] `--prune` deletes only SAFE entries, never UNMERGED
- [ ] No branch deleted without explicit user confirmation; declined branches get a `merged/*` tag instead
- [ ] Post-prune confirmation scan verifies cleanup succeeded
- [ ] Non-executor worktrees (feature branches, manual worktrees) are never touched

## On Error

- `git worktree list` fails → print `git not available or not a repo` and stop
- `git branch -D` fails on a branch → skip it, note it in the report, continue

## Next Up

- `/rcode-status` — check overall project state after cleanup
- `/rcode-do` — continue with your current work
