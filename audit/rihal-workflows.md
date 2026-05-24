# Rihal Audit — Workflows

## Headline

Scanned **255 workflow files** across `.rcode/workflows/` (193 files) and `rcode/workflows/` (62 files).
Total raw grep hits: **~1,687**.

Split: ~1,625 in `.rcode/workflows/`, ~62 in `rcode/workflows/`.

The vast majority of hits are **INT-SLASH** (slash command references that must be preserved).
Five distinct gap categories were found requiring remediation.

---

## INTENTIONAL

### INT-SLASH — `/rihal-X` command names (preserve)

These are the slash commands users type. Every workflow file references sibling commands via this syntax. **~1,192 hits across all 255 files.** Preserve verbatim — these are the public API names.

Sample (`.rcode/workflows/docs-update.md`):
```
21:/rihal-docs-update [phase]
26:/rihal-docs-update
27:/rihal-docs-update 02
```

Sample (`.rcode/workflows/execute-verify-phase-goal.md`):
```
50:| `gaps_found` | Present gap summary, offer `/rihal-plan {phase}` |
105:Items will appear in `/rihal-progress` and `/rihal-audit-uat`.
129:`/rihal-plan {X} --gaps ${Rihal_WS}`
```

Sample (`.rcode/workflows/workstream.md`):
```
19:/rihal-workstream create --name <name>
20:/rihal-workstream switch --name <name>
21:/rihal-workstream list
```

### INT-DOCSTRING-NOTE — Etymology comments (preserve)

`.rcode/workflows/init.md:167` and `rcode/workflows/init.md:167` both contain a deliberate naming-rationale block. Must not be removed.

```
167: Naming note (do NOT remove from the template): the file is `JOURNEY.md`, not `RIHAL.md`.
     This is intentional — same Arabic root, different word. rcode (رحّال) = the traveler/tool.
     Rihla (رحلة) = the journey/voyage.
170: <!-- JOURNEY — your project's path. Renamed from RIHLA (رحلة, "the journey") in v4.1 -->
```

Also intentional: `rihla-present: yes/no` shell variable in init.md (Arabic etymology marker, not a product name).

### INT-SKILL-DIR — `.rcode/skills/rihal-X/` paths (preserve)

No direct `.rcode/skills/rihal-X/` path references found inside workflow files. Skill invocations use `Skill(skill="rihal-X")` syntax — these are INT-SLASH equivalents and are preserved.

---

## GAPS

### GAP-WORKFLOW-TITLE — `# Workflow: rihal-X` headers

**Count: 61 files** in `.rcode/workflows/`. Every workflow file uses `# Workflow: rihal-X` as its H1 title. These should read `# Workflow: rcode-X` after rebrand.

Every single `.rcode/workflows/*.md` file is affected. Full list (61 files):

