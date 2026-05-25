# AUDIT3 — Round-3 Residue Scan: `rcode/` Source Tree

**Scope:** `rcode/` source tree only (not `.rcode/` install mirror, not `docs/`, not `tests/`)
**Auditor:** Round-3 residue audit (audit3-residue-source-tree branch)
**Prior rounds:** audit/12 (final-rihal-inventory), audit/17 (lens-audit-summary), audit/18 (round-2-summary)
**Headline count:** `grep -rni 'rihal' rcode/ --exclude-dir=node_modules | wc -l` → **10 hits across 5 files**

---

## Summary

| Classification | Count |
|---|---|
| INTENTIONAL | 2 lines (2 files) |
| GAP | 8 lines (3 files) |

All 10 hits accounted for. No previously-unknown files. The 8 GAP hits were missed in prior rounds: `examples/` banners were fixed but the canonical reference document (`output-format.md`) and one skill step were not updated; the `GLOBAL_RIHAL` variable was flagged at `info` severity in AUDIT-lens8-i18n and not yet actioned.

---

## INTENTIONAL Items

### INT-1 — `rcode/config/model-profiles.schema.json:3`

```
"$id": "https://github.com/hanzlahabib/rihal-code/blob/main/rcode/config/model-profiles.schema.json"
```

**Classification:** INT-REPO-URL
**Reason:** This is the actual GitHub repository URL (the repo is named `rihal-code`). The `$id` field is a JSON Schema canonical identifier — changing it would break schema consumers that dereference the `$id` URI. Matches `INT-REPO-URL` tag in audit/17.
**Verify:** `grep -n '$id' rcode/config/model-profiles.schema.json`

---

### INT-2 — `rcode/workflows/init.md:167`

```
the file is `JOURNEY.md`, not `RIHAL.md`. This is intentional — same Arabic root, different word.
**rcode (رحّال)** = the traveler/tool. **Rihla (رحلة)** = the journey/voyage.
```

**Classification:** INT-LEGACY-SCOPE (Arabic etymology explanation)
**Reason:** This paragraph is a naming-note guard comment, explicitly marked "do NOT remove from the template". It explains *why* the file is not called RIHAL.md. It references `RIHAL` as a word to reject, not as the brand. Matches audit/17 line 259 ("explicitly says 'do NOT remove'"). The `RIHAL` here is the road-not-taken name, not a live reference to old branding.
**Verify:** `grep -n 'RIHAL\|do NOT remove' rcode/workflows/init.md`

---

## GAP Items

### GAP-1 — `rcode/references/output-format.md` (5 hits) — SEVERITY: P1

The canonical output-format reference document still uses `RIHAL ►` as the stage banner prefix throughout. This is the **source of truth** that all workflows and skills derive their banner format from. Any agent reading this spec will emit `RIHAL ►` banners. The `examples/` banners were fixed in prior rounds (confirmed in AUDIT-lens9-documentation.md) but the reference document itself was not updated.

| Line | Content | Fix |
|---|---|---|
| 45 | ` RIHAL ► {STAGE NAME}` (generic template) | ` RCODE ► {STAGE NAME}` |
| 72 | ` RIHAL ► ROUTING` (routing example) | ` RCODE ► ROUTING` |
| 331 | ` RIHAL ► MAJLIS CONVENING` (majlis example) | ` RCODE ► MAJLIS CONVENING` |
| 357 | ` RIHAL ► PLANNING SPRINT 01.1` (RTL section example) | ` RCODE ► PLANNING SPRINT 01.1` |
| 392 | `Skipping \`RIHAL ►\` prefix in stage banners` (anti-pattern) | `Skipping \`RCODE ►\` prefix in stage banners` |

