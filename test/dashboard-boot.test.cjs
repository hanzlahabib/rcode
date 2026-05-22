/**
 * Dashboard boot tests.
 *
 * Verifies that server/dashboard.js boots cleanly on a fresh ephemeral
 * port and serves the core API endpoints without throwing. This is the
 * regression gate for additive changes to server/lib/*.
 *
 * Run: node --test test/dashboard-boot.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_PATH = path.join(PROJECT_ROOT, 'server', 'dashboard.js');

/**
 * Pick a random high port to avoid collisions with anything the
 * contributor has running. The dashboard reads PORT from env.
 */
function randomPort() {
  return 9000 + Math.floor(Math.random() * 1000);
}

function spawnDashboard(port) {
  const proc = spawn('node', [DASHBOARD_PATH], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return proc;
}

function waitForReady(proc, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('dashboard did not start in time')), timeoutMs);
    proc.stdout.on('data', (buf) => {
      if (buf.toString().includes('rcode Dashboard')) {
        clearTimeout(timer);
        // give it a beat to bind the listener
        setTimeout(resolve, 100);
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`dashboard exited before ready (code ${code})`));
    });
  });
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 3000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('request timeout')); });
  });
}

test('dashboard: boots and serves /health, /api/state, /api/memory', async (t) => {
  const port = randomPort();
  const proc = spawnDashboard(port);
  t.after(() => {
    if (!proc.killed) proc.kill('SIGTERM');
  });

  await waitForReady(proc);

  const health = await get(port, '/health');
  assert.equal(health.status, 200);
  const healthJson = JSON.parse(health.body);
  assert.equal(healthJson.status, 'ok');
  assert.equal(healthJson.mode, 'view-only');

  const state = await get(port, '/api/state');
  assert.equal(state.status, 200);
  // state.json may or may not exist on this repo's .rcode/ — both are valid
  const stateJson = JSON.parse(state.body);
  assert.ok(typeof stateJson === 'object', 'state must be an object');

  const memory = await get(port, '/api/memory');
  assert.equal(memory.status, 200);
  const memoryJson = JSON.parse(memory.body);
  assert.ok(typeof memoryJson.exists === 'boolean', 'memory must have an exists boolean');
});

test('dashboard: 404s on unknown route', async (t) => {
  const port = randomPort();
  const proc = spawnDashboard(port);
  t.after(() => {
    if (!proc.killed) proc.kill('SIGTERM');
  });

  await waitForReady(proc);

  const res = await get(port, '/this-route-does-not-exist');
  assert.equal(res.status, 404);
});
