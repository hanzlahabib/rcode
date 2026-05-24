# AUDIT2 — Lens 1: Security (General Code Health)

**Branch:** audit2-lens-1-security  
**Date:** 2026-05-25  
**Status:** WARN  
**Prior audit:** `.planning/audits/AUDIT-lens1-security.md` (2026-05-24) — focused on rihal rebrand residue.  
**This audit:** Fresh general security scan — OWASP Top 10 + shell injection + auth bypass + info leakage. Not rebrand-focused.

---

## Scope Scanned

- `rcode/bin/rcode-tools.cjs` — main CLI tool (6000+ lines)
- `rcode/bin/lib/code-references.cjs`, `verify.cjs` — library modules
- `server/orchestrator.js` — local PTY orchestrator (port 7718)
- `server/dashboard.js` — local dashboard server (port 7717)
- `server/lib/api.js` — dashboard API handlers
- `cli/*.js`, `cli/lib/github.cjs` — CLI entry points and helpers
- `scripts/build.cjs` — build script
- `.github/workflows/` — CI workflows
- `.rcode/workflows/review.md` — agent-read workflow file

---

## Commands Run

```bash
grep -rn "execSync\|execFileSync\|spawn\b" rcode/ cli/ server/ scripts/
grep -n "execSync\`" rcode/bin/rcode-tools.cjs
grep -n "COMMAND_ALLOWLIST\|validStoryId\|authed\b\|handleRun" server/orchestrator.js
grep -n "if.*url\|handleApi\|authed\b" server/dashboard.js
grep -n "Access-Control\|CORS" server/orchestrator.js server/dashboard.js
grep -n "AUTH_TOKEN\|ORCH_TOKEN\|process\.env\|listen\|127\." server/orchestrator.js
grep -rn "password\s*=\|api_key\s*=\|secret\s*=\|token\s*=" rcode/ cli/ server/ scripts/ .github/
grep -rn "sk-[a-zA-Z0-9]{20,}\|ghp_\|github_pat_\|xoxb-" rcode/ cli/ server/ scripts/
grep -rn "skipAuth\|bypassAuth\|noAuth\|skip.*auth\|bypass.*auth" rcode/ .rcode/
grep -rn "console\.log.*token\|console\.log.*secret\|console\.log.*password" rcode/bin/ server/ cli/
grep -n "env:\s*process\.env\b" server/ cli/ -r
grep -n "limit\|maxLength\|req\.on" server/orchestrator.js
sed -n '130,175p' rcode/workflows/review.md
sed -n '122,160p' server/lib/api.js
cat rcode/bin/lib/code-references.cjs
```

---

## Prior Audit Delta

All 12 findings from `AUDIT-lens1-security.md` were about **rihal-namespace residue**, not general security. This audit discovers entirely new findings.

Prior F10 (`$(cat /tmp/rihal-review-prompt...)` injection pattern) is carried forward here as **F8** — the rihal naming is now fixed (`rcode-` prefix), but the shell composition pattern persists unchanged.

---

## Findings

