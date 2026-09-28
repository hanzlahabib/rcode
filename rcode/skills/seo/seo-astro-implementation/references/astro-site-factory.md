# Astro Site Factory — Shared Infrastructure, Distinct Sites

Deep-dive for `rcode-seo-astro-implementation`, covering the multi-site shared-infrastructure model (spec §39). This is the *engineering* side of "shared infrastructure, distinct public experiences" — the *design* side (why sites must look different, what properties vary) is owned by Layer A's `DESIGN-UNIQUENESS.md`; read that first when standing up a new site so the config below is filled in with real per-site values, not copy-pasted defaults.

## When this applies

Only relevant once rcode is operating more than one Astro SEO site sharing a codebase, or a single monorepo of sites. A single one-off Astro project does not need this layout — use the plain layouts/components in `astro-seo-components.md` directly inside its own `src/`. Do not introduce `seo-engine/` for a single-site build; that is over-engineering for the problem at hand (spec §69).

## Shared package layout

```text
seo-engine/
├── components/      # SEOHead, SchemaRenderer, Breadcrumbs, FAQ, RelatedTools, SourceList, LocaleSwitcher
├── layouts/         # CalculatorLayout, ServiceLayout, LocationLayout, ArticleLayout, ComparisonLayout
├── content/         # shared content-collection schemas (Zod), reused across sites via astro:content
├── tools/           # calculator/converter/generator logic — pure functions, framework-independent
├── schemas/         # JSON-LD builder functions per @type (Service, LocalBusiness, FAQPage, ...)
├── seo/             # sitemap/hreflang/redirect helpers, canonical URL builders
├── locales/         # translation strings, keyed by locale
├── templates/       # scaffolding templates for new page types
└── config/          # per-site config schema + loader (see below)
```

This mirrors the same "reusable engine + per-site config" split already used elsewhere in rcode for programmatic content (`rcode/skills/seo/seo-content-factory/templates/jsonld-builders.ts` is the existing precedent for shared JSON-LD builder functions — reuse that pattern/shape here rather than inventing a second JSON-LD builder convention). Do not duplicate `jsonld-builders.ts`'s logic; import it if the target monorepo already vendors `seo-content-factory`'s templates, or port the same function signatures if it doesn't.

**Separation rule:** `tools/` (calculation logic) must be pure TypeScript with no Astro imports, so it can be unit-tested independently of rendering — this is what makes `TOOL-ACCURACY.md`'s fixture tests possible without spinning up Astro's build.

## Per-site config schema

Each site supplies one config object; the shared engine renders from it. Fields, grounded in spec §39 plus the Design Fingerprint properties from Layer A's `DESIGN-UNIQUENESS.md`:

```ts
interface SiteConfig {
  brand: string;
  domain: string;                 // e.g. "hendersonevcharger.com"
  market: string;                 // e.g. "Henderson, NV, US"
  language: string;                // primary locale, e.g. "en"
  locales?: string[];              // additional validated locales (Layer A INTERNATIONAL-SEO.md gate)
  navigation: { label: string; href: string }[];
  primaryTopic: string;            // main entity/topic (Layer A PROJECT.md's "Main entity/topic")
  services?: string[];
  tools?: string[];
  entityData: Record<string, unknown>;   // NAP, hours, service area — real data only, no fabrication
  schemaDefaults: Record<string, unknown>; // Organization/LocalBusiness base fields reused across pages
  conversionAction: string;        // e.g. "call", "form", "signup"
  analytics: { gaId?: string; gscVerified: boolean };
  designFingerprint: {
    // see DESIGN-UNIQUENESS.md for the full property list and the "shared engine, distinct
    // presentation" rule this schema exists to enforce
    typography: string;
    colorSystem: string;
    cornerRadius: string;
    heroComposition: string;
    toolContainerStyle: string;
    navigationStyle: string;
    ctaStyle: string;
  };
}
```

Load this via `src/config/site.ts` (or `.json` + a typed loader) at the site level, imported by `seo-engine/` components/layouts instead of hardcoding brand strings inside shared components. A shared `SEOHead.astro` that imports `siteConfig.brand` for its default OG image/title suffix is the mechanism that keeps the engine generic while each site's output stays distinct — never hardcode one site's brand or copy into a shared-package file.

## What NOT to share

Per `DESIGN-UNIQUENESS.md`: the *engine* (components, layouts, tool logic, schema builders) is shared; the *design fingerprint* values feeding it are not. Concretely:

- Do NOT ship one global `theme.css`/design-token file used verbatim by every site — each site's `designFingerprint` should resolve to its own token values (even if the token *names* are shared).
- Do NOT let two sites differ only by `brand`/`domain`/primary color while every other fingerprint property (spacing, hero composition, section order, icon style) stays default — that reproduces exactly the "20 sites differing only by logo" anti-pattern spec §24 warns against.

## Content collections in the shared model

Each site owns its own `src/content/` data (services, locations, FAQs); the **schema** (Zod shape) can live in `seo-engine/content/` and be imported into each site's `content.config.ts`:

```ts
// site's src/content.config.ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { serviceSchema } from "seo-engine/content/service-schema";

const services = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/services" }),
  schema: serviceSchema,
});

export const collections = { services };
```

This keeps the schema (structure) shared while the content (facts) stays per-site — matching `PROJECT.md`'s "do not save speculation as fact" rule, since content authored per-site is what get validated against real project data, not templated placeholder copy.
