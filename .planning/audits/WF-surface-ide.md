# WF-surface-ide — Workflow Audit

**Lens:** surface-ide
**Date:** 2026-09-16
**Auditor:** surface-ide instance (diagnose-only, no source modifications)
**Scope:** How rcode presents across IDE surfaces — Claude Code, Codex, Cursor, Grok, Windsurf, Antigravity, VS Code; slash-command routing; AGENTS.md/CLAUDE.md scaffolding; install surface correctness

---

## Verdict

**LEAKING.** Three surfaces have silent, user-invisible failures baked in: Cursor's `.mdc` conversion is a no-op so every Cursor command file is raw markdown with a wrong extension; a project-local Codex install exits 0 while writing nothing useful to Codex; and `docs/install.md`'s editor matrix marks Gemini CLI as `✅ v4` while the installer immediately exits with an error on `--ide gemini`. The cross-IDE AGENTS.md is identical to CLAUDE.md — no surface-specific optimization despite being the designated "cross-tool open standard." The two-step Codex requirement (global install + `hooks = true`) is spread across three separate docs with no single pre-flight check. None of these failures print a visible error to the user; they all silently succeed.

---

## The user's actual experience

### Claude Code (works as documented)
User installs, restarts, types `/rcode-init`. Commands appear in the slash-command picker. CLAUDE.md is scaffolded by `cmdGenerateClaudeMd()` (`rcode/bin/rcode-tools.cjs:1310-1445`). AGENTS.md gets identical content. `/rcode-*` slash commands load from `.claude/commands/rcode/`. Named-engineer agents load from `.claude/agents/`. This surface works.

### Codex (project-local install silently does nothing)
User runs `pnpm dlx @hanzlaa/rcode install` without `--global`. The installer prints a warning at `cli/install.js:528`:
```
Codex needs a GLOBAL install — re-run with `--global`...
```
But the install exits 0 anyway. The user has `.claude/agents/rcode-*.md` and `.claude/commands/rcode/rcode-*.md` on disk, which Codex never reads. Skills are only activated via the `UserPromptSubmit` hook router (`cli/rcode-slash-router.cjs`), which is only installed on `--global`. Without it, typing `/rcode-*` in Codex is dead. The user has no indication their install did nothing useful beyond a console warning they may have missed.

The hook router itself works when correctly installed: it reads `~/.rcode/slash-commands/<name>.md` and injects the command body as `additionalContext` (`cli/rcode-slash-router.cjs:COMMANDS_DIR`). But "correctly installed" requires two independent steps documented in three separate places (`docs/install.md` Codex section, `docs/getting-started.md:17`, `cli/install.js:528`) with no unified pre-flight check.

An inaccurate comment at `cli/install.js:452` claims `~/.codex/prompts/<name>.md` is a Codex surface. `cli/lib/namespace-migrate.cjs:144` explicitly corrects this: "The comment in install.js claiming Codex reads `~/.codex/prompts/*.md` is inaccurate — that path is never written by this codebase." Dead surface reference lives in the installer.

### Cursor (install succeeds, `.mdc` conversion is a no-op)
User runs `pnpm dlx @hanzlaa/rcode install --ide cursor`. Commands land in `.cursor/rules/rcode/commands/rcode-*.mdc`. The installer calls `convertToCursorMdc(content)` at `cli/install.js:1273` before writing each file. `convertToCursorMdc()` is defined at `cli/lib/install-ide.cjs`:
```js
function convertToCursorMdc(sourceText) {
  return sourceText;  // no-op — returns unchanged
}
```
Every `.mdc` file is plain markdown with a `.mdc` extension. Cursor may still read them (`.mdc` files accept fenced-markdown frontmatter), but any Cursor-specific formatting, frontmatter injection, or metadata that `.mdc` format enables is entirely absent. The prefer-do rule is installed as a proper `.mdc` file (`cli/install.js:962` maps cursor → `.cursor/rules/rcode-prefer-do.mdc`) but the command bodies are not converted.