**Why missed in prior rounds:** Prior rounds fixed the 3 `RIHAL ►` banners in `examples/` (audit/12 item #18 borderline case, resolved per AUDIT-lens9-documentation.md:148). The 5 hits in `rcode/references/output-format.md` were in the top-20 file table (audit/12:321) but were not actioned — the borderline-case note (audit/12:343) described the examples/ hits specifically, leaving the references/ hits without a fix decision.

**Verify:**
```bash
grep -n 'RIHAL ►' rcode/references/output-format.md
```
**Expected after fix:** 0 hits.

---

### GAP-2 — `rcode/references/auto-init-guard.md:28-29` — SEVERITY: P2

```bash
GLOBAL_RIHAL="$HOME/.rcode"
TOOLS_SRC="$GLOBAL_RIHAL/bin/rcode-tools.cjs"
```

**Issue:** Shell variable name `GLOBAL_RIHAL` retains old brand. The variable's *value* (`$HOME/.rcode`) is correct — only the identifier name is stale. Any developer reading or copy-pasting this guard snippet sees the old brand in the variable name.

**Fix:** Rename `GLOBAL_RIHAL` → `GLOBAL_RCODE` at both lines (declaration + use).

**Why missed in prior rounds:** Flagged at `info` severity in AUDIT-lens8-i18n.md:88 ("minor since not printed to user") — deprioritized and not actioned in rounds 1 or 2.

**Verify:**
```bash
grep -n 'GLOBAL_RIHAL' rcode/references/auto-init-guard.md
```

---

### GAP-3 — `rcode/skills/actions/2-plan/rcode-create-milestone/steps/step-10-complete.md:19` — SEVERITY: P1

```
 RIHAL ► ROADMAP CREATED
```

**Issue:** User-visible stage banner inside a skill workflow step. When `/rcode-create-milestone` completes, the agent is instructed to output this banner verbatim to the user. This is live, user-facing output — the most visible residue class.

**Fix:** Replace with ` RCODE ► ROADMAP CREATED`

**Why missed in prior rounds:** This file was not in the top-20 rihal-inventory list (audit/12) and was not enumerated in audit/17 or audit/18. It slipped through all prior rounds.

**Verify:**
```bash
grep -n 'RIHAL ►' rcode/skills/actions/2-plan/rcode-create-milestone/steps/step-10-complete.md
```

---

## Complete File × Classification Matrix

| File | Line(s) | Classification | Severity | Fix needed |
|---|---|---|---|---|
| `rcode/config/model-profiles.schema.json` | 3 | INT-REPO-URL | — | No |
| `rcode/workflows/init.md` | 167 | INT-LEGACY-SCOPE | — | No |
| `rcode/references/output-format.md` | 45, 72, 331, 357, 392 | GAP | P1 | Yes — s/RIHAL/RCODE/g (banner prefix only) |
| `rcode/references/auto-init-guard.md` | 28, 29 | GAP | P2 | Yes — rename var `GLOBAL_RIHAL` → `GLOBAL_RCODE` |
| `rcode/skills/actions/2-plan/rcode-create-milestone/steps/step-10-complete.md` | 19 | GAP | P1 | Yes — s/RIHAL/RCODE/ in banner |

---

## Root Cause of Gaps

All 8 GAP lines share the same miss pattern: prior rounds focused fix effort on `examples/` and `.rcode/` install-mirror hits, treating `rcode/references/` as lower priority because those files "just define the spec". But `output-format.md` is the canonical spec document — agents read it and emit banners verbatim. The step completion file (`step-10-complete.md`) was never enumerated because it sits deep in a skill sub-step directory not covered by the top-20 inventory sweep.

---

## Recommended Fix Commands

```bash
# GAP-1: output-format.md — banner prefix (5 replacements)
sed -i 's/RIHAL ►/RCODE ►/g' rcode/references/output-format.md

# GAP-2: auto-init-guard.md — variable name (2 replacements)
sed -i 's/GLOBAL_RIHAL/GLOBAL_RCODE/g' rcode/references/auto-init-guard.md

# GAP-3: step-10-complete.md — banner (1 replacement)
sed -i 's/RIHAL ►/RCODE ►/g' rcode/skills/actions/2-plan/rcode-create-milestone/steps/step-10-complete.md

# Verify: 0 remaining GAP hits
grep -rni 'rihal' rcode/ --exclude-dir=node_modules | grep -v 'model-profiles.schema.json\|workflows/init.md'
```
