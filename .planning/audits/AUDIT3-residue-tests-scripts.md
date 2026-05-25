# AUDIT3 — Round-3 Residue Scan: test/ + scripts/ + cli/ + server/

**Date:** 2026-05-25  
**Branch:** audit3-residue-tests-scripts  
**Scope:** test/, scripts/, cli/, server/ — production code, tests, CLI entry points  
**Out of scope:** workflows/, docs/, rcode/skills/ (covered by other round-3 auditors)

## Methodology

1. `grep -rni "rihal" test/ scripts/ cli/ server/` — full case-insensitive sweep  
2. `grep -rn "hanzlahabib/rihal-code" test/ scripts/ cli/ server/` — repo-URL sweep  
3. Manual reads of every hit's surrounding context to classify correctly  
4. Live dogfood run (`bash scripts/dogfood-check.sh`) to identify runtime failures  
5. Cross-reference against `audit/12-final-rihal-inventory.md` INT-* taxonomy  

## INT-* Tag Reference (from audit/12)

| Tag | Meaning |
|-----|---------|
| `INT-REPO-URL` | `github.com/hanzlahabib/rihal-code` — live repo URL, intentionally preserved |
| `INT-LEGACY-PKG` | `@hanzlahabib/rihal-code` npm package — backward-compat for uninstall |
| `INT-COMPANY` | Rihal / rihal.om as company/naming-inspiration attribution |

---

## Findings

### test/

#### INTENTIONAL — test/nuke.test.cjs:106,112 — Legacy package guard test

```
test/nuke.test.cjs:106: test('source-repo guard: legacy @hanzlahabib/rihal-code package.json also triggers warning', ...
test/nuke.test.cjs:112:   JSON.stringify({ name: '@hanzlahabib/rihal-code', version: '1.0.0' }),
```

**Classification:** INTENTIONAL (INT-LEGACY-PKG)  
**Severity:** N/A  
**Rationale:** This test validates that `cli/nuke.js`'s source-repo guard fires for the legacy package name `@hanzlahabib/rihal-code`. The guard exists so that users who still have the old package in their CWD's `package.json` don't accidentally nuke their source repo. Removing this test would leave the backward-compat guard untested.  
**Verification:** `node --test test/nuke.test.cjs 2>&1 | grep "source-repo guard.*legacy"`

---

#### INTENTIONAL (minor P3 naming note) — test/nuke.test.cjs:173,181,182 — `rihal-keep` fixture

```
test/nuke.test.cjs:173: fs.mkdirSync(path.join(skillsDir, 'rihal-keep'), { recursive: true });
test/nuke.test.cjs:181:   !out.includes('rihal-keep'),
test/nuke.test.cjs:182:   'rihal-keep skill dir should NOT appear — only rcode-* prefix is targeted',
```

**Classification:** INTENTIONAL — tests correct nuke boundary behavior  
**Severity:** P3 (naming clarity only)  
**Rationale:** The test is titled "project .claude/skills: rcode-* skill dirs appear in dry-run plan, others do not" and creates two fixtures: `rcode-plan` (should be nuked) and `rihal-keep` (should NOT be nuked). The test verifies that `nuke` is surgical — it only removes `rcode-*` prefixed skill dirs and leaves all others (including user-created, third-party, or old-brand dirs) intact. This is correct behavior documented intentionally.

**Minor concern (P3):** The name `rihal-keep` is overloaded — it could be read as "we're keeping old rihal-brand skills from migration" rather than "any non-rcode skill is preserved." Renaming to `user-plugin` or `user-custom-skill` would make the intent clearer. This is a naming clarity issue, not a functional bug, and does not affect test correctness.

**Behavioral gap note:** As of this audit, `~/.claude/skills/` contains 84 `rihal-*` prefixed skills installed by the old `@hanzlahabib/rihal-code` package. Neither `nuke` nor `uninstall` removes these — they only target `rcode-*`. Users upgrading from old to new would accumulate orphaned `rihal-*` skills. This is a separate product decision (whether to add legacy cleanup to nuke/uninstall), distinct from source-code residue.

**Verification:** `node --test test/nuke.test.cjs 2>&1 | grep "rcode-\* skill dirs"`

---

### scripts/

#### GAP — scripts/dogfood-check.sh:64 — Hardcoded `get-phase 6` (phase does not exist)

```
scripts/dogfood-check.sh:64: GET_OUT=$($CLI roadmap get-phase 6 2>&1)
scripts/dogfood-check.sh:65: if echo "$GET_OUT" | grep -q '"found": true'; then
scripts/dogfood-check.sh:66:   pass "roadmap get-phase finds heading-style phase (#464 regex part)"
scripts/dogfood-check.sh:67: else
scripts/dogfood-check.sh:68:   fail "roadmap get-phase returned found:false — #464 regression"
scripts/dogfood-check.sh:69: fi
```

