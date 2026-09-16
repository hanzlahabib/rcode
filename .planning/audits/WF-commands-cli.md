# rcode Workflow Audit — commands-cli

**Lens:** COMMANDS surface — 117 commands, `/rcode-do` routing, discoverability
**Date:** 2026-09-16
**Branch:** wf-commands-cli

---

## Verdict

The commands surface is **leaky**: 117 commands gives power users real breadth, but the central router (`/rcode-do`) only routes to 56 of them, leaving 61 commands effectively invisible to any user who types intent in plain English. The tier-based help system (`/rcode-help`) is well-structured and covers all 117, but a user who doesn't know to run `/rcode-help advanced` will never discover most of the surface. At least two routing decisions in `do.md` send users to the *wrong* command for their stated intent, and a wave of alias-proliferation (12 redundant entry-points for 4 logical operations) inflates the count without adding user value.

---

## The user's actual experience

### Path A: New user, natural language

A user installs rcode and types a natural-language request to `/rcode-do`. The router reads `.rcode/workflows/do.md` (source: `rcode/commands/do.md:1`) and runs through five guard steps before reaching the routing table at `do.md:279-322`.

**What the user hits:**

1. "Fix the login bug" → matches `"A bug, error, crash, failure, or something broken"` → routes to `/rcode-debug`. ✓ Correct.

2. "Review my code" → the routing table has no direct "review source code" entry. The first matching rule is `"A review or quality concern about existing work"` at `do.md:315` → routes to `/rcode-verify-work`. ✗ **Wrong**: `verify-work` (`rcode/commands/verify-work.md:3`) runs *conversational UAT against acceptance criteria*, not a code review. The correct command is `/rcode-code-review` (`rcode/commands/code-review.md:3`), which is entirely absent from the routing table.

3. "Ship this" → matches `"Completing a milestone, shipping, releasing"` at `do.md:317` → routes to `/rcode-complete-milestone`. ✗ **Wrong**: `complete-milestone` (`rcode/commands/complete-milestone.md:3`) archives and resets a finished milestone. The user almost certainly means `/rcode-ship` (`rcode/commands/ship.md:3`), which creates a PR after a phase is verified. `/rcode-ship` does not appear anywhere in `do.md` (confirmed via `grep -n "rcode-ship" .rcode/workflows/do.md` — zero results).

4. "Write tests for phase 3" → matches `"Adding tests, write tests, test coverage"` at `do.md:316` → routes to `/rcode-add-tests`. ✓ Correct.

5. "Check progress" → matches `"Checking progress, status, where am I, board"` at `do.md:313` → routes to `/rcode-progress`. ✓ Correct, but `progress` is just an alias for `/rcode-status --verbose` (`rcode/commands/progress.md:3`). Both appear in the menu at `do.md:110-111`, so the user sees them as two commands when they're one.

### Path B: User types /rcode-help

The user runs `/rcode-help` and gets Tier 1: 8 commands (`rcode/commands/help.md` → `.rcode/workflows/help.md:52-100`). The minimal happy path shown is correct. But `/rcode-ship` does not appear in Tier 1 even though it closes the happy-path loop (`plan → execute → verify → ship`). The Tier 2 table (`help.md:104`) includes it, but only if the user knows to run `/rcode-help intermediate`.

### Path C: User faces the 117-command cliff

Once a user steps outside the 8 Tier-1 commands, they encounter the full surface with no progressive entry point. The `/rcode-do` "empty input" menu (`do.md:97-123`) shows 16 categories but skips 61 commands entirely (confirmed: `grep -oE "rcode-[a-z-]+" .rcode/workflows/do.md | sort -u` returns 50 unique command references; 61 of 117 commands appear nowhere in the routing logic). Commands like `/rcode-forensics`, `/rcode-correct-course`, `/rcode-inbox`, `/rcode-chain`, `/rcode-lazy`, and `/rcode-pr-branch` are completely invisible to the router.

---

## Leaks

**1.** 🔴 `/rcode-ship` is absent from the `/rcode-do` routing table.
- Evidence: `grep -n "rcode-ship" .rcode/workflows/do.md` → 0 results. The routing entry at `do.md:317` for "shipping" routes to `/rcode-complete-milestone` instead.
- User cost: A user who says "ship this" or "create a PR" is sent to an archival/reset command. They either get confused output or silently archive their milestone. The correct command (`/rcode-ship`) that pushes the branch and opens the PR is unreachable via natural language.

**2.** 🔴 "Review my code" routes to the wrong command.
- Evidence: `do.md:315` — `"A review or quality concern about existing work"` → `/rcode-verify-work`. But `verify-work` is UAT against acceptance criteria (`rcode/commands/verify-work.md:3`), not a code review. `/rcode-code-review` (`rcode/commands/code-review.md:3`: "Review source files for bugs, security issues, and code quality problems") and `/rcode-review` (`rcode/commands/review.md:3`: "Cross-AI peer review") are both absent from the routing table.
- User cost: User asks for a code review; receives a UAT session prompting them for acceptance criteria they may not have. They blame the tool, not the routing.

