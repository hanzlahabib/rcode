---
name: rcode-herdr-orchestration
description: Orchestrate parallel Claude agents in herdr — spin up tabs/panes, run cld agents, monitor blocked/idle status, and merge their work back safely.
triggers:
  # English
  - "orchestrate agents"
  - "run agents in herdr"
  - "parallel audit"
  - "spin up agents"
  - "use herdr to do"
  - "split work across panes"
  - "fan out work in herdr"
  - "multi-agent in herdr"
  # Roman Urdu / Hindi
  - "herdr mein chalao"
  - "parallel agents lagao"
  - "panes mein todo"
  - "ek saath kai agents"
  # Arabic native
  - "شغّل وكلاء بالتوازي"
  - "وزّع العمل على عدة وكلاء"
  - "استخدم herdr"
user-invocable: true
---

# rcode-herdr-orchestration

Run many Claude agents in parallel inside `herdr` (terminal agent multiplexer), monitor
them, and merge their work back safely. This skill encodes the full workflow so the user
can say it once and you execute the whole loop autonomously.

## Golden rules (NON-NEGOTIABLE)

1. **Use `cld`, never `claude`.** `cld` is the user's alias for
   `claude --dangerously-skip-permissions`. Launch it by sending the literal text `cld`
   to a pane's shell (`herdr pane send-text` + `send-keys Enter`) — the alias resolves
   because it runs through bash. Do NOT use `herdr pane run` for `cld` (that bypasses
   shell aliases).
2. **If you ever must invoke `claude` directly** (alias unavailable): you MUST pass
   `--dangerously-skip-permissions` (full bypass) AND run it in **interactive mode**
   (no `-p`/`--print`). Interactive mode is required so herdr's hooks can track the
   agent's working/blocked/idle state and orchestrate it. A non-interactive `claude -p`
   call is invisible to herdr orchestration — never use it for orchestrated agents.
3. **Major audit or work → always create a new git worktree per agent.** Never let
   multiple orchestrated agents share one working tree — they fight over git HEAD and
   tangle branches. One worktree + one branch per agent. (Exception: a single quick
   one-agent task may run on the main tree.)
4. **Work locally, commit locally. Never push to origin or deploy** during an
   orchestration run unless the user explicitly says so afterward. Parallel agents
   moving HEAD make remote pushes dangerous mid-run.

## herdr CLI reference

```bash
herdr workspace list                              # list workspaces
herdr tab list --workspace <wid>                  # list tabs
herdr tab create --workspace <wid> --label "X" --cwd PATH --focus
herdr tab close <tab_id>                           # IDs RENUMBER after a close — re-list
herdr pane list --workspace <wid>                  # pane_id, label, agent_status
herdr pane split <pane_id> --direction right|down --cwd PATH --no-focus
herdr pane rename <pane_id> "Label"
herdr pane read <pane_id> --source visible|recent --lines N --format text
herdr pane send-text <pane_id> "text"              # types text (no newline)
herdr pane send-keys <pane_id> Enter|C-c|BSpace    # key names: C-c not ctrl-c
```

`agent_status` values: `working`, `blocked` (waiting on a question/permission),
`idle`/`done` (finished), `unknown`.

## The orchestration workflow

### 1. Plan the split
Decide N work areas (4 per tab is a good default — 2×2 grid). Each area = one agent =
one worktree = one branch.

### 2. Create worktrees (one per agent)
```bash
cd <main-repo>
mkdir -p ../sm-worktrees
for A in area1 area2 area3 area4; do
  git worktree add "../sm-worktrees/$A" -b "audit-$A" master
  ln -s <main-repo>/node_modules "../sm-worktrees/$A/node_modules"   # so tsc/build works
done
```

### 3. Create the tab + panes
```bash
NEW_TAB=$(herdr tab create --workspace <wid> --label "feature audit" --cwd ".../area1" --focus)
# parse root_pane.pane_id from JSON, then split:
herdr pane split <root> --direction right --cwd ".../area2" --no-focus
herdr pane split <root> --direction down  --cwd ".../area3" --no-focus
herdr pane split <p2>   --direction down  --cwd ".../area4" --no-focus
# rename each pane to its area
```

### 4. Launch `cld` in every pane
```bash
for P in <panes>; do
  herdr pane send-text $P "cld"
  herdr pane send-keys $P Enter
  sleep 1
done
sleep 7   # let cld boot
```

### 5. Send each agent its prompt
`herdr pane send-text <pane> "<full self-contained task>"` then `send-keys <pane> Enter`.
Prompt rules:
- Tell the agent it is in an isolated worktree on branch `<name>` — work + commit there.
- For audits: **diagnose-only first** (report bugs/smells/risk ranking, no code).
- For fixes: careful in-place edits, no rewrites, no new abstractions, no empty catches,
  no refactoring oversized files (note as follow-up), commit each fix separately,
  document findings to `.planning/audits/AUDIT-<area>.md`.

### 6. Monitor loop
- Poll `herdr pane list` every ~2 min (use ScheduleWakeup for self-paced loops, or a
  background `until` loop that exits when a pane leaves `working`).
- If a pane is `blocked`: `herdr pane read` it — usually an AskUserQuestion menu. Pick
  the safe/complete option, answer via `send-keys`/`send-text`. The menu's first option
  is highlighted; `Enter` selects it.
- A pane is done when `idle`/`done` with a recap AND its branch commit count stopped
  rising. Verify via `git rev-list --count master..<branch>`.
- Ignore stray user-typed text sitting at idle prompts ("merge this" etc.) — not agent
  questions.

### 7. Merge back (when all agents done)
```bash
# commit any gitignored audit docs inside each worktree first:
cd <worktree> && git add -f .planning/audits/AUDIT-*.md && git commit -m "docs(audit): ..."
# then from main repo on master:
git merge <branch> --no-edit          # for each branch
```
- On conflict: read BOTH sides of each region, keep the **more-complete superset side**,
  remove markers, `node --check` touched `.js`, verify callers stay consistent, commit.
- After all merges: `pnpm tsc --noEmit` — confirm error count did not rise above the
  pre-run baseline. Fix any genuine NEW regression minimally (compare error locations
  against the baseline set, don't just count).

### 8. Clean up
`git worktree remove --force` each worktree. Close the herdr tab (re-list tab IDs first
— they renumber on every close).

## Gotchas (field-tested)

- **herdr renumbers tab IDs on close.** Always re-list before the next close.
- **Parallel agents tangle branches** if they share a working tree — this is why every
  agent gets its own worktree. Even so, an agent may `git checkout`/merge and move the
  main repo's HEAD; always `git branch --show-current` right before any commit.
- **`.planning/` is often gitignored** — audit docs need `git add -f`.
- **`make brain`'s `git push` is `|| true`** — it silently fails on a diverged branch,
  and the VPS then deploys stale `origin/master`. Never assume a deploy shipped your
  local commits without checking.
- **Diverged local vs origin master** is the #1 risk after a long parallel run. If
  `git merge origin/master` would conflict, do NOT auto-resolve unattended — surface it
  to the user.
- Capture extra `sleep` after launching `cld` — it takes ~5-7s to boot before it can
  receive a prompt.

## When NOT to use this skill

- A single, quick, one-agent task — just run it directly, no herdr, no worktree.
- Anything the user wants to watch step-by-step — orchestration is for parallel,
  hands-off batches.

## Related

- `rcode-autonomous-fix-campaign` — long-running campaign mode that composes on top of
  this skill (waves, durable backlog, integration branch, heartbeat).
- `rcode-git-flow` — branching / commit / conflict conventions used inside worktrees.
