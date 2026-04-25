/**
 * rihal-code context — inspect and refresh the .rihal/ memory bank freshness.
 *
 * The memory bank (.rihal/context/active.md + project-brief.md) is what
 * every Rihal workflow reads at runtime. If it goes stale, agents silently
 * work from outdated assumptions. This command makes staleness visible.
 *
 * Usage:
 *   rihal-code context                   show staleness report (default)
 *   rihal-code context --check           exit non-zero if stale (for CI/hooks)
 *   rihal-code context --refresh         write fresh fingerprint after a manual scan
 *   rihal-code context --install-hook    opt-in post-commit git hook that
 *                                         prints a warning when stale
 *
 * The refresh does NOT rewrite active.md or project-brief.md — that's
 * /rihal:init's job (the scan requires an LLM). --refresh just stores the
 * current fingerprint so the next check sees things as fresh.
 */

const fs = require('fs');
const path = require('path');
const {
  computeFingerprint,
  writeFingerprint,
  checkStaleness,
  commitsBetween,
  STALE_THRESHOLDS,
} = require('./lib/memory-bank.cjs');

function parseArgs(args) {
  const opts = { check: false, refresh: false, installHook: false };
  for (const arg of args) {
    if (arg === '--check') opts.check = true;
    else if (arg === '--refresh') opts.refresh = true;
    else if (arg === '--install-hook') opts.installHook = true;
    else {
      console.error(`Unknown flag: ${arg}`);
      console.error(`Usage: rcode context [--check|--refresh|--install-hook]`);
      process.exit(1);
    }
  }
  return opts;
}

function ensureRihalDir(cwd) {
  if (!fs.existsSync(path.join(cwd, '.rihal'))) {
    console.error(`❌ No .rihal/ directory found in ${cwd}`);
    console.error(`   Run 'rcode install' first.`);
    process.exit(1);
  }
}

/**
 * Print the full staleness report to stdout. Always exits 0 — use --check
 * for exit code semantics.
 */
function printReport(cwd) {
  const report = checkStaleness(cwd);

  const symbol =
    report.status === 'fresh'
      ? '✓'
      : report.status === 'stale'
      ? '⚠'
      : '✗';
  const statusLabel = report.status.toUpperCase();

  console.log(`\n🧠 Memory bank status: ${symbol} ${statusLabel}\n`);

  if (report.reasons.length > 0) {
    console.log(`   Reasons:`);
    for (const reason of report.reasons) {
      console.log(`     • ${reason}`);
    }
    console.log();
  }

  console.log(`   Context files:`);
  const activeMark = report.context_files.active ? '✓' : '✗';
  const briefMark = report.context_files.brief ? '✓' : '✗';
  console.log(`     ${activeMark} .rihal/context/active.md`);
  console.log(`     ${briefMark} .rihal/context/project-brief.md`);
  console.log();

  if (report.stored) {
    console.log(`   Last init:  ${report.stored.timestamp || 'unknown'}`);
    if (report.stored.git_head) {
      const shortHead = report.stored.git_head.slice(0, 7);
      const branch = report.stored.git_branch || 'detached';
      console.log(`               ${shortHead} on ${branch}`);
    }
    if (report.stored.manifest_name) {
      console.log(`               ${report.stored.manifest_name} (${report.stored.manifest_hash})`);
    }
  } else {
    console.log(`   Last init:  (never)`);
  }

  console.log(`   Current:    ${report.current.timestamp}`);
  if (report.current.git_head) {
    const shortHead = report.current.git_head.slice(0, 7);
    const branch = report.current.git_branch || 'detached';
    console.log(`               ${shortHead} on ${branch}`);
  }
  if (report.current.manifest_name) {
    console.log(`               ${report.current.manifest_name} (${report.current.manifest_hash})`);
  }

  // Commits since last init (informational)
  if (report.stored?.git_head && report.current.git_head) {
    const n = commitsBetween(cwd, report.stored.git_head, report.current.git_head);
    if (n !== null) {
      console.log(`\n   Commits since init: ${n} (threshold: ${STALE_THRESHOLDS.commitsSinceInit})`);
    }
  }

  console.log();

  if (report.status !== 'fresh') {
    console.log(`   ➡ Refresh with: /rihal:init (in your editor)`);
    console.log();
  }
}

/**
 * --refresh: recompute and save the fingerprint to .rihal/state.json.
 * Only use this when you know the memory bank was actually refreshed
 * (e.g. by /rihal:init running end-to-end). Does NOT rewrite context files.
 */
function doRefresh(cwd) {
  ensureRihalDir(cwd);
  const fp = writeFingerprint(cwd);
  console.log(`\n✅ Fingerprint saved to .rihal/state.json`);
  console.log(`   git:       ${fp.git_head ? fp.git_head.slice(0, 7) : '(no git)'}`);
  console.log(`   manifest:  ${fp.manifest_name || '(none)'}`);
  console.log(`   structure: ${fp.structure_dirs.length} top-level dirs`);
  console.log();
}

/**
 * --install-hook: write .git/hooks/post-commit that prints a staleness
 * warning after each commit. Opt-in, does not auto-refresh.
 */
function installHook(cwd) {
  const gitDir = path.join(cwd, '.git');
  if (!fs.existsSync(gitDir)) {
    console.error(`❌ Not a git repository (no .git/ found).`);
    console.error(`   The post-commit hook requires git.`);
    process.exit(1);
  }

  const hooksDir = path.join(gitDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, 'post-commit');

  const hookContent = `#!/bin/sh
# Rihal Code — memory bank freshness check
# Installed by: rcode context --install-hook
# Non-blocking: prints a one-line warning if the memory bank is stale.
if command -v rcode >/dev/null 2>&1; then
  output=$(rcode context --check 2>&1)
  if [ $? -ne 0 ]; then
    echo ""
    echo "⚠ Rihal memory bank is stale — run /rihal:init in your editor to refresh."
    echo "   $(echo "$output" | grep '•' | head -1 | sed 's/^ *//')"
  fi
fi
`;

  // Don't clobber an existing hook without asking
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('Rihal Code — memory bank freshness')) {
      console.log(`✓ post-commit hook already installed at ${hookPath}`);
      return;
    }
    console.error(`❌ A post-commit hook already exists at ${hookPath}`);
    console.error(`   Refusing to overwrite. Merge manually or remove the existing hook first.`);
    process.exit(1);
  }

  fs.writeFileSync(hookPath, hookContent);
  fs.chmodSync(hookPath, 0o755);
  console.log(`✅ Installed post-commit hook at ${hookPath}`);
  console.log(`   After each commit, you'll see a warning if the memory bank goes stale.`);
  console.log(`   To remove: rm ${hookPath}`);
}

module.exports = function context(args) {
  const cwd = process.cwd();
  const opts = parseArgs(args);

  if (opts.installHook) {
    installHook(cwd);
    return;
  }

  if (opts.refresh) {
    doRefresh(cwd);
    return;
  }

  // Default / --check: need .rihal/ to exist
  ensureRihalDir(cwd);
  printReport(cwd);

  if (opts.check) {
    const report = checkStaleness(cwd);
    if (report.status !== 'fresh') {
      process.exit(1);
    }
  }
};
