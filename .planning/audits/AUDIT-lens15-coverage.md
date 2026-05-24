# Lens 15 — Coverage: Rebrand Parity Gaps

**Branch:** audit-lens-15-coverage  
**Date:** 2026-05-24  
**Scope:** Parity gaps from the rihal-code → rcode rebrand — command/workflow mapping, subagent_type refs, team.yaml ↔ agent-dir alignment, broken @-refs in the install mirror, test coverage blind spots.  
**Prior inventory:** `audit/11-migration-gaps.md` (primary), `audit/14-rihal-skills.md`  
**Status: WARN** — 4 parity gaps found; all are in the `.rcode/` install mirror or the `.rcode/skills/` layer, which the existing test suite does not scan. The `rcode/` source tree is clean.

---

## Commands run

```bash
# (a) rihal-* command files
find rcode/commands -name 'rihal-*.md'

# Command ↔ workflow coverage
for cmd in rcode/commands/*.md; do
  name=$(basename "$cmd" .md)
  [ ! -f ".rcode/workflows/${name}.md" ] && [ ! -f "rcode/workflows/${name}.md" ] && echo "NO_WORKFLOW: $cmd"
done

for wf in .rcode/workflows/*.md; do
  name=$(basename "$wf" .md)
  [ ! -f "rcode/commands/${name}.md" ] && echo "NO_CMD: $wf"
done

# (b) subagent_type refs
grep -rh "subagent_type" rcode/ .rcode/ --include="*.md" | grep -oP "subagent_type\s*[=:]\s*['\"]?rihal-[a-z0-9-]+"
grep -rh "subagent_type" rcode/ .rcode/ --include="*.md" | grep -oP "subagent_type\s*[=:]\s*['\"]?rcode-[a-z0-9-]+"

# Agent dir existence check
ls rcode/agents/*.md
ls rcode/skills/agents/

# (c) team.yaml ↔ agent file
grep "file_path:" rcode/team.yaml | awk '{print $2}' | while read p; do [ ! -f "$p" ] && echo "MISSING: $p"; done
grep "skill_path:" rcode/team.yaml | awk '{print $2}' | while read p; do [ ! -d "$p" ] && echo "MISSING: $p"; done

# (d) rihal-* in acceptance criteria / STORY files
find . -name "STORY*.md" -o -name "SPRINT*.md" | grep -v node_modules
grep -rn "rihal-" .rcode/ rcode/ --include="*.md" | grep -i "acceptance\|criteria\|AC\|verify"

# (e) broken @-refs in .rcode/ not covered by at-ref-parity
for f in .rcode/workflows/*.md; do
  grep "^@rcode/skills/" "$f" | while read ref; do
    path="${ref#@}"; [ ! -f "$path" ] && echo "BROKEN: $f → $ref"
  done
done
grep -rn "subagent_type.*rihal-" .rcode/ rcode/ --include="*.md"

# Test runs
node --test test/agent-team-parity.test.cjs
node --test test/at-ref-parity.test.cjs
node --test test/compliance.test.cjs
```

---

## Findings

| ID | File | Line | Description | Severity |
|----|------|------|-------------|----------|
| L15-01 | `.rcode/workflows/prfaq.md` | 7 | `@rcode/skills/actions/1-analysis/rihal-prfaq/SKILL.md` — skill dir was renamed to `rcode-prfaq`; path resolves to nothing at runtime | critical |
| L15-02 | `.rcode/workflows/checkpoint-preview.md` | 7 | `@rcode/skills/actions/4-implementation/rihal-checkpoint-preview/SKILL.md` — skill dir renamed to `rcode-checkpoint-preview`; path broken at runtime | critical |
| L15-03 | `.rcode/skills/rihal-code-review/steps/step-02-review.md` | 23, 26 | `subagent_type="rihal-security-adversary"` and `subagent_type="rihal-edge-case-hunter"` — agents are registered as `rcode-security-adversary` / `rcode-edge-case-hunter`; rihal- names resolve to nothing | warn |
| L15-04 | `.rcode/skills/agents/rihal-deviation-analyzer/` | dir | Install-mirror still has `rihal-deviation-analyzer/`; source tree has `rcode/skills/agents/rcode-deviation-analyzer/`; no `rcode-deviation-analyzer` in `.rcode/skills/agents/` | warn |
| L15-05 | `test/agent-team-parity.test.cjs` | — | `subagent_type` scan covers only `rcode/workflows/`; `.rcode/skills/` (where L15-03 lives) is not scanned — rihal- subagent refs there pass silently | warn |
| L15-06 | `test/at-ref-parity.test.cjs` | — | `SCAN_DIR = rcode/` only; `.rcode/workflows/` @-refs not tested — L15-01 and L15-02 pass silently with baseline 0 | warn |

