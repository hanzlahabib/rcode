#!/usr/bin/env node
/**
 * scripts/token-budget.cjs — deterministic token-budget gate.
 *
 * Computes, from the repo SOURCE and rcode/profiles.yaml (no install needed):
 *   1. the fixed listing cost per install profile: the name + description of
 *      every skill, slash command and subagent Claude Code lists on every turn
 *      (honoring `disable-model-invocation`, `internal`, and the profile
 *      allow-lists);
 *   2. the "direct" cost of the most-used commands: the command file plus the
 *      `@.rcode/...` files it inlines at invocation (one level; nested includes
 *      are an unverified upper bound and are not counted).
 *
 * Tokens are chars / 4: crude but stable, dependency-free and monotonic, which
 * is what a regression gate needs.
 *
 * Usage: node scripts/token-budget.cjs [--json]
 * Exit 1 when any figure exceeds its threshold.
 */

const fs = require('fs');
const path = require('path');
const { loadProfiles } = require('../cli/lib/install-profile.cjs');
const { loadPurposes, effectiveProfiles } = require('../cli/lib/install-purpose.cjs');

const REPO = path.resolve(__dirname, '..');
const SOURCE = path.join(REPO, 'rcode');
const CHARS_PER_TOKEN = 4;
// Per listed item the host prints roughly "- <name>: <description>" plus
// framing; 4 chars is the same overhead the design budget used.
const LISTING_LINE_OVERHEAD_CHARS = 4;
const SKILL_BUCKETS = ['agents', 'actions', 'core', 'seo', 'dev-practices'];
// Commands that get a generated sidebar skill stub (cli/generate-command-skills.cjs).
const SIDEBAR_STUB_COMMANDS = ['do'];

// Thresholds = measured value at the end of the token diet (umbrella #1101)
// plus ~15% headroom, so ordinary edits pass and a regression to verbose
// descriptions or fat orchestrators fails. Raise them only with a reason.
const LISTING_THRESHOLDS = { minimal: 2450, full: 9250 };
// Each purpose bundle is measured as minimal + that purpose alone (what
// `--purpose <name>` installs). Same rule: measured value plus ~15% headroom.
const PURPOSE_THRESHOLDS = { frontend: 3100, seo: 3220, strategy: 4330, audits: 3820 };
const DIRECT_THRESHOLDS = {
  plan: 1070,
  execute: 870,
  do: 3170,
  'discuss-phase': 950,
  'new-project': 770,
  autonomous: 1320,
  quick: 3150,
  next: 1650,
  status: 2370,
};

const tokens = (chars) => Math.ceil(chars / CHARS_PER_TOKEN);

/** Minimal frontmatter reader: scalars, double/single-quoted, `>`/`|` blocks. */
function readFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---', 4);
  if (end === -1) return {};
  const lines = text.slice(4, end).split('\n');
  const fm = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (/^[>|][+-]?$/.test(val)) {
      const parts = [];
      while (i + 1 < lines.length && /^\s/.test(lines[i + 1])) parts.push(lines[++i].trim());
      val = parts.join(' ');
    } else if (val.startsWith('"') && val.endsWith('"') && val.length > 1) {
      try { val = JSON.parse(val); } catch { val = val.slice(1, -1); }
    } else if (val.startsWith("'") && val.endsWith("'") && val.length > 1) {
      val = val.slice(1, -1).replace(/''/g, "'");
    }
    fm[m[1]] = val;
  }
  return fm;
}

// CRLF checkouts (Windows autocrlf) would otherwise fail the `---\n` fence test and read every description as empty.
const readLf = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const readFm = (file) => readFrontmatter(readLf(file));
const isTrue = (v) => String(v).trim() === 'true';

/** Every user-facing skill the installer would write, keyed by destination name. */
function collectSkills() {
  const skills = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const src = path.join(dir, e.name);
      const skillMd = path.join(src, 'SKILL.md');
      if (!fs.existsSync(skillMd)) { walk(src); continue; }
      const fm = readFm(skillMd);
      // Same rule as cli/lib/install-skills.cjs: user-invocable wins over internal.
      if (isTrue(fm.internal) && !isTrue(fm['user-invocable'])) continue;
      skills.push({
        name: e.name.startsWith('rcode-') ? e.name : `rcode-${e.name}`,
        description: fm.description || '',
        hidden: isTrue(fm['disable-model-invocation']),
      });
    }
  };
  for (const bucket of SKILL_BUCKETS) walk(path.join(SOURCE, 'skills', bucket));
  return skills;
}

function collectCommands() {
  const dir = path.join(SOURCE, 'commands');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const id = f.slice(0, -3);
    return { id, name: `rcode-${id}`, description: readFm(path.join(dir, f)).description || '' };
  });
}

function collectAgents() {
  const dir = path.join(SOURCE, 'agents');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const id = f.slice(0, -3);
    const fm = readFm(path.join(dir, f));
    return { id, name: fm.name || id, description: fm.description || '' };
  });
}

const lineChars = (item) => item.name.length + item.description.length + LISTING_LINE_OVERHEAD_CHARS;
const sumChars = (items) => items.reduce((n, item) => n + lineChars(item), 0);

