---
status: passed
phase: 39
requirements_checked: 0
requirements_total: 0
gaps_found: 1
gaps_fixed: 1
generated: 2026-09-03
---

# Phase 39 Verification — SEO Module: bundle top-notch SEO skills as a native rcode module (#911, #912, #913, #914)

## Goal

Close the rcode gap that causes content/SEO sites to be planned generically (as
`web-app`) with no keyword clustering, E-E-A-T gates, or internal-link architecture.
Four changes: (1) add `content-site` project type to `project-types.yaml` with
full-spectrum SEO signals, (2) route `content-site` projects in
`rcode-project-researcher` to dedicated SEO skill agents, (3) add comprehensive SEO
intent routing to `do.md` covering all SEO disciplines, (4) bundle 8 production-grade
SEO skills from `~/.agents/skills/` into `rcode/skills/seo/` as an installable
`--modules seo` module.

No `.planning/REQUIREMENTS.md` IDs map to phase 39 — confirmed via
`grep -n "911\|912\|913\|914\|content-site\|SEO Module" .planning/REQUIREMENTS.md`
(zero hits). Consistent with `state.json`'s sprint entries, which carry no
`requirements` field beyond the `#911-#914` GitHub issue references in the sprint
goal text.

## Method

Read all three SPRINT.md files (39-1, 39-2, 39-3) in full, including every automated
`<verify>` block, before touching anything. Discovered — via `git log` on the touched
files — that all three sprints' code changes were **already implemented and merged to
`main` months before this execution session**, in commits `7381f7ab` (39.1, 2026-06-24),
`00311c85` (39.2, 2026-06-24), and `01768d2f` (39.3, 2026-06-24). GitHub issues #911-#914
were confirmed CLOSED on 2026-06-24 via `gh issue view`. `.rcode/state.json` /
`.planning/STATE.md`, however, still carried `status: "planned"` for phase 39 and all
three sprints — the same state-vs-reality drift documented for phases 34/35/36 in their
own "verify and complete" commits.

