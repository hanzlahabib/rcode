---
name: rcode-autonomous-fix-campaign
description: Wave-based parallel fix campaign — orchestrate N sonnet cld agents in worktrees, merge into an integration branch incrementally, never go silent until the backlog drains.
triggers:
  # English
  - "autonomous fix campaign"
  - "auto mode"
  - "auto loop"
  - "run waves of agents"
  - "dispatch waves"
  - "100+ commits"
  - "keep working until done"
  - "complete site audit and fix"
  - "spawn agents in waves"
  # Roman Urdu / Hindi
  - "auto mode chalao"
  - "waves mein fix karo"
  - "campaign chalao"
  - "agents ki waves bhejo"
  # Arabic native
  - "حملة إصلاح تلقائية"
  - "موجات من الوكلاء"
  - "وضع تلقائي"
user-invocable: true
---

# rcode-autonomous-fix-campaign

Wave-based parallel fix campaign — orchestrate N sonnet `cld` agents in worktrees, merge incrementally into a long-lived integration branch, never go silent until the backlog drains.

## Description

This skill turns the assistant into a long-running **orchestrator** that can ship 100+ commits in one session. Sub-agents are dispatched in **waves** of 3-5 sonnet `cld` instances inside herdr panes, each isolated in its own worktree. As each wave completes, the orchestrator merges into the campaign integration branch, builds the next wave from a durable backlog, and schedules its next heartbeat — **never falling silent while sub-agents are still working**.

## When to Use

**HARD-TRIGGER words — activate this skill any time these appear in the user's request:**
- `herdr` (any context — assume they want herdr orchestration)
- `auto` / `autonomous` / `auto mode` / `auto loop`
- "run in parallel agents", "spawn agents", "orchestrate", "dispatch waves"
- "100+ commits", "don't stop", "keep working until done"
- "run a complete site audit and fix everything"

**Soft-trigger contexts (also activate):**
- A long-running campaign across multiple unrelated code areas
- An audit doc backlog already exists (`.planning/audits/AUDIT-*.md`) and needs to be ground through
- Multi-day TODO/FIXME/HACK cleanup that can be parallelised
- User wants the assistant to act as orchestrator rather than direct implementer

**Do NOT use** for: single-shot fixes, one-area refactors, anything the user wants to watch step-by-step (those are direct work, not campaigns).

## Hard Rules (Non-Negotiable)

