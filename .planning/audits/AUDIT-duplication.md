# AUDIT — Cross-Command Reference Duplication Sweep

**Scope:** every `@`-include (or `.rcode/references/...` required-reading line) across
`rcode/workflows/*.md`, `rcode/skills/**/*.md`, and `rcode/agents/*.md`.

**Method:** grep every line matching `^@[...].(md|csv|yaml)` across the three surfaces,
build a reverse index (referenced file → distinct including files), rank by
`waste = referenced_file_line_count × (including_files - 1)` — the number of
lines of duplicated content the invocation surface pays for on top of the first,
"free" load. 355 include edges found, from 175 distinct including files, pointing
at 98 distinct target files.

---

## Reverse-index ranking (top duplication cost)

| Rank | Waste (lines) | File lines | # includers | Referenced file |
|------|---------------|------------|-------------|------------------|
| 1 | 8358 | 398 | 22 | `rcode/references/output-format.md` |
| 2 | 3159 | 81 | 40 | `rcode/references/response-style.md` |
| 3 | 1276 | 11 | 117 | `rcode/references/karpathy-guidelines.md` |
| 4 | 1140 | 76 | 16 | `rcode/references/codebase-grounding.md` |
| 5 | 1022 | 73 | 15 | `rcode/references/no-unauthorized-git-ops.md` |
| 6 | 790 | 79 | 11 | `rcode/references/karpathy-guidelines-full.md` |
| 7 | 621 | 621 | 2 | `rcode/references/common-bug-patterns.md` |
| 8 | 612 | 612 | 2 | `rcode/references/verification-patterns.md` |
| 9 | 468 | 117 | 5 | `rcode/references/auto-init-guard.md` |
| 10 | 455 | 91 | 6 | `rcode/references/auditor-shared-checklists.md` |
| 11 | 435 | 87 | 6 | `rcode/references/agent-shared-rules.md` |
| 12 | 375 | 125 | 4 | `rcode/references/commit-conventions.md` |
| 13 | 351 | 117 | 4 | `rcode/references/git-preflight.md` |
| 14 | 261 | 87 | 4 | `rcode/references/researcher-shared.md` |
| 15 | 254 | 254 | 2 | `rcode/references/ui-brand.md` |
| 16 | 186 | 186 | 2 | `rcode/references/verb-dictionary.md` |
| 17 | 166 | 166 | 2 | `rcode/references/workstream-flag.md` |
| 18 | 156 | 52 | 4 | `rcode/references/output-realism.md` |
| 19 | 122 | 61 | 3 | `rcode/references/persona-engineer-shared.md` |
| 20 | 112 | 56 | 3 | `rcode/brain/best-practices/no-theoretical-suggestions.md` |
| 21 | 106 | 53 | 3 | `rcode/references/checklist-story-draft.md` |
| 22 | 85 | 85 | 2 | `rcode/references/iterative-retrieval.md` |
| 23 | 75 | 75 | 2 | `rcode/references/checklist-story-dod.md` |
| 24 | 62 | 62 | 2 | `rcode/references/command-redirect-format.md` |
| 25 | 43 | 43 | 2 | `rcode/brain/best-practices/state-sync-rule.md` |
| 26 | 37 | 37 | 2 | `rcode/brain/best-practices/no-autonomous-bypass.md` |

**Reading this table:** `output-format.md` and `response-style.md` top the list purely on
fan-out (22 and 40 legitimate consumers respectively) — every consumer genuinely needs the
full content (there is no lighter alternative for either, see below), so this is *expected*
duplication inherent to the shared-reference architecture, not a bug. `karpathy-guidelines.md`
ranks #3 despite being only 11 lines because it has 117 includers — the highest fan-out of
any reference file in the repo.

---

## Finding 1 (FIXED) — `karpathy-guidelines-full.md` loaded by 7 audit-only agents that never need it

`rcode/references/karpathy-guidelines.md` (11 lines) is the quick-reference version of the
same four Karpathy principles that `karpathy-guidelines-full.md` (79 lines) documents in
detail. The full version's only additional content, beyond the four principles themselves
(which the short version already states verbatim), is a **"rcode application" paragraph per
principle** tying each constraint to code-*writing* agents (`rcode-planner`, `rcode-executor`,
`rcode-review`), plus an explicit **Enforcement** section (lines 70–75 of the full file)
naming exactly which agents "must @-include this file": `rcode-executor`, `rcode-planner`,
`rcode-noor`, and `rcode-codebase-mapper` ("when producing code docs").

Before this fix, 11 agents loaded the full version. Cross-checking against each agent's own
`tools:` frontmatter line (source of truth, not the description text) showed 7 of them have
**no `Write` or `Edit` tool at all** — they are read-only audit/review/verification agents
that can never act on the "rcode application" notes because they never touch code:

| Agent | Tools (frontmatter) | Verdict |
|---|---|---|
| `rcode-code-reviewer` | Read, Grep, Glob, Bash | audit-only → **swapped to short** |
| `rcode-docs-auditor` | Read, Grep, Glob, Bash | audit-only → **swapped to short** |
| `rcode-edge-case-hunter` | Read, Grep, Glob, Bash, WebFetch | audit-only → **swapped to short** |
| `rcode-security-adversary` | Read, Grep, Glob, Bash, WebFetch, WebSearch | audit-only → **swapped to short** |
| `rcode-security-auditor` | Read, Grep, Glob, Bash, WebFetch, WebSearch | audit-only → **swapped to short** |
| `rcode-sprint-checker` | Read, Bash, Glob, Grep | audit-only → **swapped to short** |
| `rcode-verifier` | Read, Write, Bash, Grep, Glob | writes VERIFICATION.md only, never code → **swapped to short** |
| `rcode-executor` | Read, Write, Edit, Bash, Grep, Glob | writes/edits code, named in Enforcement → **kept full** |
| `rcode-planner` | Read, Write, Bash, Glob, Grep, WebFetch | named in Enforcement → **kept full** |
| `rcode-codebase-mapper` | Read, Bash, Grep, Glob, Write | conditionally named in Enforcement ("when producing code docs") → **kept full** (not a clean swap — ambiguous per the file's own text) |
| `rcode-nyquist-auditor` | Read, Grep, Glob, Bash, Write, Edit | generates test *code* despite the "auditor" name → **kept full** |

**Applied fix:** swapped `@.rcode/references/karpathy-guidelines-full.md` →
`@.rcode/references/karpathy-guidelines.md` in the 7 files listed above. Single-line change
per file, no other content touched. Verified post-edit that all 7 now reference the short
path and the 4 excluded agents are unchanged.

**Estimated savings:** 7 agents × (79 − 11) = **476 lines removed from the duplicated-content
surface**, paid on every invocation of those 7 agent types going forward. At the file-size
ranking above, this drops `karpathy-guidelines-full.md`'s consumer count from 11 → 4, and its
own waste contribution from 790 → 79×3=237 lines.

---

## Finding 2 (NOT FIXED — recommendation only) — orphaned `-index.md` reference files

`rcode/references/` contains three genuine full/quick pairs using an `-index` naming
convention (not `-full`/`-quick`, which is why a filename-only grep for those hint strings
missed them):

| Full file | Lines | Index file | Lines | Index consumers |
|---|---|---|---|---|
| `common-bug-patterns.md` | 621 | `common-bug-patterns-index.md` | 44 | **0** |
| `verification-patterns.md` | 612 | `verification-patterns-index.md` | 76 | **0** |
| `checkpoints.md` | 778 | `checkpoints-index.md` | 53 | **0** |

All three `-index.md` files are self-contained quick-triage docs (verified by reading
`common-bug-patterns-index.md` in full: pattern categories + "How to Use" + an explicit
pointer to the full file for "complete examples with 30+ patterns, code snippets"). None of
them is referenced anywhere in the repo — not via `@`-include, not via prose, not via any
lazy-load conditional. They are dead weight sitting alongside files that already exist.

**Why this was NOT swapped as a "safe fix":** unlike the karpathy pair, the actual consumers
of the full versions are agents whose entire job is to use the detailed content:

- `common-bug-patterns.md` is loaded by `rcode-debugger.md` and `workflows/diagnose-issues.md`
  — a debugger's job is exactly to pattern-match against detailed manifestation/detection/fix
  examples. Swapping to the 44-line index would measurably weaken its hypothesis quality, not
  just trim boilerplate the agent never uses (the karpathy case).
- `verification-patterns.md` is loaded by `workflows/diagnose-issues.md` and
  `workflows/verify-phase.md` — same reasoning, exhaustive goal-verification needs the full
  pattern set.

This is a real duplication finding — the light alternative exists but nothing in the
invocation surface uses it — but fixing it correctly requires a *design* decision (should
these workflows read the index first and escalate to the full file only when the index
doesn't resolve the issue, mirroring the tiered pattern `execute-waves.md` already uses for
`checkpoints.md` — see below), not a blind grep-and-replace. Flagging for a follow-up
phase/ticket rather than applying inline.

**Positive counter-example already in the codebase:** `checkpoints.md` (778 lines, the
largest reference file in the repo) has **zero static `@`-include consumers** — it's
conditionally loaded via a template expression in `rcode/workflows/execute-waves.md:223-224`:
```
<!-- checkpoints.md (778 lines) loaded only when a task contains "checkpoint" or a prior wave failed -->
${SPRINT_HAS_CHECKPOINT || PRIOR_WAVE_FAILED ? '@.rcode/references/checkpoints.md' : ''}
```
This is exactly the lazy-load pattern that would fix Finding 2's three orphaned index files
properly (index-first, escalate-to-full-on-demand) — the codebase already has one working
precedent for it, it just hasn't been applied to `common-bug-patterns.md` /
`verification-patterns.md`.

---

## Finding 3 (checked, no other pairs found) — filename sweep for other light/heavy pairs

Searched `rcode/references/` and `rcode/skills/` for `-full`, `-quick`, `-lite`, `summary`,
`-short`, `-long`, `-detailed`, `-brief` filename hints. Only `karpathy-guidelines-full.md`
matched a genuine duplicate-content pair (Finding 1). The other hits
(`rcode-product-brief/`, `step-02c-executive-summary.md`,
`step-v-04-brief-coverage-validation.md`, `seo/seo-content-factory/templates/content-brief.md`)
are single-purpose files with no full/short counterpart — false positives on the naming
heuristic, not duplication.

---

## Summary

| Item | Status |
|---|---|
| 7 agents swapped `karpathy-guidelines-full.md` → `karpathy-guidelines.md` | **Fixed** — 476 lines/invocation saved |
| 3 orphaned `-index.md` reference files (2076 lines of full content behind them, unused lighter alternatives) | **Flagged**, not fixed — needs a lazy-load design decision, not a blind swap |
| `output-format.md` (398 lines × 22 consumers) and `response-style.md` (81 × 40) are the two largest duplication costs in the repo | **Flagged, expected** — no lighter alternative exists; every consumer needs the full content |

## Files changed

- `rcode/agents/rcode-code-reviewer.md`
- `rcode/agents/rcode-docs-auditor.md`
- `rcode/agents/rcode-edge-case-hunter.md`
- `rcode/agents/rcode-security-adversary.md`
- `rcode/agents/rcode-security-auditor.md`
- `rcode/agents/rcode-sprint-checker.md`
- `rcode/agents/rcode-verifier.md`
