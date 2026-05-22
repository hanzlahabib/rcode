/**
 * Agent file size budget — context-window guard.
 *
 * Agent prompts that load on every spawn eat context. Tiered budgets:
 *   - XL hard cap (fail):  1600 lines
 *   - L  warn cap (log):   1000 lines
 *   - M  warn cap (log):    500 lines
 *
 * As of 2026-04-30, all 44 installed agents are under 500 lines (the
 * default tier). The hard cap exists to catch a future regression
 * before it ships — bloat in an agent prompt is the kind of drift
 * that's invisible until a long-running session degrades.
 *
 * Memory note `project-pending-work.md` already flags 6 agents as
 * candidates for slim-split; this test enforces the upper bound until
 * those splits land. Keeping the warn tiers as console.log (not asserts)
 * makes drift visible without blocking unrelated work.
 *
 * Run: node --test test/agent-size-budget.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PROJECT_AGENTS_DIR = path.join(PROJECT_ROOT, '.claude', 'agents');
const GLOBAL_AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents');

const XL_HARD_CAP = 1600; // fail
const L_WARN = 1000;       // log
const M_WARN = 500;        // log

/**
 * Resolve which agents directory to read from. After #679 dedup, the
 * project's .claude/agents/ may be empty when ~/.claude/agents/ already
 * has the rcode-* set (global precedence). Mirror the runtime fallback.
 */
function resolveAgentsDir() {
  if (fs.existsSync(PROJECT_AGENTS_DIR)) {
    const has = fs.readdirSync(PROJECT_AGENTS_DIR).some(f => f.startsWith('rcode-') && f.endsWith('.md'));
    if (has) return PROJECT_AGENTS_DIR;
  }
  if (fs.existsSync(GLOBAL_AGENTS_DIR)) {
    const has = fs.readdirSync(GLOBAL_AGENTS_DIR).some(f => f.startsWith('rcode-') && f.endsWith('.md'));
    if (has) return GLOBAL_AGENTS_DIR;
  }
  return null;
}

function classify() {
  const dir = resolveAgentsDir();
  if (!dir) return { entries: [] };
  const entries = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    if (!f.startsWith('rcode-')) continue; // skip non-rcode agents in global dir
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    const lines = text.split('\n').length;
    let tier = 'OK';
    if (lines > XL_HARD_CAP) tier = 'XL';
    else if (lines > L_WARN) tier = 'L';
    else if (lines > M_WARN) tier = 'M';
    entries.push({ file: f, lines, tier });
  }
  return { entries };
}

test('installed agent count is non-trivial (sanity)', () => {
  const { entries } = classify();
  assert.ok(entries.length > 30, `expected >30 agents, got ${entries.length} — install drift?`);
});

test('no agent exceeds the XL hard cap (1600 lines)', () => {
  const { entries } = classify();
  const xl = entries.filter((e) => e.tier === 'XL').sort((a, b) => b.lines - a.lines);
  if (xl.length > 0) {
    const list = xl.map((e) => `  ${e.lines}: ${e.file}`).join('\n');
    assert.fail(
      `Agent files exceed XL hard cap of ${XL_HARD_CAP} lines:\n${list}\n\n` +
        `Split the agent into multiple agents or move bulk content to references/*.md ` +
        `loaded on demand.`,
    );
  }
  // Visibility for the warn tiers — no assertion, just log
  const l = entries.filter((e) => e.tier === 'L');
  const m = entries.filter((e) => e.tier === 'M');
  if (l.length || m.length) {
    // eslint-disable-next-line no-console
    console.log(
      `# agent-size-budget tiers: L (>${L_WARN})=${l.length}, M (>${M_WARN})=${m.length}, ` +
        `OK=${entries.length - l.length - m.length}/${entries.length}.`,
    );
  }
});
