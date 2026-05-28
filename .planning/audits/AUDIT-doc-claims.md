# Doc Claims Audit — root markdown vs. actual code

Branch: `audit-doc-claims` · Date: 2026-05-28

Scope: README.md, AGENTS.md, CLAUDE.md, DOCS.md, MEMORY_BANK.md, MIGRATIONS.md, BRAND.md, TASKS.md, CONTRIBUTING.md, CHANGELOG.md (spot).

Categories: **VALID** / **BROKEN** (missing) / **STALE** (renamed) / **DRIFT** (count or claim no longer matches code).

---

## Ground-truth counts (verified 2026-05-28)

| Surface | Actual | Method |
|---|---|---|
| agent files | 45 | `ls rcode/agents/*.md \| wc -l` (excludes `rules/`) |
| team.yaml entries | 45 | `grep -c "^  - id:" rcode/team.yaml` |
| slash commands | 116 | `ls rcode/commands/*.md \| wc -l` |
| workflows | 129 | `ls rcode/workflows/*.md \| wc -l` |
| SKILL.md files | 87 | `find rcode/skills -name SKILL.md \| wc -l` |
| `rcode/skills/agents/` dirs | 23 | (incl. 5 auditor sub-skills: i18n, cross-platform, dep, deviation, observability) |
| `rcode/skills/core/` dirs | 27 | `ls rcode/skills/core \| wc -l` |
| tests | 457 (453 pass, 2 fail unrelated) | `npm test 2>&1 \| grep "tests "` |
| test files | 63 | `find test -name '*.test.*' \| wc -l` |
| `server/dashboard.js` lines | 250 | `wc -l server/dashboard.js` |
| `server/` total lines (6 files) | 3307 | `wc -l server/dashboard.js server/lib/*.js server/lib/html/*.js` |
| `rcode/workflows/autonomous.md` lines | 936 | `wc -l` |
| workflows > 500 lines | 9 | `wc -l rcode/workflows/*.md \| sort -rn` |
| `rcode/templates/memory/` files | 14 | `find rcode/templates/memory -type f` |
| package.json version | 4.0.0 | `grep version package.json` |

---

## README.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L16 | "339 automated tests across 58 files" | **DRIFT** | actual 457 tests / 63 files | update to 457/63 |
| L16 | "45 agents, 116 commands, 86 skills" | **DRIFT** (skills) | 45✓ 116✓ skills=87 | 86 → 87 |
| L46 | "rcode/skills/ — 85 phrase-activated playbooks" | **DRIFT** | actual 87; also self-inconsistent with L16's "86" | 85 → 87 |
| L100 | "45 shipped" (table) | VALID | team.yaml has 45 | — |
| L143 | "6 agents currently exceed the 100-line lean target" | UNVERIFIED | not in scope to audit agent file sizes | P1: re-check |

## DOCS.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L14, L261 | "Personas (45 agents)" | VALID | 45 in team.yaml | — |
| L15, L318, L380 | "Slash commands (116)" | VALID | 116 in rcode/commands | — |
| L16, L46, L80, L420, L851, L905, L1086 | "85 skills" / "85 SKILL.md files" | **DRIFT** | actual 87 | 85 → 87 |
| L314 | Sub-agent list names `rcode-plan-checker`, `rcode-reviewer`, `rcode-fixer`, `rcode-doc-verifier`, `rcode-doc-writer` | **STALE/BROKEN** | actual: `rcode-sprint-checker`, `rcode-code-reviewer`, `rcode-code-fixer`; `rcode-doc-verifier` and `rcode-doc-writer` do not exist (only `rcode-docs-auditor`) | rename to actual; drop the two non-existent |
| L438 | Phase 4 lists `rcode-review` | **STALE** | actual skill folder is `rcode-code-review` | `rcode-review` → `rcode-code-review` |
| L444 | "Persona skills (18)" | **DRIFT** | `rcode/skills/agents/` has 23 dirs (18 personas + 5 auditor sub-skills) | P1: either move auditor sub-skills out of `skills/agents/` or update count |
| L506 | "autonomous.md at 1059 lines. Five workflows exceed 500 lines" | **DRIFT** | autonomous.md=936; nine workflows exceed 500 lines (plan, execute, new-project, discuss-phase, autonomous, complete-milestone, verify-work, lens-audit, new-milestone) | update both numbers |
| L539 | "dashboard.js — HTTP server + routing (~92 lines)" | **DRIFT** | actual 250 lines | ~92 → ~250 |
| L549, L914 | "Total: ~1880 lines across 6 files" | **DRIFT** | actual ~3307 lines (css.js alone is 2284) | ~1880 → ~3307 |
| L821, L824 | "full suite (134 tests, ~2s)" | **DRIFT** | actual 457 tests | 134 → 457 |
| L851 | "agents installed — 45" inside health-check sample | VALID | 45 | — |
| L904 | "workflows/  # 126 workflow files" | **DRIFT** | actual 129 | 126 → 129 |
| L907 | "agents/  # 18 persona skills" | **DRIFT** | 23 dirs (incl auditors) | P1 same as L444 |
| L908 | "core/  # 25 cross-cutting skills" | **DRIFT** | actual 27 dirs | 25 → 27 |
| L918 | "test/  # node:test suite (120 cases)" | **DRIFT** | 457 cases / 63 files | 120 → 457 |
| L1086 | "auto-generated skill catalogue (85 entries)" | **DRIFT** | catalogue exists but entry count drifts with skill count | 85 → 87 (P2: verify by reading catalogue) |

