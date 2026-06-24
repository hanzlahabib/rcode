#!/usr/bin/env node
'use strict';

/**
 * Agent-behavior regression harness — skill fingerprint snapshot + diff.
 *
 * Walks rcode/skills/agents and rcode/skills/actions (recursively), extracts
 * structural fingerprints from each SKILL.md, and diffs against a stored
 * snapshot to catch regressions.
 *
 * Usage:
 *   node test/skill-snapshot.test.cjs           # run checks (CI mode)
 *   node test/skill-snapshot.test.cjs --update  # regenerate snapshot
 *
 * Run: node --test test/skill-snapshot.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const UPDATE = process.argv.includes('--update');
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(__dirname, 'snapshots', 'skill-fingerprints.json');

/**
 * Recursively finds all SKILL.md files under a directory.
 * Supports arbitrary nesting depth (agents/ is one level, actions/ is two).
 */
function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(dir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      results.push(skillFile);
    } else {
      // One more level down (e.g. actions/1-analysis/<skill>/SKILL.md)
      results.push(...findSkillFiles(path.join(dir, entry.name)));
    }
  }
  return results;
}

/**
 * Extracts a structural fingerprint from a SKILL.md file.
 */
function fingerprint(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');

  // Count trigger phrases in YAML front-matter block (between first --- and second ---)
  const yamlMatch = text.match(/^---\n([\s\S]*?)\n---/);
  const yaml = yamlMatch ? yamlMatch[1] : '';
  const triggerLines = yaml.split('\n').filter(l => /^\s+-\s+\S/.test(l));

  return {
    triggerCount: triggerLines.length,
    hasOutputFormat: /^## Output Format/m.test(text),
    hasExamples: /^## Examples/m.test(text),
    hasOverview: /^## Overview/m.test(text),
    hasNegativeBoundary: /not-for:|negative[- ]boundar/i.test(text),
    lineCount: lines.length,
  };
}

function collectFingerprints() {
  const agentsDir = path.join(ROOT, 'rcode', 'skills', 'agents');
  const actionsDir = path.join(ROOT, 'rcode', 'skills', 'actions');

  const skillFiles = [
    ...findSkillFiles(agentsDir),
    ...findSkillFiles(actionsDir),
  ];

  if (skillFiles.length === 0) {
    throw new Error('No SKILL.md files found. Check directory paths.');
  }

  const current = {};
  for (const f of skillFiles) {
    const key = path.relative(ROOT, f);
    current[key] = fingerprint(f);
  }
  return { current, count: skillFiles.length };
}

// --update mode: regenerate snapshot and exit (not wrapped in node:test)
if (UPDATE) {
  const { current, count } = collectFingerprints();
  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(current, null, 2) + '\n');
  console.log(`Snapshot updated: ${count} skills written to ${SNAPSHOT_PATH}`);
  process.exit(0);
}

// Normal CI mode: wrapped in node:test
test('skill snapshot exists', () => {
  assert.ok(
    fs.existsSync(SNAPSHOT_PATH),
    `Snapshot not found at ${SNAPSHOT_PATH}. Run with --update to generate it.`,
  );
});

test('all skills pass regression checks', () => {
  const { current, count } = collectFingerprints();
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const failures = [];

  for (const [key, fp] of Object.entries(current)) {
    const prev = snapshot[key];

    // Regression checks (compare against snapshot)
    if (prev) {
      if (prev.hasOutputFormat && !fp.hasOutputFormat) {
        failures.push(`${key}: lost ## Output Format section`);
      }
      if (prev.hasExamples && !fp.hasExamples) {
        failures.push(`${key}: lost ## Examples section`);
      }
      if (prev.hasOverview && !fp.hasOverview) {
        failures.push(`${key}: lost ## Overview section`);
      }
    }

    // Absolute threshold checks (always enforced)
    if (fp.triggerCount < 5) {
      failures.push(`${key}: trigger count ${fp.triggerCount} is below minimum 5`);
    }
    if (fp.lineCount > 600) {
      failures.push(`${key}: line count ${fp.lineCount} exceeds 600-line limit`);
    }
  }

  if (failures.length > 0) {
    const msg = [
      `\nSkill regression failures (${failures.length}):`,
      ...failures.map(f => `  FAIL: ${f}`),
      '\nRun with --update to accept intentional changes.',
    ].join('\n');
    assert.fail(msg);
  }

  console.log(`All ${count} skills passed regression checks.`);
});
