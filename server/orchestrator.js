/**
 * Rihal Local Orchestrator — port 7718
 *
 * Spawns interactive `claude` sessions inside a real pseudo-terminal
 * (node-pty) and bridges each one to the browser over a WebSocket.
 * The browser renders the raw terminal with xterm.js, so the session
 * is fully interactive — the user types, Claude responds, just like a
 * local terminal.
 *
 * HTTP (control plane):
 *   POST /api/run      { storyId, cmd? }  → spawn a PTY session
 *   POST /api/stop     { storyId }        → SIGTERM the PTY
 *   GET  /api/sessions                    → list all sessions
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

const PORT         = parseInt(process.env.ORCH_PORT || '7718', 10);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLAUDE_BIN   = process.env.CLAUDE_BIN || 'claude';

// Per-session auth token — see authed(). The dashboard passes ORCH_TOKEN in
// via env; standalone runs generate one and print it on boot.
const AUTH_TOKEN = process.env.ORCH_TOKEN || crypto.randomBytes(24).toString('hex');

// storyId must be a safe single path segment — no separators, no traversal.
const STORY_ID_RE = /^[A-Za-z0-9._-]+$/;

// Command allowlist — the SECURITY BOUNDARY for the dashboard command runner.
// Only commands listed here may be launched via the UI command picker.
// Slash-commands that launch dev work (rihal-dev-story, rihal-execute, etc.)
// are NOT listed here; they are composed by the UI itself via storyId, not
// by the command runner. This list covers read-mostly and informational rihal
// slash-commands that are safe to run from the browser without further context.
const COMMAND_ALLOWLIST = new Set([
  '/rihal-init',
  '/rihal-status',
  '/rihal-progress',
  '/rihal-help',
  '/rihal-health',
  '/rihal-next',
  '/rihal-show',
  '/rihal-list-plans',
  '/rihal-sprint-status',
  '/rihal-config',
  '/rihal-diff',
  '/rihal-stats',
]);

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
  // (e.g. "cmd-rihal-init"). Existing dev-run sessions use storyIds such as
  // "phase-33", "sprint-33.1", or a raw task id — never "cmd-*" — and MUST NOT
  // be gated here, even though they also supply body.cmd explicitly.
  // This prefix check is the authoritative discriminant between the two call paths.
  if (storyId.startsWith('cmd-') && body.cmd && !COMMAND_ALLOWLIST.has(String(body.cmd).trim())) {
    json(res, 403, { error: 'command not in allowlist', cmd: String(body.cmd).trim() });
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
  const cmd  = String(body.cmd || `/rihal-dev-story ${storyId}`);
  const cols = 120, rows = 30;

  let proc;
  try {
    proc = pty.spawn(CLAUDE_BIN, [cmd, '--dangerously-skip-permissions'], {
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

  if (method === 'GET'  && pathOnly === '/api/sessions') { await handleSessions(res); return; }
  if (method === 'POST' && pathOnly === '/api/run')      { await handleRun(req, res);  return; }
  if (method === 'POST' && pathOnly === '/api/stop')     { await handleStop(req, res); return; }

  res.writeHead(404); res.end('Not found');
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

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n🤖 Rihal Orchestrator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Port:   ' + PORT + '  (127.0.0.1, loopback only)');
  console.log('   Token:  ' + AUTH_TOKEN);
  console.log('   PTY:    ' + (pty ? 'node-pty ready' : 'node-pty MISSING'));
  console.log('   WS:     ' + (WebSocketServer ? 'ready' : 'ws MISSING'));
  console.log('   POST /api/run   GET /api/sessions   WS /ws/<id>');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
