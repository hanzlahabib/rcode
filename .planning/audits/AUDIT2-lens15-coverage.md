# Lens 15 — Coverage: Round 2 (General Code Health)

**Branch:** audit2-lens-15-coverage  
**Date:** 2026-05-25  
**Prior audit:** `.planning/audits/AUDIT-lens15-coverage.md` (2026-05-24)  
**Scope:** Parity gaps — commands with no help.md entry; subagent_type refs without matching agent; workflows referenced by commands that don't exist; skills listed in team.yaml with no skill dir; vague acceptance criteria; INIT call sites without .ok check.  
**Status: WARN** — all 6 prior critical/warn findings are fixed. 4 new findings: 8 commands missing from help.md (warn), 2 test failures in pre-install environments (critical for CI), 1 test coverage gap (warn), and 27 agents without skill_path (info by design).

---

## Prior Findings — Resolution Status

| ID | Prior Finding | Status |
|----|--------------|--------|
| L15-01 | `.rcode/workflows/prfaq.md` — broken `@rcode/.../rihal-prfaq/SKILL.md` | **FIXED** — now `@rcode/skills/actions/1-analysis/rcode-prfaq/SKILL.md` |
| L15-02 | `.rcode/workflows/checkpoint-preview.md` — broken `@rcode/.../rihal-checkpoint-preview/SKILL.md` | **FIXED** — now `@rcode/skills/actions/4-implementation/rcode-checkpoint-preview/SKILL.md` |
| L15-03 | `.rcode/skills/rihal-code-review/steps/step-02-review.md` — `subagent_type="rihal-security-adversary"` and `rihal-edge-case-hunter"` | **FIXED** — `.rcode/skills/` directory has been removed entirely; no stale refs |
| L15-04 | `.rcode/skills/agents/rihal-deviation-analyzer/` — stale install-mirror dir | **FIXED** — `.rcode/skills/agents/` no longer exists in install mirror |
| L15-05 | `test/agent-team-parity.test.cjs` — subagent_type scan skipped `.rcode/skills/` | **FIXED** — test now scans `rcode/workflows/`, `.rcode/workflows/`, and `.rcode/skills/` |
| L15-06 | `test/at-ref-parity.test.cjs` — SCAN_DIR was `rcode/` only, missed `.rcode/workflows/` | **FIXED** — test now walks both `rcode/` and `.rcode/`; baseline is 0 broken refs |

---

## Commands Run

```bash
# Command ↔ workflow coverage
for cmd in rcode/commands/*.md; do
  name=$(basename "$cmd" .md)
  [ ! -f "rcode/workflows/${name}.md" ] && echo "NO_WORKFLOW: $name"
done

for wf in rcode/workflows/*.md; do
  name=$(basename "$wf" .md)
  [ ! -f "rcode/commands/${name}.md" ] && echo "NO_CMD: $name"
done

# subagent_type refs in rcode/ and .rcode/
grep -rn "subagent_type.*rihal-" rcode/ .rcode/ --include="*.md"
grep -rn "subagent_type" rcode/ --include="*.md" | grep -oP '"[a-z][a-z0-9-]+"' | sort -u

# Verify all subagent_type values resolve to agent files
for type in <all rcode-* types>; do
  [ ! -f "rcode/agents/${type}.md" ] && echo "MISSING AGENT: $type"
done

# team.yaml ↔ agent file and skill_path alignment
grep "skill_path:" rcode/team.yaml | awk '{print $2}' | while read p; do
  [ ! -d "$p" ] && echo "MISSING_DIR: $p"
done
grep "file_path:" rcode/team.yaml | awk '{print $2}' | while read p; do
  [ ! -f "$p" ] && echo "MISSING_FILE: $p"
done

# Commands not advertised in help.md
for cmd in rcode/commands/*.md; do
  name=$(basename "$cmd" .md)
  grep -q "rcode-${name}" rcode/workflows/help.md || echo "NOT_IN_HELP: $name"
done

# All commands registered in module.yaml files
for cmd in $(ls rcode/commands/*.md | xargs -I{} basename {} .md); do
  grep -q "$cmd" rcode/modules/*.yaml || echo "NOT_IN_MODULE: $cmd"
done

# INIT calls without .ok check in next 15 lines
# (per-file Python scan — see verification notes)

# Vague acceptance criteria
grep -rn "should work\|works correctly\|should properly\|should function" rcode/ --include="*.md"

# Test suite
node --test test/*.test.cjs 2>&1 | grep -E "^(✓|✖|ℹ)"
node --test test/at-ref-parity.test.cjs
node --test test/agent-team-parity.test.cjs
node --test test/compliance.test.cjs
node --test test/skills-compliance.test.cjs
node --test test/help-md-parity.test.cjs
node --test test/workflow-purpose-parity.test.cjs
```

