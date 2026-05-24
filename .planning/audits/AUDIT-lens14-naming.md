# Audit: Lens 14 — Naming Conventions (rihal residue)

**Branch:** audit-lens-14-naming  
**Date:** 2026-05-24  
**Auditor:** Claude Code (Sonnet 4.6)  
**Status: FAIL** — Critical PHASE_NUM drift found; rihal- SKILL.md name fields unpatched in .rcode tree

---

## Scope

Conventions scan across the full worktree (excluding `node_modules/`, `.git/`, `.planning/archive/`):

- (a) `rihal:` colon namespace that should be `rihal-` hyphen
- (b) Workflow files titled `# Workflow: rihal-X` that should be `rcode-X`
- (c) Agent dir names not matching SKILL.md `name:` field
- (d) PLAN.md vs SPRINT.md drift
- (e) PHASE_NUM vs PHASE_NUMBER variable drift
- (f) snake_case vs camelCase config keys with rihal-* prefix

Cross-referenced against prior audit reports. **NOTE:** `audit/12-final-rihal-inventory.md` referenced in the lens spec **does not exist** — the numbering jumps from `audit/11-migration-gaps.md` directly to `audit/13-rihal-workflows.md`. Findings below are cross-referenced against `audit/11-migration-gaps.md` instead.

---

## Commands Run

```bash
# (a) rihal: colon namespace
grep -rn "rihal:" --include="*.md" --include="*.yaml" --include="*.yml" \
  --include="*.json" --include="*.js" --include="*.cjs" --include="*.ts" \
  --include="*.py" . | grep -v node_modules | grep -v "\.git/" \
  | grep -v ".planning/archive" | grep -v "audit/"

# (b) Workflow titles
grep -rE "^# Workflow: rihal-" .rcode/workflows/*.md rcode/workflows/*.md

# (c) Agent dir vs name: field
find . -name "SKILL.md" | grep -v node_modules | grep -v "\.git/" | while read f; do
  dir=$(dirname "$f" | xargs basename)
  name=$(grep -m1 "^name:" "$f" | sed 's/name: *//')
  [ "$name" != "$dir" ] && echo "MISMATCH dir=$dir | name=$name | file=$f"
done

# (d) PLAN.md files
find . -name "PLAN.md" | grep -v node_modules | grep -v "\.git/" \
  | grep -v ".planning/archive"

# (e) PHASE_NUM drift
grep -rn "\bPHASE_NUM\b" --include="*.md" --include="*.js" --include="*.sh" . \
  | grep -v node_modules | grep -v "\.git/" | grep -v "PHASE_NUMBER" \
  | grep -v "audit/" | grep -v "CHANGELOG" | grep -v "lens-audit"

# (f) snake_case/camelCase rihal keys
grep -rn "rihal_\|rihal[A-Z]" --include="*.yaml" --include="*.yml" \
  --include="*.json" --include="*.js" --include="*.cjs" . \
  | grep -v node_modules | grep -v "\.git/" | grep -v ".planning/archive"
```

---

## (a) rihal: Colon Namespace Violations

**Status: PASS**

No active `rihal:` colon-namespace usage found. All four hits are intentional meta-references:

| File | Line | Content | Classification |
|------|------|---------|----------------|
| `MIGRATIONS.md` | 21 | Documents the old `/rihal:foo` → `/rcode-foo` migration | INTENTIONAL — migration history |
| `.rcode/workflows/do.md` | 371 | Explains colon form is NOT used; warns agents not to emit it | INTENTIONAL — guard doc |
| `.rcode/workflows/lens-audit.md` | 533 | Lists `rihal:` as a scan target | INTENTIONAL — self-referential audit doc |
| `.rcode/workflows/init.md` | 229 | `{If existing-new-rihal: "rcode just configured…"}` | INTENTIONAL — template conditional syntax, not a namespace |

**Verification:** `grep -rn "rihal:"` produced 4 hits total; each inspected manually above.

---

## (b) Workflow Titles `# Workflow: rihal-X`

**Status: PASS**

All `# Workflow:` headings in `.rcode/workflows/` and `rcode/workflows/` use `rcode-` prefix. Zero `rihal-` workflow title violations found.

**Verification:** `grep -rE "^# Workflow: rihal-" .rcode/workflows/*.md rcode/workflows/*.md` exited non-zero (no matches).

---

## (c) Agent Dir Names Not Matching SKILL.md `name:` Field

**Status: FAIL**

Two categories of mismatch:

### C1: `.rcode/skills/agents/` — SKILL.md `name:` fields still use `rihal-` prefix

The `.rcode/` tree is the installed/runtime copy. The corresponding `rcode/` source tree has already updated these to `rcode-*`. The installed tree is out of sync.

| Dir | name: field (actual) | Expected | File |
|-----|----------------------|----------|------|
| `ahmed-hassani-director` | `rihal-ahmed-hassani-director` | `rcode-ahmed-hassani-director` | `.rcode/skills/agents/ahmed-hassani-director/SKILL.md:2` |
| `dalil-scout` | `rihal-agent-dalil-scout` | `rcode-dalil-scout` | `.rcode/skills/agents/dalil-scout/SKILL.md:2` |
| `haitham-frontend` | `rihal-haitham-frontend` | `rcode-haitham-frontend` | `.rcode/skills/agents/haitham-frontend/SKILL.md:2` |
| `layla-designer` | `rihal-layla-designer` | `rcode-layla-designer` | `.rcode/skills/agents/layla-designer/SKILL.md:2` |
| `nasser-eng-manager` | `rihal-nasser-eng-manager` | `rcode-nasser-eng-manager` | `.rcode/skills/agents/nasser-eng-manager/SKILL.md:2` |
| `noor-writer` | `rihal-noor-writer` | `rcode-noor-writer` | `.rcode/skills/agents/noor-writer/SKILL.md:2` |
| `yousef-backend` | `rihal-yousef-backend` | `rcode-yousef-backend` | `.rcode/skills/agents/yousef-backend/SKILL.md:2` |
| `zahra-branding` | `rihal-zahra-branding` | `rcode-zahra-branding` | `.rcode/skills/agents/zahra-branding/SKILL.md:2` |
| `zayd-ml` | `rihal-zayd-ml` | `rcode-zayd-ml` | `.rcode/skills/agents/zayd-ml/SKILL.md:2` |

Total: **9 skills** with stale `rihal-` name fields in the installed tree.

**Severity:** `warn` — not a runtime crash, but IDE skill discovery (FleetView, Claude Code `/` autocomplete) will surface `rihal-*` names when the canonical names are now `rcode-*`. Users invoking the new `rcode-` names would silently get the wrong skill if the tool matches on `name:`.

### C2: `.rcode/skills/agents/` — Additional name field mismatches (rcode- but wrong suffix)

| Dir | name: field (actual) | Issue | File |
|-----|----------------------|-------|------|
| `fatima-qa` | `rcode-fatima` | Missing `-qa` suffix vs dir `fatima-qa` | `.rcode/skills/agents/fatima-qa/SKILL.md:2` |
| `hanzla-engineer` | `rcode-hanzla` | Missing `-engineer` suffix | `.rcode/skills/agents/hanzla-engineer/SKILL.md:2` |
| `mariam-marketing` | `rcode-mariam` | Missing `-marketing` suffix | `.rcode/skills/agents/mariam-marketing/SKILL.md:2` |
| `sadiq-analyst` | `rcode-sadiq` | Missing `-analyst` suffix | `.rcode/skills/agents/sadiq-analyst/SKILL.md:2` |
| `waleed-architect` | `rcode-waleed` | Missing `-architect` suffix | `.rcode/skills/agents/waleed-architect/SKILL.md:2` |

**Severity:** `warn` — dir name and name: field diverge; the `rcode/` source tree uses full names (`rcode-fatima-qa`, `rcode-hanzla-engineer`, etc.) Cross-reference: `rcode/skills/agents/fatima-qa/SKILL.md:2` says `name: rcode-fatima-qa`.

### C3: `.rcode/skills/agents/agents/SKILL.md` — Misplaced root-level file

| Dir | name: field | Issue | File |
|-----|-------------|-------|------|
| `agents` (parent) | `rihal-agent-dalil-scout` | A SKILL.md dropped at the agents/ root level; name is stale rihal-agent-dalil-scout | `.rcode/skills/agents/SKILL.md:2` |

**Severity:** `warn` — This SKILL.md is in the wrong location (parent dir, not a skill subdir) and carries a stale `rihal-agent-dalil-scout` name.

### C4: `.rcode/skills/agents/rihal-deviation-analyzer/` — Dir name has rihal- prefix

| Dir | name: field | Issue | File |
|-----|-------------|-------|------|
| `rihal-deviation-analyzer` | `rihal-deviation-analyzer` | Dir name has `rihal-` prefix; `rcode/` tree has `rcode-deviation-analyzer` | `.rcode/skills/agents/rihal-deviation-analyzer/SKILL.md:2` |