**3.** 🟡 61 of 117 commands (52%) are invisible to the `/rcode-do` router.
- Evidence: Running `for cmd in rcode/commands/*.md; do name=$(basename "$cmd" .md); grep -q "$name" .rcode/workflows/do.md || echo "UNROUTED: $name"; done` produces 61 UNROUTED entries. Includes: `audit-fix`, `code-review`, `correct-course`, `create-architecture`, `diagnose-issues`, `docs-update`, `execute-milestone`, `forensics`, `health`, `inbox`, `lazy`, `lens-audit`, `memory-audit/distill/init/update`, `pr-branch`, `rerun`, `retrospective`, `secure-phase`, `session-report`, `settings`, `stats`, `undo`, `validate-phase`, `workstream`, and more.
- User cost: Commands that solve real problems (forensics, correct-course, lazy, lens-audit) are only accessible if the user already knows the exact slash command name. The router — the feature that's supposed to surface the right command — can't surface 52% of the surface.

**4.** 🟡 12 redundant entry-points inflate the count without adding discoverability.
- Evidence: `capture.md:3` explicitly says it "replaces /rcode-add-todo, /rcode-note, /rcode-plant-seed, /rcode-check-todos". `phase.md:3` explicitly says it replaces "add-phase, insert-phase, remove-phase". `progress.md:3` is an alias for `status --verbose`. `config.md` aliases `settings.md` (`command-aliases.yaml:14`). `execute-sprint.md:3` is labeled "Internal". `research-phase.md:3` notes "plan already runs this automatically". That's 12 commands (9 superseded aliases + 1 internal + 1 auto-called + 1 duplicate) that appear in `/rcode-help` tables and inflate the 117 count without helping users. A new user hitting `/rcode-help advanced` sees `add-todo` AND `capture` with no clear winner.
- User cost: Cognitive load doubles on every alias pair. The user sees both `note` and `capture --note` and must infer they're the same, wasting time and losing confidence that the tool is coherent.

**5.** 🟡 `/rcode-do`'s empty-input menu (`do.md:97-123`) lists 16 items but is structurally disconnected from the routing table.
- Evidence: The menu is a hand-written list of `(/rcode-discuss)`, `(/rcode-council)`, `(/rcode-plan)`, etc. The routing table at `do.md:279-322` is a separate data structure. The two are not generated from the same source, so they can drift. The menu omits `/rcode-ship`, `/rcode-pr-branch`, `/rcode-health`, and others that DO appear in `/rcode-help`.
- User cost: The blank-input fallback — the menu a confused user reaches by typing `/rcode-do` — is not the canonical command list. A user could use this menu daily without ever discovering 100+ commands.

**6.** 🟢 The `execute` family has four overlapping commands with no clear decision rule for users.
- Evidence: `execute.md:3` runs SPRINT.md files. `execute-sprint.md:3` is "Internal — wrapper over rcode-execute". `execute-milestone.md:3` runs all phases. `autonomous.md:3` runs remaining phases with "minimal human intervention". A user who wants to "run phase 3" has to choose between `/rcode-execute`, `/rcode-execute-milestone`, and `/rcode-autonomous` with no routing help.
- User cost: Without a clear mental model for which to call, users run the wrong scope (a phase when they meant a sprint, or autonomous when they wanted one controlled wave).

**7.** 🟢 `review.md` and `code-review.md` have irreconcilably different semantics but nearly identical names.
- Evidence: `review.md:3` = "Cross-AI peer review — invoke external AI CLIs to independently review phase *plans*". `code-review.md:3` = "Review source *files* for bugs, security issues, and code quality problems". One reviews plans via external CLIs; the other reviews source files. The names are `rcode-review` vs `rcode-code-review`. The `do.md` routing table routes "code review" to `/rcode-audit` (`do.md:319`), bypassing both. None of the three are reliably reachable from "review my code."
- User cost: A user running `/rcode-review` to review source code gets a request to invoke an external AI CLI (Gemini, GPT, etc.) against their plans — a completely unexpected experience.

---

## Strengthenings

**1. Add `/rcode-ship` and `/rcode-code-review` to the `do.md` routing table** [S]
- Files: `.rcode/workflows/do.md` lines 279-322 (routing table)
- What: Add routing rows: "push branch, create PR, ship phase, open pull request" → `/rcode-ship`; "review source code, code quality, bugs in code, check my code" → `/rcode-code-review`; remove the current "A review or quality concern about existing work" → `/rcode-verify-work` misrouting.
- Why it helps: These are core workflow actions users invoke daily in natural language. Two routing bugs that send users to the wrong command are trust-destroyers. Fixing them costs 5 lines.

**2. Add 10 high-value unrouted commands to the routing table** [S]
- Files: `.rcode/workflows/do.md`, specifically the routing table
- What: Add entries for at minimum: `lens-audit` ("run a lens audit, security lens, 15-lens"), `forensics` ("diagnose stuck state, execution incomplete, what broke"), `correct-course` ("I've drifted, scope drift, wrong architecture"), `health` ("is rcode installed correctly, health check"), `settings`/`config` ("configure rcode, change model, edit config"), `pr-branch` ("clean PR branch, strip planning artifacts"), `retrospective` ("retrospective, what went wrong, session review").
- Why it helps: These 7 commands solve frequent real problems. Every one that's unreachable via `/rcode-do` is a command the user hand-rolls manually instead.