---

## New Findings

| ID | File | Line | Description | Severity |
|----|------|------|-------------|----------|
| L15A-01 | `rcode/commands/checkpoint-preview.md` | — | Command `/rcode-checkpoint-preview` not advertised in `rcode/workflows/help.md` | warn |
| L15A-01 | `rcode/commands/execute-milestone.md` | — | Command `/rcode-execute-milestone` not advertised in `help.md` | warn |
| L15A-01 | `rcode/commands/feature-drift.md` | — | Command `/rcode-feature-drift` not advertised in `help.md` | warn |
| L15A-01 | `rcode/commands/lens-audit.md` | — | Command `/rcode-lens-audit` not advertised in `help.md` | warn |
| L15A-01 | `rcode/commands/prfaq.md` | — | Command `/rcode-prfaq` not advertised in `help.md` | warn |
| L15A-01 | `rcode/commands/scaffold-milestone.md` | — | Command `/rcode-scaffold-milestone` not advertised in `help.md` | warn |
| L15A-01 | `rcode/commands/scaffold-skill.md` | — | Command `/rcode-scaffold-skill` not advertised in `help.md` | warn |
| L15A-02 | `test/agent-size-budget.test.cjs` | 71–73 | Fails with "expected >30 agents, got 0" in worktree/pre-install environments — test looks only in `.claude/agents/` and `~/.claude/agents/`; neither populated | critical |
| L15A-03 | `test/package-files-parity.test.cjs` | 20–26 | Fails with "dist/ missing on disk" — `package.json` `files[]` includes `"dist/"` but `dist/` is a gitignored build artifact; test does not skip for pre-build environments (unlike the `bin` sub-test, which does skip) | critical |
| L15A-04 | `test/help-md-parity.test.cjs` | — | Test only checks `help.md → command file` (no phantom ads); does NOT check `command file → help.md` (no undiscoverable commands) — 8 commands exist but are invisible to users | warn |
| L15A-05 | `rcode/team.yaml` | — | 27 of 45 team.yaml entries have no `skill_path` field; those agents embed persona in their agent file only | info |

---

## Verification Notes

### L15A-01 — 8 commands not in help.md (warn)

**Commands confirmed missing:**

| Command file | Frontmatter name | Advertised in help.md? |
|---|---|---|
| `rcode/commands/checkpoint-preview.md` | `rcode-checkpoint-preview` | No |
| `rcode/commands/execute-milestone.md` | `rcode-execute-milestone` | No |
| `rcode/commands/execute-sprint.md` | `rcode-execute-sprint` | No (intentionally internal: `"Internal — Execute a sprint's SPRINT.md"`) |
| `rcode/commands/feature-drift.md` | `rcode-feature-drift` | No |
| `rcode/commands/lens-audit.md` | `rcode-lens-audit` | No |
| `rcode/commands/prfaq.md` | `rcode-prfaq` | No |
| `rcode/commands/scaffold-milestone.md` | `rcode-scaffold-milestone` | No |
| `rcode/commands/scaffold-skill.md` | `rcode-scaffold-skill` | No |

Note: `rcode/commands/code-review.md` was initially flagged but its frontmatter `name` is `rcode-review`, which IS in help.md. It is not a gap.

