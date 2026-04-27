# ADR 0001 — `github-sync` is a CLI command, not a Claude-driven slash command

**Status:** Accepted
**Date:** 2026-04-11
**Deciders:** Hanzla Habib
**Context:** A user asked whether it made sense to keep a dedicated CLI (`rihal-code github-sync`) for pushing phases/epics/stories to GitHub, or whether Claude in the editor should just read the `.rihal/` artifacts and run `gh` commands directly.

---

## Context

Rihal Code produces project artifacts under `.rihal/phases/` — phase briefs, epics, stories, sprint plans. Teams want these tracked on GitHub as milestones and issues so non-Rihal tooling (PR templates, project boards, release notes) can see the work.

Two credible architectures exist for getting artifacts onto GitHub:

**Option A — CLI tool (`rihal-code github-sync`)**
A dedicated Node.js command that walks `.rihal/phases/`, diffs against a sync map, calls `gh issue create` / `gh api` directly, and records results atomically in `.rihal/integrations/github-map.json`.

**Option B — Claude runs `gh` directly**
Let the AI agent in the editor read the artifact files as part of a slash command and issue `gh` calls via its Bash tool. No dedicated CLI; the "logic" lives in the slash command prompt template.

Both approaches can technically create the same issues. The question is which is *reliable and maintainable* at team scale.

---

## Decision

**We keep the CLI as the single path for GitHub mutations.** Claude slash commands (`/rihal-push-sprint`, `/rihal-push-epic`, `/rihal-push-story`) are thin wrappers that invoke the CLI. Claude never calls `gh` directly for issue creation.

Division of responsibility:

| Layer | Owned by | Why |
|---|---|---|
| **Plumbing** — `gh` calls, retries, error handling, rate limiting | CLI | Deterministic, testable, runs offline from Claude, runs in CI |
| **Idempotency** — sync map, SHA-256 content hashing, duplicate prevention | CLI | Requires persistent state Claude can't reliably manage across sessions |
| **Content judgment** — writing good acceptance criteria, splitting stories, enhancing briefs | Claude | Language work Claude is designed for |
| **Workflow orchestration** — "dry-run first, confirm, then execute" | Slash commands | Claude reads state, asks user, calls CLI |
| **Artifact preparation** — turning requirements into story files | Claude (`/rihal-generate-sprint`, `rihal-create-epics-and-stories`) | Semantic work; CLI would be a glorified template engine |

---

## Arguments for the CLI path

### 1. Idempotency
The sync map at `.rihal/integrations/github-map.json` records SHA-256 content hashes and GitHub issue numbers. Re-running sync creates zero duplicates — only new or changed items get touched. Claude would need to re-derive this mapping every session from scratch, either by searching GitHub (slow, error-prone) or by reading the JSON file (at which point it's doing the CLI's job in markdown form).

### 2. Atomicity
`saveSyncMap()` writes via `writeJsonAtomic()` — a temp-file + fsync + rename pattern. A Ctrl+C mid-write cannot corrupt the mapping. Claude calling `gh` through Bash has no equivalent guarantee; a crash mid-batch leaves the map inconsistent with reality, and the next run creates duplicates.

### 3. Speed and cost
A bulk sync of 20 issues completes in ~5 seconds with zero Claude tokens consumed. The same batch via Claude costs 2-5 minutes of wall time and roughly $1-2 in tokens (reading each markdown file, constructing each payload, parsing each response). For large projects this is noticeable; for power users running sync frequently during a sprint it's prohibitive.

### 4. CI and automation
The CLI runs in GitHub Actions, cron, or post-commit hooks without any LLM access. Scenarios like "nightly sync of phase artifacts" or "post-merge label reconciliation" require an agent-free path. Claude-only orchestration can't serve these.

### 5. Offline and emergency recovery
When Claude is down, when you're on a plane, when you're out of API credits — the CLI still works. Teams that depend on a workflow want a non-LLM fallback for critical paths. GitHub sync is critical when a sprint starts.

### 6. Deterministic testing
The CLI has smoke tests (`--dry-run`, fake repo paths, fixtures under `/tmp/`). We can assert exact output and exit codes. Claude-driven paths can't be tested the same way — the output varies per run and depends on the model version.

