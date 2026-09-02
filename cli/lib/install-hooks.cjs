/**
 * cli/lib/install-hooks.cjs — install-time preference resolution (commit
 * planning, guardrail hooks) and idempotent marked-block writers for
 * .gitignore, IDE rule files (CLAUDE.md/AGENTS.md/.mdc), and the git
 * pre-commit hook.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change.
 */

const fs = require('fs');
const path = require('path');
const clack = require('@clack/prompts');
const { writeFileAtomic } = require('./fsutil.cjs');
const { PACKAGE_ROOT } = require('./install-shared.cjs');

/**
 * Resolve commit-planning preference — CLI flag wins, then interactive
 * prompt (when TTY + not --yes), else default to true (commit planning
 * artifacts so they version with the code). #189.
 */
async function resolveCommitPlanning(opts) {
  if (opts.commitPlanning !== null) return opts.commitPlanning;
  if (opts.global) return false; // global install: no planning artifacts
  if (opts.noPrompt) return true; // non-interactive project install: commit planning by default (#936)

  // Issue #685: on re-install, read the existing .rcode/config.yaml and use
  // its commit_planning value as the default. Otherwise the new prompt
  // answer overwrites .gitignore but NOT config.yaml, leaving two sources of
  // truth that silently diverge. Users on re-install almost always want to
  // KEEP their existing setting unless they explicitly pass --commit-planning.
  let existingValue = null;
  try {
    const cfgPath = path.join(opts.target, '.rcode', 'config.yaml');
    if (fs.existsSync(cfgPath)) {
      const cfg = fs.readFileSync(cfgPath, 'utf8');
      const m = cfg.match(/^commit_planning:\s*(true|false)\s*$/m);
      if (m) existingValue = m[1] === 'true';
    }
  } catch { /* fall through to prompt */ }

  if (opts.yes || !process.stdin.isTTY) {
    return existingValue !== null ? existingValue : true; // honor existing on re-install
  }

  const initialValue = existingValue === false ? 'gitignore' : 'commit';
  const choice = await clack.select({
    message: existingValue !== null
      ? '📋 .planning/ tracking — current setting preserved unless you change it.'
      : '📋 .planning/ holds PRDs, roadmaps, sprints, SUMMARY files. How should they be tracked?',
    initialValue,
    options: [
      { value: 'commit',    label: 'Commit',    hint: 'collaborators see the same plans (recommended)' },
      { value: 'gitignore', label: 'Gitignore', hint: 'planning stays local (good for sensitive PRDs)' },
    ],
  });

  if (clack.isCancel(choice)) {
    clack.cancel('Install cancelled.');
    process.exit(0);
  }

  return choice === 'commit';
}

/**
 * Resolve whether to merge rcode's guardrail hooks (pre-edit, bash-guard,
 * prompt-router, etc.) into .claude/settings.json at install time. Default
 * is ON — flag wins, else interactive confirm (Y default) on TTY installs,
 * else default-on for --yes/--no-prompt/non-TTY runs so hooks work out of
 * the box without requiring a separate /rcode-enable-hooks step.
 */
async function resolveEnableHooks(opts) {
  if (opts.enableHooks !== null) return opts.enableHooks;
  if (opts.global) return false; // global install has no project-local .claude/settings.json target
  if (!opts.ides.includes('claude')) return false; // hooks are Claude Code specific
  if (opts.noPrompt || opts.yes || !process.stdin.isTTY) return true;

  const enable = await clack.confirm({
    message: '🛡️  Enable rcode guardrail hooks in .claude/settings.json? (pre-edit checks, bash-guard, prompt-router, etc.)',
    initialValue: true,
  });

  if (clack.isCancel(enable)) {
    clack.cancel('Install cancelled.');
    process.exit(0);
  }

  return enable;
}

/**
 * Merge rcode's opt-in guardrail hooks (rcode/templates/settings-hooks.json)
 * into .claude/settings.json. Idempotent — skips matcher+command pairs that
 * already exist. Mirrors the /rcode-enable-hooks workflow so a fresh install
 * doesn't require running that command separately.
 *
 * Returns: { action: 'merged' | 'skipped-flag' | 'skipped-template-missing' | 'skipped-error' }
 */