`execute-sprint.md` carries the description prefix `"Internal —"` so its absence from help.md is intentional. The remaining 7 appear to be genuine omissions — they are public commands with non-trivial functionality but no entry in the user-visible command reference.

**How verified:** Manual grep of `rcode/workflows/help.md` for each command name; confirmed with `test/help-md-parity.test.cjs` (which passes because it only checks the help.md→file direction, not the reverse).

**Fix:** Add entries for `/rcode-checkpoint-preview`, `/rcode-execute-milestone`, `/rcode-feature-drift`, `/rcode-lens-audit`, `/rcode-prfaq`, `/rcode-scaffold-milestone`, `/rcode-scaffold-skill` to the appropriate sections of `rcode/workflows/help.md`.

---

### L15A-02 — agent-size-budget.test.cjs fails in worktree / pre-install environments (critical)

**Root cause:** The test resolves agents from `.claude/agents/` (project-local) or `~/.claude/agents/` (global). In this audit worktree, neither directory is populated with `rcode-*` agents. The source tree (`rcode/agents/` — 45 agents) and the partial install mirror (`.rcode/agents/` — 12 agents) are not considered by `resolveAgentsDir()`.

```
AssertionError: expected >30 agents, got 0 — install drift?
```

The same test's `'no agent exceeds the XL hard cap'` sub-test passes (returns 0 entries = no violations) because it runs on an empty result set. Only the sanity count fails.

**Inconsistency vs bin test:** `test/package-files-parity.test.cjs`'s `bin` sub-test has an explicit `if (!fs.existsSync(distDir)) return;` guard for pre-build state. The `agent-size-budget.test.cjs` sanity test has no equivalent guard for pre-install state.

**Impact:** This test will fail in any fresh checkout, CI environment that hasn't run `install`, and all worktree-based audit runs. Because the XL cap test (`entries.length === 0` is vacuously safe), real size regressions would also be silently missed.

**Fix options:**
1. Add a fallback in `resolveAgentsDir()` to also scan `rcode/agents/` when `.claude/agents/` is unpopulated.
2. Add a guard: `if (entries.length === 0) { test.skip('no installed agents found — run install first'); }`.
3. Expand the source scan to include `rcode/agents/` as a primary candidate.

---

### L15A-03 — package-files-parity.test.cjs fails in pre-build environments (critical)

**Root cause:** `package.json` includes `"dist/"` in `files[]`. The `dist/` directory is produced by `node scripts/build.cjs` (or `npm run build`) and is `.gitignore`d. In a clean checkout or worktree without running the build step, `dist/` does not exist.

```
AssertionError: package.json files[] entries missing on disk:
  - dist/
```

**Inconsistency:** The `bin` sub-test in the same file has a `if (!fs.existsSync(distDir)) return;` guard. The `files[]` test does not.

**Fix:** Add an exemption for `dist/` in the `files[]` test (similar to the `bin` guard), or move `dist/` validation into a separate test that explicitly requires a build step.

---

### L15A-04 — no test for reverse help.md coverage (warn)

**Root cause:** `test/help-md-parity.test.cjs` tests the forward direction only: every `/rcode-X` advertised in `help.md` must have a real command file. It does NOT test the reverse: every command file must appear in `help.md`. This is the gap that allows L15A-01 (8 unadvertised commands) to pass silently.

**Fix:** Add a test `'every rcode/commands/*.md is advertised in help.md or annotated as internal'` that walks `rcode/commands/`, excludes those whose frontmatter `description` starts with `"Internal"`, and asserts all others appear in `help.md`.

---

### L15A-05 — 27 agents without skill_path in team.yaml (info, by design)

`team.yaml` has 45 entries. 18 are "persona" agents (council-type, dispatched by name) with `skill_path` pointing to a `rcode/skills/agents/<name>/SKILL.md`. The remaining 27 are "implementation" agents dispatched via `subagent_type=` in workflows — they embed their full persona in their agent file and do not require a separate SKILL.md.

This is consistent with `test/agents-registry.test.cjs` passing (`every skill_path resolves to a SKILL.md`), which only validates entries that have `skill_path` set. No action needed.

