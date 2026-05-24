# Final Rihal Reference Inventory (post-v4 cleanup waves)

Generated: 2026-05-24. Scan covers all files except `node_modules/`, `.git/`, `dist/rcode.js`,
`CHANGELOG.md`, `ATTRIBUTION.md`, `.planning/archive/`, and prior audit reports `audit/01-*` through
`audit/11-*`.

---

## Headline numbers

| Metric | Count |
|--------|-------|
| Total rihal hits (post-filter) | 2 714 |
| INTENTIONAL (preserve) | ~2 310 hits across 6 categories |
| GAP (must fix) | ~404 hits across 8 categories |
| Files with any gap | 117 |
| Estimated fix effort for all gaps | MEDIUM (mechanical sed passes; no logic changes) |

---

## Tag legend

**INTENTIONAL — preserve as-is:**

| Tag | Meaning |
|-----|---------|
| `INT-SLASH` | `/rihal-X` slash command names — user-facing command surface, intentional namespace |
| `INT-SKILL-DIR` | `.rcode/skills/rihal-X/` and `.cursor/rules/rihal/` directory paths — intentional skill namespace |
| `INT-COMPANY` | `Rihal` / `rihal.om` as company name / naming-inspiration attribution |
| `INT-REPO-URL` | `github.com/hanzlahabib/rihal-code` — live repo URL, not renamed |
| `INT-LEGACY-PKG` | `@hanzlahabib/rihal-code` npm package — backward-compat in nuke.js |
| `INT-DOCSTRING-NOTE` | Etymology comments (RIHLA vs RIHAL, "naming inspiration, not commercial affiliation") |

**GAP — need fixing:**

| Tag | Meaning |
|-----|---------|
| `GAP-WORKFLOW-TITLE` | `# Workflow: rihal-X` headers in `.rcode/workflows/*.md` — should be `rcode-X` |
| `GAP-STATE-DATA` | `.rihal/` directory paths in agent rules and workflow scripts — should be `.rcode/` |
| `GAP-TOOL-NAME` | `rihal-tools` referred to by name (the binary is now `rcode-tools.cjs`) |
| `GAP-INTERNAL-VAR` | Shell variables/git tags using `rihal/snapshot`, `rihal/autonomous`, `_rihal_field`, `rihal_state_version`, `RIHAL_PUSH_OK` |
| `GAP-AGENT-NAME` | `rihal-checker`, `rihal-advisor`, `rihal-researcher` passed to `agent-skills` CLI — real agent names are `rcode-*` |
| `GAP-USER-FACING` | `RIHAL` uppercase in user-visible output strings, issue comments, version fields |
| `GAP-ARABIC-DOC` | `Rihalian` (person/role noun) in docs — should be `rcode user` or `rcode engineer` |
| `GAP-DEAD-EXAMPLE` | Old `rihal/commands/`, `rihal/workflows/`, `rihal/skills/` path examples in workflow body text |

---

## INTENTIONAL — preserved by design

### INT-SLASH (1 794 hits in 298 files)

The entire `/rihal-X` slash command surface. Every workflow file that documents or invokes a command
contributes here. These are intentionally kept — the memory rule
`.rcode/memory/decisions/feedback-rihal-hyphen-namespace.md` mandates the `rihal-*` (hyphen) namespace
for cross-IDE compatibility. The slash commands themselves are the user-facing API and will only be renamed
in a deliberate future breaking change.

Sample top commands by frequency:

```
/rihal-plan           92 refs
/rihal-init           84 refs
/rihal-execute        74 refs
/rihal-code           62 refs  (note: `/rihal-code` is a workflow, not the product name)
/rihal-create-prd     57 refs
```

### INT-SKILL-DIR (460 hits in 138 files)

All `.rcode/skills/rihal-X/` directory paths and `.cursor/rules/rihal/` files. The 182 Cursor `.mdc`
rule files under `.cursor/rules/rihal/` mirror the rihal-namespaced skill dirs.

### INT-COMPANY (4 hits in 3 files)

```
./README.md:165: [rcode](https://rihal.om) is also one of Oman's fastest-growing tech companies — naming inspiration, not commercial affiliation.
./docs/USP.md:5: ...Rihalians explaining it to clients...
./docs/what-is-rcode-code.md:67: v4.0.0 is the rename release: the `rihal-*` prefix was retired...
```

### INT-REPO-URL (42 hits in 15 files)