### Gemini CLI (documented as available, installer refuses it)
`docs/install.md` editor support matrix:
```
| Gemini CLI | `gemini` | `.gemini/rcode/` | ⏳ planned |
```
The status column says `⏳ planned` — correctly. But the table row exists in the matrix alongside `✅ v4` rows, and `docs/getting-started.md:17` mentions "Gemini CLI install is not yet implemented" as a one-liner alongside working surfaces. A user scanning the matrix sees Gemini is "planned" but not that `--ide gemini` actively errors:

```js
// cli/install.js:533-539
if (ides.includes('gemini')) {
  // exits early — strips gemini and prints error
}
```

The install command exits early for Gemini with an explanation and a workaround (`docs/install.md:106-117`). The workaround (manually copy CLAUDE.md to `.gemini/GEMINI.md`) is documented but is not a supported install path. Users who follow the workaround get a stale copy, not a maintained one.

### Grok (works via global `~/.claude/`)
`docs/install.md`: "Grok reads global `~/.claude/commands/` (Claude-compatible)." Works via `pnpm dlx @hanzlaa/rcode install --global`. No documented issues; AGENTS.md routing works as described.

### Windsurf / Antigravity / VS Code
These surfaces install prefer-do rules and share the `.claude/` layout. AGENTS.md (`cmdGenerateClaudeMd()`) is the cross-tool entry point — identical content to CLAUDE.md. No surface-specific routing differences observed in `cli/lib/install-ide.cjs:getPathsForIde()`.

---

## Leaks

**L1 — `convertToCursorMdc()` is a complete no-op** (`cli/lib/install-ide.cjs`)
Every `.mdc` file written for Cursor is raw markdown with a renamed extension. The function signature and call site at `cli/install.js:1273` (`if (entry.cursor) content = convertToCursorMdc(content)`) imply conversion happens. It does not. Cursor users get commands that work by accident (Cursor reads them) but without any `.mdc`-specific metadata, frontmatter, or formatting that rcode could be leveraging. Silent.

**L2 — Inaccurate `~/.codex/prompts/` comment at `cli/install.js:452`**
Comment claims Codex reads `~/.codex/prompts/<name>.md`. This path is never written by the installer. `cli/lib/namespace-migrate.cjs:144` explicitly corrects the record: "The comment in install.js claiming Codex reads `~/.codex/prompts/*.md` is inaccurate." Dead reference in the installer source misleads anyone reading the code to understand the Codex surface.

**L3 — Project-local Codex install exits 0 with nothing Codex-visible**
`cli/install.js:528` prints a warning but proceeds. The user has a complete `.claude/` tree that Codex never reads. The hook router that makes slash commands work is not installed. No failure signal. `rcode doctor` (if run) would need to surface this; the install itself does not.

**L4 — AGENTS.md is byte-for-byte identical to CLAUDE.md**
`cmdGenerateClaudeMd()` (`rcode/bin/rcode-tools.cjs:1310-1445`) writes the same content to both files. AGENTS.md is described as "the cross-tool open standard read by Codex, Cursor, Windsurf, Antigravity, Gemini" but contains Claude Code-centric routing instructions. Codex, Windsurf, and Cursor users get Claude-optimized ambient instructions. No Codex-specific pre-flight check (verify global install + hooks enabled), no Cursor-specific routing note, no Windsurf note.

**L5 — Gemini CLI matrix row implies installability**
`docs/install.md` lists Gemini with status `⏳ planned` and install path `.gemini/rcode/`. The table structure puts it alongside `✅ v4` rows. A user who skims the matrix and tries `--ide gemini` gets an early exit. The workaround in the Gemini section (`docs/install.md:106-117`) is manual and not a maintained path.

**L6 — Codex two-step requirement is scattered across three files**
The requirement — global install AND `hooks = true` in `~/.codex/config.toml` — is explained in:
- `docs/install.md` Codex section (steps + config snippet)
- `docs/getting-started.md:17` (one-liner)
- `cli/install.js:528` (runtime warning, only visible if the user has already made the wrong choice)

No single pre-flight check. If either step is missing, `/rcode-*` silently does nothing in Codex. `rcode doctor` is not documented as catching this.

**L7 — `rcode/references/surface-paths.md` does not exist**
Referenced in the audit brief as a source of truth for surface paths. The file is absent from the repo. If any workflow or agent references it expecting surface-routing documentation, it gets a 404.