```
.rcode/workflows/add-phase.md:1:# Workflow: rihal-add-phase
.rcode/workflows/add-tests.md:1:# Workflow: rihal-add-tests
.rcode/workflows/add-todo.md:1:# Workflow: rihal-add-todo
.rcode/workflows/analyze-dependencies.md:1:# Workflow: rihal-analyze-dependencies
.rcode/workflows/audit-milestone.md:1:# Workflow: rihal-audit-milestone
.rcode/workflows/audit-plans.md:1:# Workflow: rihal-audit plans
.rcode/workflows/audit.md:1:# Workflow: rihal-audit
.rcode/workflows/autonomous.md:1:# Workflow: rihal-autonomous
.rcode/workflows/brainstorm.md:1:# Workflow: rihal-brainstorm
.rcode/workflows/chain.md:1:# Workflow: rihal-chain
.rcode/workflows/check-implementation-readiness.md:1:# Workflow: rihal-check-implementation-readiness
.rcode/workflows/checkpoint-preview.md:1:# Workflow: rihal-checkpoint-preview
.rcode/workflows/code-review.md:1:# Workflow: rihal-code-review
.rcode/workflows/config.md:1:# Workflow: rihal-config
.rcode/workflows/correct-course.md:1:# Workflow: rihal-correct-course
.rcode/workflows/council.md:1:# Workflow: rihal-council
.rcode/workflows/create-architecture.md:1:# Workflow: rihal-create-architecture
.rcode/workflows/create-epics-and-stories.md:1:# Workflow: rihal-create-epics-and-stories
.rcode/workflows/create-prd.md:1:# Workflow: rihal-create-prd
.rcode/workflows/create-story.md:1:# Workflow: rihal-create-story
.rcode/workflows/dashboard.md:1:# Workflow: rihal-dashboard
.rcode/workflows/decisions.md:1:# Workflow: rihal-decisions
.rcode/workflows/dev-story.md:1:# Workflow: rihal-dev-story
.rcode/workflows/diagnose-issues.md:1:# Workflow: rihal-diagnose-issues
.rcode/workflows/discuss-phase-power.md:1:# Workflow: rihal-discuss-phase-power
.rcode/workflows/discuss.md:1:# Workflow: rihal-discuss
.rcode/workflows/document-project.md:1:# Workflow: rihal-document-project
.rcode/workflows/edit-prd.md:1:# Workflow: rihal-edit-prd
.rcode/workflows/enable-hooks.md:1:# Workflow: rihal-enable-hooks
.rcode/workflows/export-to-github.md:1:# Workflow: rihal-export-to-github
.rcode/workflows/feature-drift.md:1:# Workflow: rihal-feature-drift
.rcode/workflows/forensics.md:1:# Workflow: rihal-forensics
.rcode/workflows/health.md:1:# Workflow: rihal-health
.rcode/workflows/inbox.md:1:# Workflow: rihal-inbox
.rcode/workflows/insert-phase.md:1:# Workflow: rihal-insert-phase
.rcode/workflows/install.md:1:# Workflow: rihal-install
.rcode/workflows/lens-audit.md:1:# Workflow: rihal-lens-audit
.rcode/workflows/list-plans.md:1:# Workflow: rihal-list-plans
.rcode/workflows/list-workspaces.md:1:# Workflow: rihal-list-workspaces
.rcode/workflows/milestone-summary.md:1:# Workflow: rihal-milestone-summary
.rcode/workflows/new-workspace.md:1:# Workflow: rihal-new-workspace
.rcode/workflows/note.md:1:# Workflow: rihal-note
.rcode/workflows/notify-test.md:1:# Workflow: rihal-notify-test
.rcode/workflows/pause-work.md:1:# Workflow: rihal-pause-work
.rcode/workflows/prfaq.md:1:# Workflow: rihal-prfaq
.rcode/workflows/profile-user.md:1:# Workflow: rihal-profile-user
.rcode/workflows/progress.md:1:# Workflow: rihal-progress
.rcode/workflows/remove-workspace.md:1:# Workflow: rihal-remove-workspace
.rcode/workflows/retrospective.md:1:# Workflow: rihal-retrospective
.rcode/workflows/review-adversarial.md:1:# Workflow: rihal-review-adversarial
.rcode/workflows/review-edge-case-hunter.md:1:# Workflow: rihal-review-edge-case-hunter
.rcode/workflows/scaffold-project.md:1:# Workflow: rihal-scaffold-project
.rcode/workflows/session-report.md:1:# Workflow: rihal-session-report
.rcode/workflows/settings.md:1:# Workflow: rihal-settings
.rcode/workflows/sprint-planning.md:1:# Workflow: rihal-sprint-planning
.rcode/workflows/sprint-status.md:1:# Workflow: rihal-sprint-status
.rcode/workflows/stats.md:1:# Workflow: rihal-stats
.rcode/workflows/ui-phase.md:1:# Workflow: rihal-ui-phase
.rcode/workflows/ui-review.md:1:# Workflow: rihal-ui-review
.rcode/workflows/update.md:1:# Workflow: rihal-update
.rcode/workflows/validate-prd.md:1:# Workflow: rihal-validate-prd
.rcode/workflows/workstream.md:1:# Workflow: rihal-workstream
```

Fix pattern: `sed -i 's/^# Workflow: rihal-/# Workflow: rcode-/' *.md`

---

### GAP-TOOL-NAME — `rihal-tools` / `rihal-tools.cjs` CLI references

**Count: 56 hits across 29 files** in `.rcode/workflows/`. The CLI binary is named `rihal-tools` / `rihal-tools.cjs`. Should be `rcode-tools` / `rcode-tools.cjs`.

Representative hits:

