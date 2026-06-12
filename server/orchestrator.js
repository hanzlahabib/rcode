/**
 * rcode Local Orchestrator — port 7718
 *
 * Spawns interactive `claude` sessions inside a real pseudo-terminal
 * (node-pty) and bridges each one to the browser over a WebSocket.
 * The browser renders the raw terminal with xterm.js, so the session
 * is fully interactive — the user types, Claude responds, just like a
 * local terminal.
 *
 * HTTP (control plane):
 *   POST /api/run      { storyId, cmd?, runner?, model? } → spawn a PTY session
 *   POST /api/stop     { storyId }        → SIGTERM the PTY
 *   GET  /api/sessions                    → list all sessions
 *   GET  /api/runners                     → detected agent CLIs + their models
 * WebSocket (data plane):
 *   /ws/<storyId>?token=...               → live terminal I/O
 *
 * Wire protocol (JSON each frame):
 *   server→client  { t:'o', d }            terminal output
 *                  { t:'s', s }            status change (running|done|exited|stopped|error)
 *                  { t:'hist', d }         scrollback replay on connect
 *   client→server  { t:'i', d }            keystroke input
 *                  { t:'r', cols, rows }   resize
 */

'use strict';

const http   = require('http');
const path   = require('path');
const crypto = require('crypto');
const fs     = require('fs');
const { execFile } = require('child_process');

// @lydell/node-pty ships prebuilt binaries and never invokes node-gyp, so a
// plain `npm install` works on any common platform with no build toolchain.
// It is still an optionalDependency: on an unsupported platform the require
// throws, the orchestrator stays up, and /api/run reports a clear error
// instead of crashing — `npx rcode` keeps working everywhere.
let pty = null;
try { pty = require('@lydell/node-pty'); } catch { /* handled in handleRun */ }

let WebSocketServer = null;
try { ({ WebSocketServer } = require('ws')); } catch { /* handled at boot */ }

const PORT = parseInt(process.env.ORCH_PORT || '7718', 10);
// Use the project root passed by the dashboard (RCODE_DIR → parent, or explicit
// PROJECT_ROOT env var). Fall back to cwd so standalone orchestrator runs work.
// NEVER use __dirname-relative path — that resolves to the npm package dir when
// rcode is installed globally, not the user's actual project.
const PROJECT_ROOT = process.env.PROJECT_ROOT
  || (process.env.RCODE_DIR ? path.dirname(process.env.RCODE_DIR) : null)
  || process.cwd();
const CLAUDE_BIN   = process.env.CLAUDE_BIN || 'claude';

// Per-session auth token — see authed(). The dashboard passes ORCH_TOKEN in
// via env; standalone runs generate one and print it on boot.
const AUTH_TOKEN = process.env.ORCH_TOKEN || crypto.randomBytes(24).toString('hex');

// storyId must be a safe single path segment — no separators, no traversal.
const STORY_ID_RE = /^[A-Za-z0-9._-]+$/;

// Command allowlist — the SECURITY BOUNDARY for the dashboard command runner.
// Only commands listed here may be launched via the UI command picker.
// Slash-commands that launch dev work (rcode-dev-story, rcode-execute, etc.)
// are NOT listed here; they are composed by the UI itself via storyId, not
// by the command runner. This list covers read-mostly and informational rcode
// slash-commands that are safe to run from the browser without further context.
const COMMAND_ALLOWLIST = new Set([
  '/rcode-init',
  '/rcode-status',
  '/rcode-progress',
  '/rcode-help',
  '/rcode-health',
  '/rcode-next',
  '/rcode-show',
  '/rcode-list-plans',
  '/rcode-sprint-status',
  '/rcode-config',
  '/rcode-diff',
  '/rcode-stats',
]);

