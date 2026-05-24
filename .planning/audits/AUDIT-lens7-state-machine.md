# AUDIT — Lens 7: State Machine (.rihal/ vs .rcode/ state path drift)

**Branch:** audit-lens-7-state-machine  
**Date:** 2026-05-24  
**Auditor:** Lens 7 (state-machine)  
**Prior inventory:** `audit/12-final-rihal-inventory.md` not found; used `audit/11-migration-gaps.md` (full migration gap audit) and `audit/15-rihal-code-state.md` (code-state slice) as prior art.

---

## Scope scanned

| Area | What was checked |
|---|---|
| `.rihal/` on disk | Whether the legacy directory exists at all |
| `.rcode/state.json` | Live state data for `.rihal/` path values (milestone paths, phase goals, sprint goals) |
| `.rcode/config.yaml` | Config keys using old `rihal_` namespace |
| `.rcode/agents-rules/**` | Agent rule files telling executors/verifiers where to read/write state |
| `.rcode/workflows/**` | Workflow files calling rcode-tools with stale paths |
| `rcode/workflows/**` | Source-tree workflow copies |
| `cli/install.js`, `cli/update.js`, `cli/uninstall.js`, `cli/context.js`, `cli/github-sync.js` | CLI code that reads/writes state paths |
| `scripts/dogfood-check.sh` | Phase-transition correctness checks |
| `server/dashboard.js` | Dashboard state reader |
| `rcode/bin/rcode-hooks.cjs`, `.rcode/bin/rcode-hooks.cjs` | Push-guard env var naming |
| `MIGRATIONS.md` | User-facing migration guide with old `.rihal/` instructions |
| `.rcode/_config/files-manifest.csv` | Install manifest path prefixes |
| `.planning/state.json` | Orphan state file regression guard (#462) |

---

## Commands run

```bash
# Disk presence
ls -la .rihal/ 2>/dev/null

# State.json path analysis
python3 -c "import json; ..." # parsed all string values for 'rihal'
grep -n 'rihal' .rcode/state.json

# Agents-rules and workflows
rg -n '\.rihal/' .rcode/agents-rules/
rg -n '\.rihal/' .rcode/workflows/
grep -rn '\.rihal' rcode/workflows/

# CLI and scripts
grep -n '\.rihal\b' cli/install.js cli/update.js cli/uninstall.js cli/context.js cli/github-sync.js
grep -rn '\.rihal' scripts/

# Server
grep -n 'rihal\|RCODE_DIR' server/dashboard.js

# Config
cat .rcode/config.yaml
cat .claude/settings.json

# Manifest
python3 -c "..." # counted .rihal/ vs .cursor/rules/rihal/ rows

# Push guard env var
grep -rn 'RIHAL_PUSH_OK\|RCODE_PUSH_OK' rcode/ cli/ scripts/ server/ .rcode/bin/

# Orphan regression
ls -la .planning/state.json

# Absolute path staleness
ls "/home/hanzla/development/rihal-code/.planning/..."

# Full repo sweep
grep -rn '\.rihal/' . --include='*.md' --include='*.js' --include='*.json' \
  --include='*.yaml' --include='*.yml' --include='*.sh' --include='*.py' \
  --include='*.csv' | grep -v '^./audit/' | grep -v '^./.git/' | grep -v node_modules
```

---

## Findings

### F1 — `.rihal/` directory: not present on disk

**Severity:** INFO (expected state)

The `.rihal/` directory does not exist in this worktree. No legacy cached state files remain; migration completed cleanly for the disk structure.

---

### F2 — `state.json`: stale `rihal/` relative paths in frozen phase goals

**Severity:** WARN

**File:** `.rcode/state.json`

| Line | Path | Value |
|---|---|---|
| 77 | `.phases[2].sprints[0].goal` | `"Create three reference files in rihal/references/ by extracting…"` |
| 105 | `.phases[2].sprints[1].goal` | `"Slim rihal/agents/rihal-integration-checker.md from 456 lines…"` |
| 115 | `.phases[2].sprints[1].stories[1].title` | `"Rewrite rihal-integration-checker.md as slim stub"` |
| 128 | `.phases[2].sprints[2].goal` | `"Slim rihal/agents/rihal-research-synthesizer.md from 254 lines…"` |
| 151 | `.phases[2].sprints[3].goal` | `"Slim rihal/agents/rihal-codebase-mapper.md from 244 lines…"` |

These are historical goal strings in **completed** phases. They are inert — no runtime code replays them as filesystem paths. Risk: AI agents asked to "resume" or "replay" a sprint from these state entries will attempt to access `rihal/agents/` which does not exist; they'll fail at runtime with a path error rather than a state-machine error.

**Classification:** GAP-STATE-DATA (frozen data). Already identified in `audit/15-rihal-code-state.md:94`.

---

### F3 — `state.json`: stale absolute milestone paths pointing to `rihal-code` repo

**Severity:** WARN

**File:** `.rcode/state.json`

| Line (approx) | Field | Value |
|---|---|---|
| 1001 | `milestones[0].path` | `/home/hanzla/development/rihal-code/.planning/milestones/M1-ship-v2/ROADMAP.md` |
| 1010 | `milestones[1].path` | `/home/hanzla/development/rihal-code/.planning/ROADMAP.md` |

**Verification:** Both paths physically exist on disk at the time of this audit (`ls` confirmed). The paths are correct for the developer's machine where the original `rihal-code` repo still lives. However, on any other machine (CI, collaborator, fresh install) these absolute paths will not resolve.

**Classification:** GAP-STATE-DATA (absolute path). Already identified in `audit/15-rihal-code-state.md:113`. The paths are valid today on this specific machine only.

---

### F4 — `state.json`: `RIHAL_PUSH_OK` env var name in sprint goal

**Severity:** INFO (intentional, closed)

**File:** `.rcode/state.json`, line 345

Sprint goal string: `"bash-guard hardening — anchor RIHAL_PUSH_OK, +-refspec force-push detection (#753)"`

**Verification:** Checked `rcode/bin/rcode-hooks.cjs` and `.rcode/bin/rcode-hooks.cjs` — live code uses `RCODE_PUSH_OK=1` (correct renamed var). The state.json entry is a historical sprint *description* of what was planned, not a live code reference. The implementation is correct; the sprint title is a frozen record.

**Classification:** INTENTIONAL — the live push-guard uses `RCODE_PUSH_OK`. The sprint goal string is a frozen historical record and cannot cause runtime breakage.

---

### F5 — `MIGRATIONS.md`: user-facing guide references `.rihal/` correctly (intentional instruction)

**Severity:** INFO (intentional)

**File:** `MIGRATIONS.md` lines 17, 30–31

The migration guide explicitly instructs v3→v4 upgraders to `rm -rf .rihal/` and salvage content from `.rihal/state.json`, `.rihal/JOURNEY.md`. This is correct and intentional — it is the upgrade path documentation, not a stale reference.

**Classification:** INTENTIONAL — the document *describes* the old dir as part of migration instructions.

---

### F6 — `docs/ROADMAP.md`: one-line historical rename description

**Severity:** INFO (intentional)

**File:** `docs/ROADMAP.md:18`

Content: `"Hard rename across the entire stack: .rihal/ → .rcode/, /rihal-* → /rcode-*, agent and skill prefixes."`

This is a changelog entry describing the rename. Not a stale reference.

**Classification:** INTENTIONAL.

---

### F7 — `.rcode/_config/files-manifest.csv`: zero `.rihal/` rows (previously 193)

**Severity:** INFO (fixed)

**Verification:** `python3` parse of the CSV confirmed 0 rows starting with `.rihal/`. The 182 rows containing `rihal` all have path prefix `.cursor/rules/rihal/agents/rihal-*.mdc` — these are intentional (the Cursor agent persona files retain `rihal-` names per the `feedback-rihal-hyphen-namespace` rule).

**Prior gap status:** `audit/15-rihal-code-state.md` flagged 193 stale `.rihal/` rows as GAP-PATH-CODE (high priority). **This gap is now CLOSED** — the manifest was regenerated and all paths correctly point to `.rcode/`.

---

### F8 — `.rcode/agents-rules/**` and `.rcode/workflows/**`: zero `.rihal/` refs (previously 34+)

**Severity:** INFO (fixed)

**Verification:** `rg -n '\.rihal/'` on `.rcode/agents-rules/` returned 0 matches. Same for `.rcode/workflows/` and `rcode/workflows/`.

**Prior gap status:** `audit/11-migration-gaps.md` section B3 listed 34 critical `.rihal/bin/rihal-tools.cjs` references across 11 agent-rules files that would cause `MODULE_NOT_FOUND` at runtime, plus 8 files with stale `.rihal/debug/`, `.rihal/research/`, `.rihal/codebase/` path refs. **All of these are now CLOSED.**

---

### F9 — `.rcode/config.yaml`: `rcode_source_path` key (previously `rihal_source_path`)

**Severity:** INFO (fixed)

**Verification:** `cat .rcode/config.yaml` shows `rcode_source_path:` (value empty). The `rihal_source_path` key flagged as GAP-CONFIG-KEY in `audit/15-rihal-code-state.md:86` has been renamed.

**Prior gap status:** CLOSED.

---

### F10 — `.claude/settings.local.json`: not present

**Severity:** INFO

The file flagged in `audit/11-migration-gaps.md:B5` with stale `.rihal/` test fixture paths (`mkdir -p /tmp/rcode-test-multi3/.rihal/_config`) does not exist in this worktree. Either removed or not checked in.

---

### F11 — `.planning/state.json`: orphan absent (regression guard passing)

**Severity:** INFO (expected — regression #462 not present)

`scripts/dogfood-check.sh` check #1 guards against an orphan `.planning/state.json`. Confirmed this file does not exist — the regression from issue #462 (phase add writing to wrong state file) is not present.

---

### F12 — `server/dashboard.js`: state path clean

**Severity:** INFO

Dashboard reads `RCODE_DIR = process.env.RCODE_DIR || path.join(process.cwd(), '.rcode')` — correctly defaults to `.rcode/`. No `.rihal/` fallback. State reads go through `scanState(RCODE_DIR)`.

---

## Summary table

| Finding | File | Severity | Status |
|---|---|---|---|
| F1 | `.rihal/` on disk | INFO | PASS — not present |
| F2 | `state.json` frozen goal strings with `rihal/` paths | WARN | OPEN — inert but misleading |
| F3 | `state.json` milestone absolute paths to `rihal-code` repo | WARN | OPEN — machine-specific; breaks on any other machine |
| F4 | `state.json` RIHAL_PUSH_OK sprint description | INFO | PASS — live code uses RCODE_PUSH_OK |
| F5 | `MIGRATIONS.md` `.rihal/` instructions | INFO | PASS — intentional migration guide |
| F6 | `docs/ROADMAP.md` rename description | INFO | PASS — intentional changelog |
| F7 | `files-manifest.csv` `.rihal/` rows | INFO | PASS — 193 rows fixed; now 0 |
| F8 | `agents-rules/` + `workflows/` `.rihal/` bin/path refs | INFO | PASS — 34+ refs fixed; now 0 |
| F9 | `config.yaml` `rihal_source_path` key | INFO | PASS — renamed to `rcode_source_path` |
| F10 | `settings.local.json` stale test fixtures | INFO | PASS — file not present |
| F11 | `orphan .planning/state.json` | INFO | PASS — absent (no #462 regression) |
| F12 | `server/dashboard.js` RCODE_DIR path | INFO | PASS — clean |

---

## Verification notes

- **F2 (WARN):** Verified by parsing `state.json` with Python and extracting all string values containing `rihal`. The 5 goal strings are in phases 2 sprints 0–3, which are completed phases. No code in `cli/`, `scripts/`, or `server/` was found that replays these strings as filesystem paths during normal operation. Risk surfaces only if an agent is explicitly asked to "retry sprint 2.1" using state.json as its source of truth.

- **F3 (WARN):** Both absolute paths verified with `ls` on this machine — they resolve to real files in `/home/hanzla/development/rihal-code/`. However, `rihal-code` is the old repo name; on any machine where the repo was cloned under a different path or doesn't exist, `milestones[].path` resolution will fail. The dashboard server reads milestone paths from `state.json` to serve `/api/hierarchy` — confirmed in `server/dashboard.js`. This means the dashboard's milestone view will show broken links on any machine other than this developer's local setup.

- **F7 (fixed):** Cross-checked with Python CSV parse. The 182 `.cursor/rules/rihal/` rows are intentional agent MDC files — correctly included per `feedback-rihal-hyphen-namespace` memory (rihal-* names are preserved in cursor/agents).

- **F8 (fixed):** The 34 critical `MODULE_NOT_FOUND` refs from audit/11 section B3 were confirmed absent. Tested with `rg -n '\.rihal/'` against both the installed `.rcode/agents-rules/` and the source `rcode/agents-rules/` (if present).

---

## Open items requiring action

### HIGH — F3: Absolute milestone paths in state.json

`.rcode/state.json` lines 1001, 1010 contain hardcoded absolute paths to `/home/hanzla/development/rihal-code/`. Dashboard `/api/hierarchy` serves milestone data from these paths. On CI or any other machine these paths will not resolve.

**Recommended fix:** Replace with project-relative paths (`.planning/milestones/M1-ship-v2/ROADMAP.md`). Or make the dashboard resolver relativize against `PROJECT_ROOT` at read time.

**GitHub issue:** Verify if #462 covers this or file separately.

### MEDIUM — F2: Stale `rihal/` dir paths in frozen phase goals

Phase 2 sprint goals reference `rihal/agents/` and `rihal/references/` — dirs that no longer exist. Low runtime risk (completed phases), but an agent acting on these goals will fail at the filesystem layer.

**Recommended fix:** Update the goal strings in state.json to use `rcode/agents/` and `rcode/references/`. Low urgency (phases already complete).

---

## Overall lens status: **WARN**

The critical state-machine path drift (34 broken binary refs in agent-rules, 193 stale manifest rows) has been **fully resolved** since prior audits. Two residual WARN items remain:

1. Absolute filesystem paths in `state.json` milestone entries (machine-specific breakage on any non-developer machine).
2. Frozen `rihal/agents/` strings in completed phase goal text (cosmetic risk; no live path execution unless an agent replays these sprints).

No `.rihal/` directory survives on disk. No live code reads `.rihal/state.json`. The state-machine is clean for production use on this machine; the two WARN items should be addressed before multi-contributor or CI deployment.
