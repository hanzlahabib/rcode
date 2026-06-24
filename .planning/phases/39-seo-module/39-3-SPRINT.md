<!-- rcode-bypass: phase 39 dir exists on disk; registering sprint plans before state sync -->
---
sprint: 39.3
goal: "Copy the 8 SEO skills from ~/.agents/skills/ into rcode/skills/seo/, create module.yaml and module registration in rcode/modules/seo.yaml, so `npx @hanzlaa/rcode install --modules seo` installs them as a first-class rcode module (#914)."
depends_on:
  - 39.1
files_modified:
  - rcode/skills/seo/
  - rcode/modules/seo.yaml
requirements_addressed:
  - "#914"
sequential: false
---

# Sprint 39.3 — Bundle SEO skills as `seo` module

**Phase:** 39 — SEO Module
**Status:** planned
**Velocity target:** 13 points
**Started:** —

## Sprint Goal

The 8 production-grade SEO skills exist at `~/.agents/skills/` but rcode subagents run headless and cannot reach global Claude Code skills. This sprint copies them into the rcode source tree under `rcode/skills/seo/`, creates the module manifest (`rcode/modules/seo.yaml`) in the same format as `rcode/modules/core.yaml` and `rcode/modules/discovery.yaml`, and creates a `rcode/skills/seo/module.yaml` in the same format as `rcode/skills/core/module.yaml`. The result: any project can install the SEO module and all 8 skills are available to rcode agents without requiring global Claude Code access.

Story 39.3.1 (copy skills) and 39.3.2 (write module manifests) can run in parallel, but 39.3.3 (install smoke test) depends on both completing.

This sprint depends on Sprint 39.1 only for ordering: the `content-site` type must exist before the module is useful, but the file copy does not technically require it.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 39.3.1 | Copy 8 SEO skills into rcode/skills/seo/ | 5 | planned | `ls rcode/skills/seo/` lists all 8 directories: `seo-content-factory/`, `seo-growth-orchestrator/`, `seo-audit/`, `on-page-seo-auditor/`, `technical-seo-checker/`, `seo-content-writer/`, `seo-site-builder/`, `rank-and-rent-local-seo/`; each directory contains at minimum `SKILL.md`; `wc -l rcode/skills/seo/*/SKILL.md` shows all files are non-empty. |
| 39.3.2 | Create rcode/modules/seo.yaml and rcode/skills/seo/module.yaml | 5 | planned | `rcode/modules/seo.yaml` exists with `name: seo`, `version: "1.0"`, `requires: [core]`, and a `commands` list naming all 8 directories; `rcode/skills/seo/module.yaml` exists with `code: seo` and configuration prompts matching the install flow format in `rcode/skills/core/module.yaml`; `grep 'seo' rcode/modules/seo.yaml` returns the module entry. |
| 39.3.3 | Smoke-test the module structure and verify install loader wiring | 4 | planned | All 8 skill dirs exist under `rcode/skills/seo/` with non-empty `SKILL.md`; `python3 -c "import yaml; yaml.safe_load(open('rcode/modules/seo.yaml'))"` exits 0; `rcode/modules/seo.yaml` uses keys matching `core.yaml`/`discovery.yaml` schema; `grep -r "seo" rcode/bin/rcode-tools.cjs` or `cli/install.js` confirms the install loader discovers modules dynamically (glob `rcode/modules/*.yaml`) rather than a hard-coded allowlist — if hard-coded, a follow-up task is filed to register `seo`; `SKILLS_INDEX.md` has a `## SEO Module` section with all 8 entries. |

## Capacity

- **Velocity target:** 13 points
- **Total committed:** 13 points
- **Buffer:** 0 points (0%)

## Stories — detail

### Story 39.3.1 — Copy 8 SEO skills into rcode/skills/seo/

<objective>
Copy the 8 SEO skills from `~/.agents/skills/` into `rcode/skills/seo/` so they are bundled with the rcode source tree. Each skill must preserve its original directory structure (`SKILL.md` + `rules/` + `templates/` where present). This makes the skills available to rcode subagents that cannot reach global Claude Code paths.
</objective>

<action>
Create the `rcode/skills/seo/` directory. For each of the 8 skills, copy the entire directory from `~/.agents/skills/<skill-name>/` to `rcode/skills/seo/<skill-name>/`:

1. `seo-content-factory` — 10-agent programmatic pipeline (competitor research → keyword expansion → clustering → briefs → writing → interlinking → programmatic page gen → schema → refresh → opportunity finding)
2. `seo-growth-orchestrator` — strategy orchestrator: 5 plays (backlink acquisition, local SEO stack, Goals Protocol, content+automation engine, 30-day sprint)
3. `seo-audit` — full technical/on-page/content audit (crawlability, indexation, CWV, E-E-A-T, heading structure, schema, internal links)
4. `on-page-seo-auditor` — per-page scored report with fix priorities
5. `technical-seo-checker` — Core Web Vitals, crawl, indexing, mobile, speed, architecture, redirects
6. `seo-content-writer` — E-E-A-T-aware prose generation with brief adherence checks
7. `seo-site-builder` — end-to-end site scaffold with SEO architecture baked in
8. `rank-and-rent-local-seo` — local niche selection, city×service matrix, GBP signals, NAP, citations

