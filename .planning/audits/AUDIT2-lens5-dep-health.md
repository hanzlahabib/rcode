# AUDIT2 — Lens 5: Dependency Health
**Branch:** `audit2-lens-5-dep-health`  
**Date:** 2026-05-25  
**Auditor:** rcode-dep-auditor (round-2)  
**Status:** ⚠️ WARN

---

## Scope Scanned

| Area | Files / Commands |
|---|---|
| `package.json` | direct dep declarations, version pins, engines |
| `pnpm-lock.yaml` | specifier consistency, integrity hashes, lockfileVersion |
| `node_modules/` (symlink → rihal-code) | installed versions, peer dep declarations |
| `cli/` `server/` `scripts/` | actual import usage per package |
| `server/lib/html/shell.js` | CDN (jsDelivr, esm.sh) dependency usage |
| `server/lib/html/client/preact.js` | esm.sh version pins |
| `.github/dependabot.yml` | automated update config |
| `.github/workflows/test.yml` | CI node-version matrix |
| `scripts/build.cjs` | esbuild target vs engines.node |

---

## Commands Run

```bash
pnpm audit                          # CVE scan
pnpm outdated                       # version drift
pnpm list --depth 0                 # installed versions
pnpm why ws && pnpm why zod         # dependency resolution
node -e "require('semver')..."      # semver ^ rule validation
npm view <pkg> versions --json      # upstream version data
python3 (lock-file consistency check, specifier comparison)
grep -rn "require|import" cli/ server/ scripts/  # usage scan
```

---

## Findings Table

| # | File:Line | Description | Severity | Status vs Prior |
|---|-----------|-------------|----------|-----------------|
| F1 | `server/lib/html/shell.js:20` | CSP `script-src` omits `https://esm.sh` but `preact.js` ESM-imports from it — browsers enforce `script-src` on dynamic module imports, causing CSP violations at runtime | **WARN** | **NEW** (not in prior audit) |
| F2 | `server/lib/html/shell.js:26` | CDN dep `marked@15.0.7` is 3 major versions behind npm latest `18.0.4`; not tracked in `package.json` so Dependabot cannot flag it | **WARN** | **NEW** |
| F3 | `package.json` all deps | All 9 direct packages use `^` (caret) loose pin; only `@lydell/node-pty` is exact-pinned | **WARN** | UNCHANGED (known) |
| F4 | `package.json:devDependencies` | `zod: ^3.24.0` lock-resolves to `3.25.76`; upstream latest is `4.4.3` (major — breaking schema API changes); `^` blocks auto-bump but drift will widen | **WARN** | UNCHANGED (known) |
| F5 | `package.json:devDependencies` | `@clack/prompts: ^0.9.1` resolves to `0.9.1`; upstream latest `1.4.0` (major boundary crossed) | **WARN** | UNCHANGED (known) |
| F6 | `package.json:devDependencies` | `diff: ^8.0.4` resolves to `8.0.4`; upstream latest `9.0.0` (major — CJS support dropped in v9); `^` blocks auto-bump | **WARN** | UNCHANGED (known) |
| F7 | `server/lib/html/client/preact.js:12` | `preact@10.24.3` loaded via `esm.sh` CDN — not tracked in `package.json` or lock file, invisible to Dependabot; `preact` npm latest is `10.29.2` | **INFO** | **NEW** |
| F8 | `package.json:optionalDependencies` | `@lydell/node-pty: 1.2.0-beta.12` — `latest` dist-tag points to this beta (no stable ≥1.1.0 exists); exact pin is correct but the package has no stable release path | **INFO** | UNCHANGED (known) |
| F9 | *(missing file)* | No `.nvmrc` or `.node-version` file; `engines.node: >=18.0.0` declares a floor but not a pinned version for local dev; CI matrix tests 18/20/22/24 but no canonical dev version | **INFO** | UNCHANGED (known) |
| F10 | `scripts/build.cjs:27` | esbuild `target: 'node18'` is consistent with `engines.node: >=18.0.0`; no mismatch | **INFO (PASS)** | Confirmed OK |
| F11 | `pnpm-lock.yaml` | Lock file specifiers match `package.json` 10/10; all 61 packages have `sha512` integrity hashes; `lockfileVersion: '9.0'` with snapshots section | **INFO (PASS)** | PASS |
| F12 | `pnpm audit` | Zero CVEs (0 critical, 0 high, 0 moderate, 0 low) across 62 transitive deps | **INFO (PASS)** | PASS |
| F13 | `package.json:dependencies` | `ws: ^8.20.1` is the only runtime prod dep; `^` allows patch bumps; `ws@8.21.0` available but `^8.20.1` would install it on fresh `pnpm install` | **INFO** | UNCHANGED (known) |

