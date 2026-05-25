# AUDIT3 — Round-3 Residue Scan: `.rcode/` Install Mirror

**Generated:** 2026-05-25
**Branch:** audit3-residue-install-mirror
**Scope:** `.rcode/` install mirror only
**Auditor:** round-3 single-agent scan
**Prior context:** audit/17 (round-1, 10-lens), audit/18 (round-2, 10-lens)

---

## Summary

| Area | rihal hits | Clean | Findings |
|------|-----------|-------|----------|
| `.rcode/agents/` | 0 | ✅ CLEAN | — |
| `.rcode/agents-rules/` | 0 | ✅ CLEAN | — |
| `.rcode/bin/` (compiled CJS) | 0 | ✅ CLEAN | — |
| `.rcode/_config/` (manifest.yaml, files-manifest.csv, agent-manifest.csv) | 0 | ✅ CLEAN | — |
| `.rcode/templates/` | 0 | ✅ CLEAN | — |
| `.rcode/context/` | 0 | ✅ CLEAN | — |
| `.rcode/workflows/` | 1 | ✅ INTENTIONAL | INT-COMPANY (RIHAL etymology note) |
| `.rcode/brain/` | 4 | ⚠️ GAP | G1 — stale agent names |
| `.rcode/references/` | 7 | ⚠️ GAP | G2, G3 — banner prefix, GLOBAL_RIHAL var |
| `.rcode/memory/` | 13 | ✅ INTENTIONAL | INT-MIGRATION-DOC / INT-REPO-URL |
| `.rcode/state.json` | 13 | MIXED | G4–G7, INFO only |
| `.rcode/JOURNEY.md` | 8 | ⚠️ GAP | G8 — stale generated artifact |

**PHASE_NUM verifier fix (round-2 regression):** ✅ CONFIRMED CLEAN — zero `$PHASE_NUM` occurrences remain in `.rcode/agents-rules/verifier/`. Both `context-loading.md` and `requirements-coverage.md` use `$PHASE_NUMBER` (correct).

---

## Verified-Clean Items (round-1/2 fixes confirmed)

### VC-1 — `.rcode/workflows/` `/rihal-*` commands
**Status:** CLEAN
**Round-1 found:** 1,704 occurrences across 115 files
**Now:** 0 occurrences of `/rihal-` pattern
```bash
grep -rni "/rihal-" .rcode/workflows/    # → 0 results
```

### VC-2 — `.rcode/agents-rules/verifier/` PHASE_NUM
**Status:** CLEAN — round-2 said 8 remain, now zero
**Files checked:**
- `.rcode/agents-rules/verifier/context-loading.md` — uses `$PHASE_NUMBER` at lines 28, 29, 65
- `.rcode/agents-rules/verifier/requirements-coverage.md` — uses `$PHASE_NUMBER` at line 25
```bash
grep -n "PHASE_NUM\b" .rcode/agents-rules/verifier/*.md    # → 0 results (correct)
grep -n "PHASE_NUMBER" .rcode/agents-rules/verifier/*.md   # → 4 results (correct var name)
```

### VC-3 — `.rcode/_config/` manifests
**Status:** CLEAN
```bash
grep -ni "rihal" .rcode/_config/manifest.yaml       # → 0
grep -ni "rihal" .rcode/_config/files-manifest.csv  # → 0
grep -ni "rihal" .rcode/_config/agent-manifest.csv  # → 0
```

### VC-4 — `.rcode/bin/` compiled binaries
**Status:** CLEAN — `RIHAL_PUSH_OK` not present in compiled binary (GAP-INTERNAL-VAR from audit/12 + audit/15)
```bash
grep -ni "RIHAL_\|rihal" .rcode/bin/rcode-hooks.cjs   # → 0
grep -ni "RIHAL_\|rihal" .rcode/bin/rcode-tools.cjs   # → 0
grep -rni "RIHAL_\|rihal" .rcode/bin/lib/              # → 0
```

---

## GAP Findings

