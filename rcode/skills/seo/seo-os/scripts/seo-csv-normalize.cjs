#!/usr/bin/env node
/**
 * seo-csv-normalize.cjs — normalizes a raw GSC/Ahrefs CSV export into the
 * canonical row shape documented in ../references/DATA-WORKSPACE.md (spec
 * §4/§49). Downstream scripts (seo-gsc-striking-distance.cjs,
 * seo-gsc-decay.cjs) consume this script's JSON output; they never parse CSV
 * themselves.
 *
 * Three canonical schemas (field lists and header aliases are LAW — Lane
 * D/F reference docs describe these exact names, do not rename):
 *
 *   gsc-queries               query, clicks, impressions, ctr, position,
 *                             page (optional)
 *   gsc-pages                 page, clicks, impressions, ctr, position
 *   ahrefs-organic-keywords   keyword, volume, difficulty, cpc, position, url,
 *                             serpFeatures, parentTopic, country
 *
 * `gsc-queries`'s `page` field is OPTIONAL, not required: GSC's default
 * Queries export has no page dimension at all (one row per query, aggregated
 * across every page it ranks on), but GSC also supports exporting/querying
 * the combined query+page dimension, which puts a ranking URL on every row —
 * that's what `page` captures when present (aliases: "Page"/"Landing
 * Page"/"URL"). Downstream (seo-gsc-striking-distance.cjs) groups by URL and
 * detects cannibalization (a query with rows for more than one distinct
 * page) only when this field is populated; the schema and every script
 * consuming it keep working identically when it's absent.
 *
 * For `ahrefs-organic-keywords`, only keyword/volume/difficulty/cpc/
 * position/url are treated as REQUIRED. serpFeatures/parentTopic/country are
 * normalized when present but may be blank — real Ahrefs exports routinely
 * leave "Parent Topic" and "SERP Features" empty for many keywords, and
 * failing an entire row over an empty SERP-features cell would defeat the
 * point of the importer. This is a closest-correct reading of spec §49's
 * "validate required fields" rule applied to data that is genuinely optional
 * in practice — DATA-WORKSPACE.md's schema table documents the same
 * optionality.
 *
 * Numeric parsing rules (explicit, not guessed row-by-row):
 *   - thousands separators are stripped: "1,234" -> 1234
 *   - a trailing "%" divides by 100: "0.8%" -> 0.008
 *   - a bare number for a CTR field is assumed to ALREADY be a decimal
 *     fraction (e.g. 0.008 == 0.8%) — CTR is stored as a fraction in 0..1
 *     everywhere downstream, never as a whole percentage number
 *   - a trailing "%" on a non-CTR numeric field (clicks/impressions/
 *     position/volume/difficulty/cpc) is treated as malformed, not silently
 *     reinterpreted
 *   - US/UK number format only: comma is ALWAYS treated as a thousands
 *     separator and "." as the decimal point. A European-style value
 *     ("1.234,56") does not parse under this rule — stripping the comma
 *     leaves "1.234.56", which fails the numeric regex and the row is
 *     skipped with a reason. This is a deliberate fail-loud choice, not a
 *     gap: guessing which locale a cell is in is exactly the "silently
 *     interpret malformed input" spec §49 warns against. A project whose
 *     exports use European formatting needs a locale option added here
 *     explicitly, not a silent auto-detect.
 *   - abbreviated suffixes ("1.2k", "3.4M") are NOT expanded — they fail the
 *     numeric regex and the row is skipped with a reason, for the same
 *     fail-loud-over-guess reason.
 *
 * Header matching is case- and whitespace-insensitive via an alias table per
 * schema (spec §49's "Top queries"/"Query"/"Queries" example, plus Ahrefs'
 * "KD"/"Difficulty", "Current URL"/"URL", "Current position"/"Position").
 * A column that maps to no known field is ignored and reported in
 * `warnings`, not silently dropped without a trace.
 *
 * A row with a missing/invalid required field is never guessed — it goes to
 * `skipped: [{ line, reason }]` and is excluded from `rows`. `line` is the
 * 1-based ordinal position of that row within the CSV (the header is line 1,
 * the first data row is line 2); it can drift from the *physical* file line
 * number only when a quoted field embeds a literal newline, which is called
 * out here rather than left implicit.
 *
 * Usage:
 *   node seo-csv-normalize.cjs --schema=<gsc-queries|gsc-pages|ahrefs-organic-keywords> <in.csv> [--out=f]
 *
 * Output (stdout, and also written to --out if given):
 *   { schema, rows, validCount, skipped: [{line, reason}], warnings: [] }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseCsv } = require('./lib/csv-parser.cjs');

const SCHEMAS = {
  'gsc-queries': {
    fields: ['query', 'page', 'clicks', 'impressions', 'ctr', 'position'],
    // `page` is intentionally absent from `required` — see module doc above.
    required: ['query', 'clicks', 'impressions', 'ctr', 'position'],
    aliases: {
      query: ['top queries', 'query', 'queries', 'keyword'],
      page: ['page', 'landing page', 'url'],
    },
    numeric: new Set(['clicks', 'impressions', 'ctr', 'position']),
  },
  'gsc-pages': {
    fields: ['page', 'clicks', 'impressions', 'ctr', 'position'],
    required: ['page', 'clicks', 'impressions', 'ctr', 'position'],
    aliases: {
      page: ['top pages', 'page', 'pages', 'url'],
    },
    numeric: new Set(['clicks', 'impressions', 'ctr', 'position']),
  },
  'ahrefs-organic-keywords': {
    fields: ['keyword', 'volume', 'difficulty', 'cpc', 'position', 'url', 'serpFeatures', 'parentTopic', 'country'],
    // See DEVIATION note above the module doc — serpFeatures/parentTopic/country
    // are normalized but not required.
    required: ['keyword', 'volume', 'difficulty', 'cpc', 'position', 'url'],
    aliases: {
      keyword: ['keyword'],
      volume: ['volume', 'search volume'],
      difficulty: ['kd', 'difficulty'],
      cpc: ['cpc'],
      position: ['current position', 'position'],
      url: ['current url', 'url'],
      serpFeatures: ['serp features', 'serpfeatures'],
      parentTopic: ['parent topic', 'parenttopic'],
      country: ['country'],
    },
    numeric: new Set(['volume', 'difficulty', 'cpc', 'position']),
  },
};

/**
 * Lowercase + collapse-whitespace a header string so alias matching is
 * case- and whitespace-insensitive.
 * @param {string} raw
 */
