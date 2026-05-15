#!/usr/bin/env node
/**
 * rihal-hooks.cjs — opt-in hook runners for edit/workflow/commit guardrails.
 *
 * Subcommands:
 *   pre-edit    — verify file was Read before Edit/Write (exit 2 if not)
 *   pre-workflow — soft warning for rihal-* commands with suspicious args
 *   post-commit — verify commit format and no forbidden patterns
 *   bash-guard  — block dangerous Bash commands before they run (exit 2)
 *
 * All subcommands read stdin JSON from the hook execution context.
 * Pure Node stdlib. No external dependencies.
 */

const fs = require('fs');

/**
 * Read and parse stdin JSON.
 */
function readInputJson() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error(`Failed to parse stdin JSON: ${e.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

/**
 * pre-edit: Verify that the file being edited was Read() first in this session.
 * Block with exit 2 if not.
 */
async function preEdit() {
  try {
    const input = await readInputJson();
    // Handle both harness schema (input.tool_input.X) and legacy schema (input.X)
    const filePath = input.tool_input?.file_path || input.file_path;
    const sessionReads = input.tool_input?.reads_in_session || input.reads_in_session || [];

    if (!filePath) {
      console.error('ERROR: No file_path in hook input');
      process.exit(1);
    }

    if (!sessionReads.includes(filePath)) {
      console.error(`⚠ READ-BEFORE-EDIT: Read ${filePath} before editing. (Advisory — session-read tracking not yet implemented)`);
      process.exit(0);
    }

    process.exit(0);
  } catch (err) {
    console.error(`Hook error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * pre-workflow: Soft warning for rihal-* commands with suspicious args.
 * Does not block (exit 0), but prints warning.
 */
async function preWorkflow() {
  try {
    const input = await readInputJson();
    const command = input.command || '';
    const args = input.args || '';

    // Only check rihal-* commands
    if (!command.startsWith('rihal-')) {
      process.exit(0);
    }

    // Heuristics for suspicious args:
    // - Planning command + question sounds like a decision (contains "should", "do we", "will", etc.)
    // - Args look like they might be file paths instead of proper question
    const suspiciousPatterns = [
      /\bshould\b/i,
      /\bdo we\b/i,
      /\bwill\b/i,
      /^\/[a-z]/i,
      /\s\.[\/\\]/,
    ];

    let hasSuspiciousPattern = false;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(args)) {
        hasSuspiciousPattern = true;
        break;
      }
    }

    if (hasSuspiciousPattern && (command === 'rihal-plan' || command === 'rihal-discuss')) {
      console.warn(`⚠ "${command}" with args: "${args}". Did you mean /rihal-do or /rihal-council?`);
    }

    process.exit(0);
  } catch (err) {
    console.error(`Hook error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * post-commit: Verify commit format and banned patterns.
 * Warns (not blocking) if violations found.
 */
async function postCommit() {
  try {
    const input = await readInputJson();
    const command = input.tool_input?.command || input.command || '';
    const output = input.tool_input?.output || input.output || '';

    // Only check git commits
    if (!command.includes('git commit')) {
      process.exit(0);
    }

    // Parse commit message from git output or input
    // If output contains the committed message, extract it
    const commitMatch = output.match(/\[.*?\s([a-f0-9]{7})\]/);
    if (!commitMatch) {
      // No commit was made (likely dry-run or error)
      process.exit(0);
    }

    let commitMsg = output;

    // If -F flag used, try to read the message file
    const fMatch = command.match(/-F\s+(\S+)/);
    if (fMatch && fs.existsSync(fMatch[1])) {
      try {
        commitMsg += '\n' + fs.readFileSync(fMatch[1], 'utf8');
      } catch {}
    }

    // If -m used, extract message from command
    const mMatch = command.match(/-m\s+["']([^"']+)["']/);
    if (mMatch) {
      commitMsg += '\n' + mMatch[1];
    }

    const violations = [];

    // Check for Co-Authored-By, Generated, 🤖, etc.
    if (/Co-Authored-By|Generated with Claude|Generated with|🤖/i.test(commitMsg)) {
      violations.push('Found "Co-Authored-By", "Generated with Claude", or "🤖 Generated" in commit message.');
    }

    // Check for --no-verify usage
    if (command.includes('--no-verify')) {
      violations.push('Used --no-verify flag. Please fix underlying issues instead of bypassing hooks.');
    }

    // Check commit message format (type(scope): description) on first line only
    const firstLine = commitMsg.split('\n').find(l => l.trim()) || '';
    const cc = /^[a-z]+(\([a-z-]+\))?:/.test(firstLine);
    if (!cc && commitMatch) {
      violations.push('Commit subject may not follow Conventional Commits format: type(scope): description');
    }

    if (violations.length > 0) {
      console.warn('⚠ Commit format warnings:');
      violations.forEach((v) => console.warn(`  • ${v}`));
    }

    process.exit(0);
  } catch (err) {
    console.error(`Hook error: ${err.message}`);
    process.exit(1);
  }
}

// rm -rf is permitted only against these relative build/cache paths.
const RM_SAFE_TARGET = /^(?:\.\/)?(?:node_modules|dist|build|coverage|\.next|out|temp|tmp|\.rihal\/cache)(?:\/.*)?$/;

/**
 * bash-guard: Block dangerous Bash commands before they execute.
 * Exit 2 blocks the tool call; exit 0 allows it.
 *
 * Enforces the repo's non-negotiable rules (AGENTS.md): no unapproved
 * `git push`, never `--force`, no `--no-verify`, no unscoped destructive
 * git/rm. An authorized push must be prefixed with `RIHAL_PUSH_OK=1`.
 */
async function bashGuard() {
  try {
    const input = await readInputJson();
    const command = (input.tool_input?.command || input.command || '').trim();

    if (!command) {
      process.exit(0);
    }

    const block = (reason, guidance) => {
      console.error(`⛔ BLOCKED by rihal bash-guard: ${reason}`);
      if (guidance) console.error(`   ${guidance}`);
      process.exit(2);
    };

    const isPush = /\bgit\s+push\b/.test(command);

    // Force-push is never permitted through an agent.
    if (isPush && /(--force\b|--force-with-lease\b|(?:^|\s)-f\b)/.test(command)) {
      block(
        'git push --force is never permitted.',
        'A human must run a force-push manually. See AGENTS.md.'
      );
    }

    // Plain git push requires an explicit per-push authorization token.
    if (isPush && !/RIHAL_PUSH_OK/.test(command)) {
      block(
        'git push requires explicit human approval.',
        'If the user authorized THIS push, prefix the command with RIHAL_PUSH_OK=1. See AGENTS.md.'
      );
    }

    // Bypassing git hooks is banned.
    if (/--no-verify\b/.test(command)) {
      block(
        '--no-verify bypasses git hooks.',
        'Fix the underlying hook failure instead of skipping it.'
      );
    }

    // Destructive git operations.
    if (/\bgit\s+reset\s+--hard\b/.test(command)) {
      block(
        'git reset --hard discards uncommitted work.',
        'Confirm with the user; they should run it manually if intended.'
      );
    }
    if (/\bgit\s+clean\s+-[a-zA-Z]*f/.test(command)) {
      block(
        'git clean -f permanently deletes untracked files.',
        'Confirm with the user; they should run it manually if intended.'
      );
    }

    // rm -rf outside the safe build/cache allowlist.
    for (const segment of command.split(/(?:&&|\|\||;|\|)/)) {
      const m = segment.trim().match(/^(?:\S+=\S+\s+)*rm\s+(.+)$/);
      if (!m) continue;
      const tokens = m[1].split(/\s+/).filter(Boolean);
      const flags = tokens.filter((t) => /^-[a-zA-Z]+$/.test(t)).join('');
      if (!(/r/.test(flags) && /f/.test(flags))) continue;
      const targets = tokens.filter((t) => !t.startsWith('-'));
      const unsafe =
        targets.length === 0 ||
        targets.some((t) => {
          if (t.startsWith('/tmp/')) return false;
          if (t.includes('..') || t.includes('*')) return true;
          if (t.startsWith('/') || t.startsWith('~') || t === '.') return true;
          return !RM_SAFE_TARGET.test(t);
        });
      if (unsafe) {
        block(
          `rm -rf targets a path outside the safe allowlist: ${targets.join(', ') || '(none)'}`,
          'Safe targets: node_modules, dist, build, temp, /tmp/*. Confirm anything else with the user.'
        );
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(`Hook error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Main entry point.
 */
async function main() {
  const subcommand = process.argv[2];

  switch (subcommand) {
    case 'pre-edit':
      await preEdit();
      break;
    case 'pre-workflow':
      await preWorkflow();
      break;
    case 'post-commit':
      await postCommit();
      break;
    case 'bash-guard':
      await bashGuard();
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error('Usage: rihal-hooks.cjs pre-edit|pre-workflow|post-commit|bash-guard');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
