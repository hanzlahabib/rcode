# AUDIT — Lens 4: Extensibility (rihal residue)

**Branch:** audit-lens-4-extensibility  
**Date:** 2026-05-24  
**Auditor:** Lens-4 automated scan  
**Status:** FAIL

---

## Scope Scanned

| Area | Path(s) |
|------|---------|
| Installed workflows | `.rcode/workflows/` (200+ files) |
| Installed skills | `.rcode/skills/` (39 skill dirs + agents/) |
| Source workflows | `rcode/workflows/` |
| Source skills | `rcode/skills/` |
| CLI scripts | `cli/`, `scripts/` |
| CI config | `.github/workflows/` |
| Config & references | `rcode/config/`, `.rcode/references/`, `.rcode/brain/` |
| Binary | `.rcode/bin/rcode-tools.cjs` |

**Prior inventory:** `audit/12-final-rihal-inventory.md` not present (file does not exist in this worktree — checked with `ls audit/`). Findings below stand independently.

---

## Commands Run

```bash
# Binary name residue
grep -rn "rihal-tools" --include="*.js,*.cjs,*.sh,*.yaml,*.json,*.md" . | grep -v node_modules | grep -v audit/

# .rihal/ path hardcoding
grep -rn "\.rihal[/'\"]" --include="*.js,*.cjs,*.sh,*.yaml,*.json" . | grep -v node_modules

# rihal- in .rcode/ MD files (dispatch, command lists, skill IDs)
find .rcode/ -name "*.md" | xargs grep -n "rihal-" | grep -v "hanzlahabib/rihal-code"

# rihal- in rcode/ source (verify clean)
find rcode/ -name "*.md" | xargs grep -l "rihal-" 2>/dev/null

# Hardcoded agent IDs in tool calls
grep -rn "subagent_type.*rihal-\|agent-skills rihal-" .rcode/ rcode/

# Skill directory naming
ls .rcode/skills/          # all 39 skill dirs still named rihal-*
ls .rcode/skills/agents/   # rihal-deviation-analyzer present

# CI semantic scope list
grep -n "rihal" .github/workflows/semantic.yaml

# config.yaml for namespace variable
grep -n "command_prefix\|skill_prefix\|namespace" rcode/config.yaml .rcode/config.yaml
```

---

## Findings

