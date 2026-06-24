# Rule: Site Build — Next.js + Velite + BMAD

## When to Run
After content plan approved and user wants to build the site

## Tech Stack (Always Use Unless User Says Otherwise)
- **Framework:** Next.js 16.2.1 (App Router) — `pnpm create next-app@16.2.1`
- **Content Layer:** Velite (MDX + JSON → typed content)
- **Styling:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel (free tier)
- **Package Manager:** pnpm (ALWAYS — never npm or yarn)

## Step 1 — Init Project
```bash
cd /home/hanzla/development/
pnpm create next-app@16.2.1 [project-slug] \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd [project-slug]
```

## Step 2 — Install Dependencies
```bash
# Content layer
pnpm add velite

# UI components
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card badge separator table

# SEO
pnpm add next-sitemap

# Utilities
pnpm add date-fns reading-time
```

## Step 3 — Directory Structure
Create exactly:
```
src/
├── app/
│   ├── layout.tsx              ← root layout with SEO defaults
│   ├── page.tsx                ← homepage
│   ├── reviews/
│   │   └── [slug]/page.tsx     ← single product review
│   ├── compare/
│   │   └── [slug]/page.tsx     ← comparison articles
│   ├── guides/
│   │   └── [slug]/page.tsx     ← buying guides
│   ├── health/
│   │   └── [slug]/page.tsx     ← use-case articles
│   ├── best/
│   │   └── [slug]/page.tsx     ← roundup pages
│   └── sitemap.ts              ← auto-generated sitemap
├── components/
│   ├── ui/                     ← shadcn components
│   ├── ArticleLayout.tsx       ← shared article wrapper
│   ├── ReviewCard.tsx          ← product review card
│   ├── ComparisonTable.tsx     ← side-by-side comparison
│   ├── AffiliateButton.tsx     ← CTA button with disclosure
│   ├── RatingStars.tsx         ← star rating display
│   ├── ProsCons.tsx            ← pros/cons list
│   ├── KeywordBox.tsx          ← target keyword highlight
│   └── SchemaMarkup.tsx        ← JSON-LD schema injection
└── lib/
    ├── velite.ts               ← content queries
    └── utils.ts                ← helpers
```

## Step 4 — Velite Config
Create `velite.config.ts` with schemas for each content type:

```typescript
// velite.config.ts
import { defineConfig, defineCollection, s } from 'velite'

const reviews = defineCollection({
  name: 'Review',
  pattern: 'reviews/**/*.mdx',
  schema: s.object({
    title: s.string(),
    slug: s.string(),
    keyword: s.string(),
    metaTitle: s.string().max(60),
    metaDescription: s.string().max(160),
    publishDate: s.string(),
    wordCountTarget: s.number().optional(),
    affiliateLinks: s.array(s.object({
      brand: s.string(),
      url: s.string(),
      commission: s.string(),
    })).optional(),
    rating: s.number().min(1).max(10).optional(),
    price: s.number().optional(),
    status: s.enum(['stub', 'draft', 'published']).default('stub'),
  }).transform(data => ({ ...data, slugAsParams: data.slug }))
})

// Same schema for: comparisons, guides, health, best
export default defineConfig({
  root: 'content',
  output: { data: '.velite', assets: 'public/static' },
  collections: { reviews, comparisons, guides, health, best }
})
```

## Step 5 — Core SEO Components

### Metadata Generation (app/reviews/[slug]/page.tsx)
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const article = reviews.find(r => r.slug === params.slug)
  return {
    title: article.metaTitle,
    description: article.metaDescription,
    openGraph: { title: article.metaTitle, description: article.metaDescription },
    alternates: { canonical: `https://[domain].com/reviews/${params.slug}` }
  }
}
```

### JSON-LD Schema per Page Type
- Review pages: `Review` + `Product` schema
- Comparison pages: `Article` + `FAQPage` schema
- How-To pages: `HowTo` schema
- FAQ pages: `FAQPage` schema
- Roundup pages: `Article` + `ItemList` schema

## Step 6 — Install BMAD in Project
```bash
# Copy BMAD core from global install
BMAD_SRC="/home/hanzla/.nvm/versions/node/v24.7.0/lib/node_modules/bmad-method/bmad"
cp -r "$BMAD_SRC/core" ./bmad/
cp -r "$BMAD_SRC/_cfg" ./bmad/
cp -r "$BMAD_SRC/docs" ./bmad/
```

Create `bmad/config.yaml`:
```yaml
user_name: Hanzla
communication_language: English
document_output_language: English
output_folder: "{project-root}/docs"
project_name: [SiteName]
project_type: affiliate-content-site
domain: [domain].com
niche: [Niche Description]
```

## Step 7 — Create CLAUDE.md
```markdown
# [SiteName] — Project Instructions
[standard project instructions with niche, tech stack, content paths]
```

## Step 8 — Hand Off to BMAD
After site scaffolding is complete, activate BMAD master agent:
"BMAD is now installed. To continue building:
1. Open `/bmad/core/agents/bmad-master.md` in your Claude session
2. BMAD will guide you through: component building, content writing, deployment
3. Tell BMAD: 'Build the [SiteName] affiliate review site based on the research in /research/ and content stubs in /content/'"

## Design Theme — Maple Light
Every site built with this skill uses the Maple Light aesthetic:

**Color Palette:**
- Primary: `#C9622F` (burnt amber / maple)
- Dark: `#1C2B2D` (deep forest)
- Background: `#FAF6F1` (warm cream)
- Accent: `#E8A96A` (golden amber)
- Text: `#2D2D2D` (near black)

**Typography:**
- Headings: Playfair Display (serif, authoritative)
- Body: Inter (clean, readable)

**Design Principles:**
- Warm, natural, premium feel
- Cedar wood photography in heroes
- Clean white space
- Trust signals prominent (author bio, testing methodology, disclosure)
- No dark mode (warm cream is the vibe)
