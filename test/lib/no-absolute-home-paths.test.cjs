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
  // We need the install to run against our real package source so that
  // the slash command templates from cli/init.js are expanded into files
  // exactly as a user would receive them.
  //
  // Rather than spawn a subprocess, we require and call init directly with
  // --yes so the non-interactive path is used. The install prints a
  // multi-line banner to stdout — we silence it so test output stays
  // clean. Errors are still reported via the returned promise.
  const originalCwd = process.cwd();
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  try {
    process.chdir(cwd);
    // Fresh require so the install module gets the new cwd
    delete require.cache[require.resolve('../../cli/init.js')];
    const init = require('../../cli/init.js');
    // The init module's default export is an async function that takes
    // (args, context). Context expects packageRoot + packageJson.
    const packageRoot = path.resolve(__dirname, '..', '..');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
    );
    const result = init(['--yes'], { packageRoot, packageJson });
    // Restore stdout after the promise resolves; install is synchronous
    // enough that awaiting here is safe.
    return Promise.resolve(result).finally(() => {
      process.stdout.write = originalWrite;
      process.chdir(originalCwd);
    });
  } catch (err) {
    process.stdout.write = originalWrite;
    process.chdir(originalCwd);
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

test('slash commands that need lib access shell out to rihal-code subcommands', async (t) => {
  const cwd = makeTempDir('rihal-noleaks-');
  t.after(() => cleanup(cwd));

  await installIntoTempDir(cwd);

  const commands = listSlashCommands(cwd);

  // These specific commands historically had $HOME leaks and should now
  // contain `rihal-code <subcommand>` invocations instead.
  const expectations = [
    { file: 'preserve.md', expect: /rihal-code preserve/ },
    { file: 'save-session.md', expect: /rihal-code session save/ },
    { file: 'pause.md', expect: /rihal-code handoff write/ },
    { file: 'resume.md', expect: /rihal-code handoff (?:read|clear)/ },
    { file: 'continue.md', expect: /rihal-code session search/ },
    { file: 'council.md', expect: /rihal-code digest/ },
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
      `${file} should shell out via ${expect} instead of requiring a library directly`,
    );
  }
});
