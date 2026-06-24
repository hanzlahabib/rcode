# Weekly Cadence + 90-Day Plan + the A9/A10 Loop

The factory has a one-shot ramp (build the backlog of pages) and a steady-state loop (keep
discovering + refreshing). Both are encoded here. In AUTO mode the orchestrator can run the
whole week's stages back-to-back across waves; the day labels are the *logical* order, not a
requirement to wait 24h between them.

## Weekly logical order (one full turn of the crank)

| Stage | Agents | Output |
|-------|--------|--------|
| Research | A1, A10 | competitor pages + net-new keyword opportunities |
| Expand | A2 | `keywords.csv` grows |
| Architect | A3 | `clusters.json` updated, new clusters → BACKLOG |
| Brief | A4 | `briefs/<slug>.md` for the wave's editorial clusters |
| Write | A5 (fan-out waves) | `src/content/**.mdx` |
| Interlink | A6 | `link-map.json` ≥10/≥10 per page |
| Programmatic | A7 + A8 | `src/data/seo/*.ts` + routes + schema |
| Publish | gates + merge | clusters → `shipped` (push only on consent) |
| Analyze | A9 | GSC deltas → refresh decaying pages, feed A10 |

## 90-day target (state honestly to the user)

| Month | Cumulative pages | Emphasis |
|-------|------------------|----------|
| 1 | 200 | programmatic location/industry (fast to index) + 20 cornerstone editorial |
| 2 | 500 | + alternative + comparison money pages |
| 3 | 1,000+ | + statistics/template/tool/question pages; refresh cycle steady-state |

Reality check to set with the user: programmatic pages can index in **weeks**; cornerstone
editorial is a **60–180 day** payoff. New content rarely ranks in 30 days. Don't promise
rankings on a 30-day horizon — promise *production throughput* + a compounding curve.

## The recurring loop (A9 + A10 — never "done")

These are cron-shaped. Under `/loop` or `/schedule`, the orchestrator wakes them:

**A10 Opportunity Finder — daily**
1. Semrush `organic_research` diff: keywords competitors now rank for that aren't in `keywords.csv`.
2. Score: `volume × intent_weight × winnability`. Dedupe vs existing keywords.
3. Auto-brief the top N → append clusters to `BACKLOG.md` as `pending`.
4. Next fan-out wave picks them up. No human in the loop unless a money cluster needs sign-off.

**A9 Content Refresh — weekly**
1. Pull `gsc-deltas.csv` (pages with falling position over 28 days) via browser-harness/GSC.
2. For each decayer: diff vs current top-3 SERP. Update stale stats, add new competitors,
   add fresh internal links + examples, bump `dateModified`.
3. Record the diff; re-run gates; mark refreshed.

## Backlog states (the frontier)

`BACKLOG.md` tracks each cluster through: `pending → briefed → written → linked → shipped`
(+ `noindex` for gate failures awaiting enrichment). This is the durable memory that
survives auto-compact — the orchestrator always resumes from the file, never from chat
recollection. Commit it at Phase 0 and after every wave.

## Heartbeat honesty (inherited from autonomous-fix-campaign)

`ScheduleWakeup` only fires under `/loop`. Outside it, saying "I'll wake in 20 min" is a lie.
At Phase 0 confirm the heartbeat path with the user — `/loop`, `/schedule` cron, or manual
ping — and act accordingly. Never go silent while panes are `working`.
