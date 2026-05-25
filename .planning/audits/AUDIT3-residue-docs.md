# AUDIT3 — Documentation Residue Scan (Round 3)

**Scope:** Documentation only — `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`, `MIGRATIONS.md`, `docs/`, `audit/`, `.cursor/rules/rcode/`
**Excluded:** source code, `.rcode/` install mirror, `test/`, `cli/`, `server/`, `rcode/`, `node_modules/`, `.planning/` (except prior audit outputs)
**Date:** 2026-05-25
**Branch:** audit3-residue-docs-audits
**Prior rounds:** audit/17 (round-1, 10-lens + 2 helpers), audit/18 (round-2, 10-lens)
**INT-* taxonomy source:** `audit/17-lens-audit-summary.md` § "Intentional Residue"

---

## Scan Method

```bash
grep -rni "rihal" README.md CHANGELOG.md CONTRIBUTING.md AGENTS.md CLAUDE.md MIGRATIONS.md
grep -rni "rihal" docs/ --include="*.md"
grep -rni "rihal" audit/ --include="*.md"
grep -rni "rihal" .cursor/rules/rcode/
grep -rni "Rihalian" [all doc files]
grep -rni "Rihal\b" [all doc files] | filter known-intentional
```

---

## Summary

| Area | Total rihal hits | INTENTIONAL | GAP | BORDERLINE |
|------|-----------------|-------------|-----|------------|
| README.md | 3 | 3 | 0 | 0 |
| CHANGELOG.md | 15 | 13 | 0 | 2 |
| CONTRIBUTING.md | 1 | 1 | 0 | 0 |
| AGENTS.md | 1 | 0 | 1 | 0 |
| CLAUDE.md | 1 | 0 | 1 | 0 |
| MIGRATIONS.md | 9 | 9 | 0 | 0 |
| docs/ | 10 | 10 | 0 | 0 |
| audit/ (01–16) | ~650 | ~650 | 0 | 1 |
| .cursor/rules/rcode/ | 0 | — | — | — |
| **TOTAL** | **~690** | **~686** | **2** | **3** |

**Headline:** Documentation scope is largely clean post-rounds 1 and 2. Four residue items survived — two minor annotation gaps in AGENTS.md/CLAUDE.md, two borderline "Rihalians" uses in CHANGELOG historical entries, and one misleading root-directory label in an architecture audit file.

---

## CLEAN AREAS (no gaps found)

### .cursor/rules/rcode/ — CLEAN

```bash
grep -rni "rihal" .cursor/rules/rcode/
# → (no output)
```

All 182 files (previously `.cursor/rules/rihal/`, C14 in round-1) were cleared by round-1 fixes. The `rcode/` replacement tree has zero rihal references.

### MIGRATIONS.md — CLEAN (all INT-MIGRATION-DOC)

All 9 rihal hits describe the v3→v4 migration path:

| Line | Content | Classification |
|------|---------|----------------|
| 11 | "hard rename from the legacy `rihal` branding" | INT-MIGRATION-DOC |
| 17 | `.rihal/` → `.rcode/` table row | INT-MIGRATION-DOC |
| 18–21 | `/rihal-*` → `/rcode-*` prefix table | INT-MIGRATION-DOC |
| 30–31 | `rm -rf .rihal/` migration commands | INT-MIGRATION-DOC |

These are the canonical migration instructions for v3.x users. Must be preserved.

### docs/ — CLEAN (all INT-MIGRATION-DOC, INT-REPO-URL, or INT-COMPANY)

| File | Line | Content | Classification |
|------|------|---------|----------------|
| `docs/what-is-rcode-code.md` | 67 | "`rihal-*` prefix was retired" | INT-MIGRATION-DOC — describing v4.0.0 changes |
| `docs/USP.md` | 198 | "incidents on real Rihal projects...before being separated and rebranded" | INT-COMPANY — company attribution explaining skill provenance; the sentence explicitly notes the rebrand |
| `docs/verification/v2.0-gap-fixes.md` | 3 | `github.com/hanzlahabib/rihal-code/issues/136` | INT-REPO-URL |
| `docs/pre-demo-checklist.md` | 9, 12 | `github.com/hanzlahabib/rihal-code/issues/165,162` | INT-REPO-URL |
| `docs/pre-demo-checklist.md` | 23 | git tag message `"v4.0.0 — rihal->rcode rename..."` | INT-MIGRATION-DOC |
| `docs/pre-demo-checklist.md` | 77 | `github.com/hanzlahabib/rihal-code/milestone/4` | INT-REPO-URL |
| `docs/adr/0003-mcp-server-for-rcode-brain.md` | 7 | `github.com/hanzlahabib/rihal-code/issues/163` | INT-REPO-URL |
| `docs/ROADMAP.md` | 17–18 | "v4.0.0 — `rihal-*` → `rcode-*` rename" milestone description | INT-MIGRATION-DOC |

