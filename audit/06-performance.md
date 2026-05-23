# Performance Audit

## Summary

| Metric | Value |
|--------|-------|
| Bundle size | 839 KB (dist/rcode.js) |
| Cold start (median of 3 runs) | ~151ms (runs: 113ms, 157ms, 151ms) |
| Install proxy (`npm pack --dry-run`) | 3.5s, 862 files |
| Sync I/O calls in dist bundle | 250 (184 `existsSync` + 66 `readFileSync`) |
| Sync I/O calls in `cli/install.js` | 140 |
| Sync I/O calls in `cli/postinstall.js` | 1 |

---

## Findings

### [MED] Excessive sync I/O in install path (`cli/install.js`)

`cli/install.js` contains **140 sync I/O calls** (`existsSync`, `readFileSync`, `readdirSync`) spread across the install flow. Since install runs as a `postinstall` script for every user on every `npm install`, each sync call blocks the Node event loop. The worst offenders are:

- **21 `readdirSync` calls** doing synchronous directory scans (walking skill trees, agent buckets, workflow files)
- **22 `readFileSync` calls** reading YAML/MD config files one-by-one during install plan build
- **Probe loop**: lines 376–392 do **10 consecutive `existsSync` calls** per IDE-signal check (`.claude`, `.cursor`, `.gemini`, `.vscode`, `.antigravity`, `.windsurf`, `.codeium/windsurf`, plus home-dir mirrors). That's ~18 syscalls just to detect IDE presence.

### [MED] Dashboard serves HTML with a full `scanState()` on every page load

`server/dashboard.js` line 129 calls `scanState(RCODE_DIR)` synchronously on every `GET /` request. `scanState` walks the `.rcode/` directory tree to build page state. No caching, no TTL. A browser refresh or any client reconnect triggers a full directory scan.

The static JS assets also serve with `Cache-Control: no-cache` (line 121), forcing the browser to revalidate every JS module on every load — wasteful since build artifacts don't change mid-session.

### [LOW] Bundle is unminified — 21,961 lines, 839 KB

The bundle shebang and variable names are human-readable (esbuild with no minification). For a CLI that loads on every invocation this costs ~10–15ms of parse time. Minification alone would shrink the bundle to ~400–500 KB and reduce V8 parse overhead. No source map is embedded, so the size penalty has no debugging upside.

### [LOW] `cli/install.js` is 2,988 lines — single-file bottleneck

A 2,988-line file means the entire module is parsed and JIT-compiled on first `require`. Tree-shaking is impossible within a monolithic module; functionality that's needed for only some install paths (e.g., skill manifest generation, git-hook injection) is compiled unconditionally.

### [LOW] `JSON.parse(JSON.stringify(...))` pattern absent — not an issue

No deep-clone antipattern found in install path or bundle. Not a concern.

---

## Recommendations

### 1. Enable esbuild minification for `dist/rcode.js`

Add `--minify` to the esbuild build command. Expected outcome: ~400–500 KB bundle (-45%), ~10–15ms faster cold start. No source-map needed for production CLI builds; keep an unminified build for local dev.

### 2. Batch the IDE-detection `existsSync` calls into a single `fs.promises.access` batch

Replace the 10-probe sequential `existsSync` block in `install.js` (lines 376–392) with a `Promise.all` over `fs.promises.access` calls. This lets the OS schedule all the stat calls in parallel and drops the blocking time proportionally.

### 3. Add a TTL cache for `scanState()` in the dashboard server

Cache the result of `scanState(RCODE_DIR)` for 5–10 seconds. A simple `{ result, expiresAt }` object in module scope is sufficient. This eliminates redundant directory scans on rapid refreshes and keeps the dashboard dependency-free (no external cache library needed).
