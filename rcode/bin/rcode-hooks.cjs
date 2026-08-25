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
 *   stop        — unified Stop hook: hedging-language detection (#744) + token logging (#745)
 *   compact-nudge — advise /rcode-trim or /clear after N Edit/Write calls (#749)
 *   pre-tool-use  — stderr warning before large file reads to avoid context bloat (#749)
 *   prompt-router — nudge toward rcode commands for memory consistency (#892)
 *   session-start — emit one-line project status primer at session open (#947)
 *   drift         — print the full memory-drift report (#958)
 *
 * All subcommands read stdin JSON from the hook execution context.
 * Pure Node stdlib. No external dependencies.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

/**
 * Self-healing lib require (#960). When this file runs from an installed
 * `.rcode/bin/` whose `lib/` is stale or partial (fresh git worktree, merge/
 * pull that changed `rcode/bin/lib/` without a mirror sync), a hard require
 * crashes EVERY hook — the user sees a SessionStart loader error and loses
 * the status line entirely. Instead: on MODULE_NOT_FOUND, try healing from
 * the in-repo source of truth (`rcode/bin/lib/<name>` relative to the project
 * root that contains this `.rcode/`), retry once, and otherwise fail open so
 * hooks degrade (no memory injection / drift check) rather than die.
 */
function requireLib(name) {
  const local = path.join(__dirname, 'lib', name);
  try { return require(local); } catch (err) {
    if (err && err.code !== 'MODULE_NOT_FOUND') throw err;
    try {
      const src = path.join(__dirname, '..', '..', 'rcode', 'bin', 'lib', name);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(local), { recursive: true });
        fs.copyFileSync(src, local);
        return require(local);
      }
    } catch { /* healing is best-effort */ }
    return null;
  }
}

const _stateReader = requireLib('state-reader.cjs') || {};
const resolveActivePhase = _stateReader.resolveActivePhase || (() => ({ activePhase: null, phaseLabel: null }));
const readSprintProgress = _stateReader.readSprintProgress || (() => ({ completedCount: 0, incompleteTasks: [] }));
const readRecentCommits  = _stateReader.readRecentCommits  || (() => []);
const readMilestoneHint  = _stateReader.readMilestoneHint  || (() => null);

const _memSelect = requireLib('memory-select.cjs') || {};
const selectMemoryChunks  = _memSelect.selectMemoryChunks  || (() => []);
const formatMemoryContext = _memSelect.formatMemoryContext || (() => '');
const hasMemory           = _memSelect.hasMemory           || (() => false);

// lib/memory-drift.cjs is optional at the module-load level: some hook-copy
// test fixtures deliberately stage a minimal bin/lib/ (only state-reader.cjs)
// to exercise other subcommands' missing-file handling. A hard top-level
// require would crash every subcommand, not just `drift`/`post-commit`, so
// this loads lazily and fails open — same pattern as INTENT_TABLE below.
let checkDrift = null;
{
  const _drift = requireLib('memory-drift.cjs');
  if (_drift) ({ checkDrift } = _drift);
}

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
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
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
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
  }
}

/**
 * Emit a one-line systemMessage nudge toward /rcode-memory-update when
 * memory-drift.cjs finds drifts, at most once per session (#958).
 *
 * "Session" here has no reliable id on a post-commit hook payload, so we
 * fall back to parent-pid + hourly bucket — same fallback prompt-router
 * already uses (see promptRouter() below) — scoped naturally to the
 * current shell without requiring a session_id in the payload.
 */
function maybeEmitDriftNudge(cwd, input) {
  try {
    if (!checkDrift) return;
    const { drifts } = checkDrift(cwd);
    if (drifts.length === 0) return;

    const sessionFallback = String(process.ppid) + '-' + String(Math.floor(Date.now() / 3600000));
    const sessionId = input?.session_id || input?.tool_input?.session_id || sessionFallback;
    const safeId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '_');

    const cacheDir = path.join(cwd, '.rcode', '.cache');
    const markerFile = path.join(cacheDir, `drift-nudge-${safeId}.json`);
    if (fs.existsSync(markerFile)) return;

    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(markerFile, JSON.stringify({ ts: Date.now(), count: drifts.length }));

    const kinds = [...new Set(drifts.map((d) => d.kind))].join(', ');
    const nudge =
      `⚠ Memory drift detected (${drifts.length} finding${drifts.length === 1 ? '' : 's'}: ${kinds}) — ` +
      `run /rcode-memory-update, or \`rcode-hooks drift\` for the full report.`;
    process.stdout.write(JSON.stringify({ systemMessage: nudge }) + '\n');
  } catch {
    // Advisory only — never break the commit flow.
  }
}

/**
 * drift: Print the full memory-drift report (#958). Standalone CLI use —
 * not gated by the once-per-session nudge limiter in maybeEmitDriftNudge().
 */
function driftCommand() {
  if (!checkDrift) {
    console.error('rcode/bin/lib/memory-drift.cjs failed to load — cannot run drift check.');
    process.exit(1);
  }
  const report = checkDrift(process.cwd());
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
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

    maybeEmitDriftNudge(process.cwd(), input);

    process.exit(0);
  } catch (err) {
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
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
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
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
    const { activePhase, phaseLabel } = resolveActivePhase(state);

    // ── 3. Read active SPRINT.md (incomplete tasks) ──────────────────────
    const { completedCount, incompleteTasks } = readSprintProgress(phaseLabel, cwd);

    // ── 4. Recent git commits ────────────────────────────────────────────
    const recentCommits = readRecentCommits(cwd);

    // ── 5. Read milestone / roadmap headline ────────────────────────────
    const milestoneHint = readMilestoneHint(state, cwd);

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

    // ── 10. Relevance-ranked memory survival context (#958) ──────────────
    // Smaller budget than session-start — this rides alongside HANDOFF.json
    // as compaction survival context, not a full primer. Degrades silently
    // when .rcode/memory/ is missing or empty.
    const payload = { systemMessage: msgParts.join(' | ') };
    if (hasMemory(cwd)) {
      try {
        const selection = selectMemoryChunks(cwd, { defaultBudget: 600 });
        const additionalContext = formatMemoryContext(selection);
        if (additionalContext) {
          payload.hookSpecificOutput = {
            hookEventName: 'PreCompact',
            additionalContext,
          };
        }
      } catch { /* memory injection is advisory — never block compaction */ }
    }
    process.stdout.write(JSON.stringify(payload) + '\n');
    process.exit(0);
  } catch (err) {
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
  }
}

