# new-project - step 04: Deep questioning, project type detection

This step file was split verbatim out of `workflows/new-project.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 3. Deep Questioning

**If auto mode:** extract project context from the provided document instead of
asking. **You still owe the user the Mandatory decision set** — resolve each item
from the document where it answers one, and where it does not, list what you are
assuming before Step 4 writes PROJECT.md. Auto mode removes the conversation, not
the accountability. If the document leaves the maintainer or the stack unanswered,
stop and ask those two regardless of mode.

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► QUESTIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Open the conversation:**

Ask inline (freeform, NOT AskUserQuestion):

"What do you want to build?"

**Then, before any deeper questioning, run two short probes from
`@.rcode/references/questioning.md` — in this order:**

1. **Stakes calibration** — hobby/solo, internal tool, or launch? Scale every
   artifact and gate below to the answer. Do not run the launch-grade pipeline on
   a weekend project.
2. **Working mode** — Fast path (batched questions, draft with `[ASSUMPTION]`
   tags) or Coaching path (walk the decisions together)? **Ask it. Never infer it
   from `auto_advance`, from how detailed their opening message was, or from your
   own read of their hurry.** Only `--auto`/yolo picks Fast path without asking.

These two answers govern the rest of this workflow. Record them with
`state add-decision` so a later resume does not re-guess them.

Wait for their response. This gives you the context needed to ask intelligent follow-up questions.

**Research-before-questions mode:** Check if `workflow.research_before_questions` is enabled in `.rcode/config.yaml` (via `node .rcode/bin/rcode-tools.cjs config-get workflow.research_before_questions`). When enabled, before asking follow-up questions about a topic:

1. Do a brief web search for best practices related to what the user described
2. Mention key findings naturally as you ask questions
3. This makes questions more informed without changing the conversational flow

When disabled (default), ask questions directly.

**Follow the thread:**

Based on what they said, ask follow-up questions via AskUserQuestion with options that probe what they mentioned — interpretations, clarifications, concrete examples.

Keep following threads. Ask about:

- What excited them
- What problem sparked this
- What they mean by vague terms
- What it would actually look like
- What's already decided

Techniques:

- Challenge vagueness
- Make abstract concrete
- Surface assumptions
- Find edges
- Reveal motivation

**Check context (background, not out loud):**

Mentally check the context checklist. If gaps remain, weave questions naturally. Don't suddenly switch to checklist mode.

**Decision gate:**

**Before the decision gate, show your coverage.** State plainly which items of the
Mandatory decision set (`@.rcode/references/questioning.md`) the user actually
answered and which you are assuming, with each assumption spelled out in one line.
An assumption the user never saw is a decision you made for them.

When you could write a clear PROJECT.md, use AskUserQuestion:

- header: "Ready?"
- question: "I think I understand what you're after. Ready to create PROJECT.md?"
- options:
  - "Create PROJECT.md" — Let's move forward
  - "Keep exploring" — I want to share more / ask me more

If "Keep exploring" — ask what they want to add, or identify gaps and probe naturally.

Loop until "Create PROJECT.md" selected.

## 3.5. Detect Project Type

**If auto mode:** Skip — project type will be inferred from document in Step 4.

**Goal:** Classify the project into one of 9 types (api-backend, mobile-app, saas-b2b, cli-tool, web-app, desktop-app, iot, dev-tool, other). This shapes discovery questions and discovery section requirements.

**Load project type signals:**

```bash
PROJECT_TYPES=$(cat .rcode/references/project-types.yaml 2>/dev/null || true)
```

**Classify by signals:**

Scan the user's responses from Step 3 for keywords from the `signals` list. Build a score per type:

- Each signal match adds 1 point
- Pick the type with the highest score
- If tie or score < 2, ask the user to clarify

**If score is clear (>2 points for one type):**

```
📋 Detected project type: {display_name} (based on your description mentioning {signal1}, {signal2}, {signal3})

Proceed with this type? [Y/n]
```

If "n": Ask the user to pick from the list.

**Store the detected type** in a shell variable for Step 5 discovery adaptation. Add required-sections and discovery questions from project-types.yaml to the upcoming questionnaire.

Next: Read `.rcode/workflows/new-project/steps/05-write-project.md` before starting it (skip it if its Read-when condition is false).
