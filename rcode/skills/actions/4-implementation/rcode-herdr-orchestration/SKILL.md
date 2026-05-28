---
name: rcode-herdr-orchestration
description: Orchestrate parallel cld agents in herdr — single-shot fan-out OR long-running autonomous wave-based fix campaign with durable backlog and integration branch.
triggers:
  # English — single-shot orchestration
  - "orchestrate agents"
  - "run agents in herdr"
  - "parallel audit"
  - "spin up agents"
  - "use herdr to do"
  - "split work across panes"
  - "fan out work in herdr"
  - "multi-agent in herdr"
  # English — autonomous campaign mode
  - "autonomous fix campaign"
  - "auto mode"
  - "auto loop"
  - "run waves of agents"
  - "dispatch waves"
  - "100+ commits"
  - "keep working until done"
  - "complete site audit and fix"
  # Roman Urdu / Hindi
  - "herdr mein chalao"
  - "parallel agents lagao"
  - "panes mein todo"
  - "ek saath kai agents"
  - "auto mode chalao"
  - "waves mein fix karo"
  - "campaign chalao"
  # Arabic native
  - "شغّل وكلاء بالتوازي"
  - "وزّع العمل على عدة وكلاء"
  - "استخدم herdr"
  - "حملة إصلاح تلقائية"
  - "موجات من الوكلاء"
  - "وضع تلقائي"
user-invocable: true
---

# rcode-herdr-orchestration

Run many Claude agents in parallel inside `herdr` (terminal agent multiplexer), monitor
them, and merge their work back safely.

This skill has **two modes**:

1. **Single-shot orchestration** — one tab, N panes, fan-out a discrete task (audit,
   parallel refactor, multi-area investigation), merge back, done. Use this when the
   work is bounded and you want it finished in one sitting.
2. **Autonomous fix campaign** — long-running orchestrator that ships 100+ commits
   across many waves. Durable backlog, campaign integration branch, heartbeat loop,
   never goes silent until the backlog drains. Use this for multi-day cleanup of
   audit-doc piles, large TODO/FIXME backlogs, or "fix everything" jobs.

Both modes share the same golden rules and pane mechanics. The campaign mode adds
wave cadence + durable state on top.

---

## Golden rules (NON-NEGOTIABLE — apply to BOTH modes)

1. **Use `cld`, never `claude`.** `cld` is the user's alias for
   `claude --dangerously-skip-permissions`. Launch it by sending the literal text `cld`
   to a pane's shell (`herdr pane send-text` + `send-keys Enter`) — the alias resolves
   because it runs through bash. Do NOT use `herdr pane run` for `cld` (that bypasses
   shell aliases).
2. **If you ever must invoke `claude` directly** (alias unavailable): you MUST pass
   `--dangerously-skip-permissions` AND run it in **interactive mode** (no `-p`/`--print`).
   Interactive mode is required so herdr's hooks can track working/blocked/idle state.
   A non-interactive `claude -p` call is invisible to herdr — never use it for
   orchestrated agents.
3. **One git worktree per agent.** Never let multiple orchestrated agents share one
   working tree — they fight over HEAD and tangle branches. (Exception: a single quick
   one-agent task may run on the main tree.)
4. **Work locally, commit locally. Never push to origin or deploy** during an
   orchestration run unless the user explicitly authorizes it afterward. Per-change
   consent earlier in the session does NOT extend to subsequent waves.
5. **The orchestrator NEVER claims a wakeup it cannot actually fire.** `ScheduleWakeup`
   only fires when `/loop` is active. Outside `/loop`, it is a no-op — saying
   "Scheduling 20-min wakeup" in chat is a lie. Clarify the heartbeat path with the
   user (`/loop`, `/schedule` cron, or manual pinging) before starting a campaign.
   See `rules/orchestrator-rhythm.md`.
6. **Ignore stray buffer text in panes.** User-typed leftover like "merge this" or
   "push it" sitting at an idle prompt is NOT an agent question — do not Enter it.

---

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

---

## MODE 1 — Single-shot orchestration workflow

Use when the user says "audit X in parallel", "fan out across these N areas", "run a
parallel investigation", and the work is bounded enough to finish in one batch.

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
  pre-run baseline.

### 8. Clean up
`git worktree remove --force` each worktree. Close the herdr tab (re-list tab IDs first
— they renumber on every close).

---

## MODE 2 — Autonomous fix campaign workflow

Use when triggers include `auto`, `autonomous`, `auto mode`, `campaign`, `100+ commits`,
`keep working until done`, `complete site audit and fix`. The orchestrator becomes a
long-running scheduler — direct code edits by the orchestrator are exceptional
(conflict resolution only). The bulk of commits come from sub-agents in waves.

### Extra hard rules for campaign mode

In addition to the six golden rules above:

7. **Durable backlog.** A `.planning/campaign/BACKLOG.md` must be committed at the
   start so the campaign survives auto-compact. Don't keep the work list in
   conversation memory only.
