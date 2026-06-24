# Subniche Research Prompt

Drop-in AI prompt to surface ignored, high-intent subniches for a chosen local-service niche. Pair its output with `content-gap-analysis` to confirm competitor absence.

## Prompt

```
Act as a specialist SEO consultant for a {NICHE} company operating in the US.

Goal: dominate long-tail, high-intent local searches that the big national
and franchise competitors ignore.

Identify 10 overlooked subniches within {NICHE} that:
- have clear emergency or high-intent demand,
- are NOT covered by dedicated pages on the top-ranking competitors,
- can realistically rank with focused long-tail content + local pages.

For each subniche return:
1. Subniche name and the primary keyword(s) a searcher would use (incl. "near me"/"emergency" variants)
2. Why bigger companies ignore it
3. The buyer intent / urgency level (emergency | urgent | research)
4. One content/conversion angle (e.g. before/after case study, pair with Google Ads)
5. Rough difficulty to rank (low | medium | high)

Return as a table, ordered by best opportunity (high intent + low competition) first.
```

## Variables
- `{NICHE}` — the chosen niche from `niche-selection.md` (e.g. "water damage restoration").

## After running
1. Export the 10 subniches.
2. Run `content-gap-analysis` against the top 3–5 ranking competitors to confirm none have a dedicated page.
3. Keep the 5–10 with the weakest competitor coverage → feed into `city-matrix-and-pages.md`.
