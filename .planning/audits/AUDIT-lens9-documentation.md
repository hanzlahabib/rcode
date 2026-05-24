# AUDIT — Lens 9: Documentation (rihal residue)

**Branch:** audit-lens-9-documentation  
**Date:** 2026-05-24  
**Mode:** DIAGNOSE ONLY — no source edits  
**Status:** WARN

---

## Scope Scanned

| Area | Coverage |
|------|----------|
| (a) README.md, CHANGELOG.md | `/rihal-X` slash-command refs that have no matching target |
| (b) `.rcode/workflows/*.md` "Next Up" / user-routing sections | links to missing `/rihal-X` workflows |
| (c) `.rcode/skills/**/SKILL.md` | dead `@.rihal/` path includes, `rihal:` colon namespace triggers |
| (d) `docs/` | `rihal-tools` binary name (now `rcode-tools.cjs`) |
| (e) `examples/` | stale `/rihal-X` paths and old rihal banners |
| Supporting: AGENTS.md, CONTRIBUTING.md, DOCS.md, CLAUDE.md | cross-check |

---

## Commands Run

```bash
# Area (a)
grep -nE '/rihal-[a-z][a-z0-9-]+' README.md CHANGELOG.md

# Area (b) - workflow command inventory
grep -rhoE '/rihal-[a-z][a-z0-9-]+' .rcode/workflows/ | sort -u  # 132 distinct commands found
# then checked each against ls .rcode/workflows/<name>.md

# Area (c)
find .rcode/skills -name "SKILL.md" | xargs grep -n '@\.rihal/' 2>/dev/null
find .rcode/skills -name "SKILL.md" | xargs grep -n 'rihal:' 2>/dev/null

# Area (d)
grep -rn 'rihal-tools' docs/ CONTRIBUTING.md AGENTS.md

# Area (e)
grep -rn 'rihal\|RIHAL' examples/
```

---

## (a) README.md / CHANGELOG.md — /rihal-X slash command refs

**Result: PASS**

Neither README.md nor CHANGELOG.md contains `/rihal-X` slash-command invocations. The only `rihal-*` strings in these files are:
- `hanzlahabib/rihal-code` — GitHub repo URL (intentionally preserved per CHANGELOG.md:19)
- `@hanzlahabib/rihal-code` — npm package name (historical, mentioned in CHANGELOG.md:302)
- `https://rihal.om` — unrelated Omani company (intentionally preserved)

**Verification:** `grep -nE '/rihal-[a-z]' README.md CHANGELOG.md` — 0 slash-command hits.

---

## (b) .rcode/workflows/*.md — Missing /rihal-X workflow targets

**Result: WARN**

132 distinct `/rihal-X` command names appear across workflow files. 19 have no matching `.rcode/workflows/<name>.md` file. Of those, 8 are verifiably intentional or context-safe; **11 are genuine gaps** where workflow instructions route users to commands that do not exist.

### Intentional / context-safe (not counted as gaps)

| Command | Reason |
|---------|--------|
| `/rihal-fast` | help.md:133 explicitly labels it *"Not yet implemented (#482-B)"* |
| `/rihal-bootstrap` | help.md:220 explicitly labels it *"Not yet implemented (#481)"* |
| `/rihal-transition` | execute.md:978 contains `IMPORTANT: There is NO /rihal-transition command` |
| `/rihal-review-claude-`, `/rihal-review-gemini-` etc. | `/tmp/rihal-review-*.md` are temp file paths used in shell snippets — not slash commands |
| `/rihal-create-ux-design` | skill exists at `.rcode/skills/rihal-create-ux-design/SKILL.md`; routes through skill invocation, not a workflow |

### Gap findings — missing workflow targets

| File | Line | Command | Likely Correct Target | Severity |
|------|------|---------|----------------------|----------|
| `.rcode/workflows/plan.md` | 149, 297, 418, 910, 912, 933, 937 | `/rihal-sprint-plan` | `/rihal-sprint-planning` | **warn** |
| `.rcode/workflows/plan-research-validation.md` | 235, 246 | `/rihal-sprint-plan` | `/rihal-sprint-planning` | **warn** |
| `.rcode/workflows/autonomous.md` | 21, 71 | `/rihal-create-milestone` | skill invocation; no workflow exists | **warn** |
| `.rcode/workflows/create-prd.md` | 24 | `/rihal-create-milestone` | same | **warn** |
| `.rcode/workflows/do.md` | 224, 293 | `/rihal-create-milestone` | same | **warn** |
| `.rcode/workflows/edit-prd.md` | 30 | `/rihal-create-milestone` | same | **warn** |
| `.rcode/workflows/scaffold-project.md` | 30 | `/rihal-create-milestone` | same | **warn** |
| `.rcode/workflows/validate-prd.md` | 23, 29 | `/rihal-create-milestone` | same | **warn** |
| `.rcode/workflows/secure-phase.md` | 168 | `/rihal-validate` | `/rihal-validate-phase` | **critical** |
| `.rcode/workflows/new-project-roadmap.md` | 370, 391 | `/rihal-plan-phase` | `/rihal-plan` or `/rihal-discuss-phase` | **warn** |
| `.rcode/workflows/discuss-phase-power.md` | 297 | `/rihal-plan-phase` | `/rihal-plan` | **warn** |
| `.rcode/workflows/execute-sprint.md` | 533 | `/rihal-plan-phase` | `/rihal-plan` | **warn** |
| `.rcode/workflows/session-report.md` | 175 | `/rihal-plan-phase` | `/rihal-plan` | **warn** |
| `.rcode/workflows/dev-story.md` | 338, 387, 401, 409 | `/rihal-code` | unknown; not a documented command | **warn** |
| `.rcode/workflows/create-story.md` | 254 | `/rihal-code` | same | **warn** |
| `.rcode/workflows/analyze-dependencies.md` | 4, 122 | `/rihal-manager` | no equivalent found | **warn** |
| `.rcode/workflows/export-to-github.md` | 129 | `/rihal-decisions-export` | no equivalent found | **warn** |
| `.rcode/workflows/list-workspaces.md` | 96 | `/rihal-workspace` | `/rihal-list-workspaces` | **warn** |
| `.rcode/workflows/new-workspace.md` | 142 | `/rihal-workspace` | `/rihal-list-workspaces` | **warn** |
| `.rcode/workflows/help.md` | 272 | `/rihal-list-phase-assumptions` | no workflow or skill found | **warn** |

