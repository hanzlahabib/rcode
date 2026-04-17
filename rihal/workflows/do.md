<purpose>
Route freeform text to the right Rihal command. Entry point for users who know what they want but not which command to use. Classifies intent, confirms match, invokes. With --auto, skips confirmation.
</purpose>

<required_reading>
@.rihal/references/output-format.md
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<output_format>
Before dispatching, print a routing banner using the format from output-format.md:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Input: {$ARGUMENTS}
Scope: {one-line scope summary}

Routing to: /rihal:{target}
Reason: {one-line why}

Handing off to the workflow now.
```
</output_format>

<process>

<step name="parse_args">
Extract `$ARGUMENTS` and check for `--auto` flag:

```bash
AUTO_MODE=false
QUESTION="$ARGUMENTS"
if [[ "$ARGUMENTS" == *"--auto"* ]]; then
  AUTO_MODE=true
  QUESTION=$(echo "$ARGUMENTS" | sed 's/--auto[[:space:]]*//' | xargs)
fi
```
</step>

<step name="empty_args">
**If $ARGUMENTS is empty:**

Present the main menu via AskUserQuestion:

```
What would you like to do?

1. Quick chat with one expert (/rihal:discuss)
2. Convene the council (/rihal:council)
3. Plan a sprint (/rihal:sprint-planning)
4. Execute a sprint (/rihal:execute)
5. Check sprint status (/rihal:sprint-status)
6. Check progress (/rihal:progress)
7. Auto-advance to next step (/rihal:next)
8. Debug an issue (/rihal:debug)
9. Resume paused work (/rihal:resume-work)
10. Add a note (/rihal:note)
11. Something else — describe it
```

If user picks 1-10, print the command and invoke it immediately.
If user picks 11, capture text and proceed to classify step below.
</step>

<step name="classify">
**If $QUESTION is non-empty:**

Classify using rihal-tools:

```bash
CLASSIFY=$(node .rihal/bin/rihal-tools.cjs classify-question "$QUESTION")
```

Parse `type` from JSON. Map to command:

| Intent keywords | Command |
|----------------|---------|
| "plan", "sprint", "stories", "backlog" | `/rihal:sprint-planning` |
| "execute", "run", "build", "implement", "dev" | `/rihal:execute` |
| "status", "sprint status", "board" | `/rihal:sprint-status` |
| "list plans", "all plans", "plans across phases", "show plans" | `/rihal:list-plans` |
| "progress", "where am I", "what's done" | `/rihal:progress` |
| "next", "what should I do", "what's next", "continue" | `/rihal:next` |
| "debug", "error", "broken", "bug", "fix" | `/rihal:debug` |
| "resume", "pick up", "where were we" | `/rihal:resume-work` |
| "note", "remember", "todo", "capture" | `/rihal:note` |
| "review", "code review", "check code" | `/rihal:code-review` |
| "council", "discuss strategy", "should we" | `/rihal:council` |
| market/discovery/greenfield (from classify) | `/rihal:council` |
| codebase/team/release (from classify) | `/rihal:discuss` |

Default (no match): `/rihal:discuss`
</step>

<step name="execute_or_confirm">
**If AUTO_MODE is true AND classify returned signals:**

Invoke immediately:
```
/rihal:{command} {question}
```

**If AUTO_MODE is false:**

Show suggestion and ask:

```
Based on your request, I'd use: /rihal:{command} {arguments}

Run that now?
```

Ask via AskUserQuestion with options:
1. Yes, run it
2. Use council instead (3-5 agents)
3. Pick something else

If user confirms, invoke the command immediately.
</step>

</process>

<success_criteria>
- [ ] User input classified to a Rihal command
- [ ] Correct command suggested based on intent
- [ ] Command invoked (auto mode) or confirmed then invoked
</success_criteria>
