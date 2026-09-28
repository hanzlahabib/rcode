/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-action-queue.cjs.
 *
 * Covers table parse/render round-tripping, required-field validation,
 * priority/effort/status enum validation, dedupe by normalized
 * (project, url, issue), and the CLI add/list flow against a temp file
 * (never touches a real project's .rcode/seo/actions/ACTIONS.md).
 *
 * Run: node --test test/seo-action-queue.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-action-queue.cjs');
const { parseActionsTable, renderActionsTable, normalizeDedupeKey, addActionRow, ensureActionsFile } = require(SCRIPT);

const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'rcode', 'templates', 'seo', 'ACTIONS.md');

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const SAMPLE_FIELDS = {
  project: 'acme-crm',
  url: '/speed-to-lead-calculator/',
  issue: 'missing benchmark section',
  evidence: '1,900 impressions, position 10.7, CTR 0.8%',
  action: 'add missing benchmark section and link from two related pages',
  priority: 'HIGH',
  effort: 'MEDIUM',
  expectedEffect: 'CTR improvement toward position-appropriate baseline',
};

test('renderActionsTable then parseActionsTable round-trips a row', () => {
  const row = { ...SAMPLE_FIELDS, status: 'OPEN', created: '2026-09-01', lastReviewed: '2026-09-01' };
  const text = `# SEO Action Queue\n\n${renderActionsTable([row])}`;
  const parsed = parseActionsTable(text);
  assert.strictEqual(parsed.length, 1);
  assert.deepStrictEqual(parsed[0], row);
});

test('an empty table parses to zero rows', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  assert.deepStrictEqual(parseActionsTable(text), []);
});

test('a pipe character in a cell round-trips via escaping', () => {
  const row = { ...SAMPLE_FIELDS, issue: 'CTR gap | title mismatch', status: 'OPEN', created: '2026-09-01', lastReviewed: '2026-09-01' };
  const text = `# SEO Action Queue\n\n${renderActionsTable([row])}`;
  const parsed = parseActionsTable(text);
  assert.strictEqual(parsed[0].issue, 'CTR gap | title mismatch');
});

test('normalizeDedupeKey is case- and whitespace-insensitive', () => {
  const a = normalizeDedupeKey('Acme CRM', '/pricing/', '  Missing   Section ');
  const b = normalizeDedupeKey('acme crm', '/pricing/', 'missing section');
  assert.strictEqual(a, b);
});

test('addActionRow appends a new row with defaulted status/created/lastReviewed', () => {
  const result = addActionRow([], SAMPLE_FIELDS);
  assert.strictEqual(result.added, true);
  assert.strictEqual(result.row.status, 'OPEN');
  assert.match(result.row.created, /^\d{4}-\d{2}-\d{2}$/);
  assert.strictEqual(result.rows.length, 1);
});

test('addActionRow blocks a duplicate for every existing status by default, including DONE/REJECTED', () => {
  for (const status of ['OPEN', 'IN_PROGRESS', 'OBSERVING', 'DONE', 'REJECTED', 'NEEDS_OWNER_INPUT']) {
    const existing = { ...SAMPLE_FIELDS, status, created: '2026-01-01', lastReviewed: '2026-01-01' };
    const result = addActionRow([existing], SAMPLE_FIELDS);
    assert.strictEqual(result.added, false, `expected duplicate block for status ${status}`);
    assert.strictEqual(result.reason, 'duplicate');
    assert.strictEqual(result.priorStatus, status);
    assert.strictEqual(result.row, existing);
  }
});

test('addActionRow throws when --reopen is set without a reopenReason', () => {
  const existing = { ...SAMPLE_FIELDS, status: 'REJECTED', created: '2026-01-01', lastReviewed: '2026-01-01' };
  assert.throws(
    () => addActionRow([existing], { ...SAMPLE_FIELDS, reopen: true }),
    /--reopen requires --reopenReason/
  );
});

test('addActionRow allows re-adding a DONE/REJECTED duplicate when --reopen carries a reason', () => {
  for (const status of ['DONE', 'REJECTED']) {
    const existing = { ...SAMPLE_FIELDS, status, created: '2026-01-01', lastReviewed: '2026-01-01' };
    const result = addActionRow([existing], { ...SAMPLE_FIELDS, reopen: true, reopenReason: 'query volume changed significantly since the rejection' });
    assert.strictEqual(result.added, true, `expected reopen to succeed for status ${status}`);
    assert.strictEqual(result.reason, 'reopened');
    assert.strictEqual(result.priorStatus, status);
    assert.strictEqual(result.reopenReason, 'query volume changed significantly since the rejection');
    assert.strictEqual(result.rows.length, 2, 'reopen appends a new row rather than mutating the old one');
  }
});

test('addActionRow throws on a missing required field', () => {
  const { evidence, ...rest } = SAMPLE_FIELDS;
  assert.throws(() => addActionRow([], rest), /Missing required field\(s\): evidence/);
});

test('addActionRow throws on an invalid priority', () => {
  assert.throws(() => addActionRow([], { ...SAMPLE_FIELDS, priority: 'URGENT' }), /priority must be one of/);
});

test('addActionRow throws on an invalid effort', () => {
  assert.throws(() => addActionRow([], { ...SAMPLE_FIELDS, effort: 'HUGE' }), /effort must be one of/);
});

test('addActionRow throws on an invalid status', () => {
  assert.throws(() => addActionRow([], { ...SAMPLE_FIELDS, status: 'MAYBE' }), /status must be one of/);
});