Given the code was already shipped, verification shifted from "execute the sprint" to
"goal-backward audit against live code, not against summaries or commit titles" — the
same discipline phase 47's verification used. Every automated `<verify>` command in all
three SPRINT.md files was re-run live against the current `main` tip, plus a live
install smoke test (not part of the original sprint's automated checks) to confirm the
module is actually consumable, not just that its YAML parses.

## Sprint 39.1 Verification — content-site project type + researcher branching

**Verified — PASS.** `rcode/references/project-types.yaml` carries `content-site:`
(line 301) with 6 discovery questions, 5 required_sections, 3 skip_sections
(`authentication`, `state-management`, `authorization`) — all counts match the sprint's
exact acceptance criteria via a live `python3 -c "import yaml; ..."` assertion run this
session. `rcode/agents/rcode-project-researcher.md` (145 lines) carries a
`## content-site Mode` section producing `KEYWORDS.md`/`CLUSTERS.md`, referencing
`seo-growth-orchestrator` and `claude-seo:seo-cluster`, and listing 5 PITFALLS.md
entries (covering the 3 sprint-mandated ones: thin content, canonical drift, noindex
strategy). Generic 5-file table and `STACK.md`/`FEATURES.md`/`ARCHITECTURE.md`
references remain intact for non-content-site projects. See `39-1-SUMMARY.md` for full
detail, including a noted non-blocking wording deviation from the SPRINT.md's literal
suggested prose.

## Sprint 39.2 Verification — do.md SEO intent routing

**Verified — PASS.** `rcode/workflows/do.md` (546 lines) carries an 11-row SEO routing
block (line 380) covering all 10 disciplines named in the sprint — audit/recovery,
per-page audit, technical SEO, keyword research, content briefs, content factory, site
building, local SEO, schema, AI search/GEO, backlinks — inserted before the
`/rcode-quick` fallthrough row. The `greenfield_guard` table carries the named SEO row
redirecting to `/rcode-new-project` when `HAS_PRD=false`. All pre-existing rows
(`rcode-debug`, `rcode-research-phase`, `rcode-add-phase`, the original
`greenfield_guard` entries) are untouched. See `39-2-SUMMARY.md`.

## Sprint 39.3 Verification — seo module bundle (1 real bug found + fixed)

**Verified — PASS, after a fix landed this session.** All 8 skill directories exist
under `rcode/skills/seo/` with non-empty `SKILL.md` files; `rcode/modules/seo.yaml` and
`rcode/skills/seo/module.yaml` both exist and parse; `SKILLS_INDEX.md` carries a
`## SEO Module (8)` section; `rcode/modules/` lists all 4 expected manifests.

**Gap found:** `cli/install.js`'s `installSkills()` function — the subsystem that
actually copies `SKILL.md` directories into a consumer project's `.claude/skills/` —
walked a hardcoded bucket list `['agents', 'actions', 'core']` that never included
`'seo'`. Module *discovery* (`listAvailableModules()`, globs `rcode/modules/*.yaml`) is
dynamic and correctly finds `seo`, but that is a different code path from the one that
actually copies skill files. Net effect: **the 8 SEO skills were never installed into
any consumer project**, with or without `--modules seo`, despite every manifest file
existing and validating. This would not have been caught by any of the sprint's own
automated `<verify>` commands, all of which check file/YAML existence, not the
end-to-end install behavior.

**Fixed this session**, commit `f80e4cef fix(modules): install seo skill bucket so the
seo module actually installs (#914)` — added `'seo'` to the bucket list (1-line change).
Verified live: ran `node cli/install.js --target <scratch-dir> --non-interactive`.
Before the fix: 0 SEO skills in the installed `.claude/skills/`. After: all 8
(`rcode-seo-audit`, `rcode-seo-content-factory`, `rcode-seo-content-writer`,
`rcode-seo-growth-orchestrator`, `rcode-seo-site-builder`, `rcode-on-page-seo-auditor`,
`rcode-technical-seo-checker`, `rcode-rank-and-rent-local-seo`). Installer health-check
line moved from "skills + commands installed — 80 skills..." to "— 88 skills...".

**Known, non-blocking discrepancies flagged (not fixed — cosmetic/documentation only,
no functional impact, not raised in the original sprint's risk list as something to
correct without a ticket):**
- `rcode/modules/seo.yaml`'s `references:` list names `claude-seo-plugin-agents.md`,
  which does not exist anywhere in the repo. `filterPlanByModules()` only adds the
  unresolved path to an in-memory allow-set — a missing file there is a silent no-op,
  not a crash or install failure.
- `seo.yaml`'s `commands:` list uses bare skill-directory names, not the `<name>.md`
  convention `core.yaml`/`discovery.yaml` use for `rcode/commands/*.md` files. This list
  is not consulted by `installSkills()` (the subsystem that actually installs skills),
  so the mismatch is inert, but it deviates from the two reference manifests the sprint
  instructed to copy the format from.

See `39-3-SUMMARY.md` for full detail.

## Test Suite

`node --test` run twice this session — once before touching `cli/install.js`, once
after — both times: **660/661 passing**. The one failure
(`test/at-ref-parity.test.cjs`, a broken `@.rcode/skills/rcode-init/SKILL.md` reference
across ~18 agent SKILL.md files) is pre-existing on the `main` tip this worktree forked
from (confirmed: it failed before any change was made in this session), unrelated to
phase 39's files, and matches the exact same pre-existing failure documented in the
phase 36 "verify and complete" commit (`aed1ffba`) on this same repo. Not introduced or
worsened by this phase's work.

## Requirement Traceability

No `REQUIREMENTS.md` IDs map to phase 39 (confirmed empty grep, see Goal section
above). GitHub issues #911, #912, #913, #914 were already closed on 2026-06-24 — this
session's work does not reopen or need to re-close them; the `f80e4cef` fix references
#914 because it repairs functionality that issue's sprint (39.3) promised but the
original implementation did not fully deliver.

## Gaps Found

1 gap found (the `installSkills()` missing `'seo'` bucket) — genuinely blocking the
phase's stated goal ("so any project can install the SEO module"). Fixed this session,
verified live via an actual install into a scratch directory, not just re-running the
sprint's own automated checks. 2 additional non-blocking, cosmetic/documentation
discrepancies flagged above but left unfixed (no ticket exists for them; fixing them
would not change functional behavior — flagged for a human decision rather than
silently patched or silently ignored).

## Verdict

**PASSED.** All 4 issues (#911, #912, #913, #914) are functionally closed at the code
level and now also at the install-pipeline level. Sprints 39.1 and 39.2 required no
further work — verified against live `main`, not against commit titles or SUMMARY
claims. Sprint 39.3's manifest and file-copy work was complete, but a real,
verified-live installer bug meant the phase's actual promise ("install the seo module")
did not work end-to-end until this session's fix. `state.json`/`STATE.md` drift (phase
and all 3 sprints stuck on `status: "planned"` despite the code being merged in June)
is corrected as part of marking this phase complete.
</content>
