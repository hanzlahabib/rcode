# Audit: rihal/Rihal/RIHAL References — docs, examples, tests, planning

**Branch:** audit-rihal-docs-tests  
**Scope:** docs/, examples/, README.md, AGENTS.md, CLAUDE.md, CONTRIBUTING.md, DOCS.md, MIGRATIONS.md, SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md, .planning/ (active only), test/  
**Mode:** PURE AUDIT — no fixes

---

## Summary counts

| Area | Hits |
|------|------|
| Root docs (README, AGENTS, CLAUDE, CONTRIBUTING, DOCS, MIGRATIONS, SECURITY, CODE_OF_CONDUCT) | 16 |
| CHANGELOG.md | ~20 (v4.0.0 section intentional; 5 in v3.x sections) |
| docs/ | 39 |
| examples/ | 3 |
| test/ | 0 |
| .planning/ (active) | 29 |
| **Total** | **~107** |

---

## INT-COMPANY — Rihal company / Oman context

References to https://rihal.om (the unrelated Omani tech company, intentionally preserved per v4.0.0 release notes).

| File | Line | Text |
|------|------|------|
| README.md | 165 | `[rcode](https://rihal.om) is also one of Oman's fastest-growing tech companies — naming inspiration, not commercial affiliation.` |
| CHANGELOG.md | 19 | `Preserved intentionally: hanzlahabib/rihal-code GitHub repo URL, https://rihal.om (Omani company, unrelated)…` |
| docs/ROADMAP.md | 52 | `Goal: Rihalians install from an internal source, not GitHub. Faster, access-controlled, audit-trailed.` (Rihalian as persona, company-linked) |

**Verdict:** All intentional and documented. No action needed.

---

## INT-REPO-URL — hanzlahabib/rihal-code GitHub URL

The GitHub repo was not renamed after the v4 brand cutover; the URL is intentionally preserved.

| File | Lines |
|------|-------|
| README.md | 13, 84 |
| DOCS.md | 1058 |
| AGENTS.md | scope list (`rihal-tools`) |
| CLAUDE.md | scope list (`rihal-tools`) |
| CHANGELOG.md | 302, 762, 835, 839, 1112, 1189 |
| docs/pre-demo-checklist.md | 9, 12, 23, 77 |
| docs/verification/v2.0-gap-fixes.md | 3 |
| docs/adr/0003-mcp-server-for-rcode-brain.md | 7 |
| .planning/PROJECT.md | 44, 49, 51 |
| .planning/summaries/v2-improvements/plan-06-module-system.md | 122 |

**Verdict:** All intentional. The repo URL is the canonical reference and is documented as preserved in CHANGELOG.md:19.

---

## INT-DOCSTRING-NOTE — Etymology / naming note

| File | Line | Text |
|------|------|------|
| CHANGELOG.md | 19 | `Arabic etymology terms رحّال / طريقة رحال` — preserved intentionally |
| README.md | 165 | naming-inspiration note |

**Verdict:** Intentional, one-per-document, clearly scoped. No action needed.

---

## INT-PLANNING-HIST — Historical references in completed phase docs

Completed planning artifacts that mention `rihal` in a historical context.

| File | Line | Text |
|------|------|------|
| .planning/summaries/v2-improvements/plan-06-module-system.md | 52, 70, 76, 122 | `rihal_tools_commands` key in a v2-era module-system plan; `@hanzlahabib/rihal-code` install command in the same doc |
| .planning/phases/33-dashboard-command-runner/33-REVIEW.md | 40 | `/RIHAL-INIT` used as a blocked-command example in the REVIEW |

**Verdict:** These are completed phases / archived summaries; content is historical, not user-facing. Low priority, but the `rihal_tools_commands` key in `plan-06-module-system.md` is a v2-era YAML key that was never implemented under that name — readers could be confused by it if they stumble on it. Tagged GAP-PLANNING-ACTIVE (see below) for the milestones that are still ACTIVE.

---

## GAP-ARABIC-DOC — "Rihalian" used as tool-name persona in user-facing docs

