---
phase: 15
sprint: 15.1
type: execute
autonomous: true
wave: 1
gap_closure: true
requirements: [REQ-481]

must_haves:
  truths:
    - "node .rcode/bin/rcode-tools.cjs phases list returns JSON with directories[] and summaries[]"
    - "node .rcode/bin/rcode-tools.cjs find-phase <N> returns JSON with number, slug, dir, exists"
    - "node .rcode/bin/rcode-tools.cjs uat render-checkpoint --file <p> returns markdown checkpoint block"
    - "node .rcode/bin/rcode-tools.cjs audit-uat returns JSON inventory of UAT files with status counts"
    - "node .rcode/bin/rcode-tools.cjs requirements mark-complete <ID> [<ID>...] toggles requirement state in REQUIREMENTS.md"
    - "node .rcode/bin/rcode-tools.cjs todo match-phase <N> returns todos tagged with phase N"
    - "node .rcode/bin/rcode-tools.cjs learnings copy returns ok with count of copied entries (or no-op when missing)"
    - "comm -23 of called-vs-implemented top-level subcommands returns 0 lines"
  artifacts:
    - path: "rcode/bin/rcode-tools.cjs"
      provides: "8 new subcommand handlers + dispatch cases + help entries"
    - path: "rcode/bin/rcode-tools.cjs"
      provides: "cmdPhasesList, cmdFindPhase, cmdUatRenderCheckpoint, cmdAuditUat, cmdRequirementsMarkComplete, cmdTodoMatchPhase, cmdLearningsCopy"
  key_links:
    - from: "GH issue #481"
      to: "this sprint"
      why: "all 8 phantoms enumerated with callsites and inferred contracts"
---

## Goal

Eliminate the 8 phantom CLI subcommands enumerated in #481 by implementing each handler in `rcode/bin/rcode-tools.cjs` with a contract derived from how the workflow callsite consumes the output. All 8 must be callable; failures must surface as structured JSON errors, not crashes.

## Context

Three phantoms (`/rcode-execute-phase`, `phase-plan-index`, `init execute-phase`) were closed in commit `a091be6` against #479. A subsequent sweep of all `rcode-tools.cjs <subcmd>` callsites in `rcode/workflows/` against the implemented top-level cases turned up 8 more.

The contract for each subcommand must be derived from the **callsite consumer code**, not guessed:

| Subcommand | Callsite | What consumer does with output |
|---|---|---|
| `phases list --pick directories[-1]` | `plan-milestone-gaps.md:68` | Indexes into `directories[]` array; needs JSON shape `{directories: [...]}` |
| `phases list --type summaries --raw` | `execute-sprint.md:134` | Reads SUMMARY.md inventory; needs `{summaries: [...]}` filter |
| `find-phase <N> --raw` | `execute.md:1007` | Resolves parent phase metadata for decimal phases — needs `{number, slug, dir, exists, decimal_children}` |
| `uat render-checkpoint --file <p> --raw` | `verify-work.md:253` | Renders a markdown checkpoint block from a UAT file |
| `audit-uat --raw` | `audit-uat.md:11` | Returns inventory: pending/skipped/blocked/human_needs/passed counts + file list |
| `requirements mark-complete <IDs>` | `execute-sprint.md:464` | Mutates REQUIREMENTS.md status for given IDs |
| `todo match-phase <N>` | `discuss-phase.md:325` | Returns todos with matching phase tag |
| `learnings copy` | `execute.md:1400` | Soft-fail: copies learnings into phase dir; \|\| echo fallback exists |

## Tasks

- [ ] T01 Implement `cmdPhasesList(args)` — `phases list [--type summaries|sprints|all] [--pick <jsonpath>] [--raw]`. Reads `.planning/phases/` directory listing. Returns `{directories: [...], summaries: [...], sprints: [...]}`. Honors `--pick` with simple bracket-index syntax (`directories[-1]`).
- [ ] T02 Implement `cmdFindPhase(args)` — `find-phase <N> [--raw]`. Resolves phase number (with or without leading zero) to directory path. Returns `{number, slug, dir, exists, decimal_children: [...]}`.
- [ ] T03 Implement `cmdAuditUat(args)` — `audit-uat [--raw]`. Walks `.planning/phases/*/UAT-*.md` files. Counts items by status (pending/skipped/blocked/human_needs/passed/failed). Returns `{counts: {...}, files: [{path, status_counts, items}]}`.
- [ ] T04 Implement `cmdUatRenderCheckpoint(args)` — `uat render-checkpoint --file <path> [--raw]`. Reads a UAT file, extracts pending/blocked items, renders a markdown checkpoint block.
- [ ] T05 Implement `cmdRequirementsMarkComplete(args)` — `requirements mark-complete <ID> [<ID>...]`. Edits `.planning/REQUIREMENTS.md` to flip status for matching IDs. Returns `{updated: [...], not_found: [...]}`.
- [ ] T06 Implement `cmdTodoMatchPhase(args)` — `todo match-phase <N>`. Reads `.planning/notes/todos/*.md`, filters by phase tag in frontmatter or body. Returns `{phase, matches: [...]}`.
- [ ] T07 Implement `cmdLearningsCopy(args)` — `learnings copy`. Soft-fail. Copies entries from `.planning/learnings.md` (if exists) into current phase dir. Returns `{copied: N}` or `{copied: 0, reason: "no source"}`.
- [ ] T08 Wire all 8 cases into the top-level switch dispatch with appropriate sub-arg handling.
- [ ] T09 Add help text entries for all 8 in the `--help` output.
- [ ] T10 Smoke-test each subcommand from CLI; verify JSON parses and matches the documented schema.
- [ ] T11 Re-run the called-vs-implemented diff: `comm -23 /tmp/called.txt /tmp/impl.txt` must be empty.
- [ ] T12 Update issue #481 with closure note pointing to the sprint commit.

## Acceptance

- [ ] All 8 subcommands callable from CLI without "Unknown subcommand" errors
- [ ] Each returns structured JSON (or markdown for `uat render-checkpoint`) per schema in Context table
- [ ] `comm -23 /tmp/called.txt /tmp/impl.txt` is empty
- [ ] No regression — existing subcommands still work (`phase-plan-index 9` still returns valid JSON)
- [ ] Single conventional commit referencing #481

## Dependencies

- None (independent of phases 6-14)
- Closes #481

## Notes

Where the callsite contract is unclear (e.g., `--pick` JSON-path syntax for `phases list`), implement the **simplest contract that makes the callsite work**. Don't speculate on flag combinations the workflow doesn't use today. Future flags can be added when their callsites land.