function listingForProfile(profileName, profiles, all) {
  const def = profiles[profileName];
  if (!def) throw new Error(`profile "${profileName}" not found in rcode/profiles.yaml`);
  const keep = (set, key) => (def.all ? true : set.has(key));
  const commands = all.commands.filter((c) => keep(def.commands, c.id));
  const agents = all.agents.filter((a) => keep(def.agents, a.id));
  const skills = all.skills.filter((s) => keep(def.skills, s.name));
  // The sidebar stub exists only for commands the profile installs.
  for (const id of SIDEBAR_STUB_COMMANDS) {
    const cmd = commands.find((c) => c.id === id);
    const real = skills.some((s) => s.name === `rcode-${id}`);
    if (cmd && !real && (def.all || def.skills.has(`rcode-${id}`))) {
      skills.push({ name: `rcode-${id}`, description: cmd.description, hidden: false });
    }
  }
  const visibleSkills = skills.filter((s) => !s.hidden);
  return {
    skills: { count: visibleSkills.length, tokens: tokens(sumChars(visibleSkills)) },
    commands: { count: commands.length, tokens: tokens(sumChars(commands)) },
    agents: { count: agents.length, tokens: tokens(sumChars(agents)) },
    total: tokens(sumChars(visibleSkills) + sumChars(commands) + sumChars(agents)),
  };
}

/** Command file + the `@.rcode/...` files it inlines (one level). */
function directTokens(id) {
  const file = path.join(SOURCE, 'commands', `${id}.md`);
  if (!fs.existsSync(file)) return null;
  const text = readLf(file);
  let chars = text.length;
  const seen = new Set();
  for (const m of text.matchAll(/@\.rcode\/([\w./-]+\.md)/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const inc = path.join(SOURCE, m[1]);
    if (fs.existsSync(inc)) chars += readLf(inc).length;
  }
  return tokens(chars);
}

function measure() {
  const profiles = loadProfiles(SOURCE);
  const all = { skills: collectSkills(), commands: collectCommands(), agents: collectAgents() };
  const listing = {};
  for (const name of Object.keys(LISTING_THRESHOLDS)) listing[name] = listingForProfile(name, profiles, all);
  const purposes = {};
  for (const name of Object.keys(loadPurposes(SOURCE))) {
    purposes[name] = listingForProfile('minimal', effectiveProfiles([name], SOURCE), all);
  }
  const direct = {};
  for (const id of Object.keys(DIRECT_THRESHOLDS)) direct[id] = directTokens(id);
  return { listing, purposes, direct };
}

function evaluate(result) {
  const failures = [];
  for (const [name, limit] of Object.entries(LISTING_THRESHOLDS)) {
    const got = result.listing[name].total;
    if (got > limit) failures.push(`listing[${name}] ${got} > ${limit}`);
  }
  for (const name of Object.keys(result.purposes)) {
    const limit = PURPOSE_THRESHOLDS[name];
    if (limit === undefined) failures.push(`purpose[${name}] has no threshold in PURPOSE_THRESHOLDS`);
    else if (result.purposes[name].total > limit) failures.push(`purpose[${name}] ${result.purposes[name].total} > ${limit}`);
  }
  for (const [id, limit] of Object.entries(DIRECT_THRESHOLDS)) {
    const got = result.direct[id];
    if (got === null) failures.push(`direct[${id}] command file is missing`);
    else if (got > limit) failures.push(`direct[${id}] ${got} > ${limit}`);
  }
  return failures;
}

function formatTable(result) {
  const pad = (s, n) => String(s).padEnd(n);
  const rows = [['fixed listing (tokens)', 'skills', 'commands', 'agents', 'total', 'limit']];
  for (const [name, l] of Object.entries(result.listing)) {
    rows.push([name, `${l.skills.tokens} (${l.skills.count})`, `${l.commands.tokens} (${l.commands.count})`,
      `${l.agents.tokens} (${l.agents.count})`, l.total, LISTING_THRESHOLDS[name]]);
  }
  for (const [name, l] of Object.entries(result.purposes)) {
    rows.push([`minimal+${name}`, `${l.skills.tokens} (${l.skills.count})`, `${l.commands.tokens} (${l.commands.count})`,
      `${l.agents.tokens} (${l.agents.count})`, l.total, PURPOSE_THRESHOLDS[name]]);
  }
  const out = rows.map((r) => `${pad(r[0], 24)}${r.slice(1).map((c) => pad(c, 14)).join('')}`);
  out.push('', `${pad('direct command cost', 24)}${pad('tokens', 14)}limit`);
  for (const [id, limit] of Object.entries(DIRECT_THRESHOLDS)) {
    out.push(`${pad(`/rcode-${id}`, 24)}${pad(result.direct[id], 14)}${limit}`);
  }
  return out.join('\n');
}

module.exports = {
  CHARS_PER_TOKEN, LISTING_THRESHOLDS, PURPOSE_THRESHOLDS, DIRECT_THRESHOLDS,
  measure, evaluate, formatTable, readFrontmatter, tokens, lineChars,
};

if (require.main === module) {
  const result = measure();
  const failures = evaluate(result);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...result, failures }, null, 2));
  } else {
    console.log(formatTable(result));
    if (failures.length) console.error(`\nToken budget exceeded:\n  ${failures.join('\n  ')}`);
    else console.log('\nToken budget OK');
  }
  process.exit(failures.length ? 1 : 0);
}
