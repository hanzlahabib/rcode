# Audit Round 2: Lens 14 — Naming Conventions (General Code Health)

**Branch:** audit2-lens-14-naming
**Date:** 2026-05-25
**Auditor:** Claude Code (Sonnet 4.6)
**Scope:** General naming health — not rebrand residue
**Status: WARN** — No critical runtime breakage, but pervasive mixed-convention drift and 8 unresolved PHASE_NUM occurrences

---

## Scope Scanned

- `rcode/bin/rcode-tools.cjs` (6900+ lines, primary CLI binary)
- `rcode/bin/rcode-hooks.cjs` (hook executor)
- `rcode/bin/lib/*.cjs` (roadmap, config, verify, code-references, council-panel)
- `rcode/skills/agents/*/SKILL.md` (23 agents)
- `rcode/skills/agents/*/skill-manifest.yaml` (8 manifests)
- `rcode/skills/actions/*/SKILL.md` (37 actions)
- `rcode/skills/core/*/SKILL.md` (25 core skills)
- `rcode/workflows/*.md` (129 workflow files)
- `rcode/commands/*.md` (command front-matter)
- `rcode/team.yaml`
- `.rcode/workflows/*.md` (125 installed workflow files)
- `.rcode/agents-rules/verifier/*.md`

---

## Commands Run

```bash
# PHASE_NUM residue
grep -rn "\bPHASE_NUM\b" rcode/ .rcode/ | grep -v "PHASE_NUMBER|CHANGELOG"

# SKILL.md name: field vs directory name
find rcode/skills -name "SKILL.md" | while read f; do
  dir=$(basename $(dirname "$f")); name=$(grep -m1 "^name:" "$f" | sed ...); ...
done

# Workflow title vs filename
for f in rcode/workflows/*.md; do
  grep -m1 "^# Workflow:" "$f" | compare with expected rcode-<basename>
done

# Command name: field vs filename
for f in rcode/commands/*.md; do
  grep -m1 "^name:" "$f" | compare with expected rcode-<basename>
done

# snake_case variables in JS
grep -En "(let|const) [a-z][a-z0-9]+_[a-z]" rcode/bin/rcode-tools.cjs

# Boolean naming
grep -n "= true\b\|= false\b" rcode/bin/rcode-tools.cjs | grep -v "is[A-Z]|has[A-Z]|..."

# Abbreviation scan
grep -En "(const|let|var) (tgt|tmp|obj|val|res|err|cfg|idx|num|row|str)\b" rcode/bin/rcode-tools.cjs

# team.yaml ID vs SKILL.md name cross-reference
# skill-manifest.yaml camelCase vs snake_case YAML keys
```

---

## Prior Audit Comparison (AUDIT-lens14-naming.md, 2026-05-24)

| Prior Finding | Status in Round 2 |
|---|---|
| (a) rihal: colon namespace — PASS | **STILL PASS** — no new hits |
| (b) Workflow titles rihal-X — PASS | **STILL PASS** |
| (c) Agent name/dir mismatches — FAIL (15 warn, 1 info) | **PARTIALLY FIXED** — .rcode/ stale rihal- names resolved; source rcode/ mismatches persist by design |
| (d) PLAN.md vs SPRINT.md drift — WARN (5 files) | **UNCHANGED** — M1-ship-v2 PLAN.md files still not renamed |
| (e) PHASE_NUM regression — FAIL (88 occurrences) | **PARTIALLY FIXED** — workflows fixed; 8 occurrences remain in verifier rules |
| (f) snake_case/camelCase config keys — PASS | **STILL PASS** |

---

## Finding A — PHASE_NUM Residue in Verifier Rules (Partial Fix)

**Status: WARN** — Down from 88 occurrences (prior audit) to **8 occurrences** in 4 files

The major files (`autonomous.md`, `autonomous-smart-discuss.md`, `phase.md`) are fully fixed. The remaining occurrences are isolated to verifier agent rules:

