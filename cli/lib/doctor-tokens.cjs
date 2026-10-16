/**
 * cli/lib/doctor-tokens.cjs — `rcode doctor --tokens` (#1114).
 *
 * Measures the fixed per-turn context rcode adds, from what is ON DISK, per
 * install scope: the name + description of every rcode skill, slash command
 * and subagent the host lists each turn, plus the rcode-managed block in
 * CLAUDE.md. Uses the same estimator as the CI gate (token-estimate.cjs).
 * Strictly read-only.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { homedir } = require('./homedir.cjs');
const { tokens, lineChars, readFrontmatter } = require('./token-estimate.cjs');
const { readPersistedProfile } = require('./install-profile.cjs');

// The minimal-profile gate in scripts/token-budget.cjs is 2450 for the listing
// alone; 5.0k is the acceptance ceiling from #1114 for the whole fixed context.
const MINIMAL_GATE_TOKENS = 5000;
const SLIM_HINT = 'Slim it with `rcode install --global --profile minimal` '
  + '(if your rcode version does not support --profile yet, upgrade rcode first).';

const BLOCK_BEGIN = '<!-- ===== rcode-managed rule block';
const BLOCK_END = '<!-- ===== end rcode-managed rule block ===== -->';

const readLf = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const isTrue = (v) => String(v).trim() === 'true';

function listDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

const summarize = (items) => ({
  count: items.length,
  tokens: tokens(items.reduce((n, item) => n + lineChars(item), 0)),
});

function measureSkills(claudeDir) {
  const items = [];
  for (const e of listDir(path.join(claudeDir, 'skills'))) {
    if (!e.name.startsWith('rcode-')) continue;
    const file = path.join(claudeDir, 'skills', e.name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const fm = readFrontmatter(readLf(file));
    // disable-model-invocation skills are not listed to the model.
    if (isTrue(fm['disable-model-invocation'])) continue;
    items.push({ name: e.name, description: fm.description || '' });
  }
  return summarize(items);
}

function measureMarkdownDir(dir, nameFrom) {
  const items = [];
  for (const e of listDir(dir)) {
    if (!e.isFile() || !e.name.startsWith('rcode-') || !e.name.endsWith('.md')) continue;
    const id = e.name.slice(0, -3);
    const fm = readFrontmatter(readLf(path.join(dir, e.name)));
    items.push({ name: nameFrom(fm, id), description: fm.description || '' });
  }
  return summarize(items);
}

/** Chars of the rcode-managed block in the first CLAUDE.md that has one. */
function measureClaudeBlock(candidates) {
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = readLf(file);
    const start = text.indexOf(BLOCK_BEGIN);
    const end = text.indexOf(BLOCK_END);
    if (start === -1 || end === -1 || end < start) continue;
    const block = text.slice(start, end + BLOCK_END.length);
    return { file, tokens: tokens(block.length) };
  }
  return { file: null, tokens: 0 };
}

/** One scope: `claudeDir` is its .claude dir, `root` the install target. */
function measureScope(label, root, claudeDir, claudeMdCandidates) {
  const skills = measureSkills(claudeDir);
  const commands = measureMarkdownDir(path.join(claudeDir, 'commands'), (fm, id) => id);
  const agents = measureMarkdownDir(path.join(claudeDir, 'agents'), (fm, id) => fm.name || id);
  const claudeMd = measureClaudeBlock(claudeMdCandidates);
  const total = skills.tokens + commands.tokens + agents.tokens + claudeMd.tokens;
  return {
    scope: label,
    root,
    installed: skills.count + commands.count + agents.count > 0 || claudeMd.file !== null,
    profile: readPersistedProfile(root),
    skills,
    commands,
    agents,
    claudeMd,
    total,
    overGate: total > MINIMAL_GATE_TOKENS,
  };
}

function measureTokens(cwd) {
  const home = homedir();
  const scopes = [
    measureScope('global', home, path.join(home, '.claude'),
      [path.join(home, '.claude', 'CLAUDE.md'), path.join(home, 'CLAUDE.md')]),
  ];
  // Running from $HOME makes the project scope the global scope; count it once.
  if (path.resolve(cwd) !== path.resolve(home)) {
    scopes.push(measureScope('project', cwd, path.join(cwd, '.claude'),
      [path.join(cwd, 'CLAUDE.md'), path.join(cwd, '.claude', 'CLAUDE.md')]));
  }
  const total = scopes.reduce((n, s) => n + s.total, 0);
  return { estimator: 'chars/4', gate: MINIMAL_GATE_TOKENS, scopes, total, overGate: total > MINIMAL_GATE_TOKENS };
}

function formatTokens(result) {
  const lines = [`Fixed per-turn context added by rcode (estimated, ${result.estimator}):`];
  for (const s of result.scopes) {
    lines.push('', `${s.scope} (${s.root})  profile: ${s.profile ?? 'none'}`);
    if (!s.installed) { lines.push('  no rcode install found'); continue; }
    lines.push(
      `  skill descriptions    ${String(s.skills.count).padStart(4)}  ${String(s.skills.tokens).padStart(6)} tok`,
      `  command descriptions  ${String(s.commands.count).padStart(4)}  ${String(s.commands.tokens).padStart(6)} tok`,
      `  agent descriptions    ${String(s.agents.count).padStart(4)}  ${String(s.agents.tokens).padStart(6)} tok`,
      `  CLAUDE.md rcode block ${s.claudeMd.file ? '   1' : '   0'}  ${String(s.claudeMd.tokens).padStart(6)} tok`,
      `  scope total                 ${String(s.total).padStart(6)} tok`,
    );
  }
  lines.push('', `Total: ${result.total} tok (gate ${result.gate})`);
  if (result.overGate) lines.push(`Over the ${result.gate} gate. ${SLIM_HINT}`);
  return lines.join('\n');
}

module.exports = { measureTokens, formatTokens, MINIMAL_GATE_TOKENS };
