/**
 * Filesystem utilities for the rcode CLI.
 *
 * Currently provides atomic writes so state files (.rcode/state.json,
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
    fd = fs.openSync(tmpPath, 'wx', mode ?? 0o644);
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

/**
 * Safe recursive remove (issue #688).
 *
 * `fs.rmSync(path, { recursive: true, force: true })` is fine when `path`
 * is a directory we control, but if it has been replaced with a symlink to
 * `/`, `~/`, or any directory outside the project root, the recursive walk
 * follows it and deletes outside the intended scope. Three sites in the
 * installer / uninstaller pass user-controlled paths to that pattern.
 *
 * This wrapper:
 *   1. lstats the path. If it is a symlink, unlinks the link only — never
 *      traverses it.
 *   2. realpaths it and asserts the resolved path is INSIDE `projectRoot`.
 *      If not, refuses and returns { ok: false, reason: 'outside-root' }.
 *   3. otherwise calls fs.rmSync recursively.
 *
 * Symlinks INSIDE the directory are still followed by Node's rmSync — that
 * is unavoidable with the recursive flag. The threat model addressed here
 * is a single top-level symlink swap (e.g. `.rcode -> /`), not deep nested
 * symlinks. Defense in depth, not a sandbox.
 *
 * @param {string} targetPath path to remove
 * @param {string} projectRoot absolute path that the target must be inside
 * @returns {{ok: boolean, reason?: string}}
 */
function safeRmSync(targetPath, projectRoot) {
  let stats;
  try {
    stats = fs.lstatSync(targetPath);
  } catch (err) {
    if (err.code === 'ENOENT') return { ok: true, reason: 'missing' };
    return { ok: false, reason: `lstat: ${err.message}` };
  }

  // Top-level symlink? Just unlink the link, never traverse.
  if (stats.isSymbolicLink()) {
    try {
      fs.unlinkSync(targetPath);
      return { ok: true, reason: 'symlink-unlinked' };
    } catch (err) {
      return { ok: false, reason: `unlink: ${err.message}` };
    }
  }

  // Real path must stay inside the project root. The root must be
  // realpathed too: on macOS os.tmpdir() lives behind a symlink
  // (/tmp → /private/tmp, /var → /private/var), so comparing a realpathed
  // target against a merely-resolved root misreports anything under /tmp
  // as outside-root.
  let root;
  try {
    root = fs.realpathSync(projectRoot);
  } catch {
    // Root missing/unreadable — fall back to a lexical resolve; the
    // containment check below then fails closed for an existing target.
    root = path.resolve(projectRoot);
  }
  let resolved;
  try {
    resolved = fs.realpathSync(targetPath);
  } catch (err) {
    return { ok: false, reason: `realpath: ${err.message}` };
  }
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return { ok: false, reason: 'outside-root' };
  }

  try {
    fs.rmSync(resolved, { recursive: true, force: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `rmSync: ${err.message}` };
  }
}

module.exports = {
  writeFileAtomic,
  writeJsonAtomic,
  safeRmSync,
};