No docs/ files contain any `/rihal-*` slash commands used as active user guidance. All rihal mentions describe historical facts or live GitHub URLs.

Verification:
```bash
grep -rn "/rihal-[a-z][a-z]" docs/ | grep -v "rihal-code"
# → (no output — confirmed clean)
```

### README.md — CLEAN (all INT-REPO-URL or INT-COMPANY)

| Line | Content | Classification |
|------|---------|----------------|
| 13 | CI badge URL `github.com/hanzlahabib/rihal-code/actions/...` | INT-REPO-URL |
| 84 | Issues link `github.com/hanzlahabib/rihal-code/issues` | INT-REPO-URL |
| 165 | `https://rihal.om` Omani company attribution | INT-COMPANY |

### CONTRIBUTING.md — CLEAN (INT-LEGACY-SCOPE)

| Line | Content | Classification |
|------|---------|----------------|
| 342 | `rihal-tools — legacy rihal-tools scope (pre-v4 rename); accepted for backward compatibility` | INT-LEGACY-SCOPE — explicitly labeled and documented |

This is the authoritative source for the `rihal-tools` backward-compat scope decision. Preserve as-is.

### CHANGELOG.md — CLEAN for most, 2 BORDERLINE entries

Lines 6–17, 37, 49, 52, 57, 65, 69, 302 are all INT-MIGRATION-DOC (v4.0.0 rename record).
Lines 839, 1189 are INT-REPO-URL (live GitHub URLs).

Two entries require human decision (see BORDERLINE section below).

### audit/ files 01–16 — CLEAN (all INT-MIGRATION-DOC)

All ~650 rihal hits in `audit/01-security.md` through `audit/16-rihal-docs-tests.md` are internal audit records cataloguing migration state. These are historical documents, not live guidance. Preserve as-is.

One entry in `audit/07-architecture.md` is BORDERLINE (see below).

---

## FINDINGS

### F1 — AGENTS.md:27 — `rihal-tools` scope lacks "legacy" annotation

**File:** `AGENTS.md`
**Line:** 27
**Severity:** WARN (documentation drift)
**Classification:** GAP

**Content:**
```
Scopes allowed: `agents`, `skills`, ..., `rcode-tools`, `rihal-tools`, `team`, ...
```

**Issue:** `rihal-tools` appears in the scope list without any indication that it is a deprecated backward-compat scope. `CONTRIBUTING.md:342` explicitly labels it: *"legacy rihal-tools scope (pre-v4 rename); accepted for backward compatibility."* An AI agent using AGENTS.md as its sole authority (without reading CONTRIBUTING.md) could use `rihal-tools` as an active scope for new commits, treating it as a current first-class scope equivalent to `rcode-tools`.

**Risk:** Low runtime risk (the semantic PR check will still accept the scope). Medium documentation confusion risk — agents running in sessions that only load AGENTS.md will not know the scope is deprecated.

**NOT caused by:** round-1 or round-2 fixes — this annotation gap predates the audits.

**Verification:**
```bash
grep -n "rihal-tools" AGENTS.md
# → 27:  Scopes allowed: ..., `rihal-tools`, ...
grep -n "rihal-tools" CONTRIBUTING.md
# → 342:  - `rihal-tools` — legacy rihal-tools scope (pre-v4 rename); accepted for backward compatibility
```

**Recommended fix:** Add ` (legacy)` suffix or a parenthetical in AGENTS.md's scope list so it reads `rihal-tools (legacy)`, matching the intent documented in CONTRIBUTING.md:342. Or move it to a separate "Deprecated / backward-compat scopes" bullet below the main list.

