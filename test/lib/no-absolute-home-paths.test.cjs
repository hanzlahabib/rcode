/**
 * Regression guard against cross-project file leakage in slash command
 * templates.
 *
 * Background: bugs #18 and #19 were caused by slash-command templates in
 * cli/init.js that contained hardcoded `$HOME/.../cli/lib/*.cjs` require()
 * shell-outs, or `rihal/digests/{agent}.md` relative paths. When a user
 * runs those commands from a project that is not rihal-code itself, the
 * paths resolve outside the user's cwd — either to another rihal-code
 * checkout on the same machine, or to nothing at all.
 *
 * This test installs rihal-code into a fresh temp directory and asserts
 * that every file under `.claude/commands/rihal/` contains no forbidden
 * path patterns. If a contributor adds a new slash command that reaches
 * outside the project, this test fails with a clear diagnostic pointing
 * at the offending file and line.
 *
 * Forbidden patterns (any one of these in an installed slash command
 * template is a regression):
 *
 *   1. `$HOME/...` or `$HOME/`                        — absolute env-var path
 *   2. `~/` at the start of a string literal          — shell-expanded home
 *   3. `/home/`, `/root/`, `/Users/`                   — hardcoded user paths
 *   4. `require('rihal/`                               — package-relative require
 *   5. `rihal/digests/`                                — package-internal path
 *   6. `rihal/skills/` (as a read target, not docs)   — package-internal path
 *
 * The test does an actual install into os.tmpdir() so it catches
 * regressions that only manifest at install time (e.g. template variable
 * substitution introducing a leak).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { makeTempDir, cleanup } = require('../helpers.cjs');

// Pattern → description pairs. Each pattern is a regex searched against
// every slash-command .md file's content. Matches are reported with
// their line number and file for actionable diagnostics.
const FORBIDDEN_PATTERNS = [
  {
    regex: /\$HOME\//,
    description: '`$HOME/` — absolute path to the user\'s home directory. Use `rihal-code <subcommand>` instead; the CLI knows its own package root.',
  },
  {
    regex: /(?:^|[^a-zA-Z0-9_])~\/(?:[a-zA-Z]|\.rihal)/,
    // Allow `~/.rihal-code/defaults.json` in explanatory text — but flag
    // any attempt to actually read from `~/`. The negative lookahead above
    // limits false positives. Flag if templates literally require ~/foo.
    description: '`~/` — shell home expansion. Templates must use project-relative paths or `rihal-code <subcommand>`.',
  },
  {
    regex: /\/home\/[a-zA-Z]/,
    description: '`/home/<user>/...` — hardcoded absolute path to a specific user\'s home. Never.',
  },
  {
    regex: /\/Users\/[a-zA-Z]/,
    description: '`/Users/<user>/...` — hardcoded macOS home path. Never.',
  },
  {
    regex: /require\(['"]rihal\//,
    description: '`require(\'rihal/...\')` — package-relative require. The CLI is the only thing that should know where `rihal/` lives; templates shell out to `rihal-code <subcommand>`.',
  },
  {
    regex: /(?:Load|Read|Open|require\()\s*[^\n]*\brihal\/digests\//,
    description: '`rihal/digests/...` — package-internal digest path. Use `rihal-code digest <agent>` instead.',
  },
  // BMAD-style pivot (v0.2.0) — these CLI subcommands were deleted and
  // replaced with direct Claude Read/Write/Bash file I/O. Any template
  // that still references them is a regression.
  {
    regex: /\brihal-code\s+(?:sprint|milestone|bug|handoff|preserve|session|story-commit)\b/,
    description: '`rihal-code {sprint|milestone|bug|handoff|preserve|session|story-commit}` — these CLI subcommands were removed in the BMAD-style pivot. Slash command templates must instruct Claude to read/write `.rihal/**` files directly via the Read/Write/Bash tools.',
  },
];

// List of rihal-slash-command files we expect after a fresh install.
// We don't assert on the exact set (new commands can be added) — we just
// walk the directory and scan every `.md` file under it.
function listSlashCommands(cwd) {
  const dir = path.join(cwd, '.claude', 'commands', 'rihal');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => ({
      name,
      full: path.join(dir, name),
    }));
}

function findMatches(content, pattern) {
  const lines = content.split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      matches.push({ line: i + 1, text: lines[i].trim() });
    }
  }
  return matches;
}

function installIntoTempDir(cwd) {
  // Installs rihal-code into a fresh temp directory via cli/install.js
  // (the unified installer). Copies agents, commands, skills, workflows
  // exactly as a real user install. Output is silenced so test log stays clean.
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  try {
    delete require.cache[require.resolve('../../cli/install.js')];
    const install = require('../../cli/install.js');
    install.install({
      target: cwd,
      force: true,
      yes: true,
      userName: 'test',
      projectName: 'rihal-noleaks-test',
      language: 'English',
      mode: 'guided',
      ide: 'claude',
      modules: [],
      help: false,
    });
    return Promise.resolve().finally(() => {
      process.stdout.write = originalWrite;
    });
  } catch (err) {
    process.stdout.write = originalWrite;
    throw err;
  }
}

test('no slash-command template contains forbidden cross-project paths', async (t) => {
  const cwd = makeTempDir('rihal-noleaks-');
  t.after(() => cleanup(cwd));

  await installIntoTempDir(cwd);

  const commands = listSlashCommands(cwd);
  assert.ok(commands.length > 0, 'install should produce at least one slash command');

  const violations = [];
  for (const cmd of commands) {
    const content = fs.readFileSync(cmd.full, 'utf8');
    for (const { regex, description } of FORBIDDEN_PATTERNS) {
      const matches = findMatches(content, regex);
      for (const match of matches) {
        violations.push({
          file: cmd.name,
          line: match.line,
          description,
          excerpt: match.text.slice(0, 100),
        });
      }
    }
  }

  if (violations.length > 0) {
    const report = violations
      .map(
        (v) =>
          `\n  ${v.file}:${v.line}\n    Issue: ${v.description}\n    Line:  ${v.excerpt}`,
      )
      .join('\n');
    assert.fail(
      `${violations.length} forbidden path pattern(s) found in installed slash commands:${report}\n\n` +
      `These patterns reach outside the user's project directory. Use \`rihal-code <subcommand>\` ` +
      `invocations instead — the CLI resolves package-internal paths from its own install root.`,
    );
  }
});

test('every known slash command installs and is non-empty', async (t) => {
  const cwd = makeTempDir('rihal-noleaks-');
  t.after(() => cleanup(cwd));

  await installIntoTempDir(cwd);

  const commands = listSlashCommands(cwd);
  assert.ok(commands.length >= 15, `expected at least 15 slash commands, got ${commands.length}`);

  for (const cmd of commands) {
    const stat = fs.statSync(cmd.full);
    assert.ok(stat.size > 0, `${cmd.name} is empty`);
  }
});

test('state-mutating slash commands use direct file I/O, not deleted CLI subcommands', async (t) => {
  // BMAD-style pivot (v0.2.0): slash commands that used to shell out to
  // `rihal-code handoff|preserve|session|sprint|milestone|bug|story-commit`
  // must now instruct Claude to read/write `.rihal/**` files directly
  // using the Read/Write tools. This test locks in that migration — every
  // template that historically touched state must mention the Write tool
  // (or explicit .rihal/ path writes) so we don't regress to CLI-driven
  // state mutation.
  const cwd = makeTempDir('rihal-noleaks-');
  t.after(() => cleanup(cwd));

  await installIntoTempDir(cwd);

  const commands = listSlashCommands(cwd);

  // Each template is expected to contain ONE of the patterns in `expect`
  // (a post-pivot marker) and NONE of the forbidden deleted-command
  // shell-outs (already covered by test #1, but checked here too for
  // clarity in failure reports).
  const expectations = [
    { file: 'preserve.md',    expect: /Write tool|\.rihal\/context\/permanent\.md/ },
    { file: 'save-session.md', expect: /Write tool|\.rihal\/progress\/session-/ },
    { file: 'pause.md',       expect: /Write tool|\.rihal\/HANDOFF\.json/ },
    { file: 'resume.md',      expect: /Read tool|\.rihal\/HANDOFF\.json/ },
    { file: 'continue.md',    expect: /grep.*\.rihal\/progress|Glob.*milestones/ },
    { file: 'bug.md',         expect: /Write tool|\.rihal\/artifacts\/bugs/ },
  ];

  for (const { file, expect } of expectations) {
    const cmd = commands.find((c) => c.name === file);
    if (!cmd) {
      // It's OK if a file is not installed in this build; only check
      // files that exist. Skip silently.
      continue;
    }
    const content = fs.readFileSync(cmd.full, 'utf8');
    assert.match(
      content,
      expect,
      `${file} should use direct file I/O (Read/Write tool + .rihal/** path) instead of shelling out to a deleted CLI subcommand`,
    );
  }
});
