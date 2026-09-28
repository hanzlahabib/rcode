# SaaS SEO

**Purpose:** acquisition-surface strategy for SaaS projects. No existing skill covers general SaaS
SEO end to end — `rcode-seo-content-factory` is a specific, hardened implementation of part of this
for one project (LeadLyze); treat it as a worked example of the pattern below, not the pattern
itself.

## Acquisition surfaces

A SaaS site typically needs more than a blog:

```
/tools/          /solutions/       /use-cases/
/integrations/   /compare/         /templates/       /resources/
```

Each surface targets a different part of the funnel — `/tools/` and `/templates/` capture
top-of-funnel utility search, `/compare/` and `/integrations/` capture commercial-intent research,
`/use-cases/` and `/solutions/` connect a job-to-be-done to the product.

## Tool-led acquisition

Identify calculations, templates, checks, comparisons, and small utilities adjacent to the paid
product that users currently do manually:

```
ROI calculator          revenue-loss calculator     response-time calculator
conversion calculator   cost calculator              audit tool
template generator      benchmark tool
```

Each free tool must have **standalone value** — it must not be a disguised signup form. A working
example of the connection pattern:

```
Speed-to-Lead Calculator → shows lost opportunities → CTA: automate speed-to-lead
```

Do not force a sales CTA where the tool's outcome doesn't naturally lead to one. Any tool built here
goes through `UTILITY-ADVANTAGE.md` (does it beat existing free tools?) and `TOOL-ACCURACY.md`
(Lane C — is it correct?) before shipping, same as any other tool page.

## Content and comparison pages

`/compare/` pages are commercial-intent, high-conversion-value real estate — treat competitor
comparison content with the same evidence discipline as `COMPETITOR-RESEARCH.md` (no unfounded
claims about competitor limitations; verify before publishing).

## Output

- `.rcode/seo/SITE-MAP.md` — acquisition-surface breakdown alongside the general architecture
  (`SITE-ARCHITECTURE.md`).
- `.rcode/seo/CONTENT-PLAN.md` — tool/template/comparison backlog mapped to funnel stage.

## See also

- `rcode-seo-content-factory` — a concrete, hardened 10-agent implementation of tool-led + clustered
  SaaS content production (LeadLyze-specific; reuse the *pattern*, not the file paths).
- `UTILITY-ADVANTAGE.md`, `TOOL-ACCURACY.md` (Lane C) — mandatory gates for every free tool.
- `MONETIZATION.md` — how a free tool's traffic converts into the SaaS's actual revenue model.