**Classification:** GAP  
**Severity:** P2 — dogfood check 4 ALWAYS FAILS  
**Root cause:** The script was written when the ROADMAP had phases numbered 1–N starting from 1 or 6. After the milestone restructure / rebrand, phases were renumbered and the ROADMAP now starts at Phase 20. Phase 6 no longer exists.  

**Confirmed failure:**
```bash
$ bash scripts/dogfood-check.sh
  ✗ FAIL: roadmap get-phase returned found:false — #464 regression
✗ Dogfood checks failed — see output above
```

```bash
$ node rcode/bin/rcode-tools.cjs roadmap get-phase 6 2>&1
{ "found": false, "phase_number": "6" }

$ node rcode/bin/rcode-tools.cjs roadmap list-phases 2>&1 | grep '"number"' | head -1
    "number": "20",
```

**Fix:** Replace the hardcoded `get-phase 6` with a dynamic lookup of the first available phase:
```bash
FIRST_PHASE=$(node rcode/bin/rcode-tools.cjs roadmap list-phases 2>&1 | \
  grep '"number"' | head -1 | grep -oE '"[0-9.]+"' | head -1 | tr -d '"')
GET_OUT=$($CLI roadmap get-phase "$FIRST_PHASE" 2>&1)
```

**Verification:** `bash scripts/dogfood-check.sh 2>&1 | grep "Check 4\|get-phase"`  
**Also note:** The header comment says "Phase 9 plan 9.4 (#463)" — this is a stale phase reference in the comment (not a brand issue, but relevant to the age of this script).

---

#### INTENTIONAL — scripts/build.cjs:54 — Source attribution in compiled binary banner

```
scripts/build.cjs:54: bundle = '#!/usr/bin/env node\n/* rcode — built with esbuild. Source: github.com/hanzlahabib/rihal-code */\n' + bundle;
```

**Classification:** INTENTIONAL (INT-REPO-URL)  
**Severity:** N/A  
**Rationale:** This is the build-time attribution comment prepended to `dist/rcode.js`. It references the live GitHub repo URL `github.com/hanzlahabib/rihal-code`, which is confirmed correct by `git remote -v`. The repo is named `rihal-code` (not yet renamed to `rcode`) and the URL must match the actual remote.  
**Verification:** `git remote -v | grep rihal-code`

---

### cli/

#### INTENTIONAL — cli/nuke.js:5,88,380 — Legacy package backward-compat

```
cli/nuke.js:5:   * - Global npm/pnpm/yarn/bun installs (both @hanzlaa/rcode and legacy @hanzlahabib/rihal-code)
cli/nuke.js:88:  * Looks for both @hanzlaa/rcode (current) and @hanzlahabib/rihal-code (legacy).
cli/nuke.js:380: if (pkg.name === '@hanzlaa/rcode' || pkg.name === '@hanzlahabib/rihal-code') {
```

**Classification:** INTENTIONAL (INT-LEGACY-PKG)  
**Severity:** N/A  
**Rationale:** `nuke.js` explicitly handles both the current `@hanzlaa/rcode` package and the legacy `@hanzlahabib/rihal-code` package. This is required for the one-shot full cleanup to work for users who installed the old package. Per `audit/12-final-rihal-inventory.md`, `cli/nuke.js` is explicitly called out as an allowed backward-compat site for INT-LEGACY-PKG.  
**Verification:** `grep -n "rihal" cli/nuke.js`

---

#### INTENTIONAL — cli/install.js:360 — Installer splash docs URL

```
cli/install.js:360: pc.cyan('│') + '   ' + dim('docs     ') + 'github.com/hanzlahabib/rihal-code               ' + pc.cyan('│'),
```

**Classification:** INTENTIONAL (INT-REPO-URL)  
**Severity:** N/A  
**Rationale:** User-visible installer splash screen. URL points to the live GitHub repo, confirmed by `git remote -v`. Until the repo is renamed on GitHub, this URL must remain as-is.  
**Verification:** `grep "docs.*hanzlahabib" cli/install.js`

---

#### INTENTIONAL — cli/install.js:684 — Stub banner issue URL