/**
 * Strip JSONC comments and trailing commas so a tolerant re-parse can tell a
 * commented-but-valid config from an actually broken one. Scans character by
 * character and tracks string state — a naive regex would eat the `//` in
 * "https://example.com" and turn a valid file into a reported syntax error.
 */
function stripJsonc(text) {
  let out = '';
  let inStr = false, esc = false, inLine = false, inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && next === '/') { inLine = true; i++; continue; }
    if (c === '/' && next === '*') { inBlock = true; i++; continue; }
    out += c;
  }
  // Trailing commas before } or ]
  return out.replace(/,(\s*[}\]])/g, '$1');
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
      // Fallback only. `git diff --name-only` reports the WHOLE dirty working
      // tree, not what this response touched — so one pre-existing dirty file
      // makes every Stop from now on report the same failure, forever, with
      // nothing the user did causing it. Scope it to files modified since the
      // response began where we can, and treat the result as advisory.
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
        // Guard the read: one unreadable file (permissions, a symlink that just
        // broke, a truncated write in flight) used to throw past this loop into
        // the outer catch, killing the check for EVERY other changed file and
        // printing a generic "Hook error" instead of naming anything.
        let text;
        try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
        try {
          JSON.parse(text);
        } catch (strictErr) {
          // Many real-world *.json files are JSONC: turbo.json, tsconfig.json,
          // jsconfig.json, .eslintrc.json, devcontainer.json, and VS Code's
          // settings/launch all permit // comments and trailing commas. Strict
          // JSON.parse calls those a syntax error, which made this hook fail on
          // every single Stop against a perfectly valid file. Retry tolerantly
          // and only report a failure when BOTH parses fail.
          try {
            JSON.parse(stripJsonc(text));
          } catch {
            failures.push(`${file}: ${strictErr.message}`);
          }
        }
      }
    }

    if (failures.length > 0) {
      // Don't re-report an identical failure set on every Stop. Without this a
      // single unfixable/irrelevant dirty file turns into an error banner on
      // every response for the rest of the session, which trains the user to
      // ignore the hook entirely — the one outcome that makes it worthless.
      const sig = failures.slice().sort().join('|');
      const seenPath = path.join(os.tmpdir(), `rcode-stop-verify-${process.ppid || 0}.txt`);
      let previous = '';
      try { previous = fs.readFileSync(seenPath, 'utf8'); } catch { /* first run */ }
      if (previous === sig) process.exit(0);
      try { fs.writeFileSync(seenPath, sig); } catch { /* best-effort */ }

      console.error('⚠ stop-verify: changed files failed syntax check:');
      failures.forEach((f) => console.error(`  • ${f}`));
      process.exit(1);
    }
    // Clear the dedupe marker once everything parses, so a genuine NEW failure
    // after a green run is reported rather than swallowed.
    try { fs.unlinkSync(path.join(os.tmpdir(), `rcode-stop-verify-${process.ppid || 0}.txt`)); } catch { /* fine */ }

    process.exit(0);
  } catch (err) {
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
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
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
  }
}

