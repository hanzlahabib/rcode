# Rihal-Reference Audit — Skills & Brain Slice

**Scope:** `.rcode/skills/`, `rcode/skills/`, `.rcode/brain/`, `rcode/brain/`
**Branch:** `audit-rihal-skills`

## Summary

| Metric | Count |
|---|---|
| `rihal` hits scanned (skills + brain, excl. node_modules/.git) | ~800 raw lines |
| INT-SKILL-DIR (intentional — dir names, preserve) | 41 dirs |
| INT-SLASH (/rihal-* command refs in prose — preserve) | ~180 refs |
| INT-DOCSTRING-NOTE (agent persona refs: rihal-agent-X used as human-readable cross-ref) | ~22 refs |
| GAP-ARABIC-DOC (Rihal/Rihalian as tool/brand name — fix to "rcode"/"rcode user") | 52 lines / 22 files |
| GAP-AGENT-NAME (name: rihal-agent-X in YAML frontmatter) | 8 SKILL.md files |
| GAP-MANIFEST (rihal-manifest.json filename) | 2 files |
| GAP-PATH (.rihal/ in skills scope) | 0 |
| GAP-TOOL-NAME (rihal-tools in skills scope) | 0 |

---

## A. Intentional — preserve

### INT-SKILL-DIR — directory names

All `.rcode/skills/rihal-*` directories are intentional per `feedback-rihal-hyphen-namespace`. The 40 top-level skill dirs plus `.rcode/skills/agents/rihal-deviation-analyzer/` keep `rihal-` as their namespace prefix.

Representative list (40 dirs):
`rihal-product-brief`, `rihal-browser-verify`, `rihal-sprint-planning`, `rihal-create-prd`, `rihal-validate-prd`, `rihal-edit-prd`, `rihal-create-story`, `rihal-dev-story`, `rihal-create-epics-and-stories`, `rihal-create-milestone`, `rihal-create-architecture`, `rihal-create-ux-design`, `rihal-scaffold-project`, `rihal-document-project`, `rihal-domain-research`, `rihal-market-research`, `rihal-technical-research`, `rihal-generate-project-context`, `rihal-code-review`, `rihal-debug`, `rihal-qa-generate-e2e-tests`, `rihal-git-flow`, `rihal-ci`, `rihal-harden`, `rihal-frontend-design`, `rihal-init`, `rihal-migrate`, `rihal-perf`, `rihal-checkpoint-preview`, `rihal-prfaq`, `rihal-prove-it`, `rihal-correct-course`, `rihal-incremental`, `rihal-source-truth`, `rihal-retrospective`, `rihal-trim`, `rihal-sprint-status`, `rihal-check-implementation-readiness`, `rihal-agents/rihal-deviation-analyzer`

**Action:** None. Preserve per namespace rule.

### INT-SLASH — slash command prose references

~180 `/rihal-*` invocation references appear throughout skill content as instructed commands to the user or cross-skill call targets. Examples:

| File | Line | Ref |
|---|---|---|
| `.rcode/skills/rihal-sprint-status/SKILL.md` | 43 | `Run rihal-sprint-planning first.` |
| `.rcode/skills/agents/SKILL.md` | 76–79 | Table mapping SC/MC/RF/TS → `rihal-scan`, `rihal-map-codebase` |
| `.rcode/skills/rihal-create-epics-and-stories/SKILL.md` | 57 | `Run rihal-create-prd first.` |
| `.rcode/skills/rihal-dev-story/SKILL.md` | 47 | `Run rihal-create-story first.` |

**Action:** None. These are `/rihal-*` skill invocations — intentional namespace.

### INT-DOCSTRING-NOTE — persona cross-references

Agent SKILL.md files use `rihal-agent-X` as a human-readable identifier when telling the AI to redirect to another persona. These are documentary labels, not dispatch identifiers.

| File | Example |
|---|---|
| `agents/waleed-architect/SKILL.md:103–105` | "delegate to Hanzla (rihal-agent-hanzla)" |
| `agents/fatima-qa/SKILL.md:140` | "Architecture decisions belong to Waleed (rihal-agent-waleed)" |
| `agents/sadiq-analyst/SKILL.md:150` | "PRDs belong to Hussain-PM (rihal-agent-hussain-pm)" |
| `agents/noor-writer/SKILL.md:133` | "Architecture decisions belong to Waleed (rihal-agent-waleed)" |
| `agents/zahra-branding/SKILL.md:166,171` | redirects to Haitham and Mariam by rihal-agent-* label |
| `agents/hanzla-engineer/SKILL.md:144` | "Stack decisions belong to Waleed (rihal-agent-waleed)" |
| `agents/haitham-frontend/SKILL.md:148` | "Database decisions are Waleed's (rihal-agent-waleed)" |
| `agents/yousef-backend/SKILL.md:163` | "Frontend layout is Haitham's (rihal-agent-haitham)" |
| `rihal-frontend-design/SKILL.md:13,35,52` | "rihal-agent-zahra (branding)" as pairing label |

**Action:** These are educational prose, not dispatch calls. Preserve — they do not affect runtime behavior.

