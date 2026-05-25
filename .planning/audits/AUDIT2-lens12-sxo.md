# AUDIT2 — Lens 12 (SXO): UX-Flow Audit

**Branch:** audit2-lens-12-sxo  
**Date:** 2026-05-25  
**Auditor:** lens-audit agent (round 2 — fresh general-health pass)  
**Prior audit:** None — Lens 12 (sxo) did not run in round 1.  
**Scope:** `rcode/skills/**/*.md` (86 SKILL.md files), `.rcode/workflows/*.md` (125 workflow files)  
**Lens definition:** Dead-end workflows; AskUserQuestion without cancel/exit; error-exit paths with no recovery; dispatch-table rows pointing to non-existent commands; menus with >8 options; inconsistent banner/echo styles; missing confirmation gates on destructive ops. Reference: Nielsen 10 + WCAG 2.1 AA error-message guidance.

---

## Commands Run

```bash
grep -rln "next up|## Next|## After|what's next|then run.*rcode" rcode/skills/
grep -rL  "## ▶ Next Up|## On Completion|<offer_next>|## Next Up|Next steps:|next steps:" .rcode/workflows/*.md
grep -rn  "AskUserQuestion" .rcode/workflows/*.md (+ cancel/exit filter)
grep -rn  "(future)" rcode/skills/agents/ --include="SKILL.md"
grep -rn  "rcode-raees-dispatch|rcode-majlis-convene*" rcode/skills/ -r (+ SKILLS_INDEX check)
grep -rl  "━━━━|# Workflow:" .rcode/workflows/*.md (banner style inventory)
grep -rn  "Error —|STOP" .rcode/workflows/*.md (recovery-path check)
grep -rn  "Task completed as requested" .rcode/workflows/*.md (boilerplate check)
grep -n   "Proceed|y/n|AskUserQuestion|cancel" .rcode/workflows/remove-phase.md etc.
```

---

## Findings Table