`github.com/hanzlahabib/rihal-code` appears throughout `package.json`, `cli/index.js`,
`cli/install.js`, `cli/postinstall.js`, `docs/`, `.planning/`, `README.md`. The repo URL is live and
intentional.

### INT-LEGACY-PKG (6 hits in 3 files)

`@hanzlahabib/rihal-code` in `cli/nuke.js` (backward-compat purge path) and `cli/install.js` (output
banner). Intentional.

### INT-DOCSTRING-NOTE (5 hits in 4 files)

Etymology anchors such as the HTML comment in `.rcode/JOURNEY.md` line 1, the naming note in
`.rcode/workflows/init.md`, and the inline comment in `scripts/build.cjs`. These must stay — they
explain the Rihal/Rihla/rcode naming triangle for future maintainers.

---

## GAPS — must fix

### GAP-WORKFLOW-TITLE (61 hits in 61 files) — SEVERITY: P1

Every `.rcode/workflows/*.md` file has its H1 header set to `# Workflow: rihal-X` instead of
`# Workflow: rcode-X`. This is the first line that the workflow loader reads to identify the command.

All 61 affected files are under `.rcode/workflows/`. Representative sample:

```
./.rcode/workflows/update.md:1:       # Workflow: rihal-update
./.rcode/workflows/workstream.md:1:   # Workflow: rihal-workstream
./.rcode/workflows/sprint-status.md:1:# Workflow: rihal-sprint-status
./.rcode/workflows/decisions.md:1:    # Workflow: rihal-decisions
./.rcode/workflows/inbox.md:1:        # Workflow: rihal-inbox
```

Fix: `sed -i 's/^# Workflow: rihal-/# Workflow: rcode-/g' .rcode/workflows/*.md`

---

### GAP-STATE-DATA (102 hits in 24 files) — SEVERITY: P0

Agent rule files under `.claude/agents/rules/` hard-code the old `.rihal/` project directory path in
every shell snippet and code sample. The real runtime path is `.rcode/`. These snippets are executed
verbatim by agents during debugging and phase execution — wrong path means broken commands.

All affected files:

```
.claude/agents/rules/debugger/checkpoint-recovery.md       (4 hits)
.claude/agents/rules/debugger/debug-session-state.md      (10 hits)
.claude/agents/rules/debugger/investigation-protocol.md    (2 hits)
.claude/agents/rules/executor/execution-flow.md            (3 hits)
.claude/agents/rules/executor/summary-creation.md          (2 hits)
.claude/agents/rules/executor/task-commit-protocol.md      (1 hit)
.claude/agents/rules/phase-researcher/detailed-guide.md    (7 hits: .rihal/bin/rihal-tools.cjs)
.claude/agents/rules/project-researcher/detailed-guide.md  (3 hits: .rihal/bin/rihal-tools.cjs)
.claude/agents/rules/roadmapper/detailed-guide.md         (12 hits)
.claude/agents/rules/sprint-checker/dimensions.md          (2 hits)
.claude/agents/rules/sprint-checker/process.md             (6 hits: .rihal/bin/rihal-tools.cjs)
.claude/agents/rules/verifier/anti-patterns.md             (2 hits)
.claude/agents/rules/verifier/artifact-verification.md     (2 hits)
.claude/agents/rules/verifier/context-loading.md           (3 hits)
.claude/agents/rules/verifier/key-links.md                 (2 hits)
.claude/agents/rules/verifier/requirements-coverage.md     (1 hit)
.claude/agents/rules/verifier/verification-report.md       (1 hit)
.claude/settings.local.json                                (1 hit: test fixture path)
.rcode/workflows/health.md                                 (1 hit)
.rcode/workflows/pause-work.md                             (2 hits: [ -d .rihal ])
.rcode/workflows/stats.md                                  (3 hits)
.rcode/workflows/forensics.md                              (3 hits)
.rcode/workflows/session-report.md                         (2 hits)
docs/ROADMAP.md                                            (1 hit)
```

Sample hits:

```
.claude/agents/rules/phase-researcher/detailed-guide.md:54:
  node ".rihal/bin/rihal-tools.cjs" websearch "your query" --limit 10
.claude/agents/rules/debugger/debug-session-state.md:9:
  **Location:** `.rihal/debug/session.json`
.rcode/workflows/pause-work.md:35:
  [ -d .rihal ] || (echo "❌ Not a Rihal project" && exit 1)
```

Fix: Replace `.rihal/` → `.rcode/` and `.rihal/bin/rihal-tools.cjs` → `.rcode/bin/rcode-tools.cjs`.

