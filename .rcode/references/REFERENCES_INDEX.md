# References Index

Human-maintained catalogue of which reference files are loaded by which agents and workflows.

Source: `rcode/references/` (tracked in git).
Runtime: `.rcode/references/` (gitignored, installed by `cli/install.js`).

Update this file whenever you add a new reference or change which agents load it.

---

## Cluster References (added phases 22-23)

These files were extracted from heavy agents (>100L) to reduce context budget per spawn.

| File | Loaded by |
|------|-----------|
| `assumptions-analyzer-playbook.md` | rihal-assumptions-analyzer |
| `auditor-shared-checklists.md` | rihal-docs-auditor, rihal-edge-case-hunter, rihal-nyquist-auditor, rihal-security-adversary, rihal-security-auditor, rihal-ui-auditor |
| `code-fixer-playbook.md` | rihal-code-fixer |
| `code-reviewer-playbook.md` | rihal-code-reviewer |
| `codebase-mapping-process.md` | rihal-codebase-mapper |
| `debugger-playbook.md` | rihal-debugger |
| `docs-auditor-playbook.md` | rihal-docs-auditor |
| `executor-playbook.md` | rihal-executor |
| `integration-verification-playbook.md` | rihal-integration-checker |
| `nyquist-auditor-playbook.md` | rihal-nyquist-auditor |
| `persona-engineer-shared.md` | rihal-haitham, rihal-omar, rihal-yousef |
| `planner-playbook.md` | rihal-planner |
| `remediation-planner-playbook.md` | rihal-remediation-planner |
| `research-synthesis-playbook.md` | rihal-research-synthesizer |
| `researcher-shared.md` | rihal-advisor-researcher, rihal-phase-researcher, rihal-profiler, rihal-project-researcher |
| `roadmapper-playbook.md` | rihal-roadmapper |
| `sprint-checker-playbook.md` | rihal-sprint-checker |
| `ux-designer-playbook.md` | rihal-ux-designer |
| `verifier-playbook.md` | rihal-verifier |

---

## Universal References (loaded by most agents)

| File | Loaded by |
|------|-----------|
| `agent-shared-rules.md` | rihal-fatima, rihal-hanzla, rihal-hussain-pm, rihal-mariam, rihal-sadiq, rihal-waleed |
| `codebase-grounding.md` | rihal-ahmed, rihal-fatima, rihal-haitham, rihal-hanzla, rihal-hussain-pm, rihal-khalid, rihal-layla, rihal-mariam, rihal-nasser, rihal-noor, rihal-omar, rihal-sadiq, rihal-waleed, rihal-yousef, rihal-zahra, rihal-zayd |
| `karpathy-guidelines.md` | rihal-assumptions-analyzer, rihal-code-fixer, rihal-debugger, rihal-deviation-analyzer, rihal-fatima, rihal-haitham, rihal-hanzla, rihal-hussain-pm, rihal-integration-checker, rihal-khalid, rihal-noor, rihal-omar, rihal-phase-researcher, rihal-profiler, rihal-project-researcher, rihal-remediation-planner, rihal-research-synthesizer, rihal-roadmapper, rihal-ui-auditor, rihal-ux-designer, rihal-waleed, rihal-yousef, rihal-zayd |
| `karpathy-guidelines-full.md` | rihal-codebase-mapper, rihal-code-reviewer, rihal-docs-auditor, rihal-edge-case-hunter, rihal-executor, rihal-nyquist-auditor, rihal-planner, rihal-security-adversary, rihal-security-auditor, rihal-sprint-checker, rihal-verifier |
| `response-style.md` | rihal-advisor-researcher, rihal-ahmed, rihal-assumptions-analyzer, rihal-codebase-mapper, rihal-code-fixer, rihal-code-reviewer, rihal-debugger, rihal-deviation-analyzer, rihal-docs-auditor, rihal-edge-case-hunter, rihal-executor, rihal-haitham, rihal-integration-checker, rihal-khalid, rihal-layla, rihal-nasser, rihal-noor, rihal-nyquist-auditor, rihal-omar, rihal-phase-researcher, rihal-planner, rihal-profiler, rihal-project-researcher, rihal-remediation-planner, rihal-research-synthesizer, rihal-roadmapper, rihal-security-adversary, rihal-security-auditor, rihal-sprint-checker, rihal-ui-auditor, rihal-ux-designer, rihal-verifier, rihal-yousef, rihal-zahra, rihal-zayd |