`Rihalian` (capital R, company-employee connotation) appears throughout `docs/what-is-rcode-code.md`, `docs/USP.md`, `docs/adr/0003-mcp-server-for-rcode-brain.md`, `docs/ROADMAP.md`, `CHANGELOG.md`, and `.planning/milestones/M1-ship-v2/`.

| File | Lines | Concern |
|------|-------|---------|
| docs/what-is-rcode-code.md | 5, 15, 17, 23, 24, 48, 61, 74, 83 | 9 occurrences; public-facing "what is" doc uses `Rihalian` as the primary audience descriptor |
| docs/USP.md | 5, 198 | Positions the tool as "for Rihalians" and cites "real Rihal projects" |
| docs/adr/0003-mcp-server-for-rcode-brain.md | 13, 17, 19, 21, 34, 52, 68, 83, 96, 110, 112, 117, 122 | 13 occurrences in an ACTIVE ADR |
| docs/ROADMAP.md | 3, 46, 52, 55 | Public roadmap describes audience as Rihalians |
| CHANGELOG.md | 758, 808 | v2.0 entry describes the repositioning as "for Rihalians" |

**Gap:** `Rihalian` is company-internal jargon. The v4.0.0 release positioned rcode as a public open-source tool, but the user-facing docs still frame the primary audience as Rihalians — which is exclusionary and confusing to non-company users who are explicitly welcomed at `docs/what-is-rcode-code.md:24` (`Curious non-Rihalians…`). The ADR (0003) is particularly exposed since it's an active design document.

---

## GAP-DEAD-EXAMPLE — `rihal-` / `RIHAL` in example commands shown to users

| File | Line | Text |
|------|------|------|
| examples/rental-app-walkthrough.md | 54 | ` RIHAL ► COUNCIL SESSION — listings search backend` (banner in a simulated terminal output block) |
| examples/rental-app-walkthrough.md | 139 | `RIHAL ► STATUS` (simulated `/rcode-status` output header) |
| examples/council-decision.md | 30 | ` RIHAL ► COUNCIL SESSION` (banner in example council session output) |

**Gap:** These are simulated terminal outputs in user-facing examples. The banner string `RIHAL ►` has not been updated to `RCODE ►` (or equivalent). A new user following the walkthrough will see `RIHAL ► STATUS` but the actual command output after v4.0.0 would show `RCODE ►`. This is a documentation regression.

---

## GAP-COUNT-DRIFT — References to old counts / versions

| File | Line | Text |
|------|------|------|
| CHANGELOG.md | 15 | `116 commands` renamed — if command count has changed since v4.0.0, this is stale |
| CHANGELOG.md | 15 | `All 45 agent and 85 skill names` — these counts are frozen in the release note; if any have been added/removed post-v4.0.0, these figures are drift candidates |
| CONTRIBUTING.md | 342 | `rihal-tools — legacy rihal-tools scope (pre-v4 rename); accepted for backward compatibility` — documents a legacy scope; acceptable but could mislead contributors into thinking `rihal-tools` is a current scope |

**Gap:** The agent/skill/command counts in v4.0.0 CHANGELOG are historical and intentional, so no fix needed there. However `CONTRIBUTING.md:342` actively instructs contributors that `rihal-tools` is a valid commit scope — this is a backward-compat note that is subtly prescriptive.

---

## GAP-USER-FACING-DOC — Banner strings / headlines with "Rihal"

(Overlaps with GAP-DEAD-EXAMPLE and GAP-ARABIC-DOC — consolidated here for the specific headline/banner category.)

| File | Line | Text |
|------|------|------|
| docs/ROADMAP.md | 17 | `### v4.0.0 — \`rihal-*\` → \`rcode-*\` rename + populated Memory Bank (current)` — headline is accurate history, not a gap |
| docs/pre-demo-checklist.md | 23 | `` git tag -a v4.0.0 -m "v4.0.0 — rihal->rcode rename + populated Memory Bank" `` — example git tag, intentional |

**Verdict:** No standalone GAP-USER-FACING-DOC items beyond those already tagged above.

---

