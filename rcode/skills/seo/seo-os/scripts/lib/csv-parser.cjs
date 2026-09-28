/**
 * csv-parser.cjs — pure, zero-dependency RFC4180-ish CSV tokenizer shared by
 * the seo-os data-ingestion scripts (seo-csv-normalize.cjs today; any future
 * CSV consumer should reuse this rather than hand-rolling a `.split(',')`).
 *
 * Handles:
 *   - UTF-8 BOM (stripped from the start of input)
 *   - quoted fields containing commas, newlines, and escaped quotes (`""`)
 *   - CRLF, LF, and lone-CR line endings
 *   - a trailing blank line (dropped, not emitted as an empty row)
 *
 * Does NOT interpret headers, types, or schemas — that is
 * seo-csv-normalize.cjs's job. This module only turns text into
 * `string[][]`.
 */

'use strict';

/**
 * @param {string} text
 * @returns {string[][]} rows of raw string cells, in file order
 */
function parseCsv(text) {
  if (typeof text !== 'string') {
    throw new Error('parseCsv expects a string.');
  }

  // Strip a leading UTF-8 BOM (U+FEFF) if present — common in exports from
  // Excel/Google Sheets/Ahrefs.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          // Escaped quote inside a quoted field.
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // Treat CRLF and lone CR both as a row terminator.
      if (input[i + 1] === '\n') i += 1;
      pushRow();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (inQuotes) {
    throw new Error('parseCsv: unterminated quoted field — the file ended while a quote was still open.');
  }

  // Flush the last field/row when the input doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // Drop a trailing wholly-empty row (a trailing blank line in the file, or
  // the artifact of a file that ends with a newline followed by nothing).
  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === '') {
      rows.pop();
    } else {
      break;
    }
  }

  return rows;
}

module.exports = { parseCsv };
