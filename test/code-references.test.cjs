/**
 * Tests for extractReferences() in rcode/bin/lib/code-references.cjs.
 *
 * Covers all four detection patterns:
 *   1. File paths with known extensions
 *   2. File:line references (path.ext:NN)
 *   3. Snake_case function names (name()
 *   4. CamelCase class/type names (filtered against COMMON_ENGLISH)
 *
 * Also covers: English-word filter, edge cases (null/empty/long input),
 * and the verifyReferences() return shape for empty input.
 *
 * Run: node --test test/code-references.test.cjs
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { extractReferences, verifyReferences } = require(
  path.resolve(__dirname, '../rcode/bin/lib/code-references.cjs')
);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function hasFile(refs, name) {
  return refs.files.includes(name);
}

function hasSymbol(refs, name) {
  return refs.symbols.includes(name);
}

function hasFileLine(refs, file, line) {
  return refs.fileLines.some(fl => fl.file === file && fl.line === line);
}

// ---------------------------------------------------------------------------
// Pattern 1 — File paths
// ---------------------------------------------------------------------------

describe('Pattern 1: file path detection', () => {
  test('detects a TypeScript file path', () => {
    const refs = extractReferences('see src/auth/login.ts for details');
    assert.ok(hasFile(refs, 'src/auth/login.ts'), 'expected login.ts in files');
  });

  test('detects a Python file path', () => {
    const refs = extractReferences('edit backend/services/llm.py to fix the timeout');
    assert.ok(hasFile(refs, 'backend/services/llm.py'));
  });

  test('detects a JSON config file', () => {
    const refs = extractReferences('update package.json before committing');
    assert.ok(hasFile(refs, 'package.json'));
  });

  test('detects a .cjs module', () => {
    const refs = extractReferences('rcode/bin/rcode-tools.cjs handles subcommands');
    assert.ok(hasFile(refs, 'rcode/bin/rcode-tools.cjs'));
  });

  test('detects a YAML file', () => {
    // Note: leading-dot paths like .github/... drop the dot because \b anchors
    // after the dot before the first word char. Use a plain path here.
    const refs = extractReferences('see deploy/pipeline.yaml for CI config');
    assert.ok(hasFile(refs, 'deploy/pipeline.yaml'));
  });

  test('detects a Markdown file', () => {
    const refs = extractReferences('read the ROADMAP.md first');
    assert.ok(hasFile(refs, 'ROADMAP.md'));
  });

  test('detects multiple file paths in one block of text', () => {
    const refs = extractReferences('edit src/index.ts and then update README.md');
    assert.ok(hasFile(refs, 'src/index.ts'));
    assert.ok(hasFile(refs, 'README.md'));
  });

  test('does not detect unknown extensions as file paths', () => {
    const refs = extractReferences('see artifact.xyz for details');
    assert.ok(!hasFile(refs, 'artifact.xyz'), 'unknown extension must not be a file');
  });

  test('does not include bare words without extension', () => {
    const refs = extractReferences('open the editor and run build');
    assert.strictEqual(refs.files.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Pattern 2 — File:line references
// ---------------------------------------------------------------------------

describe('Pattern 2: file:line references', () => {
  test('parses a basic file:line reference', () => {
    const refs = extractReferences('see rcode/bin/rcode-tools.cjs:7081 for the call');
    assert.ok(hasFileLine(refs, 'rcode/bin/rcode-tools.cjs', 7081));
  });

  test('file from file:line is also added to files list', () => {
    const refs = extractReferences('check src/auth.ts:42 for the guard');
    assert.ok(hasFile(refs, 'src/auth.ts'));
  });

  test('line field is an integer, not a string', () => {
    const refs = extractReferences('see util.py:99 for the helper');
    const fl = refs.fileLines.find(f => f.file === 'util.py');
    assert.ok(fl, 'fileLines entry expected');
    assert.strictEqual(typeof fl.line, 'number');
    assert.strictEqual(fl.line, 99);
  });

  test('multiple file:line entries in one text', () => {
    const refs = extractReferences('compare src/a.ts:10 and src/b.ts:20');
    assert.ok(hasFileLine(refs, 'src/a.ts', 10));
    assert.ok(hasFileLine(refs, 'src/b.ts', 20));
  });

  test('text without colon-number produces no fileLines', () => {
    const refs = extractReferences('just src/auth.ts without a line number');
    assert.strictEqual(refs.fileLines.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Pattern 3 — Snake_case symbols
// ---------------------------------------------------------------------------

describe('Pattern 3: snake_case function detection', () => {
  test('detects a basic snake_case function call', () => {
    const refs = extractReferences('call handle_login() to authenticate');
    assert.ok(hasSymbol(refs, 'handle_login'));
  });

  test('detects underscore-prefixed function', () => {
    const refs = extractReferences('the internal _is_timeout_error() helper');
    assert.ok(hasSymbol(refs, '_is_timeout_error'));
  });

  test('detects extract_references function name', () => {
    const refs = extractReferences('extract_references() returns three fields');
    assert.ok(hasSymbol(refs, 'extract_references'));
  });

  test('does not detect plain words without parenthesis', () => {
    // "handle_login" without () should not be captured by the snake_case pattern
    const refs = extractReferences('the handle_login method is important');
    assert.ok(!hasSymbol(refs, 'handle_login'), 'no parens → no match');
  });

  test('does not match single-character names', () => {
    const refs = extractReferences('call f() here');
    // 'f' is only 1 char — pattern needs [a-z0-9_]+ (at least 2 chars total)
    // The pattern is \b([a-z_][a-z0-9_]+)\( — requires at least 2 chars
    assert.ok(!hasSymbol(refs, 'f'));
  });
});

// ---------------------------------------------------------------------------
// Pattern 4 — CamelCase symbols
// ---------------------------------------------------------------------------

describe('Pattern 4: CamelCase symbol detection', () => {
  test('detects a CamelCase class name', () => {
    const refs = extractReferences('UserAuthService handles the flow');
    assert.ok(hasSymbol(refs, 'UserAuthService'));
  });

  test('detects a multi-segment CamelCase type', () => {
    const refs = extractReferences('ExtractedReference is returned by the parser');
    assert.ok(hasSymbol(refs, 'ExtractedReference'));
  });

  test('detects CamelCase names mixed with other text', () => {
    const refs = extractReferences('both AuthMiddleware and TokenValidator must pass');
    assert.ok(hasSymbol(refs, 'AuthMiddleware'));
    assert.ok(hasSymbol(refs, 'TokenValidator'));
  });

  test('filters out "The" (common English)', () => {
    const refs = extractReferences('The module handles routing');
    assert.ok(!hasSymbol(refs, 'The'), '"The" must be filtered');
  });

  test('filters out "And"', () => {
    const refs = extractReferences('And then we proceed');
    assert.ok(!hasSymbol(refs, 'And'));
  });

  test('filters out "Function" (documentation word)', () => {
    const refs = extractReferences('Function handles the routing');
    assert.ok(!hasSymbol(refs, 'Function'));
  });

  test('filters out "Return"', () => {
    const refs = extractReferences('Return value is optional');
    assert.ok(!hasSymbol(refs, 'Return'));
  });

  test('filters out "Export" and "Import"', () => {
    const refs = extractReferences('Export the module. Import it elsewhere.');
    assert.ok(!hasSymbol(refs, 'Export'));
    assert.ok(!hasSymbol(refs, 'Import'));
  });

  test('filters out primitive JS types (String, Number, Boolean)', () => {
    const refs = extractReferences('pass a String or Number value');
    assert.ok(!hasSymbol(refs, 'String'));
    assert.ok(!hasSymbol(refs, 'Number'));
    assert.ok(!hasSymbol(refs, 'Boolean'));
  });

  test('filters out names 2 chars or shorter', () => {
    // "Is" is 2 chars and also in COMMON_ENGLISH — but even a 2-char unknown
    // capitalised word must be skipped (length > 2 rule)
    const refs = extractReferences('Xy means nothing here');
    assert.ok(!hasSymbol(refs, 'Xy'), '2-char CamelCase must be filtered');
  });

  test('accepts a 3-char CamelCase name not in common-English list', () => {
    const refs = extractReferences('use Foo to wrap the value');
    // "Foo" is 3 chars, not in COMMON_ENGLISH, not a primitive — should appear
    assert.ok(hasSymbol(refs, 'Foo'));
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  test('null input returns empty arrays', () => {
    const refs = extractReferences(null);
    assert.deepStrictEqual(refs, { files: [], symbols: [], fileLines: [] });
  });

  test('empty string returns empty arrays', () => {
    const refs = extractReferences('');
    assert.deepStrictEqual(refs, { files: [], symbols: [], fileLines: [] });
  });

  test('undefined input returns empty arrays', () => {
    const refs = extractReferences(undefined);
    assert.deepStrictEqual(refs, { files: [], symbols: [], fileLines: [] });
  });

  test('very long input (100k chars) does not throw', () => {
    const big = 'lorem ipsum dolor sit amet '.repeat(4000) + 'src/app.ts:1';
    let refs;
    assert.doesNotThrow(() => { refs = extractReferences(big); });
    assert.ok(hasFileLine(refs, 'src/app.ts', 1), 'still extracts ref from big string');
  });

  test('input with only numbers returns empty results', () => {
    const refs = extractReferences('1234567890');
    assert.strictEqual(refs.files.length, 0);
    assert.strictEqual(refs.symbols.length, 0);
    assert.strictEqual(refs.fileLines.length, 0);
  });

  test('duplicate files are deduplicated', () => {
    const refs = extractReferences('see src/auth.ts and also src/auth.ts again');
    const count = refs.files.filter(f => f === 'src/auth.ts').length;
    assert.strictEqual(count, 1, 'duplicate file refs must be collapsed to one');
  });

  test('duplicate symbols are deduplicated', () => {
    const refs = extractReferences('call handle_login() then call handle_login() again');
    const count = refs.symbols.filter(s => s === 'handle_login').length;
    assert.strictEqual(count, 1, 'duplicate symbol refs must be collapsed to one');
  });
});

// ---------------------------------------------------------------------------
// verifyReferences — basic shape (no filesystem access)
// ---------------------------------------------------------------------------

describe('verifyReferences: empty/null input shape', () => {
  test('null refs returns zero-count summary with ratio 1.0', () => {
    const result = verifyReferences(null, '/nonexistent');
    assert.deepStrictEqual(result.summary, { total: 0, verified: 0, missing: 0, ratio: 1.0 });
  });

  test('empty refs object returns zero-count summary', () => {
    const result = verifyReferences({}, '/nonexistent');
    assert.deepStrictEqual(result.summary, { total: 0, verified: 0, missing: 0, ratio: 1.0 });
  });

  test('all files missing → ratio 0 and missing list populated', () => {
    const refs = { files: ['does-not-exist.ts'], symbols: [] };
    const result = verifyReferences(refs, '/nonexistent/root');
    assert.strictEqual(result.summary.total, 1);
    assert.strictEqual(result.summary.verified, 0);
    assert.strictEqual(result.summary.missing, 1);
    assert.strictEqual(result.summary.ratio, 0);
    assert.ok(result.missing.files.includes('does-not-exist.ts'));
  });

  test('verified + missing counts add up to total', () => {
    const refs = { files: ['ghost1.ts', 'ghost2.ts'], symbols: [] };
    const result = verifyReferences(refs, '/nonexistent/root');
    assert.strictEqual(
      result.summary.verified + result.summary.missing,
      result.summary.total
    );
  });
});
