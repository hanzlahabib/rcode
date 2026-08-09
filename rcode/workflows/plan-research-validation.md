<purpose>
Sub-steps of plan.md — Steps 5 through 5.7. Handles research, validation architecture, security threat model gate, UI design contract gate, and schema push detection.
</purpose>

## 5. Handle Research

**Skip if:** `--gaps` flag or `--skip-research` flag or `--reviews` flag.

**If `has_research` is true (from init) AND no `--research` flag:** Use existing, skip to step 6.

**If RESEARCH.md missing AND `has_context` is true AND no `--research` flag:** Skip research silently and proceed to step 6. CONTEXT.md already captures the user's design decisions — re-researching adds tokens without new signal. Display: `Research skipped — CONTEXT.md found (use --research to force)`.

**If RESEARCH.md missing OR `--research` flag:**

**If no explicit flag (`--research` or `--skip-research`) and not `--auto`:**
Ask the user whether to research, with a contextual recommendation based on the phase:

If `TEXT_MODE` is true, present as a plain-text numbered list:
```
Research before planning Phase {X}: {phase_name}?

1. Research first (Recommended) — Investigate domain, patterns, and dependencies before planning. Best for new features, unfamiliar integrations, or architectural changes.
2. Skip research — Plan directly from context and requirements. Best for bug fixes, simple refactors, or well-understood tasks.

Enter number:
```

Otherwise use AskUserQuestion:
```
AskUserQuestion([
  {
    question: "Research before planning Phase {X}: {phase_name}?",
    header: "Research",
    multiSelect: false,
    options: [
      { label: "Research first (Recommended)", description: "Investigate domain, patterns, and dependencies before planning. Best for new features, unfamiliar integrations, or architectural changes." },
      { label: "Skip research", description: "Plan directly from context and requirements. Best for bug fixes, simple refactors, or well-understood tasks." }
    ]
  }
])
```

If user selects "Skip research": skip to step 6.

**If `--auto` and `research_enabled` is false:** Skip research silently (preserves automated behavior).

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► RESEARCHING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning researcher...
```

### Spawn rcode-phase-researcher

```bash
PHASE_DESC=$(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}" --pick section)
```

Research prompt:

```markdown
<objective>
Research how to implement Phase {phase_number}: {phase_name}
Answer: "What do I need to know to PLAN this phase well?"
</objective>

<files_to_read>
- {context_path} (USER DECISIONS from /rcode-discuss-phase)
- {requirements_path} (Project requirements)
- {state_path} (Project decisions and history)
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<additional_context>
**Phase description:** {phase_description}
**Phase requirement IDs (MUST address):** {phase_req_ids}

**Project instructions:** Read ./CLAUDE.md if exists — follow project-specific guidelines
**Project skills:** Check .claude/skills/ or .agents/skills/ directory (if either exists) — read SKILL.md files, research should account for project skill patterns
</additional_context>

<output>
Write to: {phase_dir}/{phase_num}-RESEARCH.md

**MANDATORY section — include even if brief:**

```markdown
## Validation Architecture

| Concern | Test File | Command | When (Wave) |
|---------|-----------|---------|-------------|
| {feature} | {path/to/test.ts} | {run command} | Wave {N} |
```

This section is required to enable Dimension 8 (Nyquist Compliance) in the plan checker. If no automated tests are feasible for this phase, write:

```markdown
## Validation Architecture

Manual verification only — no automated test files planned for this phase.
Reason: {explain why}
```
</output>
```

```
Task(
  prompt=research_prompt,
  subagent_type="rcode-phase-researcher",
  model="{model}",
  model="{researcher_model}",
  description="Research Phase {phase}"
)
```

### Handle Researcher Return

- **`## RESEARCH COMPLETE`:** Display confirmation, continue to step 6
- **`## RESEARCH BLOCKED`:** Display blocker, offer: 1) Provide context, 2) Skip research, 3) Abort

## 5.5. Create Validation Strategy

Skip if `nyquist_validation_enabled` is false OR `research_enabled` is false.

If `research_enabled` is false and `nyquist_validation_enabled` is true: warn "Nyquist validation enabled but research disabled — VALIDATION.md cannot be created without RESEARCH.md. Plans will lack validation requirements (Dimension 8)." Continue to step 6.