| # | File:Line | Description | Severity |
|---|-----------|-------------|----------|
| 1 | `rcode/skills/agents/zahra-branding/SKILL.md:96-100` | Dispatch table shows 5 of 6 capabilities as `(future)` — user sees BI/TS/CS/DT/BA with skill names like `rcode-zahra-identity` that do not exist | **critical** |
| 2 | `rcode/skills/agents/mariam-marketing/SKILL.md:110-114` | Entire capabilities table (all 5 rows) marked `(future)` — agent presents itself as functional but every dispatch target is unimplemented | **critical** |
| 3 | `rcode/skills/agents/ahmed-hassani-director/SKILL.md:80-84` | All 5 capabilities marked `(future)` — ES/DP/RM/DM/TD target skills do not exist | **critical** |
| 4 | `rcode/skills/agents/nasser-eng-manager/SKILL.md:81-85` | All 5 capabilities marked `(future)` — 1O/HP/GP/BC/SD target skills do not exist | **critical** |
| 5 | `rcode/skills/agents/raees-orchestrator/SKILL.md:54-57` | 4 of 5 capability rows (DP/SQ/PL/HO) point to `rcode-raees-dispatch`, `rcode-raees-sequence`, `rcode-raees-parallel`, `rcode-raees-handoff` — none exist as SKILL.md files or in SKILLS_INDEX. No `(future)` marker. | **critical** |
| 6 | `rcode/skills/agents/majlis-council/SKILL.md:57-61` | All 5 capability rows (CV/CVF/QC/DM/CM) point to `rcode-majlis-convene-real`, `rcode-majlis-convene-fast`, `rcode-majlis-quick`, `rcode-majlis-decision`, `rcode-majlis-crisis` — none exist as SKILL.md files. No `(future)` marker. | **critical** |
| 7 | `rcode/skills/agents/zayd-ml/SKILL.md:87-90` | 4 of 7 capabilities (MB/EV/RG/PE) marked `(future)` — `rcode-ml-build`, `rcode-ml-evaluate`, `rcode-rag-build`, `rcode-prompt-design` do not exist | **warn** |
| 8 | `rcode/skills/agents/yousef-backend/SKILL.md:84-85` | 2 capabilities (DS/AP) marked `(future)` — `rcode-db-schema`, `rcode-api-design` do not exist | **warn** |
| 9 | `rcode/skills/agents/haitham-frontend/SKILL.md:91` | 1 capability (RTL) marked `(future)` — `rcode-rtl-audit` does not exist | **warn** |
| 10 | `rcode/skills/core/rcode-shard-doc/SKILL.md:73-82` | Destructive-action menu presents `[d]` Delete / `[m]` Move / `[k]` Keep with no cancel/exit option. Selecting `d` deletes the source document without a second confirmation gate. | **critical** |
| 11 | `.rcode/workflows/brainstorm.md:57-64` | Method-selection menu presents exactly 8 options with no cancel/exit. User can't abandon brainstorm once invoked without closing the session. | **warn** |
| 12 | `.rcode/workflows/create-epics-and-stories.md:36-48` | 3-option AskUserQuestion ("No PRD found — how to proceed?") has no cancel/exit option. User forced to pick one of 3 paths even if they invoked the command in error. | **warn** |
| 13 | `.rcode/workflows/add-tests.md:162-165` | AskUserQuestion for test location selection has `options: [list discovered locations]` with no cancel/abort path. | **warn** |
| 14 | `.rcode/workflows/autonomous-smart-discuss.md:133-148` | AskUserQuestion "Accept these answers for {Area Name}?" lists Accept/Change Q1..QN/Discuss deeper — no "Skip area" or "Cancel" escape. User is locked into area review. | **warn** |
| 15 | `.rcode/workflows/execute.md:239-240` | `Error — phase directory not found` and `Error — no plans found in phase` are bare STOPs with no recovery command suggested (e.g., `/rcode-plan {N}` to create plans). WCAG 2.1 AA: error messages must explain how to recover. | **warn** |
| 16 | `.rcode/workflows/ship.md:102` | `error — can't create PR` when no git remote is detected. No recovery instruction (e.g., `git remote add origin <url>`). | **warn** |
| 17 | `.rcode/workflows/inbox.md:54` | `error — must be in a git repo with a GitHub remote` — no recovery suggestion. | **warn** |
| 18 | 76 user-facing workflows lack any forward-dispatch footer | 76 of 125 workflow files have no `## ▶ Next Up`, `## On Completion`, `<offer_next>`, or `Next steps:` section. Key examples: `audit.md`, `feature-drift.md`, `check-implementation-readiness.md`, `council.md`, `cleanup.md`, `explore.md`, `diagnose-issues.md`. Nielsen heuristic 3 (User control) and 6 (Recognition over recall). | **warn** |
| 19 | 3 styles for Next Up footer | 32 files use `## ▶ Next Up`, 17 use `## On Completion`, 3 use `<offer_next>` — same concept, three different headings. Inconsistency undermines automated tooling and reader orientation. | **info** |
| 20 | 3 styles for workflow banners | 39 files use `━━━━` unicode banner, 65 use `# Workflow:` heading, 34 use `<purpose>` XML only. 13 workflows mix both `# Workflow:` and `━━━━`. Banner inconsistency makes session starts visually unpredictable. | **info** |
| 21 | `## Error` vs `## On Error` heading | 3 workflows (`create-epics-and-stories.md`, `create-story.md`, `dev-story.md`) use `## Error` while 67 use `## On Error`. Minor inconsistency. | **info** |
| 22 | Boilerplate `## Success Criteria` block in 23 workflows | 23 workflows contain generic `- [ ] Task completed as requested / Output saved or reported / State updated if necessary / No errors encountered` block. 13 of these ALSO have a specific `<success_criteria>` block, making two conflicting success lists. Notable: `debug.md`, `code-review.md`, `undo.md`. | **warn** |
| 23 | `.rcode/workflows/check-implementation-readiness.md` (end) | When result is `BLOCKED`: no forward dispatch to fix-blockers commands. When `READY`: no forward dispatch to `/rcode-execute`. Dead-end flow. | **warn** |
| 24 | `.rcode/workflows/feature-drift.md` (end) | Ends with `<success_criteria>` and `<guardrails>` — no Next Up. User doesn't know what to do after a drift scan. | **warn** |
| 25 | `.rcode/workflows/explore.md` (end) | Socratic ideation workflow ends with `<success_criteria>` — no forward dispatch. Key output is "crystallised ideas" but user isn't told how to proceed (e.g. `/rcode-brainstorm`, `/rcode-create-prd`). | **warn** |
| 26 | `rcode/skills/core/rcode-advanced-elicitation/SKILL.md:28` | Menu shows options `1-5, r, a, x` — no explicit `0` or `cancel` label. The `x` key exits but is labeled "Proceed / No further actions" — ambiguous as "exit without applying". | **info** |
| 27 | `.rcode/workflows/new-project.md:82,132` | Two STOP paths use generic `STOP — do not proceed.` without context about *why* they stop. One (line 132) does include recovery options; line 82 (usage block STOP) is clean. Low severity. | **info** |

---

## Verification Notes

### Critical findings verified

- **Finding 1-4 (ghost agents):** Confirmed by reading capabilities tables in SKILL.md files and cross-referencing against `SKILLS_INDEX.md` and `find rcode/skills -name "SKILL.md"`. `rcode-zahra-identity`, `rcode-mariam-marketing-gtm`, `rcode-engineering-standards`, `rcode-nasser-1on1` etc. all absent from file system.

