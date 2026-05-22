<purpose>
Display the rcode command reference at the requested tier. Output ONLY the tier section. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

## Step 0 — Parse arguments

Read `$ARGUMENTS` and resolve to one of: `basic`, `intermediate`, `advanced`, `all`.

| Input | Tier shown |
|-------|------------|
| (empty) or `basic` or `1` | **TIER 1 — Basic** |
| `intermediate` or `int` or `2` | **TIER 2 — Intermediate** |
| `advanced` or `adv` or `3` | **TIER 3 — Advanced** |
| `all` or `full` | **All three tiers in sequence** |
| `--help` or `-h` | Show usage block, then exit |

Usage block:

```
Usage: /rcode-help [basic|intermediate|advanced|all]

  basic         Show the 8 essentials (default)
  intermediate  Show real-project ops (council, review, ship, capture)
  advanced      Show power tools (audits, workspaces, council variants, etc.)
  all           Show everything
```

## Step 1 — Render the requested tier

Output the matching `<tier-N>` block below verbatim. For `all`, output all three blocks separated by `---`.

---

<tier-1>
# rcode — Tier 1 (Basic)

> **rcode** is council-driven project automation built for solo agentic work in Claude Code.
> Tier 1 is everything you need to ship a small project end-to-end. **8 commands.**

## Not installed yet?

```bash
npx @hanzlaa/rcode install    # install into current project
```

Run this once from your project root. Then open a new Claude Code session and use the commands below.
Need help? See `docs/getting-started.md` or run `/rcode-help` after install.

## The loop

```
init → new-project → plan → execute → next → status → ship
```

## Commands

| Command | What it does |
|---------|--------------|
| `/rcode-init` | First-time setup in this repo. Detects state, asks config questions, writes `.rcode/RIHLA.md`. Run once per project. |
| `/rcode-new-project` | Take an idea to a planned roadmap. Questioning → optional research → REQUIREMENTS → ROADMAP. |
| `/rcode-plan <phase>` | Create executable plans for a phase. Produces `SPRINT.md` files. |
| `/rcode-execute <phase>` | Run all plans in a phase in dependency waves. Updates STATE on completion. |
| `/rcode-next` | Auto-route to the next logical step based on project state. Zero friction. |
| `/rcode-status` | Where am I — current phase, plan progress, recent decisions, blockers. |
| `/rcode-progress` | Visual progress + intelligent suggestion for next action. |
| `/rcode-help [tier]` | This reference. Add `intermediate`, `advanced`, or `all` for more. |

## Minimal happy path

```
/rcode-init
/rcode-new-project
/rcode-plan 1
/rcode-execute 1
/rcode-next
```

## Files rcode creates

```
.planning/
├── PROJECT.md            # vision
├── REQUIREMENTS.md       # scoped requirements
├── ROADMAP.md            # phase breakdown
├── STATE.md              # project memory
└── phases/
    └── 01-foundation/
        ├── 01-1-SPRINT.md   # the plan
        └── 01-01-SUMMARY.md  # what got done
```

**Done with Tier 1?** → `/rcode-help intermediate` for council, review, ship, and capture.
</tier-1>

---

<tier-2>
# rcode — Tier 2 (Intermediate)

> Real-project ops: strategic input, quality gates, capture, and session continuity.
> Assumes you know Tier 1. **~18 commands.**

## Strategy & input

| Command | When to use |
|---------|-------------|
| `/rcode-council <question>` | Strategic decision needing multiple perspectives — 3-5 agents debate in parallel, 2 rounds with cross-talk. |
| `/rcode-discuss <agent> <q>` | Quick single-agent sync — fast, conversational, no artifact. |
| `/rcode-discuss-phase <n>` | Gather context through adaptive questioning before planning. Produces CONTEXT.md. |
| `/rcode-explore <topic>` | Socratic ideation — think through ideas before committing to plans. |
| `/rcode-do <description>` | Smart router — natural language in, picks the right `/rcode-*` command. |

## Quality & shipping