**But Nyquist is not applicable for this run** when all of the following are true:
- `research_enabled` is false
- `has_research` is false
- no `--research` flag was provided

In that case: **skip validation-strategy creation entirely**. Do **not** expect `RESEARCH.md` or `VALIDATION.md` for this run, and continue to Step 6.

```bash
grep -l "## Validation Architecture" "${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null || true
```

**If found:**
1. Read template: `.rcode/templates/VALIDATION.md`
2. Write to `${PHASE_DIR}/${PADDED_PHASE}-VALIDATION.md` (use Write tool)
3. Fill frontmatter: `{N}` → phase number, `{phase-slug}` → slug, `{date}` → current date
4. Verify:
```bash
test -f "${PHASE_DIR}/${PADDED_PHASE}-VALIDATION.md" && echo "VALIDATION_CREATED=true" || echo "VALIDATION_CREATED=false"
```
5. If `VALIDATION_CREATED=false`: STOP — do not proceed to Step 6
6. If `commit_docs`: `commit "docs(phase-${PHASE}): add validation strategy"`

**If not found:** Warn and continue — plans may fail Dimension 8.

## 5.55. Security Threat Model Gate

> Skip if `workflow.security_enforcement` is explicitly `false`. Absent = enabled.

```bash
SECURITY_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.security_enforcement --raw 2>/dev/null)
SECURITY_CFG=${SECURITY_CFG:-true}  # config-get exits 0 with empty output when key absent; || fallback won't fire
SECURITY_ASVS=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.security_asvs_level --raw 2>/dev/null)
SECURITY_ASVS=${SECURITY_ASVS:-1}  # config-get exits 0 with empty output when key absent; || fallback won't fire
SECURITY_BLOCK=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.security_block_on --raw 2>/dev/null)
SECURITY_BLOCK=${SECURITY_BLOCK:-high}  # config-get exits 0 with empty output when key absent; || fallback won't fire
```

**If `SECURITY_CFG` is `false`:** Skip to step 5.6.

**If `SECURITY_CFG` is `true`:** Display banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► SECURITY THREAT MODEL REQUIRED (ASVS L{SECURITY_ASVS})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each SPRINT.md must include a <threat_model> block.
Block on: {SECURITY_BLOCK} severity threats.
Opt out: set security_enforcement: false in .rcode/config.yaml (`node .rcode/bin/rcode-tools.cjs config-set security_enforcement false`)
```

Continue to step 5.6. Security config is passed to the planner in step 8.

## 5.6. UI Design Contract Gate

> Skip if `workflow.ui_phase` is explicitly `false` AND `workflow.ui_safety_gate` is explicitly `false` in `.rcode/config.yaml`. If keys are absent, treat as enabled.

```bash
UI_PHASE_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.ui_phase 2>/dev/null)
UI_PHASE_CFG=${UI_PHASE_CFG:-true}  # config-get exits 0 with empty output when key absent; || fallback won't fire
UI_GATE_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.ui_safety_gate 2>/dev/null)
UI_GATE_CFG=${UI_GATE_CFG:-true}  # config-get exits 0 with empty output when key absent; || fallback won't fire
```

**If both are `false`:** Skip to step 6.

Check if phase has frontend indicators:

```bash
PHASE_SECTION=$(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}" 2>/dev/null)
echo "$PHASE_SECTION" | grep -iE "UI|interface|frontend|component|layout|page|screen|view|form|dashboard|widget" > /dev/null 2>&1
HAS_UI=$?
```

**If `HAS_UI` is 0 (frontend indicators found):**

Check for existing UI-SPEC:
```bash
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
```

**If UI-SPEC.md found:** Set `UI_SPEC_PATH=$UI_SPEC_FILE`. Display: `Using UI design contract: ${UI_SPEC_PATH}`

**If UI-SPEC.md missing AND `UI_GATE_CFG` is `true`:**

Read auto-chain state:
```bash
AUTO_CHAIN=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
```

**If `AUTO_CHAIN` is `true` (running inside a `--chain` or `--auto` pipeline):**

Auto-generate UI-SPEC without prompting:
```
Skill(skill="rcode-ui-phase", args="${PHASE} --auto ${RCODE_WS}")
```
After `rcode-ui-phase` returns, re-read:
```bash
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
UI_SPEC_PATH="${UI_SPEC_FILE}"
```
Continue to step 6.

**If `AUTO_CHAIN` is `false` (manual invocation):**

If `TEXT_MODE` is true, present as a plain-text numbered list:
```
Phase {N} has frontend indicators but no UI-SPEC.md. Generate a design contract before planning?

