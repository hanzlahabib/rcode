/**
 * Schema validators for rcode's own artifacts.
 *
 * Validates SKILL.md frontmatter, agent frontmatter, and `.rcode/state.json`
 * against zod schemas — mirroring the zod usage style in `cli/lib/config.cjs`.
 *
 * Why: today malformed SKILL.md / agent frontmatter is only caught by brittle
 * grep checks (the old AGENTS.md 5-component snippet). Schema validation gives
 * a single, testable enforcement point used by both `cli/doctor.js` and
 * `scripts/dogfood-check.sh`.
 *
 * Each `validate*` function returns `{ ok: boolean, errors: string[] }` so
 * callers can print actionable diagnostics without try/catch noise.
 *
 * Exports only — no side effects.
 */

const { z } = require('zod');

// ---------- Frontmatter parser ----------

/**
 * Extract YAML frontmatter from a markdown document.
 *
 * Handles three value shapes seen in rcode artifacts:
 *   - plain scalars:        `name: rcode-foo`
 *   - folded multiline:     `description: >` followed by indented lines
 *   - block sequences:      `triggers:` followed by `  - "phrase"` lines
 *
 * Kept intentionally minimal — matches the parser used in
 * `test/compliance.test.cjs` but adds folded-scalar + list support, because
 * real SKILL.md files use `description: >` blocks.
 *
 * @param {string} text full file contents
 * @returns {{ frontmatter: object, body: string }}
 */
function parseFrontmatter(text) {
  if (typeof text !== 'string' || !text.startsWith('---\n')) {
    return { frontmatter: {}, body: text || '' };
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const block = text.slice(4, end);
  const body = text.slice(end + 5);

  const fm = {};
  const lines = block.split('\n');
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    // Skip blank lines and full-line comments
    if (!raw.trim() || raw.trim().startsWith('#')) {
      i++;
      continue;
    }
    const m = raw.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1].trim();
    let inline = m[2].trim();
    // Strip a trailing inline comment from scalar values
    inline = inline.replace(/\s+#.*$/, '').trim();

    if (inline === '>' || inline === '|' || inline === '>-' || inline === '|-') {
      // Folded / literal block scalar — collect indented continuation lines
      const collected = [];
      i++;
      while (i < lines.length) {
        const cont = lines[i];
        if (cont.trim() === '') {
          collected.push('');
          i++;
          continue;
        }
        if (/^\s/.test(cont)) {
          collected.push(cont.trim());
          i++;
          continue;
        }
        break;
      }
      fm[key] = collected.join(' ').replace(/\s+/g, ' ').trim();
      continue;
    }

    if (inline === '') {
      // Possible block sequence — collect `- item` continuation lines
      const items = [];
      let j = i + 1;
      while (j < lines.length) {
        const cont = lines[j];
        if (cont.trim() === '' || cont.trim().startsWith('#')) {
          j++;
          continue;
        }
        const li = cont.match(/^\s+-\s+(.*)$/);
        if (!li) break;
        let v = li[1].trim();
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
        items.push(v);
        j++;
      }
      if (items.length) {
        fm[key] = items;
        i = j;
        continue;
      }
      // Empty key with no list — store empty string
      fm[key] = '';
      i++;
      continue;
    }

    // Plain scalar
    if (inline.startsWith('"') && inline.endsWith('"')) inline = inline.slice(1, -1);
    if (inline.startsWith("'") && inline.endsWith("'")) inline = inline.slice(1, -1);
    fm[key] = inline;
    i++;
  }
  return { frontmatter: fm, body };
}

// ---------- Trigger-phrase counting ----------

/**
 * Count distinct activation/trigger phrases for a skill.
 *
 * The 5–12 standard applies to the curated activation phrases quoted in the
 * `description` body, so that is the canonical source. Real SKILL.md files
 * also carry a much larger multilingual `triggers` array (English + Arabic,
 * often 20+ entries) — that list is NOT subject to the 5–12 cap. Only when a
 * skill has no quoted phrases in its description do we fall back to counting
 * the `triggers` field.
 *
 * @param {object} fm parsed frontmatter
 * @returns {number}
 */
function countTriggerPhrases(fm) {
  const desc = typeof fm.description === 'string' ? fm.description : '';
  const quoted = desc.match(/"[^"]+"/g) || [];
  if (quoted.length > 0) return quoted.length;

  if (Array.isArray(fm.triggers)) {
    return fm.triggers.filter((t) => typeof t === 'string' && t.trim()).length;
  }
  if (typeof fm.triggers === 'string' && fm.triggers.trim()) {
    // Comma-separated fallback
    return fm.triggers.split(',').map((s) => s.trim()).filter(Boolean).length;
  }
  return 0;
}

// ---------- SKILL.md frontmatter ----------

const skillFrontmatterSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().min(1, 'description is required'),
});