| File | Line | Content | Severity |
|---|---|---|---|
| `rcode/agents/rules/verifier/context-loading.md` | 28 | `roadmap get-phase "$PHASE_NUM"` | warn |
| `rcode/agents/rules/verifier/context-loading.md` | 29 | `grep -E "^| $PHASE_NUM" .rcode/REQUIREMENTS.md` | warn |
| `rcode/agents/rules/verifier/context-loading.md` | 65 | `PHASE_DATA=$(... get-phase "$PHASE_NUM" --raw)` | warn |
| `rcode/agents/rules/verifier/requirements-coverage.md` | 25 | `grep -E "Phase $PHASE_NUM" .rcode/REQUIREMENTS.md` | warn |
| `.rcode/agents-rules/verifier/context-loading.md` | 28 | (mirror of above) | warn |
| `.rcode/agents-rules/verifier/context-loading.md` | 29 | (mirror of above) | warn |
| `.rcode/agents-rules/verifier/context-loading.md` | 65 | (mirror of above) | warn |
| `.rcode/agents-rules/verifier/requirements-coverage.md` | 25 | (mirror of above) | warn |

**Impact:** When the verifier agent runs, it reads `PHASE_NUM` which will be unset if the caller sets `PHASE_NUMBER`. The `roadmap get-phase ""` call will return an error or wrong data, causing silently incorrect verification context loading.

**Prior audit:** Classified as 88 critical occurrences across 12 files. Round 2 confirms 80 are fixed; 8 remain.

---

## Finding B — SKILL.md `name:` Field vs Directory Name (Source Tree)

**Status: WARN** — 19 mismatches in `rcode/skills/`; this is a **design bifurcation** not a mistake

Two distinct patterns coexist in the same `rcode/skills/agents/` directory, creating an inconsistent convention:

### B1: Agent dirs use short names; SKILL.md names use `rcode-<full-name>`
18 agents follow this pattern: directory name is the short descriptor (e.g. `fatima-qa`), SKILL.md `name:` field is `rcode-fatima-qa`.

### B2: 5 agents use `rcode-` prefix in the directory AND the name field
These agents have `rcode-` prefixed directory names and matching `name:` fields:

| Dir | SKILL.md name | File |
|---|---|---|
| `rcode-cross-platform-auditor` | `rcode-cross-platform-auditor` | `rcode/skills/agents/rcode-cross-platform-auditor/SKILL.md:2` |
| `rcode-dep-auditor` | `rcode-dep-auditor` | `rcode/skills/agents/rcode-dep-auditor/SKILL.md:2` |
| `rcode-deviation-analyzer` | `rcode-deviation-analyzer` | `rcode/skills/agents/rcode-deviation-analyzer/SKILL.md:2` |
| `rcode-i18n-auditor` | `rcode-i18n-auditor` | `rcode/skills/agents/rcode-i18n-auditor/SKILL.md:2` |
| `rcode-observability-auditor` | `rcode-observability-auditor` | `rcode/skills/agents/rcode-observability-auditor/SKILL.md:2` |

**Severity:** `info` — Both B1 and B2 are internally consistent (dir matches name within each pattern), but the conventions differ between groups with no documented rationale. The B2 agents are the auditor/analyzer agents added after the main agent roster.

### B3: `rcode-code-review` action has truncated name
| Dir | SKILL.md name | Expected | File |
|---|---|---|---|
| `rcode-code-review` | `rcode-review` | `rcode-code-review` | `rcode/skills/actions/4-implementation/rcode-code-review/SKILL.md:2` |

**Severity:** `warn` — The SKILL.md name (`rcode-review`) does not match the directory (`rcode-code-review`), and the `rcode/commands/code-review.md` front-matter also says `name: rcode-review` while the file is `code-review.md`. This means the canonical command name is `rcode-review` but its home directory says `rcode-code-review`.

### B4: `rcode-code-review` command front-matter name mismatch
| File | name: field | Expected | 
|---|---|---|
| `rcode/commands/code-review.md` | `rcode-review` | `rcode-code-review` |

**Severity:** `warn` — Same as B3; the command file and the action skill are both named `rcode-review` while the directory says `rcode-code-review`. The command is invoked as `/rcode-review`, making the directory name the outlier.

**Prior audit findings C2/C5:** Prior audit noted C2 (rcode but wrong suffix for 5 agents in `.rcode/`) and C5 (`rcode-code-review` truncated). C2 appears resolved in `.rcode/` (0 SKILL.md found in installed tree). C5 persists in `rcode/` source.

---

## Finding C — 3-Way Agent Name Inconsistency

**Status: WARN** — No single canonical name for core agents across registries

Core agents are referenced by 3 different identifiers in 3 different files, all legitimately divergent:

| Identifier source | Pattern | Example |
|---|---|---|
| `team.yaml` id | `rcode-<firstname>` | `rcode-fatima` |
| `SKILL.md` name | `rcode-<firstname>-<role>` | `rcode-fatima-qa` |
| `skill-manifest.yaml` name | `rcode-agent-<firstname>` | `rcode-agent-fatima` |

