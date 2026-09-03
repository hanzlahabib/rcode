---
sprint: 39.3
status: complete
commits:
  - 01768d2f feat(modules): bundle 8 SEO skills as rcode seo module (#914)
  - f80e4cef fix(modules): install seo skill bucket so the seo module actually installs (#914)
key-files:
  - rcode/skills/seo/
  - rcode/modules/seo.yaml
  - rcode/skills/seo/module.yaml
  - rcode/skills/SKILLS_INDEX.md
  - cli/install.js
---

## What was built

Sprint 39.3's file-copy and manifest work was found ALREADY IMPLEMENTED on `main` —
shipped in commit `01768d2f` on 2026-06-24, months before this sprint's SPRINT.md was
picked up for execution. Issue #914 was closed the same day. But goal-backward
verification (does `npx @hanzlaa/rcode install --modules seo` actually work, not just
"does the YAML parse") surfaced a real, load-bearing installer bug that made the
entire sprint's stated goal non-functional. That bug is fixed in this session,
commit `f80e4cef`.

### Story 39.3.1 — 8 SEO skills copied into rcode/skills/seo/

All 8 directories are present under `rcode/skills/seo/`: `seo-content-factory`,
`seo-growth-orchestrator`, `seo-audit`, `on-page-seo-auditor`, `technical-seo-checker`,
`seo-content-writer`, `seo-site-builder`, `rank-and-rent-local-seo` — each with a
non-empty `SKILL.md` (79-180 lines each, 1132 lines total). Cross-checked against
`~/.agents/skills/`: the source directory currently holds these same 8 skills (plus 30+
other, non-SEO-module skills such as `keyword-research`, `backlink-analyzer`,
`serp-analysis` that were correctly NOT bundled per the sprint's exact 8-skill list) —
the personal skills directory has not drifted from what the sprint's file list assumed.

### Story 39.3.2 — module manifests

`rcode/modules/seo.yaml` exists with `name: seo`, `version: "1.0"`, `requires: [core]`,
and a `commands:` list naming all 8 skill directories, plus a `references:` comment
block documenting the 17-agent `claude-seo:*` plugin fleet as a separate, non-bundled
install. `rcode/skills/seo/module.yaml` exists with `code: seo` and 3 configuration
prompts (`default_seo_vertical`, `gsc_access`, `content_quality_gate`) in the same
question-style format as `rcode/skills/core/module.yaml`. Both parse cleanly with
`python3 -c "import yaml; ..."`.

**Known, pre-existing discrepancy (not fixed this session — flagged, not silently
patched):** `rcode/modules/seo.yaml`'s `references:` list names
`claude-seo-plugin-agents.md`, a file that does not exist anywhere in the repo. It is
low-impact — `filterPlanByModules()` in `cli/install.js` only adds the (nonexistent)
resolved path to an in-memory allow-set; a missing file there is a silent no-op, not a
crash. Also, `seo.yaml`'s `commands:` list uses bare skill-directory names
(`seo-content-factory`) rather than the `<name>.md` convention `core.yaml` and
`discovery.yaml` use for actual `rcode/commands/*.md` files — this list is
inert/documentary for skills (skills are installed by the separate `installSkills()`
bucket walk, not by `filterPlanByModules()`), so the convention mismatch causes no
functional harm, but it is inconsistent with the two reference manifests the sprint
was told to copy the format from. Both are cosmetic/documentation gaps, not blocking;
recorded here rather than corrected without a ticket, per the "no theoretical
suggestions, only verified findings" project rule.

### Story 39.3.3 — install loader wiring (real bug found + fixed)

The sprint's own risk table flagged this exact possibility: "Module YAML field names
differ from what the rcode install loader expects" and "if hard-coded, a follow-up
task is filed to register seo." Verification found something more specific: module
*discovery* is dynamic (`listAvailableModules()` globs `rcode/modules/*.yaml` — `seo`
IS discovered as a module name, confirmed via `node --check` reading the function),
but the SEPARATE `installSkills()` subsystem that actually copies `SKILL.md`
directories into a consumer project's `.claude/skills/` walked a hardcoded
`['agents', 'actions', 'core']` bucket list that never included `'seo'`. Consequence:
**zero of the 8 SEO skills were ever copied to any installed project**, full install or
`--modules seo` filtered, despite `rcode/modules/seo.yaml` and
`rcode/skills/seo/module.yaml` existing and validating.

Fixed in `f80e4cef`: added `'seo'` to the bucket list (`cli/install.js:1494`). Verified
live: ran `node cli/install.js --target <scratch-dir> --non-interactive` before and
after the fix. Before: `ls .claude/skills/ | grep -i seo` → empty. After: 8 entries
(`rcode-seo-audit`, `rcode-seo-content-factory`, `rcode-seo-content-writer`,
`rcode-seo-growth-orchestrator`, `rcode-seo-site-builder`, `rcode-on-page-seo-auditor`,
`rcode-technical-seo-checker`, `rcode-rank-and-rent-local-seo`). Health-check output
after the fix: "skills + commands installed — 88 skills + 117 commands" (up from 80
skills before).

`rcode/skills/SKILLS_INDEX.md` already carried a `## SEO Module (8)` section with all 8
skill entries (name, path, one-line description) before this session — no changes
needed there. `rcode/modules/` lists `core.yaml`, `discovery.yaml`, `execution.yaml`,
`seo.yaml` — matches the sprint's expected directory listing.

## Verification results (this session, re-run against current main tip)

- `ls rcode/skills/seo/` — all 8 expected directories present, diff against expected list clean
- Each `SKILL.md` present and non-empty (`test -s`) — pass for all 8
- `python3 -c "import yaml; ..."` on both `rcode/modules/seo.yaml` and
  `rcode/skills/seo/module.yaml` — both parse cleanly
- All 8 `commands:` entries in `seo.yaml` resolve to real directories under
  `rcode/skills/seo/` (`python3` cross-check) — pass
- `grep -qi "## SEO Module" rcode/skills/SKILLS_INDEX.md` — pass
- `ls rcode/modules/` — `core.yaml discovery.yaml execution.yaml seo.yaml` — matches
- **Live install smoke test** (new this session, not in the original sprint's automated
  checks): `node cli/install.js --target /tmp/.../scratch --non-interactive` → 8/8 SEO
  skills land in `.claude/skills/` — pass, only after the `f80e4cef` fix
- Full `node --test` suite: 660/661 passing before and after the fix (the 1 failure is
  the same pre-existing, unrelated broken `@`-reference noted in 39-1/39-2-SUMMARY.md —
  unaffected by this change)
</content>