---

## Verification notes

### L15-01 and L15-02 — broken @-refs in .rcode/workflows (critical)

**How verified:**

1. Read both files and extracted the `@`-prefixed skill paths.
2. Ran `ls rcode/skills/actions/1-analysis/rihal-prfaq/` → `MISSING`. Ran `ls rcode/skills/actions/1-analysis/rcode-prfaq/SKILL.md` → exists.
3. Same for `rihal-checkpoint-preview` / `rcode-checkpoint-preview`.
4. Confirmed `rcode/workflows/prfaq.md:7` and `rcode/workflows/checkpoint-preview.md:7` already use the correct `rcode-` prefix — the `rcode/` source was patched but the `.rcode/` install mirror was not synced.
5. Ran `node --test test/at-ref-parity.test.cjs` → **PASS** (test does not scan `.rcode/`); confirms the gap is invisible to CI.

**Fix:** `.rcode/workflows/prfaq.md:7` → replace `rihal-prfaq` with `rcode-prfaq`. Same for `checkpoint-preview.md`. Then sync the install mirror.

---

### L15-03 — stale subagent_type in rihal-code-review skill (warn)

**How verified:**

1. `grep -rn "subagent_type.*rihal-" .rcode/ rcode/` found two hits on lines 23 and 26 of `.rcode/skills/rihal-code-review/steps/step-02-review.md`.
2. Opened the file; confirmed `rihal-security-adversary` and `rihal-edge-case-hunter` are the subagent names.
3. `ls rcode/agents/rcode-security-adversary.md rcode/agents/rcode-edge-case-hunter.md` → both exist, confirming the correct names are `rcode-*`.
4. Read `rcode/skills/actions/4-implementation/rcode-code-review/steps/step-02-review.md` (the source counterpart) — it correctly uses `rcode-security-adversary` and `rcode-edge-case-hunter`. The `.rcode/` install mirror was not updated.
5. `grep -rn "subagent_type.*rihal-" rcode/` → no hits; `.rcode/` is the only location with stale refs.
6. Ran `node --test test/agent-team-parity.test.cjs` → **PASS** (test scans `rcode/workflows` only, not `.rcode/skills/`).

**Severity note:** Rated warn (not critical) because the skill file notes the dispatch pattern is illustrative and the user must paste findings manually if subagents unavailable. However, if a Claude Code session invokes `Task(subagent_type="rihal-security-adversary")` it will dispatch to a non-existent agent type and fail silently.

**Fix:** `.rcode/skills/rihal-code-review/steps/step-02-review.md:23,26` — replace `rihal-security-adversary` → `rcode-security-adversary` and `rihal-edge-case-hunter` → `rcode-edge-case-hunter`.

---

### L15-04 — .rcode/skills/agents/rihal-deviation-analyzer not renamed (warn)

**How verified:**