---

## Workflow References

| File | Loaded by |
|------|-----------|
| `auto-init-guard.md` | workflows/council.md, workflows/do.md, workflows/execute.md, workflows/new-project.md, workflows/plan.md, workflows/status.md |
| `git-preflight.md` | workflows/code-review-fix.md, workflows/dev-story.md, workflows/execute.md, workflows/quick.md |
| `output-format.md` | workflows/autonomous.md, workflows/council.md, workflows/decisions.md, workflows/discuss.md, workflows/do.md, workflows/execute.md, workflows/export-to-github.md, workflows/feature-drift.md, workflows/from-template.md, workflows/list-plans.md, workflows/map-codebase.md, workflows/new-milestone.md, workflows/new-project.md, workflows/next.md, workflows/notify-test.md, workflows/plan.md, workflows/replay.md, workflows/sprint-planning.md, workflows/sprint-status.md, workflows/status.md, workflows/verify-work.md |

---

## Specialist References

| File | Loaded by |
|------|-----------|
| `design-tokens.md` | rihal-haitham, workflows/lens-audit.md (Lens 11) |

---

## Persona ↔ SKILL.md Mapping (#714)

Persona agents are thin pointers — the bulk of each persona's playbook lives
in a `SKILL.md` at `rcode/skills/agents/<name>-<role>/SKILL.md` and gets pulled
in via `@-include`. This keeps agent files dependency-free + IDE-discoverable
while the playbook can grow without ballooning every spawn.

| Persona | Agent file | Playbook |
|---------|------------|----------|
| Hanzla | rihal-hanzla.md | rihal/skills/agents/hanzla-engineer/SKILL.md |
| Waleed | rihal-waleed.md | rihal/skills/agents/waleed-architect/SKILL.md |
| Sadiq | rihal-sadiq.md | rihal/skills/agents/sadiq-analyst/SKILL.md |
| Fatima | rihal-fatima.md | rihal/skills/agents/fatima-qa/SKILL.md |
| Mariam | rihal-mariam.md | rihal/skills/agents/mariam-marketing/SKILL.md |
| Layla | rihal-layla.md | rihal/skills/agents/layla-designer/SKILL.md |
| Hussain-PM | rihal-hussain-pm.md | rihal/skills/agents/hussain-pm/SKILL.md |
| Noor | rihal-noor.md | rihal/skills/agents/noor-writer/SKILL.md |
| Nasser | rihal-nasser.md | rihal/skills/agents/nasser-eng-manager/SKILL.md |
| Zahra | rihal-zahra.md | rihal/skills/agents/zahra-branding/SKILL.md |
| Ahmed | rihal-ahmed.md | rihal/skills/agents/ahmed-hassani-director/SKILL.md |
| Zayd | rihal-zayd.md | rihal/skills/agents/zayd-ml/SKILL.md |
| Yousef | rihal-yousef.md | rihal/skills/agents/yousef-backend/SKILL.md |
| Haitham | rihal-haitham.md | rihal/skills/agents/haitham-frontend/SKILL.md |
| Khalid | rihal-khalid.md | *(inline — 99L, no separate playbook)* |
| Omar | rihal-omar.md | *(inline — 96L, no separate playbook)* |

Khalid and Omar keep their content inline because no separate playbook
exists. Both are under the 100-line budget; extracting them to SKILL.md is
optional scope and not required for compliance.

---

## Size Compliance

The Agent File Size Rule (CONTRIBUTING.md:212) requires agents >100L to extract to references.

**All 45 agents currently comply** (max: 99L). The previously-listed exceptions
(`rihal-nyquist-auditor.md` at 176L, `rihal-docs-auditor.md` at 173L) were slimmed
in #713: their playbooks live in `nyquist-auditor-playbook.md` and
`docs-auditor-playbook.md` respectively.