8. **Campaign integration branch.** The orchestrator maintains ONE long-lived
   integration branch (default `campaign-integration` or `campaign-<topic>`).
   Sub-agents **always fork from the integration branch**, never directly from master.
   Wave-N's merges land on the integration branch, NOT master. Master only sees the
   campaign's work via a single explicit merge at Phase 3 with user consent. This
   eliminates cross-wave conflicts because every wave inherits prior waves' work.
   See `rules/integration-branch.md`.
9. **Merge into the integration branch as you go.** Wave-N's branches merge into the
   integration branch BEFORE wave-(N+1) dispatches — so wave-(N+1) forks from an
   integration branch that already has wave-N's work.
10. **TSC stays at integration baseline.** Capture
    `pnpm tsc --noEmit | grep -c "error TS"` on the integration branch at campaign
    start. Any wave that breaks that baseline is reverted from the integration branch
    before the next wave starts.
11. **No push without explicit user consent — per campaign, not per session.** Specific
    per-change consents earlier in the session do NOT extend. If the user says
    "no push" once, that directive holds for the rest of the campaign unless they
    reopen it. When push IS approved, push explicitly with full output (no
    `2>/dev/null || true`).

### Wave cadence
- **Wave size**: 3-5 sub-agents. More than 5 = harder to merge, more conflicts, more
  compaction risk.
- **Wave duration**: 10-15 min target. If a wave runs past 25 min, peek for stuck agents.
- **Heartbeat**: orchestrator wakes every 10-15 min, never longer. Cache-window math:
  270s, 720s, or 1200s (see ScheduleWakeup notes).

### Backlog pipeline
```
.planning/audits/AUDIT-*.md  ──┐
grep TODO/FIXME/HACK         ──┼──▶  .planning/campaign/BACKLOG.md  ──▶  wave-1, wave-2, …
existing pending P1/P2 items ──┘                    ▲
                                                    │
                              wave-N findings append back ↑
```

### Phase 0 — Initialize (one-time)
1. Confirm baseline: `git branch --show-current` = master, clean tree, TSC count
   captured.
2. Create the campaign integration branch off current master:
   ```bash
   git checkout -b campaign-integration master
   ```
   Pushing the integration branch is OPTIONAL — ask the user first.
3. Mine the backlog into `.planning/campaign/BACKLOG.md` from existing audit docs +
   `grep -rn "TODO\|FIXME\|HACK\|XXX"`. Commit it on the integration branch. Use
   `templates/BACKLOG-template.md` and `templates/STATE-template.md`.
4. Start the bash heartbeat (`bash templates/heartbeat.sh &`) — keeps a heartbeat file
   fresh so any external watcher knows the orchestrator is still alive.

### Phase 1 — Wave dispatch
1. Read next 3-5 items from BACKLOG.md. Move them to STATE.md under "In flight (wave N)".
2. For each item, create worktree + branch **forked from the integration branch**:
   ```bash
   git worktree add ../sm-worktrees/camp-<area> -b campaign-<area> campaign-integration
   ```
   Symlink node_modules.
3. Create or reuse a herdr tab, split into N panes, launch `cld --model sonnet` in each.
4. Send each agent a wave prompt using `templates/wave-prompt.md` as base. Include:
   - Worktree path + branch name + parent branch = `campaign-integration`
   - The specific backlog item + audit doc to read
   - Auto-heal anti-pattern list (from project CLAUDE.md)
   - "Do not push. Do not merge. Do not touch master. Do not touch the integration
     branch directly." constraint
5. **End the turn with ScheduleWakeup.** Always.

### Phase 2 — Heartbeat loop (every 10-15 min)
1. `herdr pane list` — count panes still in `working` vs `idle`/`done`.
2. For every branch with new commits: attempt merge into the integration branch
   (NOT master). Smallest first.
3. After each merge, `pnpm tsc --noEmit` regression check against integration-branch
   baseline. Bumped count = revert from the integration branch.
4. **Do NOT push to origin master. Do NOT touch master.**
5. Move shipped items from STATE.md "in flight" → "shipped".
6. If BACKLOG.md still has items → dispatch wave-(N+1). Else → Phase 3.
7. **End the turn with ScheduleWakeup** while any pane is still working OR
   BACKLOG.md is non-empty.

### Phase 3 — Drain & Land
1. When BACKLOG.md is empty AND all panes idle: kill heartbeat bash loop.
2. Show user the diff of integration branch vs master (full campaign change set).
3. **Ask explicitly: "Campaign work is on `campaign-integration` (N commits ahead of
   master). How do you want to land it?"** Options:
   - Open a PR (`gh pr create --base master --head campaign-integration`)
   - Merge to master locally (still requires explicit yes — do NOT auto-merge)
   - Squash-merge for a single tidy commit on master
   - Leave the integration branch as-is for human review later