| # | File | Line(s) | Description | Severity |
|---|------|---------|-------------|----------|
| F1 | `server/dashboard.js` | 99–102 | `/api/orch-token` endpoint returns the orchestrator auth token (`ORCH_TOKEN`) to any caller with no authentication. Dashboard has zero auth on all its endpoints. Any local process can fetch the ORCH_TOKEN and use it to authenticate with the orchestrator. | warn |
| F2 | `server/orchestrator.js` | 207–231 | For non-`cmd-` storyIds (e.g. `"phase-test"`), `body.cmd` is accepted without allowlist validation and passed directly to `pty.spawn(CLAUDE_BIN, [cmd, '--dangerously-skip-permissions'])`. The COMMAND_ALLOWLIST gates only `cmd-` prefixed sessions. Combined with F1, an attacker who fetches ORCH_TOKEN can POST `{storyId:"x", cmd:"/any-slash-command"}` and spawn a Claude session with no permission gates. | warn |
| F3 | `server/orchestrator.js` | 236 | `--dangerously-skip-permissions` flag is hardcoded for every spawned Claude session, regardless of context. No conditional guard. Amplifies the blast radius of F2. | info |
| F4 | `server/orchestrator.js` | 124–129 | `parseBody` accumulates HTTP request body with no size cap (`buf += c` unbounded). A large POST body causes unbounded string growth in the Node.js heap. Localhost-only bind limits exposure, but any process with loopback access (including malicious local tools) can trigger memory pressure. | info |
| F5 | `server/orchestrator.js` | 354 | `Access-Control-Allow-Origin: *` on the orchestrator (port 7718). The comment says "wildcard origin is safe with no cookies" — but since the auth token is fetched from `window.__ORCH_TOKEN__` (embedded in dashboard HTML) and sent as an Authorization header, browser CORS preflight does not prevent cross-origin reads: the `Authorization` header triggers a preflight, and `Allow-Headers: Authorization` is set. A malicious page open in the same browser session could attempt orchestrator API calls if it can obtain the token. | info |
| F6 | `rcode/bin/rcode-tools.cjs` | 4646 | In `plan validate-evidence --spot-check`, a regex extracts a pattern string from the `<evidence>` block of SPRINT.md and constructs: `rg --count-matches ${JSON.stringify(pattern)} 2>/dev/null \| awk ...`. `JSON.stringify` escapes `"` but NOT `$` or backticks. A SPRINT.md evidence block containing `$(malicious_cmd)` or `` `malicious_cmd` `` in the grep pattern claim would execute the subshell when the shell expands the double-quoted argument. | warn |
| F7 | `rcode/bin/rcode-tools.cjs` | 5968–5973 | In `brain pull`, values from `.rcode/brain/sources.yaml` (`repo`, `branch`, `sparsePaths`) are interpolated into shell strings: `git clone ... --branch="${branch}" "${repo}"` and `git sparse-checkout set ${sparsePaths.map(p => '"${p}"').join(' ')}`. No sanitization of shell metacharacters. A `branch` value containing `"` closes the double-quote and allows command injection. A `sparsePaths` entry containing `"` has the same effect. Sources come from a project-local config file, so the attack surface is a malicious `.rcode/brain/sources.yaml` (supply chain or local write). | warn |
| F8 | `rcode/workflows/review.md`, `.rcode/workflows/review.md` | 146–171 | `$(cat /tmp/rcode-review-prompt-{phase}.md)` shell substitution inside double quotes is used to pass a review prompt to `gemini`, `claude`, and `codex`. If the temp file content contains `$(...)` or backtick expressions, they execute in the invoking shell. The temp file is written by the AI agent itself (from plan content), so this is a prompt-injection-to-shell path: adversarial content in a PLAN.md could propagate to shell execution during `/rcode-review`. Prior audit F10 noted this but classified only the naming residue; the injection vector was pre-existing. | warn |
| F9 | `server/dashboard.js` | 66–135 | All dashboard API endpoints (`/health`, `/api/state`, `/api/files`, `/api/file`, `/api/hierarchy`, `/api/memory`, `/`) are served without any authentication. While the server binds to `127.0.0.1`, all local processes (and all browser tabs since no CORS restriction on dashboard port 7717) can read full project state, ROADMAP, plans, memory bank, and file contents. `/api/file` serves any `.md` file within the project root (after symlink resolution check). | info |

---

## Negative Checks (Clean)

| Check | Result |
|-------|--------|
| Hardcoded API keys / tokens (Anthropic `sk-`, GitHub `ghp_`, Slack `xoxb-`) | **NONE FOUND** |
| `.env` files committed to repo | **NONE FOUND** |
| `eval()` or `new Function()` usage in source | **NONE FOUND** |
| `rejectUnauthorized: false` or TLS-skip defaults | **NONE FOUND** |
| Sensitive values in `console.log` statements | **NONE FOUND** (github.cjs actively redacts `ghp_*` tokens in log output) |
| CI workflows using unsanitized PR titles in shell steps | **CLEAN** — workflows use `amannn/action-semantic-pull-request@v5` (no shell interpolation of PR content) |
| `process.env` dumped to client in error responses | **CLEAN** — error messages contain only `err.message`, not env vars |
| SQL injection / template injection in DB queries | **N/A** — no database layer in this codebase |
| Auth bypass in agent rule files (real code, not examples) | **CLEAN** — `debug-session-state.md` contains example code showing `await`-bypass, clearly labeled as "before (buggy)" in a test fixture |
| Path traversal in `handleApiFile` | **CLEAN** — `path.resolve` + `startsWith` guard + `fs.realpathSync` symlink check + `.md`-only restriction |
| `execSync` of user input in `code-references.cjs` | **LOW RISK** — symbol regex `[a-z_][a-z0-9_]+` and `[A-Z][A-Za-z0-9]+` produce only alphanumeric + underscore; no shell metacharacters injectable |
| Orchestrator endpoints unprotected | **CLEAN** — `authed(req)` check at line 359 covers ALL HTTP requests (including OPTIONS fallthrough is handled) |
| GitHub Actions secrets hardcoded | **CLEAN** — only `${{ secrets.GITHUB_TOKEN }}` used |