// ── Runner registry ──────────────────────────────────────────────────────────
// Each entry describes one agent CLI the dashboard can launch. `args` builds
// the full argv array (never a shell string — user input is never shell-
// interpolated). `models` is the closed set accepted by POST /api/run; an
// empty/omitted model means "let the CLI use its own default".
// The default runner is claude with no model flag — identical argv to the
// pre-registry behavior, so /api/run calls without {runner, model} are
// backward compatible.
const RUNNERS = [
  {
    id: 'claude', label: 'Claude Code', bin: CLAUDE_BIN, modelFlag: '--model',
    models: ['fable-5', 'opus', 'sonnet', 'haiku'],
    args: (model, prompt) => model
      ? [prompt, '--dangerously-skip-permissions', '--model', model]
      : [prompt, '--dangerously-skip-permissions'],
  },
  {
    id: 'codex', label: 'Codex CLI', bin: 'codex', modelFlag: '--model',
    models: ['gpt-5-codex', 'gpt-5', 'o3'],
    args: (model, prompt) => model ? ['--model', model, prompt] : [prompt],
  },
  {
    id: 'copilot', label: 'GitHub Copilot CLI', bin: 'copilot', modelFlag: '--model',
    models: ['claude-sonnet-4.5', 'gpt-5'],
    args: (model, prompt) => model ? ['--model', model, '-p', prompt] : ['-p', prompt],
  },
  {
    id: 'gemini', label: 'Gemini CLI', bin: 'gemini', modelFlag: '--model',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    // -i = interactive mode with an initial prompt (plain `gemini -p` exits
    // after one response; -i matches the run-then-communicate PTY flow).
    args: (model, prompt) => model ? ['--model', model, '-i', prompt] : ['-i', prompt],
  },
  {
    id: 'grok', label: 'Grok CLI', bin: 'grok', modelFlag: '--model',
    models: ['grok-4-latest', 'grok-code-fast-1'],
    args: (model, prompt) => model ? ['--model', model, '--prompt', prompt] : ['--prompt', prompt],
  },
  {
    id: 'cursor', label: 'Cursor Agent', bin: 'cursor-agent', modelFlag: '--model',
    models: ['gpt-5', 'sonnet-4.5', 'opus-4.1'],
    args: (model, prompt) => model ? ['--model', model, prompt] : [prompt],
  },
  {
    id: 'antigravity', label: 'Antigravity', bin: 'antigravity', modelFlag: null,
    models: [],
    args: (model, prompt) => [prompt],
  },
];

// True when `bin` resolves to an executable — either an explicit path (e.g.
// CLAUDE_BIN=/opt/claude/bin/claude) or a name found on PATH.
async function binAvailable(bin) {
  if (!bin) return false;
  const exts = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  async function executable(p) {
    for (const ext of exts) {
      try { await fs.promises.access(p + ext, fs.constants.X_OK); return true; } catch { /* keep looking */ }
    }
    return false;
  }
  if (bin.includes('/') || bin.includes(path.sep)) return executable(bin);
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir && await executable(path.join(dir, bin))) return true;
  }
  return false;
}

// Availability is detected once at boot and cached on each registry entry.
// Route handlers await this so an early request never reads a stale flag.
const runnersReady = Promise.all(
  RUNNERS.map(async r => { r.available = await binAvailable(r.bin); })
);

// Cap kept-in-memory scrollback per session so a long run can't grow unbounded.
const SCROLLBACK_MAX = 256 * 1024;

// Map<storyId, Session>
// Session: { proc, status, startTime, cmd, cols, rows, scrollback, wsClients:Set }
const sessions = new Map();

// ── helpers ──────────────────────────────────────────────────────────────────

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Constant-time token check. Token arrives as `Authorization: Bearer <t>`
// (HTTP) or `?token=<t>` (WebSocket upgrade — the browser cannot set
// headers on a WebSocket handshake).
function authed(req) {
  let presented = null;
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    presented = auth.slice('Bearer '.length);
  } else {
    const qIdx = (req.url || '').indexOf('?');
    if (qIdx !== -1) {
      presented = new URLSearchParams((req.url || '').slice(qIdx + 1)).get('token');
    }
  }
  if (typeof presented !== 'string') return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(AUTH_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function validStoryId(id) {
  return typeof id === 'string'
    && id.length > 0
    && id.length <= 128
    && !id.includes('..')
    && STORY_ID_RE.test(id);
}

function parseBody(req) {
  return new Promise(resolve => {
    let buf = '';
    req.on('data', c => buf += c);
    req.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve({}); } });
  });
}

