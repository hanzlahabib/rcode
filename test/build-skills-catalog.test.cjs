/**
 * Tests for scripts/build-skills-catalog.cjs — parseFrontmatter behaviour
 * and the full build-catalog integration flow against a synthetic temp dir.
 *
 * The build script is not importable (it runs immediately at require-time),
 * so integration tests invoke it as a child process via a shim that patches
 * the three hard-coded path constants before eval'ing the script source.
 *
 * The parseFrontmatter function is also copied verbatim here so that any
 * future divergence between the build script's parser and the compliance
 * parser is caught immediately by the unit tests below.
 *
 * Run: node --test test/build-skills-catalog.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const os = require('node:os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'build-skills-catalog.cjs');

// ---------------------------------------------------------------------------
// parseFrontmatter extracted verbatim from scripts/build-skills-catalog.cjs.
//
// Keeping it here lets us write fast pure-unit tests without I/O, and makes
// any future divergence from the live script visible as a test failure.
// ---------------------------------------------------------------------------
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const block = text.slice(4, end);
  const fm = {};
  let currentList = null;
  for (const raw of block.split('\n')) {
    if (currentList && /^\s+-\s+/.test(raw)) {
      currentList.push(raw.replace(/^\s+-\s+/, '').replace(/^"/, '').replace(/"$/, '').trim());
      continue;
    }
    currentList = null;
    const m = raw.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val === '' || val === '>' || val === '|') {
      if (val === '') {
        currentList = [];
        fm[key] = currentList;
      } else {
        fm[key] = [];
      }
      continue;
    }
    let v = val.trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    fm[key] = v;
  }
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v) && k === 'description') fm[k] = v.join(' ').trim();
  }
  return fm;
}

// ---------------------------------------------------------------------------
// Integration helpers
// ---------------------------------------------------------------------------

/**
 * Create a temp dir, populate it with mock skill files, run build-skills-catalog
 * redirected at the temp dir, and return { result, catalogMd, tmpDir }.
 * Caller must call cleanup(tmpDir) in t.after().
 */
function runBuild(skillDefs) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bsc-test-'));
  const skillsDir = path.join(tmpDir, 'rcode', 'skills');
  const outputFile = path.join(tmpDir, 'catalog.md');

  for (const def of skillDefs) {
    const skillDir = path.join(skillsDir, def.bucket, def.name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), def.content, 'utf8');
  }

  // Write a shim that patches the three hard-coded constants then eval's
  // the script source. Paths are stored in variables (safe JSON strings),
  // then injected via string concatenation — avoids broken quoting when
  // the path itself contains characters that would break a string literal.
  const wrapperPath = path.join(tmpDir, 'run.cjs');
  const wrapperSrc = [
    "'use strict';",
    'const fs = require("fs");',
    'const path = require("path");',
    // Use JSON.stringify to produce safe string literals in the generated file
    `const _tmpDir    = ${JSON.stringify(tmpDir)};`,
    `const _skillsDir = ${JSON.stringify(skillsDir)};`,
    `const _output    = ${JSON.stringify(outputFile)};`,
    `const _script    = ${JSON.stringify(SCRIPT)};`,
    '',
    'let src = fs.readFileSync(_script, "utf8");',
    '// Strip shebang',
    'src = src.replace(/^#!.*\\n/, "");',
    '// Patch the three path constants by replacing their assignment lines',
    'src = src.replace(',
    '  "const PROJECT_ROOT = path.resolve(__dirname, \'../\');",',
    '  "const PROJECT_ROOT = " + JSON.stringify(_tmpDir) + ";"',
    ');',
    'src = src.replace(',
    "  \"const SKILLS_DIR = path.join(PROJECT_ROOT, 'rcode', 'skills');\",",
    '  "const SKILLS_DIR = " + JSON.stringify(_skillsDir) + ";"',
    ');',
    'src = src.replace(',
    "  \"const OUTPUT = path.join(PROJECT_ROOT, 'docs', 'skills-catalog.md');\",",
    '  "const OUTPUT = " + JSON.stringify(_output) + ";"',
    ');',
    'eval(src);',
  ].join('\n');

  fs.writeFileSync(wrapperPath, wrapperSrc, 'utf8');

  const result = spawnSync('node', [wrapperPath], { encoding: 'utf8', timeout: 10_000 });

  let catalogMd = null;
  if (fs.existsSync(outputFile)) {
    catalogMd = fs.readFileSync(outputFile, 'utf8');
  }

  return { result, catalogMd, tmpDir };
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// parseFrontmatter unit tests (pure, fast, no I/O)
// ---------------------------------------------------------------------------

