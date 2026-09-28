# Astro SEO Components — Contracts

Deep-dive for `rcode-seo-astro-implementation`. One component per section: purpose, props contract, one usage snippet. **Use the project's actual components if they exist** — this is the fallback contract when a target project has none yet, not a mandate to replace working code.

All syntax here is verified against current Astro documentation (Content Layer API, `astro:i18n`, `@astrojs/sitemap`) as of this writing. Astro moves fast — re-check `docs.astro.build` if the target project's `astro` version in `package.json` predates the API used below (Content Layer API requires Astro ≥5; earlier projects use the legacy `src/content/config.ts` collections API with the same `defineCollection`/Zod shape but no `loader:`).

Working implementations for the five starred (★) components/layouts are in `../templates/`.

---

## SEOHead ★

Purpose: title, meta description, canonical, Open Graph, Twitter card in one place. Never duplicate these tags ad hoc per page.

**Props contract:**
```ts
interface Props {
  title: string;              // page <title>, already includes brand suffix if desired
  description: string;        // meta description, ~150-160 chars
  canonicalUrl: string;       // absolute URL — see astro:i18n note below
  ogImage?: string;            // absolute URL, defaults to site-wide fallback
  ogType?: "website" | "article";
  noindex?: boolean;           // renders robots noindex — use deliberately, log why
}
```

**Usage:**
```astro
---
import SEOHead from "../components/SEOHead.astro";
const canonicalUrl = new URL(Astro.url.pathname, Astro.site).toString();
---
<SEOHead title="EV Charger Installation Cost | Henderson" description="…" canonicalUrl={canonicalUrl} />
```

Template: `../templates/SEOHead.astro`.

---

## Canonical

Not a separate component in this contract — canonical is a `SEOHead` prop (`canonicalUrl`), computed from `Astro.url` + `Astro.site`, never hand-typed per page (typos here silently create duplicate-content signals). For localized pages, build it with `getAbsoluteLocaleUrl` from `astro:i18n` so the canonical always points at the correct locale variant, not a hardcoded default-locale URL.

---

## Open Graph / Twitter metadata

Also folded into `SEOHead` (`ogImage`, `ogType`) rather than a separate component — OG and Twitter tags are 1:1 derived from the same title/description/image, and splitting them invites drift where one gets updated and the other doesn't.

---

## Breadcrumbs

Purpose: visible breadcrumb trail + matching `BreadcrumbList` JSON-LD (via `SchemaRenderer`, not inline).

**Props contract:**
```ts
interface Crumb { label: string; href: string }
interface Props { items: Crumb[] }  // ordered root → current, current page usually has no href
```

**Usage:**
```astro
<Breadcrumbs items={[
  { label: "Services", href: "/services/" },
  { label: "EV Charger Installation", href: "" },
]} />
```

The same `items` array feeds `SchemaRenderer`'s `BreadcrumbList` — build it once, pass it to both, don't hand-write the JSON-LD separately.

---

## SchemaRenderer ★

Purpose: single point of truth for JSON-LD. Accepts a typed schema object and renders one `<script type="application/ld+json">`. Never fabricate `ratings`, `reviews`, `price`, `availability`, or `author` (Layer A `EVIDENCE-POLICY.md` / spec structured-data rule) — every field must trace to real project data.

**Props contract:**
```ts
interface Props {
  schema: Record<string, unknown> | Record<string, unknown>[]; // one or more JSON-LD objects
}
```

**Usage:**
```astro
<SchemaRenderer schema={{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "EV Charger Installation",
  "areaServed": "Henderson, NV",
  "provider": { "@type": "LocalBusiness", "name": siteConfig.brand },
}} />
```

Template: `../templates/SchemaRenderer.astro`. Supported `@type`s per spec §42: `Organization`, `LocalBusiness`, `Service`, `SoftwareApplication`, `WebApplication`, `Article`, `BreadcrumbList`, `Product`, `FAQPage` — only emit `FAQPage`/`Product` when the page has genuine, visible matching content (blanket FAQ schema is flagged as a mistake elsewhere in this system, see `seo-aeo-geo`).

---

## FAQ

Purpose: visible Q&A UI whose content is the *source* for an optional `FAQPage` schema passed through `SchemaRenderer` — never generate `FAQPage` JSON-LD without the matching visible FAQ block on the same page.

**Props contract:**
```ts
interface QA { question: string; answer: string }
interface Props { items: QA[] }
```