1. `ls .rcode/skills/agents/` showed `rihal-deviation-analyzer/` present.
2. `ls rcode/skills/agents/` showed `rcode-deviation-analyzer/` (correct name in source).
3. `grep -A4 "deviation-analyzer" rcode/team.yaml` → `id: rcode-deviation-analyzer`, `skill_path: rcode/skills/agents/rcode-deviation-analyzer` — team.yaml points at the source path, not the install mirror.
4. No `.rcode/skills/agents/rcode-deviation-analyzer/` exists (install mirror has only the rihal- name).
5. Severity is warn (not critical) because `skill_path` in team.yaml resolves to `rcode/skills/agents/rcode-deviation-analyzer` which exists; the stale `.rcode/` mirror is only loaded if something explicitly reads `.rcode/skills/agents/rihal-deviation-analyzer/`.
6. Cross-checked `audit/14-rihal-skills.md` which classifies `.rcode/skills/agents/rihal-deviation-analyzer/` as intentional (INT-SKILL-DIR). However, in the context of install-mirror parity (Lens 15), this creates a name mismatch between source and mirror.

**Fix:** Rename `.rcode/skills/agents/rihal-deviation-analyzer/` → `.rcode/skills/agents/rcode-deviation-analyzer/` (or remove the stale copy if the install step regenerates from `rcode/skills/agents/`).

---

### L15-05 and L15-06 — test coverage blind spots (warn)

**How verified:**

1. Read `test/agent-team-parity.test.cjs` in full. The `walkMd` function scans `rcode/workflows/` only. `.rcode/skills/` is never walked.
2. Read `test/at-ref-parity.test.cjs` in full. `SCAN_DIR = rcode/`. `.rcode/workflows/` is never walked.
3. Both tests pass (`node --test`) with the broken files in place, confirming the blind spots.
4. Compliance test (`test/compliance.test.cjs`) also uses `RCODE_DIR = rcode/` exclusively.

**Fix (test coverage):**
- `test/agent-team-parity.test.cjs`: extend the `subagent_type` walk to include `.rcode/skills/` alongside `rcode/workflows/`.
- `test/at-ref-parity.test.cjs`: add `.rcode/workflows/` to the `SCAN_DIR` set (or run a parallel walk for `.rcode/` with the same `refResolves` function).

---

## What was checked and found clean (non-findings)

| Check | Result |
|-------|--------|
| `find rcode/commands -name 'rihal-*.md'` | 0 hits — no rihal-* command files in rcode/commands |
| All `rcode/commands/*.md` have matching workflow | 1 mismatch: `review-fix.md` vs `code-review-fix.md` — but `review-fix.md` explicitly `@-includes` `.rcode/workflows/code-review-fix.md`; intentional name alias |
| `team.yaml` `file_path:` entries all exist | PASS — all 45 agent files resolve |
| `team.yaml` `skill_path:` entries all exist | PASS — all skill dirs resolve |
| `rcode/workflows` `subagent_type` refs → agent files | PASS (confirmed by test + manual grep) |
| Any rihal- refs in `test/` | 0 hits — test suite is clean |
| `rcode/commands/help.md` rihal- refs | 0 hits |
| STORY.md / SPRINT.md files with rihal-* ACs | No STORY/SPRINT files found in the working tree |

---

## Summary

**WARN — 2 critical runtime breakages + 2 stale ref gaps + 2 test blind spots.**

The `rcode/` source tree is fully migrated. All parity gaps are confined to the `.rcode/` install mirror, which is not covered by any current test. The two highest-priority items (L15-01, L15-02) will silently load no skill content when `.rcode/workflows/prfaq.md` or `.rcode/workflows/checkpoint-preview.md` is invoked, because the `@`-ref resolves to a deleted path. The test blind spots (L15-05, L15-06) mean regressions of this class will not be caught automatically until the test scan dirs are extended.

**Recommended fix order:**
1. L15-01, L15-02 — patch two `@`-refs in `.rcode/workflows/` (rihal- → rcode-)
2. L15-03 — patch two `subagent_type` strings in `.rcode/skills/rihal-code-review/steps/step-02-review.md`
3. L15-04 — rename `.rcode/skills/agents/rihal-deviation-analyzer/` → `rcode-deviation-analyzer/`
4. L15-05, L15-06 — extend `at-ref-parity` and `agent-team-parity` tests to scan `.rcode/` paths