---

### GAP-TOOL-NAME (102 hits in 47 files) — SEVERITY: P1

The string `rihal-tools` is used throughout workflow docs and agent rules to mean `rcode-tools.cjs`.
The 47 files span both `.rcode/workflows/` and `.claude/agents/rules/`. Agents that follow these
instructions will invoke a non-existent binary name.

Top affected files:

```
.rcode/workflows/council.md          (7 hits)
.rcode/workflows/execute-sprint.md   (4 hits)
.rcode/agents-rules/sprint-checker/process.md (6 hits)
.claude/agents/rules/executor/execution-flow.md (3 hits)
AGENTS.md                            (1 hit: commit scope list)
CLAUDE.md                            (1 hit: commit scope list)
CONTRIBUTING.md                      (1 hit: scope backward-compat note)
```

Fix: Replace `rihal-tools` → `rcode-tools` in body text. Note: `CONTRIBUTING.md:342` explicitly labels
`rihal-tools` as a "legacy scope accepted for backward compatibility" — leave that line as is.

---

### GAP-INTERNAL-VAR (26 hits in 12 files) — SEVERITY: P1

Shell variables and git tag namespaces that still carry the `rihal/` prefix:

```
.rcode/workflows/execute-sprint.md:69:   SNAPSHOT_TAG="rihal/snapshot/phase-${PHASE_NUMBER}"
.rcode/workflows/execute.md:268:         SNAPSHOT_TAG="rihal/snapshot/phase-${phase_number}"
.rcode/workflows/undo.md:43:            Uses the pre-execution git tag `rihal/snapshot/phase-NN`
.rcode/workflows/undo.md:137:           SNAPSHOT_TAG="rihal/snapshot/phase-${TARGET_PHASE}"
.rcode/workflows/autonomous.md:105:     BRANCH_NAME="rihal/autonomous-${milestone_version}-..."
.rcode/workflows/plan.md:391-399:       _rihal_field() {...} (shell function; called 8 times)
.rcode/workflows/new-milestone.md:148:  rihal_state_version: 1.0
.rcode/state.json:345:                  RIHAL_PUSH_OK (old security constant name)
```

These create git tag drift (`rihal/snapshot/...` tags in repos) and are referenced in undo logic.
Fix: rename `rihal/snapshot/` → `rcode/snapshot/`, `rihal/autonomous/` → `rcode/autonomous/`,
`_rihal_field` → `_rcode_field`, `rihal_state_version` → `rcode_state_version`.

---

### GAP-AGENT-NAME (3 hits in 3 files) — SEVERITY: P0

Workflow scripts pass `rihal-checker`, `rihal-advisor`, `rihal-researcher` to `agent-skills` CLI
lookup. The real registered agents use `rcode-*` names. This causes silent fallback (empty skill list).

```
.rcode/workflows/verify-work.md:53:
  AGENT_SKILLS_CHECKER=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rihal-checker 2>/dev/null)
.rcode/workflows/discuss-phase.md:155:
  AGENT_SKILLS_ADVISOR=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rihal-advisor 2>/dev/null)
.rcode/workflows/research-phase.md:47:
  AGENT_SKILLS_RESEARCHER=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rihal-researcher 2>/dev/null)
```

Fix: `rihal-checker` → `rcode-checker`, `rihal-advisor` → `rcode-advisor`, `rihal-researcher` →
`rcode-researcher`.

---

### GAP-USER-FACING (40 hits in 13 files) — SEVERITY: P2

`RIHAL` (uppercase) appears in user-visible strings including GitHub issue comment templates, version
field labels, output banners, and import/inbox workflow prompts:

```
.rcode/workflows/inbox.md:125:      - [ ] RIHAL Version provided
.rcode/workflows/inbox.md:261:      RIHAL INBOX TRIAGE — {repo} — {date}
.rcode/workflows/inbox.md:339:      gh issue close ... --comment "Closed by RIHAL inbox triage: ..."
.rcode/workflows/import.md:51:      RIHAL > --prd mode is planned for a future release.
.rcode/workflows/import.md:117:    - **RIHAL SPRINT.md format**: ...
./examples/rental-app-walkthrough.md:54:  RIHAL ► COUNCIL SESSION
./examples/council-decision.md:30:  RIHAL ► COUNCIL SESSION
```

Fix: `RIHAL` → `rcode` in output strings (lowercase consistent with v4 brand). The banner prefix
`RIHAL ►` should become `rcode ►`.

