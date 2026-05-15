/**
 * Security regression suite for server/orchestrator.js.
 *
 * Locks the three fixes for issue #752 (unauthenticated network-reachable RCE):
 *   1. Loopback-only bind — reachable on 127.0.0.1.
 *   2. Per-session bearer token — every endpoint rejects token-less calls 401.
 *   3. storyId validation — path-traversal storyIds rejected 400.
 *
 * Run: node --test test/orchestrator-security.test.cjs
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const ORCH = path.resolve(__dirname, '../server/orchestrator.js');
const TOKEN = 'testtoken123';
const PORT = 7799;

let child;

// Promise-based HTTP request helper against the orchestrator.
function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, ...opts }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
      // SSE endpoint keeps the socket open — resolve on first headers.
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

before(async () => {
  child = spawn(process.execPath, [ORCH], {
    env: { ...process.env, ORCH_TOKEN: TOKEN, CLAUDE_BIN: 'true', ORCH_PORT: String(PORT) },
  });
  await new Promise((resolve, reject) => {
    let buf = '';
    const onData = d => {
      buf += d.toString();
      if (buf.includes('Bind:')) { child.stdout.off('data', onData); resolve(); }
    };
    child.stdout.on('data', onData);
    child.on('error', reject);
    setTimeout(() => reject(new Error('orchestrator boot timeout')), 5000);
  });
});

after(() => {
  if (child) child.kill('SIGTERM');
});

test('GET /api/status with no token → 401', async () => {
  const r = await request({ method: 'GET', path: '/api/status' });
  assert.strictEqual(r.status, 401);
});

test('GET /api/status with valid token → 200', async () => {
  const r = await request({
    method: 'GET', path: '/api/status',
    headers: { Authorization: 'Bearer ' + TOKEN },
  });
  assert.strictEqual(r.status, 200);
});

test('POST /api/run with traversal storyId + valid token → 400', async () => {
  const r = await request({
    method: 'POST', path: '/api/run',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
  }, JSON.stringify({ storyId: '../../etc/x', cmd: 'x' }));
  assert.strictEqual(r.status, 400);
});

test('POST /api/run with no token → 401', async () => {
  const r = await request({
    method: 'POST', path: '/api/run',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ storyId: 'good-1', cmd: 'x' }));
  assert.strictEqual(r.status, 401);
});

test('POST /api/clean-sessions with no token → 401', async () => {
  const r = await request({ method: 'POST', path: '/api/clean-sessions' });
  assert.strictEqual(r.status, 401);
});

test('GET /api/stream with wrong token → 401', async () => {
  const r = await request({ method: 'GET', path: '/api/stream/good-1?token=wrongtoken' });
  assert.strictEqual(r.status, 401);
});