function ensureRcodeSettingsHooks(target, options = {}) {
  if (options.enableHooks !== true) return { action: 'skipped-flag' };

  const templatePath = path.join(PACKAGE_ROOT, 'rcode', 'templates', 'settings-hooks.json');
  if (!fs.existsSync(templatePath)) return { action: 'skipped-template-missing' };

  let template;
  try {
    template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  } catch {
    return { action: 'skipped-error' };
  }

  const settingsDir = path.join(target, '.claude');
  const settingsPath = path.join(settingsDir, 'settings.json');

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      return { action: 'skipped-error' };
    }
  }

  settings.hooks = settings.hooks || {};

  // An rcode-owned hook entry is any command that runs rcode-hooks.cjs. Match on
  // the subcommand it dispatches (pre-edit, stop, bash-guard, …) so a superseded
  // form of the SAME hook is replaced rather than accumulated beside the new one.
  // Two command shapes exist in the wild and both must resolve to the same
  // subcommand, or a superseded entry is never recognised as superseded:
  //   pre-v4.12.1:  node .rcode/bin/rcode-hooks.cjs stop
  //   current:      sh -c 'H=".rcode/bin/rcode-hooks.cjs"; … exec node "$H" stop || exit 0'
  // In the current form the path and the subcommand are far apart, so a pattern
  // anchored on the filename finds nothing.
  const VALID_SUBS = new Set([
    'pre-edit', 'pre-workflow', 'post-commit', 'bash-guard', 'pre-compact',
    'stop-verify', 'cost-track', 'stop', 'compact-nudge', 'pre-tool-use',
    'prompt-router', 'session-start', 'drift',
  ]);
  const rcodeHookSub = (cmd) => {
    if (typeof cmd !== 'string' || !cmd.includes('rcode-hooks.cjs')) return null;
    const direct = cmd.match(/rcode-hooks\.cjs["']?\s+([a-z-]+)/);
    if (direct && VALID_SUBS.has(direct[1])) return direct[1];
    const viaVar = cmd.match(/\$H["']?\s+([a-z-]+)/);
    if (viaVar && VALID_SUBS.has(viaVar[1])) return viaVar[1];
    return null;
  };

  let replaced = 0;
  for (const [hookType, matchers] of Object.entries(template.hooks || {})) {
    settings.hooks[hookType] = settings.hooks[hookType] || [];
    for (const incoming of matchers) {
      let existingMatcher = settings.hooks[hookType].find((m) => m.matcher === incoming.matcher);
      if (!existingMatcher) {
        existingMatcher = { matcher: incoming.matcher, hooks: [] };
        settings.hooks[hookType].push(existingMatcher);
      }
      for (const hook of incoming.hooks) {
        const sub = rcodeHookSub(hook.command);

        // Drop any rcode-owned entry for the same subcommand whose command text
        // differs from what we are installing. Purely additive merging is how a
        // project ends up running BOTH the pre-v4.12.1 bare
        // `node .rcode/bin/rcode-hooks.cjs stop` and its worktree-safe
        // replacement — the old one then throws MODULE_NOT_FOUND on every event
        // inside a worktree, forever, and no amount of reinstalling removes it.
        // Only rcode's own entries are touched; a user's or another tool's hooks
        // never match rcodeHookSub().
        if (sub) {
          // Sweep EVERY matcher block for this hook type, not just the one we
          // matched. A stale entry commonly sits under a different matcher than
          // the template now uses, and a per-block filter walks straight past it
          // — which is how the superseded command survived a reinstall.
          for (const block of settings.hooks[hookType]) {
            if (!Array.isArray(block.hooks)) continue;
            const before = block.hooks.length;
            block.hooks = block.hooks.filter((h) =>
              !(rcodeHookSub(h.command) === sub && h.command !== hook.command));
            replaced += before - block.hooks.length;
          }
        }

        const dup = existingMatcher.hooks.some((h) => h.command === hook.command && h.type === hook.type);
        if (!dup) existingMatcher.hooks.push(hook);
      }
    }
  }

  try {
    fs.mkdirSync(settingsDir, { recursive: true });
    writeFileAtomic(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    return { action: 'merged', replaced };
  } catch {
    return { action: 'skipped-error' };
  }
}

/**
 * Ensure the target project's .gitignore has the rcode-managed block.
 *
 * Idempotent via a sentinel comment line. On first install, appends a block
 * that separates:
 *   - installed methodology files (ignored; re-install to refresh)
 *   - user's project config, state, and planning artifacts (committable)
 *
 * If the user already has a block (marker present) we leave their customizations
 * alone. This function is best-effort — never throws. A missing .gitignore
 * is created. A read/write error is logged and install continues.
 *
 * Returns: { action: 'created' | 'appended' | 'already-present' | 'skipped-error' }
 */
function ensureRcodeGitignore(target, options = {}) {
  const commitPlanning = options.commitPlanning !== false; // default true
  const BEGIN = '# ===== rcode-managed gitignore block (npx @hanzlaa/rcode install) =====';
  const END   = '# ===== end rcode-managed gitignore block =====';

  const lines = [
    '',
    BEGIN,
    '# Added automatically on first rcode install. Idempotent — safe to re-run.',
    '# Edit `commit_planning` in .rcode/config.yaml to flip planning-artifact tracking.',
    '',
    '# Installed methodology files (regenerate with: npx @hanzlaa/rcode install)',
    '.claude/',
    '.rcode/bin/',
    '.rcode/data/',
    '.rcode/workflows/',
    '.rcode/references/',
    '.rcode/commands/',
    '.rcode/skills/',
    '',
    '# Pulled rcode brain content (refresh with: rcode brain pull)',
    '.rcode/brain/rcode-github/',
    '.rcode/brain/rcode-docs/',
    '.rcode/brain/best-practices/',
    '',
    '# Personal customization layer — team overrides (.rcode/custom/<name>.md)',
    '# ARE committed; the .user.md layer is per-developer and is not.',
    '.rcode/custom/*.user.md',
    '',
    '# Runtime noise',
    'node_modules/',
    '.rcode/state.json.lock',
    '.planning/debug/',
    '.planning/_backup/',
  ];

  if (!commitPlanning) {
    lines.push(
      '',
      '# Planning artifacts — kept local (commit_planning: false)',
      '.planning/'
    );
  }

  lines.push(
    '',
    '# What you DO commit:',
    '#   .rcode/config.yaml        - project mode/language/profile/commit_planning',
    '#   .rcode/state.json         - decisions, roadmap pointer, blockers',
    '#   .rcode/brain/sources.yaml - brain source manifest',
    commitPlanning
      ? '#   .planning/                - PRD, roadmap, sprints, SUMMARY.md files'
      : '#   (planning artifacts are NOT committed — see commit_planning in config)',
    END,
    ''
  );
  const BLOCK = lines.join('\n');

  const gitignorePath = path.join(target, '.gitignore');
  try {
    if (!fs.existsSync(gitignorePath)) {
      writeFileAtomic(gitignorePath, BLOCK);
      return { action: 'created' };
    }
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    // Replace existing rcode block using indexOf (regex escaping on the
    // sentinel is fiddly — indexOf is deterministic and easier to audit).
    function spliceBlock(text, newBlock) {
      const start = text.indexOf(BEGIN);
      if (start < 0) return null;
      const endIdx = text.indexOf(END, start);
      // If BEGIN exists but END is missing (manual edit removed it), strip
      // everything from BEGIN to EOF and rewrite — avoids duplicate blocks.
      if (endIdx < 0) {
        let sliceStart = start;
        if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
        return text.slice(0, sliceStart) + newBlock;
      }
      let sliceStart = start;
      if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
      let sliceEnd = endIdx + END.length;
      if (text[sliceEnd] === '\n') sliceEnd += 1;
      return text.slice(0, sliceStart) + newBlock + text.slice(sliceEnd);
    }
    if (existing.includes(BEGIN)) {
      const rewritten = spliceBlock(existing, BLOCK);
      if (rewritten !== null && rewritten !== existing) {
        writeFileAtomic(gitignorePath, rewritten);
        return { action: 'updated' };
      }
      return { action: 'already-present' };
    }
    writeFileAtomic(gitignorePath, existing + BLOCK);
    return { action: 'appended' };
  } catch (err) {
    return { action: 'skipped-error', error: err.message };
  }
}

/**
 * Splice a BEGIN/END-delimited block into a text file, creating the file if
 * missing, replacing the block in place if a prior version exists, or
 * appending if the file exists without the block yet. Shared by any
 * "own one marked section of a user-owned file" writer (gitignore, rule
 * files, etc.) so the splice logic (and its edge cases — missing END,
 * trailing newlines) lives in one place.
 *
 * Returns: { action: 'created' | 'appended' | 'updated' | 'already-present' | 'skipped-error', error? }
 */
function spliceMarkedBlockIntoFile(filePath, begin, end, block) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileAtomic(filePath, block);
      return { action: 'created' };
    }
    const existing = fs.readFileSync(filePath, 'utf8');

    function splice(text, newBlock) {
      const start = text.indexOf(begin);
      if (start < 0) return null;
      const endIdx = text.indexOf(end, start);
      if (endIdx < 0) {
        let sliceStart = start;
        if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
        return text.slice(0, sliceStart) + newBlock;
      }
      let sliceStart = start;
      if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
      let sliceEnd = endIdx + end.length;
      if (text[sliceEnd] === '\n') sliceEnd += 1;
      return text.slice(0, sliceStart) + newBlock + text.slice(sliceEnd);
    }

    if (existing.includes(begin)) {
      const rewritten = splice(existing, block);
      if (rewritten !== null && rewritten !== existing) {
        writeFileAtomic(filePath, rewritten);
        return { action: 'updated' };
      }
      return { action: 'already-present' };
    }
    const sep = existing.endsWith('\n') ? '\n' : '\n\n';
    writeFileAtomic(filePath, existing + sep + block);
    return { action: 'appended' };
  } catch (err) {
    return { action: 'skipped-error', error: err.message };
  }
}

/**
 * Ensure every installed IDE's rule file carries a short, rcode-owned block
 * pointing agents at `/rcode-do` as the preferred entry point for non-trivial
 * work. This is NOT a full CLAUDE.md/AGENTS.md rewrite — it only owns its own
 * marked section (or, for cursor/windsurf, a dedicated rcode-* rule file) so
 * a project's existing rule content is never touched or reordered.
 *
 * - claude / vscode → root CLAUDE.md (splice, file created if missing)
 * - codex           → root AGENTS.md (splice, file created if missing)
 * - cursor          → .cursor/rules/rcode-prefer-do.mdc (dedicated, always rewritten)
 * - windsurf        → .windsurf/rules/rcode-prefer-do.mdc (dedicated, always rewritten)
 * - gemini / antigravity / grok → skipped (no single canonical project rule file yet)
 *
 * Returns: { [ide]: { action, error? } } per IDE actually written.
 */
function ensureRcodePreferredCommandRule(target, ides) {
  const results = {};
  const idSet = new Set(ides || []);

  const md = (heading) => [
    `## ${heading}`,
    '',
    'This project has [rcode](https://www.npmjs.com/package/@hanzlaa/rcode) installed —',
    'persistent project memory, specialist agents, and structured workflows under `.rcode/`.',
    '',
    'For any non-trivial task (new feature, bug fix that needs investigation, multi-file',
    'change, planning) prefer routing through **`/rcode-do <task description>`** — rcode\'s',
    'command picker — instead of working ad hoc. It picks the right rcode command (plan,',
    'execute, review, debug, etc.) for the task and keeps `.rcode/state.json` and the',
    'Memory Bank in sync. Skip it only for trivial single-line/single-file edits that',
    'don\'t need planning or memory.',
  ].join('\n');

  if (idSet.has('claude') || idSet.has('vscode')) {
    const BEGIN = '<!-- ===== rcode-managed rule block (npx @hanzlaa/rcode install) ===== -->';
    const END = '<!-- ===== end rcode-managed rule block ===== -->';
    const block = `${BEGIN}\n\n${md('Working with rcode')}\n\n${END}\n`;
    results.claude = spliceMarkedBlockIntoFile(path.join(target, 'CLAUDE.md'), BEGIN, END, block);
  }

  if (idSet.has('codex')) {
    const BEGIN = '<!-- ===== rcode-managed rule block (npx @hanzlaa/rcode install) ===== -->';
    const END = '<!-- ===== end rcode-managed rule block ===== -->';
    const block = `${BEGIN}\n\n${md('Working with rcode')}\n\n${END}\n`;
    results.codex = spliceMarkedBlockIntoFile(path.join(target, 'AGENTS.md'), BEGIN, END, block);
  }

  if (idSet.has('cursor')) {
    const content = [
      '---',
      'description: Prefer rcode\'s /rcode-do command for non-trivial work',
      'alwaysApply: true',
      '---',
      '',
      md('Working with rcode'),
      '',
    ].join('\n');
    try {
      const p = path.join(target, '.cursor', 'rules', 'rcode-prefer-do.mdc');
      fs.mkdirSync(path.dirname(p), { recursive: true });
      writeFileAtomic(p, content);
      results.cursor = { action: 'written' };
    } catch (err) {
      results.cursor = { action: 'skipped-error', error: err.message };
    }
  }

  if (idSet.has('windsurf')) {
    const content = [
      '---',
      'description: Prefer rcode\'s /rcode-do command for non-trivial work',
      'trigger: always_on',
      '---',
      '',
      md('Working with rcode'),
      '',
    ].join('\n');
    try {
      const p = path.join(target, '.windsurf', 'rules', 'rcode-prefer-do.mdc');
      fs.mkdirSync(path.dirname(p), { recursive: true });
      writeFileAtomic(p, content);
      results.windsurf = { action: 'written' };
    } catch (err) {
      results.windsurf = { action: 'skipped-error', error: err.message };
    }
  }

  return results;
}

/**
 * Ensure .git/hooks/pre-commit includes the rcode-managed block that auto-syncs
 * state.json when .planning/ or .rcode/brain/sources.yaml files change.
 *
 * Idempotent via sentinels — existing user hook content is preserved.
 * Respects opts.gitHooks: false → skip entirely (--no-git-hooks flag).
 *
 * Returns: { action: 'created' | 'appended' | 'already-present' | 'skipped-no-git' | 'skipped-flag' | 'skipped-error' }
 */
function ensureRcodePreCommitHook(target, options = {}) {
  if (options.gitHooks === false) return { action: 'skipped-flag' };

  const gitDir = path.join(target, '.git');
  if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
    return { action: 'skipped-no-git' };
  }

  const BEGIN = '# ===== rcode-managed pre-commit block =====';
  const END   = '# ===== end rcode pre-commit block =====';

  const BLOCK = [
    '',
    BEGIN,
    '# Auto-syncs .rcode/state.json when planning files change.',
    '# Added by rcode install — safe to re-run (idempotent).',
    'if git diff --cached --name-only | grep -qE "^\\.planning/|^\\.rcode/brain/sources\\.yaml$"; then',
    '  if [ -x .rcode/bin/rcode-tools.cjs ]; then',
    '    # Never silence this. A swallowed sync is how a project reaches 35',
    '    # executed sprints with executions:0 and nobody is told.',
    '    if ! _rcode_sync=$(node .rcode/bin/rcode-tools.cjs state sync --from-disk 2>&1); then',
    '      echo "rcode: state sync --from-disk failed (commit continues):" >&2',
    '      echo "$_rcode_sync" | tail -3 >&2',
    '    fi',
    '    git add .rcode/state.json 2>/dev/null || true',
    '  fi',
    'fi',
    END,
    '',
  ].join('\n');

  const hooksDir = path.join(gitDir, 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');

  try {
    fs.mkdirSync(hooksDir, { recursive: true });

    if (!fs.existsSync(hookPath)) {
      writeFileAtomic(hookPath, `#!/bin/sh\n${BLOCK}`, { mode: 0o755 });
      return { action: 'created' };
    }

    const existing = fs.readFileSync(hookPath, 'utf8');

    function spliceBlock(text, newBlock) {
      const start = text.indexOf(BEGIN);
      if (start < 0) return null;
      const endIdx = text.indexOf(END, start);
      // If BEGIN exists but END is missing, strip from BEGIN to EOF and rewrite.
      if (endIdx < 0) {
        let sliceStart = start;
        if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
        return text.slice(0, sliceStart) + newBlock;
      }
      let sliceStart = start;
      if (sliceStart > 0 && text[sliceStart - 1] === '\n') sliceStart -= 1;
      let sliceEnd = endIdx + END.length;
      if (text[sliceEnd] === '\n') sliceEnd += 1;
      return text.slice(0, sliceStart) + newBlock + text.slice(sliceEnd);
    }

    if (existing.includes(BEGIN)) {
      const rewritten = spliceBlock(existing, BLOCK);
      if (rewritten !== null && rewritten !== existing) {
        writeFileAtomic(hookPath, rewritten, { mode: 0o755 });
        return { action: 'updated' };
      }
      return { action: 'already-present' };
    }

    writeFileAtomic(hookPath, existing + BLOCK, { mode: 0o755 });
    return { action: 'appended' };
  } catch (err) {
    return { action: 'skipped-error', error: err.message };
  }
}

module.exports = {
  resolveCommitPlanning,
  resolveEnableHooks,
  ensureRcodeSettingsHooks,
  ensureRcodeGitignore,
  spliceMarkedBlockIntoFile,
  ensureRcodePreferredCommandRule,
  ensureRcodePreCommitHook,
};