---

## Detailed Analysis

### F1 — esm.sh Missing from CSP `script-src` (WARN — NEW)

`server/lib/html/shell.js:20` declares:
```
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net
```

`server/lib/html/client/preact.js:12–21` does:
```js
import { h, render, Fragment } from 'https://esm.sh/preact@10.24.3';
import { useState, ... } from 'https://esm.sh/preact@10.24.3/hooks';
import htmLib from 'https://esm.sh/htm@3.1.1';
```

These are ES module `import` statements inside a `<script type="module">` chain (`app.js → preact.js → esm.sh`). Per the CSP Level 2/3 spec, `script-src` governs module specifiers. A browser enforcing the CSP will block the `esm.sh` fetches, causing the Preact app to fail silently.

**Note:** This is a developer-facing local dashboard, so the practical blast radius is limited. However, the CSP is a false promise — it implies hardening but then allows the app to break when a user has strict browser settings. The fix is either adding `https://esm.sh` to `script-src` (straightforward) or bundling Preact locally (removes CDN dependency entirely).

---

### F2 — `marked` CDN Dep Is 3 Major Versions Behind (WARN — NEW)

`shell.js:26` loads `marked@15.0.7` from jsDelivr:
```html
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"
        integrity="sha384-..." crossorigin="anonymous">
```

`npm view marked version` returns `18.0.4`. The gap is 3 major versions (15→18). Because `marked` is not in `package.json`, Dependabot and `pnpm outdated` are both blind to it. No automated signal will fire when `marked` ships security patches.

**Positive:** SRI hash (`sha384-...`) is present, protecting against CDN-level XSS injection for the pinned version.

**Concern:** Any vulnerability in `marked@15.x` won't surface in `pnpm audit`. OWASP Dependency-Check would also miss CDN-only deps not listed in a manifest.

---

### F3–F6 — Loose Pins and Major Version Drift (WARN — Unchanged)

All npm-tracked direct dependencies use `^` (caret) range pins. The lock file freezes exact installed versions, so `pnpm install` in this repo always produces reproducible installs. However:

- **For consumers** installing `@hanzlaa/rcode` as a transitive dep: they inherit whatever semver range allows.
- **For maintainers**: three packages have crossed a major version boundary (`zod`, `diff`, `@clack/prompts`). `^` prevents accidental major bumps, but the installed versions will grow further behind as time passes.

**Semver boundary note:** `pnpm outdated` reports `zod 3.25.76 → 4.4.3` and `@clack/prompts 0.9.1 → 1.4.0`. These are cross-major and `pnpm install --frozen-lockfile` would NOT bump them. The display is informational — the installed versions are correct per the declared specifiers.

**For `@clack/prompts: ^0.9.1`:** semver `^` on a `0.x.y` version constrains to `>= 0.9.1 < 0.10.0` only (semver 0.x special case), not cross-minor.

---

### F7 — preact + htm CDN Deps Not in package.json (INFO — NEW)

`server/lib/html/client/preact.js` loads two runtime dependencies from `esm.sh`:
- `preact@10.24.3` (npm latest: `10.29.2` — 5 patch versions behind)  
- `htm@3.1.1` (npm latest: `3.1.1` — current)

Neither appears in `package.json`. Dependabot cannot track them. Manual inspection required to detect security advisories.

---

