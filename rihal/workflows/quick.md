<purpose>
Execute small ad-hoc tasks with guarantees. Two real modes the workflow auto-detects:

- **Trivial inline** — single ≤ 3-file change, finishes in 1-2 minutes, no planning needed.
- **Bulk-task auto-route** — when the input contains many tasks (numbered list with 5+ items, or several distinct bugs/asks), automatically route to /rihal-add-phase with the task list pre-extracted, so the user doesn't have to copy-paste their list a second time.

Closes the gap where /rihal-quick used to refuse + show a 4-option menu when given many tasks (forcing the user to re-enter the same list into another command).
</purpose>

<required_reading>
@.rihal/references/verb-dictionary.md
@.rihal/references/git-preflight.md
</required_reading>

<process>

<step name="parse_task">
Parse `$ARGUMENTS` for the task description. If empty, ask:

```
What's the quick fix? (one sentence — or paste a bug list and I'll auto-route)
```

Store as `$TASK`.
</step>

<step name="bulk_detection" priority="first-match">
**Detect 'many tasks in one input'** — auto-route instead of refusing.

Match if `$TASK` contains ANY of:

- 5+ numbered list items (`/^\s*\d+\.\s/m` with ≥ 5 matches)
- 5+ bullet items (`/^\s*[-*]\s/m` with ≥ 5 matches)
- 3+ "Bug Report:" / "Issue:" / "Severity:" headers
- 3+ separate "Status:" or "Priority:" lines
- > 60 lines total
- Contains the phrase "buht zada bugs" / "many bugs" / "list of bugs" / "bug list" / "saare bugs" / "all these bugs"

If matched, **AUTO-ROUTE to `/rihal-add-phase`** without asking. Do not refuse, do not show a menu, do not ask the user to repaste.

Procedure:

1. Detect active milestone (per `do.md` state-aware logic):
   ```bash
   ACTIVE_MILESTONE=$(grep -m1 '^## Current Milestone' .planning/PROJECT.md 2>/dev/null | sed 's/^## Current Milestone[: ]*//' | xargs)
   ```
2. Generate a phase slug from the bulk content topic:
   - If most items mention "bug" / "fix" / "broken" → `09-ui-bug-cleanup` (use next phase number)
   - If most mention "feature" / "add" / "new" → `09-feature-batch`
   - Otherwise → `09-task-batch`
3. Print the auto-route banner:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /rihal-quick — AUTO-ROUTING
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Detected: {N} tasks in input — too many for inline.
   Active milestone: {ACTIVE_MILESTONE or "none"}
   Routing to: /rihal-add-phase {phase-slug}
   Reason: bulk-detection threshold ({matched signal}) — auto-route avoids
           refusing and forcing you to re-paste the list.
   ```
4. Dispatch `/rihal-add-phase {phase-slug}` and pass `$TASK` verbatim. The add-phase workflow uses the pre-extracted task list as the phase task list — no user re-entry needed.
5. STOP this workflow — add-phase takes over from here.

If the bulk detection does NOT match, continue to scope_check.
</step>

<step name="scope_check">
**Lightweight trivial-task gate** for the inline path. Reasonable scope for inline:
- ≤ 3 file edits
- ≤ 2 minutes of work
- No new dependencies or architecture changes
- No multi-file research needed

If the task seems non-trivial but did NOT trigger bulk_detection above (e.g., a single complex task — not a list), redirect:

```
This is a single task but looks non-trivial. Recommended:
  /rihal-add-phase — for multi-file refactor / new feature / structural change
  /rihal-plan      — when scope is clear, jump straight to a SPRINT.md plan