---

## What Was Checked and Found Clean

| Check | Result |
|-------|--------|
| `rihal-*` subagent refs in `rcode/` | **0 hits** — clean |
| `rihal-*` subagent refs in `.rcode/` | **0 hits** — clean |
| All `subagent_type` values in `rcode/` resolve to `rcode/agents/*.md` | **PASS** — 30 unique types, all resolve |
| `team.yaml` `file_path:` entries exist | **PASS** — all 45 entries resolve |
| `team.yaml` `skill_path:` entries exist | **PASS** — all 18 `skill_path` entries resolve to valid dirs with SKILL.md |
| `rcode/agents/*.md` — all registered in team.yaml | **PASS** (`agents-registry` test) |
| Workflow-only files (no matching command) | **15 workflow-only files** — all are confirmed sub-workflows called by parent workflows, not standalone commands |
| Command-only files (no matching workflow) | **`config.md`, `review-fix.md`** — both intentional: `config.md` is an alias (`@.rcode/workflows/settings.md`); `review-fix.md` routes to `code-review-fix.md` |
| `@`-ref baseline (broken refs) | **0** — at-ref-parity baseline is 0, all refs resolve |
| Every workflow has `<purpose>` block | **PASS** (`workflow-purpose-parity` test) |
| All commands registered in `modules/*.yaml` | **PASS** — 0 unregistered commands |
| `help.md` advertised commands resolve to source | **PASS** (`help-md-parity` test) |
| Skills compliance (name, description, line budget) | **PASS** (`skills-compliance` test) |
| All `rcode/skills/agents/*/SKILL.md` — SKILL.md present | **PASS** — all 23 skill-agent dirs have SKILL.md |
| Vague AC patterns (`should work`, `works correctly`) | **No hits** in phase plans or STORY/SPRINT files |
| Workflows with no-verify bypass | **0 hits** (`workflows-no-verify` test) |
| INIT operation names not in rcode-tools dispatch | **0 gaps** — all 24 unique INIT operation names either have explicit dispatch (`execute`, `plan`, `discuss`, `chain`, `audit-uat`) or fall through to generic `cmdInit` which returns valid JSON for any workflow name |
| Module compliance (module.yaml → workflow exists) | **PASS** (`compliance` test) |
| CLI subcommand parity | **PASS** (`cli-subcommand-parity` test) |

---

## Summary

**WARN — 6 prior findings all fixed; 4 new findings.**

The `rcode/` source tree and `.rcode/` install mirror are clean of rihal-* residue. All prior parity tests (L15-05, L15-06) have been extended to scan `.rcode/` paths. The new findings are:

1. **L15A-01 (warn):** 7 genuine public commands have no `help.md` entry — users cannot discover `/rcode-checkpoint-preview`, `/rcode-execute-milestone`, `/rcode-feature-drift`, `/rcode-lens-audit`, `/rcode-prfaq`, `/rcode-scaffold-milestone`, or `/rcode-scaffold-skill` from the help surface.

2. **L15A-02 (critical):** `agent-size-budget.test.cjs` fails in all pre-install environments (fresh checkout, worktrees, CI without `rcode install`). The XL cap test vacuously passes because the agent set is empty — real size regressions would go undetected.

3. **L15A-03 (critical):** `package-files-parity.test.cjs` fails in pre-build environments because `dist/` is gitignored; the test lacks the same guard that the `bin` sub-test uses.

4. **L15A-04 (warn):** No test enforces the reverse direction of help.md parity (every command must appear in help.md). This is the gap that allowed L15A-01 to exist undetected.

**Recommended fix order:**
1. L15A-02 — patch `agent-size-budget.test.cjs` to fall back to `rcode/agents/` when `.claude/agents/` is empty.
2. L15A-03 — add `dist/` guard in `package-files-parity.test.cjs` matching the `bin` sub-test pattern.
3. L15A-04 — add reverse-direction test to `help-md-parity.test.cjs`.
4. L15A-01 — add 7 commands to `help.md` appropriate sections.
