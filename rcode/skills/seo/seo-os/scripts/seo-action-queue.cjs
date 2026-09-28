#!/usr/bin/env node
/**
 * seo-action-queue.cjs — `add`/`list` over the Markdown action-queue table
 * at `.rcode/seo/actions/ACTIONS.md` (default; override with --file). See
 * ../../../../templates/seo/ACTIONS.md for the file this bootstraps from,
 * and ACTION-QUEUE.md for the workflow that calls this script.
 *
 * Mirrors seo-project-init.cjs's never-overwrite-what-exists idiom: the file
 * is created from the template on first use and never clobbered afterwards
 * — `add` only ever appends a row (or reports a duplicate) to what's there.
 *
 * Action record fields (spec §44, LAW — do not rename):
 *   project, url, issue, evidence, action, priority (HIGH|MEDIUM|LOW),
 *   effort (LOW|MEDIUM|HIGH), expectedEffect,
 *   status (OPEN|IN_PROGRESS|OBSERVING|DONE|REJECTED|NEEDS_OWNER_INPUT|
 *           NEEDS_SCREENSHOT|NEEDS_CUSTOMER_DATA|NEEDS_CASE_STUDY|
 *           NEEDS_EXPERT_REVIEW),
 *   created, lastReviewed
 *
 * Dedupe (spec §45): normalized (project, url, issue) is the key. ANY existing
 * row for that key blocks a plain `add` by default, regardless of its
 * status — "existing action? already implemented? already tested?
 * explicitly rejected? currently observing?" are all the same check: does a
 * record already exist. A `DONE` or `REJECTED` row is exactly the case spec
 * §45 exists to prevent re-discovering — a monthly review re-running the
 * same GSC analysis must not silently re-add something already shipped or
 * already declined.
 *
 * Legitimate re-proposal (the underlying situation changed enough to justify
 * a fresh record) requires an explicit `--reopen` flag plus a required
 * `--reopenReason`, so the override is deliberate and auditable rather than
 * silent. A blocked `add` surfaces the prior row's status via `priorStatus`
 * so the caller can decide whether to reopen without a second lookup.
 *
 * Usage:
 *   node seo-action-queue.cjs add --file=f --project= --url= --issue=
 *     --evidence= --action= --priority= --effort= --expectedEffect=
 *     [--status=OPEN] [--reopen --reopenReason="why this is being re-proposed"]
 *   node seo-action-queue.cjs list --file=f [--status=] [--priority=]
 *
 * Output (stdout):
 *   add:  { added, reason, priorStatus, reopenReason, row }
 *   list: { rows }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const COLUMNS = ['project', 'url', 'issue', 'evidence', 'action', 'priority', 'effort', 'expectedEffect', 'status', 'created', 'lastReviewed'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const EFFORTS = ['LOW', 'MEDIUM', 'HIGH'];
const ACTION_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'OBSERVING',
  'DONE',
  'REJECTED',
  'NEEDS_OWNER_INPUT',
  'NEEDS_SCREENSHOT',
  'NEEDS_CUSTOMER_DATA',
  'NEEDS_CASE_STUDY',
  'NEEDS_EXPERT_REVIEW',
];
// Every status blocks a plain re-add by default (spec §45) — including DONE
// and REJECTED, which are exactly the "already implemented" / "explicitly
// rejected" cases the pre-add check exists to catch. Use --reopen (with a
// required --reopenReason) to intentionally re-propose the same
// (project, url, issue) anyway.
const DEDUPE_BLOCKING_STATUSES = [...ACTION_STATUSES];

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/**
 * Split one Markdown table row line into cells, resolving `\|` escapes.
 * @param {string} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === '\\' && trimmed[i + 1] === '|') {
      cur += '|';
      i += 1;
      continue;
    }
    if (ch === '|') {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/**
 * @param {string} text - full ACTIONS.md content
 * @returns {object[]} rows in file order
 */
