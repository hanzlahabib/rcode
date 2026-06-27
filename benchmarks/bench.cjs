#!/usr/bin/env node
'use strict';

/**
 * Fair LOC benchmark for the rcode-lazy simplicity lens.
 *
 * Inspired by ponytail's benchmark, but corrected for the flaws Colin Eberhardt
 * (Scott Logic) identified:
 *   - Includes a FAIR baseline ("one solution, no commentary") alongside the raw
 *     baseline, so we don't credit the skill for output the model only emitted
 *     because it was in chat mode.
 *   - Includes the minimal 7-word rival ("Follow YAGNI, one-liners") so we can
 *     see whether the full skill earns its keep over a one-liner prompt.
 *   - Reports code-only LOC (fair) AND raw-output lines (to show inflation).
 *   - Runs N reps and reports mean + spread, since the model is non-deterministic.
 *
 * Runs every (variant x task x rep) through `claude -p --model <MODEL>` and
 * counts lines. Correctness is NOT auto-graded here — spot-check outputs in
 * results/raw/ before trusting LOC (a 1-line wrong answer is not a win).
 *
 * Usage:  node benchmarks/bench.cjs [reps] [model]
 *   reps  default 2
 *   model default haiku
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const REPS = parseInt(process.argv[2] || '2', 10);
const MODEL = process.argv[3] || 'haiku';
const { tasks, variants } = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));

const RAW_DIR = path.join(ROOT, 'results', 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

/** Count non-empty lines inside fenced ``` code blocks. Falls back to all
 *  non-empty lines when the model returned no fence (rare in code tasks). */
function codeLoc(output) {
  const fences = [...output.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const body = fences.length ? fences.join('\n') : output;
  return body.split('\n').filter((l) => l.trim().length > 0).length;
}

/** All non-empty output lines — captures prose/commentary/multiple options. */
function rawLines(output) {
  return output.split('\n').filter((l) => l.trim().length > 0).length;
}

function runOne(prompt) {
  return execFileSync('claude', ['-p', '--model', MODEL, prompt], {
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

const rows = []; // { variant, task, rep, codeLoc, rawLines }
const total = variants.length * tasks.length * REPS;
let n = 0;

for (const v of variants) {
  for (const t of tasks) {
    for (let rep = 1; rep <= REPS; rep++) {
      n++;
      process.stderr.write(`[${n}/${total}] ${v.id} / ${t.id} #${rep} ... `);
      let out = '';
      try {
        out = runOne(v.prefix + t.prompt);
      } catch (e) {
        out = `ERROR: ${e.message}`;
      }
      fs.writeFileSync(path.join(RAW_DIR, `${v.id}__${t.id}__${rep}.txt`), out);
      const cl = codeLoc(out);
      const rl = rawLines(out);
      rows.push({ variant: v.id, task: t.id, rep, codeLoc: cl, rawLines: rl });
      process.stderr.write(`code=${cl} raw=${rl}\n`);
    }
  }
}

// Aggregate mean code-LOC per variant
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const r1 = (x) => Math.round(x * 10) / 10;

let md = `# rcode-lazy LOC benchmark\n\n`;
md += `Model: \`${MODEL}\` · reps: ${REPS} · tasks: ${tasks.length} · runner: \`claude -p\`\n\n`;
md += `Metric: **code-only LOC** (lines inside code fences, non-empty), lower is better. `;
md += `Correctness NOT auto-graded — spot-check \`results/raw/\` (a wrong one-liner is not a win).\n\n`;

md += `## Mean code-LOC by variant\n\n| Variant | Mean code-LOC | Mean raw-output lines |\n|---|---|---|\n`;
for (const v of variants) {
  const vr = rows.filter((r) => r.variant === v.id);
  md += `| ${v.label} | **${r1(mean(vr.map((r) => r.codeLoc)))}** | ${r1(mean(vr.map((r) => r.rawLines)))} |\n`;
}

md += `\n## Per-task code-LOC (mean of ${REPS} reps)\n\n| Task | ${variants.map((v) => v.id).join(' | ')} |\n`;
md += `|---|${variants.map(() => '---').join('|')}|\n`;
for (const t of tasks) {
  const cells = variants.map((v) => r1(mean(rows.filter((r) => r.variant === v.id && r.task === t.id).map((r) => r.codeLoc))));
  md += `| ${t.id} | ${cells.join(' | ')} |\n`;
}

const outFile = path.join(ROOT, 'results', 'latest.md');
fs.writeFileSync(outFile, md);
fs.writeFileSync(path.join(ROOT, 'results', 'latest.json'), JSON.stringify({ model: MODEL, reps: REPS, rows }, null, 2));
process.stderr.write(`\nWrote ${outFile}\n`);
console.log(md);