| Command | When to use |
|---------|-------------|
| `/rcode-review` | Adversarial code review of changed files — bugs, security, style. |
| `/rcode-review-fix` | Auto-apply fixes from a code-review report. |
| `/rcode-verify-phase <n>` | Goal-backward audit — does the codebase deliver what the phase promised? |
| `/rcode-verify-work` | Conversational UAT against acceptance criteria. |
| `/rcode-ship [phase] [--draft]` | Push feature branch + open PR with auto-generated body (goal, changes, requirements, verification status). Use AFTER `/rcode-verify-phase` passes. **Not for npm publish or tagging releases.** |

## Phase & plan management

| Command | When to use |
|---------|-------------|
| `/rcode-show <id>` | Print a phase or plan in full with execution status. |
| `/rcode-phase <name> [--insert \| --remove]` | **Unified phase CRUD.** Default: append next integer phase. `--insert <parent>` slots a decimal phase. `--remove <id>` deletes an unstarted future phase. |
| `/rcode-add-phase <name>` | Alias for `/rcode-phase <name>`. |
| `/rcode-insert-phase <after> <name>` | Alias for `/rcode-phase --insert <after> <name>`. |
| `/rcode-remove-phase <n>` | Alias for `/rcode-phase --remove <n>`. |
| `/rcode-quick [flags]` | Small ad-hoc tasks with rcode guarantees but skip optional agents. Flags: `--discuss`, `--research`, `--full`. |
| `/rcode-fast "<task>"` | Trivial inline task — typo, gitignore tweak, etc. No subagents, ≤3 file edits. *Not yet implemented (#482-B).* |

## Capture & session continuity

| Command | When to use |
|---------|-------------|
| `/rcode-capture "<text>" [--note \| --seed \| --list]` | **Unified capture.** Default: todo. `--note` for passive observation. `--seed` for forward-looking idea with trigger conditions. `--list` to show pending todos. |
| `/rcode-add-todo [desc]` | Alias for `/rcode-capture` (default mode). |
| `/rcode-note "<text>"` | Alias for `/rcode-capture --note`. |
| `/rcode-plant-seed "<idea>"` | Alias for `/rcode-capture --seed`. |
| `/rcode-check-todos [area]` | Alias for `/rcode-capture --list`. |
| `/rcode-resume-work` | Restore project context after a break. |
| `/rcode-pause-work` | Create HANDOFF.json and continue-here.md before stopping mid-phase. |
| `/rcode-session-report` | Work summary, decisions, open blockers from this session. |

**Done with Tier 2?** → `/rcode-help advanced` for audits, workspaces, milestone ops, and power variants.
</tier-2>

---

<tier-3>
# rcode — Tier 3 (Advanced)

> Power tools: milestone ops, parallel workspaces, audits, council variants, and rare ops.
> Assumes Tier 1 + 2. Use these when you know exactly what you need.

## Milestone lifecycle

| Command | Use |
|---------|-----|
| `/rcode-new-milestone` | Start the next milestone — initializes ROADMAP, REQUIREMENTS, STATE. |
| `/rcode-complete-milestone <ver>` | Archive milestone → move to `.planning/milestones/`. |
| `/rcode-milestone-summary` | Human-readable summary of all phases, decisions, outcomes. |
| `/rcode-audit-milestone` | Cross-phase audit — verify completion against original goals. |
| `/rcode-plan-milestone-gaps` | Create phases to close gaps from the audit. |
| `/rcode-cleanup` | Archive accumulated phase dirs from completed milestones. |

## Workspaces & parallel work

| Command | Use |
|---------|-----|
| `/rcode-new-workspace` | Isolated workspace with separate ROADMAP/STATE for parallel work. |
| `/rcode-list-workspaces` | List all active workspaces. |
| `/rcode-remove-workspace` | Delete a workspace and clean up artifacts. |
| `/rcode-workstream` | Manage parallel workstreams (milestone tracks). |

## Audits & specialty review

| Command | Use |
|---------|-----|
| `/rcode-secure-phase <n>` | Retroactively verify threat mitigations exist in code. |
| `/rcode-validate-phase <n>` | Audit Nyquist validation gaps for a completed phase. |
| `/rcode-add-tests <n>` | Generate unit + E2E tests based on SPRINT/SUMMARY/CONTEXT. |
| `/rcode-audit-uat` | Cross-phase audit of all outstanding UAT items. |
| `/rcode-audit-fix` | Autonomous audit-to-fix pipeline — find, classify, fix, test, commit. |
| `/rcode-review --karpathy` | Audit recent code against Karpathy's 4 LLM coding principles. |
| `/rcode-karpathy-audit` | Full Karpathy engineering principles audit across the codebase. |
| `/rcode-check-implementation-readiness` | Verify a feature is fully ready to implement before writing code. |
| `/rcode-review-edge-case-hunter` | Hunt for edge cases and boundary conditions before execution. |
| `/rcode-diagnose-issues` | Triage and diagnose systemic issues before a debug session. |
| `/rcode-ui-phase <n>` | Generate UI design contract (UI-SPEC.md) for frontend phases. |
| `/rcode-ui-review` | Retroactive 6-pillar visual audit of completed UI work. |
| `/rcode-review --attack` | Hostile-perspective report — vulnerabilities, race conditions, abuse. |
| `/rcode-review --edge-cases` | Enumerate edge cases by category and severity. |
| `/rcode-review` | Cross-AI peer review — invoke external AI CLIs to review plans. |

## Council variants & strategy power tools

| Command | Use |
|---------|-----|
| `/rcode-discuss-phase --power` | Bulk question generation with async UI for context-heavy phases. |
| `/rcode-discuss-phase-power` | Standalone deep-dive phase discussion with full research + assumptions. |
| `/rcode-chain <preset> <topic>` | Sequential agent pipeline (research → scope → build), typed artifacts. |
| `/rcode-brainstorm` | Guided brainstorming — pick a method, generate ideas systematically. |
| `/rcode-why <decision>` | Explain reasoning behind a decision, classification, or panel pick. |

## Document, scaffold, integrate

| Command | Use |
|---------|-----|
| `/rcode-map-codebase` | Brownfield: parallel Explore agents → 7 codebase docs. |
| `/rcode-scan` | Rapid codebase assessment — lighter than map-codebase. |
| `/rcode-document-project` | Audit missing/stale docs, file SPRINT tasks for each gap. |
| `/rcode-docs-update` | Generate or update docs verified against codebase. |
| `/rcode-install <module>` | Install a rcode capability bundle into the project. |
| `/rcode-enable-hooks` | Install optional rcode hooks into `.claude/settings.json`. |
| `/rcode-scaffold-project` | Scaffold a new project from the official rcode template. |
| `/rcode-bootstrap` | Bootstrap repo with Vercel-linked resources and integrations. *Not yet implemented (#481).* |

## Story-level epics workflow

| Command | Use |
|---------|-----|
| `/rcode-create-prd` | Create a PRD from scratch through guided facilitation. |
| `/rcode-edit-prd` | Update an existing PRD with revisions or clarifications. |
| `/rcode-validate-prd` | Validate an existing PRD for completeness and consistency. |
| `/rcode-create-epics-and-stories` | Parse a PRD into numbered epic + story files. |
| `/rcode-create-story` | Prepare a dev-ready STORY.md with full implementation context. |
| `/rcode-dev-story <file>` | Execute an approved STORY by writing tests + code per AC. |
| (internal) `check-implementation-readiness` | Guard called by `/rcode-plan` and `/rcode-execute` to verify PRD + architecture aligned before build. |
| `/rcode-create-architecture` | Write an Architecture Decision Record (ADR). |
| `/rcode-correct-course` | Course-correct mid-sprint when major change is discovered. |
| `/rcode-sprint-planning` | Compute capacity, prioritize stories, create SPRINT.md. |
| `/rcode-sprint-status` | Sprint progress — stories, points, velocity, burndown. |
| `/rcode-list-plans` | Table of every SPRINT.md across phases — goal, stories, points, state. |
| `/rcode-decisions` | Browse decisions across every rcode project (~/.rcode/decisions.jsonl). |
| `/rcode-replay <slug>` | Re-run a past council session with the same question — fresh panel round. |
| `/rcode-export-to-github` | Push phases/stories/decisions to GitHub issues (wraps `rcode github-sync`). |
| `/rcode-notify-test` | Verify Slack/Discord/MS Teams webhook wiring — posts a test message. |
| `/rcode-from-template <type>` | Seed .planning/ from a starter template (saas-b2b, api-backend, mobile-app). |
| `/rcode-retrospective` | Run an epic retrospective and produce owned action items. |
| `/rcode-new-project-research` | Research subcommand — deep research before new project roadmap creation. |
| `/rcode-new-project-roadmap` | Roadmap subcommand — generate phase roadmap from new project research. |

## Memory

| Command | Use |
|---------|-----|
| `/rcode-memory-init` | Initialize the memory bank for a project (first-time setup). |
| `/rcode-memory-update` | Update a specific memory entry with new information. |
| `/rcode-memory-audit` | Audit all memory files for staleness and coverage gaps. |
| `/rcode-memory-distill` | Distill verbose memory into concise, LLM-friendly summaries. |

## Operational / rare

| Command | Use |
|---------|-----|
| `/rcode-debug "<issue>"` | Systematic debugging with persistent state across `/clear`. |
| `/rcode-forensics` | Diagnose incomplete executions — timeline of what broke. |
| `/rcode-undo <id>` | Safe git revert for a phase or plan with dependency checks. |
| `/rcode-rerun <id>` | Re-execute a phase or plan, resetting state, fresh commits. |
| `/rcode-diff <a> <b>` | Show changes to plans and state between commits. |
| `/rcode-import <path>` | Ingest external plans with conflict detection against decisions. |
| `/rcode-inbox` | Triage incoming issues and PRs against contribution templates. |
| `/rcode-pr-branch` | Create clean PR branch — filter out `.planning/` commits. |
| `/rcode-autonomous` | Run remaining phases autonomously — plan → execute → verify cycles. |
| `/rcode-research-phase <n>` | Standalone research (usually use `/rcode-plan` instead). |
| `/rcode-analyze-dependencies` | Suggest "Depends on" entries for ROADMAP.md. |
| `/rcode-profile-user` | Classify developer on 4 dimensions, produce profile artifact. |
| `/rcode-dashboard` | Start the Diwan view-only dashboard (port 7717). |
| `/rcode-health` | 6-point health check of the rcode installation. |
| `/rcode-stats` | Phases, plans, decisions, council sessions, timeline. |
| `/rcode-settings` | Interactive config wizard — model profile, gates, branching. |
| `/rcode-config` | View or edit rcode configuration directly. |
| `/rcode-update` | Update rcode to latest version with changelog preview. |
| `/rcode-note` | (also Tier 2) Inline note capture. |

## Common compound flows

**New project (full quality):**
```
/rcode-new-project → /clear → /rcode-plan 1 → /clear → /rcode-execute 1 → /rcode-verify-phase 1 → /rcode-ship
```

**Mid-milestone urgent work:**
```
/rcode-insert-phase 5 "Critical security fix" → /rcode-plan 5.1 → /rcode-execute 5.1
```

**Resume after break:**
```
/rcode-resume-work   # or just /rcode-next
```

**Debug across context resets:**
```
/rcode-debug "form submission fails" → ...investigation... → /clear → /rcode-debug   # resumes
```

**Complete + start next milestone:**
```
/rcode-audit-milestone → /rcode-plan-milestone-gaps → /rcode-complete-milestone 1.0.0 → /rcode-new-milestone
```

## Configuration reference

`.rcode/config.yaml` (read via `node rcode-tools.cjs config-get <key>` or `readConfig()`):

```yaml
mode: interactive            # or yolo
commit_docs: true            # false = .planning/ kept local
search_gitignored: false     # true = ripgrep with --no-ignore
```

## Where to find context

- `.planning/PROJECT.md` — vision
- `.planning/STATE.md` — current memory
- `.planning/ROADMAP.md` — phase status
- `.planning/RETROSPECTIVE.md` — living retrospective
- `.planning/codebase/` — brownfield maps (STACK, ARCHITECTURE, etc.)

**End of reference.**
</tier-3>

## Success Criteria

- [ ] Correct tier section is rendered based on `$ARGUMENTS`
- [ ] No extra analysis, commentary, or project state added
- [ ] "Next tier" pointer present at end of Tier 1 and Tier 2
- [ ] `all` renders all three tiers separated by `---`
- [ ] Unknown args fall back to Tier 1 silently (do not error)

## On Error

- If unable to load or render reference: display fallback `See rcode/workflows/help.md for full reference`
- Handle missing sections gracefully without breaking output