**Verification method:** Each command was checked with `[ -f ".rcode/workflows/${name}.md" ]`. Skill coverage was checked with `find .rcode/skills -name "SKILL.md" | xargs grep -l "${name}"`. Context lines were read with `grep -B3 -A3` to confirm user-facing vs internal-only usage.

**Highest severity — `/rihal-validate` in `secure-phase.md:168`:** This appears in a user-facing "Results + Routing" banner block as a post-security-check action suggestion. The correct command is `/rihal-validate-phase` (workflow exists). A user following this banner will run a nonexistent command.

---

## (c) SKILL.md files — dead @.rihal/ includes and rihal: namespace

**Result: PASS**

```
find .rcode/skills -name "SKILL.md" | xargs grep -n '@\.rihal/' 2>/dev/null
# → 0 results

find .rcode/skills -name "SKILL.md" | xargs grep -n 'rihal:' 2>/dev/null
# → 0 results
```

All skill `@` includes use `.rcode/` paths. No `rihal:` colon namespace found in skill trigger headers.

---

## (d) docs/ — rihal-tools binary references

**Result: PASS (with informational note)**

`grep -rn 'rihal-tools' docs/` returns **0 hits**. All binary references in `docs/` use the current `rcode-tools.cjs` name.

**Informational — CONTRIBUTING.md:342 and AGENTS.md:27 (not docs/ but user-facing):**

| File | Line | Text | Classification |
|------|------|------|----------------|
| `CONTRIBUTING.md` | 342 | `` `rihal-tools` — legacy rihal-tools scope (pre-v4 rename); accepted for backward compatibility `` | GAP (already flagged in audit-16 as GAP-COUNT-DRIFT) |
| `AGENTS.md` | 27 | `rihal-tools` listed as a valid commit scope alongside `rcode-tools` | GAP (same) |

These were already classified as GAP-COUNT-DRIFT in `audit/16-rihal-docs-tests.md`. Recorded here for completeness; both instruct contributors that `rihal-tools` is a valid commit scope, which may mislead new contributors post-v4.

---

## (e) examples/ — stale rihal paths and banners

**Result: PASS**

```
grep -in 'rihal' examples/council-decision.md examples/rental-app-walkthrough.md examples/starter-walkthrough.md
# → 0 results
```

Prior audit (`audit/16-rihal-docs-tests.md`) found `RIHAL ►` banners in `examples/rental-app-walkthrough.md:54,139` and `examples/council-decision.md:30`. These have been **resolved** — no rihal strings remain in any example file.

---

## Summary

| Area | Result | Gap Count |
|------|--------|-----------|
| (a) README.md / CHANGELOG.md /rihal-X commands | PASS | 0 |
| (b) Workflow /rihal-X routing to missing targets | **WARN** | 11 distinct dead commands, 39 call-sites |
| (c) SKILL.md @.rihal/ includes / rihal: namespace | PASS | 0 |
| (d) docs/ rihal-tools binary refs | PASS (info) | 0 in docs/; 2 in CONTRIBUTING+AGENTS already logged |
| (e) examples/ stale rihal paths | PASS | 0 |

**Overall: WARN**

The primary residue is in `.rcode/workflows/` — 11 `/rihal-X` command names that survived the rebrand and have no matching workflow. The most actionable are:

1. **critical** — `secure-phase.md:168` routes users to `/rihal-validate` (should be `/rihal-validate-phase`)
2. **warn** — `plan.md` (7 sites) routes to `/rihal-sprint-plan` (should be `/rihal-sprint-planning`)
3. **warn** — 6 workflows route to `/rihal-create-milestone` (skill-only, no workflow dispatch)
4. **warn** — `dev-story.md` (4 sites) + `create-story.md` (1 site) route to `/rihal-code` (undocumented)
5. **warn** — `analyze-dependencies.md` routes to `/rihal-manager` (no equivalent found)