---

### GAP-ARABIC-DOC (38 hits in 12 files) — SEVERITY: P2

`Rihalian` (the demonym for a Rihal employee) appears 38 times across `docs/` and `.rcode/brain/`.
Post-rebrand, the docs should use neutral language (`rcode user`, `rcode engineer`, `rcode team
member`) when referring to people using the tool outside the company context.

Most-affected files:

```
./docs/what-is-rcode-code.md      (9 hits)
./docs/USP.md                     (5 hits)
./docs/ROADMAP.md                 (4 hits)
./docs/adr/0003-mcp-server...md   (3 hits)
.rcode/brain/README.md            (3 hits)
.rcode/skills/rihal-scaffold-project/SKILL.md (2 hits)
```

Fix: Replace `Rihalian` with `rcode user` (generic context) or leave as company-internal term with a
note. This tag requires a human decision on scope — see Borderline Cases.

---

### GAP-DEAD-EXAMPLE (82 hits in 17 files) — SEVERITY: P3

Old `rihal/commands/`, `rihal/workflows/`, `rihal/skills/`, `rihal/modules/`, `rihal/bin/`,
`rihal/templates/` directory examples still appear in workflow body text and reference files.
The `rihal/` root directory no longer exists; the real directory is `rcode/`.

Top affected files:

```
.rcode/references/REFERENCES_INDEX.md   (14 hits: rihal/skills/agents/* column)
.rcode/workflows/update.md               (7 hits: example output uses rihal/commands/*)
.rcode/workflows/stats.md                (3 hits: git log -- .rihal rihal/)
.rcode/references/commit-conventions.md  (2 hits: git add rihal/agents/*)
./temp/rcode-plan.md                     (3 hits)
./temp/rcode-roadmap.md                  (8 hits)
```

Fix: `rihal/` → `rcode/` in path examples. `temp/` files may be archived or deleted entirely.

---

## Files needing the most attention

Ranked by combined gap count:

| Rank | File | Gap hits |
|------|------|----------|
| 1 | `./temp/rcode-plan.md` | 62 |
| 2 | `./.rcode/references/REFERENCES_INDEX.md` | 14 |
| 3 | `./docs/adr/0003-mcp-server-for-rcode-brain.md` | 13 |
| 4 | `./.claude/agents/rules/roadmapper/detailed-guide.md` | 12 |
| 5 | `./.claude/agents/rules/debugger/debug-session-state.md` | 10 |
| 6 | `./.rcode/workflows/plan.md` | 9 |
| 7 | `./rcode/workflows/import.md` | 9 |
| 8 | `./.rcode/workflows/import.md` | 9 |
| 9 | `./docs/what-is-rcode-code.md` | 9 |
| 10 | `./.claude/agents/rules/project-researcher/detailed-guide.md` | 9 |
| 11 | `./.claude/agents/rules/executor/execution-flow.md` | 9 |
| 12 | `./.rcode/workflows/update.md` | 7 |
| 13 | `./.rcode/workflows/undo.md` | 6 |
| 14 | `./.claude/agents/rules/sprint-checker/process.md` | 6 |
| 15 | `./temp/rcode-audit.md` | 5 |
| 16 | `./.rcode/workflows/inbox.md` | 5 |
| 17 | `./.rcode/state.json` | 5 |
| 18 | `./rcode/references/output-format.md` | 5 |
| 19 | `./docs/ROADMAP.md` | 5 |
| 20 | `./.claude/agents/rules/executor/summary-creation.md` | 5 |

Note: `temp/` files (`rcode-plan.md`, `rcode-audit.md`, `rcode-roadmap.md`) contain planning scratch
content — consider deleting entirely rather than fixing.

---

## Borderline cases (need human decision)

1. **`Rihal_WS` template variable (90 hits in 10 files)** — used as a shell template placeholder in
   workflow files (`${Rihal_WS}` is the workspace path argument). The `.rcode/workflows/` copies use
   this name; the `rcode/workflows/` copies already renamed it to nothing/different. Decision needed:
   rename to `${RCODE_WS}` or `${WS}` across all workflow files? Included in INT counts above since
   it's an internal template name, but it leaks the old brand to anyone reading a workflow.

2. **`Rihalian` noun (38 hits)** — is this company-internal jargon to keep (in `docs/` targeting
   company users) or does it leak outside to public users via `docs/what-is-rcode-code.md`? If the
   docs are public-facing, replace with `rcode user`. If company-internal, document the term in a
   glossary.

