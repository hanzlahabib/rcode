/**
 * Dashboard end-to-end content tests.
 *
 * Boots the dashboard once and asserts that every API endpoint returns
 * meaningful, non-empty content for the actual rcode repo (which has
 * a populated `.rcode/memory/`, `.rcode/state.json`, and `.planning/`).
 *
 * This is the regression gate for Phase 10. It catches "endpoint returns
 * 200 but the body is empty" — which is invisible to the boot smoke test
 * in dashboard-boot.test.cjs.
 *
 * Run: node --test test/dashboard-e2e.test.cjs
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_PATH = path.join(PROJECT_ROOT, 'server', 'dashboard.js');
const PORT = 9100 + Math.floor(Math.random() * 800);

let proc;

function get(targetPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: targetPath, timeout: 5000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

function waitForReady(p) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('not ready')), 5000);
    p.stdout.on('data', (b) => {
      if (b.toString().includes('rcode Dashboard')) {
        clearTimeout(t);
        setTimeout(resolve, 100);
      }
    });
    p.on('exit', (code) => { clearTimeout(t); reject(new Error('exited ' + code)); });
  });
}

before(async () => {
  proc = spawn('node', [DASHBOARD_PATH], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForReady(proc);
});

after(() => {
  if (proc && !proc.killed) proc.kill('SIGTERM');
});

test('/api/state returns the rcode project metadata', async () => {
  const res = await get('/api/state');
  assert.equal(res.status, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.exists, true, 'state.exists should be true (we have .rcode/)');
  assert.equal(data.projectName, 'rcode');
  assert.ok(Array.isArray(data.phases) && data.phases.length > 0, 'should have phases');
  assert.ok(data.raw && data.raw.milestone, 'raw.milestone should be set');
});

test('/api/memory returns populated state with sections', async () => {
  const res = await get('/api/memory');
  assert.equal(res.status, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.exists, true, 'Memory Bank should exist after dogfooding');
  assert.equal(data.initialised, true);
  assert.ok(data.sections, 'should have sections object');
  assert.ok(data.sections.project, 'should have project section');
  // After populating from real content, populated:true is expected
  const projectStack = data.sections.project.find((f) => f.name === 'stack.md');
  assert.ok(projectStack, 'stack.md should be present');
  assert.equal(projectStack.exists, true);
  assert.equal(projectStack.populated, true, 'stack.md should be populated (no template placeholders)');
});

test('/api/files returns at least the rcode planning artefacts', async () => {
  const res = await get('/api/files');
  assert.equal(res.status, 200);
  const groups = JSON.parse(res.body);
  assert.ok(Array.isArray(groups), 'response is a list of groups');
  // We should find at least one group with files (rcode has .planning/)
  const total = groups.reduce((n, g) => n + (g.files ? g.files.length : 0), 0);
  assert.ok(total > 0, `expected at least one .planning/ file, got ${total}`);
});

test('/api/hierarchy returns the milestone tree', async () => {
  const res = await get('/api/hierarchy');
  assert.equal(res.status, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.milestone, 'milestone should be set');
  assert.ok(Array.isArray(data.phases), 'phases should be a list');
});

test('GET / returns the dashboard HTML with all nav entries', async () => {
  const res = await get('/');
  assert.equal(res.status, 200);
  assert.ok(res.body.length > 50000, `expected substantial HTML, got ${res.body.length} bytes`);
  // Every nav entry must be present
  for (const view of ['overview', 'roadmap', 'milestones', 'phases', 'sprints', 'tasks', 'files', 'agents', 'decisions', 'memory']) {
    assert.ok(res.body.includes(`data-view="${view}"`), `nav should include data-view="${view}"`);
  }
});

test('GET / renders Memory Bank view container', async () => {
  const res = await get('/');
  assert.ok(res.body.includes('id="view-memory"'), 'should have view-memory container');
  assert.ok(res.body.includes('🧠 Memory Bank'), 'should have Memory Bank label');
});

test('/api/file refuses paths outside the project root', async () => {
  const res = await get('/api/file?path=' + encodeURIComponent('../../../etc/passwd'));
  assert.notEqual(res.status, 200, 'directory traversal must be blocked');
});

test('/api/file refuses non-markdown files', async () => {
  const res = await get('/api/file?path=' + encodeURIComponent('package.json'));
  assert.equal(res.status, 403, 'non-markdown files must be 403');
});

test('/api/file serves a real markdown file', async () => {
  const res = await get('/api/file?path=' + encodeURIComponent('README.md'));
  assert.equal(res.status, 200);
  assert.ok(res.body.includes('rcode'), 'README content should mention rcode');
});