1. Generate UI-SPEC first — Run /rcode-ui-phase {N} then re-run /rcode-plan {N}
2. Continue without UI-SPEC
3. Not a frontend phase

Enter number:
```

Otherwise use AskUserQuestion:
- header: "UI Design Contract"
- question: "Phase {N} has frontend indicators but no UI-SPEC.md. Generate a design contract before planning?"
- options:
  - "Generate UI-SPEC first" → Display: "Run `/rcode-ui-phase {N} ${RCODE_WS}` then re-run `/rcode-plan {N} ${RCODE_WS}`". Exit workflow.
  - "Continue without UI-SPEC" → Continue to step 6.
  - "Not a frontend phase" → Continue to step 6.

**If `HAS_UI` is 1 (no frontend indicators):** Skip silently to step 5.7.

## 5.7. Schema Push Detection Gate

> Detects schema-relevant files in the phase scope and injects a mandatory `[BLOCKING]` schema push task into the plan. Prevents false-positive verification where build/types pass because TypeScript types come from config, not the live database.

Check if any files in the phase scope match schema patterns:

```bash
PHASE_SECTION=$(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}" --pick section 2>/dev/null)
```

Scan `PHASE_SECTION`, `CONTEXT.md` (if loaded), and `RESEARCH.md` (if exists) for file paths matching these ORM patterns:

| ORM | File Patterns |
|-----|--------------|
| Payload CMS | `src/collections/**/*.ts`, `src/globals/**/*.ts` |
| Prisma | `prisma/schema.prisma`, `prisma/schema/*.prisma` |
| Drizzle | `drizzle/schema.ts`, `src/db/schema.ts`, `drizzle/*.ts` |
| Supabase | `supabase/migrations/*.sql` |
| TypeORM | `src/entities/**/*.ts`, `src/migrations/**/*.ts` |

Also check if any existing SPRINT.md files for this phase already reference these file patterns in `files_modified`.

**If schema-relevant files detected:**

Set `SCHEMA_PUSH_REQUIRED=true` and `SCHEMA_ORM={detected_orm}`.

Determine the push command for the detected ORM:

| ORM | Push Command | Non-TTY Workaround |
|-----|-------------|-------------------|
| Payload CMS | `npx payload migrate` | `CI=true PAYLOAD_MIGRATING=true npx payload migrate` |
| Prisma | `npx prisma db push` | `npx prisma db push --accept-data-loss` (if destructive) |
| Drizzle | `npx drizzle-kit push` | `npx drizzle-kit push` |
| Supabase | `supabase db push` | Set `SUPABASE_ACCESS_TOKEN` env var |
| TypeORM | `npx typeorm migration:run` | `npx typeorm migration:run -d src/data-source.ts` |

Inject the following into the planner prompt (step 8) as an additional constraint:

```markdown
<schema_push_requirement>
**[BLOCKING] Schema Push Required**

This phase modifies schema-relevant files ({detected_files}). The planner MUST include
a `[BLOCKING]` task that runs the database schema push command AFTER all schema file
modifications are complete but BEFORE verification.

- ORM detected: {SCHEMA_ORM}
- Push command: {push_command}
- Non-TTY workaround: {env_hint}
- If push requires interactive prompts that cannot be suppressed, flag the task for
  manual intervention with `autonomous: false`

This task is mandatory — the phase CANNOT pass verification without it. Build and
type checks will pass without the push (types come from config, not the live database),
creating a false-positive verification state.
</schema_push_requirement>
```

Display: `Schema files detected ({SCHEMA_ORM}) — [BLOCKING] push task will be injected into plans`

**If no schema-relevant files detected:** Skip silently to step 6.


## Next Up

This is a sub-step invoked by `/rcode-plan`. If you reached this directly:

- `/rcode-plan` — re-enter the parent flow which validates research and dispatches the planner
- `/rcode-status` — see where you are in the current phase lifecycle
