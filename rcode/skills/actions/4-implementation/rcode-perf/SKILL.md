---
name: rcode-perf
internal: true
description: Performance optimisation for the rcode-default stack — Next.js (LCP / TBT / CLS / hydration),.
triggers:
  - "optimize performance"
  - "page is slow"
  - "fps drop"
  - "core web vitals"
  - "query is slow"
  - "lcp regression"
  - "perf budget"
  - "tune this"
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Overview

Performance work without measurement is theatre. This skill enforces measure → identify → fix → re-measure for every claim. Targets are stack-specific because optimisation moves are stack-specific. For Three.js scenes: frame budget. For Postgres: EXPLAIN ANALYZE. For Next.js: Lighthouse + bundle analyzer. Same skill, different tools.

## Workflow

1. **Baseline.** Capture the current number — LCP in ms, fps, query duration, RAM at peak. Quote the source (Lighthouse, Chrome perf trace, EXPLAIN ANALYZE, K8s metrics).
2. **Set the budget.** What does "good enough" look like? E.g. LCP ≤ 2.5s, 60fps with 5% headroom, query p95 < 100ms. If there's no budget, the work has no exit condition.
3. **Identify the bottleneck.** One number, one mechanism. "The page feels slow" isn't a bottleneck — find the specific waterfall step or render loop.
4. **Fix.** One change. Re-measure.
5. **Compare to budget.** Either the change cleared the budget (ship it) or it didn't (next bottleneck).
6. **Stop when the budget is met.** Optimisation past the budget is yak-shaving.

## Stack-specific cheat sheet

### Next.js

- LCP: defer below-the-fold images; preload the LCP image.
- TBT: split the largest Client Component into Server Component + small Client island.
- Hydration: prefer Server Components by default; `'use client'` only where interactivity is required.
- Bundle: `next-bundle-analyzer`; per-route, find the >100KB chunks first.

### Three.js

- Draw calls: instance any geometry rendered >50 times. `InstancedMesh`, not a loop.
- Geometry uploads: don't recreate `BufferGeometry` per frame — mutate the existing attribute.
- Materials: `MeshBasicMaterial` is 5-10× cheaper than `MeshStandardMaterial`. Use it where lighting isn't needed.
- DPR: clamp `renderer.setPixelRatio(Math.min(2, devicePixelRatio))` — 4× DPI on a Retina display kills perf.

### Postgres

- EXPLAIN ANALYZE before touching anything. Look for `Seq Scan` on big tables.
- Index the columns in `WHERE` and `ORDER BY` first. Composite indexes for multi-column filters.
- `pg_stat_statements` for finding slow queries in production.
- For multi-tenant: ensure `tenant_id` is the leading column in indexes.

### Vercel / K8s

- Cold start: prefer regional deploys close to users; use `runtime: 'nodejs'` for heavy SDKs.
- Memory: K8s pod memory limit + Node `--max-old-space-size` should match (don't let one exceed the other).
- Edge functions: keep cold-start work async; first response shouldn't await heavy SDK init.

## Output Format

```
Surface: <route / scene / query / pod>
Budget: <metric> ≤ <target>

Baseline:
  <metric>: <value> (<measurement source>)

Bottleneck:
  <one mechanism>

Fix:
  <one change>

Post-fix:
  <metric>: <value>
  Budget: ✓ met | ✗ still over by <X>

Next bottleneck (if any):
  <description>
```

Do NOT include: optimisation without a baseline; "this should be faster" without measurement; broad rewrites pitched as perf fixes.

## Examples

**Happy path — Next.js LCP** — Baseline LCP 4.2s; budget 2.5s. Bottleneck: hero image (1.8MB JPG, no preload). Fix: convert to AVIF + add `<link rel="preload" as="image">`. Post-fix LCP 2.3s. ✓

**Happy path — Three.js scene** — Baseline 28fps; budget 60fps. Bottleneck: 200 trees rendered with 200 separate draw calls. Fix: `InstancedMesh` with one geometry. Post-fix 62fps. ✓

**Edge case — query plan changed in production** — Same query is fast in staging, slow in prod. EXPLAIN ANALYZE in prod shows a `Seq Scan`; `pg_stat_user_tables` reveals a missing index in prod (drift from staging). Add the index; re-measure.

**Negative — premature optimisation** — "Add Redis caching everywhere just in case." Refuse. No measured baseline; no budget violation. Caching is a footgun (invalidation), don't ship it speculatively.

## Memory Bank Hooks

- **Reads:** `.rcode/memory/project/stack.md` (which layer is in scope)
- **Writes:** when an optimisation establishes a long-lived pattern (e.g. "all hero images use AVIF"), append to `.rcode/memory/project/decisions.md`
