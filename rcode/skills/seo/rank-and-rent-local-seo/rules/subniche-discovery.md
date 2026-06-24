# Subniche Discovery

How to find the long-tail subniches inside a chosen niche that big competitors ignore — the winnable wedge.

## Purpose
Everyone ranks for the head term, so nobody wins it cheaply. The money is in high-intent subniches the incumbents never built pages for. This rule finds and ranks them.

## Rules

### Manual mining (do this even if you also use AI)

**Keyword Planner scoop**
Seed the niche in Google Keyword Planner; it returns hundreds of variations (800+ is common). Add a second seed to expand further. Download the full set — it's the raw material for subniche grouping.

**Competitor service menus**
Open the top-ranking sites in big cities (Dallas, Miami, LA, NYC). Their homepage/service nav lists every subniche they bothered to build: flood damage, structural damage, pipe break, plumbing leak, wet insulation, sewage cleanup, etc. They did the grouping work — copy the map, then find what they *skipped*.

**SERP surfaces**
Mine People Also Ask, People Also Search For, and Reddit/forum threads via `serp-analysis`. These reveal how real searchers phrase the problem ("basement flooded what do I do") before they know the industry term.

### AI subniche pass

**Run the consultant prompt**
Use `templates/subniche-research-prompt.md`: "Act as a specialist SEO consultant for a [niche] company. We want to dominate long-tail high-intent searches. Identify 10 subniches ignored by bigger companies." It returns named subniches plus angle ideas (before/after case studies, pairing with ads, etc.).

**Reconcile with the gap analysis**
Feed manual + AI candidates into `content-gap-analysis` to confirm which subniches the ranking competitors have **no** dedicated page for. Those are the targets.

### Select and rank

Pick **5–10** subniches scored on: intent (emergency > research), competitor absence, exact-match-domain availability, and volume (some is fine; high intent beats high volume).

## Examples

### Example: Water damage subniches that surface
```
emergency water extraction · basement flooding cleanup · sump pump failure cleanup
sewage backup / black water cleanup · burst pipe water damage · appliance leak cleanup
ceiling water damage from upstairs leak · plumbing overflow cleanup · wet insulation removal
→ score each, keep top 5–10 with weakest competitor coverage.
```

### Example: Pipeline
```
keyword-research (scoop) ─┐
competitor-analysis ──────┤→ candidate list → content-gap-analysis → ranked 5–10 subniches
AI consultant prompt ─────┘
```

## Anti-Patterns

### Going straight for the head term
**Problem**: Building `water damage restoration <city>` pages — months and money against entrenched incumbents.
**Instead**: Start with a single winnable subniche (`basement flooding cleanup`) and expand by city.

### Boiling the ocean
**Problem**: Targeting all 30 subniches at once → none rank.
**Instead**: One subniche fully built across cities (90/91 rule), then add the next.

## Related
- `niche-selection.md` — must be done first
- `city-matrix-and-pages.md` — turn chosen subniches into pages
- `templates/subniche-research-prompt.md` — the AI prompt

## Changelog
- 2026-06-22: Initial version.