function parseActionsTable(text) {
  const lines = text.split('\n');
  const headerIdx = lines.findIndex((l) => /^\s*\|\s*project\s*\|/i.test(l));
  if (headerIdx === -1) return [];

  const rows = [];
  for (let i = headerIdx + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) break;
    const cells = splitTableRow(line);
    if (cells.length !== COLUMNS.length) {
      throw new Error(`ACTIONS.md row at line ${i + 1} has ${cells.length} column(s), expected ${COLUMNS.length}: ${line}`);
    }
    const row = {};
    COLUMNS.forEach((col, idx) => {
      row[col] = cells[idx];
    });
    rows.push(row);
  }
  return rows;
}

/**
 * @param {object[]} rows
 * @returns {string} the header + divider + row lines, newline-terminated
 */
function renderActionsTable(rows) {
  const header = `| ${COLUMNS.join(' | ')} |`;
  const divider = `|${COLUMNS.map(() => '---').join('|')}|`;
  if (rows.length === 0) return `${header}\n${divider}\n`;
  const body = rows.map((row) => `| ${COLUMNS.map((c) => escapeCell(row[c])).join(' | ')} |`).join('\n');
  return `${header}\n${divider}\n${body}\n`;
}

/**
 * Rewrite full file content: preserve everything before the table header
 * verbatim, replace the table itself with `rows`.
 * @param {string} originalText
 * @param {object[]} rows
 */
function renderFullFile(originalText, rows) {
  const lines = originalText.split('\n');
  const headerIdx = lines.findIndex((l) => /^\s*\|\s*project\s*\|/i.test(l));
  if (headerIdx === -1) {
    throw new Error('ACTIONS.md is missing the required table header row (expected a line starting with "| project |").');
  }
  const preamble = lines.slice(0, headerIdx).join('\n');
  const separator = preamble.length === 0 ? '' : `${preamble}\n`;
  return `${separator}${renderActionsTable(rows)}`;
}

/**
 * @param {string} project
 * @param {string} url
 * @param {string} issue
 * @returns {string}
 */
function normalizeDedupeKey(project, url, issue) {
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  return `${norm(project)}\u0000${norm(url)}\u0000${norm(issue)}`;
}

/**
 * Pure: append (or report a duplicate for) a new action row.
 * @param {object[]} existingRows
 * @param {object} fields - { project, url, issue, evidence, action, priority, effort, expectedEffect, status?, created?, lastReviewed?, reopen?, reopenReason? }
 * @returns {{added: boolean, reason: (string|null), priorStatus: (string|null), reopenReason: (string|null), row: object, rows: object[]}}
 */
