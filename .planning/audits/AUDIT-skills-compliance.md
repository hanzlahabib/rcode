# Skills 5-Component Compliance Audit

**Date:** 2026-05-28
**Branch:** audit-skills-compliance
**Total skills audited:** 87

## Summary

| Score | Count |
|------:|------:|
| 5/5 | 86 |
| 4/5 | 0 |
| 3/5 | 1 |
| 2/5 | 0 |
| 1/5 | 0 |
| 0/5 | 0 |

- Skills with trigger count outside 5–12 range: **26**
- Skills missing `Do NOT use for:` negative boundary in YAML description: **45**
- Mirror at `.rcode/skills/`: **MISSING ENTIRELY** — `.rcode/` exists but has no `skills/` subdir. The install pipeline owns this sync; flagged as a follow-up.

## Compliance Matrix

| Skill | Path | Score | Missing | Triggers | Neg Boundary | Severity |
|-------|------|------:|---------|---------:|:------------:|:--------:|
| rcode-herdr-orchestration | `actions/4-implementation/rcode-herdr-orchestration/SKILL.md` | 3/5 | output_format, examples | triggers<5(0) | ✗ | P1 |
| ahmed-hassani-director | `agents/ahmed-hassani-director/SKILL.md` | 5/5 | — | 12 | ✓ | OK |
| dalil-scout | `agents/dalil-scout/SKILL.md` | 5/5 | — | 10 | ✓ | OK |
| fatima-qa | `agents/fatima-qa/SKILL.md` | 5/5 | — | 12 | ✓ | OK |
| haitham-frontend | `agents/haitham-frontend/SKILL.md` | 5/5 | — | triggers>12(14) | ✓ | OK |
| hanzla-engineer | `agents/hanzla-engineer/SKILL.md` | 5/5 | — | triggers>12(13) | ✓ | OK |
| hussain-pm | `agents/hussain-pm/SKILL.md` | 5/5 | — | triggers>12(13) | ✓ | OK |
| hussain-sm | `agents/hussain-sm/SKILL.md` | 5/5 | — | triggers>12(13) | ✓ | OK |
| layla-designer | `agents/layla-designer/SKILL.md` | 5/5 | — | triggers>12(16) | ✓ | OK |
| majlis-council | `agents/majlis-council/SKILL.md` | 5/5 | — | triggers>12(14) | ✗ | OK |
| mariam-marketing | `agents/mariam-marketing/SKILL.md` | 5/5 | — | triggers>12(15) | ✓ | OK |
| nasser-eng-manager | `agents/nasser-eng-manager/SKILL.md` | 5/5 | — | triggers>12(14) | ✗ | OK |
| noor-writer | `agents/noor-writer/SKILL.md` | 5/5 | — | triggers>12(15) | ✓ | OK |
| raees-orchestrator | `agents/raees-orchestrator/SKILL.md` | 5/5 | — | 12 | ✓ | OK |
| rcode-advanced-elicitation | `core/rcode-advanced-elicitation/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-auth-audit | `core/rcode-auth-audit/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-brainstorming | `core/rcode-brainstorming/SKILL.md` | 5/5 | — | 10 | ✓ | OK |
| rcode-browser-verify | `actions/4-implementation/rcode-browser-verify/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-check-implementation-readiness | `actions/3-solutioning/rcode-check-implementation-readiness/SKILL.md` | 5/5 | — | 6 | ✗ | OK |
| rcode-checkpoint-preview | `actions/4-implementation/rcode-checkpoint-preview/SKILL.md` | 5/5 | — | 6 | ✗ | OK |
| rcode-ci | `actions/4-implementation/rcode-ci/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-client-gate | `core/rcode-client-gate/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-clone-website | `core/rcode-clone-website/SKILL.md` | 5/5 | — | 12 | ✓ | OK |
| rcode-code-review | `actions/4-implementation/rcode-code-review/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-correct-course | `actions/4-implementation/rcode-correct-course/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-create-architecture | `actions/3-solutioning/rcode-create-architecture/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-create-epics-and-stories | `actions/2-plan/rcode-create-epics-and-stories/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-create-milestone | `actions/2-plan/rcode-create-milestone/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-create-prd | `actions/2-plan/rcode-create-prd/SKILL.md` | 5/5 | — | 7 | ✓ | OK |
| rcode-create-story | `actions/2-plan/rcode-create-story/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-create-ux-design | `actions/2-plan/rcode-create-ux-design/SKILL.md` | 5/5 | — | 6 | ✗ | OK |
| rcode-cross-platform-auditor | `agents/rcode-cross-platform-auditor/SKILL.md` | 5/5 | — | 5 | ✗ | OK |
| rcode-debug | `actions/4-implementation/rcode-debug/SKILL.md` | 5/5 | — | triggers<5(0) | ✗ | OK |
| rcode-dep-auditor | `agents/rcode-dep-auditor/SKILL.md` | 5/5 | — | 5 | ✗ | OK |
| rcode-deploy-unify | `core/rcode-deploy-unify/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-dev-story | `actions/4-implementation/rcode-dev-story/SKILL.md` | 5/5 | — | 6 | ✗ | OK |
| rcode-deviation-analyzer | `agents/rcode-deviation-analyzer/SKILL.md` | 5/5 | — | 12 | ✓ | OK |
| rcode-distillator | `core/rcode-distillator/SKILL.md` | 5/5 | — | triggers<5(4) | ✗ | OK |
| rcode-document-project | `actions/1-analysis/rcode-document-project/SKILL.md` | 5/5 | — | 5 | ✗ | OK |
| rcode-domain-research | `actions/1-analysis/research/rcode-domain-research/SKILL.md` | 5/5 | — | 5 | ✓ | OK |
| rcode-edit-prd | `actions/2-plan/rcode-edit-prd/SKILL.md` | 5/5 | — | 5 | ✓ | OK |
| rcode-editorial-review-prose | `core/rcode-editorial-review-prose/SKILL.md` | 5/5 | — | triggers<5(1) | ✗ | OK |
| rcode-editorial-review-structure | `core/rcode-editorial-review-structure/SKILL.md` | 5/5 | — | 5 | ✗ | OK |
| rcode-frontend-design | `actions/2-plan/rcode-frontend-design/SKILL.md` | 5/5 | — | triggers>12(17) | ✓ | OK |
| rcode-generate-project-context | `actions/3-solutioning/rcode-generate-project-context/SKILL.md` | 5/5 | — | 5 | ✓ | OK |
| rcode-git-flow | `actions/4-implementation/rcode-git-flow/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-harden | `actions/4-implementation/rcode-harden/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-help | `core/rcode-help/SKILL.md` | 5/5 | — | triggers<5(0) | ✗ | OK |
| rcode-i18n-auditor | `agents/rcode-i18n-auditor/SKILL.md` | 5/5 | — | 6 | ✗ | OK |
| rcode-incident-record | `core/rcode-incident-record/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-incremental | `actions/4-implementation/rcode-incremental/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-index-docs | `core/rcode-index-docs/SKILL.md` | 5/5 | — | triggers<5(1) | ✗ | OK |
| rcode-init | `core/rcode-init/SKILL.md` | 5/5 | — | triggers<5(1) | ✗ | OK |
| rcode-init | `rcode-init/SKILL.md` | 5/5 | — | triggers<5(1) | ✗ | OK |
| rcode-market-research | `actions/1-analysis/research/rcode-market-research/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-memory-audit | `core/rcode-memory-audit/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-memory-distill | `core/rcode-memory-distill/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-memory-init | `core/rcode-memory-init/SKILL.md` | 5/5 | — | 7 | ✓ | OK |
| rcode-memory-update | `core/rcode-memory-update/SKILL.md` | 5/5 | — | 7 | ✓ | OK |
| rcode-migrate | `actions/4-implementation/rcode-migrate/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-mvp-graduate | `core/rcode-mvp-graduate/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-observability-auditor | `agents/rcode-observability-auditor/SKILL.md` | 5/5 | — | 5 | ✗ | OK |
| rcode-ocr-consistency | `core/rcode-ocr-consistency/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-party-mode | `core/rcode-party-mode/SKILL.md` | 5/5 | — | 9 | ✓ | OK |
| rcode-perf | `actions/4-implementation/rcode-perf/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-prfaq | `actions/1-analysis/rcode-prfaq/SKILL.md` | 5/5 | — | 6 | ✗ | OK |
| rcode-product-brief | `actions/1-analysis/rcode-product-brief/SKILL.md` | 5/5 | — | 5 | ✗ | OK |
| rcode-prove-it | `actions/4-implementation/rcode-prove-it/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-qa-generate-e2e-tests | `actions/4-implementation/rcode-qa-generate-e2e-tests/SKILL.md` | 5/5 | — | 5 | ✓ | OK |
| rcode-rebrand | `core/rcode-rebrand/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-retrospective | `actions/4-implementation/rcode-retrospective/SKILL.md` | 5/5 | — | 5 | ✓ | OK |
| rcode-review-adversarial-general | `core/rcode-review-adversarial-general/SKILL.md` | 5/5 | — | triggers<5(1) | ✗ | OK |
| rcode-review-edge-case-hunter | `core/rcode-review-edge-case-hunter/SKILL.md` | 5/5 | — | triggers<5(0) | ✗ | OK |
| rcode-scaffold-project | `actions/4-implementation/rcode-scaffold-project/SKILL.md` | 5/5 | — | 9 | ✓ | OK |
| rcode-shard-doc | `core/rcode-shard-doc/SKILL.md` | 5/5 | — | triggers<5(1) | ✗ | OK |
| rcode-source-truth | `actions/4-implementation/rcode-source-truth/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-sprint-planning | `actions/4-implementation/rcode-sprint-planning/SKILL.md` | 5/5 | — | 5 | ✓ | OK |
| rcode-sprint-status | `actions/4-implementation/rcode-sprint-status/SKILL.md` | 5/5 | — | 5 | ✓ | OK |
| rcode-technical-research | `actions/1-analysis/research/rcode-technical-research/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| rcode-theme-system | `core/rcode-theme-system/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-trim | `actions/4-implementation/rcode-trim/SKILL.md` | 5/5 | — | 8 | ✗ | OK |
| rcode-validate-prd | `actions/2-plan/rcode-validate-prd/SKILL.md` | 5/5 | — | 6 | ✓ | OK |
| sadiq-analyst | `agents/sadiq-analyst/SKILL.md` | 5/5 | — | triggers>12(15) | ✓ | OK |
| waleed-architect | `agents/waleed-architect/SKILL.md` | 5/5 | — | triggers>12(14) | ✓ | OK |
| yousef-backend | `agents/yousef-backend/SKILL.md` | 5/5 | — | triggers>12(17) | ✓ | OK |
| zahra-branding | `agents/zahra-branding/SKILL.md` | 5/5 | — | triggers>12(16) | ✗ | OK |
| zayd-ml | `agents/zayd-ml/SKILL.md` | 5/5 | — | triggers>12(18) | ✓ | OK |

