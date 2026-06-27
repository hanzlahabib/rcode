---
name: rcode-on-page-seo-auditor
description: 'Audit on-page SEO: titles, headers, images, links with scored report and fix priorities. 页面SEO审计/排名诊断'
version: "9.0.0"
license: Apache-2.0
compatibility: "Claude Code ≥1.0, skills.sh marketplace, ClawHub marketplace, Vercel Labs skills ecosystem. No system packages required. Optional: MCP network access for SEO tool integrations."
homepage: "https://github.com/aaron-he-zhu/seo-geo-claude-skills"
when_to_use: "Use when auditing a page's on-page SEO health, checking heading structure, keyword placement, image optimization, or content quality signals."
argument-hint: "<URL> [keyword]"
allowed-tools: WebFetch
metadata:
  author: aaron-he-zhu
  version: "9.0.0"
  geo-relevance: "medium"
  tags:
    - seo
    - on-page-audit
    - page-optimization
    - seo-score
    - content-audit
    - h1-optimization
    - meta-audit
    - seo-checklist
    - yoast-alternative
    - screaming-frog-alternative
    - 页面SEO
    - 网页优化
    - ページSEO
    - 페이지감사
    - auditoria-seo
  triggers:
    - "audit page SEO"
    - "on-page SEO check"
    - "SEO score"
    - "page optimization"
    - "what SEO issues does this page have"
    - "why isn't this page ranking"
    - "is my page optimized"
    - "why is my page not ranking"
    - "how do I improve my page SEO"
    - "页面SEO审计"        # ZH
    - "オンページSEO"       # JA
    # NOTE: for site-wide technical health use rcode-technical-seo-checker;
    #       for writing content use rcode-seo-content-writer.
---

# On-Page SEO Auditor


> **[SEO & GEO Skills Library](https://github.com/aaron-he-zhu/seo-geo-claude-skills)** · 20 skills for SEO + GEO · [ClawHub](https://clawhub.ai/u/aaron-he-zhu) · [skills.sh](https://skills.sh/aaron-he-zhu/seo-geo-claude-skills)
> **System Mode**: This optimization skill follows the shared [Skill Contract](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/skill-contract.md) and [State Model](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/state-model.md).


This skill performs detailed on-page SEO audits to identify issues and optimization opportunities. It analyzes all on-page elements that affect search rankings and provides actionable recommendations.

**System role**: Optimization layer skill. It turns weak pages, structures, and technical issues into prioritized repair work.

## When This Must Trigger

Use this when the conversation involves a diagnosis or repair plan that should feed directly into remediation work — even if the user doesn't use SEO terminology:

- Auditing pages before or after publishing
- Identifying why a page isn't ranking well
- Optimizing existing content for better performance
- Creating pre-publish SEO checklists
- Comparing your on-page SEO to competitors
- Systematic site-wide SEO improvements
- Training team members on SEO best practices

## What This Skill Does

1. **Title Tag Analysis**: Evaluates title optimization and CTR potential
2. **Meta Description Review**: Checks description quality and length
3. **Header Structure Audit**: Analyzes H1-H6 hierarchy
4. **Content Quality Assessment**: Reviews content depth and optimization
5. **Keyword Usage Analysis**: Checks keyword placement and density
6. **Internal Link Review**: Evaluates internal linking structure
7. **Image Optimization Check**: Audits alt text and file optimization
8. **Technical On-Page Review**: Checks URL, canonical, and mobile factors

## Quick Start

Start with one of these prompts. Finish with a short handoff summary using the repository format in [Skill Contract](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/references/skill-contract.md).

### Audit a Single Page

```
Audit the on-page SEO of [URL]
```

```
Check SEO issues on this page targeting [keyword]: [URL/content]
```

### Compare Against Competitors

```
Compare on-page SEO of [your URL] vs [competitor URL] for [keyword]
```

### Audit Content Before Publishing

```
Pre-publish SEO audit for this content targeting [keyword]: [content]
```

### Site-Wide / Bulk Audit (5+ URLs)

For content category batches (e.g., "audit all 40 blog posts"), switch to bulk mode — group URLs by cluster template, sample 2-3 per cluster, report pattern-level findings + portfolio priority:

```
Bulk audit: all 40 blog posts on example.com/blog/
```

```
Pre-publish audit for these 6 articles: [URLs]
```

See [references/bulk-audit-playbook.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/optimize/on-page-seo-auditor/references/bulk-audit-playbook.md) for the full workflow (cluster classification, sampling, extrapolation, portfolio priority, template suggestions).

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

**With ~~SEO tool + ~~web crawler connected:**
Claude can automatically pull page HTML via ~~web crawler, fetch keyword search volume and difficulty from ~~SEO tool, retrieve click-through rate data from ~~search console, and download competitor pages for comparison. This enables fully automated audits with live data.

**With manual data only:**
Ask the user to provide:
1. Page URL or complete HTML content
2. Target primary and secondary keywords
3. Competitor page URLs for comparison (optional)

Proceed with the full audit using provided data. Note in the output which findings are from automated crawl vs. manual review.

## Detailed procedure

Step-by-step instructions, validation checkpoints, the worked example, tips,
and reference materials live in [`references.md`](references.md).