---

## B. GAPS — require fix

### GAP-ARABIC-DOC — "Rihal" / "Rihalian" as tool or brand name

These strings refer to the product or its users by the old brand name. Replace with `rcode` / `rcode user` / `rcode users`.

#### B1. Skill SKILL.md files

| File | Line | Current text | Fix |
|---|---|---|---|
| `.rcode/skills/rihal-scaffold-project/SKILL.md` | 5 | `Scaffold a new project for Rihalians` | `for rcode users` |
| `.rcode/skills/rihal-scaffold-project/SKILL.md` | 32 | `bootstraps a new Rihalian project by cloning the official Rihal template` | `new rcode project … official rcode template` |
| `.rcode/skills/rihal-git-flow/SKILL.md` | 4 | `aligned with the Rihal Epic→Feature→Task hierarchy` | `the rcode Epic→Feature→Task hierarchy` |
| `.rcode/skills/rihal-git-flow/SKILL.md` | 21 | `The Rihal git workflow` | `The rcode git workflow` |
| `.rcode/skills/agents/waleed-architect/SKILL.md` | 38 | `the Rihal team's CTO` | `the rcode team's CTO` |
| `.rcode/skills/rihal-checkpoint-preview/SKILL.md` | 11 | `Checkpoint preview skill for Rihal Code.` | `for rcode.` |
| `.rcode/skills/rihal-frontend-design/SKILL.md` | 35 | `Rihal-specific RTL guidance` | `rcode-specific RTL guidance` |

#### B2. Step and workflow files inside skills

| File | Line | Current text | Fix |
|---|---|---|---|
| `.rcode/skills/rihal-scaffold-project/steps/step-03-clone.md` | 4 | `the official Rihal template repository` | `official rcode template repository` |
| `.rcode/skills/rihal-create-milestone/steps/step-08-write-roadmap.md` | 11 | `mirrors … Rihal Code itself` | `rcode itself` |
| `.rcode/skills/rihal-create-story/workflow.md` | 362 | `ULTIMATE Rihal Code STORY CONTEXT CREATED` | `ULTIMATE rcode STORY CONTEXT CREATED` |
| `.rcode/skills/rihal-validate-prd/steps-v/step-v-01-discovery.md` | 61 | `what makes a great Rihal PRD` | `rcode PRD` |
| `.rcode/skills/rihal-validate-prd/steps-v/step-v-02-format-detection.md` | 72,74,94,103,150 | `Rihal PRD` (×5) | `rcode PRD` |
| `.rcode/skills/rihal-validate-prd/steps-v/step-v-02b-parity-check.md` | 12,29,41,57,59,157,191 | `Rihal PRD` (×7) | `rcode PRD` |
| `.rcode/skills/rihal-validate-prd/steps-v/step-v-11-holistic-quality-validation.md` | 92,181,243 | `Rihal PRD` (×3) | `rcode PRD` |
| `.rcode/skills/rihal-edit-prd/steps-e/step-e-01-discovery.md` | 64,162,229 | `Rihal PRD` (×3) | `rcode PRD` |
| `.rcode/skills/rihal-edit-prd/steps-e/step-e-01b-legacy-conversion.md` | 64 | `Rihal PRD section` | `rcode PRD section` |
| `.rcode/skills/rihal-edit-prd/steps-e/step-e-03-edit.md` | 82,87,134 | `Rihal PRD` (×3) | `rcode PRD` |

#### B3. Data files

| File | Line | Current text | Fix |
|---|---|---|---|
| `.rcode/skills/rihal-create-prd/data/prd-purpose.md` | 1,3,7,185 | `# Rihal PRD Purpose`, `Rihal Code`, `What is a Rihal PRD?`, `Great Rihal PRD?` | `rcode PRD`, `rcode` |
| `.rcode/skills/rihal-validate-prd/data/prd-purpose.md` | 1,3,7,185 | Same as above (duplicate file) | Same fix |
| `.rcode/skills/rihal-create-prd/data/project-types.csv` | 8 | `Rihal Method Game Module Agent` | `rcode Game Module Agent` |
| `.rcode/skills/rihal-validate-prd/data/project-types.csv` | 8 | Same (duplicate) | Same fix |

#### B4. Output template footers

These strings appear in generated documents delivered to end-users — highest user-visibility.

| File | Line | Current text | Fix |
|---|---|---|---|
| `.rcode/skills/rihal-document-project/templates/source-tree-template.md` | 135 | `_Generated using Rihal Code \`document-project\` workflow_` | `_Generated using rcode \`document-project\` workflow_` |
| `.rcode/skills/rihal-document-project/templates/index-template.md` | 169 | `_Documentation generated by Rihal Code \`document-project\` workflow_` | `by rcode` |
| `.rcode/skills/rihal-document-project/templates/project-overview-template.md` | 103 | `_Generated using Rihal Code \`document-project\` workflow_` | `using rcode` |

#### B5. Brain directory

