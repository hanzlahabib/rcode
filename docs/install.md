# Installing rcode

Package: [`@hanzlaa/rcode`](https://www.npmjs.com/package/@hanzlaa/rcode) on npm.
Current version: **v4.0.0** (2026-05-23).

---

## Quick start

In any project directory (existing codebase OR empty folder):

```bash
pnpm dlx @hanzlaa/rcode install
```

That's it. One command ships everything. No global install needed — `pnpm dlx` runs the latest published version every time.

> **Node 18+ / npm 11.x users:** We recommend pnpm — npm 11.x introduced breaking changes to `npx` that can cause `dlx`-style installs to fail or produce stale caches. Install pnpm once and use it for all rcode commands:
> ```bash
> npm install -g pnpm
> pnpm dlx @hanzlaa/rcode install
> ```

---

## What gets installed

After the command completes, your project has:

| Path | What's inside |
|------|---------------|
| `.rcode/` | Config, workflows, references, binary CLI (`rcode-tools.cjs`) |
| `.claude/agents/` | 46 first-class subagents (Sadiq, Waleed, Layla, Fatima, etc.) |
| `.claude/commands/rcode/` | 116 slash commands (`/rcode-create-prd`, `/rcode-council`, ...) |
| `.claude/skills/` | 86 phrase-activated skills |
| `.planning/` | Your project's artifacts land here (councils, plans, sprints, summaries) |
| `rcode/brain/` | rcode standards pulled from upstream — populated via `rcode-tools brain pull` |

---

## What gets committed vs ignored

On first install, rcode automatically updates your project's `.gitignore` so you commit the **work**, not the **methodology**. If you already have a `.gitignore`, rcode appends its block — your existing entries are preserved.

Interactive installs also prompt you on `.planning/` specifically — you choose whether to commit PRDs, roadmaps, sprints, SUMMARY files (default yes) or keep them local (`--no-commit-planning`). You can flip this later at any time.

| Path | Commit? | Why |
|------|:-------:|-----|
| `.rcode/config.yaml` | ✅ commit | Your project's chosen mode, language, profile, commit_planning — collaborators should see the same |
| `.rcode/state.json` | ✅ commit | Decisions log, roadmap pointer, blockers — this is your project's memory |
| `.rcode/brain/sources.yaml` | ✅ commit | Brain source manifest — collaborators pull the same content |
| `.planning/` | ✅ commit *(toggle-able)* | PRD, roadmap, sprints, SUMMARY.md — the actual thinking. Set `commit_planning: false` in config to gitignore instead. |
| `.claude/` | ❌ ignored | Installed skills/agents/commands — regenerate with `rcode install` |
| `.rcode/bin/`, `.rcode/workflows/`, `.rcode/references/`, `.rcode/commands/`, `.rcode/skills/` | ❌ ignored | Methodology files — re-installed on every update |
| `.rcode/brain/rcode-github/`, `.rcode/brain/rcode-docs/`, `.rcode/brain/best-practices/` | ❌ ignored | Pulled rcode standards — refresh with `rcode brain pull` |
| `.rcode/state.json.lock`, `.planning/debug/`, `.planning/_backup/` | ❌ ignored | Runtime noise |

### Flipping commit_planning after install

If you want to change the commit policy for `.planning/` after install:

```bash
# Stop committing planning artifacts:
node .rcode/bin/rcode-tools.cjs config-set commit_planning false
node .rcode/bin/rcode-tools.cjs gitignore refresh

# Start committing them again:
node .rcode/bin/rcode-tools.cjs config-set commit_planning true
node .rcode/bin/rcode-tools.cjs gitignore refresh
```

`gitignore refresh` reads `.rcode/config.yaml` and rewrites the rcode-managed block in `.gitignore`. It's idempotent — safe to run any time, and leaves your non-rcode gitignore entries untouched.

The rcode block in `.gitignore` is marked with a sentinel comment:
```
# ===== rcode-managed gitignore block (pnpm dlx @hanzlaa/rcode install) =====
```
Re-running install is idempotent — it detects the marker and skips re-appending. Safe to customize entries inside the block, but edits can be overwritten if you ever `sed` it out.

### Manually commit everything anyway?

Remove the rcode block from `.gitignore`. You own your repo. Just know that every `rcode update` will produce large diffs.

---

## Editor support matrix

| Editor | `--ide` | What gets written | Status |
|--------|---------|------------------|:------:|
| Claude Code (CLI + desktop app) | `claude` *(default)* | `.claude/agents/`, `.claude/commands/rcode/`, `.claude/skills/` | ✅ v4 |
| Cursor | `cursor` | `.cursor/rules/rcode-*.mdc` | ✅ v4 |
| Gemini CLI | `gemini` | `.gemini/rcode/` | ⏳ planned |
| VS Code *with* Claude Code extension | `claude` | Same as Claude Code — extension reads `.claude/` | ✅ v4 |
| VS Code native | `vscode` | `.vscode/` integration | ✅ v4 |
| Antigravity | `antigravity` | `.antigravity/` | ✅ v4 |
| Windsurf | `windsurf` | `.windsurf/` | ✅ v4 |
| OpenAI Codex CLI | `codex` | `.rcode/` + (on `--global`) `~/.codex/hooks.json` router + `~/.rcode/slash-commands/` | ✅ `/rcode-*` via UserPromptSubmit hook — see Codex section below |
| Grok (xAI) | `grok` | Reads global `~/.claude/commands/` (Claude-compatible) | ✅ `/rcode-*` via a global `~/.claude` install |

Passing an unsupported `--ide` value prints a clear error with workaround guidance.

### Gemini CLI — planned, not yet implemented

`--ide gemini` is tracked but not yet available. When you pass it, the installer exits with an explanation and a workaround.

**Workaround (manual):** Copy the `.gemini/` config from another rcode-enabled project, or bootstrap it from a Claude Code install:

```bash
# 1. Install via Claude Code as normal
pnpm dlx @hanzlaa/rcode install --ide claude

# 2. Create the Gemini config directory and add a GEMINI.md pointer
mkdir -p .gemini
cp .claude/CLAUDE.md .gemini/GEMINI.md   # adapt as needed for Gemini context
```

Track the Gemini IDE implementation in the project issue tracker. When it ships, `pnpm dlx @hanzlaa/rcode install --ide gemini` will write `.gemini/rcode/` automatically.

### Codex CLI — slash commands via the UserPromptSubmit hook

Codex has no file-based slash-command *menu*, but it does support a `UserPromptSubmit`
hook. rcode installs a router into `~/.codex/hooks.json` that, when you **type**
`/rcode-<name> [args]`, injects the matching command body into the turn.

Two requirements (both easy to miss):

```bash
# 1. Install GLOBALLY targeting codex — the hook + command bodies are global
#    (~/.codex/hooks.json, ~/.rcode/slash-commands/). A project-local install
#    does NOT wire them (the installer now warns you — see #908).
pnpm dlx @hanzlaa/rcode install --global --ide codex

# 2. Make sure codex hooks are enabled in ~/.codex/config.toml:
#    [features]
#    hooks = true
```

Then **reload your Codex session** and type a command, e.g. `/rcode-add-phase`.

> **No autocomplete.** `/rcode-*` will *not* appear in Codex's `/` menu — Codex has no
> file-based slash-command list. You type the full command; the hook does the rest.

**Grok** is Claude-Code-compatible and reads `~/.claude/commands/`, so a global
`pnpm dlx @hanzlaa/rcode install --global` makes `/rcode-*` available there directly.

---

## Pick your install flavor

### Default — full install, guided mode
```bash
pnpm dlx @hanzlaa/rcode install
```

- All 45 agents, 116 commands, 86 skills
- Mode: `guided` (skills halt at menus for user input)
- Language: English
- Model profile: `balanced`
- IDE: `claude` (Claude Code native)

### Different IDE
```bash
pnpm dlx @hanzlaa/rcode install --ide claude       # default
pnpm dlx @hanzlaa/rcode install --ide cursor
pnpm dlx @hanzlaa/rcode install --ide gemini
pnpm dlx @hanzlaa/rcode install --ide vscode
pnpm dlx @hanzlaa/rcode install --ide antigravity
pnpm dlx @hanzlaa/rcode install --ide windsurf
```

### Subset of skills — module-based install
```bash
pnpm dlx @hanzlaa/rcode install --module core         # council + quick-sync only
pnpm dlx @hanzlaa/rcode install --module execution --force
pnpm dlx @hanzlaa/rcode install --module discovery --force
```

Use `--force` when adding a second module on top of an existing install (skips the "already installed" check).

### Pin a specific version
```bash
pnpm dlx @hanzlaa/rcode@4.0.0 install
```

Version-pinned installs are reproducible — collaborators on the same repo get the same skills + agents.

---

## After install — first 5 minutes

Start a Claude Code session in your project:

```bash
claude   # or open the project in the Cursor / Gemini variant
```

Then try any of these to kick the tires:

```
/rcode-status           — one-line dashboard
/rcode-progress         — full progress view with Route A/B/C next-up
/rcode-council what should we build first?
/rcode-create-prd for a task management feature
```

If this is a new project, start with:

```
/rcode-scaffold-project      — guided project init
/rcode-create-prd            — PRD through structured facilitation
/rcode-new-milestone         — design the M1..Mn roadmap from the PRD
/rcode-create-epics-and-stories   — break M1 into sprint-ready stories
/rcode-sprint-planning       — capacity-gated sprint plan
/rcode-dev-story             — implement one story end-to-end
/rcode-progress              — see where you are, what's next
```

---

## Updating

```bash
pnpm dlx @hanzlaa/rcode update
```

That pulls the latest methodology + refreshes the brain content (see `rcode/brain/`). Your project's `.rcode/config.yaml` and `.rcode/state.json` are preserved — only the methodology files get refreshed.

To pin to a specific version on update:

```bash
/rcode-update v4.0.0   # inside a Claude session
```

---

## Yolo mode (autonomous, less halt-at-menu)

Default mode is `guided` — skills stop at decision menus and wait for you. If you want skills to auto-advance using the best inference from context:

Edit `.rcode/config.yaml`:
```yaml
mode: yolo
```

Yolo still respects the research citation rule, state sync rule, and capacity gate. It only bypasses confirmation menus. See [`docs/running-autonomously.md`](running-autonomously.md).

---

## Uninstalling

rcode is pure file-shipping with no persistent runtime. To remove:

```bash
rm -rf .rcode/ .claude/ .planning/ rcode/brain/
```

Your git history of your own project's artifacts in `.planning/` is yours — back up before `rm -rf` if you want to keep them.

---

## Troubleshooting

### `command not found: claude`
Install Claude Code first: see https://claude.ai/code. rcode is a package you install *into* Claude Code / Cursor / Gemini — it doesn't ship the IDE itself.

### Install succeeds but skills don't activate
Make sure you're running in the directory that has `.claude/skills/`. Some IDEs require a restart after a new skill folder appears. Claude Code: `Cmd+Shift+P → Reload Window`.

### `pnpm dlx @hanzlaa/rcode` hangs at "resolving packages"
npm registry mirror issue. Try `npm config set registry https://registry.npmjs.org/` then re-run.

### Collaborator on the same repo sees different skills
Someone ran `rcode update` and the other hasn't. Either commit the `.rcode/` changes (they're git-friendly) or standardize on a pinned version.

