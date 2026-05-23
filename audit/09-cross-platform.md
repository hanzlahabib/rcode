# Cross-Platform Audit

## Summary

| Category | Count | Severity |
|---|---|---|
| Bash-isms in shell scripts | 2 scripts (minor) | LOW |
| Hardcoded Unix paths (`/tmp`) | 2 occurrences | MED |
| Windows-incompatible patterns | 1 (`fs.chmodSync` silently no-ops) | MED |
| CRLF line endings | 0 files | — |
| Case-sensitive import mismatches | 0 | — |
| Symlink reliance (hot path) | 1 (`realpathSync` on every hook call) | LOW |
| Missing shebang on bin entrypoint | 0 (only `cli/index.js` + `dist/rcode.js` are real entrypoints) | — |
| CI OS matrix | Linux only | HIGH |

---

## Findings by Category

### [HIGH] CI matrix — Linux only

**File:** `.github/workflows/*.yml`

Every `runs-on:` is `ubuntu-latest`. No macOS or Windows runner. Regressions on those OSes are invisible until a user reports them.

**Recommendation:** Add a matrix entry for `macos-latest` and `windows-latest` on the test job, at minimum for smoke tests.

---

### [MED] Hardcoded `/tmp` string literal

**File:** `rcode/bin/rcode-hooks.cjs:303` (mirrored in `.rcode/bin/rcode-hooks.cjs:303`)

```js
if (t.startsWith('/tmp/')) return false;
```

This is inside the `rm -rf` safety allowlist. On Windows the temp directory is `C:\Users\<user>\AppData\Local\Temp`; on macOS it may be `/private/var/folders/...`. The guard will never fire on those platforms, so the safety check is silently wrong — it will either block legitimate temp-dir deletions or (if the path logic never produces `/tmp/` paths on those OSes) be a no-op dead branch.

**Fix:** Replace with `t.startsWith(os.tmpdir())` (already imported as `os`). Also update the human-readable message on line 311 that says `Safe targets: ... /tmp/*`.

---

### [MED] `fs.chmodSync(path, 0o755)` silently no-ops on Windows

**File:** `cli/install.js:2102`, `scripts/build.cjs:58`

`fs.chmodSync` on Windows does not set the Unix executable bit — the call succeeds but has no effect. On Windows, file executability is determined by extension (`.cmd`, `.exe`), not mode bits. The installed `.cjs` hooks will work because Node is invoked directly, but the `dist/rcode.js` binary won't be runnable as a bare command via a shell wrapper without a `.cmd` shim.

**Recommendation:** Document that Windows users must invoke via `node dist/rcode.js` or generate a `.cmd` wrapper in the build step. No change needed for the `.cjs` hook files (they're always invoked with `node`).

---

### [LOW] Shell scripts use bash-specific features

**Files:** `scripts/dogfood-check.sh`, `.claude/hooks/block-unregistered-phase-writes.sh`, `.claude/hooks/sync-bin-on-edit.sh`

All three declare `#!/usr/bin/env bash` (correct). They use `grep -oE` (ERE), `sed -E`, and `$()` subshells — all fine under bash. None use process substitution `<()`, `[[`, arrays, or `mapfile`. The bash shebang is necessary and present.

**Windows note:** These scripts will not run under WSL-less Windows PowerShell or cmd.exe. The `postinstall` script (`cli/postinstall.js`) is Node-only (fine). The `"dogfood"` npm script calls `bash scripts/dogfood-check.sh` directly — this will fail on bare Windows without WSL or Git Bash.

**Recommendation:** Document that `npm run dogfood` requires bash (WSL/Git Bash on Windows). For CI, add a note or `if: runner.os != 'Windows'` guard if the dogfood job is ever added to the matrix.

---

### [LOW] `fs.realpathSync` on every hook invocation

**File:** `rcode/bin/rcode-hooks.cjs:150,156`

`realpathSync` resolves symlinks by making syscalls. On every hook invocation (pre-tool, post-tool) this adds latency. On Windows, symlink resolution requires elevated privileges or Developer Mode; `realpathSync` may throw `EPERM` on standard user accounts.

**Recommendation:** Wrap the `realpathSync` call in a try/catch and fall back to the unresolved path with a warning. The existing code at line 150 already has a try/catch (`const realPath = fs.realpathSync(resolved)`— verify the catch branch handles `EPERM`).

---

### [INFO] `process.platform` guards already present

`cli/agent.js`, `cli/doctor.js`, and `server/dashboard.js` correctly gate `which`/`where` and `shell: true` behind `process.platform === 'win32'`. Home directory resolution uses `os.homedir()` (cross-platform). Path joining uses `path.join()` throughout. No `'/' +` concatenation for filesystem paths was found in the CLI or server.

---

## Tested OS Coverage

| OS | CI | Manual |
|---|---|---|
| Linux (Ubuntu) | Yes (all jobs) | Yes |
| macOS | No | Unknown |
| Windows | No | Unknown |

---

## Recommendations (Priority Order)

1. **Add macOS + Windows runners to CI matrix** — even a single smoke-test job catches the most common regressions.
2. **Replace `/tmp/` string literal with `os.tmpdir()`** in `rcode-hooks.cjs:303` — two-line fix, high correctness impact on macOS/Windows.
3. **Document Windows limitations** for `dist/rcode.js` executability and `npm run dogfood` requiring bash.
4. **Wrap `realpathSync` in EPERM-aware try/catch** for Windows Developer Mode compatibility.
5. **No action needed** on shebangs, CRLF, case-sensitivity, or home-dir resolution — all are correct.
