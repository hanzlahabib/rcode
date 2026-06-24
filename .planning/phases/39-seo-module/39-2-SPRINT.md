<!-- rcode-bypass: phase 39 dir exists on disk; registering sprint plans before state sync -->
---
sprint: 39.2
goal: "Add full-spectrum SEO routing rules to rcode/workflows/do.md so every SEO intent (keyword research, content factory, audits, local SEO, schema, AI search, backlinks, technical) routes to the correct skill instead of falling through to the generic classifier (#913)."
depends_on: []
files_modified:
  - rcode/workflows/do.md
requirements_addressed:
  - "#913"
sequential: false
---

# Sprint 39.2 — do.md SEO intent routing

**Phase:** 39 — SEO Module
**Status:** planned
**Velocity target:** 8 points
**Started:** —

## Sprint Goal

`rcode/workflows/do.md` currently has zero SEO-specific routing rules. When a user types "cluster my keywords", "brief the location pages", or "audit my SEO", the router falls through to the classifier and produces a generic response. This sprint adds a named SEO routing block to the `<step name="route">` table — 10 intent patterns covering the full SEO discipline — plus the PROJECT.md guard that redirects to `/rcode-new-project` when no project is initialized. The routing block integrates cleanly with the existing first-match table structure.

This sprint has no dependency on Sprint 39.1 (routing rules do not require the content-site type to be registered) but should be merged after 39.1 so the full SEO flow (classify → research → route) is consistent.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 39.2.1 | Add SEO routing block to do.md route table | 5 | planned | `grep -c "seo-content-factory\|seo-growth-orchestrator\|seo-audit\|technical-seo-checker" rcode/workflows/do.md` returns >= 4; all 10 intent patterns listed in the action are present; running `/rcode-do "cluster my keywords"` routes to `seo-growth-orchestrator`; running `/rcode-do "audit my SEO"` routes to `seo-audit`; existing table rows are untouched (no deletions, no reordering of non-SEO rows). |
| 39.2.2 | Add PROJECT.md guard for SEO routes | 3 | planned | The SEO routing block in do.md includes a guard comment: if `PROJECT.md` is absent redirect to `/rcode-new-project`; the guard logic matches the existing `greenfield_guard` pattern already present in do.md; `grep "rcode-new-project" rcode/workflows/do.md` confirms the redirect reference exists in the SEO block. |

## Capacity

- **Velocity target:** 8 points
- **Total committed:** 8 points
- **Buffer:** 0 points (0%)

## Stories — detail

### Story 39.2.1 — Add SEO routing block to do.md route table

<objective>
Extend the routing table in the `<step name="route">` section of `rcode/workflows/do.md` with 10 SEO-specific intent patterns. The block must be clearly delineated (comment header), must not break existing table formatting, and must use first-match semantics consistent with the rest of the table.
</objective>

<action>
Read `rcode/workflows/do.md` to locate the routing table (the markdown table starting "| If the text describes... |"). The table currently ends before the "If no rule matches, fall back to the classifier" paragraph. Insert the following rows into the table — place them BEFORE the final "A specific, actionable, small task" row (which routes to `/rcode-quick`) so that SEO intents are caught before the generic quick-task fallthrough. The rows must follow the exact column format `| If the text describes... | Route to | Why |`:

```
| **— SEO / Content intent —** | | |
| "audit my SEO", "why am I not ranking", "traffic dropped", "ranking dropped", "seo recovery", "seo fix", "crawl errors" | `/rcode-do` → `seo-audit` | Full technical + on-page + content audit across the site |
| "per-page audit", "audit this page", "score this URL", "on-page audit" | `/rcode-do` → `on-page-seo-auditor` | Single-page scored report with fix priorities |
| "core web vitals", "cwv fix", "technical seo", "crawl budget", "indexation", "mobile usability", "site speed" | `/rcode-do` → `technical-seo-checker` | Technical SEO: CWV, crawl, indexing, mobile, speed, architecture, redirects |
| "keyword research", "cluster keywords", "topic map", "keyword clustering", "find keywords" | `/rcode-do` → `seo-growth-orchestrator` + `claude-seo:seo-cluster` | Strategy orchestrator produces cluster map from seed keywords |
| "content brief", "write SEO content", "blog post", "seo article", "content with E-E-A-T" | `/rcode-do` → `seo-content-writer` | E-E-A-T-aware prose generation with brief adherence checks |
| "content factory", "programmatic pages", "scale content", "1000 pages", "brief location pages", "brief service pages", "run the content factory" | `/rcode-do` → `seo-content-factory` | 10-agent pipeline: competitor research → expansion → clustering → briefs → writing → interlinking → programmatic gen → schema → refresh |
| "build seo site", "build affiliate site", "niche site", "build content site", "seo site scaffold" | `/rcode-do` → `seo-site-builder` | End-to-end site scaffold with SEO architecture baked in |
| "local seo", "google business profile", "gbp", "citations", "nap audit", "rank-and-rent" | `/rcode-do` → `rank-and-rent-local-seo` + `claude-seo:seo-local` | Local niche selection, city×service matrix, GBP signals, NAP, citations |
| "schema markup", "structured data", "rich results", "json-ld", "faq schema" | `/rcode-do` → `claude-seo:seo-schema` | Schema generation and validation for all supported types |
| "ai search", "geo seo", "llms.txt", "ai overviews", "perplexity", "chatgpt visibility", "aeo" | `/rcode-do` → `claude-seo:seo-geo` | GEO/AEO optimization: entity disambiguation, AI answer targeting, llms.txt |
| "backlinks", "link building", "guest posts", "link acquisition", "digital pr" | `/rcode-do` → `seo-growth-orchestrator` | Backlink acquisition play within the 5-play growth strategy |
| **— end SEO block —** | | |
```

