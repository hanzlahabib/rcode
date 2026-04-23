# CHANGELOG

All notable changes to Rihal Code are documented here.

---

## v2.0.0 — Rihal Brain (unreleased)

**Repositioning release.** Rihal Code is no longer a generic AI-engineering methodology that happens to be written at Rihal. It is **the installable context-brain for Rihalians** — every Rihal project can now pull PR standards, commit conventions, architecture docs, and internal guides straight from Rihal's own repos into the AI assistant's context on install.

The v1 methodology, agents, and skills all remain. v2 adds the brain layer on top and reorganizes contribution around role-owners.

Tracked in GitHub [milestone #4](https://github.com/hanzlahabib/rihal-code/milestone/4).

### Added

- **`docs/what-is-rihal-code.md`** — product story for the v2 repositioning.
- **`docs/ROADMAP.md`** — public roadmap through v3.0 (MCP server) with binary kill criteria.
- **`rihal/brain/`** — new content tree with `sources.yaml` (placeholder URLs until M5) and pull destinations for `rihal-github/`, `rihal-docs/`, and `best-practices/`.
- **`rihal-tools brain pull`** — CLI subcommand that fetches configured sources via `git` sparse-checkout. Mirrors the `state sync --from-disk` pattern shipped in v1.0.0-beta.0 / issue #126.
- **Install hook** runs `brain pull` automatically (graceful no-op when sources are placeholders).
- **`.github/CODEOWNERS`** — per-role ownership enforcement so PM / CTO / UX / QA etc. changes route to the right reviewers.
- **`CONTRIBUTING.md` — per-role guide** — one paragraph, one command sequence, one PR per role.
- **`.github/workflows/release.yml`** — semver release pipeline: compliance check → bundle → GitHub release artefact.
- **`docs/adr/mcp-design.md`** — design doc stub for the v3.0 MCP server (tracks open questions, not yet implemented).

### Changed

- **README.md** — new top section leads with the brain-in-a-box framing. Tier structure and methodology docs unchanged beneath it.
- **`/rihal:update`** — now also runs `brain pull`, supports version pinning (`/rihal:update v1.3.0`).

### Documentation

- Public roadmap surfaces M2.5 (progress/status UX overhaul matching GSD-parity), M3 (role ownership), M4 (release pipeline), M5 (real Rihal content URLs), M6 (MCP).

### Deferred to follow-up releases

- **Full skill-folder reorganization under role owners** — CODEOWNERS ships in v2.0 covering the current folder layout; deeper reorg is a v2.1 scope.
- **Elegant /progress and /status rebuild** (GSD-parity) — tracked as issue #159, landing in v2.5.
- **Live MCP server** — v3.0 (design doc only in v2.0).

---

## v1.0.0-beta.0 (2026-04-15)

First beta release. v1 and v2 methodologies unified into a single landscape.

### Breaking

- **`rihal/v2/` directory removed.** All contents promoted to `rihal/` root. Any external scripts referencing `rihal/v2/...` paths must update to `rihal/...`.
- **`cli/install-v2.js` renamed to `cli/install.js`.** Old script path invalid.
- **`npx rihal-code install` is now the single entry point.** Routes through the unified installer (was previously routing to v1's `cli/init.js`).
- **Multi-IDE support reduced to Claude / Cursor / Gemini.** Dropped Windsurf, Antigravity, Codex direct install paths (AGENTS.md still applies).

### Added

- **Unified installer** — installs v2 agents/commands/workflows AND v1 phrase-activated skills in one command. 93 slash commands + 44 agents + 58 skills.
- **`/rihal:dashboard`** slash command — launches Diwan view-only dashboard from inside Claude Code.
- **`rihal-scaffold-project`** skill — bootstraps a new Rihalian project from `github.com/rihal-om/template`. Fresh clone, no cache, safety checks on non-empty dirs.
- **Tier-based docs** — `docs/TIERS.md`, `docs/STANDARDS.md`. Skills organized into Starter / Advanced / Ultra Advanced / Standards.
- **`npx rihal-code tiers`** CLI command — prints the tier map.
- **Golden Path** — 7-step Starter tier (scaffold → PRD → story → sprint → dev → review → status) for first-time users.
- **`.planning/PROJECT.md` + `ROADMAP.md` + `STATE.md`** — dogfooded tracking artifacts for rihal-code itself.

### Changed

- **Install output** now reports `Skills: N phrase-activated` in addition to files/commands/agents.
- **`README.md`** — "Start Here" tier navigation block at the top. Install section collapsed to one command.
- **CLI help** — commands grouped into PROJECT / TEAM / META (was flat list of 17).
- **Postinstall** — shows 7-step Golden Path instead of generic command list.
- **`rihal/team.yaml`** — v2 schema (agents + utility_agents + routing). v1 schema removed.

### Removed

- `rihal/agents/*.agent.md` — 14 v1 persona agents (superseded by v2's 36).
- `rihal/workflows/` (v1 — 13 files). Replaced by v2's 68 workflows.
- `rihal/v2/` directory entirely (contents promoted).
- All `BMAD` / `GSD` references from commit history (rewritten in 95 commits).

### Fixed

- `.rihal/state.json` was previously committed with the literal string `bad json`. Now gitignored and regenerated on install.
- `rihal/v2/` hardcoded paths in 3 test files, CLI, references, workflows — all updated.

### Internal

- Backup tag `backup/pre-v1v2-merge` kept locally (not pushed) for rollback.
- `pnpm test`: 95/95 passing after merge.
- Dashboard server boots cleanly (view-only, pure Node stdlib).

---

## v2-prototype (pre-merge, archived)

v2-prototype is the current active branch. Stable releases will be tagged on main.

### Added

#### Core Features
- **69 slash commands** across 3 modes (council, chain, discuss) and 3 modules (core, execution, discovery)
- **35+ agents** with clear roles, cultural identity (Arabic names), and hard scope boundaries
- **Numeric ID system** — milestones (M1, M2), phases (01, 02, 02.1), plans (01.01, 02.03), tasks (01.01.01)
  - Decimal phase insertion (02.1) for urgent mid-cycle work
  - Hierarchical IDs used throughout for cross-referencing
- **Multi-agent modes:**
  - `/rihal:council` — parallel debate (Round 1 + Round 2)
  - `/rihal:chain` — sequential pipeline with typed outputs per stage
  - `/rihal:discuss` — single expert, conversational tone

#### Planning & Execution
- `/rihal:plan` with **plan-verification loop** — rihal-plan-checker validates file/symbol references; loops back on failure
- `/rihal:chain` with preset pipelines: research-plan, feasibility, gtm-to-build, full-discovery
- `/rihal:execute` with **post-execute gates:**
  - rihal-integration-checker (cross-phase E2E verification)
  - rihal-nyquist-auditor (test coverage audit)
  - Both append findings to SUMMARY.md
- `/rihal:quick` — trivial task execution without ceremony
- `/rihal:autonomous` — run all remaining phases with token/phase budget

#### Intent Guards & Safety
- **Step 0.5** on every workflow — detects mismatched intent and redirects with copy-paste fix
- No more confusing output; wrong command → single-line redirect
- Examples: "That's a decision question, not a planning input. Copy-paste this instead: /rihal:council ..."

#### Multilingual Support
- **Multilingual classifier** — recognizes Roman Urdu, Arabic, English
- Auto-routes to Mariam for GCC/MENA questions
- Keywords: `dubai`, `affiliate`, `bnanai`, `karobar`, `site banana`, `دبئی`, `مارکیٹ`, `کاروبار`, and 20+ more
- Example: `/rihal:council yar affiliate site bnanai hai dubai ma` → picks [mariam, hussain-pm, sadiq]

#### Code Quality
- **Karpathy coding guidelines** enforcement — 4 principles wired into every code-writing agent:
  1. Think before coding (surface assumptions)
  2. Simplicity first (no speculative abstractions)
  3. Surgical changes (touch only what's needed)
  4. Goal-driven execution (define verifiable success criteria)
- `/rihal:karpathy-audit HEAD~5..HEAD` — audit recent changes vs. guidelines
- Karpathy-guidelines.md in references/ loaded by all executor/planner agents

#### State Management & Recovery
- `.rihal/state.json` — comprehensive project state tracking
  - Phases, executions, decisions, blockers
  - Council sessions and chain runs
  - Workstreams and milestones
- `/rihal:status` — formatted state viewer
- `/rihal:pause-work` → creates `.rihal/HANDOFF.json` + `.planning/.continue-here.md`
- `/rihal:resume-work` → re-surfaces blocking constraints + last context
- `/rihal:health --fix` → recovers from corrupted state

#### Observability & Debugging
- `/rihal:show <id>` — display artifact by numeric ID
- `/rihal:why <topic>` — explain why agent was picked (panel scoring breakdown)
- `/rihal:rerun <id>` — re-execute previous command/session
- `/rihal:diff <id1> <id2>` — compare phases/plans/artifacts
- `/rihal:report <phase>` — generate phase report (decisions, blockers, time)
- `/rihal:session-report` — comprehensive session summary

#### Hooks System (opt-in)
- `/rihal:enable-hooks` — installs 3 opt-in hooks into `.claude/settings.json`
- **pre-edit** — enforces read-before-edit
- **pre-workflow** — soft intent warnings on mismatched commands
- **post-commit** — validates commit format, blocks AI attribution

#### Multi-IDE Support
- Installer supports: Claude Code, Cursor, Gemini CLI
- `--ide=claude` (default), `--ide=cursor`, `--ide=gemini`
- Same commands across all IDEs

#### Phase Management
- `/rihal:insert-phase 02 "urgent fix"` — creates 02.1 between 02 and 03
- `/rihal:new-milestone` — start new milestone cycle
- `/rihal:complete-milestone` — mark milestone complete + generate summary
- `/rihal:audit-milestone` — verify milestone completeness

#### Workspace Isolation
- `/rihal:new-workspace "experimental-auth"` — create isolated parallel track
- `/rihal:list-workspaces` — list all workspaces and active one
- `/rihal:remove-workspace` — delete a workspace
- Useful for A/B testing, parallel R&D, feature branches

#### Miscellaneous Commands
- `/rihal:diff` — compare phases/plans/artifacts
- `/rihal:config` — view/edit config directly
- `/rihal:init` — initialize project with Arabic greeting + setup
- `/rihal:do` — interactive router (guides you to next action)
- `/rihal:health` — diagnose state/artifacts/locks
- `/rihal:forensics` — post-mortem analysis
- `/rihal:next` — advance to next phase
- `/rihal:correct-course` — recover from failed phase
- `/rihal:undo` — safely revert last phase
- `/rihal:note` — zero-friction idea capture
- `/rihal:add-todo` — add task to backlog
- `/rihal:inbox` — review + process captured notes/todos

#### Documentation & References
- 35+ reference documents in `rihal/references/`
- council-protocol.md — 5-step majlis + deterministic panel scoring
- karpathy-guidelines.md — 4 coding principles + validation framework
- state-schema.md — complete state.json documentation
- execution-protocol.md — task execution contract
- gate-prompts.md — post-execute gate implementations
- verification-patterns.md — quality verification patterns
- And 25+ more (checklists, domain probes, response styles, etc.)

#### Global Agent Customization
- `~/.rihal/agents/rihal-<name>.md` — define custom agents globally
- Agents appear in every project without forking
- Supported in v2.1+ roadmap

#### Token & Cost Tracking
- Token cost footer on heavy workflows
- `/rihal:stats` — displays token usage by model
- Model profiles: quality, balanced, budget, inherit

#### Configuration
- `.rihal/config.yaml` with 10+ settings:
  - user_name, project_name, communication_language
  - mode (guided/yolo), model_profile
  - workflow toggles (plan_checker, post_execute_gates)
  - git branching_strategy
- `/rihal:settings` — interactive configuration editor

#### Testing & Validation
- 95+ compliance tests verify:
  - Every command has matching workflow file
  - Every agent has valid frontmatter + constraints
  - Module manifests match installed files
  - CLI help matches implemented subcommands
  - Panel scorer routes correctly (10+ question types)
  - Classifier handles Roman Urdu, Arabic, English + edge cases
- `node --test test/*.cjs test/lib/*.cjs` to run full suite

---

### Fixed

#### Plan Verification
- Plan-checker now verifies file existence and symbol definitions before execution
- References that don't exist trigger feedback loop (max 2 retries)
- Pre-execute gate prevents running broken plans

#### State Integrity
- Stale lock files no longer block all state writes
- State initialization recovers from corrupted state.json
- Orphaned execution records cleaned up on health check

#### Agent Consistency
- Council/chain agent lists derived from installed_agents.yaml (not hardcoded)
- Panel falls back to 3-agent minimum if fewer agents score non-zero
- Deterministic scoring ensures reproducibility

#### Workflow Issues
- All 69 commands now have consistent Step 0 (success criteria) + Step 0.5 (intent guard) + On Error
- Workflows load shared references correctly (@included in every workflow)
- Cross-project file leaks fixed via CLI subcommand isolation

#### Bug Fixes
- 13 missing subagent files created (rihal-executor, rihal-planner, rihal-verifier, etc.)
- 25 orphaned commands wired into module YAMLs
- Pre-workflow intent gates now respect multiline input
- `/rihal:init` no longer drops global saves in TTY
- Backspace in TTY-based prompts preserves prompt text
- Multi-IDE installer no longer conflicts with existing .claude/ structure
- Workstream flag conflicts resolved
- Git planning commit format validated post-commit
- ~80+ other bug fixes from stress testing + E2E audit

---

### Removed

#### Deprecated
- `/rihal:generate-project-context` (replaced by `/rihal:init`)
- Hardcoded agent lists (now derived from installed_agents.yaml)
- Old cross-system path references and branding leaks

#### Safety Improvements
- Unauthorized git operations blocked (no auto-push)
- Worktree isolation removed (safety concern)

---

### Changed

#### API/Behavior
- Panel scorer now deterministic (deterministic keyword matching, not LLM)
- Council Round 2 now includes agent names in responses (better cross-talk)
- Plan-checker loops back instead of failing hard (user-friendly recovery)
- Post-execute gates append to SUMMARY.md instead of separate files (consolidated output)
- Intent guards provide copy-paste redirects (not just warnings)

#### Architecture
- Agent rules split into slim index + lazy-loaded files (77% token reduction)
- Module system refactored to 3 explicit modules (core, execution, discovery)
- Workflows now consistently use `@` references to shared contracts
- Numeric ID system adopted across all workflows and state

#### Documentation
- README rewritten for v2-prototype (64 → 69 commands, 22 → 35+ agents)
- Added "What's new" section highlighting recent additions
- Filesystem layout documented (.rihal/ vs .planning/)
- Three modes deep-dive: Council vs. Chain vs. Discuss

---

### Known Issues

#### Limitations
- Global agents (`~/.rihal/agents/`) not yet supported (roadmap for v2.1)
- Mariam and Hussain-PM not installed as first-class council agents (workaround: copy and customize)
- Worktree isolation removed (auto-branch isolation available instead)
- Token budgeting on `/rihal:autonomous` is advisory (soft limit, not hard)

#### Experimental
- Decimal phase insertion (02.1) is new; test coverage in progress
- Multilingual classifier covers ~30 keywords; expansion ongoing

---

## v1.0.0 (Historical Reference)

Earlier versions tracked on main branch. See GitHub Releases for details.

---

## Roadmap (planned)

### v2.1
- Global agents fully supported (`~/.rihal/agents/`)
- Mariam and Hussain-PM as first-class council agents
- Extended multilingual classifier (50+ keywords)
- Integration with external knowledge bases

### v2.2
- Dashboard improvements (realtime state viewer)
- Workspace branch tracking (git integration)
- Agent performance metrics

### v3.0 (future)
- Integration with external planning tools (Jira, Linear, etc.)
- Real-time collaboration features
- Custom workflow builders (no-code)

---

## Statistics (v2-prototype)

| Metric | Count |
|--------|-------|
| Commands | 69 |
| Agents | 35+ |
| References | 35+ |
| Test files | 10 |
| Tests | 95+ |
| Module files | 238 total |
| Max file size limit | 1000 lines |

---

## Feedback

Found a bug? Have a suggestion? Open an issue on GitHub:
[github.com/hanzlahabib/rihal-code/issues](https://github.com/hanzlahabib/rihal-code/issues)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

This project follows Conventional Commits. Agent definitions must pass the 5-component compliance check:
1. YAML trigger header (5-12 triggers + negative boundaries)
2. Overview paragraph
3. Workflow/instructions
4. Output Format section
5. Examples (happy + edge + negative cases)

---

Last updated: 2026-04-12
