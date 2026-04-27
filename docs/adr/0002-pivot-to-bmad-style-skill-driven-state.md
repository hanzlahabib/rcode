# ADR 0002 — Pivot to BMAD-style skill-driven state mutation

**Status:** Accepted
**Date:** 2026-04-11
**Deciders:** Hanzla Habib
**Context:** The CLI surface had drifted toward GSD-style heavy state management (`sprint`, `milestone`, `bug`, `handoff`, `preserve`, `session`, `story-commit`) and away from BMAD-method's skill-file-driven philosophy. The user asked to realign with BMAD.

---

## Context

Rihal Code v0.1.0 shipped 20+ CLI subcommands. Seven of them mutated project state under `.rihal/**`:

| Command | Wrote |
|---|---|
| `rihal-code sprint` | `.rihal/phases/{phase}/sprints/{id}/state.json` |
| `rihal-code milestone` | `.rihal/milestones/*.md` frontmatter |
| `rihal-code bug` | `.rihal/artifacts/bugs/pending/*.md` + sprint state |
| `rihal-code handoff` | `.rihal/HANDOFF.json` |
| `rihal-code preserve` | `.rihal/context/permanent.md` |
| `rihal-code session` | `.rihal/progress/session-*.md` |
| `rihal-code story-commit` | git commit with trailer format |

Each had a backing lib (`cli/lib/*.cjs`) with atomic writes via `writeFileAtomic`, schema validation, and a dedicated `node:test` suite. Total footprint: ~1200 LOC across 7 commands + 7 libs + 6 tests.

Slash-command templates (`.claude/commands/rihal/*.md`) shelled out to these CLI commands for all state mutation. This created two problems:

