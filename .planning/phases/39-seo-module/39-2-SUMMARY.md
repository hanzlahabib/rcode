---
sprint: 39.2
status: complete
commits:
  - 00311c85 feat(do-router): add SEO/content-site intent routing (#913)
key-files:
  - rcode/workflows/do.md
---

## What was built

Sprint 39.2 was found ALREADY IMPLEMENTED on `main` — shipped in commit `00311c85` on
2026-06-24, months before this sprint's SPRINT.md was picked up for execution. Issue
#913 was closed the same day. This SUMMARY documents the shipped state verified
against the sprint's acceptance criteria; no new implementation work was required.

### Story 39.2.1 — SEO routing block in do.md route table

`rcode/workflows/do.md` (546 lines) carries an 11-row `| **— SEO / Content intent —** |`
block (starting line 380) covering all 10 SEO disciplines named in the sprint: SEO
audit/recovery → `seo-audit`, per-page audit → `on-page-seo-auditor`, technical SEO/CWV
→ `technical-seo-checker`, keyword research/clustering → `seo-growth-orchestrator`
(delegates to `claude-seo:seo-cluster`), content briefs → `seo-content-writer`,
content factory/programmatic pages → `seo-content-factory`, site scaffolding →
`seo-site-builder`, local SEO/GBP/rank-and-rent → `rank-and-rent-local-seo` (delegates
to `claude-seo:seo-local`), schema markup → `claude-seo:seo-schema`, AI search/GEO/AEO
→ `claude-seo:seo-geo`, backlinks/link building → `seo-growth-orchestrator`. The block
is inserted before the generic `/rcode-quick` fallthrough row, and all pre-existing
rows (`rcode-debug`, `rcode-research-phase`, `rcode-add-phase`, etc.) are untouched —
no deletions, no reordering.

### Story 39.2.2 — PROJECT.md guard for SEO routes

A `> **SEO route guard:**` comment (line 378) precedes the SEO block, documenting that
SEO routes assume `.planning/PROJECT.md` exists and that the `HAS_PRD` check in
`<step name="check_project">` redirects to `/rcode-new-project` when absent. The
`greenfield_guard` table (line 216) carries the named row: `"run the content factory",
"cluster keywords", "brief location pages", "audit my SEO"` + `HAS_PRD=false` →
`/rcode-new-project`, inserted alongside the pre-existing rows (`"draft phases"`,
`"create stories"`, `"create milestones"`) without removing any of them.

## Verification results (this session, re-run against current main tip)

- `grep -c "seo-content-factory\|seo-growth-orchestrator\|seo-audit\|technical-seo-checker\|..."`
  on 10 distinct SEO skill names — all present, well over the ≥10 threshold
- `grep -q "cluster keywords"` / `"content factory"` / `"audit my SEO"` / `"ai search"` /
  `"backlinks"` — all pass
- Pre-existing rows (`rcode-debug`, `rcode-research-phase`, `rcode-add-phase`) — present, untouched
- `grep -q "SEO route guard"` / `"run the content factory.*cluster keywords.*brief location pages"` — pass
- `greenfield_guard` table's original rows (`"draft phases"` → `HAS_PRD=false`) — present, untouched
- `wc -l rcode/workflows/do.md` = 546 (well under 1000-line cap; sprint predicted ~470)
- Full `node --test` suite: 660/661 passing (the 1 failure is the same pre-existing,
  unrelated broken `@`-reference noted in 39-1-SUMMARY.md)
</content>
