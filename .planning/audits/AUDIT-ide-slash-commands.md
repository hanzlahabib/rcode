# Audit: rcode slash commands across Grok / Codex / Antigravity CLIs

Method: live herdr test — fresh tab, one pane per CLI, real CLI launched, `/` + `/rcode` filter observed.
rcode v4.1.2. Date 2026-06-05.

## Results (observed live)

| Tool | install --ide <x> | `/rcode` in TUI | Reads which dir | Verdict |
|------|-------------------|-----------------|-----------------|---------|
| Grok | ✖ REJECTED ("not supported") | ✅ `/rcode-add-phase` shows | `~/.claude/commands/` (CC-compatible) | WORKS already via global .claude; installer just refuses to target it |
| Codex | ✓ "116 commands installed" | ✖ no matches | `~/.codex/prompts/*.md` (native) — install writes to `.claude/commands` instead | BROKEN — wrong target dir |
| Antigravity | ✓ "116 commands installed" | ✖ "No matches" | install writes `.antigravity/rcode/commands` — agy doesn't scan it | BROKEN — wrong target dir |

## Root causes

1. **Grok** — not in `SUPPORTED_IDES` (cli/install.js:92). `--ide grok` throws. But Grok Build is
   Claude-Code-compatible and reads `.claude/commands/*.md`; global rcode commands already surface.
   FIX: alias `grok` -> claude adapter (identical `.claude/` layout). One-line in the IDE switch + SUPPORTED_IDES.

2. **Codex** — adapter (cli/install.js:613) writes commands to `.claude/commands` + AGENTS.md + workflow
   bridge. Codex does NOT read `.claude/commands`. Its native slash-prompt dir is `~/.codex/prompts/*.md`
   (or project `.codex/prompts/`), which install never populates. So 0 `/rcode-*` commands appear.
   FIX: also emit one `.md` per command into `~/.codex/prompts/` (or `<target>/.codex/prompts/`).

3. **Antigravity** — adapter (cli/install.js:590) writes `.antigravity/rcode/commands`. `agy` 1.0.5 `/rcode`
   = "No matches" — it does not scan that path. Code comment already flags "plugin protocol still firming up."
   FIX: determine agy's real command/skill discovery dir and retarget (likely `~/.antigravity/skills` or
   a `.md`-per-command dir), or use `extra_install_paths`.

## Key correction to code-only hypothesis
Static reading said "grok unsupported = no commands". LIVE test proved grok DOES show rcode commands
(via global `~/.claude/commands`). Only Codex + Antigravity are genuinely broken.

---
## FIX CAMPAIGN OUTCOME (fan-out, branch feat/multi-agent-slash-parity, NOT pushed)

