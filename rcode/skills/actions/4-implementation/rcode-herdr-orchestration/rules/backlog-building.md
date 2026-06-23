# Backlog Building

How to build a durable, prioritized, committed campaign backlog.

## Purpose
The backlog is the campaign's spine. Without a durable file-on-disk backlog, an auto-compact erases the work plan and the campaign collapses. This rule encodes the build + maintain pipeline.

## Rules

### Source priority (highest signal first)

1. **Existing audit docs** at `.planning/audits/AUDIT-*.md` — these are human-curated and already prioritized P1/P2. Most reliable source.
2. **`/audit-fix` skill outputs** if available — Rihal projects often have these pre-generated.
3. **Pending items** in the project's CHANGELOG / ROADMAP / `.planning/state.md`.
4. **Code-level TODOs**: `grep -rn -E "// *(TODO|FIXME|HACK|XXX)[: ]"` in `server/` + `src/` — lowest signal, often stale.
5. **CI failures / open GitHub issues** — only if explicit user request.

### Backlog format

```markdown
# CAMPAIGN BACKLOG
Generated: <ISO timestamp>
Baseline TSC errors: <count>

## Open items
- [ ] **<area>** (P<priority>): <one-line description>. Source: <audit-doc>:<line>
- [ ] **<area>** (P<priority>): …

## In flight (wave N)
- [~] **<area>**: assigned to pane <pane-id>, branch <branch>, started <time>

## Shipped
- [x] **<area>**: commit <sha>, wave <N>, finished <time>
```

### Dedup rules
Before adding an item to the backlog, check:
- Is there an existing master commit covering it? `git log --oneline | grep -i <keyword>`
- Is there an in-flight branch covering it? `git branch | grep -i <keyword>`
- Is it identical to another backlog item with a different file:line? Merge them.

### Maintenance during the campaign
- Every wave merge: move items from "In flight" → "Shipped" with the commit SHA.
- Every wave dispatch: move items from "Open" → "In flight" with pane + branch.
- New findings from a sub-agent's audit phase: append to "Open" with source attribution.
- Item rejected by a wave-agent (out of scope, blocked, etc.): mark `[skip]` with reason — do not delete.

### Commit the backlog
```bash
git add -f .planning/campaign/BACKLOG.md .planning/campaign/STATE.md
git commit -m "chore(campaign): backlog snapshot at wave <N>"
```
The `-f` is required if `.planning/` is gitignored (common in Rihal projects).

### Campaign retro (optional)
At campaign end, append a short `.planning/campaign/RETRO.md` so the *next* campaign on this repo starts smarter:
- Wave sizes actually used (and which felt right vs too big).
- What stalled — areas that needed re-dispatch, conflict hotspots, agents that went silent.
- What merged clean on the first pass.

```bash
git add -f .planning/campaign/RETRO.md
git commit -m "chore(campaign): retro notes for next campaign"
```

**YAGNI tension (be honest)**: this is speculative tooling — a second campaign on the same repo may never happen, and a RETRO doc no one reads is exactly the kind of over-engineering Lens 16 flags. Write it only when a follow-up campaign is genuinely likely; for a one-off campaign, skip it.

## Examples

### Building backlog from audit docs

```bash
{
  echo "# CAMPAIGN BACKLOG"
  echo "Generated: $(date -u +%FT%TZ)"
  echo "Baseline TSC: $(pnpm tsc --noEmit 2>&1 | grep -c 'error TS')"
  echo
  echo "## Open items"
  for f in .planning/audits/AUDIT-*.md; do
    area=$(basename "$f" .md | sed 's/^AUDIT-//')
    pending=$(grep -nE "(⏳|^- \[ \]|^### P[12])" "$f" 2>/dev/null | head -5)
    [ -n "$pending" ] && echo "$pending" | sed "s|^|- [ ] **$area** (from $f) |"
  done
} > .planning/campaign/BACKLOG.md
```

### State transition

```diff
- [ ] **call-update-flow** (P1): add Sentry capture on EventBus handler errors. Source: AUDIT-call-update-flow.md:142
+ [~] **call-update-flow**: assigned to pane w65..-8, branch campaign-call-update-flow, started 2026-05-26T14:32Z
```
later:
```diff
- [~] **call-update-flow**: assigned to pane w65..-8, branch campaign-call-update-flow, started 2026-05-26T14:32Z
+ [x] **call-update-flow**: commit 40b908d9, wave 2, finished 2026-05-26T14:51Z
```

## Anti-Patterns

### Backlog only in conversation memory

**Problem**: Auto-compact wipes it; the next turn can't resume.
**Instead**: File on disk, committed.

### Massive backlog dumped once

**Problem**: A 200-item backlog overwhelms wave selection — orchestrator picks badly because it can't see the whole context.
**Instead**: Build in chunks. Top 20-30 items as "Open"; lower-priority items as a footnote or separate file.

### Mining TODOs from test files

**Problem**: Test TODOs are often "this case is unimplemented" — they're test scaffolding, not real bugs.
**Instead**: `grep ... | grep -v "\.test\.\|\.spec\."` to filter them out.

### Skipping dedup

**Problem**: Same bug fixed 3 times by 3 waves because none knew the others were working on it.
**Instead**: Always check master log + in-flight branches before adding.

## Related
- `wave-design.md` — backlog drives wave composition
- `composition-with-herdr.md` — STATE.md ties to herdr pane labels

## Changelog
- 2026-05-26: Initial.
