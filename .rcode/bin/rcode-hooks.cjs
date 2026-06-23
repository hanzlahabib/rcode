#!/usr/bin/env node
/**
 * rcode-hooks.cjs — opt-in hook runners for edit/workflow/commit guardrails.
 *
 * Subcommands:
 *   pre-edit    — verify file was Read before Edit/Write (exit 2 if not)
 *   pre-workflow — soft warning for rcode-* commands with suspicious args
 *   post-commit — verify commit format and no forbidden patterns
 *   bash-guard  — block dangerous Bash commands before they run (exit 2)
 *   pre-compact — refresh HANDOFF.json before context compaction (#743)
 *   stop-verify — syntax-check files changed during the response (#744)
 *   cost-track  — append per-response token usage to cost.jsonl (#745)
 *   compact-nudge — advise /rcode-trim or /clear after N Edit/Write calls (#749)
 *   prompt-router — nudge toward rcode commands for memory consistency (#892)
 *
 * All subcommands read stdin JSON from the hook execution context.
 * Pure Node stdlib. No external dependencies.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

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
 * pre-workflow: Soft warning for rcode-* commands with suspicious args.
 * Does not block (exit 0), but prints warning.
 */
async function preWorkflow() {
  try {
    const input = await readInputJson();
    const command = input.command || '';
    const args = input.args || '';

    // Only check rcode-* commands
    if (!command.startsWith('rcode-')) {
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

    if (hasSuspiciousPattern && (command === 'rcode-plan' || command === 'rcode-discuss')) {
      console.warn(`⚠ "${command}" with args: "${args}". Did you mean /rcode-do or /rcode-council?`);
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
        // Exception: rcode-tools.cjs writes its commit-message tmp file to
        // os.tmpdir() (outside the repo) — see rcode-tools.cjs:3668. That path
        // is rcode-controlled (not attacker input), so allow it explicitly.
        const isRcodeCommitMsgTmp =
          realPath.startsWith(fs.realpathSync(os.tmpdir()) + path.sep) &&
          /^rcode-commit-msg-\d+\.txt$/.test(path.basename(realPath));
        if (insideRepo || isRcodeCommitMsgTmp) {
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
const RM_SAFE_TARGET = /^(?:\.\/)?(?:node_modules|dist|build|coverage|\.next|out|temp|tmp|\.rcode\/cache)(?:\/.*)?$/;

/**
 * bash-guard: Block dangerous Bash commands before they execute.
 * Exit 2 blocks the tool call; exit 0 allows it.
 *
 * Enforces the repo's non-negotiable rules (AGENTS.md): no unapproved
 * `git push`, never `--force`, no `--no-verify`, no unscoped destructive
 * git/rm. An authorized push must be prefixed with `RCODE_PUSH_OK=1`.
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
      console.error(`⛔ BLOCKED by rcode bash-guard: ${reason}`);
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
    // bypassable via 'echo RCODE_PUSH_OK; git push'.
    if (isPush && !/^\s*RCODE_PUSH_OK=1(\s|$)/.test(command)) {
      block(
        'git push requires explicit human approval.',
        'If the user authorized THIS push, prefix the command with RCODE_PUSH_OK=1. See AGENTS.md.'
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
          if (t.startsWith(os.tmpdir() + path.sep)) return false;
          if (t.includes('..') || t.includes('*')) return true;
          if (t.startsWith('/') || t.startsWith('~') || t === '.') return true;
          return !RM_SAFE_TARGET.test(t);
        });
      if (unsafe) {
        block(
          `rm -rf targets a path outside the safe allowlist: ${targets.join(', ') || '(none)'}`,
          `Safe targets: node_modules, dist, build, temp, ${os.tmpdir()}${path.sep}*. Confirm anything else with the user.`
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
 * pre-compact: Capture rcode session state before context compaction.
 *
 * Triggered by the PreCompact hook. Enriched version (#743 + enhancement):
 *   1. Reads .rcode/state.json + .planning/STATE.md + active SPRINT.md
 *   2. Collects recent git commits and in-progress task checkboxes
 *   3. Writes enriched .rcode/HANDOFF.json (machine-readable resume file)
 *   4. Writes .rcode/.continue-here.md (paste-ready resume prompt)
 *   5. Outputs { systemMessage } so Claude sees context immediately after
 *      compaction — enabling /rcode-resume-work to restore full context.
 *
 * Never blocks compaction — any error exits 1 (non-blocking per spec).
 */
async function preCompact() {
  try {
    await readInputJson(); // drain the PreCompact event payload

    const cwd = process.cwd();

    // ── 1. Load state.json ──────────────────────────────────────────────
    const statePath = path.join(cwd, '.rcode', 'state.json');
    let state = null;
    if (fs.existsSync(statePath)) {
      try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
    }

    // ── 2. Determine active phase ────────────────────────────────────────
    const phases = Array.isArray(state?.phases) ? state.phases : [];
    const executing = phases.find((p) => p && p.status === 'executing');
    const matched = phases.find(
      (p) => p && (p.name === state?.current_phase || p.number === state?.current_phase)
    );
    const activePhase = executing || matched || null;
    const phaseLabel = activePhase
      ? (activePhase.number || activePhase.name || state?.current_phase)
      : (state?.current_phase || null);

    // ── 3. Read active SPRINT.md (incomplete tasks) ──────────────────────
    const incompleteTasks = [];
    const completedCount = { done: 0, total: 0 };
    const planningBase = path.join(cwd, '.planning', 'phases');
    if (phaseLabel && fs.existsSync(planningBase)) {
      try {
        const phaseDirs = fs.readdirSync(planningBase)
          .filter(d => d.startsWith(String(phaseLabel)));
        for (const pd of phaseDirs) {
          const pdPath = path.join(planningBase, pd);
          if (!fs.statSync(pdPath).isDirectory()) continue;
          const sprintFiles = fs.readdirSync(pdPath)
            .filter(f => f.endsWith('-SPRINT.md'))
            .sort()
            .reverse(); // most recent first
          if (sprintFiles.length === 0) continue;
          const sprintText = fs.readFileSync(path.join(pdPath, sprintFiles[0]), 'utf8');
          for (const line of sprintText.split('\n')) {
            const done = /^\s*-\s*\[x\]/i.test(line);
            const pending = /^\s*-\s*\[ \]/.test(line);
            if (done || pending) completedCount.total++;
            if (done) completedCount.done++;
            if (pending) {
              const task = line.replace(/^\s*-\s*\[ \]\s*/, '').trim();
              if (task) incompleteTasks.push(task);
            }
          }
          break; // use first matching phase dir only
        }
      } catch {}
    }

    // ── 4. Recent git commits ────────────────────────────────────────────
    let recentCommits = [];
    try {
      const log = execSync('git log --oneline -5 --no-decorate 2>/dev/null', {
        cwd, encoding: 'utf8', timeout: 3000,
      }).trim();
      recentCommits = log ? log.split('\n').filter(Boolean) : [];
    } catch {}

    // ── 5. Read milestone / roadmap headline ────────────────────────────
    let milestoneHint = state?.milestone || null;
    if (!milestoneHint) {
      for (const rp of ['.planning/ROADMAP.md', '.planning/milestones/ROADMAP.md']) {
        const full = path.join(cwd, rp);
        if (!fs.existsSync(full)) continue;
        const m = fs.readFileSync(full, 'utf8').match(/^##\s+Milestone\s+(M\d+[^\n]*)/m);
        if (m) { milestoneHint = m[1].trim(); break; }
      }
    }

    // ── 6. Read last 3 decisions from STATE.md ───────────────────────────
    let recentDecisions = [];
    const stateFile = path.join(cwd, '.planning', 'STATE.md');
    if (fs.existsSync(stateFile)) {
      try {
        const stateText = fs.readFileSync(stateFile, 'utf8');
        const decSection = stateText.match(/##\s+(?:Recent\s+)?Decisions[\s\S]*?(?=\n##|\Z)/i);
        if (decSection) {
          recentDecisions = decSection[0]
            .split('\n')
            .filter(l => /^\s*[-*]/.test(l))
            .slice(0, 3)
            .map(l => l.replace(/^\s*[-*]\s*/, '').trim())
            .filter(Boolean);
        }
      } catch {}
    }

    // ── 7. Build enriched HANDOFF.json ───────────────────────────────────
    const handoff = {
      generated_at: new Date().toISOString(),
      reason: 'pre-compact',
      phase: phaseLabel,
      milestone: milestoneHint,
      current_plan: state?.current_plan ?? null,
      current_sprint: state?.current_sprint ?? null,
      progress: completedCount.total > 0
        ? `${completedCount.done}/${completedCount.total} tasks done`
        : null,
      incomplete_tasks: incompleteTasks.slice(0, 10),
      recent_commits: recentCommits,
      recent_decisions: recentDecisions,
    };

    const rcodeDir = path.join(cwd, '.rcode');
    if (!fs.existsSync(rcodeDir)) {
      process.exit(0); // not a rcode project
    }

    const handoffPath = path.join(rcodeDir, 'HANDOFF.json');
    fs.writeFileSync(handoffPath + '.tmp', JSON.stringify(handoff, null, 2) + '\n');
    fs.renameSync(handoffPath + '.tmp', handoffPath);

    // ── 8. Write .continue-here.md (paste-ready resume prompt) ───────────
    const resumeLines = [
      '# rcode Session Resume',
      '',
      `**Compacted:** ${handoff.generated_at}`,
      phaseLabel ? `**Phase:** ${phaseLabel}` : null,
      milestoneHint ? `**Milestone:** ${milestoneHint}` : null,
      handoff.progress ? `**Progress:** ${handoff.progress}` : null,
      '',
    ].filter(l => l !== null);

    if (incompleteTasks.length > 0) {
      resumeLines.push('**Next tasks:**');
      incompleteTasks.slice(0, 5).forEach(t => resumeLines.push(`- [ ] ${t}`));
      resumeLines.push('');
    }
    if (recentCommits.length > 0) {
      resumeLines.push('**Recent commits:**');
      recentCommits.forEach(c => resumeLines.push(`- ${c}`));
      resumeLines.push('');
    }
    if (recentDecisions.length > 0) {
      resumeLines.push('**Recent decisions:**');
      recentDecisions.forEach(d => resumeLines.push(`- ${d}`));
      resumeLines.push('');
    }
    resumeLines.push('---');
    resumeLines.push('Run `/rcode-resume-work` to restore full project context.');

    fs.writeFileSync(
      path.join(rcodeDir, '.continue-here.md'),
      resumeLines.join('\n') + '\n'
    );

    // ── 9. Emit systemMessage for Claude post-compaction ─────────────────
    const msgParts = ['**rcode context compacted.**'];
    if (phaseLabel) msgParts.push(`Active phase: **${phaseLabel}**`);
    if (milestoneHint) msgParts.push(`Milestone: ${milestoneHint}`);
    if (handoff.progress) msgParts.push(`Progress: ${handoff.progress}`);
    if (incompleteTasks.length > 0) {
      msgParts.push(`Next task: ${incompleteTasks[0]}`);
    }
    msgParts.push('Run `/rcode-resume-work` to restore full context, or `/clear` then paste `.rcode/.continue-here.md`.');

    process.stdout.write(JSON.stringify({ systemMessage: msgParts.join(' | ') }) + '\n');
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
 * event payload and appends one JSON line to .rcode/telemetry/cost.jsonl so
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

    const telemetryDir = path.join(process.cwd(), '.rcode', 'telemetry');
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

// ─────────────────────────────────────────────────────────────────────────────
// INTENT_TABLE — keyword map for prompt-router (#892)
//
// WHY: When a user types a free-form prompt that matches a known rcode workflow,
// we nudge them toward the matching command so the outcome is captured in
// .rcode/state.json. Work done outside rcode commands never lands in state.
//
// Single source of truth: rcode/workflows/do.md routing table (lines ~285-320,
// "If the text describes..."). Keep in sync — see test/prompt-router-table-sync.test.cjs
// (Sprint 38.3).
//
// Order: first-match-wins, mirroring do.md's "Apply the first matching rule".
// More-specific keyword sets come before broad ones.
// ─────────────────────────────────────────────────────────────────────────────
const INTENT_TABLE = [
  // do.md: "Starting a new project, 'set up', 'initialize'" → /rcode-new-project
  {
    intent: 'new-project',
    keywords: ['set up a new project', 'initialize a new project', 'start a new project', 'create a new project'],
    command: '/rcode-new-project',
  },
  // do.md: "Mapping or analyzing an existing codebase" → /rcode-map-codebase
  {
    intent: 'map-codebase',
    keywords: ['map the codebase', 'map this codebase', 'analyze the codebase', 'analyse the codebase', 'map existing codebase'],
    command: '/rcode-map-codebase',
  },
  // do.md: "A bug, error, crash, failure, or something broken" → /rcode-debug
  // 'error' alone is too broad (matches "what does this error mean?" etc.).
  // Use multi-word forms that signal debug intent rather than a question.
  {
    intent: 'debug',
    keywords: ['bug', 'getting an error', 'throwing an error', 'error in the', 'fix the error', 'debug this', 'crash', 'failure', 'broken', 'not working', 'fails', 'exception', 'traceback'],
    command: '/rcode-debug',
  },
  // do.md: "Audit code quality, 'review changes', 'karpathy', 'check my diff', 'too complex'" → /rcode-review --karpathy
  {
    intent: 'audit-karpathy',
    keywords: ['audit', 'review changes', 'check my diff', 'karpathy', 'too complex', 'complexity', 'code review'],
    command: '/rcode-review --karpathy',
  },
  // do.md: "Make it simpler, 'be lazy', 'simplest solution', 'yagni', 'over-engineered'" → /rcode-lazy
  // Generative simplicity lens (before code is written); /rcode-trim removes bloat after.
  // 'simplify' alone is too broad (overlaps rcode-trim's existing-code territory) — use intent-bearing phrases.
  {
    intent: 'lazy',
    keywords: ['be lazy', 'lazy mode', 'simplest solution', 'yagni', 'over-engineered', 'over-engineering', 'kam code likho'],
    command: '/rcode-lazy',
  },
  // do.md: "Walk through a change, 'checkpoint', 'explain this diff', 'human review'" → /rcode-checkpoint-preview
  {
    intent: 'checkpoint',
    keywords: ['checkpoint', 'explain this diff', 'human review', 'walk through the change', 'walk through this change'],
    command: '/rcode-checkpoint-preview',
  },
  // do.md: "Brainstorm, generate ideas, 'explore options', 'what could we do'" → /rcode-brainstorm
  {
    intent: 'brainstorm',
    keywords: ['brainstorm', 'generate ideas', 'explore options', 'what could we do', 'ideate', 'ideas for'],
    command: '/rcode-brainstorm',
  },
  // do.md: "Exploring, researching, comparing, or 'how does X work'" → /rcode-research-phase
  // 'research' alone fires on "based on my research..." (past-tense reference, not navigation intent).
  // 'how does'/'how do' fire on any factual question — removed in favour of intent-bearing phrases.
  {
    intent: 'explore',
    keywords: ['explore', 'research phase', 'do some research', 'comparing', 'investigate', 'look into', 'understand how'],
    command: '/rcode-research-phase',
  },
  // do.md: "Scope unclear, 'which one', 'better UX', 'how should X look'" → /rcode-discuss-phase
  {
    intent: 'discuss',
    keywords: ['which one', 'better ux', 'how should', 'still have confusion', 'conflicting', 'discuss the scope', 'design this', 'architect this'],
    command: '/rcode-discuss-phase',
  },
  // do.md: "A complex task: refactoring, migration, multi-file architecture, system redesign,
  // integrating a new system/service" → /rcode-add-phase
  // 'integration'/'integrate' catch "let's do X integration", "integrate with Y" — feature-sized
  // architectural work that belongs in a phase, not an ad-hoc edit (#907).
  // Known mild false-positive: "run the integration tests" also matches → a harmless soft
  // nudge toward /rcode-add-phase. Accepted: catching real integration work outweighs it,
  // and no clean substring separates "X integration" from "integration test".
  {
    intent: 'add-phase',
    keywords: ['refactor', 'migration', 'multi-file', 'system redesign', 'multi file', 'large refactor', 'architectural', 'integration', 'integrate'],
    command: '/rcode-add-phase',
  },
  // do.md: "'Sprint planning', 'plan the sprint', 'next sprint'" → /rcode-sprint-planning
  {
    intent: 'sprint-planning',
    keywords: ['sprint planning', 'plan the sprint', 'next sprint', 'what\'s in this sprint', "what's in this sprint"],
    command: '/rcode-sprint-planning',
  },
  // do.md: "Executing a sprint, 'run the sprint', 'start sprint'" → /rcode-execute-sprint
  {
    intent: 'execute-sprint',
    keywords: ['run the sprint', 'start sprint', 'execute sprint', 'work on sprint'],
    command: '/rcode-execute-sprint',
  },
  // do.md: "Planning a specific phase, 'plan phase N'" → /rcode-plan
  {
    intent: 'plan',
    keywords: ["let's plan", 'plan phase', 'plan this', 'let me plan', 'planning phase', 'create a plan', 'please plan', 'plan and think', 'scope this', 'scope the feature'],
    command: '/rcode-plan',
  },
  // do.md: "'Create milestones', 'plan milestones', 'create roadmap'" → /rcode-new-milestone
  {
    intent: 'new-milestone',
    keywords: ['create milestones', 'plan milestones', 'create roadmap', 'break project into milestones', 'new milestone', 'what milestones'],
    command: '/rcode-new-milestone',
  },
  // do.md: "Break milestone into epics/stories, 'create stories', 'user stories', 'epics'" → /rcode-create-epics-and-stories
  {
    intent: 'epics-stories',
    keywords: ['create epics', 'user stories', 'create stories', 'epics and stories', 'break into epics'],
    command: '/rcode-create-epics-and-stories',
  },
  // do.md: "Drift / out-of-date / 'audit feature docs' / 'fill out existing PRD'" → /rcode-feature-drift
  {
    intent: 'feature-drift',
    keywords: ['out of date', 'out-of-date', 'verify docs', 'audit feature docs', 'fill out existing', 'prd drift', 'docs vs code'],
    command: '/rcode-feature-drift',
  },
  // do.md: "General audit / re-audit / extend / fill out / expand an existing artifact" → /rcode-audit
  {
    intent: 'audit',
    keywords: ['re-audit', 'extend the audit', 'fill out the', 'expand the', 're audit'],
    command: '/rcode-audit',
  },
];

/**
 * Inline flat-YAML parser — mirrors parseSimpleYaml in rcode-tools.cjs:91.
 * Supports `key: value` lines only; strips `#` comments; unquotes.
 * Kept inline so this file stays standalone (no cross-file require).
 */
function parseSimpleYamlInline(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim();
    let val = line.slice(colonAt + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

/**
 * Read prompt_nudge from .rcode/config.yaml.
 * Returns 'every' | 'once-per-intent' | 'when-stale' | 'off'.
 * Defaults to 'every' when key is absent, file is missing, or value is unknown.
 */
function readPromptNudgeToggle(cwd) {
  const VALID = new Set(['every', 'once-per-intent', 'when-stale', 'off']);
  try {
    const cfgPath = path.join(cwd, '.rcode', 'config.yaml');
    const text = fs.readFileSync(cfgPath, 'utf8');
    const parsed = parseSimpleYamlInline(text);
    const val = (parsed.prompt_nudge || '').trim().toLowerCase();
    return VALID.has(val) ? val : 'every';
  } catch {
    return 'every';
  }
}

/**
 * Determine whether a nudge is stale enough to fire under 'when-stale' mode.
 *
 * Heuristic: fire when .rcode/state.json exists AND its mtime is older than
 * the most recent git commit timestamp, OR when state.json is absent in a
 * .planning/ project. This is cheap and best-effort — if any check fails the
 * function returns true (treat as stale = fire). All I/O is wrapped in
 * try/catch to preserve the fail-open contract.
 */
function isStateStaleFallbackTrue(cwd) {
  try {
    const statePath = path.join(cwd, '.rcode', 'state.json');
    const planningDir = path.join(cwd, '.planning');
    const hasPlanning = fs.existsSync(planningDir);

    if (!fs.existsSync(statePath)) {
      // No state.json at all — if there IS a .planning/ dir, that means we're
      // in a project that should have state but doesn't: treat as stale.
      return hasPlanning;
    }

    // state.json exists — check its mtime vs last commit timestamp.
    const stateMtime = fs.statSync(statePath).mtimeMs;
    let lastCommitTs = null;
    try {
      const tsStr = execSync('git log -1 --format=%ct 2>/dev/null', {
        cwd, encoding: 'utf8', timeout: 2000,
      }).trim();
      if (tsStr) lastCommitTs = parseInt(tsStr, 10) * 1000;
    } catch { /* git unavailable or no commits */ }

    if (lastCommitTs === null) return false; // can't determine, don't nag
    return stateMtime < lastCommitTs;
  } catch {
    return true; // fail open: treat as stale
  }
}

/**
 * prompt-router: Nudge user toward rcode commands for memory consistency (#892).
 *
 * Runs on UserPromptSubmit. Reads stdin JSON synchronously (mirror
 * cli/rcode-slash-router.cjs — NOT the async readInputJson() which rejects on
 * bad JSON). Keyword-matches against INTENT_TABLE (derived from
 * rcode/workflows/do.md lines ~285-320). On match, emits a one-line advisory
 * via hookSpecificOutput.additionalContext. Gated by prompt_nudge config toggle.
 * Always exits 0 with no output on any error or non-match.
 */
function promptRouter() {
  try {
    // Read stdin synchronously — mirrors cli/rcode-slash-router.cjs readStdin().
    let raw = '';
    try {
      raw = fs.readFileSync(0, 'utf8');
    } catch {
      process.exit(0);
    }

    if (!raw.trim()) process.exit(0);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      process.exit(0);
    }

    // Multi-spelling prompt field fallback — mirrors rcode-slash-router.cjs.
    const prompt =
      data.prompt ??
      data.user_prompt ??
      data.userPrompt ??
      data.message ??
      data.input ??
      '';

    if (typeof prompt !== 'string' || !prompt.trim()) process.exit(0);

    const trimmed = prompt.trimStart();

    // Skip prompts that already start with /rcode- — slash router handles those.
    if (/^\/rcode-/.test(trimmed)) process.exit(0);

    const hookEventName =
      data.hook_event_name || data.hookEventName || 'UserPromptSubmit';
    const cwd = process.cwd();

    // ── Config toggle ────────────────────────────────────────────────────
    const nudgeMode = readPromptNudgeToggle(cwd);
    if (nudgeMode === 'off') process.exit(0);

    // ── when-stale: check if state is stale ──────────────────────────────
    if (nudgeMode === 'when-stale' && !isStateStaleFallbackTrue(cwd)) {
      process.exit(0);
    }

    // ── Keyword match (first-match-wins, case-insensitive) ───────────────
    const lower = prompt.toLowerCase();
    let matched = null;
    for (const entry of INTENT_TABLE) {
      for (const kw of entry.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          matched = entry;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) process.exit(0);

    // ── once-per-intent dedupe ───────────────────────────────────────────
    if (nudgeMode === 'once-per-intent') {
      // Fallback key: parent PID + hourly bucket — scopes naturally to the
      // current shell session without requiring session_id in the payload.
      // Without this, every session shares 'default' and a dedupe file from
      // session A silences nudges in session B permanently.
      const sessionFallback =
        String(process.ppid) + '-' + String(Math.floor(Date.now() / 3600000));
      const sessionId =
        data.session_id || data.tool_input?.session_id || sessionFallback;
      const dedupeFile = path.join(
        os.tmpdir(),
        'rcode-prompt-nudge-' + sessionId + '.json'
      );
      try {
        let seen = [];
        try {
          seen = JSON.parse(fs.readFileSync(dedupeFile, 'utf8'));
          if (!Array.isArray(seen)) seen = [];
        } catch { /* first run or missing file */ }

        if (seen.includes(matched.intent)) process.exit(0);

        seen.push(matched.intent);
        try { fs.writeFileSync(dedupeFile, JSON.stringify(seen)); } catch {}
      } catch {
        // dedupe file unreadable/locked → fire anyway (fail open)
      }
    }

    // ── Emit advisory ────────────────────────────────────────────────────
    // #907 RC2: lead with the directive ("use X"), not a soft "consider" — a
    // gentle memory-framed tip loses the skill-selection race to imperative
    // SessionStart primers (e.g. superpowers' "you MUST invoke"). The memory
    // rationale stays, but as the fallback note rather than the headline.
    const advisory =
      `Use ${matched.command} for this ${matched.intent} task — it's the rcode workflow built for it, and it records the outcome in .rcode/state.json. ` +
      `Prefer it over handling this ad-hoc; if you do proceed manually, run /rcode-memory-update afterward so long-term memory stays consistent.`;

    const payload = {
      hookSpecificOutput: {
        hookEventName,
        additionalContext: advisory,
      },
    };
    process.stdout.write(JSON.stringify(payload));
  } catch {
    // Fail open — never break the host CLI's prompt.
  }
  process.exit(0);
}

/**
 * compact-nudge: Advise /rcode-trim or /clear after N Edit/Write calls (#749).
 *
 * Triggered by the PreToolUse:Edit|Write hook. Maintains a per-session call
 * counter in a temp file and, once the count crosses RCODE_NUDGE_THRESHOLD
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
      'rcode-nudge-' + sessionId + '.count'
    );

    let count = 0;
    try {
      count = parseInt(fs.readFileSync(counterPath, 'utf8').trim(), 10) || 0;
    } catch {}
    count += 1;
    try {
      fs.writeFileSync(counterPath, String(count));
    } catch {}

    const threshold = parseInt(process.env.RCODE_NUDGE_THRESHOLD, 10) || 50;
    if (count >= threshold) {
      console.error(
        `⚠ rcode compact-nudge: ${count} edits this session. Consider /rcode-trim or /clear to reclaim context budget.`
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
    case 'prompt-router':
      promptRouter(); // synchronous — exits inside; never falls through to async path
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error('Usage: rcode-hooks.cjs pre-edit|pre-workflow|post-commit|bash-guard|pre-compact|stop-verify|cost-track|compact-nudge|prompt-router');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { INTENT_TABLE };