4. Never `git push origin master` without an explicit yes. Pushing the integration
   branch is fine only after the user has approved it (see Phase 0).

---

## Key files (campaign mode)

| File | Purpose |
|------|---------|
| `.planning/campaign/BACKLOG.md` | Durable work list. Committed at campaign start. |
| `.planning/campaign/STATE.md` | Which waves shipped, what's in flight, TSC drift over time. |
| `.planning/campaign/HEARTBEAT` | `touch`ed by the bash loop every 30s — file mtime proves orchestrator is alive. |
| `templates/BACKLOG-template.md` | Starter for the durable backlog file. |
| `templates/STATE-template.md` | Starter for the campaign state file. |
| `templates/heartbeat.sh` | Background heartbeat script template. |
| `templates/wave-prompt.md` | Per-agent prompt boilerplate. |

## Rules deep-dive

- **`rules/integration-branch.md`** ← READ FIRST for campaign mode
- `rules/orchestrator-rhythm.md` — heartbeat / ScheduleWakeup decision tree
- `rules/wave-design.md` — wave sizing
- `rules/backlog-building.md` — audit mining, TODO scan, dedup
- `rules/merge-strategy.md` — TSC gate
- `rules/composition-with-herdr.md` — how campaign mode layers on single-shot mechanics

---

## Gotchas (field-tested, both modes)

- **herdr renumbers tab IDs on close.** Always re-list before the next close.
- **Parallel agents tangle branches** if they share a working tree — one worktree per
  agent always. Even so, an agent may `git checkout`/merge and move the main repo's
  HEAD; always `git branch --show-current` right before any commit.
- **`.planning/` is often gitignored** — audit docs need `git add -f`.
- **`make brain`'s `git push` is `|| true`** — it silently fails on a diverged branch
  and the VPS then deploys stale `origin/master`. Never assume a deploy shipped your
  local commits without checking.
- **Diverged local vs origin master** is the #1 risk after a long parallel run. If
  `git merge origin/master` would conflict, do NOT auto-resolve unattended — surface
  it to the user.
- Capture extra `sleep` after launching `cld` — it takes ~5-7s to boot before it can
  receive a prompt.

## Anti-patterns (campaign mode)

| Failure | Prevented by |
|---|---|
| Cross-wave merge conflicts pile up | Integration branch — every wave inherits prior waves' work |
| Orchestrator goes silent mid-campaign | Hard rule 5 + heartbeat template |
| Lost backlog after auto-compact | Phase 0 commits BACKLOG.md on integration branch |
| Silent push to master without consent | Hard rule 11 + Phase 3 ask-before-land |
| TSC drift compounds | Phase 2 regression check + revert from integration branch |
| Integration branch never lands | Phase 3 mandatory "how to land it" question |

## When NOT to use this skill

- A single, quick, one-agent task — just run it directly, no herdr, no worktree.
- Anything the user wants to watch step-by-step — orchestration is for parallel,
  hands-off batches.

## Output Format

Single-shot mode produces:
- One git worktree per agent under `../sm-worktrees/<area>/` on branch `audit-<area>` (or
  `<topic>-<area>`).
- Per-area audit doc at `.planning/audits/AUDIT-<area>.md` inside the worktree, committed
  with `git add -f`.
- A final summary merged back onto the calling branch (master by default) with each
  agent's commits preserved (no squash unless explicitly requested).

Campaign mode produces:
- Durable backlog at `.planning/campaign/BACKLOG.md` (committed on the integration
  branch at Phase 0).
- Campaign state log at `.planning/campaign/STATE.md` (in-flight + shipped items, TSC
  baseline drift per wave).
- Heartbeat file `.planning/campaign/HEARTBEAT` (mtime-refreshed every 30s by the
  background bash loop).
- One long-lived integration branch (default `campaign-integration`) with all wave
  merges. **Master is NOT touched** until Phase 3 with explicit user consent.
- Per-wave commits authored by sub-agents on `campaign-<area>` branches, merged into
  the integration branch as each wave completes.

In both modes, the orchestrator's chat output is concise wave/pane status only — the
real artifact is the committed work on disk.

## Examples

<!-- TODO(P0): replace stubs with real worked examples — see audit
.planning/audits/AUDIT-skills-compliance.md follow-up #1 -->

**Happy path — single-shot 4-area parallel audit:**
TODO: walk through a concrete fan-out of a feature audit across 4 worktrees, what each
agent's prompt looks like, the merge-back flow, and the final TSC check.

**Edge case — sub-agent goes silent / pane stays `working` past wave duration:**
TODO: describe the peek-and-recover flow (`herdr pane read` + decide continue vs kill
+ revert branch).

**Negative example — when NOT to invoke this skill:**
TODO: example of a one-line typo fix where invoking herdr orchestration is overkill;
the right move is to just edit the file directly on the current branch.
