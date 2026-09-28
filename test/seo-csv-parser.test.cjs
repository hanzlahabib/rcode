/**
 * Tests for rcode/skills/seo/seo-os/scripts/lib/csv-parser.cjs.
 *
 * Run: node --test test/seo-csv-parser.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LIB = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'lib', 'csv-parser.cjs');
const { parseCsv } = require(LIB);

test('parses a simple CSV with a header and two rows', () => {
  const rows = parseCsv('a,b,c\n1,2,3\n4,5,6\n');
  assert.deepStrictEqual(rows, [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
    ['4', '5', '6'],
  ]);
});

test('strips a leading UTF-8 BOM', () => {
  const rows = parseCsv('﻿a,b\n1,2\n');
  assert.deepStrictEqual(rows, [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('handles quoted fields containing commas', () => {
  const rows = parseCsv('name,note\n"Doe, John",hello\n');
  assert.deepStrictEqual(rows, [
    ['name', 'note'],
    ['Doe, John', 'hello'],
  ]);
});

test('handles quoted fields containing embedded newlines', () => {
  const rows = parseCsv('name,note\n"line1\nline2",value2\n');
  assert.deepStrictEqual(rows, [
    ['name', 'note'],
    ['line1\nline2', 'value2'],
  ]);
});

test('handles escaped double-quotes inside a quoted field', () => {
  const rows = parseCsv('name,quote\nJohn,"she said ""hi"""\n');
  assert.deepStrictEqual(rows, [
    ['name', 'quote'],
    ['John', 'she said "hi"'],
  ]);
});

test('handles CRLF line endings', () => {
  const rows = parseCsv('a,b\r\n1,2\r\n3,4\r\n');
  assert.deepStrictEqual(rows, [
    ['a', 'b'],
    ['1', '2'],
    ['3', '4'],
  ]);
});

test('handles a lone CR as a row terminator', () => {
  const rows = parseCsv('a,b\r1,2\r');
  assert.deepStrictEqual(rows, [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('drops a trailing blank line', () => {
  const rows = parseCsv('a,b\n1,2\n\n');
  assert.deepStrictEqual(rows, [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('handles a file with no trailing newline at all', () => {
  const rows = parseCsv('a,b\n1,2');
  assert.deepStrictEqual(rows, [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('handles an empty string as zero rows', () => {
  assert.deepStrictEqual(parseCsv(''), []);
});

test('throws a clear error on an unterminated quoted field', () => {
  assert.throws(() => parseCsv('a,b\n"unterminated,2\n'), /unterminated quoted field/);
});

test('throws when given a non-string input', () => {
  assert.throws(() => parseCsv(null), /expects a string/);
  assert.throws(() => parseCsv(42), /expects a string/);
});