function normalizeHeaderKey(raw) {
  return String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * @param {object} schema
 * @returns {Map<string,string>} normalized alias text -> canonical field name
 */
function buildHeaderLookup(schema) {
  const map = new Map();
  for (const field of schema.fields) {
    const aliases = schema.aliases[field] || [field];
    for (const alias of aliases) {
      const key = normalizeHeaderKey(alias);
      if (map.has(key) && map.get(key) !== field) {
        throw new Error(`Alias "${alias}" is ambiguous between "${map.get(key)}" and "${field}" in schema config.`);
      }
      map.set(key, field);
    }
  }
  return map;
}

/**
 * Parse one numeric cell. Returns NaN (never throws) on malformed input so
 * the caller can record a per-row skip reason instead of crashing the whole
 * import over one bad cell.
 *
 * @param {string} raw
 * @param {boolean} isCtr - CTR fields treat a bare number as already-a-fraction
 * @returns {number}
 */
function parseNumericField(raw, isCtr) {
  const trimmed = raw.trim();
  if (trimmed === '') return NaN;
  const hasPercent = trimmed.endsWith('%');
  if (hasPercent && !isCtr) return NaN; // unexpected % sign on a non-CTR numeric field
  const body = (hasPercent ? trimmed.slice(0, -1) : trimmed).replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(body)) return NaN;
  const value = Number(body);
  if (isCtr) return hasPercent ? value / 100 : value;
  return value;
}

/**
 * @param {string} schemaName
 * @param {string} csvText
 * @returns {{schema: string, rows: object[], validCount: number, skipped: Array<{line:number,reason:string}>, warnings: string[]}}
 */