// INTENT_TABLE — keyword map for prompt-router (#892).
// Source of truth: rcode/workflows/do.md routing table (~285-320). First-match-wins.
// Loaded from data file to keep this file under 1000 lines (#896).
//
// Fail-open (#952 review H1): the load is wrapped so a MISSING data file degrades
// the prompt-router to a no-op instead of throwing at module-require time, which
// would crash EVERY hook subcommand (bash-guard, pre-edit, session-start, …) —
// not just the router.
//
// #952 follow-up: a missing data file used to degrade silently (empty table,
// zero output, no way for the user to know auto-detection is broken). It now
// still fails open — prompt-router still exits 0 and never blocks — but
// promptRouter() emits a one-time additionalContext warning pointing at the
// fix (`npx @hanzlaa/rcode update`) instead of no-op-ing forever.
let INTENT_TABLE = [];
let INTENT_TABLE_LOAD_ERROR = null;
try {
  INTENT_TABLE = JSON.parse(
    require('fs').readFileSync(
      require('path').join(__dirname, '..', 'data', 'intent-table.json'),
      'utf8'
    )
  );
} catch (err) {
  INTENT_TABLE = [];
  INTENT_TABLE_LOAD_ERROR = err;
}

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
 * Defaults to 'once-per-intent' when key is absent, file is missing, or value
 * is unknown — #953: 'every' re-nudged on every matching prompt during an
 * active session, which read as noise once the keyword matcher's false
 * positives compounded it. 'every' is still available as an opt-in.
 */
function readPromptNudgeToggle(cwd) {
  const VALID = new Set(['every', 'once-per-intent', 'when-stale', 'off']);
  try {
    const cfgPath = path.join(cwd, '.rcode', 'config.yaml');
    const text = fs.readFileSync(cfgPath, 'utf8');
    const parsed = parseSimpleYamlInline(text);
    const val = (parsed.prompt_nudge || '').trim().toLowerCase();
    return VALID.has(val) ? val : 'once-per-intent';
  } catch {
    return 'once-per-intent';
  }
}

/**
 * Returns true when state.json is older than the last commit, or absent in a .planning/ project.
 * Fail-open: returns true on any I/O error so the nudge fires rather than silently skips.
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
 * Word-boundary keyword match — #953: plain `lower.includes(kw)` matched
 * generic keywords like "bug" and "crash" inside unrelated words ("debugger",
 * "crashing"), over-firing the debug nudge. Boundaries are checked against
 * Unicode letters/numbers (not just ASCII \w) so Arabic/Urdu keyword phrases
 * still match correctly.
 */
