# Sprint Status Workflow

**Goal:** Summarize sprint status, surface risks, and recommend the next workflow action.

**Your Role:** You are a Scrum Master providing clear, actionable sprint visibility. No time estimates — focus on status, risks, and next steps.

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/.rcode/config.yaml` (or run `rcode-tools init --json` to get the resolved values) and resolve:

- `project_name`, `user_name`
- `communication_language`, `document_output_language`
- `date` as system-generated current datetime
- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`

### Paths

- `phases_dir` = `.planning/phases/`
- `state_file` = `.rcode/state.json`

### Input Files

| Input | Path | Load Strategy |
|-------|------|---------------|
| State | `.rcode/state.json` | FULL_LOAD |
| Active phase SPRINT.md files | `.planning/phases/<phase-dir>/*-SPRINT.md` | SCAN |
| Active phase SUMMARY.md files | `.planning/phases/<phase-dir>/*-SUMMARY.md` | SCAN |

---

## EXECUTION

<workflow>

<step n="0" goal="Determine execution mode">
  <action>Set mode = {{mode}} if provided by caller; otherwise mode = "interactive"</action>

  <check if="mode == data">
    <action>Jump to Step 20</action>
  </check>

  <check if="mode == validate">
    <action>Jump to Step 30</action>
  </check>

  <check if="mode == interactive">
    <action>Continue to Step 1</action>
  </check>
</step>

<step n="1" goal="Locate active phase">
  <action>Read `.rcode/state.json` to determine `current_phase`</action>
  <check if="state.json not found or current_phase missing">
    <output>❌ No active phase found.
Run `/rcode-new-project` to initialize a project or `/rcode-plan <N>` to start a phase.</output>
    <action>Exit workflow</action>
  </check>
  <action>Resolve phase directory: scan `.planning/phases/` for a directory whose name starts with the current phase number (e.g. `23-*` for phase 23)</action>
  <check if="phase directory not found">
    <output>❌ Phase directory for phase `{current_phase}` not found in `.planning/phases/`.
Run `/rcode-plan {current_phase}` to create it.</output>
    <action>Exit workflow</action>
  </check>
  <action>Set `phase_dir` = resolved directory path</action>
  <action>Continue to Step 2</action>
</step>

<step n="2" goal="Read and parse sprint artifacts">
  <action>Glob `{phase_dir}/*-SPRINT.md` — collect all sprint plan files</action>
  <action>Glob `{phase_dir}/*-SUMMARY.md` — collect all sprint summary files</action>
  <check if="no SPRINT.md files found">
    <output>❌ No sprint files found in `{phase_dir}`.
Run `/rcode-plan {current_phase}` to create sprint plans.</output>
    <action>Exit workflow</action>
  </check>
  <action>For each SPRINT.md: parse YAML frontmatter to extract `id`, `sprint`, `status` (if present), `wave`, `autonomous`, `must_haves.truths`, `must_haves.artifacts`</action>
  <action>For each SUMMARY.md: parse YAML frontmatter to extract `sprint`, `status` (complete/in_progress/blocked), `commit`</action>
  <action>Build sprint inventory: match each SPRINT.md to its SUMMARY.md by sprint ID</action>
  <action>Classify each sprint:
    - `done` if a SUMMARY.md exists with `status: complete`
    - `in_progress` if a SUMMARY.md exists with `status: in_progress` or `status: blocked`
    - `todo` if no SUMMARY.md exists
  </action>
  <action>Count: `count_todo`, `count_in_progress`, `count_done`, `count_total`</action>
  <action>Detect risks:
    - IF any sprint is `in_progress` with `status: blocked` in SUMMARY.md: warn "blocked sprint detected"
    - IF all sprints are `todo` and phase has been started: warn "no sprints have been executed yet"
    - IF `count_done == count_total`: flag as "all sprints complete — consider /rcode-verify-work"
    - IF count_in_progress > 1: warn "multiple sprints in progress simultaneously"
  </action>
</step>

