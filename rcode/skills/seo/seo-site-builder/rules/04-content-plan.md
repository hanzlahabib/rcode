# Rule: Content Plan & Article Stubs

## When to Run
After article-schedule.md is finalized with real keyword data

## Step 1 — Create Content Directory Structure
```
/content/
├── reviews/        ← single product/model reviews
├── comparisons/    ← brand-vs-brand, type-vs-type
├── guides/         ← buying guides, how-to, educational
├── health/         ← use-case articles (condition-specific)
└── best/           ← roundup / best-of lists (money pages)
```

## Step 2 — Generate MDX Stubs for First 20 Articles
For each article in Tier 1 + Tier 2 of article-schedule.md, create a stub file.

File naming: `content/[type]/[slug].mdx`

**MDX Frontmatter Template:**
```mdx
---
title: "[Full SEO Title Here]"
slug: "[url-slug]"
type: "review|comparison|guide|health|best"
keyword: "[exact target keyword]"
metaTitle: "[Title under 60 chars for Google]"
metaDescription: "[Description 140-160 chars with keyword]"
publishDate: "[YYYY-MM-DD based on schedule]"
status: "stub"
wordCountTarget: [1500-5000 based on type]
affiliateLinks:
  - brand: "[Brand Name]"
    url: "[affiliate URL placeholder]"
    commission: "[X%]"
internalLinks:
  - "[related article slug 1]"
  - "[related article slug 2]"
imageRequired: true
imagePomptFile: "assets/image-prompts/[slug]-images.md"
---

## [H2: Main Section Title]

[STUB: Write 2000-word expert review covering: specs, EMF levels, wood quality, heating performance, assembly, verdict]

## Pros & Cons

**Pros:**
- [STUB]

**Cons:**
- [STUB]

## Verdict

[STUB: Final recommendation with affiliate CTA]
```

## Step 3 — Image Handling (Two Strategies)

For EVERY article, handle images using ONE of these two strategies:

### Strategy A — Download Real Product Images (Preferred for Reviews)
Use browser tool to find and download actual product images:
1. Open Google Images: search `[product name] official product photo`
2. Search brand's official website for press/product images
3. Search Amazon listing for the product — use main product photos
4. Download to: `public/images/[slug]/`
   - `hero.jpg` — main product exterior shot
   - `detail.jpg` — close-up or interior shot
   - `specs.jpg` — specs sheet or comparison image if available

**When to use Strategy A:**
- Product review articles (real product photos = more trust + E-E-A-T)
- Brand overview articles
- Any article where real product imagery exists online

**Browser tool commands:**
```
1. Navigate to Google Images
2. Search: "[Brand] [Model] product photo official"
3. Filter: Large size, labeled for reuse if possible
4. Save image to correct path
```

### Strategy B — AI Generation Prompt File (For Infographics, Cards, Pinterest)
Create `/assets/image-prompts/[slug]-images.md` with detailed prompts:

```markdown
# Image Prompts: [Article Title]
# Place generated images at the exact paths specified below

## Image 1 — Hero (if no real product photo found)
**Place at:** public/images/[slug]/hero.jpg
**Prompt:** Professional product photography of [product description],
warm cedar wood interior background, soft diffused natural lighting,
premium lifestyle feel, no text, 1200x630px, high-end editorial quality,
warm amber and cream tones

## Image 2 — Verdict/Rating Card
**Place at:** public/images/[slug]/verdict-card.png
**Prompt:** Rating card graphic showing [X.X]/10 score,
product name "[Product Name]" in Playfair Display serif font,
warm Nordic minimal design, burnt amber (#C9622F) accent,
cream background (#FAF6F1), star rating icons, clean professional layout

## Image 3 — Pinterest Pin
**Place at:** public/images/[slug]/pinterest.jpg
**Prompt:** Tall Pinterest 2:3 ratio graphic (1000x1500px),
"[Article Headline]" text in Playfair Display,
warm sauna interior background, burnt amber banner bottom with site name,
premium editorial feel, high contrast for mobile readability

## Image 4 — Comparison Infographic (for comparison articles)
**Place at:** public/images/[slug]/comparison.png
**Prompt:** Clean two-column comparison infographic,
maple amber (#C9622F) vs dark forest (#1C2B2D) column headers,
cream background (#FAF6F1), Inter font body text,
professional data visualization, no stock photo people
```

**When to use Strategy B:**
- Comparison infographics (no real product photo needed)
- Rating/verdict cards
- Pinterest pins
- Any custom graphic that doesn't require a real product photo

### Decision Rule Per Article Type
| Article Type | Hero | Detail | Card | Pinterest |
|-------------|------|--------|------|-----------|
| Product Review | Strategy A | Strategy A | Strategy B | Strategy B |
| Comparison | Strategy B | Strategy A (both products) | Strategy B | Strategy B |
| How-To / FAQ | Strategy B | Strategy A (if product shown) | — | Strategy B |
| Roundup | Strategy B | Strategy A (top pick) | Strategy B | Strategy B |
| Use-Case/Health | Strategy B | Strategy A (product rec) | — | Strategy B |

## Step 4 — Internal Linking Map
Create `docs/internal-linking-map.md`:

```markdown
# Internal Linking Map

## Rule: All roads lead to money pages

### Money Pages (receive most links)
- /best/infrared-sauna-for-home ← linked from: all reviews, all comparisons
- /best/sauna-blanket ← linked from: all blanket reviews, portable comparisons

### Hub Pages (give and receive links)
- /brands/[brand-name] ← linked from all model reviews of that brand
- /guides/buyers-guide ← linked from all Tier 1-2 articles

### Spoke Pages (give links upward)
- /reviews/[model] → links to: brand hub, most relevant roundup, 1-2 comparisons
- /health/[condition] → links to: 2-3 model reviews, buyers guide

### Anchor Text Rules
✅ Use: natural phrases ("best for arthritis", "see our full review", "compared here")
❌ Avoid: exact match anchors ("best infrared sauna") — triggers over-optimization
❌ Avoid: generic anchors ("click here", "read more")
```

## Step 5 — Interactive Gate
After stubs + image prompts created:
"Content stubs ready for [N] articles.
Image prompts saved to assets/image-prompts/ — get them generated and place at paths specified.

Want to:
1. Continue to site build (Next.js setup)
2. Research the next niche idea
3. Write full content for Article #1 now"
