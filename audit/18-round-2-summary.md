# Round-2 10-Lens Audit Summary — Post-Rebrand Code Health

**Generated:** 2026-05-25
**Base commit (pre-audit):** `76b7ac4`
**Final commit (post-merge):** `4fb0b20`
**Model:** Claude Sonnet 4.6 (all 10 agents)
**Orchestration:** herdr workspace `rihal-code` — 10 separate tabs (1 lens per tab, 1 pane each) — 10 isolated git worktrees
**Scope:** General code health audit. Round-1 cleared most rebrand residue (`audit/17-lens-audit-summary.md`); this round looked for code-quality gaps unrelated to the rebrand: performance, testability, error recovery, observability, UX correctness, naming convention drift, parity gaps.

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Lenses run | 10 |
| Lenses with FAIL status | **1** (L12 SXO) |
| Lenses with WARN status | 9 |
| Lenses with PASS status | 0 |
| Total raw report lines | 2,059 |
| Total raw report size | ~137 KB |
| Round-1 findings verified fixed | Most P1 (rebrand residue) |
| **Round-1 findings still present** | **1 — PHASE_NUM partial fix (8 remain in verifier rules)** |
| New round-2 findings | ~50+ across all lenses |

**Headline findings:**
1. **PHASE_NUM rename was incomplete.** The fix-branch only swept `rcode/workflows/` — missed 4 files in `rcode/agents/rules/verifier/` and their install-mirror counterparts. **8 occurrences remain**, which means the verifier subagent still receives empty `$PHASE_NUM` substitutions.
2. **SXO (L12) is FAIL.** 27 dispatch-table rows in agent SKILL.md files point to non-existent or "future" skills; 1 destructive op (`shard-doc delete`) has no confirmation gate.
3. **L15 found 2 critical test environment bugs** that were biting the audit agents themselves: `agent-size-budget.test.cjs` and `package-files-parity.test.cjs` fail in any pre-install / worktree environment — and `agent-size-budget` is *vacuously* passing its size-cap sub-test because the agent set is empty (regressions would go undetected).
4. **Performance**: 10 findings — readFileSync in install loops, scanState called 3× per page interaction without cache, JSON.parse without try/catch on user-supplied JSON.
5. **Error recovery**: pattern-level gaps — `INIT=` assignments missing `.ok` checks, `$(git …)` calls missing `2>/dev/null`, `node … 2>/dev/null` calls without `||` fallback.

---

## Methodology