1. **This skill ALWAYS composes with `rcode-herdr-orchestration`.** Worktree-per-agent, cld-via-shell-alias, ignore stray buffer text — every herdr golden rule applies here. Read that skill's SKILL.md first if you have not in this session.
2. **The orchestrator NEVER claims a wakeup it cannot actually fire.** `ScheduleWakeup` only fires when `/loop` is active. Outside `/loop`, it is a no-op — saying "Scheduling 20-min wakeup" in chat is a lie. At Phase 0, the orchestrator MUST clarify with the user which heartbeat path is in effect: `/loop`, `/schedule` cron, or manual pinging. If manual: tell the user honestly that nothing auto-fires and they must ping back. See `rules/orchestrator-rhythm.md` for the full decision tree.
3. **Durable backlog.** A `.planning/campaign/BACKLOG.md` (or equivalent) must be committed at the start so the campaign survives auto-compact. Don't keep the work list in conversation memory only.
4. **CAMPAIGN INTEGRATION BRANCH (orchestrator's parent branch).** The orchestrator maintains ONE long-lived integration branch (default name `campaign-integration` or `campaign-<topic>`). Sub-agents **always fork from the integration branch**, never directly from master. Wave-N's merges land on the integration branch, NOT master. Master only sees the campaign's work via a single explicit merge at Phase 3 (with user consent). This eliminates cross-wave conflicts because every wave already inherits prior waves' work, and isolates master from in-progress turbulence. See `rules/integration-branch.md`.
5. **Merge as you go INTO the integration branch.** Wave-N's branches merge into the integration branch BEFORE wave-(N+1) dispatches — so wave-(N+1) forks from an integration branch that already has wave-N's work, eliminating cross-wave conflict explosions. Master stays untouched until Phase 3.
6. **TSC stays at integration baseline.** Capture `pnpm tsc --noEmit | grep -c "error TS"` on the integration branch at campaign start. Any wave that breaks that baseline is reverted from the integration branch before the next wave starts. TSC is gated against the integration branch's baseline, not master's.
7. **NO PUSH WITHOUT EXPLICIT USER CONSENT — PER CAMPAIGN, NOT PER SESSION.** The campaign runs entirely on local branches by default. The orchestrator never runs `git push origin master` and never runs `git push origin <campaign-integration>` either. Specific per-change consents earlier in the session ("push this OAuth fix", "deploy via make brain") do NOT extend to subsequent waves. Ask explicitly before any push. If the user says "no push" once, that directive holds for the rest of the campaign unless they reopen it.
8. **When push IS approved**, push explicitly with full output (no `2>/dev/null || true`). `make brain`-style targets silently swallow auth failures.

## Core Concepts

### Orchestrator Role
The assistant is not "doing the work" — it is **building, merging, and pacing the work others do**. Direct code edits by the orchestrator are exceptional (conflict resolution, single-line urgency). The bulk of commits come from sub-agents.

### Wave Cadence
- **Wave size**: 3-5 sub-agents. More than 5 = harder to merge, more conflicts, more compaction risk.
- **Wave duration**: 10-15 min target. If a wave runs past 25 min, peek for stuck agents.
- **Heartbeat**: orchestrator wakes every 10-15 min, never longer. Cache-window math: 270s, 720s, or 1200s — see `rcode-herdr-orchestration` cache notes.

### Backlog Pipeline
```
.planning/audits/AUDIT-*.md  ──┐
grep TODO/FIXME/HACK         ──┼──▶  .planning/campaign/BACKLOG.md  ──▶  wave-1, wave-2, …
existing pending P1/P2 items ──┘                    ▲
                                                    │
                              wave-N findings append back ↑
```

### Composition with rcode-herdr-orchestration
This skill **delegates** all herdr mechanics to `rcode-herdr-orchestration`:
- Worktree creation, pane splitting, cld launch, prompt sending, status polling, stale-buffer ignoring, AA/UU conflict resolution.

This skill **adds**:
- Wave cadence + backlog management + heartbeat + merge-as-you-go pipeline + integration branch.

## Quick Reference

### Key Commands

| Command | Purpose |
|---------|---------|
| `git worktree add ../sm-worktrees/camp-<area> -b campaign-<area> campaign-integration` | Per-agent isolation, forked from integration branch |
| `pnpm tsc --noEmit \| grep -c "error TS"` | Baseline + drift gate |
| `bash heartbeat.sh &` | Background ping that touches `.planning/campaign/HEARTBEAT` every 30s |
| `ScheduleWakeup delaySeconds=720 prompt=<<autonomous-loop-dynamic>>` | Harness-native heartbeat |
| `herdr pane list --workspace <wid>` | Wave-completion polling |
| `git rev-list --count campaign-integration..campaign-<area>` | Cheap "is this branch worth merging" check |

### Key Files

| File | Purpose |
|------|---------|
| `.planning/campaign/BACKLOG.md` | Durable work list. Committed at campaign start. |
| `.planning/campaign/STATE.md` | Which waves shipped, what's in flight, TSC drift over time. |
| `.planning/campaign/HEARTBEAT` | `touch`ed by the bash loop every 30s — file mtime proves orchestrator is alive. |
| `templates/heartbeat.sh` | Background heartbeat script template (in this skill). |
| `templates/wave-prompt.md` | Per-agent prompt boilerplate (in this skill). |
| `templates/BACKLOG-template.md` | Starter for the durable backlog file. |
| `templates/STATE-template.md` | Starter for the campaign state file. |

## The Campaign Workflow

### Phase 0 — Initialize (one-time)
1. Confirm baseline: `git branch --show-current` = master, clean tree, TSC count captured.
2. **Create the campaign integration branch** off current master:
   ```bash
   git checkout -b campaign-integration master
   # Pushing the integration branch is OPTIONAL — ask the user first.
   # It is not master, so a push doesn't affect production, but respect "no push" preferences.
   ```
   Default name: `campaign-integration`. For named campaigns: `campaign-<topic>` (e.g. `campaign-crm-cleanup`).
   The orchestrator stays on this branch for the entire campaign. Master is never touched until Phase 3.
3. Mine the backlog into `.planning/campaign/BACKLOG.md` from existing audit docs + `grep -rn "TODO\|FIXME\|HACK\|XXX"`. Commit it on the integration branch.
4. Start the bash heartbeat (`bash templates/heartbeat.sh &`) — keeps a heartbeat file fresh so any external watcher knows the orchestrator is still alive.

### Phase 1 — Wave dispatch
1. Read next 3-5 items from BACKLOG.md. Move them to STATE.md under "In flight (wave N)".
2. For each item: create worktree + branch **forked from the integration branch**, NOT master:
   ```bash
   git worktree add ../sm-worktrees/camp-<area> -b campaign-<area> campaign-integration
   ```
   Symlink node_modules.
3. Create or reuse a herdr tab, split into N panes, launch `cld --model sonnet` in each.
4. Send each agent a wave prompt (use `templates/wave-prompt.md` as base) that includes:
   - Worktree path + branch name + **parent branch = `campaign-integration`** (so the agent knows what to merge against if it needs to refresh)
   - The specific backlog item + audit doc to read
   - Auto-heal anti-pattern list (from project CLAUDE.md)
   - "Do not push. Do not merge. Do not touch master. Do not touch the integration branch directly." constraint
5. **End the turn with ScheduleWakeup**. Always.

### Phase 2 — Heartbeat loop (every 10-15 min)
1. `herdr pane list` — count panes still in `working` vs `idle`/`done`.
2. For every branch with new commits: attempt merge **into the integration branch** (NOT master). Smallest first. Conflicts → resolve by superset rule (see `rcode-herdr-orchestration`) or abort and queue for rebase.
3. After each merge, `pnpm tsc --noEmit` regression check **against integration-branch baseline**. Bumped count = revert from the integration branch.
4. **DO NOT push to origin master. DO NOT touch master.** All merges land on the integration branch. Pushing the integration branch is optional and CI-friendly (PR previews) — confirm with user first.
5. Move shipped items from STATE.md "in flight" → "shipped".
6. If BACKLOG.md still has items → dispatch wave-(N+1) (forking from the up-to-date integration branch — so wave-(N+1) inherits all merged work, no cross-wave conflict explosions). Else → Phase 3.
7. **End the turn with ScheduleWakeup.** Always, while any pane is still working OR BACKLOG.md is non-empty.

### Phase 3 — Drain & Land
1. When BACKLOG.md is empty AND all panes are idle: kill heartbeat bash loop.
2. Final commit count + summary table for the user. Diff the integration branch vs master so the user sees the full campaign change set in one place.
3. **Ask explicitly: "Campaign work is on `campaign-integration` (N commits ahead of master). How do you want to land it?"** Options:
   - Open a PR (`gh pr create --base master --head campaign-integration`)
   - Merge to master locally (still requires explicit yes — do NOT auto-merge)
   - Squash-merge for a single tidy commit on master
   - Leave the integration branch as-is for human review later
4. Push policies: even at Phase 3, never `git push origin master` without an explicit yes. Pushing the integration branch is fine only after the user has approved it (see Phase 0).

## File References

- **Campaign integration branch (parent branch pattern)**: `rules/integration-branch.md`  ← READ FIRST
- **Orchestrator rhythm + heartbeat**: `rules/orchestrator-rhythm.md`
- **Wave design + sizing**: `rules/wave-design.md`
- **Backlog building (audit mining, TODO scan, dedup)**: `rules/backlog-building.md`
- **Merge strategy + TSC gate**: `rules/merge-strategy.md`
- **Composition with herdr-orchestration**: `rules/composition-with-herdr.md`

## Integration

- **Required skill**: `rcode-herdr-orchestration` (every campaign uses this — pane mechanics, cld launch, golden rules).
- **Adjacent skills**: `rcode-prove-it` (TSC gate / verification), `rcode-git-flow` (worktree + branching pattern), `rcode-review` (post-campaign sweep).
- **Project CLAUDE.md**: every campaign reads project-level CLAUDE.md auto-heal list and feeds it into each wave prompt verbatim.

## Validation Checklist

- [ ] `rcode-herdr-orchestration` skill rules followed (worktree per agent, cld via alias, no `claude -p`)
- [ ] **Campaign integration branch created at Phase 0** (default `campaign-integration`)
- [ ] **Sub-agents fork from integration branch, not master**
- [ ] **All wave merges land on integration branch, master untouched**
- [ ] `.planning/campaign/BACKLOG.md` committed at start (on the integration branch)
- [ ] Bash heartbeat OR ScheduleWakeup scheduled at end of every turn while sub-agents working
- [ ] TSC baseline captured on integration branch and never exceeded
- [ ] Each wave merged (into integration branch) before next wave dispatched
- [ ] Stray "merge to master" / "push it" buffer text in panes is IGNORED, not Enter'd
- [ ] STATE.md tracks wave history so post-compact orchestrator can resume
- [ ] Phase 3: explicit user question "how do you want to land it?" before any merge to master

## Anti-Patterns (the failure modes this skill prevents)

| Failure | Cause | Prevented by |
|---|---|---|
| **Cross-wave merge conflicts pile up** | **Waves fork from master directly, parallel branches stomp on each other** | **Integration branch (rule 4) — every wave inherits prior waves' work** |
| **Stale content + late conflicts** | **No serial parent branch; each wave snapshots different master tips** | **Single long-lived `campaign-integration` advanced per wave** |
| Orchestrator goes silent mid-campaign | No wakeup scheduled | Hard rule 2 + heartbeat template |
| Lost backlog after auto-compact | Backlog kept in conversation only | Phase 0 commits BACKLOG.md on integration branch |
| Agent goes out-of-scope | Vague prompt | wave-prompt.md scope constraints |
| Silent push to master without consent | Auto-push baked into Phase 2 | Hard rule 7 + Phase 3 ask-before-land question |
| Silent push fails, prod stays behind | `git push \|\| true` in Makefile | Explicit `git push` step in Phase 3 when approved |
| TSC drift compounds | No baseline check per wave | Phase 2 regression check + revert from integration branch |
| Integration branch never lands | No drain phase | Phase 3 mandatory "how to land it" question |
