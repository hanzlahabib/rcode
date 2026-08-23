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
| `assumptions-analyzer-playbook.md` | rcode-assumptions-analyzer |
| `auditor-shared-checklists.md` | rcode-docs-auditor, rcode-edge-case-hunter, rcode-nyquist-auditor, rcode-security-adversary, rcode-security-auditor, rcode-ui-auditor |
| `code-fixer-playbook.md` | rcode-fixer |
| `code-reviewer-playbook.md` | rcode-reviewer |
| `codebase-mapping-process.md` | rcode-codebase-mapper |
| `debugger-playbook.md` | rcode-debugger |
| `docs-auditor-playbook.md` | rcode-docs-auditor |
| `executor-playbook.md` | rcode-executor |
| `integration-verification-playbook.md` | rcode-integration-checker |
| `nyquist-auditor-playbook.md` | rcode-nyquist-auditor |
| `persona-engineer-shared.md` | rcode-haitham, rcode-omar, rcode-yousef |
| `planner-playbook.md` | rcode-planner |
| `remediation-planner-playbook.md` | rcode-remediation-planner |
| `research-synthesis-playbook.md` | rcode-research-synthesizer |
| `researcher-shared.md` | rcode-advisor-researcher, rcode-phase-researcher, rcode-profiler, rcode-project-researcher |
| `roadmapper-playbook.md` | rcode-roadmapper |
| `sprint-checker-playbook.md` | rcode-sprint-checker |
| `ux-designer-playbook.md` | rcode-ux-designer |
| `verifier-playbook.md` | rcode-verifier |

---

## Universal References (loaded by most agents)

| File | Loaded by |
|------|-----------|
| `agent-shared-rules.md` | rcode-fatima, rcode-hanzla, rcode-hussain-pm, rcode-mariam, rcode-sadiq, rcode-waleed |
| `codebase-grounding.md` | rcode-ahmed, rcode-fatima, rcode-haitham, rcode-hanzla, rcode-hussain-pm, rcode-khalid, rcode-layla, rcode-mariam, rcode-nasser, rcode-noor, rcode-omar, rcode-sadiq, rcode-waleed, rcode-yousef, rcode-zahra, rcode-zayd |
| `karpathy-guidelines.md` | rcode-assumptions-analyzer, rcode-fixer, rcode-debugger, rcode-deviation-analyzer, rcode-fatima, rcode-haitham, rcode-hanzla, rcode-hussain-pm, rcode-integration-checker, rcode-khalid, rcode-noor, rcode-omar, rcode-phase-researcher, rcode-profiler, rcode-project-researcher, rcode-remediation-planner, rcode-research-synthesizer, rcode-roadmapper, rcode-ui-auditor, rcode-ux-designer, rcode-waleed, rcode-yousef, rcode-zayd |
| `karpathy-guidelines-full.md` | rcode-codebase-mapper, rcode-reviewer, rcode-docs-auditor, rcode-edge-case-hunter, rcode-executor, rcode-nyquist-auditor, rcode-planner, rcode-security-adversary, rcode-security-auditor, rcode-sprint-checker, rcode-verifier |
| `response-style.md` | rcode-advisor-researcher, rcode-ahmed, rcode-assumptions-analyzer, rcode-codebase-mapper, rcode-fixer, rcode-reviewer, rcode-debugger, rcode-deviation-analyzer, rcode-docs-auditor, rcode-edge-case-hunter, rcode-executor, rcode-haitham, rcode-integration-checker, rcode-khalid, rcode-layla, rcode-nasser, rcode-noor, rcode-nyquist-auditor, rcode-omar, rcode-phase-researcher, rcode-planner, rcode-profiler, rcode-project-researcher, rcode-remediation-planner, rcode-research-synthesizer, rcode-roadmapper, rcode-security-adversary, rcode-security-auditor, rcode-sprint-checker, rcode-ui-auditor, rcode-ux-designer, rcode-verifier, rcode-yousef, rcode-zahra, rcode-zayd |

| `github-comment-style.md` | ship, pr-branch, export-to-github, review-adversarial, rcode-herdr-orchestration, and any agent dispatched into a repo with a GitHub remote |

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
| `design-tokens.md` | rcode-haitham, workflows/lens-audit.md (Lens 11) |

---

## Persona ↔ SKILL.md Mapping (#714)

Persona agents are thin pointers — the bulk of each persona's playbook lives
in a `SKILL.md` at `rcode/skills/agents/<name>-<role>/SKILL.md` and gets pulled
in via `@-include`. This keeps agent files dependency-free + IDE-discoverable
while the playbook can grow without ballooning every spawn.

| Persona | Agent file | Playbook |
|---------|------------|----------|
| Hanzla | rcode-hanzla.md | rcode/skills/agents/hanzla-engineer/SKILL.md |
| Waleed | rcode-waleed.md | rcode/skills/agents/waleed-architect/SKILL.md |
| Sadiq | rcode-sadiq.md | rcode/skills/agents/sadiq-analyst/SKILL.md |
| Fatima | rcode-fatima.md | rcode/skills/agents/fatima-qa/SKILL.md |
| Mariam | rcode-mariam.md | rcode/skills/agents/mariam-marketing/SKILL.md |
| Layla | rcode-layla.md | rcode/skills/agents/layla-designer/SKILL.md |
| Hussain-PM | rcode-hussain-pm.md | rcode/skills/agents/hussain-pm/SKILL.md |
| Noor | rcode-noor.md | rcode/skills/agents/noor-writer/SKILL.md |
| Nasser | rcode-nasser.md | rcode/skills/agents/nasser-eng-manager/SKILL.md |
| Zahra | rcode-zahra.md | rcode/skills/agents/zahra-branding/SKILL.md |
| Ahmed | rcode-ahmed.md | rcode/skills/agents/ahmed-hassani-director/SKILL.md |
| Zayd | rcode-zayd.md | rcode/skills/agents/zayd-ml/SKILL.md |
| Yousef | rcode-yousef.md | rcode/skills/agents/yousef-backend/SKILL.md |
| Haitham | rcode-haitham.md | rcode/skills/agents/haitham-frontend/SKILL.md |
| Khalid | rcode-khalid.md | *(inline — 99L, no separate playbook)* |
| Omar | rcode-omar.md | *(inline — 96L, no separate playbook)* |

Khalid and Omar keep their content inline because no separate playbook
exists. Both are under the 100-line budget; extracting them to SKILL.md is
optional scope and not required for compliance.

---

## Size Compliance

The Agent File Size Rule (CONTRIBUTING.md:212) requires agents >100L to extract to references.

**All 45 agents currently comply** (max: 99L). The previously-listed exceptions
(`rcode-nyquist-auditor.md` at 176L, `rcode-docs-auditor.md` at 173L) were slimmed
in #713: their playbooks live in `nyquist-auditor-playbook.md` and
`docs-auditor-playbook.md` respectively.