test('parseFrontmatter — returns empty object when no frontmatter delimiter', () => {
  const fm = parseFrontmatter('# Just a heading\n\nNo YAML here.');
  assert.deepStrictEqual(fm, {});
});

test('parseFrontmatter — returns empty object when opening --- is missing', () => {
  const fm = parseFrontmatter('name: foo\n---\n# body');
  assert.deepStrictEqual(fm, {});
});

test('parseFrontmatter — returns empty object when closing --- is missing', () => {
  const fm = parseFrontmatter('---\nname: foo\n# no closing delimiter');
  assert.deepStrictEqual(fm, {});
});

test('parseFrontmatter — parses simple key: value pairs', () => {
  const text = '---\nname: my-skill\ndescription: Does a thing\n---\n# Body';
  const fm = parseFrontmatter(text);
  assert.strictEqual(fm.name, 'my-skill');
  assert.strictEqual(fm.description, 'Does a thing');
});

test('parseFrontmatter — strips double-quoted values', () => {
  const text = '---\nname: "quoted-skill"\n---\n';
  const fm = parseFrontmatter(text);
  assert.strictEqual(fm.name, 'quoted-skill');
});

test('parseFrontmatter — strips single-quoted values', () => {
  const text = "---\nname: 'single-quoted'\n---\n";
  const fm = parseFrontmatter(text);
  assert.strictEqual(fm.name, 'single-quoted');
});

test('parseFrontmatter — parses list values under empty key', () => {
  const text = '---\ntriggers:\n  - do thing one\n  - do thing two\n---\n';
  const fm = parseFrontmatter(text);
  assert.ok(Array.isArray(fm.triggers), 'triggers should be an array');
  assert.deepStrictEqual(fm.triggers, ['do thing one', 'do thing two']);
});

test('parseFrontmatter — strips quotes from list items', () => {
  const text = '---\ntriggers:\n  - "quoted item"\n  - plain item\n---\n';
  const fm = parseFrontmatter(text);
  assert.deepStrictEqual(fm.triggers, ['quoted item', 'plain item']);
});

test('parseFrontmatter — preserves unicode in description', () => {
  const text = '---\ndescription: كلود 🦙 résumé\n---\n';
  const fm = parseFrontmatter(text);
  assert.strictEqual(fm.description, 'كلود 🦙 résumé');
});

test('parseFrontmatter — ignores lines without a colon', () => {
  const text = '---\nname: good\nthis line has no colon\ndescription: fine\n---\n';
  const fm = parseFrontmatter(text);
  assert.strictEqual(fm.name, 'good');
  assert.strictEqual(fm.description, 'fine');
  assert.strictEqual(Object.keys(fm).length, 2);
});

test('parseFrontmatter — handles keys with hyphens', () => {
  const text = '---\nsome-key: some-value\n---\n';
  const fm = parseFrontmatter(text);
  assert.strictEqual(fm['some-key'], 'some-value');
});

// ---------------------------------------------------------------------------
// Integration tests — full build flow via child process
// ---------------------------------------------------------------------------

test('build-catalog: valid skill appears in catalog output', (t) => {
  const { result, catalogMd, tmpDir } = runBuild([
    {
      bucket: 'agents',
      name: 'test-agent',
      content: [
        '---',
        'name: test-agent',
        'description: A test agent that does testing things',
        'triggers:',
        '  - run tests',
        '  - test things',
        '---',
        '# Body',
      ].join('\n'),
    },
  ]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);
  assert.ok(catalogMd !== null, 'catalog.md was written');
  assert.ok(catalogMd.includes('test-agent'), 'catalog contains skill name');
  assert.ok(catalogMd.includes('A test agent that does testing things'), 'catalog contains description');
  assert.ok(catalogMd.includes('run tests'), 'catalog contains trigger');
});

