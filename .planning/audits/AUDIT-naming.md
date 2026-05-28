# Naming Audit — rihal-code

Date: 2026-05-28
Branch: `audit-naming-audit`
Scope: whole repo (root, `rcode/`, `.rcode/`, `docs/`, `cli/`, `scripts/`, `.github/`, `examples/`, `audit/`).

This audit inspects six naming-hygiene categories. For each finding the row records
the canonical evidence (`path:line`), the severity, and whether the auditor
applied an in-place fix.

Legend
- **REMOVE** — must be deleted/rephrased.
- **RENAME** — colon → hyphen, or other safe textual rewrite.
- **P1** — flagged for follow-up (risky, large blast radius, or policy conflict).
- **OK** — appears in audit/changelog/migration context only; legitimate.

---

## 1. Inspiration-source names (BMAD / GSD / "get-shit-done")

Repo rule (CLAUDE.md, memory `feedback-no-gsd-bmad-naming`): inspiration
source names MUST NOT appear in commits, docs, code, skills.

| File:Line | Match | Disposition |
| --- | --- | --- |
| `ATTRIBUTION.md:6,8,9,11–14,16,19` | `BMAD-METHOD`, `BMad Code, LLC`, `bmad-prfaq`, `bmad-checkpoint-preview`, `bmad-advanced-elicitation`, `bmad-shard-doc` | **P1 — DO NOT auto-remove.** This file is the upstream MIT-license attribution. The MIT license requires retention of the copyright notice; removing the name would be a license violation. Resolution requires a maintainer decision (e.g., rewrite as generic "ported from an MIT-licensed upstream" while preserving the copyright line, or replace the whole methodology with a clean-room version). Out of scope for an automated audit pass. |
| `audit/11-migration-gaps.md:114` | `~/.claude/get-shit-done/workflows/...`, `gsd-tools.cjs → rihal-tools.cjs` | **OK** — historical audit record of a *pre-v4* allowlist entry that was already pruned. The audit doc is itself the artefact of cleaning this up. No live `gsd-*` references anywhere else in the tree (verified with `rg`). Leave as-is. |

No other BMAD/GSD/`get-shit-done`/`gsd-` strings exist in the active tree
(commands, skills, configs, agents, scripts, CI, examples) — verified with:

```
rg -i '\b(BMAD|BMad|GSD|get-shit-done|gsd-)\b'
```

→ 10 hits total, all enumerated above.

---

## 2. Colon-style slash refs (`/rcode:` or `/rihal:`)

Repo rule (memory `feedback-rihal-hyphen-namespace`, `MIGRATIONS.md:18–21`):
slash-command surface MUST be hyphen form (`/rcode-foo`), never colon
(`/rcode:foo`) — required for cross-IDE compatibility (Claude Code vs Cursor
vs Copilot).

| File:Line | Match | Disposition |
| --- | --- | --- |
| `AGENTS.md:51` | `new branded skills use 'rcode-<verb>-<noun>' ONLY in slash command surface ('/rcode:<name>')` | **RENAME — applied.** Self-contradictory sentence: claims hyphen form then gives colon example. Fixed to `/rcode-<name>`. |
| `MIGRATIONS.md:21` | `\| Colon-style slash \| /rihal:foo \| /rcode-foo (hyphen only) \|` | **OK** — this is the migration table documenting the *old* form as the bad example. Legitimate. |
| `CHANGELOG.md:410` | "migrate `rcode:command` to `rcode-command` slash syntax" | **OK** — changelog entry documenting the prior fix. Legitimate. |
| `rcode/workflows/do.md:379` | "The colon form `rcode:discuss-phase` is NOT used in this project … do not display it to users …" | **OK** — explicit teaching that colon is wrong. Legitimate. |
| `rcode/skills/agents/mariam-marketing/SKILL.md:173` | `'rcode: a fast-growing AI and data company …'` | **OK** — false positive. This is a brand-line copy example inside a marketing quote, not a slash-command reference. |

---

## 3. AI attribution leaks ("Generated with Claude", "Co-Authored-By: Claude", "🤖 Generated", "Claude Opus")

