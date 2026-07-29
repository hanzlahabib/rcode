# Audit: Redundant Work — Parallel Implementations Doing the Same Job Twice (or Three Times)

**Scope:** rcode source tree (`rcode/`, `docs/`, `.rcode/bin/rcode-tools.cjs`, `cli/install.js`). Audit-only — nothing fixed.
**Method:** Direct file reads + grep, file:line cited for every claim below. No speculation — anything I couldn't verify in the tree is flagged as such, not asserted.

---

## Ranked findings (highest duplicate-maintenance burden first)

### 1. [CRITICAL] Three non-interoperating implementations of "produce a sprint" — one of them literally invisible to execution

There are **three separate places** that create what's conceptually "a sprint," and they don't agree on file location, file name, or state schema. A bugfix to "how sprints get created/tracked" has to be applied in up to three places, and today they already disagree with each other.

**Path A — `/rcode-plan` (the one actually used in production, see §4):**
- `rcode/workflows/plan.md:490` spawns `rcode-planner` which writes numbered files matching the glob `*-SPRINT.md` (e.g. `008-01-SPRINT.md`). Confirmed by every downstream reference using that exact glob: `rcode/workflows/plan.md:275,375,568,573,646,770,813,846`.
- Gated by `rcode-sprint-checker` (BLOCKER/WARNING revision loop, `rcode/workflows/plan.md:627-801`), a wave-overlap CLI check (`plan.md:803-846`), and a file-ownership/conflict check (`plan.md:492-557`).
- Consumed by `rcode/workflows/execute.md:255,568` which globs `"${phase_dir}"/*-SPRINT.md` — **the numbered-prefix convention is a hard requirement**, not cosmetic.

**Path B — `/rcode-sprint-planning` command workflow (in-line fallback):**
- `rcode/workflows/sprint-planning.md:180`: `Write SPRINT.md to .planning/phases/{phase_slug}/SPRINT.md` — literally the bare filename `SPRINT.md`, **no numeric prefix**.
- `rcode/workflows/sprint-planning.md:212`: Output Format repeats the same bare path.
- `rcode/workflows/sprint-planning.md:206`: its own "Next" step tells the user to run `/rcode-execute .planning/phases/{phase}/SPRINT.md`.
- **Concrete breakage:** a file named exactly `SPRINT.md` does not match the glob pattern `*-SPRINT.md` used by `execute.md:255,568` (the `*` must be followed by a literal `-`, and `SPRINT.md` has no hyphen before "SPRINT"). **Sprints created through this path are silently invisible to `/rcode-execute`.**
- State side: registers into `state.phases[].sprints[]` via `state sprint add` / `state story add` (`.rcode/bin/rcode-tools.cjs:1521-1561`), a completely different array on the phase object than the one Path A writes.

**Path C — the skill `rcode-sprint-planning` claims to be "authoritative" but does a third, unrelated thing:**
- `rcode/workflows/sprint-planning.md:1-13` states: *"Authoritative implementation lives in the `rcode-sprint-planning` skill — this workflow delegates to it... The in-line steps below this block are a fallback summary for legacy installs... they are NOT the authoritative behaviour."*
- But the skill it delegates to, `rcode/skills/actions/4-implementation/rcode-sprint-planning/workflow.md:159-215`, does not produce a `SPRINT.md` at all. It generates `{implementation_artifacts}/sprint-status.yaml` — a YAML **status tracker** (`backlog → ready-for-dev → in-progress → review → done`) built by scanning `.planning/epics/*.md` files (workflow.md:66-118). No stories table, no capacity gate output, no state.json write.
- The same skill's own `SKILL.md:43` (`## Output Format`) claims yet a **fourth** path: `.rcode/phases/{phase}/sprint-{N}.md` with a "Sprint Goal / Assumptions / Duration / Stories / Capacity / Risks / DoD" structure — which matches **none** of what its own `workflow.md` actually does.
- Net effect: the workflow's own internal delegation instruction is self-contradicting. Following it as written (workflow.md is more concrete than SKILL.md) means the command's `description` field (`rcode/commands/sprint-planning.md:3`: *"...create SPRINT.md, register in state"*) and `<objective>` (`sprint-planning.md:8-9`) are never actually fulfilled by the "authoritative" path — only by the deprecated fallback (Path B), which itself produces a file `/rcode-execute` can't see.

**Cross-check — state.json schema divergence confirming these tracks never talk to each other:**
- `entry.plans` (a count, set by `state planned-phase --plans N`, used by Path A — `.rcode/bin/rcode-tools.cjs:3152-3169`) and `entry.sprints` (an array, set by `state sprint add`, used by Path B — `.rcode/bin/rcode-tools.cjs:1544,1560`) are two disjoint fields on the *same* `state.phases[]` object, populated by two code paths that never read each other.

