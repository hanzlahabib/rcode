/**
 * rihal-code preserve — thin CLI over cli/lib/permanent-memory.cjs.
 *
 * Appends a durable learning to .rihal/context/permanent.md under the
 * requested section. Auto-archives oldest entries when the file exceeds
 * the trigger line count.
 *
 * Slash commands shell out to this so they never need to know where
 * the permanent-memory library lives on disk.
 *
 * Usage:
 *   rihal-code preserve <section> '<text>'
 *   rihal-code preserve --section=Conventions --text='Use pnpm not npm'
 *   rihal-code preserve --stats                     (print stats only)
 *
 * Valid sections (case-sensitive, must match pm.SECTIONS):
 *   Conventions, Architecture Decisions, Key File Paths,
 *   Common Workflows, Gotchas, Misc
 *
 * Any other section name creates a new custom section.
 */

const fs = require('fs');
const path = require('path');
const pm = require('./lib/permanent-memory.cjs');
const { loadConfig } = require('./lib/config.cjs');

function parseArgs(args) {
  const opts = { section: null, text: null, stats: false, positional: [] };
  for (const arg of args) {
    if (arg === '--stats') opts.stats = true;
    else if (arg.startsWith('--section=')) opts.section = arg.slice('--section='.length);
    else if (arg.startsWith('--text=')) opts.text = arg.slice('--text='.length);
    else opts.positional.push(arg);
  }
  // Positional fallback: rihal-code preserve <section> <text>
  if (!opts.section && opts.positional[0]) opts.section = opts.positional[0];
  if (!opts.text && opts.positional.length > 1) {
    opts.text = opts.positional.slice(1).join(' ');
  }
  return opts;
}

function ensureRihal(cwd) {
  if (!fs.existsSync(path.join(cwd, '.rihal'))) {
    console.error(`❌ No .rihal/ directory found in ${cwd}`);
    console.error(`   Run 'rihal-code install' first.`);
    process.exit(1);
  }
}

module.exports = function preserve(args) {
  const cwd = process.cwd();
  ensureRihal(cwd);
  const opts = parseArgs(args);

  // Stats mode — just print and exit
  if (opts.stats) {
    const s = pm.stats(cwd);
    console.log();
    console.log(`🧠 Permanent memory — ${cwd}`);
    console.log(`   Location:      .rihal/context/permanent.md`);
    console.log(`   Exists:        ${s.exists}`);
    console.log(`   Total entries: ${s.total_entries}`);
    console.log(`   Lines:         ${s.line_count} / ${s.trigger_at} trigger`);
    console.log(`   Percent full:  ${s.percent_full}%`);
    console.log();
    console.log(`   By section:`);
    for (const [section, count] of Object.entries(s.per_section)) {
      console.log(`     ${section.padEnd(24)} ${count}`);
    }
    if (s.archive.exists) {
      console.log();
      console.log(`   Archive: ${s.archive.lineCount} lines`);
    }
    console.log();
    return;
  }

  if (!opts.section || !opts.text) {
    console.error(`Usage: rihal-code preserve <section> '<text>'`);
    console.error(`Or:    rihal-code preserve --section=Conventions --text='...'`);
    console.error(`Or:    rihal-code preserve --stats`);
    console.error();
    console.error(`Canonical sections: ${pm.SECTIONS.join(', ')}`);
    process.exit(1);
  }

  const config = loadConfig(cwd);
  try {
    const result = pm.addEntry(cwd, opts.section, opts.text, {
      projectName: config.project_name,
    });
    console.log();
    console.log(`🧠 Preserved: ${result.section}`);
    console.log(`   → [${result.entry.date}] ${result.entry.text}`);
    console.log();
    console.log(`   File: ${path.relative(cwd, result.path)}`);
    if (result.archived > 0) {
      console.log(
        `   📦 Auto-archived ${result.archived} oldest entries to .rihal/context/permanent-archive.md`,
      );
    }
    console.log();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
};
