/**
 * Filesystem utilities for the Rihal Code CLI.
 *
 * Currently provides atomic writes so state files (.rihal/state.json,
 * github-map.json, model-profiles.json, AGENTS.md) can't be truncated by
 * a Ctrl+C mid-write. Pattern: write to a sibling temp file, fsync, then
 * rename over the target. On POSIX, rename within a filesystem is atomic,
 * so readers either see the old file or the fully-written new file — never
 * a partial truncation.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Write `content` to `filePath` atomically.
 *
 * Steps:
 *   1. Ensure parent directory exists.
 *   2. Write to a sibling tempfile (same directory → same filesystem → rename is atomic).
 *   3. fsync the tempfile so the rename isn't reordered after a crash.
 *   4. Rename over the target.
 *   5. On any failure, clean up the tempfile.
 *
 * @param {string} filePath absolute or relative path to the target
 * @param {string|Buffer} content what to write
 * @param {object} [opts]
 * @param {string} [opts.encoding='utf8']
 * @param {number} [opts.mode] optional file mode (e.g. 0o644)
 */
function writeFileAtomic(filePath, content, opts = {}) {
  const { encoding = 'utf8', mode } = opts;

  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  // Include pid + crypto random so concurrent processes don't collide on tmp.
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.tmp-${process.pid}-${crypto.randomBytes(8).toString('hex')}`
  );

  let fd;
  try {
    fd = fs.openSync(tmpPath, 'w', mode ?? 0o644);
    fs.writeSync(fd, content, 0, encoding);
    // fsync the data to disk before rename — otherwise a crash between
    // write() and rename() could leave the target renamed but with zero
    // bytes flushed.
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    // Best-effort cleanup
    if (fd !== null && fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
    try { fs.unlinkSync(tmpPath); } catch {}
    throw err;
  }
}

/**
 * Convenience wrapper: atomically write a JSON object with 2-space indent
 * and a trailing newline. Matches the existing convention in the codebase.
 */
function writeJsonAtomic(filePath, obj, opts = {}) {
  const content = JSON.stringify(obj, null, 2) + '\n';
  writeFileAtomic(filePath, content, opts);
}

module.exports = {
  writeFileAtomic,
  writeJsonAtomic,
};
