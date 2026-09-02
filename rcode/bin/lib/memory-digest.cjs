'use strict';
/**
 * memory-digest.cjs — deterministic content-based digest for Memory Bank
 * distillate freshness (#1065).
 *
 * memory-distill.md previously defined the freshness digest as
 * sha1(path + ":" + mtime, sorted) — narrative only, no real implementation.
 * Keying on mtime is unsound for a git-tracked repo: git clone/checkout/
 * worktree add all stamp fresh mtimes at checkout time regardless of
 * whether content changed, so a digest recorded in a committed distillate
 * can never match a freshly checked-out tree, even when content is
 * byte-identical. This hashes file CONTENT instead, so the digest only
 * changes when a source file's bytes actually change.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_SETS = {
  project: [
    'project/stack.md',
    'project/decisions.md',
    'project/glossary.md',
    'people/stakeholders.md',
    'people/team.md',
    'milestones/current.md',
    'incidents/known-issues.md',
  ],
  stack: [
    'project/stack.md',
  ],
};

/** sha1 of a file's raw bytes, or null if the file doesn't exist / can't be read. */
function hashFile(absPath) {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(absPath)).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Deterministic content digest for a set of memory-relative file paths:
 * sha1 of the sorted "path:contenthash" pairs, joined with newlines. A
 * missing file hashes to the literal string 'missing' so the digest still
 * shifts when a source file is deleted or created.
 */
function computeDigest(memoryRoot, relFiles) {
  const entries = relFiles
    .slice()
    .sort()
    .map((rel) => `${rel}:${hashFile(path.join(memoryRoot, rel)) || 'missing'}`);
  return crypto.createHash('sha1').update(entries.join('\n')).digest('hex');
}

/**
 * memory-digest <target>   target: project (default) | stack
 * Prints { ok, target, digest, source_files, missing_files }.
 */
function cmdMemoryDigest(args, { RCODE_DIR }) {
  const target = args[0] || 'project';
  if (!SOURCE_SETS[target]) {
    return { ok: false, error: `Unknown memory-digest target: ${target}. Try: project | stack` };
  }
  const memoryRoot = path.join(RCODE_DIR, 'memory');
  const relFiles = SOURCE_SETS[target];
  const missing_files = relFiles.filter((rel) => !fs.existsSync(path.join(memoryRoot, rel)));
  const digest = computeDigest(memoryRoot, relFiles);
  return { ok: true, target, digest, source_files: relFiles, missing_files };
}

module.exports = { cmdMemoryDigest, computeDigest, SOURCE_SETS };
