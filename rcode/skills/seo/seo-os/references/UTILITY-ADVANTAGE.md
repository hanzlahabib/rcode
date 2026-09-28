# Utility Advantage

**Purpose:** for tool/calculator/converter/generator projects, "can we rank?" is not the only
question. This module is the second, equally mandatory question: "can we build something materially
more useful than what's currently ranking?" A page that wins the SERP-intent check
(`SERP-INTENT.md`) but offers no utility advantage over the incumbents is a weak bet — feed a low
score into `OPPORTUNITY-SCORING.md`'s "Utility advantage potential" dimension (10 pts) regardless of
how favorable the SERP looks.

## Competitor inspection checklist

For every dedicated competitor identified in `COMPETITOR-RESEARCH.md`, inspect:

```
input options   units            presets           formulas
charts          explanations     export             history
shareability    comparison tables   mobile UX        accessibility
result explanation   visualisation   secondary calculations
related tools   speed            clutter/ads        content quality
```

Record findings as `UTILITY-GAPS.md`:

```markdown
Competitor A: only metric units, no graph, no examples
Competitor B: good calculator, poor mobile layout, tool buried below a long intro

Our opportunity: instant calculation, metric + imperial, visual graph, examples,
downloadable result, tool above the fold
```

The goal is **meaningful** utility advantage, not "more features at all costs." A gap that doesn't
change the user's outcome or experience isn't a real advantage — don't count it.

## Tool UX hierarchy

Prefer immediate calculation (`input → output`) over an unnecessary submit step
(`input → click calculate → output`), unless the computation is expensive, hits an external API,
needs explicit confirmation, or a deliberate submission genuinely improves the UX. Put the tool
itself prominently — do not bury it under long SEO copy. Recommended page order:

```
H1 / promise → tool → result → interpretation → formula/methodology → examples
  → visualization → supporting explanation → related tools → FAQ → sources
```

## Gate before build

A tool page does not proceed to build until `UTILITY-GAPS.md` shows at least one concrete,
user-facing advantage over the strongest dedicated competitor. Once built, the tool must still pass
`TOOL-ACCURACY.md` (Lane C) — utility advantage and correctness are separate, both mandatory gates.

## See also

- `COMPETITOR-RESEARCH.md` — where the competitors being compared come from.
- `TOOL-ACCURACY.md` (Lane C) — the release-gate checklist for tool correctness, separate from UX.
- `../../seo-astro-implementation/references/astro-seo-components.md` — `CalculatorLayout` and
  related component contracts that implement this hierarchy in Astro.
