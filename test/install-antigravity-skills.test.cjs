/**
 * Antigravity home-dir skill install test.
 *
 * `agy` surfaces /slash commands ONLY from ~/.gemini/antigravity/skills/<name>/SKILL.md.
 * `rcode install --global` (ide=antigravity) must write each rcode command there as a
 * `rcode-<name>` skill dir so /rcode-* actually appears in the Antigravity CLI.
 *
 * This drives installNativeHomeSlashCommands({ ide:'antigravity', global:true }) against
 * a TEMP HOME (never the real ~/.gemini) and asserts the skill file + frontmatter.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const { installNativeHomeSlashCommands } = require(path.join(PROJECT_ROOT, 'cli/install.js'));

function withTempHome(fn) {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-agy-home-'));
  // os.homedir() resolves HOME on Linux/macOS, so monkeypatching the env is
  // enough — but pin os.homedir() too in case the platform ignores HOME.
  const prevHome = process.env.HOME;
  const realHomedir = os.homedir;
  process.env.HOME = tmpHome;
  os.homedir = () => tmpHome;
  try {
    return fn(tmpHome);
  } finally {
    os.homedir = realHomedir;
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch (_) {}
  }
}

test('antigravity --global writes rcode-* skills to ~/.gemini/antigravity/skills/', () => {
  withTempHome((tmpHome) => {
    installNativeHomeSlashCommands({ ide: 'antigravity', global: true });

    const skillPath = path.join(
      tmpHome, '.gemini', 'antigravity', 'skills', 'rcode-add-phase', 'SKILL.md',
    );
    assert.ok(fs.existsSync(skillPath), `expected SKILL.md at ${skillPath}`);

    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(content.startsWith('---\n'), 'SKILL.md must start with YAML frontmatter');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    assert.ok(nameMatch, 'SKILL.md frontmatter must declare a name');
    assert.equal(nameMatch[1].trim(), 'rcode-add-phase', 'skill name must be rcode-add-phase');

    // Exactly one frontmatter block — the source command frontmatter must be
    // stripped, not double-nested.
    const fmBlocks = content.split('\n').filter((l) => l === '---').length;
    assert.equal(fmBlocks, 2, `expected one frontmatter block (2 fences), got ${fmBlocks} fences`);
  });
});

test('antigravity install is gated behind --global', () => {
  withTempHome((tmpHome) => {
    installNativeHomeSlashCommands({ ide: 'antigravity', global: false });
    const base = path.join(tmpHome, '.gemini', 'antigravity', 'skills');
    assert.ok(!fs.existsSync(base), 'no skills should be written without --global');
  });
});
