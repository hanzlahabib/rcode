#!/usr/bin/env node
/**
 * Majlis — rcode Dashboard Server
 *
 * View-only Node server that scans .rcode/ directory and renders
 * a live HTML dashboard showing project state, phases, progress,
 * decisions, and artifacts.
 *
 * VIEW-ONLY by design. No CRUD. No database. Source of truth is files.
 *
 * Architecture:
 *   server/dashboard.js          - HTTP server + routing (this file)
 *   server/lib/scanner.js        - State scanning from .rcode/
 *   server/lib/api.js            - API route handlers
 *   server/lib/html/shell.js     - HTML page composition
 *   server/lib/html/css.js       - All CSS styles
 *   server/lib/html/client.js    - Client-side JS (routing, rendering, etc.)
 *
 * Run: node server/dashboard.js
 * Stop: kill $(ss -ltnp 'sport = :7717' | awk 'NR>1{match($6,/pid=([0-9]+)/,m); print m[1]}')
 */

const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const crypto  = require('crypto');
const { spawn } = require('child_process');

// Client JS modules live here and are served verbatim at /js/<name>.js
const CLIENT_DIR = path.join(__dirname, 'lib', 'html', 'client');

const { scanState } = require('./lib/scanner');
const { handleApiState, handleApiFiles, handleApiFile, handleApiHierarchy, handleApiMemory } = require('./lib/api');
const { renderHtml } = require('./lib/html/shell');

// ---------- Configuration ----------
const PORT = parseInt(process.env.PORT || '7717', 10);
const RCODE_DIR = process.env.RCODE_DIR || path.join(process.cwd(), '.rcode');
const PROJECT_ROOT = path.dirname(RCODE_DIR);

// Shared orchestrator token — passed to the orchestrator via env and embedded
// in the HTML. Persisted to ~/.rcode/orch-token so it stays STABLE across
// dashboard restarts; otherwise every restart invalidates the token baked
// into already-open browser tabs and their API calls 401.
function loadOrchToken() {
  if (process.env.ORCH_TOKEN) return process.env.ORCH_TOKEN;
  const tokenFile = path.join(os.homedir(), '.rcode', 'orch-token');
  try {
    const existing = fs.readFileSync(tokenFile, 'utf8').trim();
    if (existing) return existing;
  } catch { /* not yet created */ }
  const token = crypto.randomBytes(24).toString('hex');
  try {
    fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
    fs.writeFileSync(tokenFile, token, { mode: 0o600 });
  } catch { /* non-fatal — fall back to an in-memory token */ }
  return token;
}
const ORCH_TOKEN = loadOrchToken();