---

## RelatedTools / RelatedServices

Purpose: contextual internal links (spec §33's "contextual SEO links", distinct from structural nav) — related items should share real topical relationship (same cluster/parent in Layer A's `SITE-ARCHITECTURE.md`), not be injected identically on every page.

**Props contract:**
```ts
interface RelatedItem { title: string; href: string; blurb?: string }
interface Props { items: RelatedItem[]; heading?: string }
```
`RelatedTools` and `RelatedServices` share this contract; keep them as two thin named components (not one generic `RelatedItems`) so page templates read clearly about what they're linking to.

---

## SourceList

Purpose: renders cited sources for YMYL/tool pages (spec §46, §21 "source/derivation"). Pairs with `TOOL-ACCURACY.md`'s requirement to record a formula's source.

**Props contract:**
```ts
interface Source { label: string; href: string; note?: string }
interface Props { sources: Source[] }
```

---

## Page layouts

Each layout composes `SEOHead` + `Breadcrumbs` + `SchemaRenderer` + a page-type-specific body structure. The page-type → layout mapping is decided by Layer A's `PAGE-TYPE-CLASSIFIER.md`; this table is the implementation side of that decision:

| Page type (Layer A) | Layout | Body hierarchy (spec §20/§35) |
|---|---|---|
| `PRIMARY_TOOL`, `TOOL_VARIANT`, `CALCULATOR`, `CONVERTER`, `GENERATOR` | `CalculatorLayout.astro` ★ | H1/promise → tool → result → interpretation → formula/methodology → examples → visualization → explanation → related tools → FAQ → sources |
| `SERVICE_PAGE` | `ServiceLayout.astro` ★ | service promise → problem → process → pricing factors → why-us → local relevance → FAQ → conversion |
| `LOCATION_PAGE` | `LocationLayout.astro` ★ | service in location → local context → coverage → local considerations → proof/trust → FAQ → conversion |
| `ARTICLE`, `GUIDE` | `ArticleLayout` (project-provided; not templated here — plain content-collection rendering via `render(entry)` is usually sufficient) | standard long-form article structure |
| `COMPARISON_PAGE` | `ComparisonLayout` (project-provided) | comparison criteria → matrix → differences → use cases → limitations → conclusion |

`ArticleLayout` and `ComparisonLayout` are intentionally not shipped as starter templates here — they are typically thin wrappers around a project's existing article/content-collection rendering, and inventing a generic one risks conflicting with real content already in the target repo. Build them on first use by copying the closest starred template's SEOHead/Breadcrumbs/SchemaRenderer composition.

---

## InternalLink components

Purpose: a single link-rendering primitive that project pages use instead of raw `<a>` tags for contextual body links, so relevance rules (spec §33) can be enforced/audited in one place later (e.g. a future internal-link checker script, reserved per `seo-os`'s extension points). No fixed props contract is mandated — reuse the project's existing link component if one exists; only introduce a new one if none does.

---

## LocaleSwitcher

Purpose: visible language switcher + the hreflang alternates it implies.

**Props contract:**
```ts
interface LocaleLink { locale: string; href: string; label: string }
interface Props { current: string; alternates: LocaleLink[] }
```

**Usage (building alternates with astro:i18n):**
```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
const alternates = ["en", "es"].map((locale) => ({
  locale,
  href: getRelativeLocaleUrl(locale, Astro.url.pathname),
  label: locale.toUpperCase(),
}));
---
```

Emit the matching `<link rel="alternate" hreflang="...">` tags from `SEOHead` (extend its props with an optional `alternates` list) rather than duplicating the locale loop in a second place. Per Layer A `INTERNATIONAL-SEO.md`, do not wire a locale here that hasn't cleared that module's validation gate.

---

## Sitemap & hreflang wiring (not a component — config)

`@astrojs/sitemap` reads locales from `astro.config.mjs`:

```js
// astro.config.mjs
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://example.com",
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: { en: "en-US", es: "es-ES" },
      },
      filter: (page) => !page.includes("/draft/"),
    }),
  ],
});
```

`site` is mandatory for `@astrojs/sitemap` to emit absolute URLs — verify it's set before assuming the sitemap will build correctly. Cross-link `OUTPUT-TEMPLATES.md` (Layer A) for which pages should be excluded via `filter` (thin/no-separate-page candidates per spec §17 should never reach the sitemap in the first place — fix at the architecture level, not by filtering here).