Repo rule (CLAUDE.md / AGENTS.md): no AI attribution in commits, docs, or
user-facing copy. Tooling that *enforces* or *calls* the model is exempt.

Audit method:
```
rg -e 'Generated with Claude' -e 'Co-Authored-By: Claude' -e '🤖 Generated' -e 'Claude Opus' -e 'claude-opus'
```

All 24 hits reviewed; **zero leaks**. Every occurrence is one of:

- The rule itself (CLAUDE.md, AGENTS.md, BRAND.md, docs/STANDARDS.md, `rcode/references/execution-protocol.md`, `rcode/references/commit-conventions.md`, `rcode/references/checklist-story-dod.md`, `rcode/workflows/enable-hooks.md`, `rcode/skills/actions/4-implementation/rcode-git-flow/SKILL.md`).
- The enforcement code that *rejects* such commits (`rcode/bin/rcode-hooks.cjs:175–176`, `rcode/bin/rcode-tools.cjs:3857,3900,4044`).
- Model-selection config / model-profile docs that name the model deliberately (`cli/lib/model-profiles.cjs`, `rcode/bin/rcode-tools.cjs:5368–5371,7034,7059`, `rcode/references/model-profile-resolution.md`, `rcode/workflows/docs-update.md:45`, `rcode/config/model-profiles.json`, `docs/agents.md:518`, `docs/faq.md:145`).

No action required.

---

## 4. Leading zeros in phase / sprint / decision refs (`phase-01`, `D-01`, `sprint-01`)

Repo rule (memory `feedback-no-leading-zeros`): no leading zeros anywhere —
`phase 6` not `phase 06`, `D-1` not `D-01`, `sprint-3` not `sprint-03`.

Scan: `rg -e 'phase-?0[1-9]\b' -e 'phase 0[1-9]\b' -e 'sprint-?0[1-9]\b' -e '\bD-0[1-9]\b'` → **68 hits**.

Distribution
- **Root user-docs** (`README.md`, `AGENTS.md`, `CLAUDE.md`, `BRAND.md`, `CONTRIBUTING.md`, `DOCS.md`, `MIGRATIONS.md`, `TASKS.md`): **0 hits — clean.**
- **Public docs** (`docs/faq.md`, `docs/numbering.md`, `docs/DAILY-USE.md`, `docs/METHODOLOGY.md`, `docs/state-and-recovery.md`, `docs/commands.md`): ~16 hits in user-facing examples (e.g. `/rcode-secure-phase 02`, `phase-01/brief.md`).
- **Workflow skills / references** (`rcode/workflows/*.md`, `rcode/references/*.md`, `rcode/skills/**/*.md`): ~35 hits, including the `D-01`–`D-08` decision IDs used throughout `code-review.md`, `discuss-phase.md`, `planner-playbook.md`, `sprint-checker/dimensions.md`.
- **Test fixtures** (`test/github-sync.test.cjs`): 8 hits — fixture inputs to round-trip parsers. Stripping zeros here breaks tests.
- **CLI source** (`cli/install.js:732`, `cli/github-sync.js:14–15`): comment-only.

Disposition

- **P1** — Mass fix is out of scope for this audit (high blast radius:
  workflow examples, fixture data, parser inputs, decision-ID conventions
  embedded in multiple subagent rules). Should be a dedicated cleanup
  ticket that:
  1. Decides whether `D-01` (and the entire `D-NN` family used in
     `code-review.md` tier comments) is exempt — these are stylistic
     numbering tokens not project-state values.
  2. Sweeps `docs/` and `rcode/workflows/` example snippets.
  3. Keeps `test/github-sync.test.cjs` fixtures untouched OR updates the
     parser to accept both forms.

- **Test fixtures kept as-is** — `test/github-sync.test.cjs` round-trips
  the literal string through schema validation; rewriting risks silent
  regressions.

No in-place fix applied.

---

## 5. Inconsistent agent naming (`rcode-*` prefix vs. bare persona name)

