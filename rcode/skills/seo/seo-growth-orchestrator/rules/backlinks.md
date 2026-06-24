# Play 1 — Backlink Acquisition

Goal: earn high volume of relevant, higher-DR backlinks → authority → traffic. Two methods; run both, they compound.

## Method A — Claude backlink research workflow (free, evidence-based)

Two sub-workflows in one run. Prompt: `templates/backlink-research.md`.

**Workflow A — Guest-post finder.** For the user's niche, find sites that accept guest posts / contributions. For each: site, guest-post/contact URL, and a 0–100 quality score (site structure, blog presence, social presence, topical relevance). Output a ranked table + CSV. Then (optional, with Gmail connector) draft — *never auto-send* — a personalized outreach email per opportunity.

**Workflow B — Competitor backlink mining.** For each competitor, list where they earn backlinks; surface the highest-authority, replicable ones for the user's niche, scored and ranked. Output a ranked table + CSV. Logic: if a competitor earned it, the user likely can too.

**Data source:** connect Ahrefs API for accurate DR/traffic if available. If not, tell the model to *drop the Ahrefs connection and score natively from its own analysis* — works, just label scores as estimates (see don'ts). Re-run every 2–4 weeks; backlink profiles drift.

Delegate the heavy mechanics to `backlink-analyzer` / `competitor-analysis` / `claude-seo:seo-backlinks`. This play is the orchestration + outreach layer on top.

## Method B — Automated backlink exchange (optional, paid)

Some platforms (e.g. Arvo, see `tools.md`) run a backlink exchange: you register your URL once; as members publish content, the platform inserts relevant, higher-DR external links pointing to matching member sites — including yours. Effectively hands-off daily backlinks.

Caveats to surface to the user:
- It's a paid third-party tool — present as optional, not required.
- Only relevant + higher-DR placements are worthwhile; confirm the exchange enforces that.
- Link exchanges sit in a gray area of Google's guidelines; keep volume natural and relevance tight. **This is not "buy backlinks"** (a hard don't) but treat it with the same caution — quality and relevance over volume.

## Hand-off
- `outreach-targets.csv` (guest posts: site, URL, score, draft email)
- `competitor-backlinks.csv` (source, target competitor, DR/est, replicability score)
- A prioritized "go-get-these-10-first" shortlist
