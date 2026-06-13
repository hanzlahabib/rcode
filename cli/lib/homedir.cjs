/**
 * cli/lib/homedir.cjs — user home directory resolution (#889).
 *
 * process.env.HOME wins over os.homedir() so a single env var redirects
 * every home-relative read/write on EVERY platform. os.homedir() ignores
 * HOME on Windows (it reads USERPROFILE), which made HOME-stubbed tests
 * silently escape to the real profile dir on Windows CI — installs leaked
 * ~/.codex / ~/.gemini / ~/.rcode into the runner's real home and broke
 * unrelated tests. Honoring HOME also matches git/npm behavior on Windows
 * (git-bash sets HOME), so real users get consistent paths across shells.
 */

'use strict';

const os = require('os');

function homedir() {
  return process.env.HOME || os.homedir();
}

module.exports = { homedir };