function keywordMatches(lower, kw) {
  const kwLower = kw.toLowerCase();
  const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u');
  return re.test(lower);
}

/**
 * prompt-router: Nudge toward rcode commands for memory consistency (#892).
 * Reads stdin synchronously (NOT async — rejects bad JSON). Keyword-matches INTENT_TABLE,
 * emits additionalContext advisory. Gated by prompt_nudge config. Always exits 0.
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

    // ── Missing data file: warn once instead of silently no-op-ing (#952) ──
    // A consumer install missing rcode/data/intent-table.json used to degrade
    // to a permanent, invisible no-op — no output, no hint anything was wrong.
    // Warn once per machine (tmpdir marker keyed by project path) and point
    // at the fix, then continue with the (empty) table like before.
    if (INTENT_TABLE_LOAD_ERROR) {
      const warnKey = cwd.replace(/[^a-zA-Z0-9]/g, '_');
      const warnFile = path.join(os.tmpdir(), 'rcode-intent-table-missing-warned-' + warnKey);
      if (!fs.existsSync(warnFile)) {
        try { fs.writeFileSync(warnFile, String(process.pid)); } catch { /* fail open */ }
        const payload = {
          hookSpecificOutput: {
            hookEventName,
            additionalContext:
              'rcode/data/intent-table.json is missing — skill auto-detection from prompts is disabled. ' +
              'Run `npx @hanzlaa/rcode update` to reinstall the missing data files.',
          },
        };
        process.stdout.write(JSON.stringify(payload));
        process.exit(0);
      }
      process.exit(0);
    }

    // ── Keyword match (first-match-wins, case-insensitive, word-boundary) ─
    const lower = prompt.toLowerCase();
    let matched = null;
    for (const entry of INTENT_TABLE) {
      for (const kw of entry.keywords) {
        if (keywordMatches(lower, kw)) {
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
    // #956: dropped the "records the outcome in .rcode/state.json" claim —
    // most routed workflows (e.g. karpathy-audit) only write a report file,
    // they don't touch state.json, so the blanket claim was false.
    const advisory =
      `Use ${matched.command} for this ${matched.intent} task — it's the rcode workflow built for it. ` +
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
 * Maintains a per-session counter; warns at RCODE_NUDGE_THRESHOLD (default 50). Advisory only.
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

/** Returns true when a Read/Bash targets known large planning files (RESEARCH/SUMMARY/ROADMAP). */
function shouldNudgeCompact(toolName, toolInput) {
  if (toolName !== 'Read' && toolName !== 'Bash') return false;
  const target = toolInput?.file_path || toolInput?.command || '';
  return /RESEARCH\.md|SUMMARY\.md|ROADMAP\.md/.test(target);
}

/**
 * pre-tool-use: Strategic compact nudge before large file reads (#749).
 *
 * Triggered by the PreToolUse hook (Read + Bash tool names). Checks whether
 * the tool call targets a known large planning file and, if so, writes an
 * advisory line to stderr so the executor sees it without being interrupted.
 * Always exits 0 — never blocks the tool call.
 */
async function preToolUse() {
  try {
    const input = await readInputJson();
    const toolName = input.tool_name || input.toolName || '';
    const toolInput = input.tool_input || input.toolInput || {};

    if (shouldNudgeCompact(toolName, toolInput)) {
      process.stderr.write(
        '[rcode] Context nearing limit — consider /compact before the next large file read\n'
      );
    }

    process.exit(0);
  } catch {
    // Advisory hook must never break the session.
    process.exit(0);
  }
}

/**
 * stop: Stop hook — hedging-language detection (#744) + token/cost logging (#745).
 * Warns when response text suggests incomplete execution ("I'll implement this", etc.).
 * Appends per-response token usage to ~/.rcode/logs/token-usage.jsonl.
 * Rates: $3/M input, $15/M output (Sonnet 4.x approximation).
 * Never blocks.
 */
async function stopHandler() {
  try {
    const input = await readInputJson();
    const responseText = input?.response || '';
    const HEDGING_PATTERNS = [
      /I'll\s+implement\s+this/i,
      /I\s+would\s+add/i,
      /you\s+could\s+add/i,
      /TODO:/,
    ];
    const incomplete = HEDGING_PATTERNS.some((re) => re.test(responseText));
    if (incomplete) {
      process.stderr.write(
        '[rcode] Stop hook: response contains hedging language — verify implementation is complete\n'
      );
    }
    const usage = input?.usage;
    if (usage && typeof usage === 'object') {
      const logDir = path.join(os.homedir(), '.rcode', 'logs');
      fs.mkdirSync(logDir, { recursive: true });
      const entry = JSON.stringify({
        ts: new Date().toISOString(),
        input: usage.input_tokens || 0,
        output: usage.output_tokens || 0,
        cost_usd:
          ((usage.input_tokens || 0) * 3) / 1e6 +
          ((usage.output_tokens || 0) * 15) / 1e6,
      });
      fs.appendFileSync(path.join(logDir, 'token-usage.jsonl'), entry + '\n');
    }
    process.exit(0);
  } catch (err) {
    // Route through the circuit breaker: these inner catches are where hook
    // crashes actually surface (each handler catches its own errors and exits),
    // so main()'s .catch would never see them.
    const _tripped = recordCrash(process.argv[2], err.message);
    if (!_tripped) console.error(`Hook error: ${err.message}`);
    process.exit(_tripped ? 0 : 1);
  }
}

/**
 * session-start: Emit a one-line project status primer at session open. (#947)
 * Uses resolveActivePhase from state-reader.cjs. Advisory only — exits 0 on any error.
 */
function sessionStart() {
  try {
    try { fs.readFileSync(0, 'utf8'); } catch { /* drain stdin */ }
    const cwd = process.cwd();
    const statePath = path.join(cwd, '.rcode', 'state.json');
    if (!fs.existsSync(statePath)) process.exit(0);
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { process.exit(0); }
    const { activePhase, phaseLabel } = resolveActivePhase(state);
    if (!phaseLabel) process.exit(0);
    const phaseKey = String(activePhase?.number ?? phaseLabel);
    const phaseSprints = (Array.isArray(state.sprints) ? state.sprints : []).filter(s => String(s.phase) === phaseKey);
    const doneCount = phaseSprints.filter(s => s.status === 'completed' || s.status === 'complete').length;
    const sprintSummary = phaseSprints.length > 0 ? `${doneCount}/${phaseSprints.length} sprints done` : 'no sprints yet';
    const phaseStatus = activePhase?.status || 'planned';
    const nextCmd = phaseStatus === 'executing' ? '/rcode-execute'
      : phaseStatus === 'complete' ? '/rcode-add-phase'
      : phaseSprints.length === 0 ? `/rcode-plan ${phaseLabel}`
      : '/rcode-execute';
    const primer = `\u{1F4CD} Phase ${phaseLabel} ${phaseStatus} · ${sprintSummary} · next: ${nextCmd}`;

    // ── Relevance-ranked memory injection (#958) ─────────────────────────
    // Only attempted when .rcode/memory/ exists and has content — a missing
    // or empty memory bank degrades silently to the primer-only behavior
    // that predates this feature.
    const payload = { systemMessage: primer };
    if (hasMemory(cwd)) {
      try {
        const selection = selectMemoryChunks(cwd);
        const additionalContext = formatMemoryContext(selection);
        if (additionalContext) {
          payload.hookSpecificOutput = {
            hookEventName: 'SessionStart',
            additionalContext,
          };
        }
      } catch { /* memory injection is advisory — never block session start */ }
    }
    process.stdout.write(JSON.stringify(payload) + '\n');
  } catch { /* fail open — never block session start */ }
  process.exit(0);
}

// ── Circuit breaker ────────────────────────────────────────────────────
// A hook that CRASHES has nothing useful to say and will keep saying it on
// every single event. After THRESHOLD consecutive crashes, trip the breaker
// and stay quiet for the rest of the session rather than pollute every turn.
//
// This tracks CRASHES ONLY (the hook itself threw), never FINDINGS. A hook
// that exits non-zero because it correctly found a broken file is working;
// disabling it for doing its job would be the opposite of the intent.
const BREAKER_THRESHOLD = 3;

// Safety hooks are NEVER auto-disabled. bash-guard blocks `git push`,
// `--no-verify`, and `rm -rf`; pre-tool-use and pre-edit gate writes. A crashing
// guard must fail loudly and keep failing — silently disabling it converts a
// bug into an open door, which is a far worse outcome than a noisy terminal.
const NEVER_BREAK = new Set(['bash-guard', 'pre-tool-use', 'pre-edit', 'pre-workflow']);

function breakerPath(name) {
  return path.join(os.tmpdir(), `rcode-hook-breaker-${process.ppid || 0}-${name}.json`);
}

function breakerTripped(name) {
  if (NEVER_BREAK.has(name)) return false;
  try {
    const st = JSON.parse(fs.readFileSync(breakerPath(name), 'utf8'));
    return (st.crashes || 0) >= BREAKER_THRESHOLD;
  } catch { return false; }
}

function recordCrash(name, message) {
  if (NEVER_BREAK.has(name)) return false;
  let crashes = 0;
  try { crashes = JSON.parse(fs.readFileSync(breakerPath(name), 'utf8')).crashes || 0; } catch { /* first */ }
  crashes += 1;
  CRASH_RECORDED = true;
  try { fs.writeFileSync(breakerPath(name), JSON.stringify({ crashes, last: message })); } catch { /* best-effort */ }
  if (crashes >= BREAKER_THRESHOLD) {
    console.error(
      `⚠ rcode hook '${name}' crashed ${crashes}x in a row — disabling it for this session ` +
      `so it stops repeating. Last error: ${message}`
    );
    console.error(`  Re-enable: restart the session, or fix and run 'node .rcode/bin/rcode-hooks.cjs ${name}' directly to see the full error.`);
    return true;
  }
  return false;
}

function clearCrashes(name) {
  try { fs.unlinkSync(breakerPath(name)); } catch { /* nothing to clear */ }
}

// Every handler exits from inside itself, so a `.then()` on main() would almost
// never run. Hook the process exit instead: any clean exit means this hook ran
// without crashing, so the consecutive-crash count resets. Without this, three
// crashes spread across an entire session would trip the breaker even though
// the hook worked fine in between.
let CRASH_RECORDED = false;
function installBreakerReset(name) {
  if (!name || NEVER_BREAK.has(name)) return;
  process.on('exit', (code) => {
    if (code === 0 && !CRASH_RECORDED) clearCrashes(name);
  });
}

/**
 * Main entry point.
 */
async function main() {
  const subcommand = process.argv[2];

  // Already tripped this session — exit silently. Advisory hooks only.
  if (breakerTripped(subcommand)) process.exit(0);
  installBreakerReset(subcommand);

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
    case 'stop':
      await stopHandler();
      break;
    case 'compact-nudge':
      await compactNudge();
      break;
    case 'pre-tool-use':
      await preToolUse();
      break;
    case 'prompt-router':
      promptRouter(); // synchronous — exits inside; never falls through to async path
      break;
    case 'session-start':
      sessionStart();
      break;
    case 'drift':
      driftCommand();
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error('Usage: rcode-hooks.cjs pre-edit|pre-workflow|post-commit|bash-guard|pre-compact|stop-verify|cost-track|stop|compact-nudge|pre-tool-use|prompt-router|session-start|drift');
      process.exit(1);
  }
}

if (require.main === module) {
  const name = process.argv[2];
  main()
    .then(() => clearCrashes(name))
    .catch((err) => {
      const tripped = recordCrash(name, err.message);
      if (!tripped) console.error(`Fatal error: ${err.message}`);
      // Advisory hooks exit 0 once tripped so the harness stops surfacing them;
      // guard hooks (never tripped) keep their non-zero exit.
      process.exit(tripped ? 0 : 1);
    });
}

module.exports = { INTENT_TABLE };
