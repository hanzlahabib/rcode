# Phase 26 — Reference Index and Contributing Rule

**Issue:** #716
**Branch:** rcode/autonomous-m1-agent-slim-20260510-125703
**Preceded by:** Phase 25 (rcode agent CLI) — VERIFIED ✓

## Goal

After phases 22-23 added 18 new reference files, `rcode/references/` has grown to 64 files.
Phase 26 adds:
1. `rcode/references/REFERENCES_INDEX.md` — catalogue of which references are loaded by which agents
2. A rule in `CONTRIBUTING.md` § "Adding a New Agent" — if agent body >100 lines, extract to references + @-include

## Current State

- `rcode/references/` has 64 .md files (up from ~46 before phases 22-23)
- 18 new cluster references exist: *-playbook.md, *-shared.md, codebase-mapping-process.md
- 2 agents still >100L (documented accepted deviations): nyquist-auditor (176L), docs-auditor (173L)
- All other agents ≤100L

## Deliverable 1: rcode/references/REFERENCES_INDEX.md

A catalogue document. Format:

```markdown
# References Index

Auto-maintained catalogue of which reference files are loaded by which agents.
Source: `rcode/references/` (tracked). Runtime: `.rcode/references/` (gitignored, installed by `cli/install.js`).

## Cluster References (added phases 22-23)

| File | Loaded by |
|------|-----------|
| integration-verification-playbook.md | rcode-integration-checker |
| research-synthesis-playbook.md | rcode-research-synthesizer |
| codebase-mapping-process.md | rcode-codebase-mapper |
| persona-engineer-shared.md | rcode-haitham, rcode-omar, rcode-yousef |
| auditor-shared-checklists.md | rcode-ui-auditor, rcode-security-auditor, rcode-security-adversary, rcode-edge-case-hunter, rcode-nyquist-auditor, rcode-docs-auditor |
| researcher-shared.md | rcode-phase-researcher, rcode-project-researcher, rcode-advisor-researcher, rcode-profiler |
| planner-playbook.md | rcode-planner |
| sprint-checker-playbook.md | rcode-sprint-checker |
| executor-playbook.md | rcode-executor |
| ... (other playbooks) | (their respective agents) |

## Universal References (loaded by all agents)

| File | Loaded by |
|------|-----------|
| agent-shared-rules.md | 6 persona agents (hanzla, waleed, sadiq, fatima, hussain-pm, mariam) |
| response-style.md | 4 persona agents (ahmed, layla, nasser, noor) |
| codebase-grounding.md | Most agents |
| karpathy-guidelines.md | Agents where code review is in scope |

## Workflow References

| File | Loaded by |
|------|-----------|
| auto-init-guard.md | plan.md, execute.md, discuss-phase.md, verify-phase.md |
| output-format.md | plan.md, execute.md |
| ... |
```

**How to build it:** Grep each cluster reference file for its `@-include` usages across all agents.

## Deliverable 2: CONTRIBUTING.md rule

Add under `## Adding a New Agent — Registration Checklist` (line 187), after the parity-tests paragraph:

```markdown
### Agent File Size Rule

**If your agent file body exceeds 100 lines, you MUST extract the playbook to `rcode/references/`.**

Pattern:
1. Create `rcode/references/<name>-playbook.md` with the extracted content
2. Replace the extracted content in the agent file with `@.rcode/references/<name>-playbook.md`
3. Target: agent stub ≤100 lines (frontmatter + @-includes + short role description)

This rule exists because subagent spawning loads the full agent `.md` body into the model context.
Static playbook content (checklists, step-by-step flows, output templates) can be 70-77% of a
heavy agent — extracting it via `@-include` saves context budget on every spawn.

Accepted exceptions (document in VERIFICATION.md when you create them):
- `rcode-nyquist-auditor.md` (176L) — load-bearing XML execution blocks
- `rcode-docs-auditor.md` (173L) — load-bearing JSON schema for /rcode-feature-drift
```

## Success Criteria

1. `rcode/references/REFERENCES_INDEX.md` exists and lists all 18 cluster references with their loading agents
2. `CONTRIBUTING.md` contains the "Agent File Size Rule" subsection under "Adding a New Agent"
3. The rule text includes: ">100 lines", "extract to `rcode/references/`", "@-include" 
4. Accepted exceptions (nyquist-auditor, docs-auditor) are documented in the rule
5. `node --test` still passes (no regression)

## Files to Create / Edit

1. **NEW** `rcode/references/REFERENCES_INDEX.md`
2. **EDIT** `CONTRIBUTING.md` — add Agent File Size Rule subsection (~20 lines)