```
.rcode/workflows/code-review.md:75:   Error: rihal-tools init failed. Verify .rcode/ is installed and state.json is valid.
.rcode/workflows/decisions.md:101:  - Malformed JSONL lines are skipped (handled by rihal-tools reader)
.rcode/workflows/lens-audit.md:71:   rihal-tools not found. Run: npx @hanzlaa/rcode install .
.rcode/workflows/lens-audit.md:505:  - rihal-tools calls without 2>/dev/null or error guard
.rcode/workflows/lens-audit.md:675:  - **rihal-tools not found**: print `Run: npx @hanzlaa/rcode install .` and STOP.
.rcode/workflows/autonomous.md:13:   never call `rihal-tools config-set mode`
.rcode/workflows/autonomous.md:33:   **ALWAYS record decisions via `rihal-tools state add-decision`.**
.rcode/workflows/execute-sprint.md:44:  # config settings can be fetched via rihal-tools config-get if needed
.rcode/workflows/execute-sprint.md:436:  Update STATE.md using rihal-tools:
.rcode/workflows/settings.md:43:   Read each known key via `rihal-tools.cjs config-get <dotted.key>`
.rcode/workflows/settings.md:184:  - **`rihal-tools.cjs` missing:** print "Run: npx @hanzlaa/rcode install ." and STOP.
.rcode/workflows/council.md:576:  - **`rihal-tools.cjs` not found:** tell user to run `npx @hanzlaa/rcode install`
.rcode/workflows/insert-phase.md:43:  ## Step 1 — Call rihal-tools
.rcode/workflows/remove-phase.md:85:  **Delegate the entire removal operation to rihal-tools:**
.rcode/workflows/add-phase.md:75:  **Delegate the phase addition to rihal-tools:**
.rcode/workflows/discuss-phase.md:140:  - Per-project: `rihal-tools config-set workflow.text_mode true`
```

Affected files: `code-review.md`, `decisions.md`, `lens-audit.md`, `autonomous.md`, `execute-sprint.md`, `discuss-phase.md`, `new-project-create-roadmap.md`, `council.md`, `next.md`, `remove-phase.md`, `research-phase.md`, `settings.md`, `secure-phase.md`, `add-phase.md`, `document-project.md`, `chain.md`, `status.md`, `resume-work.md`, `config.md`, `progress.md`, `new-milestone.md`, `verify-phase.md`, `init.md`, `discuss.md`, `why.md`, `insert-phase.md`, `ship.md`, `health.md`, `new-project.md`.

---

### GAP-USER-FACING — Brand strings visible to end users

**Count: ~148 hits** across multiple files. These appear in banners, tier headers, output messages, and prose descriptions that users read.

```
.rcode/workflows/help.md:2:   Display the Rihal command reference at the requested tier.
.rcode/workflows/help.md:35:  # Rihal — Tier 1 (Basic)
.rcode/workflows/help.md:98:  # Rihal — Tier 2 (Intermediate)
.rcode/workflows/help.md:154: # Rihal — Tier 3 (Advanced)
.rcode/workflows/help.md:78:  ## Files Rihal creates
.rcode/workflows/help.md:217: | `/rihal-install <module>` | Install a Rihal capability bundle into the project. |
.rcode/workflows/help.md:239: | `/rihal-decisions` | Browse decisions across every Rihal project (~/.rcode/decisions.jsonl). |
.rcode/workflows/update.md:196: ## Step 8 — Pull Rihal brain content (v2.0)
.rcode/workflows/update.md:223: Rihal brain: M sources pulled, K skipped (placeholder URLs)
.rcode/workflows/inbox.md:125: - [ ] RIHAL Version provided
.rcode/workflows/inbox.md:261:   RIHAL INBOX TRIAGE — {repo} — {date}
.rcode/workflows/inbox.md:339: gh issue close {number} --comment "Closed by RIHAL inbox triage: ..."
.rcode/workflows/inbox.md:344: gh pr close {number} --comment "Closed by RIHAL inbox triage: ..."
.rcode/workflows/undo.md:2:   Safe git revert workflow. Rolls back Rihal phase or plan commits
.rcode/workflows/undo.md:51:   --last N   Show last N Rihal commits for interactive selection
.rcode/workflows/undo.md:118: Recent Rihal commits:
.rcode/workflows/execute.md:173: These are the valid Rihal subagent types registered in .claude/agents/
.rcode/workflows/init.md:33:   السلام عليكم — Rihal init
.rcode/workflows/stats.md:34:   ℹ️ No rihal state found in this project yet.
.rcode/workflows/pause-work.md:35: echo "❌ Not a Rihal project"
.rcode/workflows/forensics.md:182: Recent Rihal Commits: {count}
.rcode/workflows/scaffold-project.md:4:   Scaffold a new project from the official Rihal template repo.
```