// Send one wire frame to every WebSocket client attached to a session.
function wsSend(s, obj) {
  const payload = JSON.stringify(obj);
  for (const ws of s.wsClients) {
    try { ws.send(payload); } catch { s.wsClients.delete(ws); }
  }
}

function setStatus(s, status) {
  s.status = status;
  wsSend(s, { t: 's', s: status });
}

// Set of working-tree files with uncommitted changes. A session's
// "files changed" is the current dirty set minus the set captured when it
// started — an estimate of what that session touched.
function gitModified() {
  return new Promise(resolve => {
    execFile('git', ['-C', PROJECT_ROOT, 'status', '--porcelain'],
      { timeout: 5000 }, (err, stdout) => {
        if (err) { resolve(new Set()); return; }
        const set = new Set();
        for (const line of String(stdout).split('\n')) {
          const f = line.slice(3).trim();
          if (f) set.add(f);
        }
        resolve(set);
      });
  });
}

// A running session that has produced no terminal output for this long is
// almost certainly waiting for the user (a question, or end of a turn).
const IDLE_THRESHOLD_MS = 20000;

// ── route handlers ────────────────────────────────────────────────────────────

async function handleRunners(res) {
  await runnersReady;
  json(res, 200, {
    runners: RUNNERS.map(r => ({
      id: r.id, label: r.label, available: !!r.available, models: r.models,
    })),
  });
}

async function handleSessions(res) {
  const current = await gitModified();
  const now = Date.now();
  const out = [];
  for (const [id, s] of sessions) {
    const start = s.filesAtStart || new Set();
    let changed = 0;
    for (const f of current) if (!start.has(f)) changed++;
    const idleMs = now - (s.lastDataAt || now);
    out.push({
      storyId:      id,
      status:       s.status,
      pid:          s.proc ? s.proc.pid : null,
      cmd:          s.cmd,
      runner:       s.runner || 'claude',
      model:        s.model  || '',
      startTime:    s.startTime,
      clients:      s.wsClients.size,
      filesChanged: changed,
      idleSeconds:  Math.floor(idleMs / 1000),
      waiting:      s.status === 'running' && idleMs > IDLE_THRESHOLD_MS,
    });
  }
  json(res, 200, { sessions: out });
}

