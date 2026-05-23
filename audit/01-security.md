# Security Audit

## Summary
- Severity counts: P0=0, P1=3, P2=3, P3=2

---

## Findings

### [P1] Auth token printed to stdout in plaintext on every boot
- File: `server/orchestrator.js:383`
- Issue: `console.log('   Token:  ' + AUTH_TOKEN)` prints the 24-byte bearer token to stdout at startup. Any process that captures the orchestrator's stdout (logs, CI, shell history) receives the live credential.
- Fix: Remove the token line from the boot banner, or redact it (`AUTH_TOKEN.slice(0, 4) + '...'`).

### [P1] Shell injection via `symbol` interpolated into `execSync` grep command
- File: `.rcode/bin/lib/code-references.cjs:156`
- Issue: `const cmd = \`grep -r "\\b${symbol}\\b" "${projectRoot}" ...\`` — `symbol` is extracted from arbitrary plan text (LLM output) using a regex, then interpolated directly into a shell command string passed to `execSync`. A symbol value of `"; rm -rf /; echo "` would execute arbitrary shell commands.
- Fix: Use `execFileSync('grep', ['-r', '--', `\\b${symbol}\\b`, projectRoot, ...])` to pass args as an array. Never construct shell commands via string interpolation with untrusted values.

### [P1] CDN scripts loaded without Subresource Integrity (SRI)
- File: `server/lib/html/shell.js:22-25`
- Issue: Three external scripts (marked, xterm, xterm-addon-fit) are loaded from `cdn.jsdelivr.net` with no `integrity=` attribute. If the CDN is compromised or an attacker performs a MITM (dashboard runs over plain HTTP), arbitrary JS executes in the user's browser with full access to `window.__ORCH_TOKEN__` and the terminal WebSocket.
- Fix: Add `integrity="sha384-..."` and `crossorigin="anonymous"` to every `<script>` and `<link>` CDN tag, or bundle these dependencies instead.

### [P2] Markdown rendered unsanitized via `marked.parse` + `dangerouslySetInnerHTML`
- File: `server/lib/html/client/views/FilesView.js:27,136`
- Issue: File contents from the project directory are piped through `marked.parse()` (no safe-mode config) and injected into the DOM via `dangerouslySetInnerHTML`. Marked v15 defaults allow raw HTML. A markdown file containing `<script>` or `javascript:` hrefs will execute in the dashboard.
- Fix: Configure marked with `{ mangle: false, headerIds: false }` and pass the result through DOMPurify before injection, or use `marked.use({ renderer })` with a sanitizing renderer.

### [P2] `process.env` passed wholesale to child PTY process
- File: `server/orchestrator.js:240`
- Issue: `env: process.env` passes the full server environment (which includes `ORCH_TOKEN`, `PROJECT_ROOT`, and any other secrets set in the orchestrator's environment) to every spawned `claude` PTY session. Any tool that the LLM executes can read all those variables.
- Fix: Pass an explicit, allowlisted env object: `{ PATH, HOME, TERM, RCODE_DIR }`. Do not forward `ORCH_TOKEN` or any other credential.

### [P2] No request body size limit on orchestrator HTTP endpoints
- File: `server/orchestrator.js:124-129`
- Issue: `parseBody` accumulates raw chunks into a string with no size cap. An attacker on localhost (or via CORS from a rogue webpage) can POST an arbitrarily large body to exhaust the Node.js heap.
- Fix: Track accumulated length in `parseBody` and reject (HTTP 413) when it exceeds a reasonable cap (e.g. 64 KB).

### [P3] Auth token exposed to browser JS via `window.__ORCH_TOKEN__`
- File: `server/lib/html/shell.js:26`
- Issue: The orchestrator auth token is embedded as a global JS variable in every page load. Combined with the missing CSP (see below), any injected script reads the token and can make authenticated API calls to the orchestrator.
- Fix: Deliver the token via a server-side session cookie with `HttpOnly; SameSite=Strict` instead, or implement a one-time exchange endpoint. If the global approach is kept, add a strict CSP to limit script execution.

### [P3] No security response headers on either server
- File: `server/dashboard.js` and `server/orchestrator.js`
- Issue: Neither server sets `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`. The dashboard is accessed from a browser; without CSP, the XSS surface from finding P2 and the CDN risk from P1 are unrestricted.
- Fix: Add at minimum `X-Content-Type-Options: nosniff` and a `Content-Security-Policy` that restricts `script-src` to the known CDN origins and `'self'`.

---

## Clean checks
- No hardcoded API keys (AWS AKIA*, GitHub ghp_*, OpenAI sk-*) found anywhere in tracked files.
- No committed `.env` files.
- No `eval()` or `vm.runInThisContext` in production code.
- No `new Function(...)` used outside of bundled third-party dist files.
- `pty.spawn` uses an args array (not `sh -c`), so `cmd` values cannot inject shell metacharacters at the OS level.
- `storyId` validated against `/^[A-Za-z0-9._-]+$/` (max 128 chars) before use — path traversal blocked.
- Dashboard `/js/` file-serving validates path against a strict regex and a `path.resolve` + prefix check — no directory traversal.
- Command allowlist enforced for all `cmd-*` storyId sessions — arbitrary commands cannot be injected via the UI.
- Orchestrator binds to `127.0.0.1` only (loopback), not `0.0.0.0`.
- Token comparison uses `crypto.timingSafeEqual` — no timing oracle.
- Dynamic `require()` calls in `rcode-tools.cjs` resolve only to hardcoded `__dirname`-relative paths — no user-controlled module loading.
- No sensitive data logged beyond the token issue noted in P1.
