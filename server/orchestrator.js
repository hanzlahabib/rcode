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

const { spawn } = require('child_process');
const http      = require('http');
const path      = require('path');

const PORT         = 7718;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLAUDE_BIN   = process.env.CLAUDE_BIN || 'claude';

// Map<storyId, Session>
// Session: { pid, proc, status, logs: string[], sseClients: Set<res> }
const sessions = new Map();

// ── helpers ──────────────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
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

    // Assistant text delta
    if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta') {
      return { text: p.delta.text || null };
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

// ── route handlers ────────────────────────────────────────────────────────────

function handleStatus(res) {
  const out = {};
  for (const [id, s] of sessions) {
    out[id] = { pid: s.pid, status: s.status, lines: s.logs.length, fileOps: s.fileOps };
  }
  json(res, 200, out);
}

function handleStream(req, res, storyId) {
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
  });

  const s = sessions.get(storyId);
  if (!s) {
    res.write('data: ' + JSON.stringify({ error: 'no session for ' + storyId }) + '\n\n');
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
    fileOps: [],          // { tool, path, op } — file changes this session
    toolBuf: {},          // index → accumulated partial JSON for tool inputs
    sseClients: new Set(),
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
      const { text, fileOp } = parseStreamLine(line, s.toolBuf);
      if (text) broadcast(storyId, text);
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
  });

  json(res, 200, { storyId, pid: proc.pid, status: 'running' });
}

async function handleStop(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  const s       = sessions.get(storyId);
  if (!s) { json(res, 404, { error: 'no session' }); return; }

  try { s.proc?.kill('SIGTERM'); } catch {}
  broadcast(storyId, '■ Stopped by user');
  broadcastStatus(storyId, 'stopped');
  json(res, 200, { storyId, status: 'stopped' });
}

// ── server ────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  cors(res);
  const method = req.method || '';
  const url    = req.url    || '';

  if (method === 'OPTIONS')                                { res.writeHead(204); res.end(); return; }
  if (method === 'GET'  && url === '/api/status')          { handleStatus(res); return; }
  if (method === 'GET'  && url.startsWith('/api/stream/')) {
    const storyId = decodeURIComponent(url.slice('/api/stream/'.length));
    handleStream(req, res, storyId);
    return;
  }
  if (method === 'POST' && url === '/api/run')             { await handleRun(req, res);  return; }
  if (method === 'POST' && url === '/api/stop')            { await handleStop(req, res); return; }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log('\n🤖 Rihal Orchestrator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Port:  ' + PORT);
  console.log('   POST   /api/run    { storyId }');
  console.log('   POST   /api/stop   { storyId }');
  console.log('   GET    /api/status');
  console.log('   GET    /api/stream/:storyId  (SSE)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
