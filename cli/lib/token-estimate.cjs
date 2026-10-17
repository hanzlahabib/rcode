/**
 * cli/lib/token-estimate.cjs — the single token estimator for rcode.
 *
 * Shared by scripts/token-budget.cjs (the CI gate, measured from repo source)
 * and `rcode doctor --tokens` (measured from what is on disk). Keeping one
 * implementation means a doctor figure and a gate figure are comparable.
 *
 * Tokens are chars / 4: crude but stable, dependency-free and monotonic, which
 * is what a regression gate needs.
 */

'use strict';

const CHARS_PER_TOKEN = 4;
// Per listed item the host prints roughly "- <name>: <description>" plus
// framing; 4 chars is the same overhead the design budget used.
const LISTING_LINE_OVERHEAD_CHARS = 4;

const tokens = (chars) => Math.ceil(chars / CHARS_PER_TOKEN);
const lineChars = (item) => item.name.length + item.description.length + LISTING_LINE_OVERHEAD_CHARS;

/** Minimal frontmatter reader: scalars, double/single-quoted, `>`/`|` blocks. */
function readFrontmatter(raw) {
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---', 4);
  if (end === -1) return {};
  const lines = text.slice(4, end).split('\n');
  const fm = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (/^[>|][+-]?$/.test(val)) {
      const parts = [];
      while (i + 1 < lines.length && /^\s/.test(lines[i + 1])) parts.push(lines[++i].trim());
      val = parts.join(' ');
    } else if (val.startsWith('"') && val.endsWith('"') && val.length > 1) {
      try { val = JSON.parse(val); } catch { val = val.slice(1, -1); }
    } else if (val.startsWith("'") && val.endsWith("'") && val.length > 1) {
      val = val.slice(1, -1).replace(/''/g, "'");
    }
    fm[m[1]] = val;
  }
  return fm;
}

module.exports = { CHARS_PER_TOKEN, LISTING_LINE_OVERHEAD_CHARS, tokens, lineChars, readFrontmatter };
