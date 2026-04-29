# ADR 0002 — Pivot to skill-driven state mutation

**Status:** Accepted
**Date:** 2026-04-11
**Deciders:** Hanzla Habib
**Context:** The CLI surface had drifted toward heavy state management (`sprint`, `milestone`, `bug`, `handoff`, `preserve`, `session`, `story-commit`) and away from a skill-file-driven philosophy where Claude reads and writes project state directly through its Read/Write tools.

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

Slash-command templates (`.claude/commands/rihal/*.md`) shelled out to these CLI commands for all state mutation. Two problems with that:

1. **Security (bug #18, fixed in commit A):** Templates originally used `node -e "require('$HOME/.../cli/lib/*.cjs')"` which leaked file paths across projects. Commit A replaced those with `rihal-code <subcommand>` shell-outs, but that deepened the CLI dependency rather than removing it.
2. **Architectural opacity:** the agent had no visibility into the state mutations happening behind its tools. Skill files documented intent, but the actual writes happened in JS the agent never read. Forking the project required Node.js knowledge.

The user raised this directly:

> *"yar mjy smjh ni ari tm yai sari cli kuo bana rahay ho jubky hum ko to sirf skill based agents chahie"*
> *"go pure skill-based; we don't want to overcomplicate with cli actions"*

## Decision

**Delete state-management CLI; instruct Claude to read/write `.rihal/**` files directly via Read/Write/Bash tools in slash command templates.**

### Deleted in this pivot (commit B)

Seven CLI commands + seven libs + six tests:

- `cli/{sprint,milestone,bug,handoff,preserve,session,story-commit}.js`
- `cli/lib/{sprint-state,milestones,handoff,permanent-memory,session-log,story-commit}.cjs`
- `cli/lib/council-panel.cjs` (uncommitted, never shipped)
- `test/lib/{sprint-state,milestones,handoff,permanent-memory,session-log,story-commit}.test.cjs`

~1200 LOC removed. Test count dropped from 158 → ~125 passing.

### Kept — CLI commands without a skill-file equivalent

14 commands earn their place: `install`, `update`, `uninstall`/`remove`, `doctor`, `dashboard`/`serve`, `config`, `digest`, `team`, `set-profile`, `set-mode`, `show-model`, `github-sync`, `context`, `version`, `help`.

Justification per command:

- **install/update/uninstall** — package lifecycle. Necessarily JS.
- **doctor** — 5-component skill compliance check. Read-only against package root.
- **dashboard/serve** — view-only HTTP server, dep-free, stdlib-only.
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

- **Architectural clarity.** Slash commands are self-documenting — what used to be hidden in `sprint-state.cjs::addStoryToSprint()` is now visible in the template as explicit Read/modify/Write steps.
- **Reduced surface area.** ~1200 LOC deleted from `cli/` and `cli/lib/`. Test suite shrank. One fewer abstraction layer between user intent and file state.
- **No more cross-project leakage class of bug.** Bug #18 came from templates needing to locate `cli/lib/*.cjs` across projects. With no lib to locate, the class of bug is gone.
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

- **Parallel multi-agent dispatch.** Sequential chaining stays for now; this ADR doesn't touch dispatch style — just state mutation.
- **CSV agent manifest.** Rihal keeps `team.yaml`.
- **Re-adding any deleted CLI command.** If a future need justifies it, that's a new ADR with new evidence. No backwards-compat shims for the deletions.

---

## Related

- **ADR 0001** — `github-sync` remains CLI-driven (still holds post-pivot).
- **Commit A (`2503819`)** — closed bug #18 by replacing `$HOME/...` leaks with `rihal-code <subcommand>` shell-outs. Commit B builds on A by replacing the shell-outs themselves with direct Claude tool use.
- **GitHub issue #19** — smart council with conditional dispatch (closed by commit C, which uses the pivot as its foundation).