### 7. Rate limit hygiene
`gh` respects GitHub's rate limits automatically, and the CLI can batch and back off intelligently. Claude calling `gh` one issue at a time through Bash has weaker limits and no retry strategy.

### 8. Single source of truth for the label taxonomy
The 23-label Rihal taxonomy (Type / Priority / Status / Area) lives in one place (`cli/github-sync.js`). If it evolves, we ship a new package version. Claude-driven creation would spread inconsistent labels across runs as different sessions interpret the rules slightly differently.

---

## Arguments against the CLI path (considered and rejected)

### "Claude is more flexible"
True, and that's why Claude owns **artifact preparation**. Flexibility is valuable when writing requirements ("this user story should be split into two") but a liability when pushing to a remote service ("maybe I should also create a project board?"). The CLI is deliberately inflexible for mutations — that's a feature.

### "Less JavaScript to maintain"
The CLI is ~700 lines. Prompt engineering for an equivalent Claude slash command would be several thousand words of carefully crafted instructions, and would still be less reliable. The code is cheaper to maintain than the equivalent prompt.

### "Claude can adapt body templates per-project"
It can, but the CLI already reads story file content verbatim (3000-char slice) into the issue body. The surrounding scaffolding (Meta block, Parent Epic link, acceptance criteria stub) is minimal. If a team wants a different scaffold, we plan to extract templates to `.rihal/templates/github/*.md` — editable without shipping code.

### "You still need Claude for semantic work"
Yes — that's why the slash commands exist. `/rihal-push-epic` is a Claude-driven command that reads the epic, optionally offers improvements, then delegates to the CLI for the actual posting. The plumbing is deterministic; the judgment is LLM-driven. The split is the point.

---

## Consequences

### Positive
- **Bulk sync is fast, cheap, and reliable.** `rihal-code github-sync --execute` pushes dozens of issues in seconds.
- **Idempotent re-runs** mean users can safely sync during a sprint without fearing duplicates.
- **CI integration works** without any Claude dependency.
- **The slash commands become thinner** — they focus on the decision flow (dry-run → review → confirm) while the CLI handles mechanics.
- **Tests are deterministic.** The CLI has a known-good test surface.

### Negative
- **The label taxonomy is hard-coded in JavaScript.** Changing it requires a package update. Mitigation: labels are opt-in (`--with-labels`) so most users never touch them, and we plan to extract templates to `.rihal/templates/github/` in a later release.
- **Body scaffolding is partly in JS.** Same mitigation plan.
- **Two places to look when debugging a sync.** The slash command (what Claude saw) and the CLI (what `gh` returned). Mitigation: clear error messages in the CLI + slash commands that print the full CLI output.
- **Version drift between slash commands and CLI** — a stale slash command could call an outdated CLI flag. Mitigation: the post-install manifest check flags drift; CI runs `node -c` on every template string.

### Neutral
- **Slash commands don't push directly.** They always invoke the CLI via Bash. Users who want a "one-shot" flow from the editor still get it, just via delegation.

---

## Rules of thumb (for future contributors)

Use the **CLI** when:
- The operation mutates a remote service (GitHub, Linear, Slack, Notion)
- It needs idempotency (sync maps, content hashes)
- It needs to run in CI or without Claude access
- The output is deterministic and testable
- It can be expressed as discovery → plan → execute

Use a **Claude slash command** when:
- The operation requires understanding ("is this really a bug?")
- It generates new content ("write acceptance criteria for this story")
- It involves adaptive questioning ("what's the kill criteria?")
- It orchestrates a multi-agent discussion (Majlis, council)
- It reads multiple artifacts and synthesizes a recommendation

Use **both together** when:
- You're pushing semantic work to a remote service. Claude prepares, CLI posts.
- Examples: `/rihal-push-sprint`, `/rihal-push-epic`, `/rihal-push-story`

---

## References

- `cli/github-sync.js` — the CLI implementation
- `cli/lib/github.cjs` — the `gh` wrapper library
- `.rihal/integrations/github-map.json` — the sync map (per-project)
- Slash commands: `push-sprint.md`, `push-epic.md`, `push-story.md`, `github-sync.md` (all in `cli/init.js`)
- Related: [ADR 0002 — Zero-dependency CLI philosophy] (future)