**Severity:** `warn` — This is the only agent dir in `.rcode/skills/agents/` with an explicit `rihal-` prefix in the dir name itself (all others use short names). The counterpart in `rcode/skills/agents/rcode-deviation-analyzer/` exists with `name: rcode-deviation-analyzer`.

**Not in audit/11:** `audit/11-migration-gaps.md` classifies `rihal-*` dirs in `.rcode/skills/` as intentional, but only refers to action-skill dirs (`rihal-init/`, `rihal-dev-story/`, etc.). The `agents/rihal-deviation-analyzer/` dir was not explicitly called out.

### C5: `rcode/skills/agents/rcode-code-review/` — name: field truncated

| Dir | name: field | Issue | File |
|-----|-------------|-------|------|
| `rcode-code-review` | `rcode-review` | Dir is `rcode-code-review`, name: is `rcode-review` | `rcode/skills/agents/rcode-code-review/SKILL.md:2` |

**Severity:** `info` — Minor inconsistency in the source tree (both use `rcode-` prefix); no rihal residue, but naming is divergent.

---

## (d) PLAN.md vs SPRINT.md Drift

**Status: WARN**

Five `PLAN.md` files found in `.planning/milestones/M1-ship-v2/` using the old naming convention. Active phases in `.planning/phases/` correctly use `*-SPRINT.md`.

| File | Phase | Status |
|------|-------|--------|
| `.planning/milestones/M1-ship-v2/phases/01-tier-docs/PLAN.md` | 01 Tier-based Documentation Reorg | Old PLAN.md format |
| `.planning/milestones/M1-ship-v2/phases/02-scaffold-skill/PLAN.md` | 02 Scaffold Project Skill | Old PLAN.md format |
| `.planning/milestones/M1-ship-v2/phases/03-v2-stabilization/PLAN.md` | 03 V2 Stabilization | Old PLAN.md format |
| `.planning/milestones/M1-ship-v2/phases/04-dashboard-refresh/PLAN.md` | 04 Dashboard Refresh | Old PLAN.md format |
| `.planning/milestones/M1-ship-v2/phases/05-marketing-launch/PLAN.md` | 05 Marketing + Launch | Old PLAN.md format |

**Severity:** `warn` — These are in the milestone archive path (`.planning/milestones/M1-ship-v2/`), not the active `.planning/phases/` tree. The `rcode-plan` workflow documents that "Existing PLAN.md files are renamed to `*-SUPERSEDED.md`" — these 5 files were never renamed. Toolchain that scans for `*-SPRINT.md` will skip these, but they could confuse agents loading milestone context.

**Verification:** `find . -name "PLAN.md" | grep -v node_modules | grep -v "\.git/" | grep -v ".planning/archive"` — all 5 hits are in `M1-ship-v2`.

---

## (e) PHASE_NUM vs PHASE_NUMBER Variable Drift

**Status: FAIL** — most severe naming finding

`CHANGELOG.md:362` documents: `fix(workflows): standardize PHASE_NUM → PHASE_NUMBER — closes #523 (84ad704)`. Despite this commit, `PHASE_NUM` persists in **88 occurrences** across **10 files** in both the `.rcode/` and `rcode/` trees.

### Files affected (excluding CHANGELOG and lens-audit meta-docs)

| File | Occurrences | Severity |
|------|-------------|----------|
| `.rcode/workflows/autonomous.md` | 33 | critical |
| `rcode/workflows/autonomous.md` | 33 | critical |
| `.rcode/workflows/autonomous-smart-discuss.md` | 3 | critical |
| `rcode/workflows/autonomous-smart-discuss.md` | 3 | critical |
| `.rcode/agents-rules/verifier/context-loading.md` | 3 | critical |
| `rcode/agents/rules/verifier/context-loading.md` | 3 | critical |
| `.rcode/workflows/phase.md` | 2 | critical |
| `rcode/workflows/phase.md` | 2 | critical |
| `.rcode/agents-rules/verifier/requirements-coverage.md` | 1 | critical |
| `rcode/agents/rules/verifier/requirements-coverage.md` | 1 | critical |
| `rcode/workflows/execute-sprint.md` | 2 | critical |
| `rcode/workflows/execute-milestone.md` | 2 | critical |

**Total: 88 occurrences across 12 files**

### Impact

