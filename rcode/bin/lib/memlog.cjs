/**
 * Memlog — the run's append-only memory.
 *
 * The problem it solves: rcode recorded decisions with `state add-decision`,
 * manually, usually at the end of a session when someone remembered. Everything
 * decided in between — an override, an assumption, a change of direction —
 * existed only in the conversation, and was gone on the next `/clear` or resume.
 * That is how a project ends up with artifacts nobody can explain and a state
 * file that disagrees with what actually happened.
 *
 * The contract: one line per event, appended AS THE WORK HAPPENS, never
 * reconstructed afterwards. Whatever is not logged is lost on resume.
 *
 * Deliberately append-only and never rewritten. A log you can edit is a log you
 * can quietly correct, which defeats the point — a wrong entry is followed by a
 * correcting entry, so the disagreement itself stays visible.
 *
 * This does NOT replace state.decisions[] / ~/.rcode/decisions.jsonl. Those are
 * the curated, queryable record of decisions that stuck. The memlog is the raw
 * trail, including the ones that were reversed.
 */

const fs = require('fs');
const path = require('path');

const TYPES = Object.freeze(['decision', 'change', 'override', 'assumption', 'event', 'blocker']);
const HEADER = `# Memlog

Append-only. One line per event, written as the work happens.
Never edit or delete a line — append a correcting entry instead, so the
disagreement stays visible.

| When | Type | Entry |
|------|------|-------|
`;

function memlogPath(planningDir) {
  return path.join(planningDir, 'MEMLOG.md');
}

function ensureMemlog(planningDir) {
  const p = memlogPath(planningDir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, HEADER, 'utf8');
    return { created: true, path: p };
  }
  return { created: false, path: p };
}

/** Escape pipes so a free-text entry cannot break the markdown table. */
function cell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function append(planningDir, { type, text, phase }) {
  if (!type) throw new Error(`memlog append requires --type (${TYPES.join('|')})`);
  if (!TYPES.includes(type)) {
    throw new Error(`unknown memlog type "${type}" — expected one of: ${TYPES.join(', ')}`);
  }
  if (!text || !String(text).trim()) throw new Error('memlog append requires --text');

  ensureMemlog(planningDir);
  const p = memlogPath(planningDir);
  const when = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const label = phase ? `${type} · phase ${phase}` : type;
  const line = `| ${when} | ${cell(label)} | ${cell(text)} |\n`;

  // appendFileSync is atomic enough for single-line appends on every platform
  // rcode targets, and an append cannot corrupt earlier lines the way a
  // read-modify-write can when two agents log at once.
  fs.appendFileSync(p, line, 'utf8');
  return { ok: true, appended: true, type, path: path.relative(path.dirname(planningDir), p) };
}

function read(planningDir, { type, limit } = {}) {
  const p = memlogPath(planningDir);
  if (!fs.existsSync(p)) return { ok: true, exists: false, entries: [] };
  const rows = fs.readFileSync(p, 'utf8').split('\n')
    .filter((l) => l.startsWith('| 2') || /^\| \d{4}-/.test(l))
    .map((l) => {
      // Split on unescaped pipes only. cell() writes `\|` for a literal pipe in
      // the text; a naive split('|') tore one entry into three columns and lost
      // the tail. Caught by a test, not by reading the code.
      const parts = l.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
      return { when: parts[1] || '', type: parts[2] || '', text: parts[3] || '' };
    });
  let entries = type ? rows.filter((r) => r.type.split(' ')[0] === type) : rows;
  if (limit) entries = entries.slice(-Number(limit));
  return { ok: true, exists: true, total: rows.length, entries };
}

/**
 * Unresolved assumptions and overrides — the entries that must not be forgotten
 * at a milestone boundary. An assumption still sitting here after a whole
 * milestone is a finding, not a formality.
 */
function open(planningDir) {
  const all = read(planningDir);
  if (!all.exists) return { ok: true, exists: false, open: [] };
  const flagged = all.entries.filter((e) => {
    const t = e.type.split(' ')[0];
    return t === 'assumption' || t === 'override' || t === 'blocker';
  });
  return { ok: true, exists: true, open: flagged, count: flagged.length };
}

function dispatch(planningDir, args) {
  const sub = args[0];
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i !== -1 ? args[i + 1] : undefined;
  };
  switch (sub) {
    case 'init':   return { ok: true, ...ensureMemlog(planningDir) };
    case 'append': return append(planningDir, { type: flag('type'), text: flag('text'), phase: flag('phase') });
    case 'read':   return read(planningDir, { type: flag('type'), limit: flag('limit') });
    case 'open':   return open(planningDir);
    default:
      throw new Error(`Unknown memlog subcommand: ${sub}. Use: init | append | read | open`);
  }
}

module.exports = { dispatch, append, read, open, ensureMemlog, TYPES };