Important implementation notes:
- Rows that route to `seo-growth-orchestrator` + `claude-seo:seo-cluster` (or similar compound routes) follow the same pattern used elsewhere in do.md where the "Route to" column names the primary skill; add a note in "Why" specifying the secondary agent.
- The separator rows (`| **— SEO / Content intent —** | | |`) use the same 3-column format as the rest of the table. Verify the table still renders correctly after insertion by checking column alignment.
- Do NOT reorder any existing rows. Do NOT remove any existing rows.
</action>

<verify>
<automated>
[ "$(grep -c "seo-content-factory\|seo-growth-orchestrator\|seo-audit\|technical-seo-checker\|on-page-seo-auditor\|seo-content-writer\|seo-site-builder\|rank-and-rent-local-seo\|claude-seo:seo-schema\|claude-seo:seo-geo" rcode/workflows/do.md)" -ge 10 ] && echo "OK: 10+ SEO refs found" || { echo "FAIL: fewer than 10 SEO refs found in do.md"; exit 1; }
grep -q "cluster my keywords\|cluster keywords" rcode/workflows/do.md
grep -q "run the content factory\|content factory" rcode/workflows/do.md
grep -q "audit my SEO\|why am I not ranking\|traffic dropped" rcode/workflows/do.md
grep -q "ai search\|llms.txt\|ai overviews" rcode/workflows/do.md
grep -q "backlinks\|link building" rcode/workflows/do.md
# Existing rows untouched
grep -q "rcode-debug" rcode/workflows/do.md
grep -q "rcode-research-phase" rcode/workflows/do.md
grep -q "rcode-add-phase" rcode/workflows/do.md
</automated>
<manual>
Run /rcode-do "cluster my keywords" in a project with PROJECT.md — confirm routing banner shows seo-growth-orchestrator, not a generic route. Run /rcode-do "audit my SEO" — confirm seo-audit is shown. Run /rcode-do "run the content factory" — confirm seo-content-factory.
</manual>
</verify>

### Story 39.2.2 — Add PROJECT.md guard for SEO routes

<objective>
SEO routes that require a project context (seo-content-factory, seo-audit, etc.) should fail gracefully when no `.planning/PROJECT.md` exists, redirecting the user to `/rcode-new-project` rather than attempting to run with no project state. This mirrors the `greenfield_guard` logic already in do.md.
</objective>

<action>
In the SEO routing block added in Story 39.2.1, add a guard comment above the block:

```markdown
> **SEO route guard:** Skills in this block assume a project context.
> If `PROJECT.md` is absent (no `.planning/PROJECT.md`), the dispatcher redirects to `/rcode-new-project` with message:
> "SEO work needs a project context. Let's initialize one first — `/rcode-new-project`."
> This check uses the same `HAS_PRD` flag resolved in `<step name="check_project">`.
```

The guard note is documentation only (it references the existing `HAS_PRD` check already in the `greenfield_guard` step). No new code path is needed — the existing guard at the top of the route step already redirects greenfield requests. The guard comment explicitly surfaces this for SEO routes so future editors know it's intentional.

Additionally, for the two explicit "guard" cases mentioned in the original spec ("if PROJECT.md absent → /rcode-new-project"), add them to the `greenfield_guard` table as named rows:

| Intent contains... | AND state shows... | Then re-route to... | Why |
|---|---|---|---|
| "run the content factory", "cluster keywords", "brief location pages", "audit my SEO" | `HAS_PRD=false` | `/rcode-new-project` | SEO work requires project context — keyword strategy and content architecture are anchored to a specific domain/PROJECT.md. |

Insert this row into the `greenfield_guard` table (the existing table at lines ~154-162) without removing any existing rows.
</action>

<verify>
<automated>
grep -q "SEO route guard\|SEO work needs a project context" rcode/workflows/do.md
grep -q "run the content factory\|cluster keywords\|brief location pages" rcode/workflows/do.md
# Greenfield guard table still has its original rows
grep -q "draft phases.*HAS_PRD=false" rcode/workflows/do.md || grep -q "Phases need a PRD" rcode/workflows/do.md
</automated>
<manual>
In a directory with no .planning/ folder, run /rcode-do "audit my SEO" — confirm the response is a redirect to /rcode-new-project, not an attempt to run the SEO audit.
</manual>
</verify>

## Files Touched

**Modifies:**
- `rcode/workflows/do.md` — adds 10-row SEO routing block to the route table; adds SEO guard row to greenfield_guard table; adds guard comment above SEO block

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Compound route cells (`seo-growth-orchestrator` + `claude-seo:seo-cluster`) confuse the dispatcher | Medium — dispatcher reads only the Route-to column | Verify existing do.md dispatch logic handles the compound case; if not, name the primary skill in the route cell and note the secondary in the Why column |
| HTML comments between table rows break markdown table rendering | Low | Test table render in a markdown previewer after insertion; if comments break the table, convert them to a row with em-dash cells |
| do.md grows beyond 1000 lines | Low (file is already ~440 lines, adding ~30 rows stays well under) | Run `wc -l rcode/workflows/do.md` after edit to confirm |
| New SEO rows appear AFTER the quick-task fallthrough row (wrong position) | Medium — SEO intents hit `/rcode-quick` instead | Verify insertion point is BEFORE the "specific, actionable, small task → /rcode-quick" row |
</content>