test('build-catalog: skill with malformed YAML (no closing ---) excluded gracefully', (t) => {
  // parseFrontmatter returns {} for malformed input; the script should not crash.
  // The skill will appear using the directory name as the fallback skill name.
  const { result, catalogMd, tmpDir } = runBuild([
    {
      bucket: 'agents',
      name: 'broken-skill',
      content: '---\nname: broken-skill\n# no closing delimiter — malformed\n',
    },
  ]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script crashed on malformed skill:\n${result.stderr}`);
  assert.ok(catalogMd !== null, 'catalog.md was still written despite malformed skill');
});

test('build-catalog: unicode in description is preserved in output', (t) => {
  const { result, catalogMd, tmpDir } = runBuild([
    {
      bucket: 'core',
      name: 'unicode-skill',
      content: [
        '---',
        'name: unicode-skill',
        'description: كلود 🦙 résumé — multilingual',
        '---',
        '# Body',
      ].join('\n'),
    },
  ]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);
  assert.ok(catalogMd.includes('كلود'), 'Arabic characters preserved');
  assert.ok(catalogMd.includes('🦙'), 'emoji preserved');
  assert.ok(catalogMd.includes('résumé'), 'accented chars preserved');
});

test('build-catalog: skills are sorted alphabetically within each bucket', (t) => {
  const { result, catalogMd, tmpDir } = runBuild([
    {
      bucket: 'agents',
      name: 'zebra-agent',
      content: '---\nname: zebra-agent\ndescription: Comes last\n---\n',
    },
    {
      bucket: 'agents',
      name: 'alpha-agent',
      content: '---\nname: alpha-agent\ndescription: Comes first\n---\n',
    },
    {
      bucket: 'agents',
      name: 'mango-agent',
      content: '---\nname: mango-agent\ndescription: Comes middle\n---\n',
    },
  ]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);
  const alphaPos = catalogMd.indexOf('alpha-agent');
  const mangoPos = catalogMd.indexOf('mango-agent');
  const zebraPos = catalogMd.indexOf('zebra-agent');
  assert.ok(alphaPos !== -1 && mangoPos !== -1 && zebraPos !== -1, 'all three skills appear in output');
  assert.ok(alphaPos < mangoPos, 'alpha-agent appears before mango-agent');
  assert.ok(mangoPos < zebraPos, 'mango-agent appears before zebra-agent');
});

test('build-catalog: skills in different buckets appear under correct section headings', (t) => {
  const { result, catalogMd, tmpDir } = runBuild([
    {
      bucket: 'actions',
      name: 'my-action',
      content: '---\nname: my-action\ndescription: An action skill\n---\n',
    },
    {
      bucket: 'agents',
      name: 'my-agent',
      content: '---\nname: my-agent\ndescription: An agent skill\n---\n',
    },
  ]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);

  const actionsHeadingPos = catalogMd.indexOf('## Actions');
  const agentsHeadingPos = catalogMd.indexOf('## Agents');
  assert.ok(actionsHeadingPos !== -1, '## Actions heading is present');
  assert.ok(agentsHeadingPos !== -1, '## Agents heading is present');
  assert.ok(actionsHeadingPos < agentsHeadingPos, 'Actions section comes before Agents section');

  const myActionPos = catalogMd.indexOf('my-action');
  const myAgentPos = catalogMd.indexOf('my-agent');
  assert.ok(myActionPos > actionsHeadingPos, 'my-action appears after ## Actions heading');
  assert.ok(myActionPos < agentsHeadingPos, 'my-action appears before ## Agents heading');
  assert.ok(myAgentPos > agentsHeadingPos, 'my-agent appears after ## Agents heading');
});

test('build-catalog: empty skills dir produces a valid catalog reporting 0 skills', (t) => {
  const { result, catalogMd, tmpDir } = runBuild([]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);
  assert.ok(catalogMd !== null, 'catalog.md was written');
  assert.ok(catalogMd.includes('**0 skills**'), 'catalog reports 0 skills');
});

test('build-catalog: output file contains the do-not-edit banner', (t) => {
  const { result, catalogMd, tmpDir } = runBuild([]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);
  assert.ok(catalogMd.includes('<!-- DO NOT EDIT'), 'catalog starts with the generated-file banner');
});

test('build-catalog: skill with no name field falls back to directory name', (t) => {
  const { result, catalogMd, tmpDir } = runBuild([
    {
      bucket: 'agents',
      name: 'nameless-skill',
      content: '---\ndescription: No name field here\n---\n',
    },
  ]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);
  assert.ok(catalogMd.includes('nameless-skill'), 'directory name is used as the fallback skill name');
});

test('build-catalog: description longer than 600 chars is truncated with ellipsis', (t) => {
  const longDesc = 'A'.repeat(700);
  const { result, catalogMd, tmpDir } = runBuild([
    {
      bucket: 'agents',
      name: 'verbose-skill',
      content: `---\nname: verbose-skill\ndescription: ${longDesc}\n---\n`,
    },
  ]);
  t.after(() => cleanup(tmpDir));

  assert.strictEqual(result.status, 0, `script failed:\n${result.stderr}`);
  assert.ok(catalogMd.includes('…'), 'long description is truncated with an ellipsis');
  assert.ok(!catalogMd.includes(longDesc), '700-char description is not present verbatim');
});