3. **`RIHAL ►` banner prefix (3 hits in `examples/`)** — example files use `RIHAL ►` as the tool
   output banner. These are user-visible when shown in demos/docs. Decision: replace with `rcode ►`?

4. **`.cursor/rules/rihal/` directory (182 `.mdc` files)** — the Cursor IDE mirror of skills uses
   `rihal/` as the directory name. This is `INT-SKILL-DIR` by the current taxonomy, but if Cursor
   users see the directory name in the IDE, it surfaces old branding. Rename to `.cursor/rules/rcode/`?

5. **`JOURNEY.md` template content (7 hits)** — `.rcode/JOURNEY.md` is the per-project template.
   Lines 4 and 22 still say `/rihal-init` and `/rihal-council`. These are `INT-SLASH` (command names)
   but appear in a generated project file that users read directly. Should the template example
   commands use `rcode-*` or `rihal-*`?

6. **`rihal-tools` as commit scope in `AGENTS.md` / `CLAUDE.md`** — both files list `rihal-tools` in
   the allowed commit scopes list alongside `rcode-tools`. `CONTRIBUTING.md:342` explicitly marks it
   as "accepted for backward compatibility." Keep as-is or remove the legacy scope?

---

## Recommended fix plan (next iteration)

| Priority | Category | Files | Action |
|----------|----------|-------|--------|
| P0 | `GAP-AGENT-NAME` | 3 | Fix `rihal-checker/advisor/researcher` → `rcode-*` in 3 workflow files |
| P0 | `GAP-STATE-DATA` (`.rihal/bin/`) | 11 `.claude/agents/rules/` files | Replace `.rihal/bin/rihal-tools.cjs` → `.rcode/bin/rcode-tools.cjs` |
| P0 | `GAP-STATE-DATA` (`.rihal/` paths) | 13 remaining files | Replace `.rihal/` → `.rcode/` |
| P1 | `GAP-WORKFLOW-TITLE` | 61 files | One-line sed pass on `.rcode/workflows/*.md` |
| P1 | `GAP-TOOL-NAME` | 47 files | Replace `rihal-tools` → `rcode-tools` (skip CONTRIBUTING.md:342) |
| P1 | `GAP-INTERNAL-VAR` | 12 files | Rename shell vars/git tags: `rihal/snapshot` → `rcode/snapshot`, `_rihal_field` → `_rcode_field` |
| P2 | `GAP-USER-FACING` | 13 files | Replace `RIHAL` banner strings → `rcode` |
| P2 | `GAP-ARABIC-DOC` | 12 files | Replace `Rihalian` — decision needed first (see borderlines) |
| P3 | `GAP-DEAD-EXAMPLE` | 17 files | Update `rihal/` path examples → `rcode/`; delete `temp/` files |

---

## Verification commands

Run after fixes to confirm each gap category is empty:

```bash
# GAP-WORKFLOW-TITLE
grep -r "^# Workflow: rihal-" .rcode/workflows/ rcode/workflows/

# GAP-STATE-DATA
grep -rn "\.rihal/" .claude/ .rcode/workflows/ rcode/workflows/ \
  | grep -v "github.com/hanzlahabib/rihal-code\|@hanzlahabib/rihal-code"

# GAP-TOOL-NAME (excluding CONTRIBUTING.md backward-compat note)
grep -rn "rihal-tools" .rcode/ rcode/ .claude/ \
  | grep -v "CONTRIBUTING.md:342\|rihal-tools.*legacy\|rihal-tools.*backward"

# GAP-INTERNAL-VAR
grep -rn "_rihal_field\|rihal_state_version\|rihal/snapshot\|rihal/autonomous" .rcode/ rcode/

# GAP-AGENT-NAME
grep -rn "agent-skills rihal-\b" .rcode/workflows/ rcode/workflows/

# GAP-USER-FACING
grep -rn "\bRIHAL\b" .rcode/workflows/ rcode/workflows/ examples/ \
  | grep -v "rihal->rcode\|RIHAL_PUSH_OK"

# GAP-ARABIC-DOC
grep -rni "rihalian" docs/ .rcode/brain/ .rcode/skills/ rcode/

# GAP-DEAD-EXAMPLE (rihal/ old dir examples)
grep -rn " rihal/commands\| rihal/workflows\| rihal/skills\| rihal/modules\| rihal/bin" \
  .rcode/workflows/ rcode/workflows/ .rcode/references/ rcode/references/
```