### Want to uninstall one module but keep others
Not yet supported. Re-install with only the modules you want via `--module` flags + `--force`.

---

## Namespace coexistence

When both `rcode-*` and `rihal-*` namespaces are installed, the skill and command rosters effectively double because the two sets contain near-identical content under different prefixes. This can make the slash-command picker and skill list harder to navigate. If you only need one workflow style, remove the other namespace's files (or reinstall with a single namespace) to keep things lean. The installer will print a yellow warning to stderr when it detects both namespaces present at once.

## Dry run

Pass `--dry-run` (or its alias `--list-files`) to preview every path that would be created or copied, without writing anything to disk. The installer prints `DRY RUN: the following paths would be written:` followed by one `  + <path>` line per file, then exits with code 0. This is useful for auditing what a fresh install or upgrade would touch before you commit to it. Combine with `--yes` and `--ide` to get a non-interactive listing: `npx @hanzlaa/rcode install --dry-run --yes --ide claude`.

---

## Next

- Read [`docs/what-is-rcode-code.md`](what-is-rcode-code.md) for the product story.
- Read [`docs/TIERS.md`](TIERS.md) to pick what to try first.
- Read [`docs/ROADMAP.md`](ROADMAP.md) to see where this is going.
- If you want to contribute, read [`CONTRIBUTING.md`](../CONTRIBUTING.md) — per-role guide.