---

### F2 — CLAUDE.md:27 — `rihal-tools` scope lacks "legacy" annotation + scope list drift

**File:** `CLAUDE.md`
**Line:** 27
**Severity:** WARN (documentation drift)
**Classification:** GAP

**Content:**
```
Scopes allowed: `agents`, `skills`, ..., `rcode-tools`, `rihal-tools`, `team`, `usp`, `v4`, `observability`, `audit`
```

**Issue A (rihal-specific):** Same as F1 — `rihal-tools` listed without "legacy" annotation.

**Issue B (parity gap — not rihal residue):** CLAUDE.md's scope list ends at `audit` and is missing 4 scopes that AGENTS.md:27 includes: `agent-rules`, `cursor`, `i18n`, `phase`. While this is not a rihal residue issue, it means agents running under CLAUDE.md instructions will not recognize valid scopes that were added after CLAUDE.md was last updated.

**Verification:**
```bash
grep -n "rihal-tools" CLAUDE.md AGENTS.md
# CLAUDE.md:27:  ..., `rihal-tools`, ...
# AGENTS.md:27:  ..., `rihal-tools`, ...
# CLAUDE.md missing scopes vs AGENTS.md:
grep -o '`[a-z-]*`' AGENTS.md | grep -Fxvf <(grep -o '`[a-z-]*`' CLAUDE.md)
# → `agent-rules`, `cursor`, `i18n`, `phase`
```

**Recommended fix:** Update CLAUDE.md:27 to match AGENTS.md:27 exactly, and add the "legacy" annotation for `rihal-tools` in both files.

---

### F3 — CHANGELOG.md:835 — "Rihalians" as user group in v2.0.0 description

**File:** `CHANGELOG.md`
**Line:** 835
**Severity:** INFO / BORDERLINE
**Classification:** BORDERLINE — human decision required (per audit/12 GAP-ARABIC-DOC note)

**Content:**
```
rcode is no longer a generic AI-engineering methodology ... It is **the installable context-brain
for Rihalians** — every rcode project can now pull PR standards ...
```

**Issue:** "Rihalians" (the demonym for Rihal company employees) appears in the v2.0.0 release entry. Post-rebrand, the canonical user label is "rcode users" or "rcode engineers." Audit/12 tagged this as `GAP-ARABIC-DOC` with the note that it "requires a human decision on scope — see Borderline Cases."

**Arguments for INTENTIONAL (preserve):**
- CHANGELOG is a historical record of what was shipped. Changing it retroactively rewrites history.
- At the time v2.0.0 shipped (2026-04-15), "Rihalians" was the official user group name.
- This is an older changelog entry, not live guidance.

**Arguments for GAP (fix):**
- CHANGELOG is user-facing content that new contributors and evaluators read.
- "Rihalians" is confusing to external users who don't know the Rihal company context.
- Audit/12 explicitly flagged it under GAP-ARABIC-DOC.

**Verification:**
```bash
grep -n "Rihalian" CHANGELOG.md
# → 835: ...installable context-brain for Rihalians...
# → 885: ...Rihalian project from github.com/rcode-om/template...
```

**Recommended action:** Human decision. If external audience matters: replace with "rcode users" at line 835 and "rcode" at line 885. If CHANGELOG is treated as immutable history: add a `> **Note (v4.0.0):**` block after the v2.0.0 section clarifying the terminology change.

---

### F4 — CHANGELOG.md:885 — "Rihalian project" in feature description

**File:** `CHANGELOG.md`
**Line:** 885
**Severity:** INFO / BORDERLINE
**Classification:** BORDERLINE — same reasoning as F3

**Content:**
```
`rcode-scaffold-project` skill — bootstraps a new Rihalian project from `github.com/rcode-om/template`
```

**Issue:** "Rihalian project" in a feature description. Same arguments as F3. The feature itself (`rcode-scaffold-project`) is correctly named; the adjective "Rihalian" is the stale part.

---

### F5 — audit/07-architecture.md:6 — Root directory shown as `rihal-code/`

**File:** `audit/07-architecture.md`
**Line:** 6
**Severity:** INFO / BORDERLINE
**Classification:** BORDERLINE

