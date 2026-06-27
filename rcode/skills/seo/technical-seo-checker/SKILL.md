---
name: rcode-technical-seo-checker
description: 'Technical SEO audit: Core Web Vitals, crawl, indexing, mobile, speed, architecture, redirects. 技术SEO/网站速度'
version: "9.0.0"
license: Apache-2.0
compatibility: "Claude Code ≥1.0, skills.sh marketplace, ClawHub marketplace, Vercel Labs skills ecosystem. No system packages required. Optional: MCP network access for SEO tool integrations."
homepage: "https://github.com/aaron-he-zhu/seo-geo-claude-skills"
when_to_use: "Use when checking technical SEO health: site speed, Core Web Vitals, indexing, crawlability, robots.txt, sitemaps, or canonical tags."
argument-hint: "<URL or domain>"
allowed-tools: WebFetch
metadata:
  author: aaron-he-zhu
  version: "9.0.0"
  geo-relevance: "low"
  tags:
    - seo
    - technical-seo
    - core-web-vitals
    - page-speed
    - crawlability
    - indexability
    - mobile-seo
    - site-health
    - lcp
    - cls
    - inp
    - robots-txt
    - xml-sitemap
    - 技术SEO
    - 网站速度
    - テクニカルSEO
    - 기술SEO
    - seo-tecnico
  triggers:
    - "technical SEO audit"
    - "check page speed"
    - "Core Web Vitals"
    - "crawl issues"
    - "site indexing problems"
    - "canonical tag issues"
    - "mobile-friendly check"
    - "my site is slow"
    - "Google can't crawl my site"
    - "why is my site not indexed"
    - "技术SEO检查"        # ZH
    - "テクニカルSEO"       # JA
    # NOTE: do NOT trigger for content writing (use rcode-seo-content-writer)
    #       or on-page meta review (use rcode-on-page-seo-auditor).
---

# Technical SEO Checker


> **[SEO & GEO Skills Library](https://github.com/aaron-he-zhu/seo-geo-claude-skills)** · 20 skills for SEO + GEO · [ClawHub](https://clawhub.ai/u/aaron-he-zhu) · [skills.sh](https://skills.sh/aaron-he-zhu/seo-geo-claude-skills)
> **System Mode**: This optimization skill follows the shared [Skill Contract](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/skill-contract.md) and [State Model](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/state-model.md).


This skill performs comprehensive technical SEO audits to identify issues that may prevent search engines from properly crawling, indexing, and ranking your site.

**System role**: Optimization layer skill. It turns weak pages, structures, and technical issues into prioritized repair work.

## When This Must Trigger

Use this when the conversation involves a diagnosis or repair plan that should feed directly into remediation work — even if the user doesn't use SEO terminology:

- Launching a new website
- Diagnosing ranking drops
- Pre-migration SEO audits
- Regular technical health checks
- Identifying crawl and index issues
- Improving site performance
- Fixing Core Web Vitals issues

## What This Skill Does

1. **Crawlability Audit**: Checks robots.txt, sitemaps, crawl issues
2. **Indexability Review**: Analyzes index status and blockers
3. **Site Speed Analysis**: Evaluates Core Web Vitals and performance
4. **Mobile-Friendliness**: Checks mobile optimization
5. **Security Check**: Reviews HTTPS and security headers
6. **Structured Data Audit**: Validates schema markup
7. **URL Structure Analysis**: Reviews URL patterns and redirects
8. **International SEO**: Checks hreflang and localization

## Quick Start

Start with one of these prompts. Finish with a short handoff summary using the repository format in [Skill Contract](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/skill-contract.md).

### Full Technical Audit

```
Perform a technical SEO audit for [URL/domain]
```

### Specific Issue Check

```
Check Core Web Vitals for [URL]
```

```
Audit crawlability and indexability for [domain]
```

### Pre-Migration Audit

```
Technical SEO checklist for migrating [old domain] to [new domain]
```

```
Pre-migration audit: WordPress to Next.js headless
```

The migration flow has 6 stages (baseline snapshot, risk map, redirect map, staging QA, cutover checklist, T+1/T+7/T+30 diff). See [references/pre-migration-playbook.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/optimize/technical-seo-checker/references/pre-migration-playbook.md) for the full workflow and red-flag patterns.

### LLM Crawler Handling (GPTBot / ClaudeBot / PerplexityBot)

```
Audit how my site handles AI crawlers — I want to allow retrieval but block training
```

As of 2026, robots.txt must make explicit decisions about AI engines. See [references/llm-crawler-handling.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/optimize/technical-seo-checker/references/llm-crawler-handling.md) for the bot inventory, three stance patterns (default-open, default-closed, split), robots.txt templates, and the Cloudflare edge-override gotcha.

### Site-Wide / Bulk Audit (5+ URLs)

For e-commerce and large sites (e.g., "40 of 50 products not indexed"), switch to bulk mode — sample per URL pattern, report pattern-level findings, deliver portfolio priority instead of per-URL output:

```
Bulk audit: 50 product pages on example.com, 40 not indexed
```

```
Audit all URLs in https://example.com/sitemap.xml
```

See [references/bulk-audit-playbook.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/optimize/technical-seo-checker/references/bulk-audit-playbook.md) for the full workflow. For platform-specific playbooks (Shopify / WooCommerce / Headless / BigCommerce / Magento 2), see [references/ecommerce-platform-patterns.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/optimize/technical-seo-checker/references/ecommerce-platform-patterns.md).

## Skill Contract

**Expected output**: a scored diagnosis, prioritized repair plan, and a short handoff summary ready for `memory/audits/`.

- **Reads**: the current page or site state, symptoms, prior audits, and current priorities from [CLAUDE.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/CLAUDE.md) and the shared [State Model](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/state-model.md) when available.
- **Writes**: a user-facing audit or optimization plan plus a reusable summary that can be stored under `memory/audits/`.
- **Promotes**: blocking defects, repeated weaknesses, and fix priorities to `memory/open-loops.md` and `memory/decisions.md`.
- **Next handoff**: use the `Next Best Skill` below when the repair path is clear.

### Handoff Summary

Emit this shape when finishing the skill (see [skill-contract.md §Handoff Summary Format](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/skill-contract.md) for the authoritative format):

- **Status**: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_INPUT
- **Objective**: what was analyzed, created, or fixed
- **Key Findings / Output**: the highest-signal result
- **Evidence**: URLs, data points, or sections reviewed
- **Open Loops**: blockers, missing inputs, or unresolved risks
- **Recommended Next Skill**: one primary next move

## Data Sources

> See [CONNECTORS.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/CONNECTORS.md) for tool category placeholders.

**Scraping legality**: Before crawling any domain that is not your own or not under written authorization, verify `robots.txt` disallows, respect `Crawl-delay`, and confirm target TOS permits automated access. See [SECURITY.md §Scraping Boundaries](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/SECURITY.md).

**With ~~web crawler + ~~page speed tool + ~~CDN connected:**
Claude can automatically crawl the entire site structure via ~~web crawler, pull Core Web Vitals and performance metrics from ~~page speed tool, analyze caching headers from ~~CDN, and fetch mobile-friendliness data. This enables comprehensive automated technical audits.

**With manual data only:**
Ask the user to provide:
1. Site URL(s) to audit
2. PageSpeed Insights screenshots or reports
3. robots.txt file content
4. sitemap.xml URL or file

Proceed with the full audit using provided data. Note in the output which findings are from automated crawl vs. manual review.

## Detailed procedure

The step-by-step instructions, validation checkpoints, worked example, tips,
and reference materials for this skill live in [`references.md`](references.md).