Use `cp -r` for each:
```bash
mkdir -p rcode/skills/seo
cp -r ~/.agents/skills/seo-content-factory    rcode/skills/seo/
cp -r ~/.agents/skills/seo-growth-orchestrator rcode/skills/seo/
cp -r ~/.agents/skills/seo-audit              rcode/skills/seo/
cp -r ~/.agents/skills/on-page-seo-auditor    rcode/skills/seo/
cp -r ~/.agents/skills/technical-seo-checker  rcode/skills/seo/
cp -r ~/.agents/skills/seo-content-writer     rcode/skills/seo/
cp -r ~/.agents/skills/seo-site-builder       rcode/skills/seo/
cp -r ~/.agents/skills/rank-and-rent-local-seo rcode/skills/seo/
```

After copying, do NOT modify the content of any `SKILL.md` files. The skills are production-grade and must be copied verbatim. Do NOT rename any files or directories.
</action>

<verify>
<automated>
# All 8 directories present
ls rcode/skills/seo/ | sort | diff - <(printf "on-page-seo-auditor\nrank-and-rent-local-seo\nseo-audit\nseo-content-factory\nseo-content-writer\nseo-growth-orchestrator\nseo-site-builder\ntechnical-seo-checker\n")
# All SKILL.md present and non-empty
for dir in rcode/skills/seo/*/; do
  test -f "${dir}SKILL.md" || echo "MISSING SKILL.md in $dir"
  test -s "${dir}SKILL.md" || echo "EMPTY SKILL.md in $dir"
done
# Count check
test "$(ls -1 rcode/skills/seo/ | wc -l)" -eq 8 && echo "8 skills present"
</automated>
<manual>
Open rcode/skills/seo/seo-content-factory/SKILL.md and confirm it contains the 10-agent pipeline description, not placeholder content.
</manual>
</verify>

### Story 39.3.2 — Create rcode/modules/seo.yaml and rcode/skills/seo/module.yaml

<objective>
Create the two module manifests that register the SEO skill bundle as a first-class installable rcode module, following the format of existing module files (`rcode/modules/core.yaml`, `rcode/modules/discovery.yaml`, `rcode/skills/core/module.yaml`).
</objective>

<action>
**File 1: `rcode/modules/seo.yaml`**

Read `rcode/modules/discovery.yaml` and `rcode/modules/core.yaml` for the exact format. Create `rcode/modules/seo.yaml`:

```yaml
name: seo
version: "1.0"
description: "Full-spectrum SEO skills — content factory, growth orchestrator, audits, writer, site builder, local SEO, on-page and technical auditors"
requires:
  - core
agents: []
workflows: []
commands:
  - seo-content-factory
  - seo-growth-orchestrator
  - seo-audit
  - on-page-seo-auditor
  - technical-seo-checker
  - seo-content-writer
  - seo-site-builder
  - rank-and-rent-local-seo
references:
  # claude-seo plugin agents — NOT bundled. Install separately: npx @hanzlaa/claude-seo install
  # Routing rules in do.md reference: seo-cluster, seo-programmatic, seo-schema, seo-geo,
  # seo-local, seo-sxo, seo-technical, seo-content, seo-backlinks, seo-ecommerce,
  # seo-maps, seo-page, seo-performance, seo-sitemap, seo-drift, seo-dataforseo
  - claude-seo-plugin-agents.md
```

**File 2: `rcode/skills/seo/module.yaml`**

Read `rcode/skills/core/module.yaml` for the format. Create `rcode/skills/seo/module.yaml`:

```yaml
code: seo
name: "rcode SEO Module"

header: "rcode SEO Module Configuration"
subheader: "Configure the SEO module for your rcode installation.\nThese settings apply to all SEO skills: content factory, growth orchestrator, audits, and local SEO."

default_seo_vertical:
  prompt: "What is your primary SEO vertical? (local, affiliate, technical, content-factory, e-commerce, saas, publisher, agency)"
  default: "general"
  result: "{value}"

gsc_access:
  prompt: "Do you have Google Search Console access for the target domain? (yes/no)"
  default: "no"
  result: "{value}"

content_quality_gate:
  prompt: "Minimum word count for SEO content pieces?"
  default: "1200"
  result: "{value}"
```
</action>

<verify>
<automated>
test -f rcode/modules/seo.yaml
test -f rcode/skills/seo/module.yaml
grep -q "^name: seo" rcode/modules/seo.yaml
grep -q "seo-content-factory" rcode/modules/seo.yaml
grep -q "rank-and-rent-local-seo" rcode/modules/seo.yaml
grep -q "claude-seo-plugin-agents" rcode/modules/seo.yaml
grep -q "^references:" rcode/modules/seo.yaml
grep -q "^code: seo" rcode/skills/seo/module.yaml
# YAML syntax
python3 -c "import yaml; yaml.safe_load(open('rcode/modules/seo.yaml')); print('seo.yaml OK')"
python3 -c "import yaml; yaml.safe_load(open('rcode/skills/seo/module.yaml')); print('module.yaml OK')"
# Format matches existing modules
grep -q "^name:" rcode/modules/core.yaml && grep -q "^name:" rcode/modules/seo.yaml
</automated>
<manual>
Verify that the references: section in seo.yaml contains a comment listing the claude-seo plugin agents and explaining they are NOT bundled (require separate install). Verify that the module.yaml install prompts are phrased in the same question style as rcode/skills/core/module.yaml.
</manual>
</verify>

### Story 39.3.3 — Smoke-test the module structure against the install loader

<objective>
Verify that the module structure (seo.yaml + skills directory + module.yaml) is consistent with what the rcode install loader expects, so `npx @hanzlaa/rcode install --modules seo` will work after publish.
</objective>

<action>
Run these checks in sequence:

1. YAML parse both manifest files (done in 39.3.2 verify steps — confirm no errors).
2. Confirm all 8 skills listed in `rcode/modules/seo.yaml` have corresponding directories under `rcode/skills/seo/`:
   ```bash
   for skill in seo-content-factory seo-growth-orchestrator seo-audit on-page-seo-auditor technical-seo-checker seo-content-writer seo-site-builder rank-and-rent-local-seo; do
     test -d "rcode/skills/seo/$skill" || echo "MISSING: $skill"
   done
   ```
3. Update `rcode/skills/SKILLS_INDEX.md` — read the current format, then append a `## SEO Module` section in the same format (one row per skill: name, path under `rcode/skills/seo/`, one-line description taken from the first `description:` line of each skill's `SKILL.md`). This is a definite action — the file is confirmed present at `rcode/skills/SKILLS_INDEX.md`. Do NOT leave a TODO comment.
4. Confirm the module is listed in the modules directory alongside core, discovery, execution:
   ```bash
   ls rcode/modules/
   # Should show: core.yaml discovery.yaml execution.yaml seo.yaml
   ```

SKILLS_INDEX.md exists and must be updated. Read it first, match the existing format exactly, and append the SEO module section with all 8 skill entries. No TODO comments.
</action>

<verify>
<automated>
# Module on disk
test -f rcode/modules/seo.yaml && echo "seo.yaml present"
# All 8 skills resolvable
python3 -c "
import yaml, os
m = yaml.safe_load(open('rcode/modules/seo.yaml'))
missing = [s for s in m['commands'] if not os.path.isdir(f'rcode/skills/seo/{s}')]
assert not missing, f'Missing skill dirs: {missing}'
print('All 8 skill dirs present')
"
# SKILLS_INDEX.md has SEO entry (or has TODO comment)
grep -qi "## SEO Module" rcode/skills/SKILLS_INDEX.md || { echo "FAIL: SKILLS_INDEX.md has no '## SEO Module' section"; exit 1; }
</automated>
<manual>
Confirm `ls rcode/modules/` shows seo.yaml alongside core.yaml, discovery.yaml, and execution.yaml. Confirm the install flag documentation: search for `--modules` in rcode docs or README to confirm the flag is defined and seo would be a valid value.
</manual>
</verify>

## Files Touched

**Creates:**
- `rcode/skills/seo/` — new directory
- `rcode/skills/seo/seo-content-factory/` — copied from `~/.agents/skills/seo-content-factory/`
- `rcode/skills/seo/seo-growth-orchestrator/` — copied from `~/.agents/skills/seo-growth-orchestrator/`
- `rcode/skills/seo/seo-audit/` — copied from `~/.agents/skills/seo-audit/`
- `rcode/skills/seo/on-page-seo-auditor/` — copied from `~/.agents/skills/on-page-seo-auditor/`
- `rcode/skills/seo/technical-seo-checker/` — copied from `~/.agents/skills/technical-seo-checker/`
- `rcode/skills/seo/seo-content-writer/` — copied from `~/.agents/skills/seo-content-writer/`
- `rcode/skills/seo/seo-site-builder/` — copied from `~/.agents/skills/seo-site-builder/`
- `rcode/skills/seo/rank-and-rent-local-seo/` — copied from `~/.agents/skills/rank-and-rent-local-seo/`
- `rcode/modules/seo.yaml` — module manifest
- `rcode/skills/seo/module.yaml` — module install config

**Modifies:**
- `rcode/skills/SKILLS_INDEX.md` — adds `## SEO Module` section

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Source skills at `~/.agents/skills/` have been updated since the spec was written and their structure has changed | Medium | Read each SKILL.md before copying to confirm it matches the expected description; flag any mismatches |
| SKILLS_INDEX.md format is non-standard and cannot be extended without breaking the index loader | Low | Read the current format before writing; if it uses a fixed schema, match it exactly; if it is freeform markdown, add a new `## SEO Module` section at the bottom |
| Module YAML field names differ from what the rcode install loader expects | High | Read `rcode/modules/core.yaml` and `rcode/modules/discovery.yaml` to extract exact field names before writing seo.yaml — do not invent field names |
| claude-seo plugin references in do.md routing will fail at runtime if plugin is not installed | Low | The `plugin_agents` comment in seo.yaml explicitly states these require separate install; the do.md routing entries should also include a fallback note |
</content>