## MEMORY_BANK.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L5 | "live as of v4.0.0… commits `da20232`, `817a937`" | VALID | both rev-parsed clean; `.rcode/memory/` populated | — |
| L114 | "Diwan dashboard exposes a `/memory` route" | VALID | `/api/memory` registered in `server/dashboard.js:92` | — |
| L163 | "distillates/project.distillate.md (6.1K) and stack.distillate.md (2.6K)" | VALID | actual 6286 and 2681 bytes | — |

## MIGRATIONS.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L53–55 | "Dropped (self-declared internal)" lists `new-project-research`, `new-project-roadmap`, `check-implementation-readiness` | **BROKEN** (claim) | files **still exist** in `rcode/commands/` | P1: doc says they were dropped but installer still ships them. Either remove the command files or rephrase the migration. |
| L61–64 | "Folded into flags" lists `discuss-phase-power`, `karpathy-audit`, `review-edge-case-hunter` | **BROKEN** (claim) | command files still exist (only `review-adversarial.md` is actually removed) | P1 same as above |
| L79 | "team.yaml count: 47 → 46" | **DRIFT** | actual current count is 45 | 47 → 45 (assuming 47 baseline still correct) |
| L98–105 | Slimmed skill line counts (e.g. "75 lines") | **DRIFT** (minor) | each is off by 2–18 lines (clone-website 75→87, distillator 63→65, etc.) | P2: low value, files have grown organically |
| L151–161 | "Files removed" lists the same command/agent files | **BROKEN** | several still present (see L53/L61 above) | P1 |

## BRAND.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L114 | "Majlis, Dalil, and Raees are not registered as first-class agents — they live as skills" | VALID | none in `team.yaml`; skills present | — |
| L116 | "16 named personas + 29 functional sub-agents = 45" | VALID | 16+29=45 ✓ | — |
| persona roster | BRAND.md omits Hussain-SM but DOCS.md L271 lists it | **DRIFT** | `rcode/skills/agents/hussain-sm/` exists but no `rcode-hussain-sm` agent file | P1: decide canonical source — either add Hussain-SM to BRAND roster or remove from DOCS |

## AGENTS.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L37 | `.github/workflows/semantic.yaml` exists | VALID | present | — |
| L38 | `.github/pull_request_template.md` exists | VALID | present | — |
| L84–86 | `cli/doctor.js`, `test/artifact-schema.test.cjs` exist | VALID | both present | — |
| L89 | grep TODO "should be empty" | DRIFT (aspiration) | 301 hits — this is a coding aspiration, not a code claim. Leave as-is. | — |

## CLAUDE.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L1 | Title `# AGENTS.md` inside CLAUDE.md file | **STALE/COPY** | file is a near-duplicate of AGENTS.md with stale scope list | P1: decide whether CLAUDE.md should be a symlink or kept in sync |
| L27 | scopes list (shorter than AGENTS.md L27) | **DRIFT** | AGENTS.md L27 has additional scopes (`agent-rules`, `cursor`, `i18n`, `phase`) | P2: sync or symlink |

## TASKS.md

| Loc | Claim | Status | Evidence | Fix |
|---|---|---|---|---|
| L40 | "Bootstrap `rcode/templates/memory/` directory (13 template files)" | **DRIFT** | actual 14 files | 13 → 14 |

## CONTRIBUTING.md

Spot-checked — paths referenced (`rcode/commands/*.md`, `rcode/workflows/*.md`, `rcode/skills/agents/*/SKILL.md`, `rcode/skills/_shared/`) all resolve. L158 references `hussain-sm/` skill dir which exists. No actionable drift in spot check.

## CHANGELOG.md

Out of scope for surgical edits — by convention a release log is historically frozen. No fixes applied.

---

## Summary

- **Claims audited:** ~55 concrete references
- **VALID:** ~22
- **DRIFT (number/path):** ~25
- **BROKEN (file/command/symbol missing):** 5 (sub-agent names in DOCS L314; `rcode-review` in DOCS L438; migrations "files removed" claims)
- **STALE:** the migration claims (L53–64, L151–161) point to a state of the world that was not fully executed

## Fixes applied this audit (Phase 2)

See follow-up commits with `docs(audit):` and `docs(...)` scopes for each surgical edit.

## P1 follow-ups (deferred — confidence <90%)

1. **MIGRATIONS.md doc/code reconciliation:** the migration doc says these commands were dropped or folded, but the files are still present in `rcode/commands/`: `new-project-research`, `new-project-roadmap`, `discuss-phase-power`, `karpathy-audit`, `review-edge-case-hunter`, `check-implementation-readiness`. Need owner decision: delete the command shells, or rewrite migration prose.
2. **MIGRATIONS.md L79 team.yaml count "47 → 46":** baseline of 47 unverified; current actual is 45. Need git-log archaeology to confirm the right delta.
3. **DOCS.md persona-skills count (18 vs 23):** `rcode/skills/agents/` contains 5 auditor sub-skills (`rcode-i18n-auditor`, `rcode-cross-platform-auditor`, `rcode-dep-auditor`, `rcode-deviation-analyzer`, `rcode-observability-auditor`) that are not personas. Decide: move them or update the count and prose.
4. **BRAND.md vs DOCS.md Hussain-SM:** DOCS lists him as a persona; BRAND roster omits him; no `rcode-hussain-sm` agent file though skill folder exists.
5. **CLAUDE.md title says `# AGENTS.md`** and content drifts from AGENTS.md scope list. Decide: symlink, regenerate, or accept the divergence.
6. **README.md L143 "6 agents exceed 100-line lean target":** not re-verified; programmatic check needed.
7. **DOCS.md L1086 skills-catalog.md entry count:** verify by parsing the actual catalogue.
