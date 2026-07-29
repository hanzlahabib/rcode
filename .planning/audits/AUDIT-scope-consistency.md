# Audit: Hand-Maintained Cross-File Consistency Lists

**Scope:** Find lists of allowed/valid values duplicated across 2+ files with no
single source of truth, where drift is either (a) caught only reactively by a
test that fires after the fact, or (b) not caught by anything at all.

**Trigger:** Three separate commits — `fix(init)` in v4.7.1, then the
`github-sync` and `rcode scopes` commits just landed — each broke
`test/scope-history-parity.test.cjs` and/or `test/scope-list-parity.test.cjs`
because `AGENTS.md`'s `Scopes allowed:` line and `CONTRIBUTING.md`'s
`### Allowed scopes` block are hand-maintained and nobody proactively updates
both when adding a scope.

**Method:** Read the two scope-parity tests to establish the exact drift
mechanism they guard, then hunted structurally similar patterns across the
repo: agent-name lists, skill trigger-phrase lists, and the scope list itself
outside AGENTS.md/CONTRIBUTING.md. Every claim below was verified against the
live worktree (`git diff`, `grep -n`, or by actually running the generator /
test and reverting), not inferred from file names.

---

## Mechanism established by the two existing tests

- `test/scope-history-parity.test.cjs:23-58` — parses the last 100 commit
  subjects for `type(scope):` scopes, parses `AGENTS.md`'s `Scopes allowed:`
  line (`test/scope-history-parity.test.cjs:37-46`), and fails if any commit
  scope is missing from AGENTS.md. **Currently failing** — verified by running
  it: `rcode` was used as a scope in a commit but is not in `AGENTS.md`'s list.
- `test/scope-list-parity.test.cjs:27-51` — parses `AGENTS.md`'s
  `Scopes allowed:` line and `CONTRIBUTING.md`'s `### Allowed scopes` bulleted
  block (`test/scope-list-parity.test.cjs:39-51`), asserts AGENTS ⊆
  CONTRIBUTING. Currently passing.

Both are **reactive**: they only fire when someone runs `node --test` (or CI
does) after the drift has already been introduced. Nothing stops the commit
that introduces the drift, and nothing regenerates either list from a single
source. This is the exact shape I hunted for elsewhere.

---

## Finding 1 — CLAUDE.md is a THIRD hand-maintained copy of the scope list, untested, and currently drifted by 15 scopes

Neither `scope-history-parity.test.cjs` nor `scope-list-parity.test.cjs`
reads `CLAUDE.md`. But `CLAUDE.md` (repo root) carries its own
`Scopes allowed:` line, structurally identical to AGENTS.md's:

- `CLAUDE.md:27` — `Scopes allowed:` ... 70 backtick-quoted scopes
- `AGENTS.md:27` — `Scopes allowed:` ... 85 backtick-quoted scopes
- `CONTRIBUTING.md:274` — `### Allowed scopes (for rcode)` bulleted block (checked against AGENTS.md by the existing test)

`CLAUDE.md` and `AGENTS.md` are two independent files (not a symlink —
verified with `readlink -f`), 7718 vs 7723 bytes. A full diff shows CLAUDE.md
also lags AGENTS.md on unrelated maintained sections (a "Naming & Branding"
block present in AGENTS.md at `AGENTS.md:49-58` is entirely absent from
CLAUDE.md, and the compliance-check snippet at `AGENTS.md:80-85` vs
`CLAUDE.md:70-75` has diverged — CLAUDE.md still references the old
grep-based Output-Format/Examples check while AGENTS.md points at
`node cli/doctor.js` / `test/artifact-schema.test.cjs`), but the scope list is
the sharpest, most mechanical instance of the same problem this audit was
commissioned to find.

**Currently missing from `CLAUDE.md:27` but present in `AGENTS.md:27`** (15
scopes, verified programmatically by parsing both files with the same regex
the existing tests use):

```
init, agent-rules, cursor, i18n, phase, scaffold, campaign, ship,
getting-started, do-router, milestone-health, modules, project-types,
roadmapper, token
```