async function handleRun(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }

  // Gate the allowlist on command-runner sessions only.
  // Command-runner sessions always use a storyId with the "cmd-" prefix
  // (e.g. "cmd-rcode-init"). Existing dev-run sessions use storyIds such as
  // "phase-33", "sprint-33.1", or a raw task id — never "cmd-*" — and MUST NOT
  // be gated here, even though they also supply body.cmd explicitly.
  // This prefix check is the authoritative discriminant between the two call paths.
  // NOTE: The gate fires for ANY cmd- storyId — a missing or empty body.cmd is
  // also rejected. Previously the truthiness check on body.cmd allowed falsy values
  // to bypass the allowlist and fall through to the /rcode-dev-story fallback.
  if (storyId.startsWith('cmd-')) {
    const reqCmd = typeof body.cmd === 'string' ? body.cmd.trim() : '';
    if (!reqCmd || !COMMAND_ALLOWLIST.has(reqCmd)) {
      json(res, 403, { error: 'command not in allowlist', cmd: reqCmd });
      return;
    }
  }

  // Runner + model selection — STRICT validation against the registry.
  // Omitted runner → claude with no model flag (pre-registry behavior).
  // An explicitly requested runner must exist AND be installed; a model must
  // be in that runner's closed list. Everything is spawned as an argv array,
  // so none of these values ever reach a shell.
  await runnersReady;
  const runnerId = (body.runner === undefined || body.runner === null || body.runner === '')
    ? 'claude' : String(body.runner);
  const runner = RUNNERS.find(r => r.id === runnerId);
  if (!runner) { json(res, 400, { error: 'unknown runner: ' + runnerId }); return; }
  if (body.runner !== undefined && body.runner !== null && body.runner !== '' && !runner.available) {
    json(res, 400, { error: 'runner not installed: ' + runnerId });
    return;
  }
  const model = (body.model === undefined || body.model === null) ? '' : String(body.model);
  if (model && !runner.models.includes(model)) {
    json(res, 400, { error: 'invalid model for ' + runnerId + ': ' + model });
    return;
  }

  if (!pty) {
    json(res, 503, { error: 'interactive terminal unavailable on this platform — run: pnpm add @lydell/node-pty' });
    return;
  }

  const existing = sessions.get(storyId);
  if (existing && existing.status === 'running') {
    json(res, 409, { error: 'already running', pid: existing.proc && existing.proc.pid });
    return;
  }
  // Replacing a finished session — drop any sockets still attached.
  if (existing) { for (const ws of existing.wsClients) { try { ws.close(); } catch {} } }

  // Initial prompt. `claude [prompt]` starts an interactive session that
  // processes the prompt, then waits for further input — exactly the
  // run-then-communicate flow we want.
  const cmd  = String(body.cmd || `/rcode-dev-story ${storyId}`);
  const cols = 120, rows = 30;

  let proc;
  try {
    proc = pty.spawn(runner.bin, runner.args(model, cmd), {
      name: 'xterm-color',
      cols, rows,
      cwd: PROJECT_ROOT,
      env: process.env,
    });
  } catch (err) {
    json(res, 500, { error: 'spawn failed: ' + err.message });
    return;
  }

  const s = {
    proc, status: 'running', cmd, cols, rows,
    runner: runner.id, model,
    startTime:   new Date().toISOString(),
    lastDataAt:  Date.now(),
    scrollback:  '',
    wsClients:   new Set(),
    filesAtStart: new Set(),
  };
  sessions.set(storyId, s);
  // Snapshot the dirty working tree so /api/sessions can report how many
  // files this session has changed since it began.
  gitModified().then(set => { s.filesAtStart = set; });

  proc.onData(d => {
    s.lastDataAt = Date.now();
    s.scrollback += d;
    if (s.scrollback.length > SCROLLBACK_MAX) {
      s.scrollback = s.scrollback.slice(-SCROLLBACK_MAX);
    }
    wsSend(s, { t: 'o', d });
  });

  proc.onExit(({ exitCode, signal }) => {
    const status = signal ? 'stopped' : (exitCode === 0 ? 'done' : 'exited');
    setStatus(s, status);
  });

  json(res, 200, { storyId, pid: proc.pid, status: 'running' });
}

async function handleStop(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }
  const s = sessions.get(storyId);
  if (!s) { json(res, 404, { error: 'no session' }); return; }
  try { s.proc.kill(); } catch {}
  setStatus(s, 'stopped');
  json(res, 200, { storyId, status: 'stopped' });
}

// Remove ended sessions (done/exited/stopped/error). Running sessions are never
// touched. Optional body.olderThanDays gates removal by session start age.
async function handleCleanSessions(req, res) {
  const body = await parseBody(req);
  const olderThanDays = Number(body.olderThanDays) || 0;
  const cutoff = olderThanDays > 0 ? Date.now() - olderThanDays * 86400000 : null;
  let removed = 0;
  for (const [id, s] of sessions) {
    if (s.status === 'running') continue;
    if (cutoff !== null && (Date.parse(s.startTime || '') || 0) > cutoff) continue;
    s.wsClients.forEach(ws => { try { ws.close(); } catch {} });
    sessions.delete(id);
    removed++;
  }
  json(res, 200, { removed });
}

// ── WebSocket data plane ───────────────────────────────────────────────────────