Also in `rcode/workflows/`: `import.md` uses `RIHAL >` as an output-message prefix (lines 51, 98, 117, 181, 199, 218, 246, 302).

`rcode/workflows/execute-regression-gates.md:91`: `⚠ Schema drift detected but Rihal_SKIP_SCHEMA_CHECK=true` — also user-visible.

---

### GAP-AGENT-NAME — `rihal-{id}` used as `subagent_type` identifier

**Count: 2 hits** — template strings that instruct agents to use `rihal-{id}` as the `subagent_type` value when the actual registered agent files are `rcode-*.md`.

```
.rcode/workflows/council.md:97:  `subagent_type: "rihal-{id}"`. The classifier and panel scorer will surface only
.rcode/workflows/discuss.md:159: Use `subagent_type` = `rihal-{agent_id}` (e.g., `rcode-sadiq`).
```

Note: `discuss.md:159` is self-contradictory — it says `rihal-{agent_id}` then gives `rcode-sadiq` as the example. The template variable should read `rcode-{agent_id}`.

---

### GAP-PATH — `.rihal` directory and `~/.rihal-notes/` path refs

**Count: ~15 hits** across 7 files. Shell scripts and git log commands reference `.rihal` as a tracked directory path. These should reference `.rcode` equivalents.

```
.rcode/workflows/pause-work.md:35:  [ -d .rihal ] || (echo "❌ Not a Rihal project" && exit 1)
.rcode/workflows/health.md:29:   test -d .rihal && test -w .rihal
.rcode/workflows/stats.md:70:   git log --oneline --pretty=format:'%s' -- .rihal rihal/ | wc -l
.rcode/workflows/stats.md:71:   git log --oneline --pretty=format:'%s' -- .rihal rihal/ | head -5
.rcode/workflows/stats.md:75:   - **rihal_commits**: count of commits on .rihal or rihal paths
.rcode/workflows/forensics.md:90:  git log --oneline -20 --pretty=format:'%h %s' -- .rihal rihal/ .planning/
.rcode/workflows/forensics.md:94:  - Last commit on .rihal (install/config changes)
.rcode/workflows/session-report.md:110: git log --since="$SINCE_DATE" --oneline -- .rihal rihal/ .planning
.rcode/workflows/session-report.md:112: git log --all --oneline -- .rihal rihal/ .planning
.rcode/workflows/init.md:162:  find . -maxdepth 3 -type d ! -path "./.rihal*" ...
.rcode/workflows/note.md:27:  - `--global` flag: write to `~/.rihal-notes/` instead of `.rcode/notes/`
.rcode/workflows/note.md:45:     --global  Save to ~/.rihal-notes/ instead of .rcode/notes/
.rcode/workflows/note.md:59:  - If GLOBAL_MODE: `~/.rihal-notes/`
.rcode/workflows/note.md:145: - [ ] File created in `.rcode/notes/` or `~/.rihal-notes/`
.rcode/workflows/brainstorm.md:43: Read `rihal/references/brain-methods.csv` and parse it.
```

`~/.rihal-notes/` should become `~/.rcode-notes/` (or `~/.rcode/notes/`). `.rihal` dir checks in `pause-work.md` and `health.md` should check `.rcode` instead.

---

## Summary Table

| Tag | Count | Verdict |
|-----|-------|---------|
| INT-SLASH | ~1,192 hits | Preserve — public command API |
| INT-DOCSTRING-NOTE | 4 lines (2 files) | Preserve — deliberate etymology |
| GAP-WORKFLOW-TITLE | 61 files (line 1 each) | Fix — all H1 titles |
| GAP-TOOL-NAME | 56 hits / 29 files | Fix — CLI binary name |
| GAP-USER-FACING | ~148 hits / 20+ files | Fix — brand strings in output |
| GAP-AGENT-NAME | 2 hits / 2 files | Fix — subagent_type templates |
| GAP-PATH | ~15 hits / 7 files | Fix — shell path checks |

**Priority order for fix pass:** GAP-WORKFLOW-TITLE (mechanical sed, 61 files) → GAP-TOOL-NAME (56 hits, 29 files) → GAP-USER-FACING (148 hits, dispersed) → GAP-PATH (15 hits) → GAP-AGENT-NAME (2 hits, self-contradictory).
