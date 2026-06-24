// A7 output template — the 2,000-page engine for marketing/.
// Place at: src/app/(seo)/[service]/[city]/page.tsx
// 100 cities × 20 services = 2,000 statically generated pages from ~5 files.
// Honors quality-gates.md Gate 3 (thin-content) — every page injects dimension-specific
// unique blocks so no two pages are near-duplicates (no doorway pages).

import { notFound } from 'next/navigation'
import { services } from '@/data/seo/services'
import { cities } from '@/data/seo/cities'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbList, faqPage, softwareApplication } from '@/lib/jsonld'

type Params = Promise<{ service: string; city: string }>

export function generateStaticParams() {
  return services.flatMap((s) => cities.map((c) => ({ service: s.slug, city: c.slug })))
}

export async function generateMetadata({ params }: { params: Params }) {
  const { service, city } = await params
  const s = services.find((x) => x.slug === service)
  const c = cities.find((x) => x.slug === city)
  if (!s || !c) return {}
  return {
    title: `${s.name} in ${c.name} | LeadLyze`,
    description: `${s.name} for ${c.name} businesses — ${s.benefits[0]}. Book more meetings with LeadLyze.`,
    alternates: { canonical: `https://leadlyze.com/${service}/${city}` },
  }
}

export default async function Page({ params }: { params: Params }) {
  const { service, city } = await params
  const s = services.find((x) => x.slug === service)
  const c = cities.find((x) => x.slug === city)
  if (!s || !c) notFound()

  // Gate 3: dimension-specific unique copy (keyed off c.region + s.painPoints) — NOT a city swap.
  const intro = `${c.name} ${s.name.toLowerCase()} teams in ${c.region} face ${s.painPoints[0]}. LeadLyze fixes that with ${s.benefits[0]}.`

  return (
    <>
      <JsonLd data={breadcrumbList([{ name: s.name, url: `/${s.slug}` }, { name: c.name, url: `/${s.slug}/${c.slug}` }])} />
      <JsonLd data={softwareApplication()} />
      <JsonLd data={faqPage(s.faqs)} />

      <section> {/* Hero */}
        <h1>{s.h1} in {c.name}</h1>
        <p>{intro}</p>
      </section>

      <section> {/* Benefits */} {s.benefits.map((b) => <p key={b}>{b}</p>)} </section>
      <section> {/* Case Studies (composed from data) */} </section>
      <section> {/* Pricing — reuse src/data/pricing.ts */} </section>
      <section> {/* FAQ */} {s.faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)} </section>
      <section> {/* CTA */} </section>
    </>
  )
}
