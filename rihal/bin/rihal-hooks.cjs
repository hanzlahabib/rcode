#!/usr/bin/env node
/**
 * rihal-hooks.cjs — opt-in hook runners for edit/workflow/commit guardrails.
 *
 * Subcommands:
 *   pre-edit    — verify file was Read before Edit/Write (exit 2 if not)
 *   pre-workflow — soft warning for rihal-* commands with suspicious args
 *   post-commit — verify commit format and no forbidden patterns
 *   bash-guard  — block dangerous Bash commands before they run (exit 2)
 *   pre-compact — refresh HANDOFF.json before context compaction (#743)
 *   stop-verify — syntax-check files changed during the response (#744)
 *   cost-track  — append per-response token usage to cost.jsonl (#745)
 *   compact-nudge — advise /rihal-trim or /clear after N Edit/Write calls (#749)
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
    const path = require('path');
    const os = require('os');
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

    // If -F flag used, try to read the message file — but only if it resolves
    // inside the repo working tree. An attacker-controlled commit command could
    // otherwise point -F at e.g. ~/.ssh/id_rsa. Mirror the resolve + realpathSync
    // + startsWith guard from server/lib/api.js:131-141 (#754).
    const fMatch = command.match(/-F\s+(\S+)/);
    if (fMatch) {
      try {
        const repoRoot = process.cwd();
        const resolved = path.resolve(repoRoot, fMatch[1]);
        // Dereference symlinks so a symlink outside the repo cannot bypass the guard.
        const realPath = fs.realpathSync(resolved);
        const insideRepo = realPath.startsWith(repoRoot + path.sep);
        // Exception: rihal-tools.cjs writes its commit-message tmp file to
        // os.tmpdir() (outside the repo) — see rihal-tools.cjs:3668. That path
        // is rihal-controlled (not attacker input), so allow it explicitly.
        const isRihalCommitMsgTmp =
          realPath.startsWith(fs.realpathSync(os.tmpdir()) + path.sep) &&
          /^rihal-commit-msg-\d+\.txt$/.test(path.basename(realPath));
        if (insideRepo || isRihalCommitMsgTmp) {
          commitMsg += '\n' + fs.readFileSync(resolved, 'utf8');
        }
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
 *
 * This guard is best-effort, NOT a security boundary: a determined caller
 * can still craft a bypass (e.g. obscure git aliases). It enforces AGENTS.md
 * conventions, not a sandbox.
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

    // A `+`-prefixed refspec (`git push origin +main`) is a force-push that
    // matches neither `--force` nor `-f`. Detect it by scanning the tokens
    // after `push` for a non-flag token starting with `+` (`+` is not a glob
    // or option char, so a leading-`+` token is unambiguously a refspec).
    const isPlusRefspecForce =
      isPush &&
      (() => {
        const tokens = command.split(/\s+/);
        const pushIdx = tokens.findIndex((t) => t === 'push');
        if (pushIdx === -1) return false;
        return tokens
          .slice(pushIdx + 1)
          .some((t) => t.startsWith('+'));
      })();

    // Force-push is never permitted through an agent.
    if (
      isPush &&
      (/(--force\b|--force-with-lease\b|(?:^|\s)-f\b)/.test(command) ||
        isPlusRefspecForce)
    ) {
      block(
        'git push --force is never permitted.',
        'A human must run a force-push manually. See AGENTS.md.'
      );
    }

    // Plain git push requires an explicit per-push authorization token.
    // Token must be a real leading env-var assignment — substring match is
    // bypassable via 'echo RIHAL_PUSH_OK; git push'.
    if (isPush && !/^\s*RIHAL_PUSH_OK=1(\s|$)/.test(command)) {
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
 * pre-compact: Refresh HANDOFF.json before context compaction (#743).
 *
 * Triggered by the PreCompact hook. Reads .rihal/state.json from the current
 * working directory and, if a phase is active, writes a HANDOFF.json pointer
 * so a post-compaction agent can resume cleanly. No-op when no phase is
 * active. Never blocks compaction.
 */
