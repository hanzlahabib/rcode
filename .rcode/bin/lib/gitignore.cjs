/**
 * Gitignore — extracted from rcode-tools.cjs (issue #204).
 */

const fs = require('fs');
const path = require('path');

/**
 * cmdGitignore — re-render the rcode-managed block in .gitignore based on
 * current config (specifically commit_planning from .rcode/config.yaml).
 *
 * Subcommands:
 *   gitignore refresh   rewrite the rcode block in-place
 *   gitignore status    report current commit_planning + block presence
 *
 * Mirrors the logic in cli/install.js ensureRcodeGitignore — kept in sync
 * by convention. Any change to the block format should update both.
 * Closes #189 — runtime toggle for commit_planning.
 */
function cmdGitignore(args, { PROJECT_ROOT, RCODE_DIR }) {
  const sub = args[0] || 'refresh';
  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
  const configPath = path.join(RCODE_DIR, 'config.yaml');

  // Read commit_planning from config; default true if missing.
  let commitPlanning = true;
  if (fs.existsSync(configPath)) {
    const cfg = fs.readFileSync(configPath, 'utf8');
    const m = cfg.match(/^\s*commit_planning:\s*(true|false)\s*$/m);
    if (m) commitPlanning = (m[1] === 'true');
  }

  const BEGIN = '# ===== rcode-managed gitignore block (npx @hanzlaa/rcode install) =====';
  const END   = '# ===== end rcode-managed gitignore block =====';

  if (sub === 'status') {
    const exists = fs.existsSync(gitignorePath);
    const hasBlock = exists && fs.readFileSync(gitignorePath, 'utf8').includes(BEGIN);
    return {
      ok: true,
      gitignore_exists: exists,
      block_present: hasBlock,
      commit_planning: commitPlanning,
    };
  }

  if (sub !== 'refresh') {
    return { ok: false, error: `Unknown gitignore subcommand: ${sub}. Try: refresh | status` };
  }

  const lines = [
    '',
    BEGIN,
    '# Added automatically on rcode install. Idempotent — safe to re-run.',
    '# Edit `commit_planning` in .rcode/config.yaml, then: rcode-tools gitignore refresh',
    '',
    '# Installed methodology files (regenerate with: npx @hanzlaa/rcode install)',
    '.claude/',
    '.rcode/bin/',
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
    '# Runtime noise',
    'node_modules/',
    '.rcode/state.json.lock',
    '.planning/debug/',
    '.planning/_backup/',
  ];
  if (!commitPlanning) {
    lines.push('', '# Planning artifacts — kept local (commit_planning: false)', '.planning/');
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

  /** Replace the rcode block in text using indexOf — safer than regex. */
  function spliceBlock(existing, newBlock) {
    const start = existing.indexOf(BEGIN);
    if (start < 0) return null;
    const endIdx = existing.indexOf(END, start);
    if (endIdx < 0) return null;
    // Include trailing newline after END if present, and leading newline before BEGIN.
    let sliceStart = start;
    if (sliceStart > 0 && existing[sliceStart - 1] === '\n') sliceStart -= 1;
    let sliceEnd = endIdx + END.length;
    if (existing[sliceEnd] === '\n') sliceEnd += 1;
    return existing.slice(0, sliceStart) + newBlock + existing.slice(sliceEnd);
  }

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, BLOCK);
    return { ok: true, action: 'created', commit_planning: commitPlanning };
  }
  const existing = fs.readFileSync(gitignorePath, 'utf8');
  if (existing.includes(BEGIN)) {
    const rewritten = spliceBlock(existing, BLOCK);
    if (rewritten !== null && rewritten !== existing) {
      fs.writeFileSync(gitignorePath, rewritten);
      return { ok: true, action: 'updated', commit_planning: commitPlanning };
    }
    return { ok: true, action: 'no-change', commit_planning: commitPlanning };
  }
  fs.writeFileSync(gitignorePath, existing + BLOCK);
  return { ok: true, action: 'appended', commit_planning: commitPlanning };
}

module.exports = { cmdGitignore };
