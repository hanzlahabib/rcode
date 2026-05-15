/**
 * Rihal Local Orchestrator — port 7718
 *
 * Spawns `claude -p` sessions from kanban card clicks.
 * Streams stdout/stderr back to the browser via SSE.
 * Pure Node stdlib — no external dependencies.
 *
 * Endpoints:
 *   POST /api/run    { storyId, cmd? }  → spawn claude session
 *   POST /api/stop   { storyId }        → SIGTERM the process
 *   GET  /api/status                    → all session states
 *   GET  /api/stream/:storyId           → SSE log stream
 */

'use strict';

const { spawn }  = require('child_process');
const http       = require('http');
const path       = require('path');
const fs         = require('fs');
const os         = require('os');
const crypto     = require('crypto');

const PORT         = parseInt(process.env.ORCH_PORT || '7718', 10);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLAUDE_BIN   = process.env.CLAUDE_BIN || 'claude';
const SESSIONS_DIR = path.join(os.homedir(), '.rihal', 'sessions');

// Per-session auth token. Use ORCH_TOKEN if set, else generate one and print
// it on boot. The dashboard process / user must pass this token on EVERY call
// (Authorization: Bearer header, or ?token= query param for the SSE endpoint).
const AUTH_TOKEN = process.env.ORCH_TOKEN || crypto.randomBytes(24).toString('hex');

// storyId must be a safe path segment — no separators, no traversal.
const STORY_ID_RE = /^[A-Za-z0-9._-]+$/;

// Ensure sessions directory exists
try { fs.mkdirSync(SESSIONS_DIR, { recursive: true }); } catch {}

// Map<storyId, Session>
// Session: { pid, proc, status, logs[], fileOps[], toolBuf{}, sseClients: Set, startTime }
const sessions = new Map();

// ── helpers ──────────────────────────────────────────────────────────────────

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Constant-time token check. Accepts the token via `Authorization: Bearer`
// header, or a `?token=` query param (the EventSource SSE client cannot set
// headers). Returns true only on an exact match.
function authed(req) {
  let presented = null;
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    presented = auth.slice('Bearer '.length);
  } else {
    const qIdx = (req.url || '').indexOf('?');
    if (qIdx !== -1) {
      const params = new URLSearchParams((req.url || '').slice(qIdx + 1));
      presented = params.get('token');
    }
  }
  if (typeof presented !== 'string') return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(AUTH_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Validate a storyId before it touches the filesystem. Charset blocks path
// separators; the explicit `..` check blocks traversal even though `.` is
// allowed in the charset.
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

// Push one log line to session buffer + all connected SSE clients
function broadcast(storyId, line) {
  const s = sessions.get(storyId);
  if (!s || !line) return;
  s.logs.push(line);
  const payload = 'data: ' + JSON.stringify({ line }) + '\n\n';
  for (const client of s.sseClients) {
    try { client.write(payload); } catch { s.sseClients.delete(client); }
  }
}

// Push a raw text chunk to SSE (not buffered — for streaming characters)
function broadcastChunk(storyId, chunk) {
  const s = sessions.get(storyId);
  if (!s || !chunk) return;
  const payload = 'data: ' + JSON.stringify({ chunk }) + '\n\n';
  for (const client of s.sseClients) {
    try { client.write(payload); } catch { s.sseClients.delete(client); }
  }
}

// Push a file operation event to SSE clients + buffer it
function broadcastFileOp(storyId, fileOp) {
  const s = sessions.get(storyId);
  if (!s || !fileOp) return;
  s.fileOps.push(fileOp);
  const payload = 'data: ' + JSON.stringify({ fileOp }) + '\n\n';
  for (const client of s.sseClients) {
    try { client.write(payload); } catch { s.sseClients.delete(client); }
  }
}

// Push a status event to all SSE clients for a session
function broadcastStatus(storyId, status) {
  const s = sessions.get(storyId);
  if (!s) return;
  s.status = status;
  const payload = 'data: ' + JSON.stringify({ status }) + '\n\n';
  for (const client of s.sseClients) {
    try { client.write(payload); } catch { s.sseClients.delete(client); }
  }
}

// Parse one stream-json line → { text?, fileOp? }
// toolBuf = accumulated partial JSON per content block index
function parseStreamLine(raw, toolBuf) {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);

    // Streaming text delta — send as 'chunk' so browser appends in-place
    if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta') {
      return { chunk: p.delta.text || null };
    }

    // Tool use start — record tool name, init buffer
    if (p.type === 'content_block_start' && p.content_block?.type === 'tool_use') {
      const name = p.content_block.name || 'tool';
      toolBuf[p.index] = { name, json: '' };
      return { text: '⚙ ' + name };
    }

    // Tool input JSON accumulation
    if (p.type === 'content_block_delta' && p.delta?.type === 'input_json_delta') {
      if (toolBuf[p.index]) toolBuf[p.index].json += (p.delta.partial_json || '');
      return {};
    }

    // Tool use complete — try to extract file path
    if (p.type === 'content_block_stop' && toolBuf[p.index]) {
      const { name, json: partial } = toolBuf[p.index];
      delete toolBuf[p.index];
      let fileOp = null;
      try {
        const inp = JSON.parse(partial);
        const filePath = inp.path || inp.file_path || inp.file || inp.filename || null;
        const isWrite = /write|edit|create|str_replace/i.test(name);
        const isRead  = /read|view|cat/i.test(name);
        const isBash  = /bash|exec|run|shell/i.test(name);
        if (filePath) {
          fileOp = { tool: name, path: filePath, op: isWrite ? 'write' : isRead ? 'read' : 'access' };
        } else if (isBash && inp.command) {
          fileOp = { tool: 'bash', path: null, cmd: String(inp.command).slice(0, 80), op: 'bash' };
        }
      } catch {}
      return { fileOp };
    }

    // Result summary
    if (p.type === 'result') return { text: '✓ ' + (p.subtype || 'done') };

    // Legacy format
    if (p.type === 'assistant' && Array.isArray(p.message?.content)) {
      const text = p.message.content.filter(c => c.type === 'text').map(c => c.text).join('');
      return { text: text || null };
    }

    return {};
  } catch {
    const t = raw.trim();
    return { text: t.startsWith('{') ? null : (t || null) };
  }
}

