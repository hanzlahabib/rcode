# Programmatic Pages — marketing/ wiring

This is the concrete Next.js 16 App Router implementation for the canonical `marketing/`
site (`/home/hanzla/development/teaching/schedule-manager/marketing`). It honors the site's
existing conventions: **TS data files in `src/data/` (programmatic) + MDX (editorial)**.
Do NOT add a CMS, contentlayer, gray-matter-DB, or runtime fetching — the site is SSG.

## Two output channels

| Channel | Source | Route | Scale | Use for |
|---------|--------|-------|-------|---------|
| **Programmatic** | `src/data/seo/*.ts` (typed) | `src/app/(seo)/[...]/page.tsx` + `generateStaticParams` | 1,000s | service×city, service×industry, location pages |
| **Editorial (MDX)** | `src/content/<type>/*.mdx` | `src/app/blog/[slug]` (already a shell) + new `alternatives`/`comparisons` | ~100 | alternatives, comparisons, cornerstone, statistics, questions |

## Programmatic: the 2,000-page pattern

100 cities × 20 services = 2,000 pages from **~5 files**, not 2,000 files.

### 1. Dimension registries — `src/data/seo/` (matches existing `src/data/*.ts`)
```ts
// src/data/seo/services.ts
export interface SeoService {
  slug: string; name: string; h1: string;
  benefits: string[]; painPoints: string[]; faqs: { q: string; a: string }[];
}
export const services: SeoService[] = [ /* 20 records, A7-generated */ ]

// src/data/seo/cities.ts
export interface SeoCity { slug: string; name: string; region: string; country: string }
export const cities: SeoCity[] = [ /* 100 records */ ]
```

### 2. One dynamic route for the cross-product
```tsx
// src/app/(seo)/[service]/[city]/page.tsx
import { services } from '@/data/seo/services'
import { cities } from '@/data/seo/cities'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return services.flatMap(s => cities.map(c => ({ service: s.slug, city: c.slug })))
}

export async function generateMetadata({ params }) {
  const { service, city } = await params
  const s = services.find(x => x.slug === service); const c = cities.find(x => x.slug === city)
  if (!s || !c) return {}
  return {
    title: `${s.name} in ${c.name} | LeadLyze`,
    description: `${s.name} for ${c.name} businesses — ${s.benefits[0]}. Book more meetings with LeadLyze.`,
    alternates: { canonical: `https://leadlyze.com/${service}/${city}` },
  }
}

export default async function Page({ params }) {
  const { service, city } = await params
  const s = services.find(x => x.slug === service); const c = cities.find(x => x.slug === city)
  if (!s || !c) notFound()
  // Hero → Benefits → Case Studies → Pricing → FAQ → CTA, all composed from s + c
  // ...
}
```
Full route template: `templates/programmatic-page.tsx`.

### 3. Thin-content guard (mandatory — see quality-gates.md)
Templated pages are the #1 thin-content / doorway-page risk. Each page MUST inject ≥2
**city-specific or service-specific** unique elements (local stat, named local use-case,
varied intro sentence keyed off `c.region`/`s.painPoints`) so no two pages are near-duplicates.
A page that's pure boilerplate with the city name swapped ships as `noindex`.

## Editorial: the MDX channel

The blog `[slug]` shell already says *"fetch MDX/CMS content by slug"*. Wire it minimally:

```ts
// src/lib/mdx.ts — tiny loader, no DB
import { compileMDX } from 'next-mdx-remote/rsc'   // add dep ONLY with user consent
import fs from 'node:fs/promises'
export async function getDoc(type: string, slug: string) { /* read src/content/<type>/<slug>.mdx, compile */ }
export async function listSlugs(type: string) { /* readdir, strip .mdx */ }
```
> **DECIDED (2026-06-14):** use `next-mdx-remote` for the editorial channel. It's a new dep —
> add it at Phase 0 (`pnpm add next-mdx-remote`) and confirm `pnpm build` still passes before
> wave 1. (Zero-dep fallback, only if the user reverses: structured TS bodies rendered via the
> existing `src/components/blog` components.)

`generateStaticParams` for blog/alternatives/comparisons then returns `listSlugs(type)`.

## Schema (A8) — extend the existing helper

`src/lib/jsonld.ts` already exists. Add typed builders (`faqPage`, `softwareApplication`,
`product`, `breadcrumbList`, `aggregateRating`) and render via a `<JsonLd>` component —
never hand-write `<script type="application/ld+json">` strings inline.

## Sitemap

`next-sitemap` is already configured (`next-sitemap.config.js`, siteUrl leadlyze.com). It
crawls the built `.next` output, so all `generateStaticParams` pages are included
automatically on `pnpm build && next-sitemap`. For 2,000+ URLs, enable sitemap splitting:
add `sitemapSize: 5000` (default already chunks at 5k) — verify `robots.txt` references the
index. No per-page sitemap code needed.

## Establishing the content layer (Phase 0, once)

If `src/data/seo/` and `src/app/(seo)/` don't exist yet, the orchestrator scaffolds them
before wave 1: create the dirs, drop the route template + empty typed registries, confirm
`pnpm build` still passes (baseline). Only THEN do fan-out waves populate them.