- **Finding 5-6 (Raees/Majlis dispatch rows):** Confirmed absent from `SKILLS_INDEX.md`. Raees and Majlis implement these modes inline in their workflow sections but the capabilities table presents them as external SKILL invocations, creating false affordance. The `rcode-agent-majlis` reference at Raees:58 also doesn't resolve to a standalone skill.

- **Finding 10 (shard-doc delete without cancel):** Confirmed at `SKILL.md:73-82`. The `(d/m/k)` menu has no `x` / `n` / `cancel` path. The `[k]` Keep option avoids deletion but is not framed as "cancel this action."

- **Finding 18 (76 workflows without forward dispatch):** Cross-checked using grep over `## ▶ Next Up|## On Completion|<offer_next>|Next steps:`. Several flagged workflows (`init.md`, `discuss.md`) were found to have contextual next-step suggestions embedded inside their process steps — these are better than no navigation but still inconsistent with the formal footer pattern.

- **Finding 22 (boilerplate success criteria):** Confirmed with `grep -rn "Task completed as requested" .rcode/workflows/*.md` → 23 hits. The four-line boilerplate was likely scaffolded in and never replaced with task-specific criteria.

### Not flagged (would-be false positives)

- **Majlis 12-agent panel** — 12 is the hard ceiling stated in the workflow (`3 minimum, 12 maximum, 3-8 ideal`). The agent selection is not a user menu — it's algorithmic. Not a cognitive overload finding.
- **`brainstorm.md` 8-method menu** — exactly at the 8-option limit. Flagged as warn (borderline), not critical.
- **`rcode-advanced-elicitation` 5+3 options** — 8 items total (`1-5, r, a, x`), exactly at limit. The `x` exit is present but ambiguously labeled. Flagged as info only.

---

## Overall Status: **FAIL**

### Breakdown by dimension

| Dimension | Status | Count |
|-----------|--------|-------|
| Dead-end workflows (no forward dispatch) | **WARN** | 76 of 125 |
| AskUserQuestion without cancel/exit | **WARN** | 4 instances |
| Error-exit paths with no recovery command | **WARN** | 3 instances |
| Dispatch-table rows → non-existent skills (no future marker) | **CRITICAL** | 9 rows (Raees+Majlis) |
| Dispatch-table rows → skills marked future (presented as live) | **CRITICAL** | 18 rows (4 agents 100% future) |
| Menus >8 options | PASS | 0 (brainstorm at 8 = borderline) |
| Destructive ops without confirmation gate | **CRITICAL** | 1 (shard-doc delete) |
| Inconsistent banner/section styles | **INFO** | 3 styles each for banners, next-up, success |
| Boilerplate success criteria (copy-paste artifacts) | **WARN** | 23 workflows |

---

## Recommendations (prioritised)

### P0 — Fix immediately (user-facing deception)

1. **Mark ALL future capability rows uniformly** — add `(future)` to Raees DP/SQ/PL/HO and ALL Majlis capability rows, OR remove the capabilities table entirely until skills exist. Users activating these agents see a menu of skills that cannot be invoked.

2. **Add cancel option to shard-doc destructive menu** — add `[x]` / `[n] Cancel — keep original at current location` option to prevent accidental deletion.

### P1 — Fix soon (degraded UX)

3. **Add cancel/exit to AskUserQuestion blocks** in `brainstorm.md`, `create-epics-and-stories.md`, `add-tests.md`, `autonomous-smart-discuss.md`. Minimum: add "Cancel — exit without action" or "Skip" option per WCAG 2.1 AA SC 3.3.4.

4. **Add recovery suggestions to bare Error stops** in `execute.md:239-240`, `ship.md:102`, `inbox.md:54`. Each error message should include one concrete recovery command.

5. **Add Next Up footers** to at minimum these key user-facing terminal workflows: `check-implementation-readiness.md`, `feature-drift.md`, `explore.md`, `council.md`, `audit.md`. These are all user-invocable entry points with no exit ramp.

### P2 — Quality improvements

6. **Standardise the Next Up footer** — pick ONE of `## ▶ Next Up`, `## On Completion`, `<offer_next>` and migrate all 49 files that have forward dispatch to use it consistently.

7. **Remove boilerplate success criteria** from 23 workflows — either replace with task-specific criteria or delete the `## Success Criteria` block that says "Task completed as requested."

8. **Standardise banner style** — choose between `━━━━ rcode ►` and `# Workflow:` and apply consistently. The 13 workflows using both are especially disorienting.

---

## Comparison with Prior Audit

No prior Lens 12 (sxo) audit exists — this is the first run. All findings are new.