### G1 — Stale Agent Names in Brain Best-Practice
**File:** `.rcode/brain/best-practices/no-theoretical-suggestions.md:52-55`
**Severity:** WARN
**Classification:** GAP
**Content:**
```
52: - `rihal-planner` — every task in SPRINT.md must reference real files
53: - `rihal-executor` — read the target file before writing any change
54: - `rihal-phase-researcher` — cite actual code paths, not presumed ones
55: `rihal-sprint-checker` — flag plans that reference non-existent symbols
```
**Problem:** The "Applies To" list at the end of the rule document names four agents with `rihal-` prefix. The current agent IDs are `rcode-planner`, `rcode-executor`, `rcode-phase-researcher`, `rcode-sprint-checker`. When an agent references this rule to self-check, it sees stale names — if it tries to delegate to these agents, dispatch fails.
**Impact:** Behavioral rule incorrectly brands itself as rihal-era tooling; mild confusion, no runtime failure.
**Verification:**
```bash
grep -n "rihal-" .rcode/brain/best-practices/no-theoretical-suggestions.md
# → lines 52-55 (4 hits)
grep -rni "rcode-planner\|rcode-executor\|rcode-phase-researcher\|rcode-sprint-checker" .rcode/agents/
# verify correct names exist
```

---

### G2 — `RIHAL ►` Stage Banner Prefix in Output Format Reference
**File:** `.rcode/references/output-format.md:45,72,331,357,392`
**Severity:** CRITICAL
**Classification:** GAP
**Content:**
- Line 45 (Stage Banner template): ` RIHAL ► {STAGE NAME}`
- Line 72 (Routing Output example): ` RIHAL ► ROUTING`
- Line 331 (Majlis banner): ` RIHAL ► MAJLIS CONVENING`
- Line 357 (Planning Sprint banner): ` RIHAL ► PLANNING SPRINT 01.1`
- Line 392 (Anti-Patterns): `- Skipping `RIHAL ►` prefix in stage banners`

**Problem:** This is the canonical output-format reference consumed by all agents. It defines `RIHAL ►` as the required stage-banner prefix and explicitly flags *not using it* as an anti-pattern. Any agent following this spec emits `RIHAL ►` to the user — the old brand name in every workflow transition banner. The anti-patterns line at 392 actively prevents agents from switching to `RCODE ►`.
**Impact:** Every agent that reads this reference (which is all of them via `@-include` or inline prompt) will display old brand name in stage banners.
**Verification:**
```bash
grep -n "RIHAL ►\|RIHAL ►" .rcode/references/output-format.md
# → lines 45, 72, 331, 357, 392
```

---

### G3 — `GLOBAL_RIHAL` Shell Variable Name in auto-init-guard
**File:** `.rcode/references/auto-init-guard.md:28-29`
**Severity:** WARN
**Classification:** GAP
**Content:**
```bash
28: GLOBAL_RIHAL="$HOME/.rcode"
29: TOOLS_SRC="$GLOBAL_RIHAL/bin/rcode-tools.cjs"
```
**Problem:** The variable is named `GLOBAL_RIHAL` but it holds the `.rcode` path (correctly renamed directory). The name is cosmetically wrong — any developer or agent reading a command that uses this variable sees old brand. This fragment is embedded in the auto-init bootstrap script that agents copy to run. It works (path resolves correctly) but is visually inconsistent.
**Rename target:** `GLOBAL_RCODE`
**Verification:**
```bash
grep -n "GLOBAL_RIHAL" .rcode/references/auto-init-guard.md
# → lines 28, 29
```

---

### G4 — Stale Sprint Goals in state.json (completed sprints)
**File:** `.rcode/state.json:77,105,115,128,138,151`
**Severity:** INFO
**Classification:** GAP (historical, low priority)
**Content:**
- Line 77: sprint 22.1 goal references `rihal/references/` (pre-rename path prefix)
- Line 105: sprint 22.2 goal references `rihal/agents/rcode-integration-checker.md`
- Line 115: sprint 22.2 story title `"Rewrite rihal-integration-checker.md as slim stub"`
- Line 128: sprint 22.3 goal references `rihal/agents/rcode-research-synthesizer.md`
- Line 138: sprint 22.3 story title `"Rewrite rihal-research-synthesizer.md as slim stub"`
- Line 151: sprint 22.4 goal references `rihal/agents/rcode-codebase-mapper.md`

