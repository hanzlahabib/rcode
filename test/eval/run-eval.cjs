#!/usr/bin/env node
/**
 * run-eval.cjs — agent-behavior regression harness entrypoint (issue #746).
 *
 *   node test/eval/run-eval.cjs           Diff each tracked artifact's current
 *                                         structured contract against its
 *                                         committed baseline. Exit 1 on any
 *                                         drift (drift = human review).
 *   node test/eval/run-eval.cjs --bless   (Re)write every baseline from the
 *                                         current normalized output. Exit 0.
 *
 * This harness does NOT call a live model. It is a deterministic snapshot/diff
 * over the declared decision surface (triggers, tools, routing keywords,
 * negative boundaries) extracted from each tracked SKILL.md / agent .md.
 * Node stdlib only.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalize } = require('./normalize.cjs');

const EVAL_DIR = __dirname;
const BASELINE_DIR = path.join(EVAL_DIR, 'baselines');
const PROMPTS_PATH = path.join(EVAL_DIR, 'prompts.json');

/** Stable slug for an artifact path → baseline filename. */
function slug(artifactPath) {
  return artifactPath
    .split(/[\\/]/)
    .join('__')
    .replace(/\.md$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Canonical JSON string (sorted keys, trailing newline) for stable diffs. */
function stableJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort(), 2) + '\n';
}

/** Minimal unified-style line diff between two multi-line strings. */
function unifiedDiff(label, expected, actual) {
  const exp = expected.split('\n');
  const act = actual.split('\n');
  const max = Math.max(exp.length, act.length);
  const lines = [`--- baseline/${label}`, `+++ current/${label}`];
  for (let i = 0; i < max; i++) {
    const e = exp[i];
    const a = act[i];
    if (e === a) continue;
    if (e !== undefined) lines.push(`- ${e}`);
    if (a !== undefined) lines.push(`+ ${a}`);
  }
  return lines.join('\n');
}

function loadPrompts() {
  return JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf8'));
}

function bless() {
  if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const prompts = loadPrompts();
  let count = 0;
  for (const artifact of Object.keys(prompts)) {
    const normalized = normalize(artifact);
    const file = path.join(BASELINE_DIR, `${slug(artifact)}.json`);
    fs.writeFileSync(file, stableJson(normalized));
    count++;
    process.stdout.write(`blessed ${artifact} -> ${path.basename(file)}\n`);
  }
  process.stdout.write(`\nBlessed ${count} baseline(s).\n`);
  return 0;
}

function check() {
  const prompts = loadPrompts();
  let drift = 0;
  for (const artifact of Object.keys(prompts)) {
    const current = stableJson(normalize(artifact));
    const file = path.join(BASELINE_DIR, `${slug(artifact)}.json`);
    if (!fs.existsSync(file)) {
      drift++;
      process.stdout.write(`\nMISSING BASELINE: ${artifact}\n`);
      process.stdout.write(`  expected: ${file}\n`);
      process.stdout.write(`  re-bless with: node test/eval/run-eval.cjs --bless\n`);
      continue;
    }
    const baseline = fs.readFileSync(file, 'utf8');
    if (baseline !== current) {
      drift++;
      process.stdout.write(`\nBEHAVIOR DRIFT: ${artifact}\n`);
      process.stdout.write(unifiedDiff(path.basename(file), baseline, current) + '\n');
    }
  }
  if (drift > 0) {
    process.stdout.write(
      `\n${drift} artifact(s) drifted. Review the diff above.\n` +
        `If the change is intentional, re-bless: node test/eval/run-eval.cjs --bless\n`
    );
    return 1;
  }
  process.stdout.write(
    `agent-behavior baselines unchanged (${Object.keys(prompts).length} artifact(s)).\n`
  );
  return 0;
}

function main() {
  const args = process.argv.slice(2);
  const code = args.includes('--bless') ? bless() : check();
  process.exit(code);
}

if (require.main === module) main();

module.exports = { slug, stableJson, unifiedDiff };