`init` is notably the scope added by the most recent breaking commit
(`e7dabfc chore(scopes): add init to AGENTS.md/CONTRIBUTING.md allowed scope
lists`) — the commit message itself says "AGENTS.md/CONTRIBUTING.md", CLAUDE.md
isn't even mentioned as a target, confirming it's not part of anyone's mental
model of "the scope list files."

**This is not a one-off miss.** `git log --oneline -- CLAUDE.md` shows a
recurring manual-sync chore:

- `7aa58d5 chore(scopes): sync CLAUDE.md with observability and audit scopes`
- `394af32 docs(config): sync CLAUDE.md scope list with AGENTS.md`

Two prior commits exist *solely* to hand-copy AGENTS.md's scope list into
CLAUDE.md. Each time, the sync is done once, by hand, and nothing prevents
the next scope addition (to AGENTS.md/CONTRIBUTING.md, which do have a test)
from silently leaving CLAUDE.md behind again — which is exactly what
happened with `init` and the 14 other scopes above.

**Does a test catch this? No.** Grepped `test/*.test.cjs` for `CLAUDE.md`
scope handling — zero hits. `scope-list-parity.test.cjs` only compares
AGENTS.md ⊆ CONTRIBUTING.md; CLAUDE.md is invisible to it. Worse than the
scope-history/scope-list tests: this isn't "reactive," it's **uncaught,
period** — CI stays green while CLAUDE.md silently drifts.

---

## Finding 2 — 27 hand-authored `<available_agent_types>` blocks inside `rcode/workflows/*.md`, zero test coverage, already drifted

The prompt's hypothesis was 3 lists (team.yaml, `rcode/agents/*.md`, and
`<available_agent_types>` blocks in `plan.md`/`execute.md`). Verified findings
differ from that hypothesis in an important way:

**team.yaml ↔ rcode/agents/*.md ↔ literal `subagent_type=` calls: in sync, and tested.**
- `rcode/team.yaml` has 45 `- id:` entries; `rcode/agents/*.md` has 45 files;
  a `diff` of the sorted id/basename sets is empty — currently perfectly in
  sync.
- This trio *is* covered: `test/agent-team-parity.test.cjs:71-128` asserts
  every `team.yaml` entry resolves to a real agent file, and every
  `subagent_type="rcode-..."` literal used anywhere in `rcode/workflows/` or
  the installed mirror resolves to a real agent file.
- `test/do-workflow-agent-parity.test.cjs` additionally checks `do.md`'s
  persona-alias table against `team.yaml`.
- So the part of the hypothesis that's testable by exact-string matching is
  already guarded — this is a **correctly-covered counter-example**, cited
  here for calibration, not a finding.

**The actual gap: the `<available_agent_types>` prose/doc blocks are a *fourth*, wholly separate representation of "which agents exist," and nothing reads them.**

`grep -rln "available_agent_types" rcode/workflows/*.md` returns **27 files**
(not just plan.md/execute.md): `docs-update.md`, `explore.md`,
`review-adversarial.md`, `create-epics-and-stories.md`, `code-review-fix.md`,
`correct-course.md`, `debug.md`, `audit-fix.md`, `document-project.md`,
`new-milestone.md`, `profile-user.md`, `review-edge-case-hunter.md`,
`verify-work.md`, `discuss.md`, `code-review.md`, `map-codebase.md`,
`council.md`, `research-phase.md`, `scan.md`, `secure-phase.md`,
`validate-phase.md`, `ui-review.md`, `execute-sprint.md`, `plan.md`,
`execute.md`, `new-project.md`, `ui-phase.md`.

Each block is a hand-curated, per-workflow subset of agent names + one-line
descriptions, written in prose (`- rcode-xyz — does thing`), separate from
any `subagent_type=` call in the same file. `grep -rln "available_agent_types" test/` returns
**zero files** — no test parses or checks these blocks against anything, ever.
Confirmed two live consequences:

1. **Internal duplicate entry**, `rcode/workflows/execute.md:207-208`:
   ```
   - rcode-ui-auditor — Reviews UI implementation quality
   - rcode-ui-auditor — Audits UI against design requirements
   ```
   Same agent name listed twice with two different descriptions inside one
   `<available_agent_types>` block (`execute.md:193-209`). Almost certainly
   meant to be two different agents (e.g. one entry was supposed to be
   `rcode-nyquist-auditor` or similar) — nothing catches a copy-paste-and-forgot-to-rename here.

2. **Phantom/stale agent names**, verified by diffing every name referenced
   inside an `<available_agent_types>` block against the real
   `rcode/agents/*.md` basenames:
   ```
   rcode-fixer     — referenced, does not exist (real file: rcode-code-fixer)
   rcode-reviewer  — referenced, does not exist (real file: rcode-code-reviewer)
   ```
   Locations:
   - `rcode/workflows/code-review.md:10` — `<available_agent_types>` block says
     `- rcode-reviewer: Reviews source files for bugs and quality issues`
   - `rcode/workflows/code-review-fix.md:12-13` — block says
     `- rcode-fixer: Applies fixes to code review findings` and
     `- rcode-reviewer: Reviews source files for bugs and issues`
   - Prose elsewhere in the same files also uses the stale short names:
     `code-review.md:2,388`, `code-review-fix.md:2,205,296`,
     `execute.md:604,617`, `diagnose-issues.md:58`, and `lens-audit.md` (6
     occurrences: lines 24, 27, 29, 52, 55, 57, 117, 122).

   **Important nuance, verified by reading the actual spawn code**: the real
   `Task(subagent_type=...)` calls in these same files are *correct* —
   `code-review.md:391` and `code-review-fix.md:216,298,332` all use the real
   ids (`rcode-code-reviewer`, `rcode-code-fixer`). So this is not (yet) a
   functional break — the orchestrator spawns the right agent. It is,
   however, exactly the class of drift the audit is hunting: a
   hand-maintained list (`<available_agent_types>`) that has silently fallen
   out of sync with ground truth (the real agent id), caught by nothing,
   sitting one incautious refactor away from someone reading the doc block,
   trusting it, and writing `subagent_type="rcode-reviewer"` — which
   `agent-team-parity.test.cjs` *would* catch, but only after the fact, and
   only for that one new call site, not for the underlying doc block that
   caused the mistake.

**Verdict: uncaught, period — worse than the scope lists, which at least have two reactive tests.**

---

## Finding 3 — `docs/skills-catalog.md`: generated skill+trigger-phrase catalog, manually regenerated, no freshness test, currently severely stale

`docs/skills-catalog.md` is generated by `scripts/build-skills-catalog.cjs`
from every `rcode/skills/**/SKILL.md`'s frontmatter (`name`, `description`,
`triggers:` list) — i.e. it is a second, duplicated copy of every skill's
trigger-phrase list, committed to the repo. The file's own banner says:

> `docs/skills-catalog.md:1` — `<!-- DO NOT EDIT — generated by scripts/build-skills-catalog.cjs -->`
> `docs/skills-catalog.md:4` — `Re-run `node scripts/build-skills-catalog.cjs` after adding or renaming a skill.`

That's the entire enforcement mechanism: a comment asking a human to
remember to run a script. Verified two ways that nothing else enforces it:

- `test/build-skills-catalog.test.cjs` — thoroughly tests the *generator's
  logic* (parseFrontmatter edge cases, sorting, truncation, bucket headings)
  against synthetic temp-dir fixtures. It never once reads the real, checked-in
  `docs/skills-catalog.md` or diffs it against a fresh run — so it cannot
  detect staleness of the actual shipped file.
- `.github/workflows/*.yml` — `grep -rn "build-skills-catalog"` returns
  nothing. CI never regenerates or diffs this file.

**Confirmed currently stale** by running the real generator against the real
`rcode/skills/` tree and diffing against the committed file (then reverting
with `git checkout` — no changes shipped):

```
docs/skills-catalog.md (committed) : "80 skills across 3 buckets"
scripts/build-skills-catalog.cjs (live) : "96 skills across 5 buckets"
```

16 skills and 2 entire buckets are missing from the committed catalog, and
individual skills that *are* present have drifted trigger-phrase lists —
e.g. the committed doc lists exactly one trigger for
`rcode-checkpoint-preview` (`checkpoint preview`), while the live SKILL.md
has six: `checkpoint preview`, `preview the checkpoint`,
`human-in-the-loop review`, `review before checkpoint`,
`checkpoint review session`, `preview changes before approval`. Descriptions
are also truncated/stale in the committed copy vs. live source for multiple
skills (e.g. `rcode-browser-verify`, `rcode-ci`).

**Verdict: uncaught, period.** This is the skill-trigger-phrase analogue of
Finding 1 — a full second copy of trigger-phrase data with a "please remember
to regenerate me" comment as the only guard, and it has already drifted this
badly with nobody noticing because nothing looks at it.

---

## Good counter-examples found (for calibration — not findings)

The repo is not uniformly bad at this. Several structurally identical
duplicated-list problems *are* guarded by a reactive parity test, currently
green:

- `test/prompt-router-table-sync.test.cjs` — `do.md`'s routing table
  (`rcode/workflows/do.md`) vs `INTENT_TABLE` in `rcode/bin/rcode-hooks.cjs`.
  Same shape as the scope-list problem (two hand-maintained lists, one
  reactive test), but explicitly designed with a `KNOWN_UNCOVERED_ROUTES`
  allowlist so intentional asymmetry doesn't false-positive. Currently
  passing.
- `test/agent-team-parity.test.cjs` + `test/do-workflow-agent-parity.test.cjs`
  + `test/agents-registry.test.cjs` — team.yaml ↔ `rcode/agents/*.md` ↔
  literal `subagent_type=` call sites. Currently in sync (verified: 45/45,
  zero diff).
- `test/skill-name-dir-parity.test.cjs`, `test/command-alias-parity.test.cjs`,
  `test/package-files-parity.test.cjs`, `test/ide-list-parity.test.cjs`,
  `test/changelog-version-parity.test.cjs`, `test/help-md-parity.test.cjs` —
  not read in depth for this audit, named consistently with the pattern; flagging
  as likely-relevant surface for a follow-up pass rather than claiming
  verified findings about them.

---

## Summary table

| # | List | Copies (file:line) | Single source of truth? | Test coverage | Currently drifted? |
|---|------|---------------------|--------------------------|----------------|---------------------|
| — | commit scopes ↔ AGENTS.md | `AGENTS.md:27` vs last 100 commit subjects | No | Reactive (`scope-history-parity.test.cjs`) | **Yes** (`rcode` scope missing) — given, not re-litigated |
| — | AGENTS.md ↔ CONTRIBUTING.md scopes | `AGENTS.md:27` vs `CONTRIBUTING.md:274` | No | Reactive (`scope-list-parity.test.cjs`) | No (currently passes) |
| 1 | AGENTS.md ↔ **CLAUDE.md** scopes | `AGENTS.md:27` vs `CLAUDE.md:27` | No | **None** | **Yes — 15 scopes missing from CLAUDE.md** |
| 2 | `<available_agent_types>` blocks (27 workflow files) vs real agent files | `rcode/workflows/{27 files}` vs `rcode/agents/*.md` | No (and not even mutually consistent — internal dupe in `execute.md`) | **None** | **Yes — 1 internal duplicate (execute.md), 2 phantom names (code-review.md, code-review-fix.md)** |
| 3 | `docs/skills-catalog.md` trigger/description data vs `SKILL.md` frontmatter | `docs/skills-catalog.md` vs `rcode/skills/**/SKILL.md` `triggers:` | Nominally yes (generator script exists) but regeneration is manual and unenforced | **None** (generator unit-tested, but never diffed against the committed artifact) | **Yes — severely: 80 vs 96 skills, 3 vs 5 buckets, individual trigger lists drifted** |
| — | `do.md` routing table ↔ `INTENT_TABLE` | `rcode/workflows/do.md` vs `rcode/bin/rcode-hooks.cjs` | No | Reactive (`prompt-router-table-sync.test.cjs`), with explicit allowlist for intentional gaps | No (currently passes) |
| — | `team.yaml` ↔ `rcode/agents/*.md` ↔ `subagent_type=` calls | `rcode/team.yaml` vs `rcode/agents/*.md` vs call sites | No | Reactive (`agent-team-parity.test.cjs`, `do-workflow-agent-parity.test.cjs`) | No (currently in sync) |

No fixes were applied. This document is diagnosis only.
