/**
 * rcode config — get, set, or list project configuration.
 *
 * Usage:
 *   rcode config                        # show all effective values
 *   rcode config <key>                  # get one value
 *   rcode config <key> <value>          # set in .rcode/config.json
 *   rcode config --global <key> <value> # set in ~/.rcode/defaults.json
 *   rcode config --list                 # show all with source annotations
 *
 * All reads/writes go through cli/lib/config.cjs so validation, atomic
 * writes, and typo suggestions stay centralized.
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig,
  loadUserDefaults,
  loadProjectConfig,
  setConfigValue,
  getConfigValue,
  VALID_CONFIG_KEYS,
  HARDCODED_DEFAULTS,
  userLevelPath,
  projectLevelPath,
} = require('./lib/config.cjs');

function parseArgs(args) {
  const opts = { global: false, list: false, positional: [] };
  for (const arg of args) {
    if (arg === '--global' || arg === '-g') opts.global = true;
    else if (arg === '--list' || arg === '-l') opts.list = true;
    else opts.positional.push(arg);
  }
  return opts;
}

/**
 * Pick the source label for a given key by walking the cascade
 * manually. Used by `--list` so users can see where each value came from.
 */
function sourceOfKey(cwd, key) {
  const project = loadProjectConfig(cwd);
  if (key in project) return 'project';
  const user = loadUserDefaults();
  if (key in user) return 'user';
  return 'default';
}

function printListing(cwd) {
  const merged = loadConfig(cwd);
  const keys = [...VALID_CONFIG_KEYS];

  // Column widths
  const keyWidth = Math.max(...keys.map((k) => k.length));
  const valWidth = Math.max(
    ...keys.map((k) => String(merged[k] ?? '').length),
    5,
  );

  console.log(
    `\n🕌 rcode — configuration\n`
  );
  console.log(`   Project: ${projectLevelPath(cwd)}`);
  console.log(`   User:    ${userLevelPath()}\n`);

  console.log(
    `   ${'key'.padEnd(keyWidth)}  ${'value'.padEnd(valWidth)}  source`
  );
  console.log(
    `   ${'-'.repeat(keyWidth)}  ${'-'.repeat(valWidth)}  ------`
  );
  for (const key of keys) {
    const value = merged[key];
    const source = sourceOfKey(cwd, key);
    console.log(
      `   ${key.padEnd(keyWidth)}  ${String(value ?? '').padEnd(valWidth)}  ${source}`
    );
  }
  console.log();
}

module.exports = function config(args) {
  const cwd = process.cwd();
  const opts = parseArgs(args);

  // No args OR --list → print everything
  if (opts.positional.length === 0 || opts.list) {
    const rihalDir = path.join(cwd, '.rcode');
    if (!fs.existsSync(rihalDir) && !opts.global) {
      console.error(`❌ No .rcode/ directory found in ${cwd}`);
      console.error(`   Run 'rcode install' first, or use --global to manage user defaults.`);
      process.exit(1);
    }
    printListing(cwd);
    return;
  }

  // One positional → get
  if (opts.positional.length === 1) {
    const key = opts.positional[0];
    if (!VALID_CONFIG_KEYS.has(key)) {
      console.error(`❌ Unknown config key '${key}'`);
      console.error(`   Valid keys: ${[...VALID_CONFIG_KEYS].join(', ')}`);
      process.exit(1);
    }
    const value = getConfigValue(cwd, key);
    console.log(value ?? '');
    return;
  }

  // Two positionals → set
  if (opts.positional.length === 2) {
    const [key, value] = opts.positional;
    const scope = opts.global ? 'global' : 'project';

    // For global writes, we don't need .rcode/ to exist
    if (scope === 'project' && !fs.existsSync(path.join(cwd, '.rcode'))) {
      console.error(`❌ No .rcode/ directory found in ${cwd}`);
      console.error(`   Run 'rcode install' first, or use --global.`);
      process.exit(1);
    }

    const result = setConfigValue(cwd, key, value, { scope });
    if (!result.ok) {
      console.error(`❌ ${result.error}`);
      if (result.suggestion) {
        console.error(`   Did you mean '${result.suggestion}'?`);
      }
      process.exit(1);
    }

    const location = scope === 'global' ? userLevelPath() : projectLevelPath(cwd);
    console.log(`✅ ${key} = ${value}  (${scope}: ${location})`);
    return;
  }

  console.error(`❌ Too many arguments.`);
  console.error(`   Usage: rcode config [--global] [key] [value]`);
  process.exit(1);
};