### A. Hardcoded `rihal-` command name lists in dispatch tables

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.rcode/workflows/do.md` | 96–110 | Full dispatch menu lists 15 `/rihal-*` commands (council, plan, execute, sprint-planning, dev-story, etc.) — these are the primary user-facing routing table | **critical** |
| `.rcode/workflows/do.md` | 146–169 | Routing fallback table uses `/rihal-create-prd`, `/rihal-plan`, `/rihal-create-epics-and-stories` as hardcoded prerequisite routes | **critical** |
| `.rcode/workflows/do.md` | 218–221 | Entity→command dispatch table: `phase→/rihal-add-phase`, `story→/rihal-create-story`, `epic→/rihal-create-epics-and-stories` | **critical** |
| `.rcode/workflows/next.md` | 53, 85, 107–147 | Auto-advance workflow emits 10+ hardcoded `/rihal-*` route strings (`/rihal-new-project`, `/rihal-health`, `/rihal-sprint-planning`, etc.) | **critical** |
| `.rcode/workflows/council.md` | 55–60 | Usage examples all use `/rihal-council`, `/rihal-discuss` | **warn** |
| `.rcode/workflows/lens-audit.md` | 35–55 | Lens dispatch table lists `/rihal-lens-audit` invocations and maps all 15 lenses to `rihal-*` subagent IDs | **critical** |
| `.rcode/workflows/help.md` | 59–75 | Complete command reference table uses `/rihal-init`, `/rihal-new-project`, `/rihal-plan`, `/rihal-execute`, `/rihal-next`, `/rihal-status`, `/rihal-progress`, `/rihal-help` | **critical** |
| `.rcode/workflows/*.md` (115 files) | various | Every workflow file contains at least one `/rihal-*` command cross-reference. Total: 1,704 rihal- occurrences across 245 `.rcode/` MD files | **critical** |

**Root cause:** The `.rcode/` installed tree was NOT updated during the rihal-code → rcode rebrand. The source tree (`rcode/workflows/`) has been cleaned (zero `/rihal-*` matches), but `install.js` copies the old versions into `.rcode/` at install time. Any user who installed before the rebrand, or if install.js has not been updated to pull from the new source paths, gets stale command names.

---

### B. Workflows hardcoding `.rihal/` paths instead of reading from config

| File | Line | Description | Severity |
|------|------|-------------|----------|
| *(none found)* | — | No `.rihal/` path hardcodings found in JS, shell, YAML, or workflow MD files. All binary calls use `.rcode/bin/rcode-tools.cjs`. | — |

**Verification:** `grep -rn "\.rihal[/'\"]" --include="*.js,*.cjs,*.sh,*.yaml,*.json" .` returned zero results. Workflows uniformly use `.rcode/bin/rcode-tools.cjs`. **PASS for sub-check B.**

---

### C. Hardcoded skill IDs starting with `rihal-` in switch/dispatch statements

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.rcode/skills/rihal-code-review/steps/step-02-review.md` | 23 | `Task(subagent_type="rihal-security-adversary", ...)` — hardcoded rihal- subagent ID spawned at runtime | **critical** |
| `.rcode/skills/rihal-code-review/steps/step-02-review.md` | 26 | `Task(subagent_type="rihal-edge-case-hunter", ...)` — hardcoded rihal- subagent ID spawned at runtime | **critical** |
| `.rcode/workflows/verify-work.md` | 53 | `node rcode-tools.cjs agent-skills rihal-checker` — queries skills for non-existent `rihal-checker` agent (source is `rcode-sprint-checker`) | **critical** |
| `.rcode/workflows/discuss-phase.md` | 155 | `node rcode-tools.cjs agent-skills rihal-advisor` — queries skills for non-existent `rihal-advisor` agent | **critical** |
| `.rcode/workflows/research-phase.md` | 47 | `node rcode-tools.cjs agent-skills rihal-researcher` — queries skills for non-existent `rihal-researcher` agent | **critical** |
| `.rcode/workflows/lens-audit.md` | 41–55 | Lens-to-subagent dispatch table maps 10 lenses to `rihal-*` agent IDs (rihal-security-adversary, rihal-perf, rihal-edge-case-hunter, rihal-deviation-analyzer, rihal-dep-auditor, rihal-debugger, rihal-i18n-auditor, rihal-docs-auditor, rihal-cross-platform-auditor, rihal-observability-auditor, rihal-layla, rihal-fatima) | **critical** |
| `.rcode/references/model-profiles.md` | 71, 74 | CLI examples reference `resolve-model rihal-sadiq` and `resolve-model rihal-executor` — stale agent IDs in documentation | **warn** |
| `.rcode/brain/best-practices/no-theoretical-suggestions.md` | 52–55 | Four `rihal-planner`, `rihal-executor`, `rihal-phase-researcher`, `rihal-sprint-checker` references in best-practices guidance | **warn** |

**Ghost agents confirmed:** `rihal-checker`, `rihal-advisor`, `rihal-researcher` do not exist anywhere in `.rcode/skills/` or `rcode/skills/`. The `agent-skills` calls will silently return empty strings (suppressed by `2>/dev/null`), breaking the skill-loading logic in those three workflows at runtime without any visible error.

---

### D. `rihal-tools` binary name hardcoded (not via TOOL var)

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.github/workflows/semantic.yaml` | 94 | `rihal-tools` listed as an allowed commit scope alongside `rcode-tools` — legacy scope accepted for backward compatibility | **info** |
| `CONTRIBUTING.md` | 342 | `rihal-tools` documented as "legacy rihal-tools scope (pre-v4 rename); accepted for backward compatibility" | **info** |
| `AGENTS.md` / `CLAUDE.md` | 27 | Both files list `rihal-tools` in the allowed commit scopes list | **info** |
| `.rcode/bin/rcode-tools.cjs` | — | Binary is named `rcode-tools.cjs` — **clean**. Zero `rihal-tools` occurrences inside the binary itself. | — |

**Note:** The `rihal-tools` entries in semantic.yaml, CONTRIBUTING.md, AGENTS.md, and CLAUDE.md appear to be intentional backward-compatibility provisions (explicitly labeled as such). The binary itself is correctly named `rcode-tools.cjs`. Sub-check D is mostly **PASS** for the binary, with INFO-level scope entries that are documented intentional.

---

### E. Installed skill directory naming (extensibility blocker)

| Finding | Count | Severity |
|---------|-------|----------|
| Skill directories in `.rcode/skills/` still named `rihal-*` | **39 dirs** | **critical** |
| Agent skill dir still named `rihal-deviation-analyzer` in `.rcode/skills/agents/` | **1 dir** | **critical** |
| Source `rcode/skills/agents/` has `rcode-deviation-analyzer` (correct) | — | confirms gap |

All 39 installed skill dirs carry `rihal-` prefix. These are the IDs used in `Skill tool` invocations. If a user tries to invoke `rcode-create-prd` (the rebranded name), the runtime cannot find it because the installed skill is named `rihal-create-prd`. This is the primary extensibility blocker: the Skill tool dispatch table is the entire `.rcode/skills/` directory tree.

---

### F. No configurable command/skill namespace

| Finding | Severity |
|---------|----------|
| `rcode/config.yaml` has no `command_prefix`, `skill_prefix`, or `namespace` variable | **warn** |
| `.rcode/config.yaml` same — no prefix config | **warn** |
| All command names are hardcoded in 245 workflow/skill MD files | **warn** |

There is no single config key that controls the `rihal-` prefix, meaning a future rename requires a mass sed-replace across 245 files rather than a single config change. This is the structural extensibility gap.

---

## Verification Notes

- **Source tree is clean:** `find rcode/ -name "*.md" | xargs grep -l "rihal-" 2>/dev/null` returns zero results (except `lens-audit.md` which has rihal- only in its internal lens description table — verified intentional). The rebrand happened in source but was not propagated to `.rcode/` installed copies.
- **Ghost agents verified:** `find .rcode/ rcode/ -name "rihal-checker*" -o -name "rihal-advisor*" -o -name "rihal-researcher*"` returned no results — confirming these agent IDs in workflow calls are dangling references.
- **Binary is clean:** `grep -n "rihal" .rcode/bin/rcode-tools.cjs | grep -v hanzlahabib` returned zero matches — the compiled binary was correctly updated.
- **`.rihal/` path residue:** Zero occurrences in executable code — this sub-check passes cleanly.
- **`rihal-tools` as binary call:** Zero occurrences in workflows or skills — all calls use `rcode-tools.cjs`. The `rihal-tools` entries are only in commit-scope allowlists (intentional).

---

## Summary Table

| Sub-check | Status | Critical findings |
|-----------|--------|-------------------|
| A. Dispatch tables with hardcoded `rihal-` commands | **FAIL** | 115 workflow files, 1,704 occurrences |
| B. Workflows hardcoding `.rihal/` paths | **PASS** | 0 occurrences |
| C. Hardcoded `rihal-` skill IDs in switch/spawn | **FAIL** | 3 ghost agent calls + 39 stale skill dirs |
| D. `rihal-tools` binary name hardcoded | **PASS (INFO)** | Legacy scope entries only, binary clean |
| E. Skill directory names block dispatch | **FAIL** | 39+1 dirs named `rihal-*` in installed tree |
| F. No configurable command namespace | **WARN** | No prefix config key exists |

**Overall: FAIL**

---

## Recommended Issues to File

1. **[P1] Sync `.rcode/` installed tree with rebranded `rcode/` source** — 115 workflow files need `/rihal-*` → `/rcode-*` command name replacement. Root fix: update `install.js` to copy from the now-clean `rcode/workflows/` source.
2. **[P1] Rename 39 skill dirs in `.rcode/skills/` from `rihal-*` to `rcode-*`** — Skill tool dispatch will fail for any user trying `/rcode-create-prd` etc.
3. **[P1] Fix 3 ghost `agent-skills` calls** — `rihal-checker`, `rihal-advisor`, `rihal-researcher` do not exist; calls in `verify-work.md`, `discuss-phase.md`, `research-phase.md` silently return empty, breaking skill-loading.
4. **[P1] Fix `subagent_type="rihal-security-adversary"` and `"rihal-edge-case-hunter"`** in `.rcode/skills/rihal-code-review/steps/step-02-review.md` — these spawn agents by stale IDs.
5. **[P2] Rename `.rcode/skills/agents/rihal-deviation-analyzer/`** → `rcode-deviation-analyzer/` to match source.
6. **[P3] Add `skill_prefix` config key** to `rcode/config.yaml` so future renames need one-line config change, not mass file edits.