**Content:**
```
rihal-code/
├── cli/            SOURCE — CLI commands + installer logic ...
├── rcode/          SOURCE — Prompt assets shipped to users on install
```

**Issue:** The architecture system map shows the repo root as `rihal-code/`. New contributors cloning from `github.com/hanzlahabib/rihal-code` will see a directory called `rihal-code/` on disk — so this is technically accurate (INT-REPO-URL territory). However, all docs, READMEs, and the brand use `rcode`. A new user reading the architecture doc expects the brand name (`rcode`) as the root, not the GitHub checkout name.

**Arguments for INTENTIONAL:** The directory name is the actual checkout name from the live GitHub repo. Changing it would create a discrepancy between the doc and reality.

**Arguments for GAP:** Architecture docs should use the brand, not the filesystem path. The tree could show `.` or `rcode` (the package brand name) as the root to avoid confusion. This is a minor branding inconsistency in an audit file.

**Verification:**
```bash
grep -n "rihal" audit/07-architecture.md
# → 6: rihal-code/
```

**Recommended action:** Low priority. If the GitHub repo is eventually renamed to `rcode`, this should be updated. Until then, either leave as-is (accurate) or change to `.` (neutral) or `rcode` (brand-aligned).

---

## Previously-Fixed Items Verified Clean

| Item | Round fixed | Verified by this audit |
|------|------------|----------------------|
| `.cursor/rules/rihal/` 182 files (C14) | Round-1 | ✅ `.cursor/rules/rcode/` has 0 rihal hits |
| `/rihal-*` commands used as active guidance in docs/ | Round-1 | ✅ No live `/rihal-*` command refs in any docs/ file |
| `docs/USP.md` "Rihalians explaining it to clients" (5 hits flagged by audit/12) | Round-1/2 | ✅ USP.md line 5 is now clean; only remaining hit is line 198 (INT-COMPANY) |
| `docs/what-is-rcode-code.md` 9 "Rihalian" hits (audit/12 GAP-ARABIC-DOC) | Round-1/2 | ✅ Only 1 hit remains at line 67 — INT-MIGRATION-DOC |
| `docs/ROADMAP.md` GAP-STATE-DATA hit | Round-1/2 | ✅ Only history description at lines 17–18 — INT-MIGRATION-DOC |
| CONTRIBUTING.md:342 `rihal-tools` explanation | N/A (always intentional) | ✅ INT-LEGACY-SCOPE, properly labeled |

---

## Priority Summary

| ID | File | Line | Type | Severity | Action |
|----|------|------|------|----------|--------|
| F1 | `AGENTS.md` | 27 | GAP | WARN | Add "legacy" annotation to `rihal-tools` in scope list |
| F2 | `CLAUDE.md` | 27 | GAP | WARN | Add "legacy" annotation to `rihal-tools`; sync 4 missing scopes from AGENTS.md |
| F3 | `CHANGELOG.md` | 835 | BORDERLINE | INFO | Human decision: rewrite as "rcode users" or preserve as history |
| F4 | `CHANGELOG.md` | 885 | BORDERLINE | INFO | Human decision: rewrite as "rcode" or preserve as history |
| F5 | `audit/07-architecture.md` | 6 | BORDERLINE | INFO | Low priority; leave as-is until repo renamed, or change root to `.` |

**No P1 (critical) gaps found in documentation scope.**
All P1 documentation residue from rounds 1 and 2 is confirmed cleared.

---

## Verification Commands

```bash
# Confirm .cursor/rules/rcode/ is clean
grep -rni "rihal" .cursor/rules/rcode/

# Confirm no active /rihal-* commands in docs
grep -rn "/rihal-[a-z][a-z]" docs/ | grep -v "rihal-code"

# Confirm no Rihalian in docs/ (only CHANGELOG)
grep -rn "Rihalian" docs/

# Check F1 and F2 annotation gap
grep -n "rihal-tools" AGENTS.md CLAUDE.md CONTRIBUTING.md

# Check CLAUDE.md vs AGENTS.md scope parity
diff <(grep -o '`[a-z][a-z-]*`' AGENTS.md | sort -u) <(grep -o '`[a-z][a-z-]*`' CLAUDE.md | sort -u)
```