1. **Security (bug #18, fixed in commit A):** Templates originally used `node -e "require('$HOME/.../cli/lib/*.cjs')"` which leaked file paths across projects. Commit A replaced those with `rihal-code <subcommand>` shell-outs, but that deepened the CLI dependency rather than removing it.
2. **Architectural drift:** BMAD-method, whose skill/workflow philosophy we explicitly cite as inspiration, has no state-management CLI. BMAD's party-mode, sprint tracking, and workflow state all live in markdown/yaml files that Claude reads and writes directly via its Read/Write tools. Rihal drifted closer to GSD's `gsd-tools.cjs` — a heavy CLI that does atomic writes behind Claude's back.

The user raised this directly:

> *"yar mjy smjh ni ari tm yai sari cli kuo bana rahay ho jubky hum ko to sirf skill based agents chahie bmad-method jesy"*
> *"go pure like bmad-method we don't want to overcomplicate with cli actions"*

Then asked for verification: *"are you sure bmad don't have cli"*.

## BMAD audit (research agent, 2026-04-10)

Verified against the installed package at `/home/hanzla/.nvm/versions/node/v24.7.0/lib/node_modules/bmad-method/`:

| Finding | Evidence |
|---|---|
| 2 bin entries (`bmad`, `bmad-method`) | `package.json:22-25` |
| **3 CLI commands total** | `tools/cli/commands/{install,uninstall,status}.js` |
| **No state-management CLI** (no sprint/handoff/party) | `tools/cli/commands/` listing |
| Party mode is 191 lines of markdown | `src/core-skills/bmad-party-mode/workflow.md` |
| ~66 skill `.md` files across 13 dirs | `src/core-skills/` |

**Conclusion:** BMAD's CLI is limited to install-layer concerns. All state mutation (sprints, party discussions, workflows) is driven by Claude reading and writing markdown/yaml/csv files per instructions in skill workflow files.

## Decision

**Delete state-management CLI; instruct Claude to read/write `.rihal/**` files directly via Read/Write/Bash tools in slash command templates.**

### Deleted in this pivot (commit B)

Seven CLI commands + seven libs + six tests:

- `cli/{sprint,milestone,bug,handoff,preserve,session,story-commit}.js`
- `cli/lib/{sprint-state,milestones,handoff,permanent-memory,session-log,story-commit}.cjs`
- `cli/lib/council-panel.cjs` (uncommitted, never shipped)
- `test/lib/{sprint-state,milestones,handoff,permanent-memory,session-log,story-commit}.test.cjs`

~1200 LOC removed. Test count dropped from 158 → ~125 passing.

### Kept — CLI commands with no BMAD equivalent that earn their place

14 commands: `install`, `update`, `uninstall`/`remove`, `doctor`, `dashboard`/`serve`, `config`, `digest`, `team`, `set-profile`, `set-mode`, `show-model`, `github-sync`, `context`, `version`, `help`.

Justification per command:

- **install/update/uninstall** — package lifecycle, identical to BMAD's only CLI commands.
- **doctor** — 5-component skill compliance check. No BMAD equivalent. Read-only against package root.
- **dashboard/serve** — view-only Diwan HTTP server, dep-free, stdlib-only. BMAD has no dashboard.
- **config** — 3-level cascade merge (hardcoded → `~/.rihal-code/defaults.json` → `.rihal/config.json`). Non-trivial logic worth keeping out of prompt templates.
- **digest** — reads agent digests from CLI's own package root, providing project-isolated digest loading. The one CLI shell-out remaining in slash templates (council.md) uses `rihal-code digest <agent>`.
- **team/show-model** — read-only print of package-shipped rosters and model-profile maps.
- **github-sync** — per ADR 0001, GitHub API mutations stay in the CLI.
- **set-profile/set-mode** — model-profiles.cjs has non-trivial validation; keep for now.
- **context** — memory-bank freshness check + optional git hook install.

### Replacement pattern for deleted commands

Every state-mutation slash command was rewritten to instruct Claude directly. Example migration for `/rihal-preserve`:

**Before (commit A):**
```bash
rihal-code preserve 'Conventions' 'Use pnpm not npm'
```

**After (commit B):**
1. `Read .rihal/context/permanent.md`
2. Scan for duplicate entry in target section
3. Append `- [YYYY-MM-DD] Use pnpm not npm` to the `## Conventions` section
4. `Write .rihal/context/permanent.md` (atomic, via Write tool)
5. If file > 200 lines, auto-archive oldest entries to `permanent-archive.md`

Claude's Write tool is atomic — Ctrl+C cannot corrupt state. The schema invariants (section headers, date prefixes, auto-archive threshold) live in the slash command template as natural-language instructions rather than JavaScript code.

Every rewritten template was validated by an updated regression test (`test/lib/no-absolute-home-paths.test.cjs`) that forbids references to the deleted CLI commands and asserts the new direct-file-I/O pattern.

### Dashboard hardening

Since CLI-level schema validation is gone, `server/dashboard.js` must tolerate malformed state files written by Claude. The dashboard already used `safeReadJson` and `safeReadText` wrappers that swallow parse errors. Added one line: `console.warn` on malformed JSON so broken files are visible rather than silently invisible. Still dep-free, still single-file, still view-only per rihal-code CLAUDE.md.

## Consequences

### Gained

- **Architectural alignment with BMAD.** Both projects now have the same CLI shape: install-layer only. State is skill-file-driven, Claude's tools handle I/O.
- **Reduced surface area.** ~1200 LOC deleted from `cli/` and `cli/lib/`. Test suite shrank. One fewer abstraction layer between user intent and file state.
- **No more cross-project leakage class of bug.** Bug #18 came from templates needing to locate `cli/lib/*.cjs` across projects. With no lib to locate, the class of bug is gone.
- **Slash commands are now self-documenting.** What used to be hidden in `sprint-state.cjs::addStoryToSprint()` is now visible in the slash command template as explicit Read/modify/Write steps.
- **Extensibility improved.** Users can fork rihal-code and modify workflow behavior by editing a template file — no Node.js knowledge required.

### Lost

- **Centralized schema validation.** Claude is now responsible for writing valid JSON/frontmatter. The Write tool itself is atomic, but the content is on Claude.
- **Unit-testable state operations.** `sprint-state.test.cjs` et al. exercised pure functions. That safety net is gone. Regressions now need to be caught by higher-level tests (the regression guard test + manual verification in a temp dir).
- **Consistency enforcement.** The CLI libs enforced invariants like "only one active sprint per phase" at write time. Now those invariants live as instructions in the template; Claude must follow them.
- **Performance in edge cases.** The CLI could scan 30+ session logs in <50ms. Claude doing the same with Read + Bash is slower — but we're talking interactive UX, not a hot loop.

### Mitigations

- The regression guard test (`no-absolute-home-paths.test.cjs`) was updated to forbid any reference to the deleted CLI commands in installed templates and to assert that each rewritten template uses direct file I/O markers (`Write tool`, `.rihal/**` paths, `Glob`, `grep`).
- Dashboard JSON parsing now logs warnings on malformed files.
- Manual verification protocol for the pivot: install into a fresh temp dir, exercise each slash command, confirm `.rihal/**` state is written correctly, confirm `rihal-code <deleted-cmd>` exits with "Unknown command".

### Not gained (deliberately out of scope)

- **Parallel multi-agent dispatch.** BMAD streams all agents in a single turn; rihal still chains sequentially. This ADR doesn't touch dispatch style — just state mutation.
- **CSV agent manifest.** BMAD uses `agent-manifest.csv`; rihal keeps `team.yaml`. Not load-bearing for this decision.
- **Re-adding any deleted CLI command.** If a future need justifies it, that's a new ADR with new evidence. No backwards-compat shims for the deletions.

---

## Related

- **ADR 0001** — `github-sync` remains CLI-driven (still holds post-pivot).
- **Commit A (`2503819`)** — closed bug #18 by replacing `$HOME/...` leaks with `rihal-code <subcommand>` shell-outs. Commit B builds on A by replacing the shell-outs themselves with direct Claude tool use.
- **GitHub issue #19** — smart council with conditional dispatch (closed by commit C, which uses the pivot as its foundation).

## References

- BMAD-method audit: `/home/hanzla/.nvm/versions/node/v24.7.0/lib/node_modules/bmad-method/` (`package.json:22-25`, `tools/cli/commands/`, `src/core-skills/bmad-party-mode/workflow.md`)
- Rihal Code CLAUDE.md: dashboard rules, commit rules, file size limits
- Plan file: `/home/hanzla/.claude/plans/compiled-jingling-sloth.md`