function normalizeCsv(schemaName, csvText) {
  const schema = SCHEMAS[schemaName];
  if (!schema) {
    throw new Error(`Unknown schema "${schemaName}". Known schemas: ${Object.keys(SCHEMAS).join(', ')}`);
  }

  const table = parseCsv(csvText);
  if (table.length === 0) {
    throw new Error('CSV has no rows (not even a header).');
  }

  const headerRow = table[0];
  const headerLookup = buildHeaderLookup(schema);
  const columnFields = [];
  const seenFields = new Set();
  const unmapped = [];
  const warnings = [];

  headerRow.forEach((rawHeader) => {
    const key = normalizeHeaderKey(rawHeader);
    const field = headerLookup.get(key) || null;
    if (field) {
      if (seenFields.has(field)) {
        throw new Error(`CSV header has two columns mapping to "${field}" (header: "${rawHeader}"). Headers: ${headerRow.join(', ')}`);
      }
      seenFields.add(field);
    } else {
      unmapped.push(rawHeader);
    }
    columnFields.push(field);
  });

  if (unmapped.length > 0) {
    warnings.push(`Unmapped column(s) ignored: ${unmapped.map((h) => JSON.stringify(h)).join(', ')}`);
  }

  const missingRequired = schema.required.filter((f) => !seenFields.has(f));
  if (missingRequired.length > 0) {
    throw new Error(
      `CSV header is missing required field(s): ${missingRequired.join(', ')}. Found headers: ${headerRow.join(', ')}`
    );
  }

  const rows = [];
  const skipped = [];

  for (let r = 1; r < table.length; r += 1) {
    const rawRow = table[r];
    const line = r + 1; // 1-based; header is line 1

    if (rawRow.length !== headerRow.length) {
      skipped.push({ line, reason: `row has ${rawRow.length} column(s), header has ${headerRow.length}` });
      continue;
    }

    const record = {};
    let rowError = null;

    for (let c = 0; c < rawRow.length; c += 1) {
      const field = columnFields[c];
      if (!field) continue; // unmapped column — already warned about at header level
      const raw = rawRow[c].trim();

      if (schema.numeric.has(field)) {
        if (raw === '') {
          if (schema.required.includes(field)) {
            rowError = `missing required field "${field}"`;
            break;
          }
          record[field] = null;
          continue;
        }
        const parsed = parseNumericField(raw, field === 'ctr');
        if (Number.isNaN(parsed)) {
          rowError = `invalid numeric value for "${field}": ${JSON.stringify(rawRow[c])}`;
          break;
        }
        record[field] = parsed;
      } else {
        if (raw === '' && schema.required.includes(field)) {
          rowError = `missing required field "${field}"`;
          break;
        }
        record[field] = raw;
      }
    }

    if (rowError) {
      skipped.push({ line, reason: rowError });
      continue;
    }

    rows.push(record);
  }

  return { schema: schemaName, rows, validCount: rows.length, skipped, warnings };
}

function parseArgs(argv) {
  const args = { schema: null, input: null, out: null };
  for (const arg of argv) {
    if (arg.startsWith('--schema=')) {
      args.schema = arg.slice('--schema='.length);
    } else if (arg.startsWith('--out=')) {
      args.out = arg.slice('--out='.length);
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      args.input = arg;
    }
  }
  return args;
}

function main(argv) {
  const usage = 'Usage: node seo-csv-normalize.cjs --schema=<gsc-queries|gsc-pages|ahrefs-organic-keywords> <in.csv> [--out=f]';
  const args = parseArgs(argv.slice(2));
  if (!args.schema) throw new Error(usage);
  if (!args.input) throw new Error(usage);

  const resolvedInput = path.resolve(args.input);
  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Input file not found: ${resolvedInput}`);
  }

  const csvText = fs.readFileSync(resolvedInput, 'utf8');
  const result = normalizeCsv(args.schema, csvText);
  const json = JSON.stringify(result, null, 2) + '\n';

  if (args.out) {
    fs.writeFileSync(path.resolve(args.out), json);
  }
  process.stdout.write(json);
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-csv-normalize: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { normalizeCsv, parseNumericField, normalizeHeaderKey, buildHeaderLookup, SCHEMAS };