// Persist completed session to ~/.rihal/sessions/{storyId}-{date}.json
function persistSession(storyId, exitStatus) {
  const s = sessions.get(storyId);
  if (!s) return;
  try {
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(SESSIONS_DIR, storyId + '-' + date + '.json');
    // Defense-in-depth: refuse to write outside SESSIONS_DIR.
    if (!path.resolve(file).startsWith(SESSIONS_DIR + path.sep)) return;
    fs.writeFileSync(file, JSON.stringify({
      storyId, status: exitStatus,
      startTime: s.startTime, endTime: new Date().toISOString(),
      logs: s.logs, fileOps: s.fileOps,
    }), 'utf8');
  } catch {}
}

// Load most recent persisted session for a storyId (if any)
function loadLastSession(storyId) {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.startsWith(storyId + '-') && f.endsWith('.json'))
      .sort()
      .reverse();
    if (!files.length) return null;
    const file = path.join(SESSIONS_DIR, files[0]);
    // Defense-in-depth: refuse to read outside SESSIONS_DIR.
    if (!path.resolve(file).startsWith(SESSIONS_DIR + path.sep)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return null; }
}

// Clean sessions older than N days
function cleanSessions(olderThanDays) {
  const cutoff = Date.now() - olderThanDays * 86400000;
  let removed = 0;
  try {
    for (const f of fs.readdirSync(SESSIONS_DIR)) {
      if (!f.endsWith('.json')) continue;
      const full = path.join(SESSIONS_DIR, f);
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) { fs.unlinkSync(full); removed++; }
    }
  } catch {}
  return removed;
}

// ── route handlers ────────────────────────────────────────────────────────────

function handleStatus(res) {
  const out = {};
  for (const [id, s] of sessions) {
    out[id] = { pid: s.pid, status: s.status, lines: s.logs.length, fileOps: s.fileOps };
  }
  json(res, 200, out);
}

function handleStream(req, res, storyId) {
  if (!validStoryId(storyId)) { res.writeHead(400); res.end('invalid storyId'); return; }
  res.writeHead(200, {
    'Content-Type':    'text/event-stream',
    'Cache-Control':   'no-cache',
    'Connection':      'keep-alive',
    'X-Accel-Buffering': 'no',   // disable nginx/proxy buffering
  });
  // Disable Nagle — flush every write immediately to the browser
  if (res.socket) res.socket.setNoDelay(true);

  const s = sessions.get(storyId);
  if (!s) {
    // Try to replay last persisted session
    const last = loadLastSession(storyId);
    if (last) {
      for (const line of (last.logs || [])) {
        res.write('data: ' + JSON.stringify({ line }) + '\n\n');
      }
      for (const fileOp of (last.fileOps || [])) {
        res.write('data: ' + JSON.stringify({ fileOp }) + '\n\n');
      }
      res.write('data: ' + JSON.stringify({ status: last.status || 'done' }) + '\n\n');
    } else {
      res.write('data: ' + JSON.stringify({ error: 'no session for ' + storyId }) + '\n\n');
    }
    res.end();
    return;
  }

  // Replay buffered logs + file ops so late-connecting clients see history
  for (const line of s.logs) {
    res.write('data: ' + JSON.stringify({ line }) + '\n\n');
  }
  for (const fileOp of s.fileOps) {
    res.write('data: ' + JSON.stringify({ fileOp }) + '\n\n');
  }
  res.write('data: ' + JSON.stringify({ status: s.status }) + '\n\n');

  s.sseClients.add(res);
  req.on('close', () => s.sseClients.delete(res));
}

