# herdr Wave Mapping — the fan-out engine

This is where the factory **composes with `herdr-orchestration` + `autonomous-fix-campaign`**.
Read both first. This file only adds the *content-specific* mapping: how clusters become
waves, what each pane runs, and how pages merge back.

## The mapping

- **1 cluster = 1 worktree = 1 branch = 1 pane.** Not 1 page per pane (too granular) and
  not 1 wave per page-type (too coarse). A cluster is the right unit: it's self-contained
  (shared keyword theme + internal links stay within it), so two agents on two clusters
  rarely touch the same files.
- **Wave = 3–5 clusters** (herdr 2×2 / 2×3 grid). Per `autonomous-fix-campaign`: merge each
  wave into the **integration branch** (`seo-factory-integration`) before the next forks.
- **Funnel (A1–A4) is NOT a wave.** It runs once, sequentially, before any fan-out — usually
  the orchestrator runs it directly or as a single `cld` agent. Fan-out waves consume its
  `clusters.json` + `briefs/`.

## What a fan-out pane runs (the per-cluster sub-chain)

Each pane gets ONE self-contained prompt that runs A5→A6→A8 (or A7→A6→A8 for programmatic)
for its assigned cluster, in its own worktree:

```
Editorial cluster pane:
  for each spoke in cluster:
    A5 Writer   → src/content/<type>/<slug>.mdx   (requires briefs/<slug>.md)
  A6 Interlinker → link the cluster's pages + ≥10/≥10 to existing pages, update link-map.json
  A8 Schema     → inject JSON-LD via src/lib/jsonld.ts
  commit each page separately; write progress to .planning/seo-factory/AUDIT-<cluster>.md

Programmatic cluster pane:
  A7 → build/extend src/data/seo/<dimension>.ts + the route template
  A6 → wire hub↔spoke + cross-links
  A8 → schema builders for the templated page type
  node --check touched files; commit; record page count
```

Per `feedback_no_build_in_child_agents`: **child panes never run `pnpm build`/`tsc`/`dev`/install** —
they `node --check` only. The orchestrator runs the single central `pnpm tsc --noEmit` after merge.

## Worktree setup (per herdr-orchestration §2)

```bash
cd /home/hanzla/development/teaching/schedule-manager/marketing
mkdir -p ../seo-worktrees
for C in cluster-a cluster-b cluster-c cluster-d; do
  git worktree add "../seo-worktrees/$C" -b "seo-$C" seo-factory-integration
  ln -s "$PWD/node_modules" "../seo-worktrees/$C/node_modules"   # so node --check resolves
done
```

## The orchestrator loop (per wave)

1. Pop 3–5 `pending` clusters from `BACKLOG.md`; mark `in_wave`.
2. Create worktrees + a herdr tab with one pane per cluster (herdr-orchestration §3).
3. Launch `cld` in each pane, send the matching `templates/agent-prompts/` prompt with the
   cluster id + slug list filled in.
4. Heartbeat every 10–15 min (`ScheduleWakeup` under `/loop`, else honest manual ping per
   autonomous-fix-campaign rule 2). **Never silent while panes are `working`.**
5. On all-`idle`: commit each worktree's `AUDIT-<cluster>.md`, merge `seo-$C` →
   `seo-factory-integration` (keep superset side on conflict), mark clusters `linked`.
6. Run Phase-3 gates (`quality-gates.md`) + central `pnpm tsc --noEmit` (must not exceed
   baseline). Passing clusters → `shipped`. Failing pages → `noindex` + re-brief.
7. Next wave forks from the now-updated integration branch.

## Conflict surface (low by design)

Because clusters are file-disjoint (`src/content/<type>/<slug>.mdx` is unique per spoke),
the only shared files are `link-map.json` and `src/data/seo/*.ts`. Mitigation:
- **link-map.json:** each pane writes ONLY its own cluster's keys; merge is a JSON object
  union (orchestrator resolves by keeping both key sets).
- **src/data/seo/*.ts:** assign each programmatic dimension to ONE pane per wave so two panes
  never append to `cities.ts` simultaneously. If unavoidable, serialize those clusters.

## Push / deploy

Per all three skills' hard rules + `feedback_no_push_without_consent`: the entire campaign
runs on local branches. Merge `seo-factory-integration` → `master` and any deploy
(`make brain`) happen **only on explicit user consent**, never mid-wave.