Or paste --force-inline at the end of your input to override and try inline anyway.
```

If `$TASK` contains `--force-inline`, skip this gate and continue.
</step>

<step name="execute_inline">
Do the work directly:

1. Read the relevant file(s)
2. Make the change(s)
3. Verify (run existing tests if applicable, or quick sanity check)

**No SPRINT.md. No subagents. Just do it.**
</step>

<step name="blocker_handling">
**When investigation reveals a blocker, do NOT present a multi-option menu.** Pick ONE response per the rules below.

Common blocker types:
- Need a screenshot / browser-rendered state to confirm
- Need the dev server running
- Need a decision the user hasn't given yet
- Need access to an external system (production logs, Sentry, etc.)

**Rules:**

1. **If the original input was a LIST of tasks** (bulk_detection-eligible OR the user passed multiple tasks): silently SKIP the blocked task, log the blocker in the running tracker, and PIVOT to the next clearly-runnable task in the list. Do not stop. Do not ask. Do not present 5 options.

   Example log line (appended to `.planning/BUG-TRACKER-YYYY-MM-DD.md` if it exists, or stdout otherwise):

   ```
   ⏸  #36 (Extraction wizard CSS) — skipped: needs runtime screenshot to confirm cascade-layer hypothesis. Will resume when dev server is available.
   ```

   Then continue with #19 / #17 / whichever is the next-most-runnable in the list. State the pivot in one line:

   ```
   ▶ Pivoting to next runnable: #19 (Breadcrumb UUID→name) — clear scope, no runtime needed.
   ```

2. **If the input was a SINGLE task and there's nothing to pivot to**: stop with ONE line stating the single specific blocker and how to unblock it. No menu. No options. The user pastes back the resolved info and re-runs.

   ```
   ⏸  Blocked on: a screenshot of the broken Extraction wizard. Paste the screenshot or run `pnpm dev` and share what you see — I'll resume from where I left off.
   ```

3. **If the user passed `--force-inline` AND the input was single-task AND blocked**: attempt the highest-confidence speculative fix, COMMIT it with a clear "speculative — needs runtime verification" prefix in the commit message, and proceed. The user explicitly chose this path.

**Never present a 4+ option menu in blocker_handling.** Multi-option menus during execution are decision-fatigue. Pick one response, do it, move on.
</step>

<step name="next_task_loop">
**If the original input was a list and there are remaining tasks after this one** (whether the current task succeeded, failed, or was skipped due to blocker), automatically continue to the next task without asking. State the pivot in one line and re-enter execute_inline.

**Stop the loop only when:**
- All tasks in the list are processed (done / skipped / blocked)
- A task touches `> 5` files (escalate the rest of the list to /rihal-add-phase)
- The user types stop / cancel / pause

At the end of the loop, summarise:

```
✓ Loop complete: {N} done · {M} skipped · {K} blocked
   Done:    {bullet list with commit hashes}
   Skipped: {bullet list with reasons}
   Blocked: {bullet list with what info is needed}

Resume blocked tasks: {one-line guidance on what to provide and re-run}
```
</step>

<step name="commit">
Commit atomically with conventional commit format (`fix:`, `feat:`, `docs:`, `chore:`, `refactor:`):

```bash
git add -A
git commit -m "{type}: {concise description of what changed}"
```
</step>

<step name="log_to_state">
Append the completed task to `.planning/STATE.md`. Create the section if it
doesn't exist — projects initialized with `/rihal-new-project` use a STATE.md
shape that has no "Quick Tasks Completed" table by default (#601). Without
this fallback the entry was silently dropped on every fresh repo.

```bash
mkdir -p .planning
if [ ! -f .planning/STATE.md ]; then
  printf '# Project State\n\n## Quick Tasks Completed\n\n| Date | Type | Task | Status |\n|------|------|------|--------|\n' > .planning/STATE.md
elif ! grep -q "Quick Tasks Completed" .planning/STATE.md 2>/dev/null; then
  printf '\n## Quick Tasks Completed\n\n| Date | Type | Task | Status |\n|------|------|------|--------|\n' >> .planning/STATE.md
fi
echo "| $(date +%Y-%m-%d) | quick | $TASK | ✓ |" >> .planning/STATE.md
```
</step>

<step name="done">
Report completion:

```
✓ Done: {what was changed}
   Commit: {short hash}
   Files:  {list of changed files}
```

No next-step suggestions. No workflow routing. Just done.
</step>

</process>

<guardrails>
- NEVER spawn a Task/subagent — this runs inline (except via the add-phase auto-route, which is itself a workflow dispatch, not a Task spawn)
- NEVER create SPRINT.md or SUMMARY.md files directly (add-phase will, when bulk-routed)
- NEVER run research or plan-checking inline
- If bulk_detection matches, auto-route silently — do not stop and ask
- If a single non-bulk task exceeds 3 file edits and the user did NOT pass `--force-inline`, redirect to /rihal-add-phase or /rihal-plan
</guardrails>

<success_criteria>
- [ ] Bulk inputs are auto-routed to /rihal-add-phase without forcing the user to re-paste
- [ ] Trivial inputs are completed inline (single context, ≤3 files, conventional commit)
- [ ] STATE.md updated if it exists
- [ ] No self-referential redirects (the old quick.md redirected to /rihal-quick — that infinite loop is closed)
</success_criteria>
