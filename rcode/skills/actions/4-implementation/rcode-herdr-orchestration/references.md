# rcode-herdr-orchestration — References

Overflow content split from SKILL.md per the 200-line budget. Read SKILL.md first.

---

## MODE 2 — Full campaign workflow

### Extra hard rules (rules 7-11, in addition to the 6 golden rules in SKILL.md)

7. **Durable backlog.** Commit `.planning/campaign/BACKLOG.md` at campaign start so the
   campaign survives auto-compact. Don't keep the work list in conversation memory only.
8. **Campaign integration branch.** Maintain ONE long-lived branch (default
   `campaign-integration`). Sub-agents always fork from it — never directly from master.
   Wave-N merges land on the integration branch; master only sees the campaign via a
   single explicit merge at Phase 3. See `rules/integration-branch.md`.
9. **Merge into the integration branch as you go.** Wave-N branches merge into the
   integration branch BEFORE wave-(N+1) dispatches.
10. **TSC stays at integration baseline.** Capture `pnpm tsc --noEmit | grep -c "error TS"`
    at campaign start. Any wave that breaks the baseline is reverted before the next wave.
11. **No push without explicit user consent — per campaign, not per session.** Per-change
    consents earlier in the session do NOT extend.

### Wave cadence

- **Wave size**: 3-5 sub-agents. More than 5 = harder to merge, more conflicts.
- **Wave duration**: 10-15 min target. If a wave runs past 25 min, peek for stuck agents.
- **Heartbeat**: orchestrator wakes every 10-15 min. Cache-window math: 270s, 720s, 1200s.

### Backlog pipeline

```
.planning/audits/AUDIT-*.md  ──┐
grep TODO/FIXME/HACK         ──┼──▶  .planning/campaign/BACKLOG.md  ──▶  wave-1, wave-2, …
existing pending P1/P2 items ──┘                    ▲
                                                    │
                              wave-N findings append back ↑
```

### Phase 0 — Initialize (one-time)

1. Confirm baseline: `git branch --show-current` = master, clean tree, capture TSC count.
2. Create the campaign integration branch:
   ```bash
   git checkout -b campaign-integration master
   ```
3. Mine the backlog into `.planning/campaign/BACKLOG.md` from audit docs +
   `grep -rn "TODO\|FIXME\|HACK\|XXX"`. Commit it on the integration branch.
4. Start the bash heartbeat (`bash templates/heartbeat.sh &`).

### Phase 1 — Wave dispatch

1. Read next 3-5 items from BACKLOG.md → move to STATE.md "In flight (wave N)".
2. Create worktree + branch **forked from integration branch**:
   ```bash
   git worktree add ../sm-worktrees/camp-<area> -b campaign-<area> campaign-integration
   ```
3. Create/reuse herdr tab, split panes, launch `cld --model sonnet` in each.
4. Send each agent a wave prompt (use `templates/wave-prompt.md`):
   - Worktree path + branch + parent = `campaign-integration`
   - Specific backlog item + audit doc reference
   - "Do not push. Do not merge. Do not touch master or the integration branch directly."
5. **End the turn with ScheduleWakeup. Always.**

### Phase 2 — Heartbeat loop (every 10-15 min)

1. `herdr pane list` — count panes in `working` vs `idle`/`done`.
2. For every branch with new commits: merge into the integration branch (NOT master).
3. After each merge: `pnpm tsc --noEmit` regression check. Bumped count = revert from integration.
4. Do NOT push to origin master. Do NOT touch master.
5. Move shipped items from STATE.md "in flight" → "shipped".
6. If BACKLOG.md still has items → dispatch wave-(N+1). Else → Phase 3.
7. **End the turn with ScheduleWakeup** while any pane is working OR BACKLOG.md is non-empty.

### Phase 3 — Drain & Land

1. When BACKLOG.md empty AND all panes idle: kill heartbeat bash loop.
2. Show user the full diff of integration branch vs master.
3. Ask explicitly: "Campaign work is on `campaign-integration` (N commits ahead of
   master). How do you want to land it?" Options:
   - PR: `gh pr create --base master --head campaign-integration`
   - Merge to master locally (explicit yes required)
   - Squash-merge for one tidy commit
   - Leave the integration branch for human review
4. Never `git push origin master` without an explicit yes.

---

## Key files (campaign mode)

| File | Purpose |
|------|---------|
| `.planning/campaign/BACKLOG.md` | Durable work list. Committed at campaign start. |
| `.planning/campaign/STATE.md` | Waves shipped, in-flight, TSC drift per wave. |
| `.planning/campaign/HEARTBEAT` | `touch`ed by bash loop every 30s — mtime proves orchestrator alive. |
| `templates/BACKLOG-template.md` | Starter for the backlog file. |
| `templates/STATE-template.md` | Starter for the state file. |
| `templates/heartbeat.sh` | Background heartbeat script template. |
| `templates/wave-prompt.md` | Per-agent prompt boilerplate. |

---

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
- **Parallel agents tangle branches** if they share a working tree — one worktree per agent always.
- **`.planning/` is often gitignored** — audit docs need `git add -f`.
- **`make brain`'s `git push` is `|| true`** — it silently fails on a diverged branch.
  Never assume a deploy shipped your local commits without checking.
- **Diverged local vs origin master** is the #1 risk after a long parallel run. Do NOT
  auto-resolve conflicts unattended — surface to the user.
- Capture extra `sleep` after launching `cld` — it takes ~5-7s to boot.

---

## Anti-patterns (campaign mode)

| Failure | Prevented by |
|---|---|
| Cross-wave merge conflicts pile up | Integration branch — every wave inherits prior waves' work |
| Orchestrator goes silent mid-campaign | Hard rule 5 + heartbeat template |
| Lost backlog after auto-compact | Phase 0 commits BACKLOG.md on integration branch |
| Silent push to master without consent | Hard rule 11 + Phase 3 ask-before-land |
| TSC drift compounds | Phase 2 regression check + revert from integration branch |
| Integration branch never lands | Phase 3 mandatory "how to land it" question |