## Findings by Severity

### P0 — Skills missing structural components (need real authoring)


### P1 — Skills at score 3/5

- **`rcode-herdr-orchestration`** (`rcode/skills/actions/4-implementation/rcode-herdr-orchestration/SKILL.md`) — missing: output_format, examples. Skeleton `## Output Format` and `## Examples` will be added in this audit pass; bodies need real authoring as follow-up.

### P2 — Skills missing YAML negative boundary (`Do NOT use for:`)

These skills have all 5 structural components but their YAML `description:` does not state what the skill is NOT for. Most have prose negatives in the body (e.g. "When NOT to use this skill" sections) — promoting them into YAML requires authoring judgment per skill and is NOT applied mechanically in this pass.

- `majlis-council` (`rcode/skills/agents/majlis-council/SKILL.md`)
- `nasser-eng-manager` (`rcode/skills/agents/nasser-eng-manager/SKILL.md`)
- `rcode-advanced-elicitation` (`rcode/skills/core/rcode-advanced-elicitation/SKILL.md`)
- `rcode-auth-audit` (`rcode/skills/core/rcode-auth-audit/SKILL.md`)
- `rcode-browser-verify` (`rcode/skills/actions/4-implementation/rcode-browser-verify/SKILL.md`)
- `rcode-check-implementation-readiness` (`rcode/skills/actions/3-solutioning/rcode-check-implementation-readiness/SKILL.md`)
- `rcode-checkpoint-preview` (`rcode/skills/actions/4-implementation/rcode-checkpoint-preview/SKILL.md`)
- `rcode-ci` (`rcode/skills/actions/4-implementation/rcode-ci/SKILL.md`)
- `rcode-client-gate` (`rcode/skills/core/rcode-client-gate/SKILL.md`)
- `rcode-create-ux-design` (`rcode/skills/actions/2-plan/rcode-create-ux-design/SKILL.md`)
- `rcode-cross-platform-auditor` (`rcode/skills/agents/rcode-cross-platform-auditor/SKILL.md`)
- `rcode-debug` (`rcode/skills/actions/4-implementation/rcode-debug/SKILL.md`)
- `rcode-dep-auditor` (`rcode/skills/agents/rcode-dep-auditor/SKILL.md`)
- `rcode-deploy-unify` (`rcode/skills/core/rcode-deploy-unify/SKILL.md`)
- `rcode-dev-story` (`rcode/skills/actions/4-implementation/rcode-dev-story/SKILL.md`)
- `rcode-distillator` (`rcode/skills/core/rcode-distillator/SKILL.md`)
- `rcode-document-project` (`rcode/skills/actions/1-analysis/rcode-document-project/SKILL.md`)
- `rcode-editorial-review-prose` (`rcode/skills/core/rcode-editorial-review-prose/SKILL.md`)
- `rcode-editorial-review-structure` (`rcode/skills/core/rcode-editorial-review-structure/SKILL.md`)
- `rcode-git-flow` (`rcode/skills/actions/4-implementation/rcode-git-flow/SKILL.md`)
- `rcode-harden` (`rcode/skills/actions/4-implementation/rcode-harden/SKILL.md`)
- `rcode-help` (`rcode/skills/core/rcode-help/SKILL.md`)
- `rcode-herdr-orchestration` (`rcode/skills/actions/4-implementation/rcode-herdr-orchestration/SKILL.md`)
- `rcode-i18n-auditor` (`rcode/skills/agents/rcode-i18n-auditor/SKILL.md`)
- `rcode-incident-record` (`rcode/skills/core/rcode-incident-record/SKILL.md`)
- `rcode-incremental` (`rcode/skills/actions/4-implementation/rcode-incremental/SKILL.md`)
- `rcode-index-docs` (`rcode/skills/core/rcode-index-docs/SKILL.md`)
- `rcode-init` (`rcode/skills/core/rcode-init/SKILL.md`)
- `rcode-init` (`rcode/skills/rcode-init/SKILL.md`)
- `rcode-migrate` (`rcode/skills/actions/4-implementation/rcode-migrate/SKILL.md`)
- `rcode-mvp-graduate` (`rcode/skills/core/rcode-mvp-graduate/SKILL.md`)
- `rcode-observability-auditor` (`rcode/skills/agents/rcode-observability-auditor/SKILL.md`)
- `rcode-ocr-consistency` (`rcode/skills/core/rcode-ocr-consistency/SKILL.md`)
- `rcode-perf` (`rcode/skills/actions/4-implementation/rcode-perf/SKILL.md`)
- `rcode-prfaq` (`rcode/skills/actions/1-analysis/rcode-prfaq/SKILL.md`)
- `rcode-product-brief` (`rcode/skills/actions/1-analysis/rcode-product-brief/SKILL.md`)
- `rcode-prove-it` (`rcode/skills/actions/4-implementation/rcode-prove-it/SKILL.md`)
- `rcode-rebrand` (`rcode/skills/core/rcode-rebrand/SKILL.md`)
- `rcode-review-adversarial-general` (`rcode/skills/core/rcode-review-adversarial-general/SKILL.md`)
- `rcode-review-edge-case-hunter` (`rcode/skills/core/rcode-review-edge-case-hunter/SKILL.md`)
- `rcode-shard-doc` (`rcode/skills/core/rcode-shard-doc/SKILL.md`)
- `rcode-source-truth` (`rcode/skills/actions/4-implementation/rcode-source-truth/SKILL.md`)
- `rcode-theme-system` (`rcode/skills/core/rcode-theme-system/SKILL.md`)
- `rcode-trim` (`rcode/skills/actions/4-implementation/rcode-trim/SKILL.md`)
- `zahra-branding` (`rcode/skills/agents/zahra-branding/SKILL.md`)