// Negative-boundary signal — an explicit statement of what a skill does NOT
// do. Two conventions exist in the package: agent-persona skills carry it in
// the frontmatter `description` ("Do NOT use for: ..."), action skills carry
// it as a body section ("## Do NOT use this skill for"). Either satisfies it.
const NEGATIVE_BOUNDARY_RE = /not for|do not|does not|don't|never\b|audit-only|negative/i;

/**
 * Validate a parsed SKILL.md frontmatter object.
 *
 * Enforces the 5-component skill standard's frontmatter slice:
 *   - `name` and `description` present (hard error if missing).
 *   - at least 5 trigger phrases — fewer is a hard error.
 *   - a negative-boundary clause — hard error if absent. The clause may live
 *     in the frontmatter `description` OR in the skill body (passed via the
 *     optional `body` argument); either location satisfies the rule.
 *   - more than 12 trigger phrases is a non-blocking WARNING: many shipped
 *     skills carry a deliberately broad multilingual activation set, so the
 *     upper bound is advisory rather than a build-breaker.
 *
 * @param {object} obj parsed frontmatter
 * @param {string} [body] optional skill body — checked for a body-level
 *   negative-boundary section when the description lacks one
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
function validateSkillFrontmatter(obj, body = '') {
  const errors = [];
  const warnings = [];
  const parsed = skillFrontmatterSchema.safeParse(obj || {});
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.length ? issue.path.join('.') : '(root)';
      errors.push(`${field}: ${issue.message}`);
    }
  }

  if (obj && typeof obj === 'object') {
    const count = countTriggerPhrases(obj);
    if (count < 5) {
      errors.push(`too few trigger phrases: found ${count}, need at least 5`);
    } else if (count > 12) {
      warnings.push(`many trigger phrases: found ${count}, recommended max is 12`);
    }

    const desc = typeof obj.description === 'string' ? obj.description : '';
    const bodyText = typeof body === 'string' ? body : '';
    // Satisfied by a boundary phrase in the description, a "## Do NOT use"-style
    // heading, or an explicit "Do NOT include:" exclusion list in the body.
    const hasBoundary =
      NEGATIVE_BOUNDARY_RE.test(desc) ||
      /##[^\n]*\bnot\b/i.test(bodyText) ||
      /\bdo not (use|include)\b/i.test(bodyText) ||
      /\bdon't touch\b/i.test(bodyText);
    if (!hasBoundary) {
      errors.push(
        'missing negative-boundary clause (e.g. "Do NOT use for: ..." in the description or a "## Do NOT use" section)',
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ---------- Agent frontmatter ----------

const agentFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1, 'name is required')
    .refine((v) => v.startsWith('rcode-'), 'name must start with the "rcode-" prefix'),
  description: z.string().min(1, 'description is required'),
  color: z.string().min(1, 'color is required'),
});

/**
 * Validate a parsed agent (`rcode/agents/*.md`) frontmatter object.
 *
 * Requires `name` (rcode- prefixed), `description`, `tools` (comma-list or
 * array), and `color`.
 *
 * @param {object} obj parsed frontmatter
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateAgentFrontmatter(obj) {
  const errors = [];
  const parsed = agentFrontmatterSchema.safeParse(obj || {});
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.length ? issue.path.join('.') : '(root)';
      errors.push(`${field}: ${issue.message}`);
    }
  }

  if (obj && typeof obj === 'object') {
    const tools = obj.tools;
    const hasTools = Array.isArray(tools)
      ? tools.length > 0
      : typeof tools === 'string' && tools.trim().length > 0;
    if (!hasTools) {
      errors.push('tools is required (comma-separated string or array)');
    }
  } else {
    errors.push('tools is required (comma-separated string or array)');
  }

  return { ok: errors.length === 0, errors };
}

// ---------- state.json ----------

// NOTE: keep this schema coordinated with `.rcode/references/state-schema.md`
// and the canonical shape written by rcode-tools.cjs — see issue #735
// (coordinate state.json schema across producers/consumers). Optional and
// unknown keys are permitted on purpose so state.json can evolve without
// breaking this validator; only the load-bearing top-level keys are required.
const stateSchema = z
  .object({
    version: z.union([z.string(), z.number()]),
    project: z.string().min(1),
    phases: z.array(z.any()),
    schema_version: z.number(),
    current_phase: z.union([z.string(), z.number()]).optional(),
    current_plan: z.union([z.string(), z.number()]).optional(),
    current_sprint: z.union([z.string(), z.number()]).nullable().optional(),
    velocity_history: z.array(z.any()).optional(),
    milestones: z.array(z.any()).optional(),
  })
  .passthrough();

/**
 * Validate the top-level shape of `.rcode/state.json`.
 *
 * @param {object} obj parsed state.json
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateState(obj) {
  const errors = [];
  const parsed = stateSchema.safeParse(obj || {});
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const where = issue.path.length ? issue.path.join('.') : '(root)';
      errors.push(`${where}: ${issue.message}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  parseFrontmatter,
  countTriggerPhrases,
  skillFrontmatterSchema,
  agentFrontmatterSchema,
  stateSchema,
  validateSkillFrontmatter,
  validateAgentFrontmatter,
  validateState,
};
