<purpose>
Print a specific SPRINT.md file or all plans in a phase, with execution status from state.json.
</purpose>

## Step 0: Usage Check

Verify argument was provided:
- If empty: `Usage: /rcode-show <phase-id|plan-id> (e.g., /rcode-show 01 or /rcode-show 01-01)`
- Proceed to Step 1

## Step 1: Resolve ID

Run: `node .rcode/bin/rcode-tools.cjs state resolve-id "$ARGUMENTS"`

Expected output:
```json
{
  "type": "phase" | "plan" | "unknown",
  "id": "01" | "01-01",
  "path": "/full/path/to/dir-or-file"
}
```

If `type === "unknown"`: Return error `ID not found: $ARGUMENTS. Try /rcode-show 01 for phase, 01-01 for specific plan.`

## Step 2: Phase or Plan?

If `type === "phase"`:
- Walk `.planning/phases/{phase-dir}/` for all `*.md` files matching `[0-9]{2}-[0-9]{2}-SPRINT.md`
- Read each SPRINT.md frontmatter + body
- Continue to Step 3

If `type === "plan"`:
- Read the single SPRINT.md at `{path}/SPRINT.md`
- Continue to Step 3

## Step 3: Display with Status

For each SPRINT.md:

1. Print frontmatter as YAML block (title, wave, description)
2. Print body in full
3. Read `.rcode/state.json` and extract `executions[].plan_id` matching this plan
4. If found, append:
   ```
   Last execution: {timestamp}, {duration_ms}ms, commit {commit_sha}
   ```
   If not found: `Status: Not yet executed`

Separate multiple plans with `---\n`

## Success Criteria

- [ ] ID resolves correctly
- [ ] Full SPRINT.md content displayed (frontmatter + body)
- [ ] Execution status appended
- [ ] Multiple plans separated cleanly

## On Error

- ID unresolvable → Show resolve-id error message
- SPRINT.md missing → "File not found: {path}"
- state.json corrupt → Omit execution status, continue

## On Completion

/rcode-execute {phase} — execute this phase
/rcode-plan {phase} — revise the plan
/rcode-progress — see full roadmap

## Next Up

- `/rcode-execute` — execute the displayed phase plan
- `/rcode-plan` — revise the plan if it needs changes before execution
