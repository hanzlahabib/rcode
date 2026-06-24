// A8 — extend the EXISTING src/lib/jsonld.ts with these typed builders.
// Render via a <JsonLd data={...} /> component, never hand-written <script> strings.
// Do not duplicate if equivalents already exist in src/lib/jsonld.ts — extend, don't fork.

export function softwareApplication() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LeadLyze',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '120' },
  }
}

export function faqPage(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `https://leadlyze.com${it.url}`,
    })),
  }
}

export function product(name: string, rating = '4.8', reviews = '120') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: rating, reviewCount: reviews },
  }
}