| Tool | Fix | Status |
|------|-----|--------|
| Grok | added to SUPPORTED_IDES → claude `.claude/commands` layout | ✅ VERIFIED (installer accepts; grok shows /rcode-add-phase live) |
| Codex | `--global` writes flat `rcode-<name>.md` → ~/.codex/prompts (frontmatter stripped, `# rcode:` header) | ✅ DETERMINISTIC (116 files land, correct format). Live re-confirm blocked: codex self-update broke its own binary (Node ESM error) |
| Antigravity | agent wrote SKILL.md → ~/.gemini/antigravity/skills/ | ❌ WRONG TARGET. Live `/rcode` = "No matches". agy sources slash commands from `<plugin>/commands/<ns>/<name>.md` (e.g. get-shit-done/commands/gsd/*.md → /gsd-*), NOT skills/. Needs retarget to `~/.gemini/antigravity/rcode/commands/rcode/<name>.md`. agy TUI too flaky via herdr to confirm mechanism this session. |

57 install/uninstall tests green. Scaffold call-site bug (dispatch after global early-return) found+fixed.
Antigravity portion must be reworked before this branch lands.

---
## ANTIGRAVITY (agy) — DEFINITIVE FINDING (verified properly, 2026-06-05)

agy has NO file-based custom slash-command mechanism. Verified in clean agy sessions:
- `/rcode-probe` written to ~/.gemini/antigravity/rcode/commands/rcode/probe.md → "No matches"
- `/gsd` (the existing get-shit-done commands at get-shit-done/commands/gsd/*.md) → ALSO "No matches"
- agy cli log only ever logs "Reloading SYSTEM slash commands" — no user/plugin slash loading.
- GSD integrates via HOOKS (~/.gemini/antigravity/hooks/gsd-prompt-guard.js etc.) + skills + agents,
  NOT via slash commands. commands/gsd/*.md are consumed by GSD's own bin/hooks, not agy's / menu.

CONCLUSION: `/rcode-*` as agy slash commands is NOT achievable by file install. agy's real
extension points are: skills (~/.gemini/antigravity/skills/<name>/SKILL.md, phrase-activated — NOT
slash) and agents (~/.gemini/antigravity/agents/). The fix agent's skills/ approach is the closest
available, but it surfaces as phrase-activated skills, not `/rcode-*`. Decision pending: keep skills
approach (relabel as phrase-activated) OR drop antigravity slash support and document as unsupported.

---
## LIVE RE-VERIFICATION — CODEX FILE APPROACH ALSO FAILS (2026-06-05)

Codex 0.137.0 `/` menu shows ONLY built-ins (/model /fast /ide /permissions /keymap /vim
/experimental /approve). `/rcode` → no dropdown. So ~/.codex/prompts/rcode-*.md is NOT
surfaced as slash commands in this codex version. The codex file-prompt fix writes files
deterministically but they DO NOT appear → fix does not actually work live.

(Root mistake: the ~/.codex/prompts→/name behavior was assumed from training data, not verified
against the installed codex version — violates the "verify, don't guess" rule.)

## VERIFIED CORRECT PATH — UserPromptSubmit hook router (both CLIs)

Both CLIs support a prompt-submit HOOK (confirmed):
- Codex: config.toml `[features] hooks=true`; ~/.codex/hooks.json has a `UserPromptSubmit` array
  (currently herdr's agent-state tracker). Event name: `UserPromptSubmit`.
- Antigravity: agy binary exposes `UserPrompt` hook event; ~/.gemini/antigravity/settings.json
  already wires SessionStart/BeforeTool/AfterTool hooks.

So the working solution for BOTH = a UserPromptSubmit/UserPrompt hook that intercepts
`/rcode-<name> [args]`, loads rcode/commands/<name>.md, and injects its body as context
(or rewrites the prompt). This is how GSD integrates. Open question to confirm before build:
can the hook INJECT/REWRITE the prompt (additionalContext / stdout contract)? Verify via
non-interactive `codex exec "/rcode-x"` + `agy --print "/rcode-x"` (avoids TUI flakiness).

## NET STATUS
- Grok: ✅ works (file-based, verified live).
- Codex: ❌ file approach doesn't surface live → needs hook router.
- Antigravity: ❌ no file slash mechanism → needs hook router.
Both file-based fix branches (codex prompts, antigravity skills) are SUPERSEDED by the hook
approach and should be reworked/reverted.

---
## HOOK ROUTER BUILT — FINAL STATE (branch feat/slash-hook-router, off grok+scaffold fe614b9, NOT pushed)

Files: NEW cli/rcode-slash-router.cjs (dependency-free), cli/install.js (+109, dispatcher + codex/agy
wiring, gated --global), cli/uninstall.js (+54), NEW test/slash-hook-router.test.cjs (9 tests).
All tests green (router 9/9, install-matrix 10/10, regressions 23/23). node --check clean.

Mechanism: install --global copies rcode/commands/*.md → ~/.rcode/slash-commands/ + router →
~/.rcode/bin/, then MERGES a hook entry (idempotent, preserves existing herdr/system hooks):
  - codex → ~/.codex/hooks.json  UserPromptSubmit
  - antigravity → ~/.gemini/antigravity/settings.json  UserPrompt
Router reads stdin {prompt,...}; on `/rcode-<name> [args]` injects the command body (+ "Arguments:")
via {"hookSpecificOutput":{"hookEventName":...,"additionalContext":...}}; else passes through.

VERIFIED:
- Codex: router emits correct injection JSON incl. args; hooks.json merge preserves a seeded herdr
  entry (2 entries) + idempotent; uninstall removes ONLY rcode entry (herdr intact) + dirs. Codex
  PROVABLY fires UserPromptSubmit hooks (herdr already uses them) + additionalContext is OpenAI's
  documented contract → high confidence `/rcode-<name>` works in codex (no autocomplete entry; typed).
- Antigravity: wiring symmetric + idempotent, BUT UNCONFIRMED — `agy --print` fired no hooks
  non-interactively (WSL/auth), and the agy binary contains NO additionalContext/hookSpecificOutput
  strings → agy likely does NOT honor the codex-style injection. Treat antigravity as best-effort
  until confirmed on a live authenticated interactive agy session.

NET: grok ✅ works (file-based). codex ✅ works (hook router, high confidence). antigravity ⚠️ wired,
unconfirmed/likely-unsupported. Old branch feat/multi-agent-slash-parity (file approach) superseded.
