<!-- rcode-bypass: phase 39 dir exists on disk; registering sprint plans before state sync -->
---
sprint: 39.1
goal: "Add the content-site project type to project-types.yaml and update rcode-project-researcher to branch on it — enabling keyword-first discovery for any SEO project (#911, #912)."
depends_on: []
files_modified:
  - rcode/references/project-types.yaml
  - rcode/agents/rcode-project-researcher.md
requirements_addressed:
  - "#911"
  - "#912"
sequential: false
---

# Sprint 39.1 — content-site project type + researcher branching

**Phase:** 39 — SEO Module
**Status:** planned
**Velocity target:** 10 points
**Started:** —

## Sprint Goal

Two tightly-coupled source changes that together teach rcode what a content/SEO project is, for the full SEO discipline — not just rank-and-rent. Story 39.1.1 lands the `content-site` YAML entry (broad signals spanning local SEO, affiliate, technical SEO, content factory, AI search optimization, and more) so `/rcode-new-project` correctly classifies any SEO project instead of falling through to `web-app`. Story 39.1.2 adds the conditional branch in `rcode-project-researcher.md` so that when `project_type == content-site` the researcher produces `KEYWORDS.md` + `CLUSTERS.md` instead of `STACK.md`/`ARCHITECTURE.md`, delegates to the appropriate SEO agents, and populates `PITFALLS.md` with SEO-specific entries.

These two stories can be authored in parallel; integration is verified via the acceptance criteria of 39.1.1 (classifier smoke test) and 39.1.2 (researcher output check).

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 39.1.1 | Add full-spectrum `content-site` entry to project-types.yaml | 4 | planned | `grep 'content-site' rcode/references/project-types.yaml` returns the entry; signals cover the 8 SEO verticals listed in the action; all 5 `required_sections` present; `skip_sections` includes `authentication`, `state-management`, `authorization`; 6 discovery questions present; YAML parses without error; running `/rcode-new-project` with an SEO-flavored description classifies as `content-site`. |
| 39.1.2 | Branch rcode-project-researcher on content-site | 6 | planned | `rcode/agents/rcode-project-researcher.md` contains a `## content-site Mode` section; branch fires on `project_type == content-site`; lists `KEYWORDS.md`, `CLUSTERS.md`, `SUMMARY.md`, `PITFALLS.md` as outputs; references `seo-growth-orchestrator` and `claude-seo:seo-cluster` for delegation; PITFALLS.md has at minimum 3 SEO-specific entries (thin content, canonical drift, noindex strategy); the generic 5-file table (STACK.md, ARCHITECTURE.md, FEATURES.md, SUMMARY.md, PITFALLS.md) is untouched for all other project types. |

## Capacity

- **Velocity target:** 10 points
- **Total committed:** 10 points
- **Buffer:** 0 points (0%)

## Stories — detail

### Story 39.1.1 — Add full-spectrum `content-site` entry to project-types.yaml

<objective>
Append a `content-site` project type to `rcode/references/project-types.yaml` (currently 271 lines, 8 entries ending at `dev-tool`). The signals must cover the full SEO discipline so any user who mentions blog, affiliate, local SEO, technical SEO audit, keyword research, AI search, programmatic pages, or backlink work gets classified correctly instead of hitting `web-app`.
</objective>

<action>
Open `rcode/references/project-types.yaml`. Read the file first to confirm line count and last entry. Append after the closing line of `dev-tool` — do NOT modify any existing entry. Add:

```yaml
content-site:
  display_name: "Content / SEO Site"
  signals:
    # Niche and local plays
    - rank-and-rent
    - lead-gen
    - local seo
    - location pages
    - service pages
    - google business profile
    - gbp
    - citations
    - nap
    # Programmatic and content factory
    - programmatic seo
    - content site
    - content farm
    - content factory
    - programmatic pages
    # Affiliate and publisher
    - affiliate
    - affiliate site
    - affiliate marketing
    - review site
    - comparison site
    - niche site
    - blog
    - blogging
    - editorial
    - news site
    # E-commerce and SaaS SEO
    - e-commerce seo
    - product seo
    - category pages
    - collection pages
    - saas seo
    - b2b seo
    - thought leadership
    - pillar content
    # Link building
    - link building
    - backlink acquisition
    - guest posting
    # Technical SEO
    - technical seo
    - site audit
    - crawl fix
    - indexation
    - core web vitals
    - cwv
    # Keyword and content strategy
    - keyword research
    - keyword clustering
    - topic clustering
    - content strategy
    - content calendar
    - seo site
    - content marketing
    # Schema and structured data
    - schema markup
    - structured data
    - rich results
    # AI search
    - ai search
    - geo
    - aeo
    - ai overviews
    - llms.txt
    - chatgpt visibility
    - perplexity optimization
    # International
    - international seo
    - hreflang
    - multilingual seo
    # Recovery
    - seo audit
    - seo fix
    - seo recovery
    - traffic drop
    - ranking drop
  required_sections:
    - keyword-strategy
    - programmatic-page-matrix
    - internal-link-plan
    - schema-plan
    - content-quality-gates
  skip_sections:
    - authentication
    - state-management
    - authorization
  discovery_questions:
    - "What is the primary keyword intent and SEO vertical? (local, affiliate, technical audit, content factory, international, AI search)"
    - "Do you need a programmatic page matrix? (city × service, product × attribute, category × location)"
    - "Who are the top 3 organic competitors and what is their estimated DR/DA?"
    - "Do you have Google Search Console access for an existing domain, or is this a new site?"
    - "What is your content quality gate? (E-E-A-T threshold, word count minimum, originality check)"
    - "Which schema types do you need? (LocalBusiness, FAQPage, HowTo, Product, Article, BreadcrumbList)"
```

After appending, confirm syntax with:
```bash
python3 -c "import yaml; yaml.safe_load(open('rcode/references/project-types.yaml'))" && echo "YAML OK"
```
</action>

<verify>
<automated>
grep -q "^content-site:" rcode/references/project-types.yaml
grep -q "rank-and-rent" rcode/references/project-types.yaml
grep -q "ai search" rcode/references/project-types.yaml
grep -q "keyword-strategy" rcode/references/project-types.yaml
grep -q "authentication" rcode/references/project-types.yaml
python3 -c "import yaml; d=yaml.safe_load(open('rcode/references/project-types.yaml')); ct=d['content-site']; assert len(ct['discovery_questions'])==6; assert 'authentication' in ct['skip_sections']; assert 'keyword-strategy' in ct['required_sections']; print('OK')"
grep -q "^web-app:" rcode/references/project-types.yaml
grep -q "^api-backend:" rcode/references/project-types.yaml
</automated>
<manual>
Simulate classifier: present description "I want to build a rank-and-rent mobile repair site for Abu Dhabi with location pages" to /rcode-new-project and confirm project type shown is content-site. Repeat with "I need to fix my crawl errors and Core Web Vitals" — must also classify as content-site.
</manual>
</verify>

### Story 39.1.2 — Branch rcode-project-researcher on content-site

<objective>
Add a conditional branch to `rcode/agents/rcode-project-researcher.md` that fires when `project_type == content-site`. The branch replaces the generic 5-file output with a keyword-first set: `KEYWORDS.md`, `CLUSTERS.md`, `SUMMARY.md`, `PITFALLS.md` (SEO-specific). The generic mode remains untouched for all other project types.
</objective>

<action>
Read the full current file before editing. The file has a `## Workflow` section with 6 numbered steps; step 5 produces the 5 generic files (SUMMARY.md, STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md).

At the top of the `## Workflow` section add a one-line note:
> "When `project_type == content-site`, skip step 5 and follow `## content-site Mode` instead."

After the existing `## Anti-Patterns / Refuse List` section, append a new `## content-site Mode` section containing:

1. **Trigger** — "Active when the orchestrator invokes this agent with `project_type: content-site` in the execution context."

2. **Output file table:**

   | File | Purpose |
   |------|---------|
   | `KEYWORDS.md` | Search intent map: head terms, long-tail variants, volume/difficulty estimates, intent classification (TOFU/MOFU/BOFU) |
   | `CLUSTERS.md` | Topic cluster architecture: pillar pages, spoke pages, internal-link anchor text map |
   | `SUMMARY.md` | Phase structure recommendations (same role as generic SUMMARY.md) |
   | `PITFALLS.md` | SEO-specific risk flags (see entries below) |