### 2. [CRITICAL] The epics/stories pipeline and the SPRINT.md pipeline never talk to each other, and neither its own skill-vs-workflow copy agrees on a file layout

- `rcode/workflows/create-epics-and-stories.md:226-244` (Step 4) writes `.planning/epics/EPIC-NN.md` + one file per story at `.planning/epics/stories/{N}.{M}.md`.
- Its skill-track duplicate, `rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md:43`, claims output is a single consolidated `.rcode/phases/{phase}/epics.md` — a different root directory (`.rcode/` vs `.planning/`) and a different granularity (one big file vs. sharded per-epic/per-story files).
- Same split for the next stage down: `rcode/workflows/create-story.md:127-132` writes `.planning/stories/{story-id}.md`, while `rcode/skills/actions/2-plan/rcode-create-story/SKILL.md:43` claims `.rcode/phases/{phase}/stories/story-{id}.md`.
- Same split for `dev-story`: `rcode/workflows/dev-story.md:78-86,201-206` resolves/writes against `.planning/epics/stories/{id}.md` and `.planning/dev-sessions/{id}-dev-prompt.md`; the skill counterpart lives separately at `rcode/skills/actions/4-implementation/rcode-dev-story/`.
- **Neither branch of this pipeline is ever consumed by `rcode-executor`** — confirmed by reading the full executor agent contract (`rcode/agents/rcode-executor.md`, 27 lines total): its `<role>` is scoped explicitly to `Execute SPRINT.md files atomically... produce SUMMARY.md`. No mention of epics, stories, or dev-sessions anywhere in the file. `grep -n "epics\|stories" rcode/agents/rcode-executor.md` returns nothing.
- Practical consequence: after a user runs `/rcode-create-epics-and-stories` → `/rcode-create-story` → `/rcode-dev-story`, the only way to actually *execute* the resulting story is the manual instruction printed at `dev-story.md:342,391,405,413`: `/rcode {dev-prompt-file}` — a raw invocation with none of the atomic-commit/checkpoint/wave/verification machinery that `/rcode-plan` → `/rcode-execute` gets. It's a second, weaker execution model bolted onto a second, incompatible planning model.

### 3. [HIGH] Systemic pattern: `rcode/workflows/*.md` vs. `rcode/skills/actions/*/rcode-*/workflow.md` — 18 same-named pairs, only 1 attempts to bridge them, and that bridge is broken

Full inventory (skill directory name, stripped of `rcode-` prefix, matched against an identically-named file in `rcode/workflows/`):

```
create-prd, create-story, edit-prd, create-epics-and-stories, validate-prd,
prfaq, document-project, check-implementation-readiness, create-architecture,
retrospective, checkpoint-preview, correct-course, sprint-status, dev-story,
code-review, sprint-planning, debug, scaffold-project
```

- `grep -l "delegate_to_skill" rcode/workflows/*.md` returns **exactly one file**: `sprint-planning.md`. All 17 other pairs have **zero cross-reference** in either direction — confirmed for `debug` (`rcode/workflows/debug.md`, 278 lines, no mention of `skill` or `.rcode/skills` anywhere) and `code-review` (`rcode/workflows/code-review.md`, 628 lines, same check — its only "delegate" hits are to *other workflow files* for `--karpathy`/`--attack`/`--edge-cases` flags, not to the skill counterpart).
- Both halves of each pair ship in the npm package (`package.json:22`: `"files": ["rcode/", ...]` includes all of `rcode/skills/actions/**`) and both get installed by `cli/install.js`. `installSkills()` (`cli/install.js:1089-1114`) routes each skill folder to one of two live locations based on its own `internal:` frontmatter flag:
  - `internal: true` skills (confirmed for `rcode-create-story`, `rcode-create-epics-and-stories`, `rcode-dev-story`, `rcode-sprint-status`, `rcode-code-review` (whose own `name:` field is `rcode-review`, not `rcode-code-review` — a separate naming mismatch), `rcode-sprint-planning`) install to `.rcode/skills/` — reachable only via explicit `@`-inclusion from a workflow. Since 17/18 workflows never include their counterpart, these are **shipped, installed, dead code** on every user's machine: never invoked by any command or workflow, yet maintained (or drifted) release over release.
  - Skills without `internal: true` (confirmed for `rcode-debug`) install to `.claude/skills/rcode-{name}` — Claude Code's normal phrase-matched skill menu, fully independent of and reachable in parallel with the `/rcode-debug` slash command. This is a genuine two-live-paths duplication: a user typing "debug this" gets `skills/actions/4-implementation/rcode-debug/SKILL.md` (199 lines, own process/output format), while `/rcode-debug` gets `rcode/workflows/debug.md` (278 lines) — no shared code, so a fix to one is invisible to the other.