| File | Line | Current text | Fix |
|---|---|---|---|
| `.rcode/brain/README.md` | 3 | `into every Rihalian's project` | `into every rcode user's project` |
| `.rcode/brain/README.md` | 25 | `every Rihalian benefits` | `every rcode user benefits` |
| `.rcode/brain/sources.yaml` | 5 | `every Rihalian's project context` | `every rcode user's project context` |
| `.rcode/brain/sources.yaml` | 29 | `Rihalian's AI sees these` | `rcode user's AI sees these` |

**Total GAP-ARABIC-DOC: ~52 lines across 22 files.**

---

### GAP-AGENT-NAME — `name: rihal-agent-*` YAML frontmatter

Eight agent SKILL.md files use the `rihal-agent-*` naming pattern instead of the `rihal-*` pattern used by the other 47 skill/agent files. The corresponding rcode subagent_types are registered as `rcode-*` — the `rihal-agent-` infix creates an inconsistency within the skills namespace and diverges from how these agents are dispatched.

| File | Frontmatter `name:` | Expected (rcode subagent_type) |
|---|---|---|
| `.rcode/skills/agents/SKILL.md` | `rihal-agent-dalil-scout` | `rcode-dalil` (parent skill misnaming) |
| `.rcode/skills/agents/dalil-scout/SKILL.md` | `rihal-agent-dalil-scout` | `rcode-dalil` |
| `.rcode/skills/agents/waleed-architect/SKILL.md` | `rihal-agent-waleed` | `rcode-waleed` |
| `.rcode/skills/agents/sadiq-analyst/SKILL.md` | `rihal-agent-sadiq` | `rcode-sadiq` |
| `.rcode/skills/agents/fatima-qa/SKILL.md` | `rihal-agent-fatima` | `rcode-fatima` |
| `.rcode/skills/agents/hanzla-engineer/SKILL.md` | `rihal-agent-hanzla` | `rcode-hanzla` |
| `.rcode/skills/agents/mariam-marketing/SKILL.md` | `rihal-agent-mariam` | `rcode-mariam` |
| `.rcode/skills/agents/hussain-pm/SKILL.md` | `rihal-agent-hussain-pm` | `rcode-hussain-pm` |

Other agents in the same dir use `rihal-*` (no `agent` infix): `rihal-noor-writer`, `rihal-haitham-frontend`, `rihal-yousef-backend`, `rihal-zahra-branding`, `rihal-zayd-ml`, `rihal-nasser-eng-manager`, `rihal-ahmed-hassani-director`, `rihal-layla-designer`. The inconsistency is the `-agent-` infix on 8 of 16.

**Note:** If the skill name is also used as a subagent dispatch identifier in workflow prose, mismatches here can silently dispatch to wrong agents.

---

### GAP-MANIFEST — `rihal-manifest.json` filename

Two skill directories contain a manifest file named `rihal-manifest.json`. The filename embeds the old brand name; the rcode equivalent would be `rcode-manifest.json` (or a neutral `skill-manifest.json`).

| File | `module-code` field | Note |
|---|---|---|
| `.rcode/skills/rihal-product-brief/rihal-manifest.json` | `"rihal"` | module-code also stale — should be `"rcode"` |
| `.rcode/skills/rihal-prfaq/rihal-manifest.json` | `"bmm"` | filename stale; module-code already rebranded |

**No other skills in `.rcode/skills/` have a manifest file**, so this is an orphaned pattern. Additionally, the `module-code: "rihal"` in `rihal-product-brief`'s manifest is a secondary stale string.

---

## C. Not found in this scope

| Tag | Result |
|---|---|
| GAP-PATH (`.rihal/` paths in skills/brain) | 0 hits — all `.rihal/` path refs were in `agents-rules/` and `workflows/` (covered in slice 1) |
| GAP-TOOL-NAME (`rihal-tools` in skills/brain) | 0 hits in `.rcode/skills/` — all `rihal-tools` refs were in `agents-rules/` and `workflows/` |

---

## Verdict

**Skills and brain dirs contain no runtime-breaking path or binary gaps** (those are all in agents-rules/workflows, covered in slice 1). The gaps here are user-facing brand strings, template footers, and document content.

**Priority ranking:**

1. **High — template footers** (B4, 3 files): Generated documents delivered directly to users carry the old brand name in the footer. Immediate user-visibility.
2. **High — GAP-AGENT-NAME** (8 SKILL.md files): The `-agent-` infix is an internal inconsistency and diverges from rcode dispatch identifiers; could cause silent dispatch errors if skill names are used as subagent_type values.
3. **High — brain README/sources.yaml** (B5, 4 lines): Brain is pulled into every user project context; "Rihalian" appears in the first sentence a user's AI sees.
4. **Medium — PRD step files** (B2, ~25 lines): User-facing only when rihal-validate-prd or rihal-edit-prd is invoked; bulk-replaceable with a single sed pass.
5. **Medium — GAP-MANIFEST** (2 files): Filename and module-code field mismatch; low runtime impact but cosmetically inconsistent.
6. **Low — data CSV files** (B3): Only surfaced inside AI context during skill execution; "Rihal Method" label in project-types.csv.
