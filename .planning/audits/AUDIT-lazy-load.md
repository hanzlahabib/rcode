# Audit: Lazy-Load Conversion Sweep — Unconditional Situational Includes in `rcode/workflows/*.md`

**Scope:** Every `rcode/workflows/*.md` file except `execute.md` (already has the working exemplar pattern this sweep mirrors) and `plan.md` (its equivalent findings were already remediated in Phase 45 — see "Prior work" below).

**Method:** For each `<required_reading>` block (and any other unconditional `@`-include) in every workflow file, prioritizing files over 400 lines per the task brief, cross-checked against the file's own body: does the workflow's actual process ever consult this content? Only converted a candidate to the `${VAR ? '@include' : ''}` ternary-guard pattern after confirming (a) the content is genuinely conditional in practice — some invocations need it, most don't — and (b) a boolean already exists, or can be derived the same way an existing sibling pattern derives it, without inventing an untested new flag.

**Pattern studied:** `execute.md:181-190` gates `auto-init-guard.md`, `output-format.md`, and `karpathy-guidelines.md` behind `${AUTO_CHAINED_FROM_PLAN ? '' : '@include'}` — `AUTO_CHAINED_FROM_PLAN` is empty-string-when-false / set-when-true, so the ternary's JS-truthiness check is correct. `plan.md:49` gates `ui-brand.md` (254 lines) behind `${PHASE_GOAL_HAS_UI ? '@include' : ''}`, where `PHASE_GOAL_HAS_UI` is computed via `grep -iEl "frontend|ui|component|design|style|brand" <phase CONTEXT.md> <ROADMAP.md> | head -1` — empty string when no UI signal found, a file path (truthy) when found. This second pattern is the one mirrored below, since the candidates found are the same reference file (`ui-brand.md`) in a different context.

---

## Prior work this sweep builds on

`.planning/audits/AUDIT-workflow-complexity.md` (2026-07-29) found the same class of bug in `plan.md`/`execute.md` specifically, and Phase 45 (`45-5-SPRINT.md`, tasks 45.5.1–45.5.6) already remediated it: removed two fully-orphaned includes from `plan.md` (`revision-loop.md`, `gate-prompts.md`), extracted six rare-mode sections into sibling reference files gated on `${VAR === 'true' ? '@include' : ''}` (`GAPS_MODE`, `WINDOWS`, `THINKING_PARTNER_ENABLED`, etc.), and deduped the `--auto` chain's required_reading. `45-REVIEW.md` also caught and fixed a real bug in that work: 6 of the 7 new gates originally assigned a literal `"true"`/`"false"` **string** to the bash variable and then tested it with a bare `${VAR ? ... : ''}` — since a non-empty string `"false"` is JS-truthy, that style would have always fired regardless of the flag's actual value. The fix was to compare explicitly: `${VAR === 'true' ? '@include' : ''}`. Both this file's `PHASE_GOAL_HAS_UI` gates below and the pattern being mirrored (`plan.md:49`) use the *other* safe style instead — `VAR` itself is empty-or-path from `grep -l | head -1`, so bare truthiness is correct without a string comparison. This sweep covers the workflow files Phase 45 didn't touch.

---

## Converted (SAFE — ternary guard applied)

### 1. `rcode/workflows/secure-phase.md` — `ui-brand.md` (254 lines / ~2,300 tokens)

**Before:** `<required_reading>` unconditionally `@`-included `.rcode/references/ui-brand.md` — an 8-dimension UI/brand design-questioning guide (color palette, typography, voice/tone, accessibility, component inventory, responsive behavior, interaction patterns, visual hierarchy).

**Verified irrelevant to this file's actual process:** `secure-phase.md` is a pure security-threat-mitigation-verification workflow — it reads a SPRINT.md threat register, classifies threats CLOSED/OPEN, spawns `rcode-security-auditor`, and writes SECURITY.md. Read the file end-to-end (all 8 steps, both success-criteria blocks): zero mentions of color, typography, brand, or any UI concept. This is the exact same shape as the *already-gated* case in `plan.md` — same reference file, same 254-line cost — just missing the gate.

