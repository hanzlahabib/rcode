/**
 * normalize.cjs — structured-output normalizer for the agent-behavior eval harness.
 *
 * `normalize(artifactPath)` parses a tracked SKILL.md / agent .md and returns a
 * deterministic JSON object capturing its STRUCTURED contract — NOT its prose:
 *   - trigger phrases (frontmatter `triggers:` list + quoted phrases in the
 *     description's "Activates when ..." clause)
 *   - declared `tools` (sorted)
 *   - negative-boundary phrases ("Do NOT use for: ...")
 *   - routing/decision keywords from the body (headings, route/spawn/dispatch
 *     verbs, referenced rihal-* agent names)
 *
 * Free prose is excluded. Every collection is sorted so the same input always
 * yields byte-identical output — the harness diffs structure, not wording.
 *
 * Part of issue #746 (agent-behavior regression harness).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/** Split a doc into raw frontmatter text + body. */
function splitFrontmatter(text) {
  if (!text.startsWith('---\n')) return { fmText: '', body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { fmText: '', body: text };
  return { fmText: text.slice(4, end), body: text.slice(end + 5) };
}

/** Sorted, de-duplicated, trimmed copy of a string list. */
function sortedUnique(values) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort();
}

/**
 * Extract the `tools:` list from frontmatter. Supports the inline comma form
 * (`tools: Read, Write, Bash`) used by agent .md files.
 */
function extractTools(fmText) {
  const m = fmText.match(/^tools:\s*(.+)$/m);
  if (!m) return [];
  return sortedUnique(m[1].split(','));
}

/**
 * Extract trigger phrases from a YAML `triggers:` list (SKILL.md style).
 * Stops at the next top-level key.
 */
function extractYamlTriggers(fmText) {
  const m = fmText.match(/^triggers:\s*\n([\s\S]*?)(?=^\S|$(?![\r\n]))/m);
  if (!m) return [];
  const out = [];
  for (const line of m[1].split('\n')) {
    const item = line.match(/^\s*-\s*"?([^"]+?)"?\s*$/);
    if (item) out.push(item[1]);
  }
  return out;
}

/** Pull all double-quoted phrases out of a chunk of text. */
function quotedPhrases(text) {
  return (text.match(/"([^"]+)"/g) || []).map((q) => q.slice(1, -1));
}

/**
 * Extract trigger phrases declared in the description prose, e.g.
 * 'Activates when the user says "orchestrate", "dispatch this", ...'.
 * Only the quoted phrases before any "Do NOT use" clause are triggers.
 */
function extractDescriptionTriggers(fmText) {
  const m = fmText.match(/^description:\s*([\s\S]*?)(?=^\S|$(?![\r\n]))/m);
  if (!m) return [];
  let desc = m[1];
  const negAt = desc.search(/Do NOT use|Don't use/i);
  if (negAt !== -1) desc = desc.slice(0, negAt);
  return quotedPhrases(desc);
}

/**
 * Extract negative-boundary phrases. Looks in both the frontmatter description
 * and the body for a "Do NOT use for: ..." clause and returns its quoted
 * phrases; if none are quoted, returns the clause text split on commas.
 */
function extractNegativeBoundaries(fmText, body) {
  const out = [];
  for (const src of [fmText, body]) {
    const m = src.match(/Do NOT use(?: for)?:?\s*([\s\S]*?)(?:\.\s|\n\n|$)/i);
    if (!m) continue;
    const clause = m[1];
    const quoted = quotedPhrases(clause);
    if (quoted.length) out.push(...quoted);
    else out.push(...clause.split(/[,;]/).map((s) => s.replace(/[().]/g, ' ')));
  }
  return out;
}

/** Markdown headings (## / ### ...) — structural decision surface. */
function extractHeadings(body) {
  return (body.match(/^#{2,}\s+(.+)$/gm) || []).map((h) =>
    h.replace(/^#{2,}\s+/, '').replace(/[`*]/g, '').trim()
  );
}

/** Routing/decision verbs and the targets they act on. */
function extractRoutingKeywords(body) {
  const out = [];
  const verbRe = /\b(route to|routes to|spawn|spawned by|spawns|dispatch|dispatches|delegate to|hand off to|hands off to)\b/gi;
  let m;
  while ((m = verbRe.exec(body)) !== null) {
    out.push(m[1].toLowerCase());
  }
  // Referenced rihal-* agent names anywhere in the body.
  for (const ref of body.match(/\brihal-[a-z][a-z0-9-]+/g) || []) {
    out.push(ref);
  }
  return out;
}

/**
 * Normalize a tracked artifact into its deterministic structured contract.
 * @param {string} artifactPath path relative to the repo root.
 */
function normalize(artifactPath) {
  const abs = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.join(PROJECT_ROOT, artifactPath);
  const text = fs.readFileSync(abs, 'utf8');
  const { fmText, body } = splitFrontmatter(text);

  const triggers = sortedUnique([
    ...extractYamlTriggers(fmText),
    ...extractDescriptionTriggers(fmText),
  ]);
  const tools = extractTools(fmText);
  const negativeBoundaries = sortedUnique(
    extractNegativeBoundaries(fmText, body)
  );
  const routingKeywords = sortedUnique([
    ...extractHeadings(body),
    ...extractRoutingKeywords(body),
  ]);

  return {
    artifact: artifactPath.split(path.sep).join('/'),
    triggers,
    tools,
    negativeBoundaries,
    routingKeywords,
  };
}

module.exports = { normalize };