### P2 — Skills outside 5–12 trigger phrase range

Counted as the max of (quoted phrases in `description:`) OR (items under the `triggers:` YAML list). Adjusting these requires authoring decisions about which trigger phrases are essential — flagged for follow-up, not auto-edited.

- `haitham-frontend` — triggers>12(14)
- `hanzla-engineer` — triggers>12(13)
- `hussain-pm` — triggers>12(13)
- `hussain-sm` — triggers>12(13)
- `layla-designer` — triggers>12(16)
- `majlis-council` — triggers>12(14)
- `mariam-marketing` — triggers>12(15)
- `nasser-eng-manager` — triggers>12(14)
- `noor-writer` — triggers>12(15)
- `rcode-debug` — triggers<5(0)
- `rcode-distillator` — triggers<5(4)
- `rcode-editorial-review-prose` — triggers<5(1)
- `rcode-frontend-design` — triggers>12(17)
- `rcode-help` — triggers<5(0)
- `rcode-herdr-orchestration` — triggers<5(0)
- `rcode-index-docs` — triggers<5(1)
- `rcode-init` — triggers<5(1)
- `rcode-init` — triggers<5(1)
- `rcode-review-adversarial-general` — triggers<5(1)
- `rcode-review-edge-case-hunter` — triggers<5(0)
- `rcode-shard-doc` — triggers<5(1)
- `sadiq-analyst` — triggers>12(15)
- `waleed-architect` — triggers>12(14)
- `yousef-backend` — triggers>12(17)
- `zahra-branding` — triggers>12(16)
- `zayd-ml` — triggers>12(18)

