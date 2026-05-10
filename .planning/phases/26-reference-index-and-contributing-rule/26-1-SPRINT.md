---
phase: 26-reference-index-and-contributing-rule
sprint: 26.1
type: execute
wave: 1
depends_on: []
files_modified:
  - CONTRIBUTING.md
autonomous: true
requirements: []

must_haves:
  truths:
    - rihal/references/REFERENCES_INDEX.md exists and catalogs all 18 cluster references with their loading agents
    - CONTRIBUTING.md contains an "Agent File Size Rule" subsection under "Adding a New Agent"
    - The rule text includes ">100 lines", "extract to `rihal/references/`", and "@-include"
    - Accepted exceptions (nyquist-auditor 176L, docs-auditor 173L) are documented in the rule
    - node --test passes with no regression
  artifacts:
    - rihal/references/REFERENCES_INDEX.md (created — catalogue of reference file usages)
    - CONTRIBUTING.md (edited — Agent File Size Rule inserted after line 208)
  key_links:
    - CONTRIBUTING.md line 208 "Run `node --test` before opening a PR." is the insertion point — new subsection goes immediately after
    - REFERENCES_INDEX.md is human-maintained, not auto-generated — do not add a generation script
---

<objective>
Create rihal/references/REFERENCES_INDEX.md (catalogue of which reference files are loaded by which agents) and add the Agent File Size Rule subsection to CONTRIBUTING.md.
Purpose: With rihal/references/ growing to 64 files after phases 22-23, there is no single place to see what loads what. The contributing rule encodes the >100-line extraction pattern so future agent authors know the requirement before they write code.
Output: One new file (REFERENCES_INDEX.md), one targeted edit to CONTRIBUTING.md (~20 lines inserted). No other files touched.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/phases/26-reference-index-and-contributing-rule/CONTEXT.md
</context>

<tasks>

### Story 26.1.01 — Create rihal/references/REFERENCES_INDEX.md

**Type:** auto
**Wave:** 1
**Estimated time:** 20-30 min

<read_first>
- /home/hanzla/development/rihal-code/rihal/references/ (directory listing — already known: 64 files)
</read_first>

<action>
Create `/home/hanzla/development/rihal-code/rihal/references/REFERENCES_INDEX.md` with the following content exactly. This file is human-maintained — do NOT add a generation script or any tooling.

The file content is derived from actual grep results run against `rihal/agents/` and `rihal/workflows/`:

```markdown
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
| `karpathy-guidelines.md` / `karpathy-guidelines-full.md` | Most agents — see grep: `rg '@.rihal/references/karpathy' rihal/agents/` |
| `response-style.md` | Most agents — see grep: `rg '@.rihal/references/response-style' rihal/agents/` |

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
```

Do not add any other content. The file must exist at `rihal/references/REFERENCES_INDEX.md`.
</action>

<verify>
<automated>test -f /home/hanzla/development/rihal-code/rihal/references/REFERENCES_INDEX.md && grep -c "playbook" /home/hanzla/development/rihal-code/rihal/references/REFERENCES_INDEX.md | xargs -I{} echo "playbook refs: {}"</automated>
</verify>

<done>
- `rihal/references/REFERENCES_INDEX.md` exists
- File contains all 17 cluster references in the Cluster References table
- File contains the Workflow References section listing auto-init-guard and output-format
- File contains the Accepted Size Exceptions table for nyquist-auditor and docs-auditor
</done>

<evidence>
creates: rihal/references/REFERENCES_INDEX.md — confirmed via `test -f` returning NOT FOUND; no existing catalogue file present. Agent-to-reference mappings derived from live grep runs against rihal/agents/: `grep -rl "@.rihal/references/auditor-shared-checklists.md" rihal/agents/` → 6 hits (docs-auditor, edge-case-hunter, nyquist-auditor, security-adversary, security-auditor, ui-auditor); `grep -rl "@.rihal/references/persona-engineer-shared.md" rihal/agents/` → 3 hits (haitham, omar, yousef); `grep -rl "@.rihal/references/researcher-shared.md" rihal/agents/` → 4 hits (advisor-researcher, phase-researcher, profiler, project-researcher); all other playbook refs → 1 hit each matching their named agent.
</evidence>

---

### Story 26.1.02 — Add Agent File Size Rule to CONTRIBUTING.md

**Type:** auto
**Wave:** 1
**Estimated time:** 15-20 min