**3. Remove superseded aliases from the user-visible surface** [M]
- Files: `rcode/commands/add-todo.md`, `note.md`, `plant-seed.md`, `check-todos.md`, `add-phase.md`, `insert-phase.md`, `remove-phase.md`, `progress.md`; `rcode/skills/actions/**`; `.rcode/workflows/help.md`
- What: Mark the 8 superseded aliases as `internal: true` in their command frontmatter so they don't appear in `/rcode-help` tables. Keep them working for muscle-memory users. Update `/rcode-help` tier 2 to show only `capture`, `phase`, and `status`.
- Why it helps: Reduces the user-visible count from 117 to ~105 without removing any capability. Eliminates the "which one do I use?" confusion on every alias pair. The help tables become scannable instead of bloated.

**4. Rename or merge `review.md` to `plan-review.md` and surface `code-review.md` as `review.md`** [M]
- Files: `rcode/commands/review.md`, `rcode/commands/code-review.md`, `rcode/command-aliases.yaml`, `do.md` routing table
- What: The command the user conceptually means by "review" is source-code review, not cross-AI plan review. The current `review.md` covers an advanced niche (external AI CLI invocation for plan review). Swap the names: rename the current `review.md` to `plan-review.md` (or fold it into `/rcode-review --plans`), promote `code-review.md` to `review.md`.
- Why it helps: Eliminates the most confusing name collision in the surface. "I'll run `/rcode-review`" should do what it says.

**5. Add `/rcode-ship` to the Tier 1 happy path in help.md** [S]
- Files: `.rcode/workflows/help.md`, specifically the `<tier-1>` block and the "Minimal happy path" section
- What: The current happy path shown to all new users is `init → new-project → plan → execute → next → status`. It is missing the terminal step. Add `→ verify-phase → ship` to the happy path and add `/rcode-ship` to the Tier 1 command table.
- Why it helps: A new user following Tier 1 has no idea what to do after `/rcode-execute` succeeds. They've built something and have no rcode-sanctioned way to ship it. This is the single biggest gap in the Tier 1 onboarding experience.

**6. Generate the `/rcode-do` empty-input menu from the routing table, not as a separate hand-written list** [L]
- Files: `.rcode/workflows/do.md` (both the menu step at lines 97-123 and the routing table at lines 279-322); optionally `rcode/bin/rcode-tools.cjs`
- What: The empty-input menu and routing table are currently two separate data structures that can drift. Consolidate: derive the menu from the routing table, or at minimum add a comment pairing each menu item to its routing table entry.
- Why it helps: Prevents the menu from silently diverging from actual routing. Currently the menu shows 16 categories but the router has 35+ routing rules — the gap is already visible.

---

## Kill your darlings

**Kill: `rcode/commands/execute-sprint.md`** — labeled "Internal" in its own description (`rcode/commands/execute-sprint.md:3`). It is a thin wrapper over `/rcode-execute` that is spawned by the orchestrator, not by users. It appears in the Tier 3 help table (`help.md`) with the note "Internal". Having it as a user-facing `/rcode-execute-sprint` command is noise — it should be moved to an internal workflow include, not a slash command.

**Kill: `rcode/commands/new-project-research.md` and `new-project-roadmap.md`** — both are described as "subcommands for new-project" (`new-project-research.md:3`, `new-project-roadmap.md:3`). They exist as escape hatches for users who want to run sub-steps of `/rcode-new-project` independently, but they add 2 commands to the surface for an edge case almost no user will hit. Neither appears in the `/rcode-do` routing table or the Tier 1-2 help tables.

**Kill (or consolidate): `rcode/commands/scan.md` and `rcode/commands/map-codebase.md`** — "Rapid codebase assessment — lightweight alternative to map-codebase" (`scan.md:3`) vs "Analyze an existing codebase and produce structured documents" (`map-codebase.md:3`). The correct mental model is `scan` = fast/no-artifacts, `map-codebase` = thorough/writes docs. This is a valid distinction, but both land in `/rcode-do`'s routing table separately (scan: line 291 via "Mapping or analyzing", map-codebase: implicit). A `--deep` flag on one command would serve users better than two commands with non-obvious scope differences.

**Kill: 4 audit sub-commands as direct slash commands** — `rcode/commands/audit-fix.md`, `audit-milestone.md`, `audit-uat.md` are individually invocable but they're exposed sub-routes of `/rcode-audit`. None of them appear in the `/rcode-do` routing table. A user who knows about `/rcode-audit` will use it; a user who doesn't will never find `audit-uat` directly. These should be arguments to `/rcode-audit` only (which they already are), not standalone slash commands cluttering the surface.

**Kill: `rcode/commands/notify-test.md`** — description is not present in the file's visible content; it's a test/dev utility that leaked into the user-facing command surface. No user will ever type `/rcode-notify-test` for productive work.
