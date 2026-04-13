# Workflow: rihal:do

<purpose>
Route freeform text to the right Rihal command. This is the entry point for users who aren't sure which command to use. The router classifies their intent and suggests the best command from the available workflows.
</purpose>

## Step 0 — If $ARGUMENTS is non-empty

Call the classify helper to determine the best command:

```bash
CLASSIFY=$(node .rihal/bin/rihal-tools.cjs classify-question "$ARGUMENTS")
```

Parse the JSON for `type` (one of: `discovery`, `market`, `greenfield`, `team`, `release`, `design`, `codebase`).

Map the question type and keywords to a suggested command:

- `codebase`, `team`, `release` → suggest `/rihal:discuss`
- `market`, `discovery`, `greenfield` → suggest `/rihal:council`
- Keywords: "debug", "error", "broken", "bug", "issue" → suggest `/rihal:debug`
- Keywords: "progress", "status", "where am I", "state" → suggest `/rihal:progress`
- Keywords: "next", "what should I do", "what's next" → suggest `/rihal:next`
- Keywords: "continue", "resume", "pick up", "where were we" → suggest `/rihal:resume-work`
- Keywords: "note", "remember", "todo", "capture" → suggest `/rihal:add-todo`
- Keywords: "plan" or "execute" → suggest `/rihal:plan` or `/rihal:execute`

If no clear keyword match, default to `/rihal:discuss` for quick single-agent sync.

Print:

```
💡 Based on your question, I'd use: /rihal:{command} {full argument}

Run that now, or pick an alternative:
```

Then call AskUserQuestion with options:

```
1. 💬 Use that command (rihal:{suggested})
2. 🏛️ Use council instead (3-5 agents)
3. 📋 Plan a project
4. ▶ Execute a plan
5. 🐛 Debug an issue
6. 📈 Check progress
7. ⏭️  Jump to next step
8. ▶ Resume work
9. 📝 Add todo
10. Pick something different
```

Based on the user's choice, print the full suggested command (no execution).

Example output if user picked the suggested command:

```
👉 Run: /rihal:discuss what stack should I use?
```

Then return. Do NOT invoke the command — user types it.

---

## Step 1 — If $ARGUMENTS is empty

Use AskUserQuestion to present the main menu:

```
What would you like to do?

1. 💬 Quick chat with one expert (rihal:discuss)
   Fast single-agent sync for a specific question
   
2. 🏛️ Convene the council (rihal:council)
   3-5 experts answer a strategic question in parallel
   
3. 📋 Plan a project (rihal:plan)
   Turn an idea or council session into executable PLAN.md files
   
4. ▶ Execute a plan (rihal:execute)
   Run PLAN.md files with automated commits and checkpoints
   
5. 📊 Check status (rihal:status)
   Project state dashboard — phase, decisions, blockers

6. 🐛 Debug an issue (rihal:debug)
   Systematically investigate and diagnose problems
   
7. 📈 Check progress (rihal:progress)
   Project progress narrative and next steps
   
8. ⏭️  Jump to next step (rihal:next)
   Automatically advance to the next logical action
   
9. ▶ Resume work (rihal:resume-work)
   Restore context and pick up where you left off
   
10. 📝 Add todo (rihal:add-todo)
    Capture an idea or task for later
   
11. Something else — describe it
    Tell me in plain text what you need
```

Wait for user selection (options 1–10 or 11).

---

## Step 2 — Handle user choice

**If user picked 1–10:**
Print the corresponding command with usage example. Do NOT execute. Example:

```
👉 Run: /rihal:discuss <your-question>
   Example: /rihal:discuss what stack should I use?
```

Return.

---

**If user picked 11 ("Something else"):**

Use AskUserQuestion to ask:

```
Describe what you need in a few words:
```

Capture the text response and loop back to Step 0 with the user's text as $ARGUMENTS.

---

## Errors

- **`rihal-tools.cjs` not found:** tell the user to run `rihal-code install-v2`.
- **AskUserQuestion fails:** print "Could not read your choice. Try specifying the command directly: /rihal:discuss <question>"
