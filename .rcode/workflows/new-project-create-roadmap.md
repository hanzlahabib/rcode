<purpose>
Sub-step of new-project.md — Step 8 Create Roadmap. Spawns rcode-roadmapper agent to build ROADMAP.md from requirements and project type. Includes approval gate and commit.
</purpose>

## 8. Create Roadmap

Display stage banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► CREATING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning roadmapper...
```

Spawn rcode-roadmapper agent:

```
Task(prompt="
<planning_context>

<files_to_read>
- .planning/PROJECT.md (Project context)
- .planning/REQUIREMENTS.md (v1 Requirements)
- .planning/research/SUMMARY.md (Research findings - if exists)
- .rcode/config.yaml (Granularity and mode settings — read via `node rcode-tools.cjs config-get <key>`)
</files_to_read>

${AGENT_ROADMAPPER}

</planning_context>

<instructions>
Create roadmap:
1. Derive phases from requirements (don't impose structure)
2. Map every v1 requirement to exactly one phase
3. Derive 2-5 success criteria per phase (observable user behaviors)
4. Validate 100% coverage
5. Write files immediately (ROADMAP.md, STATE.md, update REQUIREMENTS.md traceability)
6. Return ROADMAP CREATED with summary

Write files first, then return. This ensures artifacts persist even if context is lost.
</instructions>
", subagent_type="rcode-roadmapper", model="${ROADMAPPER_MODEL}", description="Create roadmap")
```

**Handle roadmapper return:**

**Stub guard — verify ROADMAP.md has real content:**

After the agent returns (any return signal), run:

```bash
ROADMAP_LINES=$(wc -l < .planning/ROADMAP.md 2>/dev/null || echo 0)
ROADMAP_HAS_PHASE=$(grep -c "^## Phase\|^| [0-9]" .planning/ROADMAP.md 2>/dev/null || echo 0)
```

If `.planning/ROADMAP.md` does not exist, OR `ROADMAP_LINES < 10`, OR `ROADMAP_HAS_PHASE == 0`:

```
❌ ROADMAP.md is missing or still a stub (no phase headings detected).
Re-spawning roadmapper...
```

Re-spawn rcode-roadmapper with the same prompt. If it fails a second time, output:

```
❌ roadmapper failed twice — ROADMAP.md was not created.
Blockers:
- Check that .planning/REQUIREMENTS.md exists and has content
- Check that rcode-roadmapper agent is installed: node .rcode/bin/rcode-tools.cjs agent-info rcode-roadmapper

Cannot continue without a valid ROADMAP.md. Fix the blocker and re-run /rcode-new-project.
```

STOP — do not proceed to approval gate.

**If `## ROADMAP BLOCKED`:**

- Present blocker information
- Work with user to resolve
- Re-spawn when resolved

**If `## ROADMAP CREATED`:**

Read the created ROADMAP.md and present it nicely inline:

```
---

## Proposed Roadmap

**[N] phases** | **[X] requirements mapped** | All v1 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | [Name] | [Goal] | [REQ-IDs] | [count] |
| 2 | [Name] | [Goal] | [REQ-IDs] | [count] |
| 3 | [Name] | [Goal] | [REQ-IDs] | [count] |

### Phase Details

**Phase 1: [Name]**
Goal: [goal]
Requirements: [REQ-IDs]
Success criteria:
1. [criterion]
2. [criterion]
3. [criterion]

[... continue for all phases ...]

---
```

**If auto mode:** Skip approval gate — auto-approve and commit directly.

**CRITICAL: Ask for approval before committing (interactive mode only):**

Use AskUserQuestion:

- header: "Roadmap"
- question: "Does this roadmap structure work for you?"
- options:
  - "Approve" — Commit and continue
  - "Adjust phases" — Tell me what to change
  - "Review full file" — Show raw ROADMAP.md

**If "Approve":** Continue to commit.

**If "Adjust phases":**

- Get user's adjustment notes
- Re-spawn roadmapper with revision context:

  ```
  Task(prompt="
  <revision>
  User feedback on roadmap:
  [user's notes]

  <files_to_read>
  - .planning/ROADMAP.md (Current roadmap to revise)
  </files_to_read>

  ${AGENT_ROADMAPPER}

  Update the roadmap based on feedback. Edit files in place.
  Return ROADMAP REVISED with changes made.
  </revision>
  ", subagent_type="rcode-roadmapper", model="${ROADMAPPER_MODEL}", description="Revise roadmap")
  ```

- Present revised roadmap
- Loop until user approves

**If "Review full file":** Display raw `cat .planning/ROADMAP.md`, then re-ask.

**Generate or refresh project instruction file before final commit:**

The rcode-tools CLI does not expose a `generate-claude-md` subcommand. Instead, if `$INSTRUCTION_FILE` does not already exist, write a minimal instruction file pointing at the rcode workflow docs:

```markdown
# {INSTRUCTION_FILE} — project instructions

This project uses rcode for planning and execution. See `.planning/PROJECT.md` for context and `.planning/ROADMAP.md` for phases.

Common commands:
- /rcode-progress — check status and next action
- /rcode-discuss-phase N — gather context before planning phase N
- /rcode-plan N — create a SPRINT.md for phase N
- /rcode-execute N — execute a SPRINT.md
- /rcode-verify-work — conversational UAT
- /rcode-complete-milestone — archive milestone and reset

Rules:
- Never run `git push` without explicit user authorization.
- No Claude/AI attribution in commits.
- Prefer editing existing files over creating new ones.
```

If it already exists, leave it alone (respect user-customized content).

**Commit roadmap (guarded):**

```bash
git add \
  .planning/ROADMAP.md \
  .planning/STATE.md \
  .planning/REQUIREMENTS.md \
  "$INSTRUCTION_FILE" 2>/dev/null \
&& git commit -m "docs: create roadmap ([N] phases)" 2>/dev/null \
|| echo "ℹ .planning/ gitignored — roadmap written, not committed (instruction file committed separately)"

# Fallback: also try committing just the instruction file if .planning was ignored
git add "$INSTRUCTION_FILE" 2>/dev/null && git commit -m "docs: add project instruction file" 2>/dev/null || true

# Sync all roadmapper-created phases into state.json.
# rcode-roadmapper writes ROADMAP.md as text — it never calls `phase add` — so
# state.json is empty after this step unless we sync it. Without this, every
# /rcode-status shows "N phases not registered" warnings immediately after init.
node ".rcode/bin/rcode-tools.cjs" state sync --from-disk 2>/dev/null || true
```

