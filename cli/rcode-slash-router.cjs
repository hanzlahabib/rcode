#!/usr/bin/env node
'use strict';

// rcode slash-command hook router.
//
// WHY this exists: Codex CLI and Antigravity CLI do NOT surface file-based
// `/slash` commands the way Claude Code / Grok do (verified live). They DO,
// however, support a prompt-submit hook (`UserPromptSubmit` / `UserPrompt`)
// that can inject extra context into the model's turn. This router is wired
// into that hook by the installer. When the user types `/rcode-<name> [args]`,
// the router loads the matching command body and injects it as additional
// context so the model executes that command — the closest thing to a native
// slash command those CLIs allow.
//
// Dependency-free (Node stdlib only) so it can run from a stable home dir
// (~/.rcode/bin/) without an install step. NEVER throws to the host CLI: any
// error exits 0 with no output so a malfunctioning router can never break or
// swallow the user's real prompt.

const fs = require('fs');
const os = require('os');
const path = require('path');

// Command bodies are copied here by the installer (installSlashRouterCommands).
// A fixed home-dir location means the hook can always read them regardless of
// the user's current working directory.
// HOME wins over os.homedir() (#889): os.homedir() ignores HOME on Windows
// (it reads USERPROFILE), so HOME-redirected runs (tests, git-bash) would read
// the wrong profile dir. Inlined — this script is copied standalone to
// ~/.rcode/bin/ and must stay dependency-free (no ./lib requires).
const COMMANDS_DIR = path.join(process.env.HOME || os.homedir(), '.rcode', 'slash-commands');

// Matches `/rcode-<name>` at the very start, optional whitespace, then the
// rest of the line(s) as arguments. `\b` ends the command name so trailing
// punctuation/args don't leak into <name>.
const SLASH_RE = /^\/rcode-([a-z0-9-]+)\b[ \t]*([\s\S]*)$/;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// Strip a leading YAML frontmatter block (`---\n...\n---`). The frontmatter is
// CLI-tooling metadata (name/description/allowed-tools) that only confuses the
// model — we want the executable command body injected, not its header.
function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function emit(hookEventName, additionalContext) {
  const payload = {
    hookSpecificOutput: {
      hookEventName: hookEventName || 'UserPromptSubmit',
      additionalContext,
    },
  };
  process.stdout.write(JSON.stringify(payload));
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return; // not JSON we understand → pass-through (no output)
  }

  // Field names vary across CLIs; accept the common spellings.
  const prompt =
    data.prompt ??
    data.user_prompt ??
    data.userPrompt ??
    data.message ??
    data.input ??
    '';
  const hookEventName = data.hook_event_name || data.hookEventName || 'UserPromptSubmit';

  if (typeof prompt !== 'string') return;

  const match = prompt.replace(/^\s+/, '').match(SLASH_RE);
  if (!match) return; // not an rcode command → pass-through (no output)

  const name = match[1];
  const args = (match[2] || '').trim();

  const cmdFile = path.join(COMMANDS_DIR, `${name}.md`);
  if (!fs.existsSync(cmdFile)) {
    // Unknown command: inject a short note rather than silently doing nothing,
    // so the user learns the command name didn't resolve.
    emit(
      hookEventName,
      `Unknown rcode command: /rcode-${name}. No matching command body was found in ${COMMANDS_DIR}.`,
    );
    return;
  }

  let body = stripFrontmatter(fs.readFileSync(cmdFile, 'utf8')).trim();
  if (args) {
    // Surface user-supplied args the way the command bodies expect ($ARGUMENTS).
    body += `\n\nArguments: ${args}`;
  }

  emit(hookEventName, body);
}

try {
  main();
} catch {
  // Never break the host CLI's prompt — fail open, silently.
}
process.exit(0);