**Fix applied:**
- Added, in Step 0 (`## 0. Initialize`, where `phase_number` is already parsed), a new computed flag reusing `plan.md:103-105`'s exact grep:
  ```bash
  # Detect UI signals in phase goal + CONTEXT.md to decide whether to load ui-brand.md (254 lines)
  PHASE_GOAL_HAS_UI=$(grep -iEl "frontend|ui|component|design|style|brand" \
    .planning/phases/*${phase_number}*/*-CONTEXT.md \
    .planning/ROADMAP.md 2>/dev/null | head -1)
  ```
- Changed `required_reading` to `${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}`.

**Why this is safe, not a silent feature removal:** the flag is the identical detector `plan.md` already trusts to decide UI-relevance for the same phase. If a phase's own CONTEXT.md/ROADMAP.md entry mentions UI/frontend/design/brand, `/rcode-secure-phase` on that phase still gets `ui-brand.md` — e.g., a security auditor checking a UI phase for XSS/CSP issues arguably benefits from knowing the declared design system. For the overwhelming majority of phases (backend, infra, data, non-UI features), the flag is empty and the 254 lines never load.

### 2. `rcode/workflows/validate-phase.md` — `ui-brand.md` (254 lines / ~2,300 tokens)

Identical situation and identical fix. `validate-phase.md` is a pure Nyquist test-coverage-gap workflow (requirement→test mapping, COVERED/PARTIAL/MISSING classification, spawns `rcode-nyquist-auditor`, writes VALIDATION.md) with zero UI/brand content anywhere in its process. Added the same `PHASE_GOAL_HAS_UI` computation to Step 0 and the same ternary guard, preserving `karpathy-guidelines.md` (genuinely core — cited nowhere as conditional) as the second unconditional include.

**Combined estimated savings for the common case:** most phases carry no UI/frontend/design/brand signal in their CONTEXT.md or ROADMAP.md entry (backend, infra, data-pipeline, and cross-cutting phases dominate a typical roadmap). For those phases, running both `/rcode-secure-phase` and `/rcode-validate-phase` — the standard pre-ship gate pair — previously loaded `ui-brand.md` twice, unconditionally: **~508 lines / ~4,600 tokens per phase** that are now skipped entirely. UI-flagged phases see no change — they still get the file, exactly as before.

---

## Rejected candidates (found, investigated, not converted)

### 3. `rcode/workflows/autonomous.md` — `workstream-flag.md` (166 lines)

Unconditionally `@`-included in `required_reading`, but grepping the entire file for `workspace|workstream|RCODE_WS` turns up **only the include line itself** — nothing in `autonomous.md`'s own process (prerequisite check, phase-loop, `--from`/`--to`/`--only`/`--interactive` argument parsing) ever branches on workspace mode. `workstream-flag.md`'s actual content — "when to use `--workspace` vs. sequential `.planning/phases/`" — documents a decision made *before* invoking `/rcode-autonomous`, not something this workflow's own execution ever consults.

**Why not gated:** there is no existing computed flag in this file that distinguishes a workspace-scoped run from a sequential one (unlike `PHASE_GOAL_HAS_UI`, which `plan.md` already computes and trusts). Fabricating a fresh `--workspace` check in `$ARGUMENTS` here would be inventing a new bash variable the rest of the file doesn't use or forward anywhere — exactly what the task brief warned against ("do not invent new bash variables carelessly"). This reads as the same class of bug the original `AUDIT-workflow-complexity.md` Finding 1 flagged in `plan.md` (orphaned/leftover reference, not a genuinely conditional one) rather than a lazy-load candidate — the correct fix is removing the include, not gating it, mirroring the precedent set by Phase 45 task 45.5.3. Left untouched — out of scope for a ternary-guard sweep; flagging for a future cleanup pass.

### 4. `rcode/workflows/plan-milestone.md` — `revision-loop.md` (38 lines)

