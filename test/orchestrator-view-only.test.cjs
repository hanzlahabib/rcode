/**
 * view_only regression suite for server/orchestrator.js (#967).
 *
 * Incident: a browser-driving sub-agent clicked the dashboard's Run
 * affordance on a live instance and spawned a --dangerously-skip-permissions
 * agent against the real repo. Hiding the button is not a fix — anything
 * that can POST /api/run directly (a script, a misdirected sub-agent, a
 * stale bookmark) bypasses a UI-only gate. This locks the server-side
 * refusal: with `dashboard.view_only: true` in .rcode/config.yaml (or
 * VIEW_ONLY=1 in the environment), POST /api/run must 403 regardless of
 * what the client does.
 *
 * Run: node --test test/orchestrator-view-only.test.cjs
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const ORCH = path.resolve(__dirname, '../server/orchestrator.js');
const TOKEN = 'testtoken123';

function request(port, opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, ...opts }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function makeProjectRoot(configYaml) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-view-only-'));
  fs.mkdirSync(path.join(root, '.rcode'), { recursive: true });
  if (configYaml !== null) {
    fs.writeFileSync(path.join(root, '.rcode', 'config.yaml'), configYaml);
  }
  return root;
}

function spawnOrch(port, projectRoot, extraEnv) {
  return spawn(process.execPath, [ORCH], {
    env: {
      ...process.env,
      ORCH_TOKEN: TOKEN,
      CLAUDE_BIN: 'true',
      ORCH_PORT: String(port),
      PROJECT_ROOT: projectRoot,
      ...extraEnv,
    },
  });
}

function waitForBoot(child) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = d => {
      buf += d.toString();
      if (buf.includes('Bind:')) { child.stdout.off('data', onData); resolve(); }
    };
    child.stdout.on('data', onData);
    child.on('error', reject);
    setTimeout(() => reject(new Error('orchestrator boot timeout')), 5000);
  });
}

let childViewOnly, portViewOnly;
let childNormal, portNormal;
let childEnvViewOnly, portEnvViewOnly;

before(async () => {
  portViewOnly = 7801;
  portNormal = 7802;
  portEnvViewOnly = 7803;

  const viewOnlyRoot = makeProjectRoot('dashboard:\n  view_only: true\n');
  const normalRoot = makeProjectRoot('dashboard:\n  view_only: false\n');
  const envViewOnlyRoot = makeProjectRoot(null); // no config.yaml at all — env-only gate

  childViewOnly = spawnOrch(portViewOnly, viewOnlyRoot);
  childNormal = spawnOrch(portNormal, normalRoot);
  childEnvViewOnly = spawnOrch(portEnvViewOnly, envViewOnlyRoot, { VIEW_ONLY: '1' });

  await Promise.all([
    waitForBoot(childViewOnly),
    waitForBoot(childNormal),
    waitForBoot(childEnvViewOnly),
  ]);
});

after(() => {
  if (childViewOnly) childViewOnly.kill('SIGTERM');
  if (childNormal) childNormal.kill('SIGTERM');
  if (childEnvViewOnly) childEnvViewOnly.kill('SIGTERM');
});

test('POST /api/run with dashboard.view_only: true in config.yaml → 403', async () => {
  const r = await request(portViewOnly, {
    method: 'POST', path: '/api/run',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
  }, JSON.stringify({ storyId: 'good-1', cmd: '/rcode-init' }));
  assert.strictEqual(r.status, 403);
  const parsed = JSON.parse(r.body);
  assert.match(parsed.error, /view.only/i);
});

test('POST /api/run with VIEW_ONLY=1 env var → 403', async () => {
  const r = await request(portEnvViewOnly, {
    method: 'POST', path: '/api/run',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
  }, JSON.stringify({ storyId: 'good-1', cmd: '/rcode-init' }));
  assert.strictEqual(r.status, 403);
});

test('POST /api/run with dashboard.view_only: false → not 403 (normal operation preserved)', async () => {
  const r = await request(portNormal, {
    method: 'POST', path: '/api/run',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
  }, JSON.stringify({ storyId: 'good-1', cmd: '/rcode-init' }));
  assert.notStrictEqual(r.status, 403);
});
