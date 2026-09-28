# Design Uniqueness at Portfolio Scale

**Purpose:** shared engineering infrastructure across many sites (see
`../../seo-astro-implementation/references/astro-site-factory.md`, Lane C) is good. Identical public
websites are not. This module defines the **Design Fingerprint** concept that keeps shared
infrastructure from producing visually indistinguishable sites.

## Design Fingerprint — configurable per site

```
typography          spacing rhythm        corner radius        navigation style
hero composition     tool container        content density     section order
icon style           chart treatment       illustration direction   surface treatment
CTA style            color system          button style         result layout
footer architecture
```

Do not generate 20 sites that differ only by logo, domain, and primary color — that is not a
fingerprint, it's a reskin. Each property above should be a deliberate per-site configuration value,
not a shared default left untouched.

## Where this applies

- Any portfolio of 2+ sites built on shared Astro infrastructure
  (`../../seo-astro-implementation/references/astro-site-factory.md`'s `seo-engine/` shared layer) — the per-site config schema described
  there should set these Design Fingerprint values, not just brand/domain/locale.
- Any site whose UX research drew on a competitor (`COMPETITOR-RESEARCH.md`) — the fingerprint is
  what ensures "study → understand → identify weakness → improve" ends in an original
  implementation, not a reskin of the competitor either.

## Output

- A lightweight per-site design spec (visual personality, typography, colors, radius, spacing,
  layout density, hero/tool/result treatment, navigation, cards, charts, CTA, motion) recorded
  wherever the project keeps its build config — do not invent a new database for this; a markdown
  or config-file entry per site is sufficient (spec's "do not over-engineer" principle).

## See also

- `../../seo-astro-implementation/references/astro-site-factory.md` (Lane C) — the shared
  infrastructure layout and per-site config schema this fingerprint attaches to.
- `COMPETITOR-RESEARCH.md` — the "do not copy distinctive visual expression" boundary this module
  operationalizes into a positive requirement (build something fingerprinted, not just non-identical).