async function handleRun(req, res) {
  const body     = await parseBody(req);
  const storyId  = String(body.storyId || '').trim();
  if (!storyId) { json(res, 400, { error: 'missing storyId' }); return; }
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }

  const existing = sessions.get(storyId);
  if (existing?.status === 'running') {
    json(res, 409, { error: 'already running', pid: existing.pid });
    return;
  }

  // Default command: invoke the rihal-dev-story skill for the given story ID
  const cmd = String(body.cmd || `/rihal-dev-story ${storyId}`);

  const s = {
    pid: null, proc: null, status: 'starting',
    logs: ['▶ Starting: claude -p "' + cmd + '"'],
    fileOps: [],
    toolBuf: {},
    sseClients: new Set(),
    startTime: new Date().toISOString(),
  };
  sessions.set(storyId, s);

  const proc = spawn(CLAUDE_BIN, [
    '-p', cmd,
    '--output-format', 'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
  ], {
    cwd: PROJECT_ROOT,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  s.proc = proc;
  s.pid  = proc.pid;
  s.status = 'running';

  proc.stdout.on('data', chunk => {
    for (const raw of chunk.toString().split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const { text, chunk, fileOp } = parseStreamLine(line, s.toolBuf);
      if (chunk) broadcastChunk(storyId, chunk);   // streaming text — in-place append
      if (text)  broadcast(storyId, text);          // event/status line — new row
      if (fileOp) broadcastFileOp(storyId, fileOp);
    }
  });

  proc.stderr.on('data', chunk => {
    const msg = chunk.toString().trim();
    // Skip the noisy stdin warning — it's expected with stdio:ignore
    if (msg && !msg.includes('no stdin data received')) {
      broadcast(storyId, '⚠ ' + msg);
    }
  });

  proc.on('error', err => {
    broadcast(storyId, '✗ spawn error: ' + err.message);
    broadcastStatus(storyId, 'error');
  });

  proc.on('exit', code => {
    const final = code === 0 ? 'done' : (code === null ? 'stopped' : 'error');
    broadcast(storyId, final === 'done' ? '✅ Completed' : '✗ Exited with code ' + code);
    broadcastStatus(storyId, final);
    persistSession(storyId, final);
  });

  json(res, 200, { storyId, pid: proc.pid, status: 'running' });
}

async function handleCleanSessions(req, res) {
  const body = await parseBody(req);
  const days = parseInt(body.olderThanDays || 7, 10);
  const removed = cleanSessions(days);
  json(res, 200, { removed, sessionsDir: SESSIONS_DIR });
}

async function handleStop(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }
  const s       = sessions.get(storyId);
  if (!s) { json(res, 404, { error: 'no session' }); return; }

  try { s.proc?.kill('SIGTERM'); } catch {}
  broadcast(storyId, '■ Stopped by user');
  broadcastStatus(storyId, 'stopped');
  json(res, 200, { storyId, status: 'stopped' });
}

// ── server ────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const method = req.method || '';
  const url    = req.url    || '';
  // Every route requires the token — /api/status leaks session detail too.
  if (!authed(req)) { json(res, 401, { error: 'unauthorized' }); return; }

  if (method === 'GET'  && url === '/api/status')          { handleStatus(res); return; }
  if (method === 'GET'  && url.startsWith('/api/stream/')) {
    const pathOnly = url.indexOf('?') === -1 ? url : url.slice(0, url.indexOf('?'));
    const storyId = decodeURIComponent(pathOnly.slice('/api/stream/'.length));
    handleStream(req, res, storyId);
    return;
  }
  if (method === 'POST' && url === '/api/run')             { await handleRun(req, res);  return; }
  if (method === 'POST' && url === '/api/stop')            { await handleStop(req, res); return; }
  if (method === 'POST' && url === '/api/clean-sessions')  { await handleCleanSessions(req, res); return; }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n🤖 Rihal Orchestrator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Port:  ' + PORT);
  console.log('   Bind:  127.0.0.1 (loopback only)');
  // The dashboard process / user must pass this token on every API call.
  console.log('   Token: ' + AUTH_TOKEN);
  console.log('   POST   /api/run    { storyId }');
  console.log('   POST   /api/stop   { storyId }');
  console.log('   GET    /api/status');
  console.log('   GET    /api/stream/:storyId  (SSE)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