Affected agents (6 with all 3 files):

| Agent | team.yaml | SKILL.md | skill-manifest.yaml |
|---|---|---|---|
| `fatima-qa` | `rcode-fatima` | `rcode-fatima-qa` | `rcode-agent-fatima` |
| `waleed-architect` | `rcode-waleed` | `rcode-waleed-architect` | `rcode-agent-waleed` |
| `hanzla-engineer` | `rcode-hanzla` | `rcode-hanzla-engineer` | `rcode-agent-hanzla` |
| `sadiq-analyst` | `rcode-sadiq` | `rcode-sadiq-analyst` | `rcode-agent-sadiq` |
| `layla-designer` | `rcode-layla` | `rcode-layla-designer` | `rcode-agent-layla` |
| `noor-writer` | `rcode-noor` | `rcode-noor-writer` | `rcode-agent-noor` |

**Severity:** `info` — Each file uses its own consistent internal convention. This is unlikely to cause runtime failures since each system looks up names differently. However, it creates cognitive overhead for maintainers adding new agents, as there is no single documented naming rule to follow.

**New finding (not in prior audit):** The `skill-manifest.yaml` `rcode-agent-*` naming was not analyzed in the prior audit.

---

## Finding D — Workflow Filename vs Title Mismatch

**Status: WARN** — 2 mismatches in `rcode/workflows/`, 1 in `.rcode/workflows/`

| File | Actual title | Expected title | Severity |
|---|---|---|---|
| `rcode/workflows/audit-plans.md` | `# Workflow: rcode-audit plans` | `# Workflow: rcode-audit-plans` | warn |
| `rcode/workflows/audit-worktrees.md` | `# Workflow: audit-worktrees` | `# Workflow: rcode-audit-worktrees` | warn |
| `.rcode/workflows/audit-plans.md` | `# Workflow: rcode-audit plans` | `# Workflow: rcode-audit-plans` | warn |

**Notes:**
- `audit-plans.md`: Title uses a space (`rcode-audit plans`) instead of a hyphen (`rcode-audit-plans`).
- `audit-worktrees.md`: Title omits the `rcode-` prefix entirely. File exists only in `rcode/` source, not in `.rcode/` installed tree (it is one of 4 source-only files: `audit-worktrees.md`, `execute-milestone.md`, `plan-milestone.md`, `scaffold-milestone.md`).

**Prior audit:** (b) was PASS for `rihal-` workflow titles. This is a new finding unrelated to rebrand residue — it's a formatting/naming hygiene issue.

---

## Finding E — Mixed snake_case / camelCase in JavaScript (`rcode-tools.cjs`)

**Status: WARN** — 9 snake_case local variables in a predominantly camelCase JS file

JavaScript convention is camelCase. `rcode-tools.cjs` uses camelCase consistently for local variables except in 9 cases:

| Line | Variable | Context | Severity |
|---|---|---|---|
| 366 | `agent_id` | `cmdInit()` local var | warn |
| 1584–1585 | `points_done`, `points_total` | Sprint stats loop | warn |
| 1615–1616 | `points_done`, `points_total` | Sprint status builder | warn |
| 1658 | `points_done`, `points_total` | Sprint summary section | warn |
| 4912 | `decimal_children` | Phase finder return object key | warn |
| 4964 | `total_items` | UAT audit return object key | warn |
| 5636 | `os_mod` | `cmdHandoff()` require alias | warn |

**Note on output object keys:** The `out.phase_found`, `out.has_plans`, `out.roadmap_exists` etc. (snake_case keys on the `out` object) are **intentional** — they form the JSON contract consumed by workflows via `${INIT_OUTPUT}`. Changing those would break workflow parsing. This finding applies only to **local variable** names (agent_id, points_done, decimal_children, os_mod) which have no external contract.

---

## Finding F — Context-Free Abbreviations in JavaScript

**Status: INFO** — 7 abbreviation types found; most are acceptable in context