<step n="3" goal="Select next action recommendation">
  <action>Pick the next recommended workflow using priority:</action>
  1. If any sprint status == in_progress (blocked) → recommend `/rcode-debug` for the blocked sprint
  2. Else if any sprint status == in_progress → recommend `/rcode-execute {current_phase}` for first in-progress sprint
  3. Else if any sprint status == todo → recommend `/rcode-execute {current_phase}` for first todo sprint
  4. Else if count_done == count_total → recommend `/rcode-verify-work`
  5. Else → All sprints done; congratulate the user — recommend `/rcode-complete-milestone`
  <action>Store selected recommendation as: `next_workflow_id`, `next_sprint_id`</action>
</step>

<step n="4" goal="Display summary">
  <output>
## 📊 Sprint Status — Phase {current_phase}

- Project: {project_name}
- Phase dir: `{phase_dir}`

**Sprints:** todo {count_todo}, in-progress {count_in_progress}, done {count_done} / {count_total} total

| Sprint | Status | Artifacts |
|--------|--------|-----------|
{{#each sprints}}
| {{sprint}} | {{status}} | {{#if summary_exists}}SUMMARY.md ✓{{else}}—{{/if}} |
{{/each}}

**Next Recommendation:** {{next_workflow_id}}{{#if next_sprint_id}} (sprint {{next_sprint_id}}){{/if}}

{{#if risks}}
**Risks:**
{{#each risks}}
- {{this}}
{{/each}}
{{/if}}

  </output>
  </step>

<step n="5" goal="Offer actions">
  <ask>Pick an option:
1) Run recommended workflow now
2) Show all sprints grouped by status
3) List SPRINT.md files in phase directory
4) Exit
Choice:</ask>

  <check if="choice == 1">
    <output>Run `{{next_workflow_id}}`.</output>
  </check>

  <check if="choice == 2">
    <output>
### Sprints by Status
- In Progress: {{sprints_in_progress}}
- Todo: {{sprints_todo}}
- Done: {{sprints_done}}
    </output>
  </check>

  <check if="choice == 3">
    <action>List all *-SPRINT.md files found in {phase_dir} with their IDs and wave numbers</action>
  </check>

  <check if="choice == 4">
    <action>Exit workflow</action>
  </check>
</step>

<!-- ========================= -->
<!-- Data mode for other flows -->
<!-- ========================= -->

<step n="20" goal="Data mode output">
  <action>Load and classify sprints same as Step 2</action>
  <action>Compute recommendation same as Step 3</action>
  <template-output>next_workflow_id = {{next_workflow_id}}</template-output>
  <template-output>next_sprint_id = {{next_sprint_id}}</template-output>
  <template-output>count_todo = {{count_todo}}</template-output>
  <template-output>count_in_progress = {{count_in_progress}}</template-output>
  <template-output>count_done = {{count_done}}</template-output>
  <template-output>count_total = {{count_total}}</template-output>
  <template-output>risks = {{risks}}</template-output>
  <action>Return to caller</action>
</step>

<!-- ========================= -->
<!-- Validate mode -->
<!-- ========================= -->

<step n="30" goal="Validate sprint artifacts">
  <action>Check that `.rcode/state.json` exists and contains `current_phase`</action>
  <check if="missing">
    <template-output>is_valid = false</template-output>
    <template-output>error = "state.json missing or current_phase not set"</template-output>
    <template-output>suggestion = "Run /rcode-new-project to initialize"</template-output>
    <action>Return</action>
  </check>

  <action>Scan `{phase_dir}/*-SPRINT.md`</action>
  <check if="no SPRINT.md files found">
    <template-output>is_valid = false</template-output>
    <template-output>error = "No SPRINT.md files found in phase directory"</template-output>
    <template-output>suggestion = "Run /rcode-plan {current_phase} to create sprint plans"</template-output>
    <action>Return</action>
  </check>

  <action>Verify each SPRINT.md has valid YAML frontmatter with required fields: `id`, `sprint`, `phase`</action>
  <check if="any required field missing">
    <template-output>is_valid = false</template-output>
    <template-output>error = "SPRINT.md missing required frontmatter field(s): {{missing_fields}}"</template-output>
    <template-output>suggestion = "Re-run /rcode-plan or repair the file manually"</template-output>
    <action>Return</action>
  </check>

  <template-output>is_valid = true</template-output>
  <template-output>message = "Sprint artifacts valid: {{count_total}} SPRINT.md files found, {{count_done}} complete"</template-output>
</step>

</workflow>
