# discuss-phase - step 06: Confirm creation, git commit, update state

This step file was split verbatim out of `workflows/discuss-phase.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="confirm_creation">
Present summary and next steps:

```
Created: .planning/phases/${PADDED_PHASE}-${SLUG}/${PADDED_PHASE}-CONTEXT.md

## Decisions Captured

### [Category]
- [Key decision]

### [Category]
- [Key decision]

[If deferred ideas exist:]
## Noted for Later
- [Deferred idea] — future phase

---

## ▶ Next Up

**Phase ${PHASE}: [Name]** — [Goal from ROADMAP.md]

`/clear` then:

`/rcode-plan ${PHASE} ${RCODE_WS}`

---

**Also available:**
- `/rcode-discuss-phase ${PHASE} --chain ${RCODE_WS}` — re-run with auto plan+execute after
- `/rcode-plan ${PHASE} --skip-research ${RCODE_WS}` — plan without research
- `/rcode-ui-phase ${PHASE} ${RCODE_WS}` — generate UI design contract before planning (if phase has frontend work)
- Review/edit CONTEXT.md before continuing

---
```
</step>

<step name="git_commit">
**Write DISCUSSION-LOG.md before committing:**

**File location:** `${phase_dir}/${padded_phase}-DISCUSSION-LOG.md`

```markdown
# Phase [X]: [Name] - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** [ISO date]
**Phase:** [phase number]-[phase name]
**Areas discussed:** [comma-separated list]

---

[For each gray area discussed:]

## [Area Name]

| Option | Description | Selected |
|--------|-------------|----------|
| [Option 1] | [Description from AskUserQuestion] | |
| [Option 2] | [Description] | ✓ |
| [Option 3] | [Description] | |

**User's choice:** [Selected option or free-text response]
**Notes:** [Any clarifications, follow-up context, or rationale the user provided]

---

[Repeat for each area]

## Claude's Discretion

[List areas where user said "you decide" or deferred to Claude]

## Deferred Ideas

[Ideas mentioned during discussion that were noted for future phases]
```

Write file.

**Clean up checkpoint file** — CONTEXT.md is now the canonical record:

```bash
rm -f "${phase_dir}/${padded_phase}-DISCUSS-CHECKPOINT.json"
```

Commit phase context and discussion log:

```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs(${padded_phase}): capture phase context" --files "${phase_dir}/${padded_phase}-CONTEXT.md" "${phase_dir}/${padded_phase}-DISCUSSION-LOG.md"
```

Confirm: "Committed: docs(${padded_phase}): capture phase context"
</step>

<step name="update_state">
Update STATE.md with session info:

```bash
node ".rcode/bin/rcode-tools.cjs" state record-session \
  --stopped-at "Phase ${PHASE} context gathered" \
  --resume-file "${phase_dir}/${padded_phase}-CONTEXT.md"
```

Commit STATE.md:

```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs(state): record phase ${PHASE} context session" --files .planning/STATE.md
```
</step>

Next: Read `.rcode/workflows/discuss-phase/steps/07-auto-advance-power.md` before starting it (skip it if its Read-when condition is false).