<read_first>
- /home/hanzla/development/rihal-code/CONTRIBUTING.md (lines 203-215 — insertion zone around line 208)
</read_first>

<action>
Edit `CONTRIBUTING.md`. Insert the Agent File Size Rule subsection immediately after line 208 (`Run \`node --test\` before opening a PR.`) and before the `---` separator on line 210.

The new content to insert between lines 208 and 210:

```markdown

### Agent File Size Rule

**If your agent file body exceeds 100 lines, you MUST extract the playbook to `rihal/references/`.**

Pattern:
1. Create `rihal/references/<name>-playbook.md` with the extracted content
2. Replace the extracted content in the agent file with `@.rihal/references/<name>-playbook.md`
3. Target: agent stub ≤100 lines (frontmatter + @-includes + short role description)

This rule exists because subagent spawning loads the full agent `.md` body into the model context.
Static playbook content (checklists, step-by-step flows, output templates) can be 70-77% of a
heavy agent — extracting it via `@-include` saves context budget on every spawn.

Accepted exceptions (document in VERIFICATION.md when you create them):
- `rihal-nyquist-auditor.md` (176L) — load-bearing XML execution blocks
- `rihal-docs-auditor.md` (173L) — load-bearing JSON schema for /rihal-feature-drift
```

Do NOT reformat, reorder, or touch any surrounding content. This is a pure insertion.

After the edit, the file must still parse cleanly and `node --test` must pass.
</action>

<verify>
<automated>grep -n "Agent File Size Rule" /home/hanzla/development/rihal-code/CONTRIBUTING.md && grep -n "nyquist-auditor" /home/hanzla/development/rihal-code/CONTRIBUTING.md && grep -n "docs-auditor" /home/hanzla/development/rihal-code/CONTRIBUTING.md</automated>
</verify>

<done>
- CONTRIBUTING.md contains the "### Agent File Size Rule" heading under "Adding a New Agent"
- Rule text includes the phrases ">100 lines", "extract to `rihal/references/`", and "@-include"
- Both nyquist-auditor (176L) and docs-auditor (173L) appear as accepted exceptions
- The `---` separator and "Critical Rule — Never Auto-Push" section follow unchanged
- `node --test` passes
</done>

<evidence>
lines: CONTRIBUTING.md:187-210 — confirmed by Read tool. Insertion point is after line 208 (`Run \`node --test\` before opening a PR.`) and before line 210 (`---`). File is 517 lines (confirmed via `wc -l`). No Agent File Size Rule exists today (`grep -n "Agent File Size Rule" CONTRIBUTING.md` returns 0 hits before this edit).
</evidence>

</tasks>

<verification>
```bash
# 1. Confirm REFERENCES_INDEX.md exists and has the cluster table
test -f /home/hanzla/development/rihal-code/rihal/references/REFERENCES_INDEX.md && echo "OK: index exists"
grep -c "playbook.md" /home/hanzla/development/rihal-code/rihal/references/REFERENCES_INDEX.md

# 2. Confirm CONTRIBUTING.md has the rule with required phrases
grep -c "Agent File Size Rule" /home/hanzla/development/rihal-code/CONTRIBUTING.md
grep -c "100 lines" /home/hanzla/development/rihal-code/CONTRIBUTING.md
grep -c "@-include" /home/hanzla/development/rihal-code/CONTRIBUTING.md
grep -c "nyquist-auditor" /home/hanzla/development/rihal-code/CONTRIBUTING.md
grep -c "docs-auditor" /home/hanzla/development/rihal-code/CONTRIBUTING.md

# 3. Tests pass
cd /home/hanzla/development/rihal-code && node --test 2>&1 | tail -5
```
</verification>

<success_criteria>
1. `rihal/references/REFERENCES_INDEX.md` exists and lists all 17 cluster references (17 playbook/shared + codebase-mapping-process) with verified loading agents
2. CONTRIBUTING.md contains "Agent File Size Rule" subsection under "Adding a New Agent" (confirmed by grep)
3. Rule text contains ">100 lines", "extract to `rihal/references/`", "@-include" (all three present)
4. Accepted exceptions nyquist-auditor (176L) and docs-auditor (173L) appear in both CONTRIBUTING.md and REFERENCES_INDEX.md
5. `node --test` passes with 0 failures
</success_criteria>

<output>
Create `.planning/phases/26-reference-index-and-contributing-rule/26-1-SUMMARY.md`
</output>