function addActionRow(existingRows, fields) {
  const required = ['project', 'url', 'issue', 'evidence', 'action', 'priority', 'effort', 'expectedEffect'];
  const missing = required.filter((f) => !fields[f]);
  if (missing.length > 0) {
    throw new Error(`Missing required field(s): ${missing.join(', ')}`);
  }
  if (!PRIORITIES.includes(fields.priority)) {
    throw new Error(`priority must be one of ${PRIORITIES.join('|')}, got "${fields.priority}"`);
  }
  if (!EFFORTS.includes(fields.effort)) {
    throw new Error(`effort must be one of ${EFFORTS.join('|')}, got "${fields.effort}"`);
  }
  const status = fields.status || 'OPEN';
  if (!ACTION_STATUSES.includes(status)) {
    throw new Error(`status must be one of ${ACTION_STATUSES.join('|')}, got "${status}"`);
  }

  const key = normalizeDedupeKey(fields.project, fields.url, fields.issue);
  const existing = existingRows.find(
    (row) => DEDUPE_BLOCKING_STATUSES.includes(row.status) && normalizeDedupeKey(row.project, row.url, row.issue) === key
  );

  if (existing && !fields.reopen) {
    return { added: false, reason: 'duplicate', priorStatus: existing.status, reopenReason: null, row: existing, rows: existingRows };
  }

  if (existing && fields.reopen && !fields.reopenReason) {
    throw new Error(
      '--reopen requires --reopenReason explaining why this (project, url, issue) is being re-proposed.'
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const newRow = {
    project: fields.project,
    url: fields.url,
    issue: fields.issue,
    evidence: fields.evidence,
    action: fields.action,
    priority: fields.priority,
    effort: fields.effort,
    expectedEffect: fields.expectedEffect,
    status,
    created: fields.created || today,
    lastReviewed: fields.lastReviewed || today,
  };
  return {
    added: true,
    reason: existing ? 'reopened' : null,
    priorStatus: existing ? existing.status : null,
    reopenReason: existing ? fields.reopenReason : null,
    row: newRow,
    rows: [...existingRows, newRow],
  };
}

/**
 * Resolve the ACTIONS.md template, trying the installed location first and
 * falling back to the source tree (mirrors seo-project-init.cjs's
 * resolveTemplateSource, applied to this single file).
 */
function resolveActionsTemplatePath() {
  const candidates = [];
  if (process.env.RCODE_PROJECT_ROOT) {
    candidates.push(path.join(path.resolve(process.env.RCODE_PROJECT_ROOT), '.rcode', 'templates', 'seo', 'ACTIONS.md'));
  }
  // Installed layout: <project>/.claude/skills/rcode-seo-os/scripts/this-file.cjs
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', '.rcode', 'templates', 'seo', 'ACTIONS.md'));
  candidates.push(path.join(process.cwd(), '.rcode', 'templates', 'seo', 'ACTIONS.md'));
  // Source tree fallback: rcode/skills/seo/seo-os/scripts/this-file.cjs
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', 'templates', 'seo', 'ACTIONS.md'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not locate ACTIONS.md template. Checked:\n${candidates.map((c) => `  - ${c}`).join('\n')}`);
}

/**
 * Read the actions file, creating it from the template on first use.
 * Never overwrites an existing file.
 * @param {string} filePath
 * @returns {string}
 */
function ensureActionsFile(filePath) {
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  const templatePath = resolveActionsTemplatePath();
  const templateText = fs.readFileSync(templatePath, 'utf8');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, templateText);
  return templateText;
}

function parseFlags(argv) {
  const flags = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      flags[arg.slice(2)] = true;
    } else {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    }
  }
  return flags;
}

function defaultActionsFile() {
  return path.join(process.cwd(), '.rcode', 'seo', 'actions', 'ACTIONS.md');
}

function main(argv) {
  const command = argv[2];
  const flags = parseFlags(argv.slice(3));
  const filePath = path.resolve(typeof flags.file === 'string' ? flags.file : defaultActionsFile());

  if (command === 'add') {
    const originalText = ensureActionsFile(filePath);
    const existingRows = parseActionsTable(originalText);
    const result = addActionRow(existingRows, {
      project: flags.project,
      url: flags.url,
      issue: flags.issue,
      evidence: flags.evidence,
      action: flags.action,
      priority: flags.priority,
      effort: flags.effort,
      expectedEffect: flags.expectedEffect,
      status: typeof flags.status === 'string' ? flags.status : undefined,
      reopen: flags.reopen === true || flags.reopen === 'true',
      reopenReason: typeof flags.reopenReason === 'string' ? flags.reopenReason : undefined,
    });
    if (result.added) {
      fs.writeFileSync(filePath, renderFullFile(originalText, result.rows));
    }
    process.stdout.write(
      JSON.stringify(
        { added: result.added, reason: result.reason, priorStatus: result.priorStatus, reopenReason: result.reopenReason, row: result.row },
        null,
        2
      ) + '\n'
    );
    return;
  }

  if (command === 'list') {
    const originalText = ensureActionsFile(filePath);
    let rows = parseActionsTable(originalText);
    if (typeof flags.status === 'string') rows = rows.filter((r) => r.status === flags.status);
    if (typeof flags.priority === 'string') rows = rows.filter((r) => r.priority === flags.priority);
    process.stdout.write(JSON.stringify({ rows }, null, 2) + '\n');
    return;
  }

  throw new Error('Usage: node seo-action-queue.cjs <add|list> [--file=f] [...]');
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-action-queue: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  parseActionsTable,
  renderActionsTable,
  renderFullFile,
  normalizeDedupeKey,
  addActionRow,
  ensureActionsFile,
  resolveActionsTemplatePath,
  COLUMNS,
  PRIORITIES,
  EFFORTS,
  ACTION_STATUSES,
  DEDUPE_BLOCKING_STATUSES,
};
