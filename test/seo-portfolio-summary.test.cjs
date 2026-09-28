/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-portfolio-summary.cjs.
 *
 * Builds synthetic sibling "project" directories with their own
 * .rcode/seo/{PROJECT,STATE}.md files (the same shape seo-project-init.cjs
 * produces) and verifies the derived table + underlying parsing helpers.
 *
 * Run: node --test test/seo-portfolio-summary.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-portfolio-summary.cjs');
const { parseKeyValueBlock, firstListItemUnderHeading, readProjectRow, siblingDirsOf, renderMarkdownTable } = require(SCRIPT);

function makeProjectDir(root, name, { projectMd, stateMd }) {
  const dir = path.join(root, name);
  const seoDir = path.join(dir, '.rcode', 'seo');
  fs.mkdirSync(seoDir, { recursive: true });
  if (projectMd !== undefined) fs.writeFileSync(path.join(seoDir, 'PROJECT.md'), projectMd);
  if (stateMd !== undefined) fs.writeFileSync(path.join(seoDir, 'STATE.md'), stateMd);
  return dir;
}

const SAMPLE_PROJECT_MD = `Project: Example Site
Domain: example.com
Project type: LOCAL_LEAD_GEN
Business model: lead generation
`;

const SAMPLE_STATE_MD = `# SEO Project State

Stage: OBSERVING
Priority: HIGH
Last reviewed: 2026-01-01

## Current objective
Grow the installation-cost cluster.

## Next recommended actions
1. inspect queries positions 5-20
2. improve installation-cost cluster
`;

test('parseKeyValueBlock extracts key:value pairs and stops at the first heading', () => {
  const fields = parseKeyValueBlock(SAMPLE_PROJECT_MD);
  assert.strictEqual(fields.project, 'Example Site');
  assert.strictEqual(fields.domain, 'example.com');
  assert.strictEqual(fields.projecttype, 'LOCAL_LEAD_GEN');
});

test('parseKeyValueBlock ignores content after the first ## heading', () => {
  const fields = parseKeyValueBlock(SAMPLE_STATE_MD);
  assert.strictEqual(fields.stage, 'OBSERVING');
  assert.strictEqual(fields.priority, 'HIGH');
  assert.strictEqual(fields.currentobjective, undefined);
});

test('firstListItemUnderHeading extracts the first item under "Next recommended actions"', () => {
  const item = firstListItemUnderHeading(SAMPLE_STATE_MD, /^##\s+Next recommended actions/i);
  assert.strictEqual(item, 'inspect queries positions 5-20');
});

test('firstListItemUnderHeading returns null when the heading is absent', () => {
  const item = firstListItemUnderHeading('# no headings here\njust text', /^##\s+Next recommended actions/i);
  assert.strictEqual(item, null);
});

test('readProjectRow returns null for a directory with no .rcode/seo/STATE.md', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-portfolio-notracked-'));
  const dir = path.join(root, 'not-a-project');
  fs.mkdirSync(dir, { recursive: true });
  assert.strictEqual(readProjectRow(dir), null);
});

test('readProjectRow merges PROJECT.md + STATE.md into one row, defaulting missing fields to "-"', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-portfolio-row-'));
  const dir = makeProjectDir(root, 'site-a', { projectMd: SAMPLE_PROJECT_MD, stateMd: SAMPLE_STATE_MD });

  const row = readProjectRow(dir);
  assert.deepStrictEqual(row, {
    project: 'Example Site',
    domain: 'example.com',
    type: 'LOCAL_LEAD_GEN',
    stage: 'OBSERVING',
    priority: 'HIGH',
    nextAction: 'inspect queries positions 5-20',
  });
});

test('readProjectRow falls back to directory name and "-" when PROJECT.md is absent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-portfolio-nopmd-'));
  const dir = makeProjectDir(root, 'site-no-project-md', { stateMd: 'Stage: IDEA\n' });

  const row = readProjectRow(dir);
  assert.strictEqual(row.project, 'site-no-project-md');
  assert.strictEqual(row.domain, '-');
  assert.strictEqual(row.stage, 'IDEA');
  assert.strictEqual(row.priority, '-');
  assert.strictEqual(row.nextAction, '-');
});

test('siblingDirsOf returns sibling directories but excludes the base dir itself', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-portfolio-siblings-'));
  const a = path.join(root, 'a');
  const b = path.join(root, 'b');
  fs.mkdirSync(a);
  fs.mkdirSync(b);

  const siblings = siblingDirsOf(a).map((d) => path.basename(d)).sort();
  assert.deepStrictEqual(siblings, ['b']);
});

test('renderMarkdownTable renders a header + one row per project, escaping pipes', () => {
  const table = renderMarkdownTable([
    { project: 'Site | A', domain: 'a.com', type: 'TOOL', stage: 'LAUNCHED', priority: 'HIGH', nextAction: 'ship it' },
  ]);
  assert.match(table, /\| project \| domain \| type \| stage \| priority \| next action \|/);
  assert.match(table, /Site \\\| A/);
});

test('renderMarkdownTable renders a placeholder row when no projects are found', () => {
  const table = renderMarkdownTable([]);
  assert.match(table, /no tracked SEO projects found/);
});

test('CLI: scans explicit directories and prints a markdown table, skipping untracked dirs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-portfolio-cli-'));
  const tracked = makeProjectDir(root, 'tracked-site', { projectMd: SAMPLE_PROJECT_MD, stateMd: SAMPLE_STATE_MD });
  const untracked = path.join(root, 'untracked-site');
  fs.mkdirSync(untracked, { recursive: true });

  const result = spawnSync(process.execPath, [SCRIPT, tracked, untracked], { encoding: 'utf8' });

  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Example Site/);
  assert.doesNotMatch(result.stdout, /untracked-site/);
});

test('CLI: exits non-zero with a clear message when an explicit directory does not exist', () => {
  const result = spawnSync(process.execPath, [SCRIPT, path.join(os.tmpdir(), 'definitely-does-not-exist-portfolio')], {
    encoding: 'utf8',
  });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Not a directory/);
});