## Mirror Drift

`.rcode/skills/` does not exist on this branch. Skills live only at `rcode/skills/`. The install pipeline (`rcode/install` and friends) is expected to populate `.rcode/skills/` during user installation; this is not a per-skill compliance issue but a top-level gap. **Flagged as follow-up — do NOT auto-create the mirror in this audit pass.**

## Mechanical Fixes Applied in This Pass

- Added `## Output Format` skeleton to `rcode-herdr-orchestration` (skill already describes its outputs as worktree branches + audit docs + integration branch — promoted into a proper section).
- Added `## Examples` skeleton with TODO stub to `rcode-herdr-orchestration` (none existed; marked P0 for follow-up real authoring).

No other auto-edits were applied. Negative boundaries and trigger-phrase tuning need authoring judgment per skill.

## Top Follow-Ups

1. **P0:** Author real examples (happy + edge + negative) for `rcode-herdr-orchestration`.
2. **P1:** Audit the 45 skills missing YAML negative boundaries — for each, decide whether the existing prose `When NOT to use` belongs in `description:` for hook-level routing.
3. **P1:** Reduce trigger phrase counts on the 17 agent skills that have 13–18 triggers — pick the 8–10 strongest per skill.
4. **P2:** Add trigger phrases to the 9 skills with fewer than 5 (mostly `rcode-help`, `rcode-init`, `rcode-debug`, editorial review skills) — these are likely router/utility skills where prose triggers are intentional, but the convention says ≥5.
5. **P2:** Decide whether `.rcode/skills/` should mirror `rcode/skills/` at HEAD of branch, or if it is install-only. If install-only, document that in CLAUDE.md so future audits skip the missing mirror.