The `autonomous.md` workflow is the primary agent execution driver. It calls skills using the variable:
```
Skill(skill="rihal-discuss-phase", args="${PHASE_NUM}")
```
…and passes `PHASE_NUM` to rcode-tools commands:
```
node .rcode/bin/rcode-tools.cjs state add-decision "Skipped phase ${PHASE_NUM} in autonomous mode"
```

In workflows where `PHASE_NUMBER` is set by the calling context (e.g., `execute.md` which sets `PHASE_NUMBER`), passing `${PHASE_NUM}` to a sub-skill that expects `$PHASE_NUMBER` will pass an empty string. This breaks:
- Phase discussion gating
- Plan creation
- Execution dispatch
- Verification

**Verification:** `grep -rn "\bPHASE_NUM\b" --include="*.md" . | grep -v PHASE_NUMBER | grep -v CHANGELOG | grep -v lens-audit` — produced 88 confirmed non-PHASE_NUMBER matches.

**Not in audit/11:** The CHANGELOG documents this as a completed fix, making it an unreported regression — the fix was declared done but the variable was not fully replaced.

---

## (f) snake_case vs camelCase Config Keys with rihal-* Prefix

**Status: PASS**

No new violations found beyond what is already classified in `audit/11-migration-gaps.md`:

- `rihal_source_path` in `.rcode/config.yaml` — classified as intentional schema field (audit/11, section A)
- `grep -rn "rihal_\|rihal[A-Z]"` across all YAML/JSON/JS files: zero hits (excluding audit/11's known entry)

---

## Summary Table

| Sub-scan | Status | Critical | Warn | Info | New (not in audit/11) |
|----------|--------|----------|------|------|-----------------------|
| (a) rihal: colon namespace | PASS | 0 | 0 | 0 | No |
| (b) Workflow titles | PASS | 0 | 0 | 0 | No |
| (c) Agent name/dir mismatches | FAIL | 0 | 15 | 1 | Partially — C3, C4 new |
| (d) PLAN.md vs SPRINT.md | WARN | 0 | 5 | 0 | No (milestone archive) |
| (e) PHASE_NUM vs PHASE_NUMBER | FAIL | 88 | 0 | 0 | YES — regression |
| (f) snake_case/camelCase config | PASS | 0 | 0 | 0 | No |

---

## New Gaps Not in audit/11

These findings were not classified in `audit/11-migration-gaps.md`:

### N1 — PHASE_NUM regression (CRITICAL)
88 occurrences of `PHASE_NUM` remain in `autonomous.md`, `autonomous-smart-discuss.md`, `phase.md`, and verifier rules. CHANGELOG declares this standardized in commit `84ad704` — the fix was incomplete. An agent running the autonomous flow will pass empty `$PHASE_NUM` wherever the caller sets `$PHASE_NUMBER`.

### N2 — `.rcode/skills/agents/rihal-deviation-analyzer/` dir (WARN)
Agent dir name retains `rihal-` prefix. `rcode/skills/agents/rcode-deviation-analyzer/` is the updated counterpart but the installed `.rcode/` copy was not renamed.

### N3 — `.rcode/skills/agents/agents/SKILL.md` misplaced (WARN)
A root-level `SKILL.md` in `.rcode/skills/agents/` (not inside any skill subdir) with name `rihal-agent-dalil-scout`. This file has no counterpart in the `rcode/` source tree and likely leaked from an old scaffold.

### N4 — `.rcode/skills/agents/` SKILL.md name fields stale rihal- (WARN)
9 agent SKILL.md files in the `.rcode/` installed tree still have `name: rihal-*` while the `rcode/` source tree has updated equivalents. These were not listed in audit/11's intentional list (which covered action skill dirs, not agent SKILL.md name fields).

---

## Recommended Remediation (priority order)

1. **PHASE_NUM → PHASE_NUMBER** (Critical): Replace all 88 occurrences across the 12 affected files. The `autonomous.md` files are the highest priority — they drive the full agent execution pipeline.

2. **`.rcode/skills/agents/rihal-deviation-analyzer/` dir rename**: Rename to `rcode-deviation-analyzer` to match the source tree.

3. **`.rcode/skills/agents/` SKILL.md `name:` fields**: Update the 9 stale `rihal-*` names to `rcode-*` to match the `rcode/` source tree equivalents.

4. **`.rcode/skills/agents/agents/SKILL.md`**: Investigate and remove the misplaced root-level SKILL.md.

5. **`.planning/milestones/M1-ship-v2/phases/0*/PLAN.md`**: Rename to `*-SUPERSEDED.md` per the documented convention in `rcode-plan` workflow.
