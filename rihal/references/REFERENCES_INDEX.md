# References Index

Human-maintained catalogue of which reference files are loaded by which agents and workflows.

Source: `rihal/references/` (tracked in git).
Runtime: `.rihal/references/` (gitignored, installed by `cli/install.js`).

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
| `executor-playbook.md` | rihal-executor |
| `integration-verification-playbook.md` | rihal-integration-checker |
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
| `output-format.md` | workflows/autonomous.md, workflows/council.md, workflows/decisions.md, workflows/discuss.md, workflows/do.md, workflows/execute.md, workflows/export-to-github.md, workflows/feature-drift.md, workflows/from-template.md, workflows/list-plans.md, workflows/map-codebase.md, workflows/new-milestone.md, workflows/new-project.md, workflows/next.md, workflows/notify-test.md, workflows/plan.md, workflows/replay.md, workflows/sprint-planning.md, workflows/sprint-status.md, workflows/status.md, workflows/verify-work.md |

---

## Agents with Accepted Size Exceptions

The Agent File Size Rule (CONTRIBUTING.md) requires agents >100L to extract to references.
Two agents have documented deviations:

| Agent | Lines | Reason |
|-------|-------|--------|
| `rihal-nyquist-auditor.md` | 176L | Load-bearing XML execution blocks that cannot be separated from agent logic |
| `rihal-docs-auditor.md` | 173L | Load-bearing JSON schema for /rihal-feature-drift dispatch |
