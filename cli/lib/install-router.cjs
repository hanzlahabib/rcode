/**
 * cli/lib/install-router.cjs — global slash-router install: copies command
 * bodies + router script to ~/.rcode/, wires per-CLI prompt-submit hooks
 * (Codex, Antigravity), and installs Codex-native skills.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change.
 */

const fs = require('fs');
const path = require('path');
const { homedir } = require('./homedir.cjs');
const { ok, warn, PACKAGE_ROOT, SOURCE_ROOT } = require('./install-shared.cjs');
const { ensureDir } = require('./install-scaffold.cjs');
const { walkFiles } = require('./install-plan.cjs');

// Shared: copy every command body to ~/.rcode/slash-commands/<name>.md and the
// router script to ~/.rcode/bin/. A fixed home-dir location lets the hook read
// commands regardless of the user's cwd. Idempotent (plain overwrite).
function installSlashRouterCommands(opts) {
  const home = homedir();
  const cmdDestDir = path.join(home, '.rcode', 'slash-commands');
  const binDestDir = path.join(home, '.rcode', 'bin');
  ensureDir(cmdDestDir);
  ensureDir(binDestDir);

  const srcCmdDir = path.join(SOURCE_ROOT, 'commands');
  let copied = 0;
  for (const file of fs.readdirSync(srcCmdDir)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(path.join(srcCmdDir, file), path.join(cmdDestDir, file));
    copied++;
  }

  const routerSrc = path.join(PACKAGE_ROOT, 'cli', 'rcode-slash-router.cjs');
  const routerDest = path.join(binDestDir, 'rcode-slash-router.cjs');
  fs.copyFileSync(routerSrc, routerDest);

  if (opts && opts.global !== 'silent') {
    console.log('  ' + ok(`Slash-router: ${copied} command bodies → ~/.rcode/slash-commands/ + router → ~/.rcode/bin/`));
  }
  return routerDest;
}

// The absolute command a hook entry runs. Matched by substring for idempotency
// and for removal on uninstall — keep the basename stable.
function slashRouterHookCommand() {
  return `node "${path.join(homedir(), '.rcode', 'bin', 'rcode-slash-router.cjs')}"`;
}

// Merge a prompt-submit hook entry into an existing CLI hooks JSON file without
// disturbing any pre-existing entries (e.g. herdr's). `eventKey` is the hook
// event name that CLI uses (codex: UserPromptSubmit, antigravity: UserPrompt).
// Idempotent: re-running detects the router by command substring and no-ops.
function mergeSlashRouterHook(jsonPath, eventKey, command, label) {
  let root = {};
  if (fs.existsSync(jsonPath)) {
    try {
      root = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) || {};
    } catch {
      // Unparseable file — don't clobber the user's config; bail loudly.
      console.log('  ' + warn(`${label}: ${jsonPath} is not valid JSON — skipped slash-router wiring.`));
      return false;
    }
  }
  if (!root.hooks || typeof root.hooks !== 'object') root.hooks = {};
  if (!Array.isArray(root.hooks[eventKey])) root.hooks[eventKey] = [];

  const already = root.hooks[eventKey].some(group =>
    Array.isArray(group?.hooks) &&
    group.hooks.some(h => typeof h?.command === 'string' && h.command.includes('rcode-slash-router.cjs')),
  );
  if (already) {
    console.log('  ' + ok(`${label}: slash-router hook already present (idempotent).`));
    return false;
  }

  root.hooks[eventKey].push({ hooks: [{ type: 'command', command, timeout: 10 }] });
  ensureDir(path.dirname(jsonPath));
  fs.writeFileSync(jsonPath, JSON.stringify(root, null, 2) + '\n');
  console.log('  ' + ok(`${label}: wired slash-router into ${eventKey} hook (existing hooks preserved).`));
  return true;
}

// Codex reads SKILLS from ~/.codex/skills/<name>/SKILL.md — verified live against
// Codex CLI 0.150.1, which prints the paths it loads on boot and lists them under
// `/skills`. Entries there are commonly symlinks into a shared ~/.agents/skills.
//
// This is a DIFFERENT surface from ~/.codex/prompts (slash commands) and from
// AGENTS.md (instructions), and rcode targeted neither of the first two for
// skills — so none of rcode's skills appeared in Codex at all. Codex has no
// subagent concept, so rcode's agents cannot surface there in any form; skills
// are the only place its capabilities can show up.
function installCodexSkills(opts) {
  const home = homedir();
  const destRoot = path.join(home, '.codex', 'skills');
  ensureDir(destRoot);

  // Source: every SKILL.md under rcode/skills/, installed as rcode-<name>/ to
  // stay inside rcode's namespace and never collide with a user's own skills.
  const srcRoot = path.join(SOURCE_ROOT, 'skills');
  if (!fs.existsSync(srcRoot)) return 0;

  let written = 0;
  for (const skillFile of walkFiles(srcRoot)) {
    if (path.basename(skillFile) !== 'SKILL.md') continue;
    const skillDir = path.dirname(skillFile);
    const bare = path.basename(skillDir);
    const name = bare.startsWith('rcode-') ? bare : `rcode-${bare}`;
    const destDir = path.join(destRoot, name);
    ensureDir(destDir);
    // Copy the whole skill folder — references/, steps/, templates/ and the
    // like are part of the contract, not decoration.
    for (const f of walkFiles(skillDir)) {
      const rel = path.relative(skillDir, f);
      const out = path.join(destDir, rel);
      ensureDir(path.dirname(out));
      fs.copyFileSync(f, out);
    }
    written++;
  }

  if (opts && opts.global !== 'silent') {
    console.log('  ' + ok(`Codex skills: ${written} → ~/.codex/skills/rcode-*/`));
  }
  return written;
}

// Codex: ~/.codex/hooks.json, event UserPromptSubmit.
function installCodexSlashRouterHook(opts) {
  installSlashRouterCommands(opts);
  const jsonPath = path.join(homedir(), '.codex', 'hooks.json');
  mergeSlashRouterHook(jsonPath, 'UserPromptSubmit', slashRouterHookCommand(), 'Codex');
}

// Antigravity: ~/.gemini/antigravity/settings.json, event UserPrompt.
function installAntigravitySlashRouterHook(opts) {
  installSlashRouterCommands(opts);
  const jsonPath = path.join(homedir(), '.gemini', 'antigravity', 'settings.json');
  mergeSlashRouterHook(jsonPath, 'UserPrompt', slashRouterHookCommand(), 'Antigravity');
}

function installNativeHomeSlashCommands(opts) {
  if (!opts || !opts.global) return;
  const ides = Array.isArray(opts.ides) ? opts.ides : [opts.ide].filter(Boolean);
  for (const ide of ides) {
    switch (ide) {
      case 'codex': installCodexSlashRouterHook(opts); installCodexSkills(opts); break;
      case 'antigravity': installAntigravitySlashRouterHook(opts); break;
      default:
        break;
    }
  }
}

module.exports = {
  installSlashRouterCommands,
  slashRouterHookCommand,
  mergeSlashRouterHook,
  installCodexSkills,
  installCodexSlashRouterHook,
  installAntigravitySlashRouterHook,
  installNativeHomeSlashCommands,
};