async function preCompact() {
  try {
    const path = require('path');
    await readInputJson(); // drain the PreCompact event payload

    const cwd = process.cwd();
    const statePath = path.join(cwd, '.rihal', 'state.json');
    if (!fs.existsSync(statePath)) {
      process.exit(0);
    }

    let state;
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
      process.exit(0);
    }

    const phases = Array.isArray(state.phases) ? state.phases : [];
    const hasActivePhase =
      !!state.current_phase &&
      phases.length > 0 &&
      phases.some(
        (p) =>
          p &&
          (p.status === 'executing' ||
            p.name === state.current_phase ||
            p.number === state.current_phase)
      );

    if (!hasActivePhase) {
      process.exit(0);
    }

    const executing = phases.find((p) => p && p.status === 'executing');
    const matched = phases.find(
      (p) => p && (p.name === state.current_phase || p.number === state.current_phase)
    );
    const activePhase = executing || matched;
    const phaseLabel = activePhase
      ? activePhase.number || activePhase.name || state.current_phase
      : state.current_phase;

    const handoff = {
      generated_at: new Date().toISOString(),
      reason: 'pre-compact',
      phase: phaseLabel,
      current_plan: state.current_plan ?? null,
      current_sprint: state.current_sprint ?? null,
    };

    const handoffPath = path.join(cwd, 'HANDOFF.json');
    const tmpPath = handoffPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(handoff, null, 2) + '\n');
    fs.renameSync(tmpPath, handoffPath);

    process.exit(0);
  } catch (err) {
    console.error(`Hook error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * stop-verify: Syntax-check files changed during the response (#744).
 *
 * Triggered by the Stop hook. Collects the files changed during the response
 * (from the payload, falling back to `git diff --name-only`) and syntax-checks
 * each .js/.cjs (node --check) and .json (JSON.parse). Surfaces failures to
 * stderr with a non-zero exit. Advisory only — never auto-fixes, never blocks.
 */
async function stopVerify() {
  try {
    const path = require('path');
    const { spawnSync } = require('child_process');
    const input = await readInputJson();

    let changed =
      input.changed_files ||
      input.tool_input?.changed_files ||
      input.files_changed ||
      null;

    if (!Array.isArray(changed)) {
      const diff = spawnSync('git', ['diff', '--name-only'], {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      changed =
        diff.status === 0
          ? diff.stdout.split('\n').map((l) => l.trim()).filter(Boolean)
          : [];
    }

    if (changed.length === 0) {
      process.exit(0);
    }

    const failures = [];
    for (const file of changed) {
      const abs = path.isAbsolute(file)
        ? file
        : path.resolve(process.cwd(), file);
      if (!fs.existsSync(abs)) continue;
      const ext = path.extname(abs).toLowerCase();
      if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
        const check = spawnSync(process.execPath, ['--check', abs], {
          encoding: 'utf8',
        });
        if (check.status !== 0) {
          failures.push(`${file}: ${(check.stderr || '').trim().split('\n')[0]}`);
        }
      } else if (ext === '.json') {
        try {
          JSON.parse(fs.readFileSync(abs, 'utf8'));
        } catch (e) {
          failures.push(`${file}: ${e.message}`);
        }
      }
    }

    if (failures.length > 0) {
      console.error('⚠ stop-verify: changed files failed syntax check:');
      failures.forEach((f) => console.error(`  • ${f}`));
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error(`Hook error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * cost-track: Append per-response token usage to cost.jsonl (#745).
 *
 * Triggered by the Stop hook. Extracts the token usage block from the Stop
 * event payload and appends one JSON line to .rihal/telemetry/cost.jsonl so
 * session-report can report measured totals. No-op when no usage block is
 * present. Never blocks.
 */
async function costTrack() {
  try {
    const path = require('path');
    const input = await readInputJson();

    const usage = input.usage || input.tool_input?.usage || null;
    if (!usage || typeof usage !== 'object') {
      process.exit(0);
    }

    const record = {
      ts: new Date().toISOString(),
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    };
    if (usage.cache_creation_input_tokens != null) {
      record.cache_creation_input_tokens = usage.cache_creation_input_tokens;
    }
    if (usage.cache_read_input_tokens != null) {
      record.cache_read_input_tokens = usage.cache_read_input_tokens;
    }

    const telemetryDir = path.join(process.cwd(), '.rihal', 'telemetry');
    fs.mkdirSync(telemetryDir, { recursive: true });
    fs.appendFileSync(
      path.join(telemetryDir, 'cost.jsonl'),
      JSON.stringify(record) + '\n'
    );

    process.exit(0);
  } catch (err) {
    console.error(`Hook error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * compact-nudge: Advise /rihal-trim or /clear after N Edit/Write calls (#749).
 *
 * Triggered by the PreToolUse:Edit|Write hook. Maintains a per-session call
 * counter in a temp file and, once the count crosses RIHAL_NUDGE_THRESHOLD
 * (default 50), prints an advisory to reclaim context budget. Purely
 * advisory — always exits 0, never blocks a tool call.
 */
async function compactNudge() {
  try {
    const path = require('path');
    const os = require('os');
    const input = await readInputJson();

    const sessionId =
      input.session_id || input.tool_input?.session_id || 'default';
    const counterPath = path.join(
      os.tmpdir(),
      'rihal-nudge-' + sessionId + '.count'
    );

    let count = 0;
    try {
      count = parseInt(fs.readFileSync(counterPath, 'utf8').trim(), 10) || 0;
    } catch {}
    count += 1;
    try {
      fs.writeFileSync(counterPath, String(count));
    } catch {}

    const threshold = parseInt(process.env.RIHAL_NUDGE_THRESHOLD, 10) || 50;
    if (count >= threshold) {
      console.error(
        `⚠ rihal compact-nudge: ${count} edits this session. Consider /rihal-trim or /clear to reclaim context budget.`
      );
    }

    process.exit(0);
  } catch {
    // Advisory hook must never break the session.
    process.exit(0);
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
    case 'pre-compact':
      await preCompact();
      break;
    case 'stop-verify':
      await stopVerify();
      break;
    case 'cost-track':
      await costTrack();
      break;
    case 'compact-nudge':
      await compactNudge();
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error('Usage: rihal-hooks.cjs pre-edit|pre-workflow|post-commit|bash-guard|pre-compact|stop-verify|cost-track|compact-nudge');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