**Problem:** All are status `"complete"` / `"completed"` — these are historical sprint records from before the v4.0 rebrand. Sprint 22 ran against the pre-rename tree where the path prefix was `rihal/`. The goals are immutable records of past work.
**Impact:** Zero runtime impact. If an agent replays these sprints, it will fail at filesystem layer (path `rihal/agents/` doesn't exist), but replaying completed sprints is not a normal operation.
**Verification:**
```bash
grep -n "\"status\": \"complete" .rcode/state.json | head -10
# confirm all phase-22 sprints are complete
```

---

### G5 — Sprint Goal References `rihal-<name>` as Claude Agent ID
**File:** `.rcode/state.json:225`
**Severity:** INFO
**Classification:** GAP (historical)
**Content:**
```json
"goal": "Add rcode agent <name> CLI command wrapping claude --agent rihal-<name>"
```
**Problem:** Describes a feature that wraps `claude --agent rihal-<name>`. If the underlying `--agent` flag IDs were renamed to `rcode-<name>`, this sprint goal is stale. Sprint is status `"completed"`. The goal text is a historical description.
**Note:** Prior to v4.0, claude agent IDs were `rihal-*`. If the CLI `rcode agent` command hardcodes `rihal-<name>` in the agent flag, that's a live bug. But the compiled binary scan (VC-4) found zero `rihal-` strings in `rcode-hooks.cjs` or `rcode-tools.cjs`, so the live binary is clean.
**Verification:**
```bash
grep -n "rihal-" .rcode/bin/rcode-hooks.cjs    # → 0 (clean)
```

---

### G6 — Phase Slug Contains `rihal-commands`
**File:** `.rcode/state.json:650`
**Severity:** INFO
**Classification:** GAP (immutable slug, low priority)
**Content:**
```json
"slug": "dashboard-command-runner-run-init-and-rihal-commands-through-the-ui"
```
**Problem:** Phase 33's slug was generated before the rename. Slugs are typically immutable identifiers — changing it would break state references. The phase `name` field (line 648) correctly reads `"Dashboard command runner — run init and rcode commands through the UI"` (already fixed).
**Impact:** Cosmetic only. Slug is used as a stable ID, not displayed in UX.
**Verification:**
```bash
sed -n '645,655p' .rcode/state.json
```

---

### G7 — Absolute Paths in state.json milestones Reference `rihal-code` Directory
**File:** `.rcode/state.json:1001,1010`
**Severity:** WARN
**Classification:** INTENTIONAL (INT-REPO-URL) — machine-specific path, already in round-1 WARN list
**Content:**
- Line 1001: `"path": "/home/hanzla/development/rihal-code/.planning/milestones/M1-ship-v2/ROADMAP.md"`
- Line 1010: `"path": "/home/hanzla/development/rihal-code/.planning/ROADMAP.md"`

**Problem:** Milestone path fields contain the absolute filesystem path to `rihal-code/` (the actual local directory name for the git repo). These paths are machine-specific and will fail on any other machine or CI. The directory name `rihal-code` is the repository's name on disk (INT-REPO-URL).
**Note:** This was flagged in round-1 Lens 7 as a WARN. Verifying it is still present and unchanged.
**Verification:**
```bash
sed -n '997,1015p' .rcode/state.json
```

---

### G8 — JOURNEY.md Contains Stale Command Names (Pre-Rename Generated Artifact)
**File:** `.rcode/JOURNEY.md:4,18,22,24,60-62`
**Severity:** WARN
**Classification:** GAP
**Content:**
- Line 4: `**Written by:** /rihal-init` — credits old command name
- Line 18: `Rihal Code (`rcode`)` — brand reference in product description
- Line 22: `The full loop runs in three commands — `/rihal-council` → `/rihal-plan` → `/rihal-execute`.`
- Line 24: `AI assistants lose context on session reset; Rihal fixes this…`
- Line 60: `- \`/rihal-map-codebase\``
- Line 61: `- \`/rihal-scan\``
- Line 62: `- \`/rihal-explore\``

**Problem:** `JOURNEY.md` is the per-project onboarding document generated by `/rcode-init`. This specific file was generated before the v4.0 rebrand (note: `Written by: /rihal-init`, date 2026-05-16). The "Not scanned" section at the bottom points users to run `/rihal-map-codebase`, `/rihal-scan`, `/rihal-explore` — commands that no longer exist (now `/rcode-map-codebase` etc.).
**Impact:** Any user reading this file sees old command names. The three suggested commands at the bottom silently fail if the user runs them.
**Note:** This is the INSTALL MIRROR copy of JOURNEY.md used for testing installs; the template in `init.md` that generates future JOURNEY.md files was already updated (init.md:167 has a naming note that says "do NOT remove"). The installed artifact here is stale.
**Verification:**
```bash
grep -n "rihal" .rcode/JOURNEY.md
# → lines 1, 4, 18, 22, 24, 60-62
```

---

## Intentional / Not-a-Gap

### INT-1 — `init.md:167` RIHAL naming note
**File:** `.rcode/workflows/init.md:167`
**Classification:** INTENTIONAL (INT-COMPANY)
```
**Naming note (do NOT remove from the template):** the file is `JOURNEY.md`, not `RIHAL.md`.
This is intentional — same Arabic root, different word. **rcode (رحّال)** = the traveler/tool.
**Rihla (رحلة)** = the journey/voyage.
```
The note explicitly says "do NOT remove" and explains the Arabic etymology. The mention of RIHAL here is a linguistic explanation of the brand, not a stale reference.

### INT-2 — `.rcode/memory/` migration tracking documents
**Files:** `memory/distillates/project.distillate.md`, `memory/milestones/current.md`, `memory/incidents/known-issues.md`, `memory/project/decisions.md`
**Classification:** INTENTIONAL (INT-MIGRATION-DOC)
All references document the v4.0 rebrand, track open issue #861, and record the decision history. These are factual historical records. Removing them would destroy the project's audit trail.

### INT-3 — `.rcode/memory/people/stakeholders.md:38` GitHub URL
**File:** `.rcode/memory/people/stakeholders.md:38`
**Classification:** INTENTIONAL (INT-REPO-URL)
`github.com/hanzlahabib/rihal-code` is the actual repository URL — the repo is literally named `rihal-code`. Changing this would be wrong.

### INT-4 — `state.json` memory test decision (line 945)
**File:** `.rcode/state.json:945`
**Content:** `"summary": "test A — cross-project memory from rihal-code"`
**Classification:** INTENTIONAL (INT-REPO-URL)
Project name reference in a decision record. This names the project being tested — it's a fixture.

---

## Priority Table

| ID | Severity | File | Line(s) | Action |
|----|----------|------|---------|--------|
| G2 | **CRITICAL** | `.rcode/references/output-format.md` | 45,72,331,357,392 | Replace `RIHAL ►` with `RCODE ►` in template; update anti-patterns line 392 |
| G8 | **WARN** | `.rcode/JOURNEY.md` | 4,18,22,24,60-62 | Regenerate via `/rcode-init --reset` or manual update of command names |
| G1 | **WARN** | `.rcode/brain/best-practices/no-theoretical-suggestions.md` | 52-55 | Replace `rihal-planner/executor/phase-researcher/sprint-checker` with `rcode-` names |
| G3 | **WARN** | `.rcode/references/auto-init-guard.md` | 28-29 | Rename `GLOBAL_RIHAL` → `GLOBAL_RCODE` |
| G7 | **WARN** | `.rcode/state.json` | 1001,1010 | Already in round-1 WARN list; machine-specific path; low fix priority |
| G4 | INFO | `.rcode/state.json` | 77,105,115,128,138,151 | Historical completed-sprint records; no action needed |
| G5 | INFO | `.rcode/state.json` | 225 | Historical; binary confirmed clean |
| G6 | INFO | `.rcode/state.json` | 650 | Immutable slug; no action needed |

---

## Verification Commands (for fix validation)

```bash
# G2 fix check
grep -n "RIHAL ►" .rcode/references/output-format.md   # should → 0

# G8 fix check
grep -n "/rihal-" .rcode/JOURNEY.md   # should → 0

# G1 fix check
grep -n "rihal-" .rcode/brain/best-practices/no-theoretical-suggestions.md   # should → 0

# G3 fix check
grep -n "GLOBAL_RIHAL" .rcode/references/auto-init-guard.md   # should → 0

# Full mirror residue count after fixes
grep -rni "rihal" .rcode/ \
  --exclude-dir=memory \
  --exclude="state.json" \
  | grep -v "rihal-code\|INT-COMPANY\|rihal.*rcode\|RIHLA\|Rihla\|rihla\|JOURNEY" \
  | wc -l   # should → 0
```