```
cli/install.js:684: `     /rcode-new-project before committing. See https://github.com/hanzlahabib/rihal-code/issues/670 -->\n\n`;
```

**Classification:** INTENTIONAL (INT-REPO-URL)  
**Severity:** N/A  
**Rationale:** Live GitHub issue URL (#670) embedded in the planning stub HTML comment. This is a deep-link to a tracked issue — it must remain as-is to stay functional.  
**Verification:** `grep "issues/670" cli/install.js`

---

#### INTENTIONAL — cli/index.js:94 — First-run help docs URL

```
cli/index.js:94: Documentation: https://github.com/hanzlahabib/rihal-code
```

**Classification:** INTENTIONAL (INT-REPO-URL)  
**Severity:** N/A  
**Rationale:** User-visible first-run onboarding output (the `rcode <unknown-command>` fallback message). Live repo URL.  
**Verification:** `grep "rihal-code" cli/index.js`

---

#### INTENTIONAL — cli/postinstall.js:127 — Postinstall onboarding docs URL

```
cli/postinstall.js:127: Docs: https://github.com/hanzlahabib/rihal-code
```

**Classification:** INTENTIONAL (INT-REPO-URL)  
**Severity:** N/A  
**Rationale:** User-visible output in the postinstall onboarding block (the "quick tips" message printed on first `rcode <anything>` after install). Live repo URL.  
**Verification:** `grep "rihal-code" cli/postinstall.js`

---

### package.json

#### INTENTIONAL — package.json:54,57,59 — npm package metadata URLs

```json
package.json:54:  "url": "git+https://github.com/hanzlahabib/rihal-code.git"
package.json:57:  "url": "https://github.com/hanzlahabib/rihal-code/issues"
package.json:59:  "homepage": "https://github.com/hanzlahabib/rihal-code#readme"
```

**Classification:** INTENTIONAL (INT-REPO-URL)  
**Severity:** N/A  
**Rationale:** npm package metadata (`repository`, `bugs`, `homepage`). These must point to the live GitHub repo and match the actual remote. Confirmed correct by `git remote -v`.  
**Verification:** `git remote -v | grep hanzlahabib/rihal-code`

---

### server/

#### CLEAN — No rihal references found

```bash
$ grep -rni "rihal" server/
(no output)
```

`server/dashboard.js`, `server/lib/scanner.js`, `server/lib/api.js`, `server/lib/orchestrator.js`, and `server/lib/html/` are all clean. Brand is consistently `rcode` / `Majlis` throughout.

---

## Summary Table

| File | Line(s) | Reference | Classification | Severity | Action |
|------|---------|-----------|---------------|----------|--------|
| test/nuke.test.cjs | 106, 112 | `@hanzlahabib/rihal-code` in test for source-repo guard | INTENTIONAL (INT-LEGACY-PKG) | — | None |
| test/nuke.test.cjs | 173, 181, 182 | `rihal-keep` fixture for nuke targeting test | INTENTIONAL (P3 naming note) | P3 | Optional rename to `user-plugin` for clarity |
| scripts/dogfood-check.sh | 64 | `get-phase 6` hardcoded — phase 6 doesn't exist | **GAP** | **P2** | Replace with dynamic first-phase lookup |
| scripts/build.cjs | 54 | `github.com/hanzlahabib/rihal-code` in build banner | INTENTIONAL (INT-REPO-URL) | — | None |
| cli/nuke.js | 5, 88, 380 | `@hanzlahabib/rihal-code` legacy package backward-compat | INTENTIONAL (INT-LEGACY-PKG) | — | None |
| cli/install.js | 360 | `github.com/hanzlahabib/rihal-code` in installer splash | INTENTIONAL (INT-REPO-URL) | — | None |
| cli/install.js | 684 | `github.com/hanzlahabib/rihal-code/issues/670` in stub banner | INTENTIONAL (INT-REPO-URL) | — | None |
| cli/index.js | 94 | `github.com/hanzlahabib/rihal-code` in first-run help | INTENTIONAL (INT-REPO-URL) | — | None |
| cli/postinstall.js | 127 | `github.com/hanzlahabib/rihal-code` in postinstall onboarding | INTENTIONAL (INT-REPO-URL) | — | None |
| package.json | 54, 57, 59 | `github.com/hanzlahabib/rihal-code` in repository/bugs/homepage | INTENTIONAL (INT-REPO-URL) | — | None |
| server/ | — | No rihal references | CLEAN | — | None |

## Action Items

| Priority | Item | Command to verify |
|----------|------|-------------------|
| P2 | Fix `scripts/dogfood-check.sh:64` — replace hardcoded `get-phase 6` with dynamic first-phase lookup | `bash scripts/dogfood-check.sh 2>&1` (currently fails on check 4) |
| P3 | Consider renaming `rihal-keep` fixture in `test/nuke.test.cjs:173` to `user-plugin` for clarity | Read-only — no functional impact |

## What Was NOT Found (confirming prior rounds' cleanup)

- No `rihal` in any server/ file
- No `rihal` in test/lib/, test/eval/, or test/eval/baselines/
- No `.rihal/` path references in any test fixture
- No `rihal-tools` or `rihal_tools` CLI references
- No stale `rihal-*` skill prefix in install/uninstall target logic (those correctly use `rcode-*`)
- No `rihal` in scripts/sync-bin.sh or scripts/build-skills-catalog.cjs
