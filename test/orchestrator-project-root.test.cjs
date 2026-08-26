/**
 * Regression test for issue #1037 — the orchestrator must reject any request
 * whose declared PROJECT_ROOT does not match its own. Without this check, a
 * client pointed at the wrong orchestrator instance (e.g. a second project's
 * dashboard that inherited a stale/guessed port) can silently drive that
 * other project's repository.
 *
 * Run: node --test test/orchestrator-project-root.test.cjs
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const ORCH = path.resolve(__dirname, '../server/orchestrator.js');
const TOKEN = 'testtoken123';
// 7811, not 7801 — orchestrator-view-only.test.cjs owns 7801-7803 and the
// two collided whenever the full suite ran both files together.
const PORT = 7811;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const WRONG_ROOT = path.resolve(__dirname, '..', '..'); // definitely not PROJECT_ROOT

let child;

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, ...opts }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

before(async () => {
  child = spawn(process.execPath, [ORCH], {
    env: { ...process.env, ORCH_TOKEN: TOKEN, CLAUDE_BIN: 'true', ORCH_PORT: String(PORT), PROJECT_ROOT },
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

test('GET /api/status with mismatched X-Project-Root → 403', async () => {
  const r = await request({
    method: 'GET', path: '/api/status',
    headers: { Authorization: 'Bearer ' + TOKEN, 'X-Project-Root': WRONG_ROOT },
  });
  assert.strictEqual(r.status, 403);
});

test('GET /api/status with no X-Project-Root → 403 (fail closed)', async () => {
  const r = await request({
    method: 'GET', path: '/api/status',
    headers: { Authorization: 'Bearer ' + TOKEN },
  });
  assert.strictEqual(r.status, 403);
});

test('GET /api/status with matching X-Project-Root → 200', async () => {
  const r = await request({
    method: 'GET', path: '/api/status',
    headers: { Authorization: 'Bearer ' + TOKEN, 'X-Project-Root': PROJECT_ROOT },
  });
  assert.strictEqual(r.status, 200);
});

test('POST /api/run with mismatched X-Project-Root → 403 (not routed to storyId validation)', async () => {
  const r = await request({
    method: 'POST', path: '/api/run',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'X-Project-Root': WRONG_ROOT },
  }, JSON.stringify({ storyId: 'good-1', cmd: '/rcode-status' }));
  assert.strictEqual(r.status, 403);
});
