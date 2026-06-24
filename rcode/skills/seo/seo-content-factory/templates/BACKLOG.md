# SEO Content Factory — BACKLOG (durable frontier)
# Commit at Phase 0 and after every wave. The orchestrator resumes from THIS file,
# never from chat memory. States: pending → briefed → written → linked → shipped (+ noindex).

## Campaign config
- target_site: /home/hanzla/development/teaching/schedule-manager/marketing
- integration_branch: seo-factory-integration
- tsc_baseline: <fill: `pnpm tsc --noEmit | grep -c "error TS"`>
- push_policy: LOCAL ONLY — no push/deploy without explicit user consent
- heartbeat: <fill: /loop | /schedule cron | manual ping>
- seeds: ["lead generation software", "cold email", "ai cold calling", "sales sequences"]
- competitors: ["apollo.io", "instantly.ai", "lemlist.com", "smartlead.ai"]

## Clusters
| cluster_id | hub | page_kind | spokes | state | wave | notes |
|---|---|---|---|---|---|---|
| alt-apollo | alternatives | editorial | 1 | pending | – | money page |
| ind-roofers | lead-generation | editorial | 1 | pending | – | |
| loc-grid | lead-generation×city | programmatic | 2000 | pending | – | 100 cities × 20 services |
| stat-coldemail | statistics | editorial | 1 | pending | – | linkable asset |

## Wave log
<!-- append: wave N | clusters | merged SHA | pages shipped | tsc delta -->
