---
name: rcode-herdr-orchestration
description: Orchestrate parallel cld agents in herdr — fan-out or autonomous wave campaign.
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

## Overview

Run many Claude agents in parallel inside `herdr` (terminal agent multiplexer), monitor
them, and merge their work back safely.

Two modes: **single-shot** (bounded fan-out, one sitting, merge back done) and
**autonomous campaign** (100+ commits across waves with durable backlog and integration
branch). Both share the same golden rules and pane mechanics. See `references.md` for
the full campaign workflow and deep-dive rules.

**Do NOT use for a single quick task** — invoke the work directly without herdr for that.
Orchestration overhead (worktrees, panes, monitoring) only pays off across multiple
independent agents.

---

## Golden rules (NON-NEGOTIABLE — apply to BOTH modes)

1. **Use `cld`, never `claude`.** `cld` is the alias for
   `claude --dangerously-skip-permissions`. Send it via `herdr pane send-text` + `send-keys Enter`
   so the shell alias resolves. Do NOT use `herdr pane run` for `cld`.
2. **If you must invoke `claude` directly** (alias unavailable): pass
   `--dangerously-skip-permissions` AND run in **interactive mode** (no `-p`/`--print`).
   A non-interactive `claude -p` call is invisible to herdr.
3. **One git worktree per agent.** Never share a working tree between orchestrated agents.
4. **Work locally, commit locally. Never push to origin or deploy** during an
   orchestration run unless the user explicitly authorizes it afterward.
5. **The orchestrator NEVER claims a wakeup it cannot fire.** `ScheduleWakeup` only
   fires when `/loop` is active — clarify the heartbeat path with the user first.
6. **Ignore stray buffer text in panes.** Leftover user text at an idle prompt is NOT
   an agent question — do not Enter it.

---

## herdr CLI reference

```bash
herdr workspace list
herdr tab list --workspace <wid>
herdr tab create --workspace <wid> --label "X" --cwd PATH --focus
herdr tab close <tab_id>               # IDs RENUMBER after a close — re-list
herdr pane list --workspace <wid>      # pane_id, label, agent_status
herdr pane split <pane_id> --direction right|down --cwd PATH --no-focus
herdr pane rename <pane_id> "Label"
herdr pane read <pane_id> --source visible|recent --lines N --format text
herdr pane send-text <pane_id> "text"  # types text (no newline)
herdr pane send-keys <pane_id> Enter|C-c|BSpace
```

`agent_status`: `working`, `blocked` (waiting on question/permission), `idle`/`done`, `unknown`.

---

## MODE 1 — Single-shot orchestration

Use when work is bounded and can finish in one batch.

**Steps:**
1. Decide N areas (4 per tab default — 2×2 grid). Each area = one agent = one worktree = one branch.
2. Create worktrees: `git worktree add ../sm-worktrees/$A -b audit-$A master` for each area.
3. Create tab + split panes, one per worktree.
4. Launch `cld` in every pane (`send-text "cld"` + `send-keys Enter`). Sleep 7s after.
5. Send each agent a self-contained prompt with worktree path, branch, and task.
   - Audits: diagnose-only first. Fixes: incremental edits, no rewrites, commit each fix.
6. Monitor: `herdr pane list` every ~2 min. Unblock stuck panes via `send-keys`/`send-text`.
7. Merge back: `git add -f .planning/audits/*.md && git commit` inside each worktree, then
   `git merge <branch> --no-edit` from main repo. Verify `pnpm tsc --noEmit` count unchanged.
8. Cleanup: `git worktree remove --force` each tree. Close herdr tab (re-list IDs first).

---

## MODE 2 — Autonomous campaign (summary)

Use for `100+ commits`, `keep working until done`, `complete site audit and fix`.
Full Phase 0-3 protocol, integration-branch rules, wave cadence, and anti-patterns are
in **`references.md`** (sibling file). Key constraints:

- Maintain one `campaign-integration` branch; sub-agents fork from it, never master.
- Each wave agent reads `.planning/campaign/SHARED.md` first and appends a one-line claim
  (`area — agent N — status`) so same-wave agents don't duplicate work.
- Wave size: 3-5 agents, 10-15 min per wave. ScheduleWakeup ends EVERY turn.
- Phase 3: show user the full diff + ask explicitly how to land (PR / merge / squash / leave).
- Never push to origin master without an explicit yes — per campaign, not per session.

---

## When NOT to use this skill

- A single, quick, one-agent task — just run it directly on the main tree, no herdr.
- Anything the user wants to step through interactively — orchestration is for parallel,
  hands-off batches.

---

## Output Format

**Single-shot:** one worktree per agent on `audit-<area>` branch, per-area audit doc at
`.planning/audits/AUDIT-<area>.md` (committed via `git add -f`), work merged back to
calling branch with commits preserved.

**Campaign:** durable backlog at `.planning/campaign/BACKLOG.md`, state log at
`.planning/campaign/STATE.md`, one long-lived `campaign-integration` branch accumulating
wave merges — master NOT touched until Phase 3 with explicit user consent.

In both modes, orchestrator chat output is concise wave/pane status only.

---

## Examples

**Happy path — single-shot 4-area parallel audit:**
User: "Fan out a security audit across the auth, API, DB, and frontend areas in parallel."
Orchestrator creates 4 worktrees on branches `audit-auth`, `audit-api`, `audit-db`,
`audit-frontend`. Sends each agent: "You are in `../sm-worktrees/auth` on branch
`audit-auth`. Diagnose security issues — report findings to `.planning/audits/AUDIT-auth.md`,
no code changes yet." Monitors until all idle, merges branches, confirms TSC count stable.

**Edge case — sub-agent goes silent past wave duration:**
If `herdr pane list` shows a pane stuck `working` past 25 min: `herdr pane read <id>` —
usually an AskUserQuestion blocking. Pick the safe option via `send-keys`. If still stuck
after another 10 min, `C-c` the pane, note the partial work, revert the branch, and
re-dispatch the item in the next wave.

**Negative example — when NOT to invoke this skill:**
User: "Fix the typo in README line 4." This is a one-line edit. Invoke herdr orchestration
for this is overkill — just edit the file directly on the current branch.
