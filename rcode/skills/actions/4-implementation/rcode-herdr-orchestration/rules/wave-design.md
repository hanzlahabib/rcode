# Wave Design

How to size, split, and sequence campaign waves.

## Purpose
A campaign with too few agents underuses parallelism; too many causes merge conflicts and stalls. This rule encodes the sizing + sequencing that worked across long sessions.

## Rules

### Wave size
- **Default: 4 agents per wave.** 2x2 herdr grid, easy to monitor visually.
- **Minimum: 3.** Below 3 the orchestrator overhead isn't justified — just do the work directly.
- **Maximum: 5.** Above 5 the merge stage becomes painful and TSC regressions compound across simultaneous changes.
- **Sequential or concurrent waves?** Concurrent only if you have >8 distinct unrelated areas AND the merge bookkeeping is automated. Default is sequential: dispatch wave → merge → dispatch wave.

### Shared coordination doc
Every wave agent reads `.planning/campaign/SHARED.md` **before starting**, and appends a one-line claim the moment it picks up an area:
```
<area> — agent <N> — <status>
```
e.g. `crm-pipeline — agent 2 — claimed`. This stops two parallel agents in the same wave from silently grabbing the same area or file domain. The orchestrator seeds the file at wave dispatch; agents only append, never rewrite. Statuses progress `claimed` → `working` → `done` (or `skipped: <reason>`). If an agent finds its target area already claimed, it stops and reports back instead of duplicating work.

### Wave scope rules
Each agent in a wave must:
- Own a **distinct audit area** (no two agents touching the same file domain).
- Have a **clear stop signal** — fix 3-5 items, then return. No "keep going until I say stop".
- Be **diagnose-then-fix**, not "rewrite this area".

Cross-agent overlap risks (use these to vet wave composition):

| If wave includes both… | Conflict risk | Mitigation |
|---|---|---|
| `lead-types` + `call-update-flow` | Both touch `leadService.js`/`callService.js` | Run sequentially, not concurrent |
| `crm-pipeline` + `deals-pipeline-forecast` | Both touch deal stage logic | Split: one schema, one UI |
| `email-system` + `email-sequences` | Both touch templating | Run sequentially |
| `oauth-callbacks` + `integrations-developer` | Both touch OAuth handlers | Different providers per agent |

### Item picking heuristics

For each backlog item, score before assigning to a wave:

| Criterion | Good for wave | Bad for wave |
|---|---|---|
| Blast radius | 1-5 files | 20+ files |
| Has Prisma schema change | OK with migration | Not OK without migration |
| Cross-cuts auth/RBAC | Solo agent | Avoid |
| Touches WebSocket/realtime | Solo agent | Avoid |
| Pure UI/CSS | Great parallel target | — |
| Pure backend logic in one service | Great parallel target | — |

### Wave duration
- Target: 10-15 min per wave.
- Past 25 min: peek at all panes, identify stuck agents, decide kill-or-wait.
- Hard stop: 45 min. If a wave hasn't produced commits in 45 min, something is wrong — abort and re-dispatch.

## Examples

### Good wave-1 composition (from real session)
```
camp-crm-pipeline      ← AUDIT-CRM-pipeline P1/P2
camp-crm-reporting     ← AUDIT-CRM-reporting P1/P2
camp-deals-forecast    ← AUDIT-deals-pipeline-forecast P1
camp-crm-activity      ← AUDIT-CRM-activity P1
```
Distinct services, distinct schema tables, no overlap.

### Bad wave composition
```
camp-leads-A           ← leadService refactor
camp-leads-B           ← leadService bug fixes
camp-leads-C           ← leadService new feature
camp-leads-D           ← leadService perf
```
All four touch `leadService.js` — merge will be a conflict bloodbath.

### Phased waves (when items naturally depend on each other)
```
Wave 1: schema additions (lead-types schema, conversation schema)
Wave 2: backend wiring on top of Wave 1's schema
Wave 3: UI on top of Wave 2's API
```
Each phase merges before the next dispatches.

## Anti-Patterns

### Dispatching all backlog items at once

**Problem**: 17 audit docs × 4 items = 68 simultaneous agents. Herdr can't manage that; merge stage becomes O(N²).
**Instead**: 4 agents at a time, 17 waves over the campaign.

### Reusing a worktree across waves

**Problem**: Worktree state lingers — uncommitted files, stale `node_modules` symlink, half-merged branch.
**Instead**: Fresh worktree per wave-agent. Tear down after merge.

### Wave with no audit doc backing

**Problem**: Agent invents work that wasn't asked for; commits get rejected.
**Instead**: Every wave-agent prompt must reference a specific audit doc with specific item numbers.

## Related
- `backlog-building.md` — what feeds wave selection
- `merge-strategy.md` — what happens after a wave completes
- `composition-with-herdr.md` — herdr 2x2 pane grid

## Changelog
- 2026-05-26: Initial.