---

## Verification Notes

**F1:** Confirmed by reading `server/dashboard.js:63–138`. No `authed()` call or equivalent exists anywhere in the dashboard request handler. `/api/orch-token` at line 99 returns `JSON.stringify({ token: ORCH_TOKEN })` unconditionally. The ORCH_TOKEN is loaded from `~/.rcode/orch-token` (created with `mode: 0o600`) so it's not world-readable on disk — but the HTTP endpoint bypasses that protection entirely for any loopback caller.

**F2:** Confirmed by reading `server/orchestrator.js:207–231`. The allowlist check at line 207 fires ONLY when `storyId.startsWith('cmd-')`. Line 231 (`const cmd = String(body.cmd || ...)`) runs unconditionally for all storyIds that passed `validStoryId()`. The `validStoryId()` function only validates format (`^[A-Za-z0-9._-]+$`), not whether the session is a "command runner" or a "dev story". An attacker sending `{storyId: "x", cmd: "/any-command"}` bypasses the allowlist entirely.

**F3:** Confirmed at `server/orchestrator.js:236`. The `--dangerously-skip-permissions` flag is hardcoded. There is no config option to disable it.

**F5:** The CORS configuration comment at line 351–353 notes "The loopback bind + token are what gate access" — this is only true for non-browser callers. Browser-originated cross-origin requests with `Authorization` header DO go through CORS preflight, and the `Access-Control-Allow-Headers: Authorization` response permits them. A malicious page with the token could make requests. However, obtaining the token requires the attacker to already read the dashboard HTML (same-origin) or the `/api/orch-token` endpoint, which itself requires loopback access. Risk is moderate in a browser-based dev environment.

**F6:** Confirmed at `rcode/bin/rcode-tools.cjs:4639–4647`. `JSON.stringify` produces a double-quoted JSON string: `"pattern"`. Bash expands `$()` and backticks inside double-quoted strings. `JSON.stringify` only escapes `"`, `\`, and control characters — NOT `$` or backticks. Pattern: evidence regex `[^\n\`']+?` excludes backticks but NOT `$(...)`. So `grep: $(id) → 5` would extract `$(id)` as pattern and execute `id` in the shell.

**F7:** Confirmed at `rcode/bin/rcode-tools.cjs:5856–5973`. No validation or sanitization of `repo`, `branch`, or `sparsePaths` before shell interpolation. `branch = 'main"; whoami; echo "'` would produce `git clone ... --branch="main"; whoami; echo ""` — three shell commands. This requires write access to `.rcode/brain/sources.yaml` in the target project.

**F8:** Confirmed via `rcode/workflows/review.md:138–171` and `.rcode/workflows/review.md:146–171`. The naming is now `rcode-review-prompt-{phase}` (old `rihal-` naming from prior F10 is fixed). The `$(cat ...)` shell expansion pattern is unchanged. The concern is a prompt-injection chain: if a PLAN.md that feeds the review prompt contains `$(rm -rf ...)`, that executes during the agent's bash invocation.

**F9:** Confirmed. All dashboard routes lack auth. `/api/state` returns the full state.json content. `/api/memory` returns the memory bank. `/api/files` returns file listing. These are all scoped to `projectRoot` and `RCODE_DIR` — they don't expose arbitrary filesystem paths — but they do expose all project planning artifacts to any local process.

---

## Summary

| Severity | Count | Primary Files |
|----------|-------|---------------|
| critical | 0 | — |
| warn | 5 | `dashboard.js` (F1), `orchestrator.js` (F2), `rcode-tools.cjs` (F6, F7), `workflows/review.md` (F8) |
| info | 4 | `orchestrator.js` (F3, F4, F5), `dashboard.js` (F9) |

**No hardcoded credentials, committed secrets, or SQL injection risks found.** The path traversal guard in `/api/file` is solid (resolve + realpathSync + `.md`-only whitelist).

The highest-risk chain is **F1 + F2**: an unauthenticated `/api/orch-token` endpoint feeding the orchestrator's missing allowlist check on non-`cmd-` storyIds, allowing any local process to spawn a Claude session with `--dangerously-skip-permissions`. Both servers bind to `127.0.0.1` so the attack surface is local-only — but on a shared development server (common in enterprise environments), this is meaningful privilege escalation.

The shell injection findings (F6, F7, F8) require attacker-controlled project files (SPRINT.md or sources.yaml), making them lower-severity supply chain concerns rather than direct remote vectors.

**Overall status: WARN** — no external-facing credential exposure; five warn-level findings centered on the local dashboard/orchestrator trust boundary and shell composition patterns.