Audit method: compared `rcode/agents/` (markdown agent files) vs.
`rcode/skills/agents/` (skill folders) vs. `rcode/team.yaml` ids.

Finding — known systemic inconsistency, already flagged by existing audits
at `audit/14-rihal-skills.md:139–144` and `audit/17-lens-audit-summary.md:149`.

| Location | Convention used | Examples |
| --- | --- | --- |
| `rcode/agents/*.md` | `rcode-<persona>.md` | `rcode-hanzla.md`, `rcode-waleed.md`, `rcode-fatima.md`, `rcode-khalid.md`, `rcode-omar.md` |
| `rcode/team.yaml` ids | `rcode-<persona>` | `rcode-sadiq`, `rcode-waleed`, `rcode-omar`, `rcode-khalid` |
| `rcode/skills/agents/<dir>/` (most) | bare `<persona>-<role>` | `hanzla-engineer/`, `fatima-qa/`, `waleed-architect/`, `mariam-marketing/`, `yousef-backend/`, `zayd-ml/` |
| `rcode/skills/agents/<dir>/` (5 outliers) | `rcode-<role>` | `rcode-cross-platform-auditor/`, `rcode-dep-auditor/`, `rcode-deviation-analyzer/`, `rcode-i18n-auditor/`, `rcode-observability-auditor/` |

Disposition

- **P1** — Folder renames touch the install pipeline (`cli/install.js`
  hardcodes folder→symlink mapping per `AGENTS.md:51`), every workflow
  that names a subagent, the dashboard scanner, and `team.yaml`. Out of
  scope for this audit.
- Already inventoried in `audit/14-rihal-skills.md` and
  `audit/17-lens-audit-summary.md`; defer to the existing remediation
  thread rather than starting a parallel one.

No in-place fix applied.

---

## 6. Dead / mismatched skill references

Audit method: spot-checked retired skill names (`rcode-architect`,
`rcode-tech-writer`) and historical agents.

| Ref | Where | Disposition |
| --- | --- | --- |
| `rcode-architect`, `rcode-tech-writer` | `CHANGELOG.md`, `MIGRATIONS.md`, `TASKS.md`, `audit/*` | **OK** — only appears in changelog / migration / completed-task / audit context. No live workflow or skill resolves to either. |
| `discuss.md:159` says `subagent_type = rihal-{agent_id}` but example is `rcode-sadiq` | `audit/13-rihal-workflows.md:208–211` | **Known.** Already flagged in existing audit. P1 — fix belongs in a dedicated `rcode/workflows/discuss.md` cleanup. Not touched here. |

No dead live refs were found that warrant an in-place fix.

---

## Summary of fixes applied this pass

| Commit | File | Change |
| --- | --- | --- |
| `docs(refs): fix colon-form slash ref in AGENTS.md` | `AGENTS.md:51` | `/rcode:<name>` → `/rcode-<name>` (cross-IDE compatibility rule). |
| `docs(audit): naming audit findings` | `.planning/audits/AUDIT-naming.md` | This document. |

## Open follow-ups (P1, deferred — recommend GH issues)

1. **License-attribution conflict in `ATTRIBUTION.md`.** Repo rule says
   "never name inspiration sources"; MIT requires the copyright/attribution
   line. Needs a maintainer decision on how to reconcile (clean-room
   rewrite vs. carve-out vs. policy amendment).
2. **Mass leading-zero sweep.** 68 occurrences. Decide whether
   stylistic `D-NN` decision IDs are exempt; decide whether the
   `github-sync` parser accepts zero-padded inputs or whether fixtures
   move to single-digit.
3. **Skill-folder naming inconsistency.** Five `rcode-*-auditor/` outliers
   in `rcode/skills/agents/` vs. bare-persona convention. Already tracked
   in `audit/14-rihal-skills.md` and `audit/17-lens-audit-summary.md` —
   close out that thread rather than open new ones.
4. **`rcode/workflows/discuss.md:159`** self-contradiction
   (`rihal-{agent_id}` template, `rcode-sadiq` example). Tracked in
   `audit/13-rihal-workflows.md:208`.