10 isolated `cld --model sonnet` agents launched in **10 separate herdr tabs** (one lens per tab, one pane each — different topology from round-1's 2×2 grids):

| Pane | Tab | Worktree | Branch |
|------|-----|----------|--------|
| `-2` | L1-security | `lens-1-security` | `audit2-lens-1-security` |
| `-3` | L2-performance | `lens-2-performance` | `audit2-lens-2-performance` |
| `-4` | L3-testability | `lens-3-testability` | `audit2-lens-3-testability` |
| `-5` | L5-dep-health | `lens-5-dep-health` | `audit2-lens-5-dep-health` |
| `-6` | L6-error-recovery | `lens-6-error-recovery` | `audit2-lens-6-error-recovery` |
| `-7` | L11-karpathy | `lens-11-karpathy` | `audit2-lens-11-karpathy` |
| `-8` | L12-sxo | `lens-12-sxo` | `audit2-lens-12-sxo` |
| `-9` | L13-observability | `lens-13-observability` | `audit2-lens-13-observability` |
| `-10` | L14-naming | `lens-14-naming` | `audit2-lens-14-naming` |
| `-11` | L15-coverage | `lens-15-coverage` | `audit2-lens-15-coverage` |

All 10 branches merged into `main` using `-X ours` to preserve main's `.rcode/state.json` (agents triggered workflows that touched state.json; only the audit docs were of interest from each branch).

Each agent received a prompt instructing it to:
1. Read `audit/17-lens-audit-summary.md` and its prior `AUDIT-lens<N>-*.md` for round-1 baseline
2. Run its lens scan on `rcode/` source + `.rcode/` install mirror
3. Flag prior findings as fixed / still present / new
4. Write findings to `.planning/audits/AUDIT2-lens<N>-<name>.md` with severity table + verification notes
5. Commit on its branch — no push, no source edits

---

## Per-Lens Verification Log

### Lens 1 — Security
- **Status:** WARN
- **Round-1 delta:** All prior 12 findings (5 warn, 7 info) re-confirmed; no new critical security gaps
- **Key finding:** No new credential leaks; pre-existing `/tmp/rihal-review-*` shell-interpolation pattern + `_rihal-output` default folder both still flagged (cosmetic, not exploit-ready)
- **Report:** [.planning/audits/AUDIT2-lens1-security.md](../.planning/audits/AUDIT2-lens1-security.md) (125 lines, 12.7 KB)

### Lens 2 — Performance
- **Status:** WARN — 10 findings, all medium impact
- **Key findings:**
  - **P01-P05:** 5 `readFileSync` calls inside install-time loops (`cli/install.js`) — reads same file repeatedly per agent; install becomes O(N×F) where N=agents, F=files
  - **P06-P07:** `readFileSync` inside `github-sync` loops (same anti-pattern)
  - **P08:** `scanState()` called 3× per dashboard page interaction with no cache — dashboard latency
  - **P09-P10:** `JSON.parse` on user-supplied JSON without try/catch — bad JSON crashes the process
- **Report:** [.planning/audits/AUDIT2-lens2-performance.md](../.planning/audits/AUDIT2-lens2-performance.md) (310 lines, 14.9 KB)

### Lens 3 — Testability
- **Status:** WARN — 17 findings across 6 categories
- **Key findings:**
  - **L3-01 (critical):** `code-references.cjs` is a complex untested utility used widely
  - **L3-02 / L3-03:** `cli/github-sync.js`, `cli/nuke.js` — zero test coverage
  - **L3-07:** `build-skills-catalog.cjs` untested
  - 27 of 37 action skills are "test-invisible" (no test references them)
  - 1 hardcoded port creates flaky CI risk
- **Report:** [.planning/audits/AUDIT2-lens3-testability.md](../.planning/audits/AUDIT2-lens3-testability.md) (215 lines, 14.5 KB)

### Lens 5 — Dependency Health
- **Status:** WARN
- **Key findings:**
  - **F1 (warn, NEW):** `esm.sh` missing from CSP `script-src` — dashboard loads from `esm.sh` but policy doesn't allow it
  - **F2 (warn, NEW):** `marked` CDN dep is **3 major versions behind**
  - **F3-F6 (unchanged):** Loose pins (`^` prefix) on multiple deps; major version drift in 4 packages
- **Report:** [.planning/audits/AUDIT2-lens5-dep-health.md](../.planning/audits/AUDIT2-lens5-dep-health.md) (186 lines, 10.8 KB)

### Lens 6 — Error Recovery
- **Status:** WARN — pattern-level systemic gaps
- **Key findings:**
  - **A:** `INIT=` assignments missing both `2>/dev/null` AND `.ok` check — failures leak as parse errors downstream
  - **B:** `$(git …)` calls in high-impact contexts missing `2>/dev/null` — clutters output with git noise
  - **C:** `$(node …)` calls with `2>/dev/null` but no `||` fallback — silently produce empty string
  - **D:** `RESULT=` assignments use inconsistent error contracts across workflows
- **Report:** [.planning/audits/AUDIT2-lens6-error-recovery.md](../.planning/audits/AUDIT2-lens6-error-recovery.md) (217 lines, 13.4 KB)

### Lens 11 — Karpathy (recent commits)
- **Status:** WARN — no critical regressions in recent commits
- **Key findings:** Principle-1 magic numbers + a few simplicity-first concerns; recent rebrand commits hold up to scrutiny
- **Report:** [.planning/audits/AUDIT2-lens11-karpathy.md](../.planning/audits/AUDIT2-lens11-karpathy.md) (146 lines, 11.2 KB)

### Lens 12 — SXO / UX **(FAIL)**
- **Status:** **FAIL** — multi-critical
- **Key findings:**

  | Dimension | Status | Count |
  |---|---|---|
  | Dead-end workflows (no forward dispatch) | WARN | **76 of 125** |
  | AskUserQuestion without cancel/exit option | WARN | 4 |
  | Error-exit paths with no recovery command | WARN | 3 |
  | **Dispatch-table rows → non-existent skills** | **CRITICAL** | **9 rows** (Raees + Majlis agents) |
  | **Dispatch-table rows → "future" skills presented as live** | **CRITICAL** | **18 rows** (4 agents 100% future) |
  | **Destructive op without confirmation gate** | **CRITICAL** | **1 (shard-doc delete)** |
  | Inconsistent banner/section styles | INFO | 3 styles each |
  | Boilerplate success criteria (copy-paste) | WARN | 23 workflows |

- **Report:** [.planning/audits/AUDIT2-lens12-sxo.md](../.planning/audits/AUDIT2-lens12-sxo.md) (130 lines, 12.5 KB)

### Lens 13 — Observability
- **Status:** WARN
- **Key findings:** Round-1 silent-failure patterns mostly resolved (C07-C11 cleared). New round-2 findings: a few unguarded `node -e` blocks + console.log statements that should be structured logs
- **Report:** [.planning/audits/AUDIT2-lens13-observability.md](../.planning/audits/AUDIT2-lens13-observability.md) (162 lines, 13.3 KB)

### Lens 14 — Naming (catches the PHASE_NUM miss)
- **Status:** WARN
- **Headline finding (REGRESSION FROM ROUND-1 FIX):**
  - **PHASE_NUM rename was incomplete.** My round-1 fix branch reduced 88 → 0 in `rcode/workflows/`, but missed **`rcode/agents/rules/verifier/`**. **8 occurrences remain in 4 files:**

    ```
    rcode/agents/rules/verifier/context-loading.md:28,29,65
    rcode/agents/rules/verifier/requirements-coverage.md:25
    .rcode/agents-rules/verifier/context-loading.md:28,29,65    (install mirror)
    .rcode/agents-rules/verifier/requirements-coverage.md:25    (install mirror)
    ```

  - **Impact:** the verifier subagent runs with empty `$PHASE_NUM` substitution, breaking goal-backward verification on every phase.
- **Other finding:** 19 SKILL.md `name:` vs directory-name mismatches in `rcode/skills/` — flagged as "design bifurcation, not a mistake" by the agent (some intentional, some drift)
- **Report:** [.planning/audits/AUDIT2-lens14-naming.md](../.planning/audits/AUDIT2-lens14-naming.md) (343 lines, 19.1 KB)

### Lens 15 — Coverage / Parity
- **Status:** WARN — **all 6 prior critical/warn findings now FIXED**, 4 new findings
- **Round-1 delta:** All round-1 coverage gaps (parity tests didn't walk `.rcode/`, broken @-refs in `prfaq.md`/`checkpoint-preview.md`) confirmed fixed
- **NEW critical findings (CI environment bugs):**
  - **L15A-02 (critical):** `test/agent-size-budget.test.cjs` fails in any pre-install / worktree environment with `expected >30 agents, got 0`. **The XL-cap sub-test is *vacuously* passing because the agent set is empty** — real size regressions would go undetected. Fix: add a guard `if (entries.length === 0) { test.skip(...) }` mirroring the pattern in `package-files-parity.test.cjs`'s bin sub-test.
  - **L15A-03 (critical):** `test/package-files-parity.test.cjs` fails in pre-build environments — `dist/` is gitignored but `package.json#files` declares it; the `dist/` sub-test lacks the `existsSync` guard that the `bin` sub-test has.
  - **L15A-01 (warn):** 8 commands exist but are not listed in `help.md` — discoverability gap
  - **L15A-04 (warn):** `help-md-parity.test.cjs` only enforces `help.md → command` direction; the inverse (`command → help.md`) is unchecked, which is what allowed L15A-01 to exist
- **Report:** [.planning/audits/AUDIT2-lens15-coverage.md](../.planning/audits/AUDIT2-lens15-coverage.md) (225 lines, 14.4 KB)

---

## Round-1 → Round-2 Delta Highlights

| Round-1 Finding | Status in Round-2 |
|---|---|
| C01 PHASE_NUM (88 → 0 claimed) | ⚠️ **Partial — 8 remain in verifier rules** |
| C06 `/rihal-*` refs (1,704) | ✅ Cleared (install refresh) |
| C07-C11 silent agent-skill failures | ✅ Cleared |
| C12 39 `rihal-*` skill dirs | ✅ Cleared |
| C14 `.cursor/rules/rihal/` 182 files | ✅ Cleared |
| C15-C18 stale workflow refs | ✅ Cleared |
| W01/W05/W06 source brand vars | ✅ Cleared |
| W21/W22 parity tests scan `.rcode/` | ✅ Cleared |
| L15 broken @-refs in prfaq/checkpoint | ✅ Cleared |
| L1 `/tmp/rihal-review-*` interpolation | ⏸ Pre-existing P1 from `audit/01-security.md`, unchanged |
| L5 loose dep pins | ⏸ Unchanged |
| L14 SKILL.md `name:` mismatches | ⏸ Reclassified as design bifurcation by L14 |

---

## TOP 12 Priority Findings (Round-2)

| Rank | ID | Sev | Lens | File / Area | Fix Priority |
|------|----|-----|------|-------------|--------------|
| 1 | A | critical | L14 | `PHASE_NUM` 8 residues in `rcode/agents/rules/verifier/` + install mirror | **P1** |
| 2 | dispatch-9 | critical | L12 | 9 dispatch rows in Raees/Majlis SKILL.md → non-existent skills | **P1** |
| 3 | dispatch-18 | critical | L12 | 18 dispatch rows → "future" skills shown as live | **P1** |
| 4 | shard-delete | critical | L12 | `shard-doc` destructive op without confirmation gate | **P1** |
| 5 | L15A-02 | critical | L15 | `agent-size-budget.test.cjs` vacuously passes (empty agent set in CI/worktree) | **P1** |
| 6 | L15A-03 | critical | L15 | `package-files-parity.test.cjs` fails in pre-build env (missing `dist/` guard) | **P1** |
| 7 | L3-01 | critical | L3 | `code-references.cjs` complex utility, zero tests | **P2** |
| 8 | P01-P05 | warn | L2 | `readFileSync` inside install loops — O(N×F) install time | **P2** |
| 9 | P09-P10 | warn | L2 | `JSON.parse` on user JSON without try/catch — crashes on bad input | **P2** |
| 10 | F1 | warn | L5 | `esm.sh` missing from CSP `script-src` in dashboard | **P2** |
| 11 | F2 | warn | L5 | `marked` CDN dep is 3 major versions behind | **P2** |
| 12 | 76-dead-ends | warn | L12 | 76 of 125 workflows lack `## Next Up` footer | **P3** |

---

## Recommended Fix Sequence

```
P1 — fan-out 4 parallel fix agents (mirrors round-1 pattern):

  fix/phase-num-residue
    └─ sed -i 's/\bPHASE_NUM\b/PHASE_NUMBER/g' on 4 files in
       rcode/agents/rules/verifier/ + install mirror
    └─ Re-run install --force after merge

  fix/sxo-dispatch-tables
    └─ Audit Raees + Majlis SKILL.md dispatch rows
    └─ Remove non-existent skill refs (9) or mark "[planned]"
    └─ Demote "future" skills to a separate "Coming soon" section (18)
    └─ Add AskUserQuestion confirmation gate to shard-doc delete

  fix/ci-test-guards
    └─ Add existsSync guard to agent-size-budget.test.cjs
    └─ Add existsSync guard to package-files-parity.test.cjs dist/ sub-test
    └─ Add reverse-direction check to help-md-parity.test.cjs

  fix/dashboard-csp-and-deps
    └─ Add esm.sh to CSP script-src in dashboard
    └─ Update marked CDN URL to latest stable major

P2 — backlog (do not fan out; queue for normal sprint cycles):
  - Cache scanState (L2 P08)
  - try/catch JSON.parse in github-sync.js + dashboard.js (L2 P09-P10)
  - Add tests for code-references.cjs, github-sync.js, nuke.js (L3 L3-01/02/03)
  - readFileSync → readFile in install loops (L2 P01-P05)
  - Pattern fixes for INIT=/RESULT= error contracts (L6 systemic)

P3 — workflow UX (do not fan out; addressed when a workflow is touched):
  - Add ## Next Up footer to remaining 76 workflows
  - Add cancel/exit option (0) to 4 AskUserQuestion menus
  - Add recovery command to 3 error-exit paths
```

---

## Index of Artifacts

| Artifact | Lines | Size | Path |
|----------|------:|-----:|------|
| Lens 1 — Security | 125 | 12.7K | `.planning/audits/AUDIT2-lens1-security.md` |
| Lens 2 — Performance | 310 | 14.9K | `.planning/audits/AUDIT2-lens2-performance.md` |
| Lens 3 — Testability | 215 | 14.5K | `.planning/audits/AUDIT2-lens3-testability.md` |
| Lens 5 — Dep Health | 186 | 10.8K | `.planning/audits/AUDIT2-lens5-dep-health.md` |
| Lens 6 — Error Recovery | 217 | 13.4K | `.planning/audits/AUDIT2-lens6-error-recovery.md` |
| Lens 11 — Karpathy | 146 | 11.2K | `.planning/audits/AUDIT2-lens11-karpathy.md` |
| Lens 12 — SXO **(FAIL)** | 130 | 12.5K | `.planning/audits/AUDIT2-lens12-sxo.md` |
| Lens 13 — Observability | 162 | 13.3K | `.planning/audits/AUDIT2-lens13-observability.md` |
| Lens 14 — Naming | 343 | 19.1K | `.planning/audits/AUDIT2-lens14-naming.md` |
| Lens 15 — Coverage | 225 | 14.4K | `.planning/audits/AUDIT2-lens15-coverage.md` |
| **Total raw content** | **2,059** | **~137 KB** | |
| This summary | — | — | `audit/18-round-2-summary.md` |
| Prior round-1 summary | 324 | 22.7K | `audit/17-lens-audit-summary.md` |
