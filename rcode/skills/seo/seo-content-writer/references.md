# Seo Content Writer — reference material

## Example

**User**: "Write an SEO-optimized article about 'email marketing best practices' targeting small businesses"

**Output** (abbreviated):
- H1: `Email Marketing Best Practices: A 2026 Guide for Small Businesses` (keyword front-loaded; audience + year qualifier)
- Meta description: `Get 12 proven email marketing tactics that lift open rates 34% for small businesses. DMA-backed data, real subject-line examples, and a 30-day playbook.` (~156 chars, CTA implied, stat hook)
- Structure: H2 for each of 12 tactics, bullet lists, comparison table (Mailchimp vs Brevo vs ConvertKit), 6-question FAQ (40-60 word answers for featured snippets), CTA conclusion.

> **Reference**: See [references/seo-writing-checklist.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/build/seo-content-writer/references/seo-writing-checklist.md) for the full article with statistics citations, H1/H2/H3 hierarchy, and FAQ section.

## Content Type Templates

Quick-start prompts: How-to guide, Comparison article, Listicle, Ultimate guide. See [references/instructions-detail.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/build/seo-content-writer/references/instructions-detail.md#content-type-templates) for all 4 templates.

## Tips for Success

Match intent, front-load value, use data, write for humans first, include visuals, update regularly. Full list in [references/instructions-detail.md](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/build/seo-content-writer/references/instructions-detail.md#tips-for-success).


### Save Results

After delivering content or optimization output to the user, ask:

> "Save these results for future sessions?"

If yes, write a dated summary to `memory/content/YYYY-MM-DD-<topic>.md` containing:
- One-line description of what was created
- Target keyword and content type
- Open loops or items needing review
- Source data references

**Gate check recommended**: Run content-quality-auditor before publishing (PostToolUse hook will remind automatically).

If any findings should influence ongoing strategy, recommend promoting key conclusions to `memory/hot-cache.md`.

## Reference Materials

- [Instructions Detail](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/build/seo-content-writer/references/instructions-detail.md) - Full step-by-step workflow, CORE-EEAT constraints, issue classification, content type templates, tips
- [SEO Writing Checklist](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/build/seo-content-writer/references/seo-writing-checklist.md) - On-page SEO checklist, writing template, featured snippet patterns, full example
- [Title Formulas](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/build/seo-content-writer/references/title-formulas.md) - Proven headline formulas, power words, CTR patterns
- [Content Structure Templates](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/build/seo-content-writer/references/content-structure-templates.md) - Templates for blog posts, comparisons, listicles, how-tos, pillar pages

## Next Best Skill

- **Primary**: [content-quality-auditor](https://github.com/aaron-he-zhu/seo-geo-claude-skills/blob/main/cross-cutting/content-quality-auditor/SKILL.md) — gate the draft before publishing or handing it off.
