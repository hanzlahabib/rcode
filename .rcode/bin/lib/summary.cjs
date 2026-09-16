/**
 * Summary — SUMMARY.md field extraction and compact state.json snapshots.
 *
 * Extracted from rcode-tools.cjs's cmdSummaryExtract + cmdStateSnapshot
 * (issue #204) — pure mechanical move, no behavior change.
 */

const fs = require('fs');
const path = require('path');

/**
 * cmdSummaryExtract — surgically pull named fields from a SUMMARY.md.
 * Avoids whole-file loads when the caller only wants one or two headings.
 * Usage: summary-extract <path> --fields one_liner,status
 */
function cmdSummaryExtract(args) {
  const filePath = args[0];
  const fieldsFlag = args.indexOf('--fields');
  const fields = fieldsFlag >= 0 ? (args[fieldsFlag + 1] || '').split(',').map(s => s.trim()).filter(Boolean) : ['one_liner'];

  if (!filePath) return { ok: false, error: 'Usage: summary-extract <path> [--fields a,b,c]' };
  if (!fs.existsSync(filePath)) return { ok: false, error: `file not found: ${filePath}` };

  const text = fs.readFileSync(filePath, 'utf8');
  const out = { ok: true, path: filePath };

  const fieldToPatterns = {
    one_liner: [/^##\s+One[-\s]?liner\s*\n([\s\S]*?)(?=\n##|\n---|$)/im, /^##\s+Summary\s*\n([\s\S]*?)(?=\n##|\n---|$)/im],
    status: [/^##\s+Status\s*\n([\s\S]*?)(?=\n##|\n---|$)/im, /^status:\s*(.+)$/im],
    outcomes: [/^##\s+Outcomes?\s*\n([\s\S]*?)(?=\n##|\n---|$)/im],
    decisions: [/^##\s+Decisions?\s*\n([\s\S]*?)(?=\n##|\n---|$)/im],
    blockers: [/^##\s+Blockers?\s*\n([\s\S]*?)(?=\n##|\n---|$)/im],
    followups: [/^##\s+Follow[-\s]?ups?\s*\n([\s\S]*?)(?=\n##|\n---|$)/im, /^##\s+Next[-\s]?steps?\s*\n([\s\S]*?)(?=\n##|\n---|$)/im],
  };

  for (const f of fields) {
    const patterns = fieldToPatterns[f] || [new RegExp(`^##\\s+${f.replace(/_/g, '[ _-]?')}\\s*\\n([\\s\\S]*?)(?=\\n##|\\n---|$)`, 'im')];
    let value = null;
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[1]) { value = m[1].trim().split('\n').map(l => l.trim()).filter(Boolean).join('\n'); break; }
    }
    // Fallback for one_liner: first non-empty paragraph after H1
    if (f === 'one_liner' && !value) {
      const afterH1 = text.replace(/^#[^\n]*\n/, '');
      const firstPara = afterH1.match(/^[^\n#][^\n]*(?:\n(?!\n)[^\n#][^\n]*)*/m);
      if (firstPara) value = firstPara[0].trim();
    }
    out[f] = value;
  }

  return out;
}

/**
 * cmdStateSnapshot — compact, display-friendly state extract.
 * Hides internal machinery (lock metadata, full history) from callers
 * that only need a render-ready summary.
 */
function cmdStateSnapshot({ RCODE_DIR }) {
  const statePath = path.join(RCODE_DIR, 'state.json');
  if (!fs.existsSync(statePath)) return { ok: true, state: null };
  let state;
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
  catch (e) { return { ok: false, error: `invalid state.json: ${e.message}` }; }

  return {
    ok: true,
    project: state.project,
    current_phase: state.current_phase,
    current_plan: state.current_plan,
    current_sprint: state.current_sprint,
    phase_count: (state.phases || []).length,
    decisions_count: (state.decisions || []).length,
    blockers_open: (state.blockers || []).filter(b => !b.resolved).length,
    last_session: state.last_session,
    updated: state.updated,
    active_workstream: state.active_workstream,
  };
}

module.exports = { cmdSummaryExtract, cmdStateSnapshot };
