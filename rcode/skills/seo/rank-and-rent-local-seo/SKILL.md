---
name: rank-and-rent-local-seo
description: Playbook for building rank-and-rent "digital real estate" — pick a high-CPC local service niche, mine the long-tail subniches bigger companies ignore, mass-produce subniche×city pages, rank them, and monetize the calls/leads. Orchestrates the existing SEO skill set rather than re-doing it. Use when the user wants to start a local lead-gen / rank-and-rent site, find an SEO money niche, or systematically build out a local service vertical.
---

# Rank-and-Rent Local SEO

**Build it once, rank it, rent the leads. A repeatable system for turning a high-value local service niche into recurring income — without paying per click.**

## Description
This is a *strategy* skill (an SOP), not a new tool. The mechanics — keyword research, competitor analysis, content generation, programmatic pages, schema, internal linking — already live in dedicated skills. This skill encodes the **business playbook** that decides *which niche, which keywords, which pages, and how to get paid*, then chains the existing skills to execute it.

The core insight from the field: don't fight every agency for the head term (`water damage restoration <city>`). Go after the **middle and long-tail subniches** the big players ignore (`basement flooding cleanup`, `sewage backup cleanup`, `burst pipe water damage`), multiplied across many cities. High CPC on the head term proves the lead is valuable; the long-tail is where it's actually winnable.

## When to Use
- The user wants to start a rank-and-rent / "digital real estate" site or local lead-gen business.
- The user is evaluating an SEO money niche (water damage, mold, roofing, towing, locksmith, personal injury, etc.).
- The user wants to systematically build out a local service vertical across many cities.
- The user asks "what subniches should I target" or "how do I monetize local SEO calls".

## Core Concepts

### Digital real estate
You own/rank a property (the site). You rent it out — sell the calls/leads it generates to a local business, or run it as your own lead-gen asset. No inventory, no per-click cost once ranked.

### CPC is a value signal, not a target
A `$320` cost-per-click on `water remediation near me` means businesses pay ~$1,000 to acquire one call via ads. That same call has the same value when it comes from *your* ranked page — for free. High CPC = pick this niche. It does **not** mean chase that exact keyword.

### Head vs. long-tail (the funnel)
- **Head / top-of-funnel** (`water damage restoration <city>`): highest volume, brutal competition, everyone's there. Avoid as the entry point.
- **Middle / long-tail subniches** (`basement flooding cleanup`, `appliance leak cleanup`, `ceiling water damage from upstairs leak`): lower volume each, high intent, ignored by big players, often with **available exact-match domains**. This is the wedge.

### Subniche × city matrix
One subniche × 100 cities = 100 pages. Pick winnable subniches, build them out across cities. The math compounds: even 10 calls/month at ~$300/call = ~$3k/month from one built-out niche.

### The 90/91 rule
Pick one niche and one subniche, then focus for 90 days without chasing shiny objects. Most failures are abandonment, not bad niches.

## Workflow

### Phase 1 — Niche selection (is the money here?)
1. List candidate local-service niches with **emergency / high-ticket** demand.
2. Use `keyword-research` + Google Keyword Planner to pull CPC and volume for the head terms.
3. Keep niches where head-term CPC is high (lead value high) — see `rules/niche-selection.md`.

### Phase 2 — Subniche discovery (where is it winnable?)
1. Scoop the full keyword universe for the seed niche (Keyword Planner → 800+ ideas; download).
2. Mine competitor **service-page menus**, People Also Ask, People Also Search, Reddit/forum threads with `competitor-analysis` + `serp-analysis`.
3. Run the AI subniche prompt (`templates/subniche-research-prompt.md`) and reconcile with `content-gap-analysis` to find subniches **ignored by the big players**.
4. Output: a ranked list of 5–10 target subniches. See `rules/subniche-discovery.md`.

### Phase 3 — Build the matrix (mass pages)
1. Choose the target cities (start with the cities a buyer already wants calls in).
2. Generate subniche × city pages with `seo-site-builder` + `seo-content-factory`.
3. Localize with `geo-content-optimizer` / `entity-optimizer`, add `schema-markup-generator` (LocalBusiness/Service), silo with `internal-linking-optimizer`.
4. QA every page with `on-page-seo-auditor` + `technical-seo-checker`. See `rules/city-matrix-and-pages.md`.

### Phase 4 — Rank & monetize
1. Secure exact-match domains where cheap/available; consider GBP where the niche allows (see caveats).
2. Track with `rank-tracker`; build authority with `backlink-analyzer` / `domain-authority-auditor`.
3. Convert calls → income: rent the site, sell leads per-call, or flat monthly. See `rules/monetization.md`.

## Quick Reference

### Skills this playbook orchestrates
| Skill | Used for |
|-------|----------|
| `keyword-research` | Seed keywords, CPC/volume, Keyword Planner scoop |
| `competitor-analysis`, `serp-analysis` | Competitor service pages, SERP/PAA mining |
| `content-gap-analysis` | Finding subniches the big players ignore |
| `seo-site-builder`, `seo-content-factory` | Programmatic subniche×city pages |
| `geo-content-optimizer`, `entity-optimizer` | Local relevance, NAP, "near me" intent |
| `schema-markup-generator` | LocalBusiness / Service structured data |
| `internal-linking-optimizer` | City/subniche silo structure |
| `on-page-seo-auditor`, `technical-seo-checker` | Per-page QA |
| `rank-tracker`, `backlink-analyzer`, `domain-authority-auditor` | Ranking + off-page |

## File References
- **Niche selection**: `rules/niche-selection.md`
- **Subniche discovery**: `rules/subniche-discovery.md`
- **City matrix & pages**: `rules/city-matrix-and-pages.md`
- **Monetization**: `rules/monetization.md`

## Integration
- **Related Skills**: keyword-research, competitor-analysis, content-gap-analysis, seo-site-builder, seo-content-factory, geo-content-optimizer, schema-markup-generator, internal-linking-optimizer, rank-tracker, seo-growth-orchestrator
- **Templates**: `templates/subniche-research-prompt.md`, `templates/service-city-page.md`

## Validation Checklist
- [ ] Niche chosen on lead-value evidence (CPC/volume), not gut feel
- [ ] 5–10 long-tail subniches identified that big competitors ignore
- [ ] Target city list defined (ideally backed by a real buyer)
- [ ] Pages built via existing skills, not hand-rolled, and QA'd
- [ ] A concrete monetization path chosen before scaling pages
- [ ] Focus committed for 90 days on one niche/subniche (90/91 rule)