function attachWebSocket(ws, storyId) {
  const s = sessions.get(storyId);
  if (!s) {
    ws.send(JSON.stringify({ t: 's', s: 'error' }));
    ws.close();
    return;
  }

  s.wsClients.add(ws);
  // Replay history so a late-joining client sees the session so far.
  if (s.scrollback) ws.send(JSON.stringify({ t: 'hist', d: s.scrollback }));
  ws.send(JSON.stringify({ t: 's', s: s.status }));

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.t === 'i' && typeof msg.d === 'string' && s.status === 'running') {
      try { s.proc.write(msg.d); } catch {}
    } else if (msg.t === 'r' && s.status === 'running') {
      const cols = parseInt(msg.cols, 10), rows = parseInt(msg.rows, 10);
      if (cols > 0 && rows > 0) {
        s.cols = cols; s.rows = rows;
        try { s.proc.resize(cols, rows); } catch {}
      }
    }
  });

  ws.on('close', () => s.wsClients.delete(ws));
  ws.on('error', () => s.wsClients.delete(ws));
}

// ── server ────────────────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error('[' + new Date().toISOString() + '] [orchestrator] unhandledRejection:', reason && reason.stack || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[' + new Date().toISOString() + '] [orchestrator] uncaughtException:', err && err.stack || err);
});

const server = http.createServer(async (req, res) => {
  const method = req.method || '';
  const url    = req.url    || '';

  // CORS — the dashboard is served from a different port (7717), so every
  // browser call here is cross-origin. The loopback bind + token are what
  // gate access; a wildcard origin is safe with no cookies involved.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (!authed(req)) { json(res, 401, { error: 'unauthorized' }); return; }

  const pathOnly = url.indexOf('?') === -1 ? url : url.slice(0, url.indexOf('?'));

  if (method === 'GET'  && pathOnly === '/api/status')   { json(res, 200, { ok: true, sessions: sessions.size }); return; }
  if (method === 'GET'  && pathOnly === '/api/runners')  { await handleRunners(res); return; }
  if (method === 'GET'  && pathOnly === '/api/sessions') { await handleSessions(res); return; }
  if (method === 'POST' && pathOnly === '/api/run')      { await handleRun(req, res);  return; }
  if (method === 'POST' && pathOnly === '/api/stop')     { await handleStop(req, res); return; }
  if (method === 'POST' && pathOnly === '/api/clean-sessions') { await handleCleanSessions(req, res); return; }

  res.writeHead(404); res.end('Not found');
});

server.on('error', (err) => {
  console.error('[orchestrator] server error:', err.message);
  process.exit(1);
});

// WebSocket upgrade — authenticate, validate the storyId, then hand off.
if (WebSocketServer) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url      = req.url || '';
    const pathOnly = url.indexOf('?') === -1 ? url : url.slice(0, url.indexOf('?'));
    if (!pathOnly.startsWith('/ws/') || !authed(req)) { socket.destroy(); return; }
    const storyId = decodeURIComponent(pathOnly.slice('/ws/'.length));
    if (!validStoryId(storyId)) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => attachWebSocket(ws, storyId));
  });
}

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    // Exit with code 2 so the dashboard knows this is a port-conflict (not a crash)
    // and can suppress the restart loop + print a one-time user hint.
    console.error(`[orch] port ${PORT} already in use. Set ORCH_PORT=<N> env var to use a different port. Exiting without retry.`);
    process.exit(2);
  }
  console.error('[orch] server error:', err.message);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n🤖 rcode Orchestrator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Port:   ' + PORT);
  console.log('   Bind:   127.0.0.1 (loopback only)');
  console.log('   Token:  ' + AUTH_TOKEN.slice(0, 8) + '... (redacted)');
  console.log('   PTY:    ' + (pty ? 'node-pty ready' : 'node-pty MISSING'));
  console.log('   WS:     ' + (WebSocketServer ? 'ready' : 'ws MISSING'));
  console.log('   POST /api/run   GET /api/sessions   GET /api/runners   WS /ws/<id>');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
