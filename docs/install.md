# Installing Rihal Code

Package: [`@hanzlaa/rcode`](https://www.npmjs.com/package/@hanzlaa/rcode) on npm.
Current version: **v2.1.0** (2026-04-24).

---

## Quick start

In any project directory (existing codebase OR empty folder):

```bash
npx @hanzlaa/rcode install
```

That's it. One command ships everything. No `npm install -g` needed — npx runs the latest published version every time.

---

## What gets installed

After the command completes, your project has:

| Path | What's inside |
|------|---------------|
| `.rihal/` | Config, workflows, references, binary CLI (`rihal-tools.cjs`) |
| `.claude/agents/` | 44 first-class subagents (Sadiq, Waleed, Layla, Fatima, etc.) |
| `.claude/commands/rihal/` | 93 slash commands (`/rihal-create-prd`, `/rihal-council`, ...) |
| `.claude/skills/` | 58 phrase-activated skills |
| `.planning/` | Your project's artifacts land here (councils, plans, sprints, summaries) |
| `rihal/brain/` | Rihal standards pulled from upstream (M5 in-progress, currently scaffolds with placeholders) |

Total install footprint: ~3.8 MB, 676 files.

---

## What gets committed vs ignored

On first install, rcode automatically updates your project's `.gitignore` so you commit the **work**, not the **methodology**. If you already have a `.gitignore`, rcode appends its block — your existing entries are preserved.

Interactive installs also prompt you on `.planning/` specifically — you choose whether to commit PRDs, roadmaps, sprints, SUMMARY files (default yes) or keep them local (`--no-commit-planning`). You can flip this later at any time.

| Path | Commit? | Why |
|------|:-------:|-----|
| `.rihal/config.yaml` | ✅ commit | Your project's chosen mode, language, profile, commit_planning — collaborators should see the same |
| `.rihal/state.json` | ✅ commit | Decisions log, roadmap pointer, blockers — this is your project's memory |
| `.rihal/brain/sources.yaml` | ✅ commit | Brain source manifest — collaborators pull the same content |
| `.planning/` | ✅ commit *(toggle-able)* | PRD, roadmap, sprints, SUMMARY.md — the actual thinking. Set `commit_planning: false` in config to gitignore instead. |
| `.claude/` | ❌ ignored | Installed skills/agents/commands — 500+ files, regenerate with `rcode install` |
| `.rihal/bin/`, `.rihal/workflows/`, `.rihal/references/`, `.rihal/commands/`, `.rihal/skills/` | ❌ ignored | Methodology files — re-installed on every update |
| `.rihal/brain/rihal-github/`, `.rihal/brain/rihal-docs/`, `.rihal/brain/best-practices/` | ❌ ignored | Pulled Rihal standards — refresh with `rcode brain pull` |
| `.rihal/state.json.lock`, `.planning/debug/`, `.planning/_backup/` | ❌ ignored | Runtime noise |

### Flipping commit_planning after install

If you want to change the commit policy for `.planning/` after install:

```bash
# Stop committing planning artifacts:
node .rihal/bin/rihal-tools.cjs config-set commit_planning false
node .rihal/bin/rihal-tools.cjs gitignore refresh

# Start committing them again:
node .rihal/bin/rihal-tools.cjs config-set commit_planning true
node .rihal/bin/rihal-tools.cjs gitignore refresh
```

`gitignore refresh` reads `.rihal/config.yaml` and rewrites the rcode-managed block in `.gitignore`. It's idempotent — safe to run any time, and leaves your non-rcode gitignore entries untouched.

**Without the auto-managed `.gitignore`**, `git add .` would bloat your repo by 676 files (~3.8 MB) — methodology files that regenerate on every install.

The rcode block in `.gitignore` is marked with a sentinel comment:
```
# ===== rcode-managed gitignore block (npx @hanzlaa/rcode install) =====
```
Re-running install is idempotent — it detects the marker and skips re-appending. Safe to customize entries inside the block, but edits can be overwritten if you ever `sed` it out.

### Manually commit everything anyway?

Remove the rcode block from `.gitignore`. You own your repo. Just know that every `rcode update` will produce large diffs.

---

## Editor support matrix

| Editor | `--ide` | What gets written | Status |
|--------|---------|------------------|:------:|
| Claude Code (CLI + desktop app) | `claude` *(default)* | `.claude/agents/`, `.claude/commands/rihal/`, `.claude/skills/` | ✅ v2.x |
| Cursor | `cursor` | `.cursor/rules/rihal-*.mdc` | ✅ v2.x |
| Gemini CLI | `gemini` | `.gemini/rihal/` | ✅ v2.x |
| VS Code *with* Claude Code extension | `claude` | Same as Claude Code — extension reads `.claude/` | ✅ v2.x |
| VS Code native (no Claude Code extension) | `vscode` | *not yet supported* | 🗓 v3.0 ([#182](https://github.com/hanzlahabib/rihal-code/issues/182)) |
| JetBrains (IntelliJ / PyCharm) | `jetbrains` | *not yet supported* | 🗓 v3.0 ([#182](https://github.com/hanzlahabib/rihal-code/issues/182)) |
| Zed | `zed` | *not yet supported* | 🗓 v3.0 ([#182](https://github.com/hanzlahabib/rihal-code/issues/182)) |

Passing an unsupported `--ide` value prints a clear error with workaround guidance (e.g. VS Code users are pointed at `--ide claude` if they have the Claude Code extension).

---

## Pick your install flavor

### Default — full install, guided mode
```bash
npx @hanzlaa/rcode install
```

- All 44 agents, 93 commands, 58 skills
- Mode: `guided` (skills halt at menus for user input)
- Language: English
- Model profile: `balanced`
- IDE: `claude` (Claude Code native)

### Different IDE
```bash
npx @hanzlaa/rcode install --ide claude    # default
npx @hanzlaa/rcode install --ide cursor
npx @hanzlaa/rcode install --ide gemini
```

### Subset of skills — module-based install
```bash
npx @hanzlaa/rcode install --module core         # council + quick-sync only
npx @hanzlaa/rcode install --module execution --force
npx @hanzlaa/rcode install --module discovery --force
```

Use `--force` when adding a second module on top of an existing install (skips the "already installed" check).

### Pin a specific version
```bash
npx @hanzlaa/rcode@2.1.0 install
npx @hanzlaa/rcode@2.0.0 install
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
/rihal-status           — one-line dashboard
/rihal-progress         — full progress view with Route A/B/C next-up
/rihal-council what should we build first?
/rihal-create-prd for a task management feature
```

If this is a new project, start with:

```
/rihal-scaffold-project      — guided project init
/rihal-create-prd            — PRD through structured facilitation
/rihal-create-milestone      — design the M1..Mn roadmap from the PRD
/rihal-create-epics-and-stories   — break M1 into sprint-ready stories
/rihal-sprint-planning       — capacity-gated sprint plan
/rihal-dev-story             — implement one story end-to-end
/rihal-progress              — see where you are, what's next
```

---

## Updating

```bash
npx @hanzlaa/rcode update
```

That pulls the latest methodology + refreshes the brain content (see `rihal/brain/`). Your project's `.rihal/config.yaml` and `.rihal/state.json` are preserved — only the methodology files get refreshed.

To pin to a specific version on update:

```bash
/rihal-update v2.0.0   # inside a Claude session
```

---

## Yolo mode (autonomous, less halt-at-menu)

Default mode is `guided` — skills stop at decision menus and wait for you. If you want skills to auto-advance using the best inference from context:

Edit `.rihal/config.yaml`:
```yaml
mode: yolo
```

Yolo still respects the research citation rule, state sync rule, and capacity gate. It only bypasses confirmation menus. See [`docs/running-autonomously.md`](running-autonomously.md).

---

## Uninstalling

Rihal Code is pure file-shipping with no persistent runtime. To remove:

```bash
rm -rf .rihal/ .claude/ .planning/ rihal/brain/
```

Your git history of your own project's artifacts in `.planning/` is yours — back up before `rm -rf` if you want to keep them.

---

## Troubleshooting

### `command not found: claude`
Install Claude Code first: see https://claude.ai/code. Rihal Code is a package you install *into* Claude Code / Cursor / Gemini — it doesn't ship the IDE itself.

### Install succeeds but skills don't activate
Make sure you're running in the directory that has `.claude/skills/`. Some IDEs require a restart after a new skill folder appears. Claude Code: `Cmd+Shift+P → Reload Window`.

### `npx @hanzlaa/rcode` hangs at "resolving packages"
npm registry mirror issue. Try `npm config set registry https://registry.npmjs.org/` then re-run.

### Collaborator on the same repo sees different skills
Someone ran `rihal-code update` and the other hasn't. Either commit the `.rihal/` changes (they're git-friendly) or standardize on a pinned version.

### Want to uninstall one module but keep others
Not yet supported. Re-install with only the modules you want via `--module` flags + `--force`.

---

## Legacy install command (still works)

The legacy binary name `rihal-code` is kept as an alias for backward compatibility with older docs:

```bash
npx rihal-code install     # works, same as @hanzlaa/rcode install
```

New docs and CI should prefer `npx @hanzlaa/rcode install`.

---

## Next

- Read [`docs/what-is-rihal-code.md`](what-is-rihal-code.md) for the product story.
- Read [`docs/TIERS.md`](TIERS.md) to pick what to try first.
- Read [`docs/ROADMAP.md`](ROADMAP.md) to see where this is going (v3 MCP server on the horizon).
- If you want to contribute, read [`CONTRIBUTING.md`](../CONTRIBUTING.md) — per-role guide.