test('ensureActionsFile creates the file from the template on first use and never overwrites it after', () => {
  const dir = makeTempDir('seo-actions-ensure-');
  const filePath = path.join(dir, 'ACTIONS.md');
  const first = ensureActionsFile(filePath);
  assert.ok(fs.existsSync(filePath));
  assert.strictEqual(first, fs.readFileSync(TEMPLATE_PATH, 'utf8'));

  fs.writeFileSync(filePath, `${first}| edited | row | here | ev | act | HIGH | LOW | eff | OPEN | 2026-01-01 | 2026-01-01 |\n`);
  const second = ensureActionsFile(filePath);
  assert.ok(second.includes('edited'), 'second call must not clobber the edited file');
});

test('CLI: add creates the file, appends a row, and a second identical add is blocked as a duplicate', () => {
  const dir = makeTempDir('seo-actions-cli-');
  const filePath = path.join(dir, 'ACTIONS.md');
  const args = [
    'add',
    `--file=${filePath}`,
    `--project=${SAMPLE_FIELDS.project}`,
    `--url=${SAMPLE_FIELDS.url}`,
    `--issue=${SAMPLE_FIELDS.issue}`,
    `--evidence=${SAMPLE_FIELDS.evidence}`,
    `--action=${SAMPLE_FIELDS.action}`,
    `--priority=${SAMPLE_FIELDS.priority}`,
    `--effort=${SAMPLE_FIELDS.effort}`,
    `--expectedEffect=${SAMPLE_FIELDS.expectedEffect}`,
  ];

  const first = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  assert.strictEqual(first.status, 0, first.stderr);
  const firstJson = JSON.parse(first.stdout);
  assert.strictEqual(firstJson.added, true);
  assert.ok(fs.existsSync(filePath));

  const second = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  assert.strictEqual(second.status, 0, second.stderr);
  const secondJson = JSON.parse(second.stdout);
  assert.strictEqual(secondJson.added, false);
  assert.strictEqual(secondJson.reason, 'duplicate');
  assert.strictEqual(secondJson.priorStatus, 'OPEN');

  const third = spawnSync(
    process.execPath,
    [SCRIPT, ...args, '--reopen', '--reopenReason=re-checking after a site redesign'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(third.status, 0, third.stderr);
  const thirdJson = JSON.parse(third.stdout);
  assert.strictEqual(thirdJson.added, true);
  assert.strictEqual(thirdJson.reason, 'reopened');
  assert.strictEqual(thirdJson.priorStatus, 'OPEN');
});

test('CLI: --reopen without --reopenReason exits non-zero with a clear message', () => {
  const dir = makeTempDir('seo-actions-reopen-');
  const filePath = path.join(dir, 'ACTIONS.md');
  const args = [
    'add',
    `--file=${filePath}`,
    `--project=${SAMPLE_FIELDS.project}`,
    `--url=${SAMPLE_FIELDS.url}`,
    `--issue=${SAMPLE_FIELDS.issue}`,
    `--evidence=${SAMPLE_FIELDS.evidence}`,
    `--action=${SAMPLE_FIELDS.action}`,
    `--priority=${SAMPLE_FIELDS.priority}`,
    `--effort=${SAMPLE_FIELDS.effort}`,
    `--expectedEffect=${SAMPLE_FIELDS.expectedEffect}`,
  ];
  spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  const result = spawnSync(process.execPath, [SCRIPT, ...args, '--reopen'], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /--reopen requires --reopenReason/);
});

test('CLI: list filters by status and priority', () => {
  const dir = makeTempDir('seo-actions-list-');
  const filePath = path.join(dir, 'ACTIONS.md');

  spawnSync(
    process.execPath,
    [
      SCRIPT,
      'add',
      `--file=${filePath}`,
      '--project=p1',
      '--url=/a',
      '--issue=issue-a',
      '--evidence=ev',
      '--action=act',
      '--priority=HIGH',
      '--effort=LOW',
      '--expectedEffect=eff',
    ],
    { encoding: 'utf8' }
  );
  spawnSync(
    process.execPath,
    [
      SCRIPT,
      'add',
      `--file=${filePath}`,
      '--project=p1',
      '--url=/b',
      '--issue=issue-b',
      '--evidence=ev',
      '--action=act',
      '--priority=LOW',
      '--effort=LOW',
      '--expectedEffect=eff',
      '--status=DONE',
    ],
    { encoding: 'utf8' }
  );

  const listAll = spawnSync(process.execPath, [SCRIPT, 'list', `--file=${filePath}`], { encoding: 'utf8' });
  assert.strictEqual(JSON.parse(listAll.stdout).rows.length, 2);

  const listHigh = spawnSync(process.execPath, [SCRIPT, 'list', `--file=${filePath}`, '--priority=HIGH'], { encoding: 'utf8' });
  assert.strictEqual(JSON.parse(listHigh.stdout).rows.length, 1);
  assert.strictEqual(JSON.parse(listHigh.stdout).rows[0].url, '/a');

  const listDone = spawnSync(process.execPath, [SCRIPT, 'list', `--file=${filePath}`, '--status=DONE'], { encoding: 'utf8' });
  assert.strictEqual(JSON.parse(listDone.stdout).rows.length, 1);
  assert.strictEqual(JSON.parse(listDone.stdout).rows[0].url, '/b');
});

test('CLI: list on a brand-new file returns zero rows without erroring', () => {
  const dir = makeTempDir('seo-actions-list-empty-');
  const filePath = path.join(dir, 'ACTIONS.md');
  const result = spawnSync(process.execPath, [SCRIPT, 'list', `--file=${filePath}`], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(JSON.parse(result.stdout).rows, []);
});

test('CLI: exits non-zero with a clear message for an unknown command', () => {
  const result = spawnSync(process.execPath, [SCRIPT, 'delete'], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});