| Line | Name | Context | Verdict |
|---|---|---|---|
| 99, 252 | `val` | YAML parser loop variable | acceptable (2-line scope) |
| 141, 1132, 1195 | `cfg` | `require(config.cjs)` result or file read | borderline — `configText` / `config` would be clearer |
| 193 | `row` | CSV parser accumulator | acceptable (tight loop) |
| 214 | `obj` | YAML parse output | warn — `entry` or `parsed` would be clearer |
| 630, 648 | `row` | Agent manifest lookup result | warn — `manifestEntry` or `agentRow` more expressive |
| 1080, 2578, 2622 | `tmp` | Temp file path string | acceptable (standard idiom) |
| 1225 | `val` | Config set argument extraction | acceptable (2-line scope) |
| 1529 | `row` | Sprint table iteration | acceptable (tight loop) |
| 1891 | `idx` | Index array iteration | acceptable (standard idiom) |
| 2192, 2235 | `num` | Phase number parse result | borderline — `phaseNum` used elsewhere; inconsistent |
| 3103 | `num` | Another phase number parse | borderline — same inconsistency as above |
| 3588 | `obj` | Regex capture for `<objective>` tag | warn — `objectiveText` or `objectiveMatch` better |
| 4371 | `len` | String length | acceptable (standard idiom) |
| 4433 | `arg` | Positional args join | warn — `query` or `input` would be clearer |
| 4879 | `idx` | Array index | acceptable (standard idiom) |
| 4880 | `val` | Array element access | acceptable (3-line scope) |

**Key abbreviation concerns:**
- `obj` (lines 214, 3588): Two different uses of `obj` in the same file — in one it's a YAML parsed object, in another it's a regex capture. The name gives no semantic hint.
- Inconsistent `num` vs `phaseNum`: `phaseNum` is used in 10+ places but `num` is also used for the same thing (phase number) in 3 other places.

**Prior audit:** The prior audit did not cover this category.

---

## Finding G — Boolean Variable Naming Convention

**Status: INFO** — Boolean variables exist without `is/has/should/can` prefix; most are pre-existing idioms

| Line | Name | Value | Verdict |
|---|---|---|---|
| 195 | `inQuotes` | boolean parser state | acceptable (`in*` is a conventional parser idiom) |
| 1491 | `inTable` | boolean parser state | acceptable (same pattern) |
| 5297 | `inModules` | boolean parser state | acceptable (same pattern) |
| 5742–5743 | `inPaths`, `inDescription` | boolean parser state | acceptable (same pattern) |
| 1161 | `wasStub` | boolean result of state check | info — `wasSeededStub` or `isStub` would be clearer |
| 1881 | `noref` | flag indicating no reference | warn — `noReferenceRequired` or `skipRefCheck` would be clearer; double-negative |
| 2967 | `renamed` | loop mutation flag | info — `wasRenamed` would align with `was*` pattern used in `wasStub` |
| 4848 | `raw` | CLI flag for raw output | warn — `rawMode` or `isRawOutput` would be unambiguous |
| 6753 | `commitPlanning` | controls whether to commit | info — `shouldCommitPlanning` would follow convention |

**Note:** `inQuotes`, `inTable`, `inModules`, `inPaths`, `inDescription` are a consistent `in*` prefix pattern for parser state machines — this is an established idiom and not a violation.

---

## Finding H — Workflow Source-Only Files (Missing from Installed Tree)

**Status: INFO** — 4 workflow files in `rcode/` source but absent from `.rcode/` installed tree

| File | Present in `rcode/` | Present in `.rcode/` |
|---|---|---|
| `audit-worktrees.md` | Yes | No |
| `execute-milestone.md` | Yes | No |
| `plan-milestone.md` | Yes | No |
| `scaffold-milestone.md` | Yes | No |

These may be intentionally excluded from the install package (e.g. milestone operations not yet stable), or they may be omissions in the install step. No command files exist in `rcode/commands/` for these either, suggesting they are internal/sub-workflows only.

---

## Finding I — `fmListField` and `files0` — Abbreviated Internal Function Names

**Status: INFO** — 2 non-descriptive internal helper function names

| Line | Name | What it does | Better name |
|---|---|---|---|
| 81 | `files0` | Returns first matching filename in a directory or null | `findFirstMatchingFile` or `findFile` |
| 4758 | `fmListField` | Extracts a YAML list field from a frontmatter block | `parseFrontmatterListField` or `readFrontmatterList` |

Both functions are used multiple times. `files0` uses a cryptic `0` suffix (suggesting "find one" or "zero-or-one") but that idiom is not documented or consistent with any other naming in the file.

---

## Finding J — PLAN.md Files Not Renamed to `-SUPERSEDED.md` (Unchanged from Prior Audit)

**Status: WARN** — 5 files unchanged from prior audit

The 5 `PLAN.md` files in `.planning/milestones/M1-ship-v2/phases/0*/` identified in the prior audit remain unremediated:

- `.planning/milestones/M1-ship-v2/phases/01-tier-docs/PLAN.md`
- `.planning/milestones/M1-ship-v2/phases/02-scaffold-skill/PLAN.md`
- `.planning/milestones/M1-ship-v2/phases/03-v2-stabilization/PLAN.md`
- `.planning/milestones/M1-ship-v2/phases/04-dashboard-refresh/PLAN.md`
- `.planning/milestones/M1-ship-v2/phases/05-marketing-launch/PLAN.md`

Per `rcode-plan` workflow documentation, these should be named `*-SUPERSEDED.md`. Tooling that scans for `*-SPRINT.md` silently skips these files; agents loading milestone context may treat them as active plans.

---

## Summary Table

| Finding | Scope | Status | Critical | Warn | Info | New vs Prior |
|---|---|---|---|---|---|---|
| A — PHASE_NUM residue | verifier rules | WARN | 0 | 8 | 0 | Partial fix (was 88 critical) |
| B — SKILL.md name vs dir | rcode/skills/ | WARN | 0 | 2 | 5 | B3/B4 persistent from prior; B1/B2 design pattern clarified |
| C — 3-way agent name drift | team/SKILL/manifest | INFO | 0 | 0 | 6 | NEW — not in prior audit |
| D — Workflow title vs filename | rcode/workflows/ | WARN | 0 | 3 | 0 | NEW — not in prior audit |
| E — Mixed snake/camelCase JS | rcode-tools.cjs | WARN | 0 | 9 | 0 | NEW — not in prior audit |
| F — Context-free abbreviations | rcode-tools.cjs | INFO | 0 | 3 | 13 | NEW — not in prior audit |
| G — Boolean naming | rcode-tools.cjs | INFO | 0 | 2 | 5 | NEW — not in prior audit |
| H — Source-only workflow files | rcode/ vs .rcode/ | INFO | 0 | 0 | 4 | NEW — not in prior audit |
| I — Abbreviated function names | rcode-tools.cjs | INFO | 0 | 0 | 2 | NEW — not in prior audit |
| J — PLAN.md not renamed | .planning/milestones | WARN | 0 | 5 | 0 | Unchanged from prior audit |

**Totals:** 0 critical · 29 warn · 35 info

---

## Recommended Remediation (priority order)

1. **PHASE_NUM → PHASE_NUMBER in verifier rules** (warn): Fix 8 remaining occurrences in `rcode/agents/rules/verifier/context-loading.md` and `requirements-coverage.md`, then sync to `.rcode/agents-rules/verifier/`. These are the last PHASE_NUM occurrences in the codebase.

2. **`rcode-code-review` dir / `rcode-review` name alignment** (warn): Either rename the directory from `rcode-code-review` to `rcode-review` across `rcode/skills/actions/4-implementation/` and `rcode/commands/code-review.md` → `rcode/commands/review.md`, OR rename the `name:` field in both SKILL.md and command front-matter to `rcode-code-review`. The current state creates confusion about the canonical command name.

3. **Workflow title hygiene** (warn): Fix `audit-plans.md` title (space → hyphen) and `audit-worktrees.md` (add `rcode-` prefix) in both `rcode/` and `.rcode/` trees.

4. **PLAN.md → SUPERSEDED renaming** (warn): Rename the 5 M1-ship-v2 PLAN.md files to `*-SUPERSEDED.md`.

5. **`agent_id` variable naming** (warn, line 366): Rename to `agentId` for camelCase consistency.

6. **`points_done`/`points_total` variables** (warn, lines 1584–1658): Rename to `pointsDone`/`pointsTotal`.

7. **`decimal_children` / `total_items` / `os_mod`** (warn, lines 4912/4964/5636): Rename to `decimalChildren`, `totalItems`, `osMod`.

8. **`noref` boolean** (warn, line 1881): Rename to `noReferenceRequired` or `skipAuditRef`.

9. **`raw` flag boolean** (warn, line 4848): Rename to `rawMode` or `isRawOutput`.

10. **Document agent naming triplication** (info): Add a CONTRIBUTING.md section explaining the 3 naming conventions (`team.yaml` short ID, `SKILL.md` full name, `skill-manifest.yaml` agent name) so maintainers know which to follow when adding agents.

11. **`files0` / `fmListField`** (info): Consider renaming to `findFirstMatchingFile` / `parseFrontmatterListField` in a future cleanup pass.