### F8 — @lydell/node-pty Beta Pin (INFO — Unchanged)

The `latest` npm dist-tag for `@lydell/node-pty` is `1.2.0-beta.12` (the same version pinned in the project). There is no stable `>=1.2.0` release. The exact pin is the correct approach here; there is no stable alternative to upgrade to. Watch for stable release.

---

### F9 — No .nvmrc (INFO — Unchanged)

`engines.node: >=18.0.0` declares a minimum but not a canonical dev version. This can cause subtle compatibility differences between team members on different Node LTS lines (18, 20, 22, 24 — all tested in CI). Adding `.nvmrc` with the LTS version used for development would make this explicit.

---

### F11–F12 — Lock File and CVE Status (PASS)

- pnpm-lock.yaml specifiers 10/10 match `package.json`
- All 61 transitive packages have `sha512` integrity hashes
- `lockfileVersion: '9.0'` with snapshots section (current pnpm v9 format)
- `pnpm audit`: **0 CVEs** (0 critical / 0 high / 0 moderate / 0 low)

---

## Comparison to Prior Audit (audit/02-dependencies.md, 2026-05-23)

| Prior Finding | Round-2 Status |
|---|---|
| pnpm audit: 0 CVEs | ✅ STILL PASSING |
| Lock file present and in sync | ✅ STILL PASSING |
| 3 packages major-version behind (zod, diff, @clack/prompts) | ⚠️ STILL PRESENT (no upgrade) |
| All 9 deps use `^` loose pins | ⚠️ STILL PRESENT |
| No .nvmrc | ⚠️ STILL PRESENT |
| @lydell/node-pty exact beta pin | ℹ️ STILL PRESENT (expected) |
| npm audit fails (ENOLOCK) | ℹ️ Confirmed — pnpm audit is correct command |
| zod bundle size 4.7MB (dev only) | ℹ️ UNCHANGED — no dist/ in worktree |
| **CSP missing esm.sh** | 🆕 NEW finding — not in prior audit |
| **marked CDN 3 major versions behind** | 🆕 NEW finding — not in prior audit |
| **preact/htm not in package.json** | 🆕 NEW finding — not in prior audit |

---

## Recommendations (ranked by impact)

| Priority | Action | Effort |
|---|---|---|
| P1 | Add `https://esm.sh` to `script-src` in CSP, **or** bundle preact/htm locally (eliminates CDN dependency and CSP gap simultaneously) | Low / Med |
| P2 | Add `marked` to `package.json` as a `devDependency` so Dependabot tracks it; update from 15.0.7 → 18.x with API compat check | Low |
| P2 | Add `preact` and `htm` to `package.json` (even as `devDependencies`) for Dependabot visibility | Low |
| P3 | Plan `zod` v3→v4 migration (breaking schema API changes; widen will grow over time) | Med |
| P3 | Upgrade `diff` to v9 and `@clack/prompts` to v1.x after CLI testing | Low-Med |
| P4 | Add `.nvmrc` pinned to Node 20 LTS (matches CI default and `release.yml`) | Trivial |
| P4 | Consider exact-pinning `ws` in `dependencies` (only runtime prod dep; eliminates patch-bump surface for consumers) | Trivial |

---

## Verification Notes

- `pnpm list --depth 0` confirmed all declared packages are installed
- `grep -rn require|import` confirmed every declared package is imported somewhere in source
- No unused packages found (all 10 declared deps have confirmed usage)
- semver validation via `require('semver').satisfies()` confirmed `^0.9.1` does NOT allow 1.x and `^3.24.0` does NOT allow 4.x
- CDN dep staleness checked via `npm view <pkg> version` for all 4 CDN-loaded packages

---

**Overall Status: ⚠️ WARN**

Zero CVEs and a clean, consistent lock file are strong foundations. The main new risks are: (1) a CSP that blocks the Preact runtime in strict-mode browsers, and (2) CDN-tracked `marked` being 3 major versions behind with no automated update signal. Prior recommendations around major-version drift (zod, diff, @clack/prompts) remain open.