### 4. [MEDIUM] Real-world confirmation: the epics/stories/sprint-status tracks are pure latent liability — never exercised by this project's own dogfooded history

- `find .planning/phases -iname "*-SPRINT.md"` → **54 files**. This repo's own planning history exclusively uses Path A (§1).
- `find .planning -iname "epics" -o -iname "stories"` and `find .planning -iname "sprint-status.yaml"` → **zero results, anywhere.**
- The epics/stories/sprint-status pipeline is fully built, fully documented, fully shipped — and has never once been used to plan or execute a phase of rcode's own development. Every future change to `rcode-roadmapper`, the epic/story templates, or the checklist gates (`checklist-story-draft.md`, `checklist-story-dod.md`) is maintenance spent on a path with no observed usage.

### 5. [LOW] `docs/commands.md` documents a fourth, non-existent interface for the same commands

- `docs/commands.md:266-279` claims `/rcode-plan` outputs `.planning/phases/{NN}/PLAN.md` via a "planner → plan-checker, max 2 retries" flow. The actual implementation (`rcode/workflows/plan.md`) produces `*-SPRINT.md` via `rcode-planner` → `rcode-sprint-checker`, with a mode-dependent 1-or-3 iteration cap (`plan.md:700-710`), not "PLAN.md" and not "max 2 retries."
- `docs/commands.md:356-361` claims `/rcode-sprint-planning --backlog=.planning/backlog.md` — no `--backlog` flag exists anywhere in `rcode/workflows/sprint-planning.md` (its actual flags are `--phase`, `--velocity`, `--goal`, per `sprint-planning.md:64` and `rcode/commands/sprint-planning.md:4`).
- `docs/commands.md:322-327` claims `/rcode-create-story "As a user, I want to reset my password"` takes a free-text story description. The actual workflow (`rcode/workflows/create-story.md:28-45`) requires an `<EPIC-file.md>` path argument and errors if the file doesn't exist.
- This means there are effectively **three** disagreeing descriptions of the same feature set in this codebase (workflow A, workflow/skill B, and the docs), not two.

### 6. [LOW] Copy-paste artifact: duplicate, conflicting "Next Up" sections in the same file

- `rcode/workflows/create-epics-and-stories.md` has two separate "Next Up" headers with different content: `## ▶ Next Up` at line 379 (lists `/rcode-sprint-planning`, `/rcode-dev-story`, `/rcode-edit-prd`) and a second, plain `## Next Up` at line 385 (lists `/rcode-sprint-planning`, `/rcode-create-story`) — the second one recommends a step (`/rcode-create-story`) the first one omits. Evidence of at least two independent, non-reconciled edits to the same file's closing section.

---

## Ruled out (checked, not found)

**Lead: "rcode ships both `rihal-*` and `rcode-*` agent/command files as full duplicates."** — **False**, for this repository's source tree.
- `ls rcode/agents/` → 46 entries, 45 of them `rcode-*`, **zero** `rihal-*` (`ls rcode/agents/ | grep -ci rihal` → 0).
- `find . -iname "rihal-*" -not -path "*/node_modules/*" -not -path "*/.git/*"` (repo-wide) → **0 results**.
- `.claude/agents/` and `.claude/commands/` do not exist in this worktree at all, and `.claude/*` is gitignored (`.gitignore:8`) except `settings.json` and `hooks/*.sh` — so even if they existed locally they would not be part of the committed source.
- The doubled `rihal-*`/`rcode-*` agent roster visible in this session's own tool list is populated from a global/external agent registry outside this worktree (not from `rcode/agents/`), and is not evidence of anything shipped in this repo. Do not action this lead further without a different, concrete file path.

---

## Maintenance-burden ranking (summary)

| # | Finding | Burden driver |
|---|---|---|
| 1 | Three sprint-production paths, one producing files invisible to execution | Every "how do sprints get made" bugfix must be triaged across 3 disagreeing implementations; one is actively broken today |
| 2 | Epics/stories pipeline fully disconnected from execution | A whole second planning model with no execution consumer; any change to story format must be manually kept compatible with nothing |
| 3 | 18 workflow/skill pairs, 17 unbridged | Systemic: every future workflow change risks silently not applying to its skill twin (or vice versa) for 17 distinct features |
| 4 | Epics/stories/sprint-status tracks unused in 54 real sprints | Confirms #2/#3 cost is pure overhead, not redundancy-with-value (e.g. resilience) |
| 5 | docs/commands.md describes a third interface | Onboarding/support risk; lower ongoing code-maintenance cost than 1-3 |
| 6 | Duplicate "Next Up" blocks in one file | Cosmetic, single-file, near-zero burden but a marker of unreviewed copy-paste |

**Not a finding:** rihal-*/rcode-* duplicate agent files — checked and absent from source.