// ---------- HTTP Server ----------
// Every request runs through a try/catch so an unanticipated throw inside a
// handler (e.g. a pathological .planning tree in the scanner) returns a 500
// instead of crashing the whole server process.
const server = http.createServer((req, res) => {
  try {
    handleRequest(req, res);
  } catch (err) {
    console.error('[dashboard] request handler failed:', err && err.stack || err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  }
});

function handleRequest(req, res) {
  const url = req.url || '/';

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', mode: 'view-only', rcode_dir: RCODE_DIR }));
    return;
  }

  if (url === '/api/state') {
    handleApiState(req, res, RCODE_DIR);
    return;
  }

  if (url === '/api/files') {
    handleApiFiles(req, res, PROJECT_ROOT);
    return;
  }

  if (url.startsWith('/api/file')) {
    handleApiFile(req, res, PROJECT_ROOT);
    return;
  }

  if (url === '/api/hierarchy') {
    handleApiHierarchy(req, res, RCODE_DIR);
    return;
  }

  if (url === '/api/memory') {
    handleApiMemory(req, res, RCODE_DIR);
    return;
  }

  // Lets the client fetch the current orchestrator token at runtime, so a
  // long-open tab can self-heal instead of 401'ing if the token ever drifts.
  if (url === '/api/orch-token') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token: ORCH_TOKEN }));
    return;
  }

  if (url.startsWith('/js/')) {
    const name = url.slice(4).split('?')[0];
    // Allow nested subdirectories (e.g. components/App.js, views/Foo.js,
    // components/dashboard/ProgressDonut.js) while still rejecting traversal.
    // The regex limits each segment to word chars, dots, and hyphens; the
    // resolved-path check below is the real traversal guard (a `..` segment
    // would pass this pattern but fail the CLIENT_DIR containment check).
    if (!/^(?:[\w.-]+\/)*[\w.-]+\.js$/.test(name)) { res.writeHead(404); res.end('Not found'); return; }
    // Defense-in-depth: resolved path must stay inside CLIENT_DIR even after
    // any OS-level resolution (handles encoded traversal the regex might miss).
    const resolved = path.resolve(CLIENT_DIR, name);
    if (!resolved.startsWith(CLIENT_DIR + path.sep) && resolved !== CLIENT_DIR) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(resolved, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, {
        'Content-Type':  'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      });
      res.end(data);
    });
    return;
  }

  if (url === '/' || url === '/index.html') {
    const state = scanState(RCODE_DIR);
    const html = renderHtml(state, ORCH_TOKEN);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🕌 Majlis (مجلس) — rcode Dashboard`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Mode:       view-only`);
  console.log(`   URL:        http://localhost:${PORT}`);
  console.log(`   Scanning:   ${RCODE_DIR}`);
  console.log(`   Refresh:    30s soft poll`);
  console.log(`   Stop:       kill $(ss -ltnp 'sport = :${PORT}' | awk 'NR>1{match($6,/pid=([0-9]+)/,m); print m[1]}')`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// ── Ensure interactive-terminal native module is present ─────────
// @lydell/node-pty is an optionalDependency, so it can be absent if the
// package was installed with --omit=optional or a partial CI install.
// It ships prebuilt binaries (no node-gyp), so fetching it is a fast,
// no-compile, one-time step. Runs async — the dashboard never blocks; the
// orchestrator is spawned via the callback once the install settles.
// Failure is non-fatal: the terminal just degrades with a clear message.
function ensurePty(done) {
  try { require.resolve('@lydell/node-pty'); done(); return; } catch {}

  const pkgRoot = path.join(__dirname, '..');

  // @lydell/node-pty is already declared in optionalDependencies, so a plain
  // lockfile-respecting `install` pulls it in without mutating package.json.
  // Use pnpm when the repo is pnpm-managed — `npm install` fights pnpm's
  // symlinked node_modules and stalls. End-user installs use npm.
  const usePnpm = fs.existsSync(path.join(pkgRoot, 'pnpm-lock.yaml'));
  const cmd  = usePnpm ? 'pnpm' : 'npm';
  const args = usePnpm
    ? ['install', '--ignore-scripts']
    : ['install', '--ignore-scripts', '--no-audit', '--no-fund'];

  console.log('[setup] Installing interactive-terminal support (@lydell/node-pty)…');
  let settled = false;
  const finish = (ok) => {
    if (settled) return;
    settled = true;
    console.log(ok ? '[setup] Interactive terminal ready.'
                    : '[setup] node-pty install incomplete — terminal stays unavailable.');
    done();
  };

  let child;
  try {
    child = spawn(cmd, args, {
      cwd: pkgRoot, stdio: 'inherit', shell: process.platform === 'win32',
    });
  } catch (err) {
    console.log('[setup] node-pty install could not start:', err.message);
    finish(false);
    return;
  }
  const timer = setTimeout(() => { try { child.kill(); } catch {} }, 180000);
  child.on('exit',  code => { clearTimeout(timer); finish(code === 0); });
  child.on('error', err  => { clearTimeout(timer);
    console.log('[setup] node-pty install error:', err.message); finish(false); });
}

// ── Auto-spawn orchestrator (port 7718) ──────────────────────────
const ORCH_BIN = path.join(__dirname, 'orchestrator.js');
let _orchProc = null;

function spawnOrchestrator() {
  try {
    _orchProc = spawn(process.execPath, [ORCH_BIN], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ORCH_TOKEN, RCODE_DIR, PROJECT_ROOT },
      stdio: 'pipe',
    });
    _orchProc.stdout.on('data', chunk => {
      const msg = chunk.toString().trim();
      if (msg) console.log('[orch]', msg);
    });
    _orchProc.stderr.on('data', chunk => {
      const msg = chunk.toString().trim();
      if (msg && !msg.includes('no stdin')) console.error('[orch]', msg);
    });
    _orchProc.on('exit', (code, signal) => {
      _orchProc = null;
      if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
        if (code === 2) {
          // Port-conflict exit — don't loop. Dashboard stays fully functional.
          console.log(`[orch] orchestrator port already in use — not restarting. Set ORCH_PORT=<N> env var to use a different port. Dashboard is still functional.`);
          return;
        }
        console.log(`[orch] exited (${code}) — restarting in 3s…`);
        setTimeout(spawnOrchestrator, 3000);
      }
    });
    _orchProc.on('error', err => {
      console.error('[orch] spawn error:', err.message);
      _orchProc = null;
    });
    console.log('[orch] orchestrator started (port 7718)');
  } catch (err) {
    console.error('[orch] failed to start:', err.message);
  }
}

// Orchestrator spawns only once node-pty is settled (present or installed).
ensurePty(spawnOrchestrator);

// Graceful shutdown
function shutdown() {
  if (_orchProc) { try { _orchProc.kill('SIGTERM'); } catch {} }
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