Same bug class as #3, and in fact the identical reference file the original audit already flagged as orphaned in `plan.md` (and Phase 45 already removed from `plan.md` for that reason). `revision-loop.md` documents a generic council-review process (Accept/Counter/Defer triage, "three revisions is the soft cap," output to a `PLAN.md` "Revision history" section). `plan-milestone.md`'s actual revision mechanism (step 3b) is different in every particular: "max 2 revision rounds per phase," driven by `rcode-sprint-checker`'s `CHECK.md` verdict, writing `SPRINT.md` — not `PLAN.md`. No flag makes `revision-loop.md`'s content applicable here; it's wrong, not situational. Not converted — same reasoning as #3 (removal, not gating, is the correct fix; out of scope here).

### 5. `execute.md` — `SPRINT_HAS_CHECKPOINT` (informational, not a fix — outside this sweep's file set)

While studying the exemplar pattern per the task brief, found that `execute.md:259` computes `SPRINT_HAS_CHECKPOINT=$(grep -rl "checkpoint" "${phase_dir}"/*-SPRINT.md ... | head -1)` with a comment claiming it's "used to lazy-load checkpoints.md" — but grepping the rest of `execute.md` shows this variable is **never referenced again** after being computed; no ternary consumes it, and `checkpoints.md` is only ever mentioned as a prose pointer ("See `.rcode/references/checkpoints.md` for details") inside `execute-sprint.md:456`, which isn't an `@`-include at all. This is dead code (a partially-wired guard, not a functioning one) — but it lives in `execute.md`, which this task explicitly treats as the reference exemplar rather than a sweep target, so it's noted here for visibility and left unmodified.

### 6. Verified core / NOT situational (checked, correctly left unconditional)

- `rcode/workflows/explore.md` — `questioning.md` + `domain-probes.md`: actively driven by the file's own Socratic-conversation flow and success criteria (`explore.md:57,149`) — every invocation uses both. Core, not gated.
- `rcode/workflows/discuss-phase.md` — `discuss-phase-discuss-areas.md` (275 lines): this is the core "discuss areas" step in the main sequential flow of every `/rcode-discuss-phase` run (between `advisor_research` and `write_context`), not an optional mode. Core, not gated.
- `rcode/workflows/sprint-planning.md` / `rcode/workflows/autonomous.md` — `no-autonomous-bypass.md`, `state-sync-rule.md`: both cited by number (`#198`, `#224`) as always-applicable safety rules for any workflow that writes `.planning/` artifacts or SPRINT.md. Core, not gated.
- `rcode/workflows/new-project.md` — `new-project-research-decision.md`, `new-project-define-requirements.md`, `new-project-create-roadmap.md`: three sequential steps of one linear onboarding run (all three always execute once per `/rcode-new-project` invocation), split into sibling files for file-size hygiene, not for conditional relevance. Matches the "explicitly NOT flagged" precedent in `AUDIT-workflow-complexity.md` for `execute-waves.md`. Core, not gated.
- `rcode/workflows/execute-waves.md`, `execute-sprint.md`'s deviation/checkpoint/TDD sections, `execute-regression-gates.md`'s schema-drift gate — already adjudicated load-bearing by the prior audit; re-confirmed, not re-litigated here.

---

## Summary

| File | Include | Lines | Status |
|---|---|---|---|
| `secure-phase.md` | `ui-brand.md` | 254 | **Converted** — gated on `PHASE_GOAL_HAS_UI` |
| `validate-phase.md` | `ui-brand.md` | 254 | **Converted** — gated on `PHASE_GOAL_HAS_UI` |
| `autonomous.md` | `workstream-flag.md` | 166 | Rejected — orphaned, not conditional; no safe flag to gate on |
| `plan-milestone.md` | `revision-loop.md` | 38 | Rejected — orphaned/wrong content, not conditional |
| `execute.md` | `SPRINT_HAS_CHECKPOINT` | n/a | Informational — dead/unwired guard, out of this sweep's scope |

**Estimated token savings for the common case:** ~4,600 tokens per phase (both `/rcode-secure-phase` and `/rcode-validate-phase` run once, on a non-UI-flagged phase) — the majority case across a typical multi-phase roadmap. Zero behavior change for UI-flagged phases; zero risk of the ternary always-firing (verified against the `"true"`/`"false"`-string bug Phase 45's review caught, by using the same empty-string-or-path style as `plan.md:49` rather than a boolean-string comparison).