**L8 — `rcode/skills/actions/setup-ide-integration/` does not exist**
Referenced in the audit brief as an action skill for IDE integration setup. Directory is not present. If the audit brief reflects a planned skill that was never created, users who look for this path (e.g. after reading a doc that references it) find nothing.

---

## Strengthenings

**S1 — Make `convertToCursorMdc()` do something or remove the call**
Either implement minimal `.mdc` frontmatter injection (even just `---\ndescription: rcode command\n---\n` prepended) or remove the `if (entry.cursor) content = convertToCursorMdc(content)` branch and the function. The no-op is the worst outcome: it implies conversion, delivers nothing, and blocks a future real implementation from being noticed as missing.

**S2 — Codex install should fail loudly on project-local, not warn and succeed**
When `--ide codex` is combined with a project-local install (no `--global`), exit non-zero after printing the requirement. Exit 0 with a warning teaches users to ignore the warning. A diagnostic message plus non-zero exit teaches them the requirement is load-bearing.

**S3 — AGENTS.md should be surface-aware**
`cmdGenerateClaudeMd()` should write a minimal surface-aware header to AGENTS.md distinct from CLAUDE.md. At minimum: a Codex pre-flight check block ("verify: `pnpm dlx @hanzlaa/rcode install --global --ide codex` and `hooks = true` in `~/.codex/config.toml`") and a note that slash commands are hook-injected, not picker-based. The current identical-copy approach means Codex users read Claude Code routing instructions.

**S4 — Consolidate Codex two-step requirement into a single checklist**
Add a `## Codex pre-flight` section to `docs/install.md` that lists both requirements in one place, with a copy-paste verification snippet:
```bash
grep -q "hooks = true" ~/.codex/config.toml && echo "hooks: OK" || echo "hooks: MISSING"
ls ~/.rcode/slash-commands/rcode-init.md 2>/dev/null && echo "global install: OK" || echo "global install: MISSING"
```
Reference this section from the runtime warning in `cli/install.js:528`.

**S5 — Fix the inaccurate `~/.codex/prompts/` comment**
`cli/install.js:452` comment should reference `~/.rcode/slash-commands/` (the actual path written and read by the hook router) instead of `~/.codex/prompts/<name>.md`. One-line fix, removes a misleading claim from the installer source.

**S6 — Create `rcode/references/surface-paths.md`**
The file is absent but would be a valuable single source of truth: which paths each IDE reads, which require global install, which surfaces support agents vs. commands vs. skills, and what the fallback is for each surface. The installer's `getPathsForIde()` function (`cli/lib/install-ide.cjs`) is the authoritative source — a reference doc derived from it would prevent the kind of comment-drift documented in L2.

**S7 — Add `rcode doctor` check for Codex misconfiguration**
`rcode doctor` (if it checks IDE health) should verify: (a) hook router present at `~/.rcode/bin/rcode-slash-router.cjs`, (b) `~/.codex/config.toml` contains `hooks = true`, (c) at least one command exists in `~/.rcode/slash-commands/`. Report failure + remediation command. This transforms the current silent failure into a diagnosable state.

---

## Kill your darlings

**Kill: The Gemini CLI install row in `docs/install.md`**
A `⏳ planned` row that points at a path the installer doesn't write is noise. The workaround documented in the same file (manually copy CLAUDE.md) is not a supported install; it's a stopgap that will drift. Either ship the implementation or remove the row and workaround section. A blank row that says "not yet supported" is more honest than a row that implies a path exists and then requires a second section to explain the workaround.

**Kill (or implement): `convertToCursorMdc()`**
A function that says "convert to Cursor `.mdc` format" and returns its input unchanged is misleading API surface. Either implement it (even trivially) or delete it and the `entry.cursor` branch. As long as it exists as a no-op, it blocks recognizing that `.mdc` conversion is absent — any future contributor will assume it's already handled.

**Kill: The `~/.codex/prompts/` comment at `cli/install.js:452`**
This comment was already called out as inaccurate by `cli/lib/namespace-migrate.cjs:144` in the same codebase. It has served its life as a wrong assumption. Remove it and replace with the actual path (`~/.rcode/slash-commands/`) or remove the comment entirely. Dead surface references in the installer source are a maintenance liability.
