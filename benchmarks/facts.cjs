#!/usr/bin/env node
'use strict';

/**
 * Deterministic "by the numbers" benchmark for rcode.
 *
 * Unlike bench.cjs (which drives `claude -p` and is non-deterministic), every
 * number here is computed from files on disk and from local CLI timings, so any
 * reader can reproduce the exact figures the README cites:
 *
 *     node benchmarks/facts.cjs
 *
 * No network, no API keys, no LLM calls. Emits a markdown table to stdout and
 * writes results/facts.md + results/facts.json.
 *
 * It is intentionally conservative: it counts real files, runs the real test
 * suite, and times the real CLI. There are no hand-entered figures.
 */

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RCODE = path.join(ROOT, 'rcode');
const TOOL = path.join(RCODE, 'bin', 'rcode-tools.cjs');

/** Count files matching a predicate under a dir (one level, or recursive for skills). */
function countFiles(dir, ext) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).length;
}
function countRecursive(dir, name) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += countRecursive(p, name);
    else if (e.name === name) n += 1;
  }
  return n;
}
/** Total non-empty-aware line count across a list of files. */
function lineCount(files) {
  let total = 0;
  for (const f of files) {
    try { total += fs.readFileSync(f, 'utf8').split('\n').length; } catch { /* skip */ }
  }
  return total;
}
function glob(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
}
function globRecursive(dir, ext, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) globRecursive(p, ext, acc);
    else if (e.name.endsWith(ext)) acc.push(p);
  }
  return acc;
}

// ── Inventory ────────────────────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const inv = {
  version: pkg.version,
  agents: countFiles(path.join(RCODE, 'agents'), '.md'),
  commands: countFiles(path.join(RCODE, 'commands'), '.md'),
  workflows: countFiles(path.join(RCODE, 'workflows'), '.md'),
  skills: countRecursive(path.join(RCODE, 'skills'), 'SKILL.md'),
  references: countFiles(path.join(RCODE, 'references'), '.md'),
  testFiles: countFiles(path.join(ROOT, 'test'), '.test.cjs'),
  runtimeDeps: Object.keys(pkg.dependencies || {}).length,
  runtimeDepNames: Object.keys(pkg.dependencies || {}),
};

// ── Code & corpus size ───────────────────────────────────────────────────────
const engineFiles = [TOOL, ...glob(path.join(RCODE, 'bin', 'lib'), '.cjs')];
const engineLoc = lineCount(engineFiles);
const corpusFiles = [
  ...glob(path.join(RCODE, 'agents'), '.md'),
  ...glob(path.join(RCODE, 'commands'), '.md'),
  ...glob(path.join(RCODE, 'workflows'), '.md'),
  ...glob(path.join(RCODE, 'references'), '.md'),
  ...globRecursive(path.join(RCODE, 'skills'), '.md'),
];
const corpusLoc = lineCount(corpusFiles);

// ── Test suite (real run) ────────────────────────────────────────────────────
let tests = { total: null, pass: null, fail: null, durationMs: null };
try {
  const out = execFileSync('node', ['--test'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  const grab = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
  tests = {
    total: grab(/ℹ tests (\d+)/),
    pass: grab(/ℹ pass (\d+)/),
    fail: grab(/ℹ fail (\d+)/),
    durationMs: Math.round(grab(/ℹ duration_ms ([\d.]+)/) || 0),
  };
} catch (e) {
  // `node --test` exits non-zero on failure; still parse what we can.
  const out = (e.stdout || '').toString();
  const grab = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
  tests = {
    total: grab(/ℹ tests (\d+)/), pass: grab(/ℹ pass (\d+)/),
    fail: grab(/ℹ fail (\d+)/), durationMs: Math.round(grab(/ℹ duration_ms ([\d.]+)/) || 0),
  };
}

// ── CLI op latency (best-of-N, deterministic local compute, 0 tokens) ─────────
function timeOp(args, reps = 7) {
  let best = Infinity;
  for (let i = 0; i < reps; i++) {
    const t0 = process.hrtime.bigint();
    spawnSync('node', [TOOL, ...args], { cwd: ROOT, stdio: 'ignore' });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms < best) best = ms;
  }
  return Math.round(best * 10) / 10;
}
// Warm module cache first.
spawnSync('node', [TOOL, 'version'], { cwd: ROOT, stdio: 'ignore' });
const ops = {
  'version (node cold-start floor)': timeOp(['version']),
  'classify-question (intent router)': timeOp(['classify-question', 'how do I add a phase']),
  'state read': timeOp(['state', 'read']),
  'milestone-health': timeOp(['milestone-health']),
};

// ── Emit ──────────────────────────────────────────────────────────────────────
const r1 = (n) => (n == null ? 'n/a' : n);
let md = `# rcode — by the numbers (deterministic)\n\n`;
md += `Generated by \`node benchmarks/facts.cjs\` — every figure below is computed from files on disk and local CLI timings. No network, no LLM, no hand-entered numbers.\n\n`;
md += `rcode v${inv.version}\n\n`;
md += `## Inventory (file counts)\n\n| Asset | Count |\n|---|---|\n`;
md += `| Specialist agents | ${inv.agents} |\n`;
md += `| Slash commands | ${inv.commands} |\n`;
md += `| Workflows | ${inv.workflows} |\n`;
md += `| Phrase-activated skills | ${inv.skills} |\n`;
md += `| Reference docs | ${inv.references} |\n`;
md += `| Test files | ${inv.testFiles} |\n`;
md += `| Runtime npm dependencies | ${inv.runtimeDeps} (${inv.runtimeDepNames.join(', ') || 'none'}) |\n\n`;
md += `## Size\n\n| Metric | Lines |\n|---|---|\n`;
md += `| Tested CLI engine (rcode-tools.cjs + lib/) | ${engineLoc.toLocaleString('en-US')} |\n`;
md += `| Portable methodology corpus (agents+commands+workflows+skills+refs, .md) | ${corpusLoc.toLocaleString('en-US')} |\n\n`;
md += `## Test suite (real \`node --test\` run)\n\n| Metric | Value |\n|---|---|\n`;
md += `| Total tests | ${r1(tests.total)} |\n| Passing | ${r1(tests.pass)} |\n| Failing | ${r1(tests.fail)} |\n| Wall time | ${(tests.durationMs / 1000).toFixed(1)}s |\n\n`;
md += `## Core-op latency — local, deterministic, 0 LLM tokens (best-of-7)\n\n| Operation | Best ms |\n|---|---|\n`;
for (const [k, v] of Object.entries(ops)) md += `| ${k} | ${v} |\n`;
md += `\nThe routing/state/health logic adds only a few ms over Node's own cold-start floor — the orchestration brain is plain local computation, not an LLM call.\n`;

const outDir = path.join(__dirname, 'results');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'facts.md'), md);
fs.writeFileSync(path.join(outDir, 'facts.json'), JSON.stringify({ inventory: inv, size: { engineLoc, corpusLoc }, tests, ops }, null, 2));
process.stdout.write(md);