## GAP-TEST-DATA — Test fixtures with "Rihal" strings

Scanned `test/` (all `.test.cjs` files): **0 occurrences** of "rihal"/"Rihal"/"RIHAL".

**Verdict:** Clean. No action needed.

---

## GAP-PLANNING-ACTIVE — `rihal/` in active planning docs (not completed phases)

| File | Line | Text |
|------|------|------|
| .planning/milestones/M1-ship-v2/MILESTONE.md | 11 | `any Rihalian engineer can pick up` — M1 milestone goal text |
| .planning/milestones/M1-ship-v2/phases/02-scaffold-skill/PLAN.md | 11 | `Enable Rihalians to bootstrap new projects…` |
| .planning/milestones/M1-ship-v2/ROADMAP.md | 35 | `Enable Rihalians to bootstrap new projects…` |
| .planning/PROJECT.md | 44, 49, 51 | `@hanzlahabib/rihal-code` npm package name + repo URL (intentional per INT-REPO-URL) |

**Gap:** M1 milestone documents are technically active (not in archive/) but describe a shipped milestone. The `Rihalian` persona wording in goal lines is stale relative to the v4.0.0 public positioning. The `.planning/PROJECT.md` references are the repo URL, which is intentional.

---

## GAP-CHANGELOG-NEW — `rihal` in entries added AFTER v4.0.0

v4.0.0 is at line 6 of CHANGELOG.md. v3.6.14 begins at line 78. The v4.0.0 section (lines 6–77) is the rename release itself — all `rihal` there are legitimate migration documentation.

Entries **after** v4.0.0 (v3.6.x and earlier in the file, which are **older** — file is newest-first):
- CHANGELOG.md:225 (v3.6.1): `16 stale @hanzlahabib/rihal-code references replaced` — historical, correct
- CHANGELOG.md:758 (v2.x): `installable context-brain for Rihalians` — older release, historical
- CHANGELOG.md:808 (v2.x): `bootstraps a new Rihalian project` — older release, historical
- CHANGELOG.md:835 (v2.x): `for Rihalians` — older release, historical
- CHANGELOG.md:1112/1189: repo URL references — intentional

**Verdict:** All v3.x/v2.x entries predate v4.0.0 chronologically. No post-v4.0.0 changelog entries introduce new `rihal` references. Clean.

---

## GAP-ADR — `rihal` in active ADRs

| File | Status | Occurrences | Concern |
|------|--------|-------------|---------|
| docs/adr/0003-mcp-server-for-rcode-brain.md | Active (no superseded marker) | 13 | Uses `Rihalian` throughout as primary audience term |
| docs/adr/0001-github-sync-as-cli.md | No rihal refs | 0 | Clean |
| docs/adr/0002-pivot-to-skill-driven-state.md | No rihal refs | 0 | Clean |

**Gap:** ADR-0003 is an active decision record for the v5.0 MCP server design. It uses `Rihalian` 13 times to describe the target user. As a public open-source ADR this leaks internal company framing into design rationale that external contributors would read.

---

## Quick-fix candidates (prioritized)

| Priority | Tag | Location | Description |
|----------|-----|----------|-------------|
| P1 | GAP-DEAD-EXAMPLE | examples/rental-app-walkthrough.md:54,139 | `RIHAL ►` banners in simulated output — wrong after v4.0.0 |
| P1 | GAP-DEAD-EXAMPLE | examples/council-decision.md:30 | Same |
| P2 | GAP-ARABIC-DOC | docs/what-is-rcode-code.md (9×) | `Rihalian` as primary audience in public-facing "what is" doc |
| P2 | GAP-ADR | docs/adr/0003-mcp-server-for-rcode-brain.md (13×) | `Rihalian` throughout active ADR |
| P3 | GAP-PLANNING-ACTIVE | .planning/milestones/M1-ship-v2/ (3 files) | `Rihalian` in shipped milestone goal text |
| P3 | GAP-COUNT-DRIFT | CONTRIBUTING.md:342 | `rihal-tools` legacy scope note |

---

*Audit complete. 0 fixes applied.*