3. **Delegation rules:**
   - Produce `KEYWORDS.md` by delegating to `seo-growth-orchestrator`. Pass the discovery answers (GSC access, competitors, intent vertical) as context.
   - Produce `CLUSTERS.md` by delegating to `claude-seo:seo-cluster`. Pass the head terms from `KEYWORDS.md` as input.
   - If either agent is unavailable (plugin not installed), produce the files from first principles: WebSearch the top 3 SERP competitors, extract their URL patterns and H1s, and construct the cluster map manually. Flag `[NO PLUGIN — MANUAL]` at the top of the affected file.

4. **PITFALLS.md mandatory SEO entries** (always include, plus any domain-specific risks found):
   - **Thin content risk** — pages lacking E-E-A-T signals (expertise, experience, authoritativeness, trust) underperform; enforce minimum word count + first-person experience markers in content briefs.
   - **Canonical drift** — programmatic page generation at scale creates duplicate canonical issues when the CMS does not enforce canonical tags; add crawl-integrity gate to QA checklist.
   - **Noindex strategy** — staging, parameter, and faceted URLs must be noindexed before launch; include pre-launch noindex audit in phase plan.
   - **Internal link orphans** — pages with no internal links are effectively invisible; require internal-link audit step in content QA.
   - **Schema validation gap** — schema markup added without validation against Google's Rich Results Test fails silently; add schema validation to definition of done.

5. **Anti-patterns for content-site mode** (add to existing Anti-Patterns section or create mode-specific list):
   - Never produce `STACK.md` or `ARCHITECTURE.md` for a content-site project — framework choice is secondary to keyword strategy and can be decided in Phase 1 planning.
   - Never skip the GSC access discovery question — existing search data is the highest-value input; a site with GSC data requires a completely different research approach than a greenfield site.
   - Never omit PITFALLS.md — content sites have a distinct failure mode profile (thin content, canonical issues, link orphans) not covered by generic pitfalls.

The generic workflow steps 1–6 and the generic 5-file table must remain fully intact below this new section.
</action>

<verify>
<automated>
grep -q "content-site Mode" rcode/agents/rcode-project-researcher.md
grep -q "KEYWORDS.md" rcode/agents/rcode-project-researcher.md
grep -q "CLUSTERS.md" rcode/agents/rcode-project-researcher.md
grep -q "seo-growth-orchestrator" rcode/agents/rcode-project-researcher.md
grep -q "claude-seo:seo-cluster" rcode/agents/rcode-project-researcher.md
grep -q "Thin content" rcode/agents/rcode-project-researcher.md
grep -q "Canonical drift" rcode/agents/rcode-project-researcher.md
grep -q "Noindex" rcode/agents/rcode-project-researcher.md
grep -q "Internal link orphans" rcode/agents/rcode-project-researcher.md
# Generic mode untouched
grep -q "STACK.md" rcode/agents/rcode-project-researcher.md
grep -q "ARCHITECTURE.md" rcode/agents/rcode-project-researcher.md
grep -q "FEATURES.md" rcode/agents/rcode-project-researcher.md
# Line count under 1000
wc -l rcode/agents/rcode-project-researcher.md | awk '{if($1>999) exit 1; else print "line count OK: "$1}'
</automated>
<manual>
Confirm the generic 5-file table (SUMMARY.md, STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md) is still present. Confirm the new section is clearly labeled as conditional and does not replace the generic steps — it is an addendum/branch.
</manual>
</verify>

## Files Touched

**Modifies:**
- `rcode/references/project-types.yaml` — appends `content-site` entry after line 271
- `rcode/agents/rcode-project-researcher.md` — adds `## content-site Mode` conditional section; adds one-line branch note at top of `## Workflow`

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| YAML syntax error breaks all project-type detection | High | Run `python3 -c "import yaml; yaml.safe_load(...)"` immediately after append; verify output |
| Signal overlap: Next.js + "blog" description matches web-app then content-site | Medium | content-site signals are content-domain phrases that don't appear in web-app signal list; classifier uses signal count — "blog" alone won't override web-app if no other SEO signals are present |
| content-site Mode section causes researcher file to exceed 1000 lines | Medium | Read current line count before writing; if adding the section would push past 900 lines, extract to `.rcode/agents-rules/project-researcher/content-site-mode.md` and reference it via the on-demand rule pattern already present in the file |
</content>
