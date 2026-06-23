# Workflow: rcode-lens-audit

<purpose>
Run a structured 16-lens code audit against the current project. Each lens
delegates to its mapped primary skill via Task() subagent dispatch — the skill
provides domain expertise; this workflow handles orchestration, aggregation,
and GH issue body generation. Never fixes anything; audit-first, fix-second.
</purpose>

## Skill Mapping

| Lens | Name | Primary Skill | Secondary |
|------|------|--------------|-----------|
| 1 | Security | `rcode-security-auditor` | `rcode-security-adversary` |
| 2 | Performance | `rcode-perf` | — |
| 3 | Testability | `rcode-fatima` | `rcode-edge-case-hunter` |
| 4 | Extensibility | `rcode-waleed` | — |
| 5 | Dep Health | `rcode-dep-auditor` | — |
| 6 | Error Recovery | `rcode-debugger` | — |
| 7 | State Machine | `rcode-deviation-analyzer` | — |
| 8 | i18n | `rcode-i18n-auditor` | — |
| 9 | Documentation | `rcode-docs-auditor` | — |
| 10 | Cross-platform | `rcode-cross-platform-auditor` | — |
| 11 | Karpathy | `rcode-reviewer` | `rcode-hanzla` |
| 12 | SXO/UX | `rcode-layla` | — |
| 13 | Observability | `rcode-observability-auditor` | — |
| 14 | Naming | `rcode-codebase-mapper` | `rcode-reviewer` |
| 15 | Coverage | `rcode-nyquist-auditor` | `rcode-fatima` |
| 16 | YAGNI / Over-engineering | `rcode-reviewer` | `rcode-lazy` |

## Step 0 — Usage check

If `$ARGUMENTS` is `--help` or `-h`:

```
/rcode-lens-audit                # interactive — asks which lens
/rcode-lens-audit all            # run all 16 lenses sequentially
/rcode-lens-audit <N>            # run lens N (1-16) only
/rcode-lens-audit <name>         # run by name, e.g. "security", "performance"

Lenses and their primary skills:
  1.  security         — rcode-security-auditor + rcode-security-adversary
  2.  performance      — rcode-perf
  3.  testability      — rcode-fatima + rcode-edge-case-hunter
  4.  extensibility    — rcode-waleed
  5.  dep-health       — rcode-dep-auditor
  6.  error-recovery   — rcode-debugger
  7.  state-machine    — rcode-deviation-analyzer
  8.  i18n             — rcode-i18n-auditor
  9.  documentation    — rcode-docs-auditor
  10. cross-platform   — rcode-cross-platform-auditor
  11. karpathy         — rcode-reviewer + rcode-hanzla (incl. design-token bypass)
  12. sxo              — rcode-layla
  13. observability    — rcode-observability-auditor
  14. naming           — rcode-codebase-mapper + rcode-reviewer
  15. coverage         — rcode-nyquist-auditor + rcode-fatima
  16. yagni            — rcode-reviewer + rcode-lazy (speculative abstractions, unused config, deps stdlib covers)
```

STOP after printing help.

## Step 1 — Resolve target lens(es)

```bash
TOOL="node .rcode/bin/rcode-tools.cjs"
INIT=$($TOOL init 2>/dev/null || echo '{"ok":false}')
MODE=$($TOOL config-get mode 2>/dev/null || echo "guided")
RESPONSE_LANGUAGE=$($TOOL config-get response_language 2>/dev/null || echo "")
# Resolve audit model from profile (#723). Order: audit_model → default_model → sonnet.
LENS_MODEL=$($TOOL config-get audit_model 2>/dev/null \
  || $TOOL config-get default_model 2>/dev/null \
  || echo "sonnet")
# Build an imperative directive only when language is explicitly set (#721).
# Empty RESPONSE_LANGUAGE = English default, no directive injected.
if [ -n "$RESPONSE_LANGUAGE" ] && [ "$RESPONSE_LANGUAGE" != "english" ]; then
  LANG_DIRECTIVE="Respond in $RESPONSE_LANGUAGE. Keep finding IDs, file paths, and CLI commands in English; localise only the human-facing prose."
else
  LANG_DIRECTIVE=""
fi
```

If INIT is empty or INIT.ok is false, print error and exit:
```
rcode-tools not found. Run: npx @hanzlaa/rcode install .
```

Parse `$ARGUMENTS`:
- `all` → `LENSES=(1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16)`
- digit 1–16 → `LENSES=(<N>)`
- known lens name → map to number → `LENSES=(<N>)`
- empty → continue to Step 2 (interactive picker)

Name → number mapping:
`security=1, performance=2, testability=3, extensibility=4, dep-health=5,`
`error-recovery=6, state-machine=7, i18n=8, documentation=9, cross-platform=10,`
`karpathy=11, sxo=12, observability=13, naming=14, coverage=15, yagni=16`

## Step 2 — Interactive picker (when no argument given)

Call AskUserQuestion:

```
Question:
Kaun sa lens run karna hai? (Which lens to run?)

Options:
  1.  security         — rcode-security-auditor (injection, secrets, auth)
  2.  performance      — rcode-perf (unbounded reads, wasted passes)
  3.  testability      — rcode-fatima (coverage gaps, untested paths)
  4.  extensibility    — rcode-waleed (hardcoded values, scalability)
  5.  dep-health       — rcode-dep-auditor (CVEs, unused, loose pins)
  6.  error-recovery   — rcode-debugger (swallowed errors, missing fallbacks)
  7.  state-machine    — rcode-deviation-analyzer (transitions, schema drift)
  8.  i18n             — rcode-i18n-auditor (hardcoded strings, RTL, response_language)
  9.  documentation    — rcode-docs-auditor (Next Up, dead links, 5-component)
  10. cross-platform   — rcode-cross-platform-auditor (bash-isms, macOS flags)
  11. karpathy         — rcode-reviewer + rcode-hanzla (overengineering, stubs)
  12. sxo              — rcode-layla (dead-end flows, missing guidance)
  13. observability    — rcode-observability-auditor (unguarded calls, silent fails)
  14. naming           — rcode-codebase-mapper (naming drift, PLAN.md vs SPRINT.md)
  15. coverage         — rcode-nyquist-auditor (parity gaps, untested commands)
  16. yagni            — rcode-reviewer (speculative abstractions, single-impl interfaces, deps stdlib covers)
  17. all              — run all 16 lenses
  0.  cancel
```

Set `LENSES` from the choice.

## Step 3 — Determine scope

```bash
# Collect scope context for skill prompts
SCOPE_DIRS="rcode/ .rcode/"
[ -d src ] && SCOPE_DIRS="$SCOPE_DIRS src/"
[ -d lib ] && SCOPE_DIRS="$SCOPE_DIRS lib/"
SCOPE_SUMMARY="Scope: $SCOPE_DIRS.${LANG_DIRECTIVE:+ $LANG_DIRECTIVE}"

# Collect project context for richer prompts
PROJECT_NAME=$($TOOL config-get project.name 2>/dev/null || basename "$PWD")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
CONTEXT="Project: $PROJECT_NAME. Branch: $GIT_BRANCH ($GIT_SHA). $SCOPE_SUMMARY"
```

## Step 4 — Dispatch each lens to its primary skill

For each lens number in `LENSES`:

**Partial-fail protocol:** if a subagent Task() call errors, log
`Lens N ({name}): subagent error — skipping` and continue with remaining lenses.
Never halt the whole audit because one lens's skill fails.

---

### Lens 1 — Security

```
PRIMARY = Task(
  subagent_type="rcode-security-auditor",
  model="{lens_model}",
  prompt="Audit-only — do NOT fix anything. {CONTEXT}
  
  Run Lens 1 (Security) audit. Check:
  - Hardcoded secrets / tokens / passwords in any file
  - Path traversal: unsanitised user input in file read paths
  - Shell injection: unquoted variables in exec/spawn/execSync calls
  - Auth bypass: skipAuth, bypassAuth, noAuth patterns
  - Insecure defaults in config files
  
  Apply OWASP Top 10 and Semgrep security rule patterns.
  
  Return findings as: file:line — description [severity: critical|warn|info]
  If no findings: respond with exactly PASS"
)

SECONDARY = Task(
  subagent_type="rcode-security-adversary",
  model="{lens_model}",
  prompt="Adversarial security review. {CONTEXT}
  
  Think like an attacker. Find exploitation paths in:
  - Input validation gaps
  - Trust boundary violations
  - Privilege escalation opportunities
  
  Return: file:line — attack vector [critical|warn]
  If clean: PASS"
)

FINDINGS[security] = merge(PRIMARY, SECONDARY)
```

---

### Lens 2 — Performance

```
RESULT = Task(
  subagent_type="rcode-code-reviewer",
  model="{lens_model}",
  prompt="Audit-only — do NOT optimize anything. {CONTEXT}
  
  Run Lens 2 (Performance) audit. Check:
  - Unbounded file reads (find without -maxdepth, cat without head)
  - readFileSync / fs.readFileSync inside loops
  - JSON.parse on large blobs without size guard or try/catch
  - Synchronous operations blocking the event loop
  - Missing pagination or limit on list operations
  
  Reference: Lighthouse CI thresholds, Node.js clinic.js flame graph patterns.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[performance] = RESULT
```

---

### Lens 3 — Testability

```
PRIMARY = Task(
  subagent_type="rcode-fatima",
  model="{lens_model}",
  prompt="Audit-only — do NOT write tests. {CONTEXT}
  
  Run Lens 3 (Testability) audit. Check:
  - Code paths with no test coverage
  - Functions/workflows with no corresponding test or parity check
  - Missing assertions (tests that never assert)
  - Test files that import from production but never call the function
  - Success criteria sections with no verifiable acceptance check
  
  Reference: Istanbul/c8 coverage thresholds, mutation testing patterns.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

SECONDARY = Task(
  subagent_type="rcode-edge-case-hunter",
  model="{lens_model}",
  prompt="Enumerate edge cases and boundary conditions. {CONTEXT}
  
  Find:
  - Boundary values not tested (off-by-one, empty input, null)
  - Undefined state transitions
  - Race conditions in parallel subagent spawns
  
  Return: file:line — edge case description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[testability] = merge(PRIMARY, SECONDARY)
```

---

### Lens 4 — Extensibility

```
RESULT = Task(
  subagent_type="rcode-waleed",
  model="{lens_model}",
  prompt="Architecture audit — do NOT redesign anything. {CONTEXT}
  
  Run Lens 4 (Extensibility) audit. Check:
  - Hardcoded mode/target lists that require source edits to extend
  - Dispatch chains with >10 branches (missing strategy pattern)
  - Hardcoded model IDs / API endpoints without config fallback
  - Missing ADR for significant architectural decisions
  - Scalability ceilings: N+1 patterns, unbounded collections
  
  Reference: SOLID principles (Open/Closed), Strategy pattern, ADR format.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[extensibility] = RESULT
```

---

### Lens 5 — Dependency Health

```
RESULT = Task(
  subagent_type="rcode-code-reviewer",
  model="{lens_model}",
  prompt="Audit-only — do NOT install or update packages. {CONTEXT}
  
  Run Lens 5 (Dep Health) audit:
  - Run pnpm audit or npm audit and report CVEs
  - Detect unused packages (imported nowhere in source)
  - Flag loose version pins (^ or ~ prefix)
  - Check for lock file presence (pnpm-lock.yaml / package-lock.json)
  - Check engines.node field matches .nvmrc
  
  Reference: Snyk severity scoring, OWASP Dependency-Check, Renovate pin policies.
  
  Return: dep-name — issue [critical|warn|info]
  If clean: PASS"
)

FINDINGS[dep-health] = RESULT
```

---

### Lens 6 — Error Recovery

```
RESULT = Task(
  subagent_type="rcode-debugger",
  model="{lens_model}",
  prompt="Error recovery audit — do NOT fix anything. {CONTEXT}
  
  Run Lens 6 (Error Recovery) audit. Find missing error handling:
  - Shell calls ($(...)) without 2>/dev/null or try/catch
  - Task() subagent calls with no failure branch in the workflow
  - JSON.parse without try/catch wrapping
  - INIT= assignments with no .ok check in next 15 lines
  - 2>/dev/null lines with no || fallback value
  - Missing graceful-degrade paths when an optional subagent fails
  
  Reference: Bash set -euo pipefail patterns, Node.js error-first callbacks.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[error-recovery] = RESULT
```

---

### Lens 7 — State Machine

```
RESULT = Task(
  subagent_type="rcode-deviation-analyzer",
  model="{lens_model}",
  prompt="State machine audit — do NOT modify state. {CONTEXT}
  
  Run Lens 7 (State Machine) audit. Check:
  - Phase transitions without guards (complete→executing without --force)
  - state.json schema drift (phases missing number/name/status fields)
  - Workflows writing to .planning/ without checking if directory exists
  - Workflows that auto-insert phantom phase stubs (number corruption)
  - Missing migrate-schema call before reading phase state
  
  Reference: XState finite state machine patterns, event sourcing invariants.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[state-machine] = RESULT
```

---

### Lens 8 — i18n

```
RESULT = Task(
  subagent_type="rcode-i18n-auditor",
  model="{lens_model}",
  prompt="i18n audit — do NOT add translations. {CONTEXT}
  
  Run Lens 8 (i18n) audit. Check:
  - Workflows that spawn subagents without passing response_language
  - Hardcoded English strings in output/echo/print blocks
  - AskUserQuestion prompts that are English-only (no RTL/Arabic variant)
  - ASCII box-drawing banners that will break with Arabic text
  - config-get calls that skip the response_language key
  
  Reference: i18next namespace patterns, formatjs ICU messages, rtlcss flip rules.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[i18n] = RESULT
```

---

### Lens 9 — Documentation

```
RESULT = Task(
  subagent_type="rcode-docs-auditor",
  model="{lens_model}",
  prompt="Documentation audit — do NOT write docs. {CONTEXT}
  
  Run Lens 9 (Documentation) audit. Check:
  - Workflows missing a '## Next Up' or 'Next Up' footer
  - Dead @.rcode/ references (file path does not exist in rcode/)
  - README.md referencing /rcode-<command> that has no command file
  - Skills (SKILL.md) missing required sections: Overview, Workflow, Output Format, Examples
  - CHANGELOG.md more than 5 commits behind HEAD
  
  Reference: Divio documentation system (tutorial/how-to/reference/explanation).
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[documentation] = RESULT
```

---

### Lens 10 — Cross-platform

```
RESULT = Task(
  subagent_type="rcode-code-reviewer",
  model="{lens_model}",
  prompt="Cross-platform audit — do NOT fix scripts. {CONTEXT}
  
  Run Lens 10 (Cross-platform) audit. Check:
  - BSD sed -i '' vs GNU sed -i divergence
  - macOS-only tools: greadlink, gsed, gfind, gawk, gdate
  - Bash-isms in #!/bin/sh scripts: [[ ]], arrays, mapfile, process substitution
  - Hardcoded absolute Unix paths (/home/, /usr/, /etc/) in Node.js source
  - CRLF line endings in .md/.yaml/.sh files
  - npm scripts using Unix-only && chains (use cross-env / shx instead)
  
  Reference: ShellCheck POSIX rules, cross-env ★6.2k, shx ★1.6k.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[cross-platform] = RESULT
```

---

### Lens 11 — Karpathy

```
PRIMARY = Task(
  subagent_type="rcode-code-reviewer",
  model="{lens_model}",
  prompt="Karpathy 4-principle audit — do NOT fix code. {CONTEXT}
  
  Run Lens 11 (Karpathy) audit against recent changes (HEAD~20..HEAD):
  
  Principle 1 (Think Before Coding): unclear assumptions, magic numbers without comment
  Principle 2 (Simplicity First): dead code, unused imports, speculative abstractions
  Principle 3 (Surgical Changes): whitespace-only diffs, reformatting unrelated code
  Principle 4 (Goal-Driven Execution): TODOs, stubs, not-implemented errors, mock data
  Design-token bypass (#660): raw hex/rgb/hsl/named colors in CSS outside :root
    or @theme blocks. Two-stage check per @.rcode/references/design-tokens.md.
    Honor .rcode/design-tokens-allowlist.txt waivers.
  
  Return: file:line — principle N violation — description [critical|warn|info]
  If clean: PASS"
)

SECONDARY = Task(
  subagent_type="rcode-hanzla",
  model="{lens_model}",
  prompt="Implementation quality audit — do NOT refactor. {CONTEXT}
  
  Review recent code (HEAD~10..HEAD) for:
  - Overengineered abstractions that add complexity without clear benefit
  - Code that could be 3 lines but is 30
  - Unclear variable/function names
  - Missing error messages that would help debug production failures
  - Design-token bypass: raw hex in CSS classes when a semantic role exists
    (per @.rcode/references/design-tokens.md)
  
  Return: file:line — description [warn|info]
  If clean: PASS"
)

FINDINGS[karpathy] = merge(PRIMARY, SECONDARY)
```

---

### Lens 12 — SXO/UX

```
RESULT = Task(
  subagent_type="rcode-layla",
  model="{lens_model}",
  prompt="UX flow audit — do NOT redesign flows. {CONTEXT}
  
  Run Lens 12 (SXO/UX) audit on rcode workflows. Check:
  - Dead-end workflows (no Next Up footer, no forward dispatch)
  - AskUserQuestion prompts with no cancel/exit option (option 0)
  - Error-exit paths that print an error but suggest no recovery command
  - Dispatch table rows that reference non-existent commands
  - Menus with >8 options (cognitive overload — flag for splitting)
  
  Reference: Nielsen 10 usability heuristics, WCAG 2.1 AA error messages.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[sxo] = RESULT
```

---

### Lens 13 — Observability

```
RESULT = Task(
  subagent_type="rcode-code-reviewer",
  model="{lens_model}",
  prompt="Observability audit — do NOT add instrumentation. {CONTEXT}
  
  Run Lens 13 (Observability) audit. Check:
  - rcode-tools calls without 2>/dev/null or error guard
  - Task() calls where result is never captured or checked
  - Bare 2>/dev/null at end of line with no || fallback echo
  - INIT= assignments with no .ok check within next 15 lines
  - console.log/error/warn in production Node.js code (not test files)
  - Shell scripts missing set -euo pipefail
  
  Reference: OpenTelemetry structured logging, Pino ★13k, Winston ★22k.
  
  Return: file:line — description [critical|warn|info]
  If clean: PASS"
)

FINDINGS[observability] = RESULT
```

---

### Lens 14 — Naming Consistency

```
PRIMARY = Task(
  subagent_type="rcode-codebase-mapper",
  model="{lens_model}",
  prompt="Naming consistency audit — do NOT rename anything. {CONTEXT}
  
  Run Lens 14 (Naming) audit. Produce a CONVENTIONS scan:
  - PLAN.md references that should be SPRINT.md (stale naming)
  - rcode: namespace (colon) that should be rcode- (hyphen)
  - Agent directory names that do not match their SKILL.md name: field
  - PHASE_NUMBER variable used where PHASE_NUMBER is the standard
  - CamelCase vs snake_case drift in config keys
  
  Return: file:line — drift description [warn|info]
  If clean: PASS"
)

SECONDARY = Task(
  subagent_type="rcode-code-reviewer",
  model="{lens_model}",
  prompt="Variable naming audit in recent code changes. {CONTEXT}
  
  Review HEAD~10..HEAD for:
  - Inconsistent naming style within the same file (camelCase vs snake_case mixed)
  - Unclear abbreviations (tgt, tmp, obj, val without context)
  - Boolean variables not prefixed with is/has/should/can
  
  Return: file:line — description [warn|info]
  If clean: PASS"
)

FINDINGS[naming] = merge(PRIMARY, SECONDARY)
```

---

### Lens 15 — Coverage

```
PRIMARY = Task(
  subagent_type="rcode-nyquist-auditor",
  model="{lens_model}",
  prompt="Coverage audit — do NOT generate tests. {CONTEXT}
  
  Run Lens 15 (Coverage) audit. Fill Nyquist gaps:
  - Commands in rcode/commands/ with no parity test entry
  - Subagent types referenced in workflows but no SKILL.md directory
  - Workflows referenced in commands that do not exist in rcode/workflows/
  - Skills in team.yaml with no corresponding skills/agents/ directory
  - Acceptance criteria rows with no verifiable check (vague 'should work')
  
  Return: file:line — gap description [critical|warn|info]
  If clean: PASS"
)

SECONDARY = Task(
  subagent_type="rcode-fatima",
  model="{lens_model}",
  prompt="Release gate — coverage quality check. {CONTEXT}
  
  Review test strategy gaps:
  - Critical workflows with no behavioral regression test
  - Integration points between workflows that have no end-to-end test
  - Config keys that are read but never validated
  
  Return: gap description [critical|warn]
  If clean: PASS"
)

FINDINGS[coverage] = merge(PRIMARY, SECONDARY)
```

---

### Lens 16 — YAGNI / Over-engineering

```
PRIMARY = Task(
  subagent_type="rcode-code-reviewer",
  model="{lens_model}",
  prompt="YAGNI / over-engineering audit — do NOT fix code. {CONTEXT}

  Run Lens 16 (YAGNI) audit against recent changes (HEAD~20..HEAD), using the
  rcode-lazy ladder as the rubric (@.rcode/skills/core/rcode-lazy/SKILL.md).
  This lens is narrower than Lens 11 (Karpathy): hunt ONLY for code that exists
  but should not, or is bigger than the job needs. Flag:

  - Speculative features / config / params for needs that do not exist yet
  - Abstractions with a single implementation: an interface, factory, or
    strategy with exactly one concrete user — inline it
  - Wrapper layers that add a hop for one caller
  - 'For later' scaffolding: extension points, plugin registries, generic
    handlers with one case
  - A new dependency for what stdlib or a native platform feature already does
    (e.g. a date-picker lib vs <input type=\"date\">, a deep-clone lib vs
    structuredClone)
  - Config for a value that never changes (hardcode it)
  - Hand-rolled code reproducing an already-installed dependency

  Do NOT flag: validation at trust boundaries, error handling that prevents
  data loss, security, accessibility, or anything explicitly requested — those
  are never YAGNI violations even when verbose.

  Return: file:line — YAGNI smell — what to delete/inline + the simpler form [critical|warn|info]
  If clean: PASS"
)

FINDINGS[yagni] = PRIMARY
```

---

## Step 5 — Compile findings per lens

For each lens that was run, print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lens {N}: {NAME}  (primary: {skill})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Findings: {count}

{file:line — description [severity]}
...

Status: PASS (0) | WARN ({n}) | FAIL ({n critical})
```

If `FINDINGS[lens]` is `PASS` or empty: print `✓ Lens {N} ({name}): PASS`.

## Step 6 — Output GitHub issue bodies

For each lens with findings ≥ 1, print a ready-to-file issue template:

```markdown
---
### Issue: [lens-audit] Lens {N} ({name}) — {count} findings

**Labels:** `lens-audit`, `{lens-name}`
**Skill used:** `{primary-skill}`

**Body:**
## Findings — Lens {N}: {name}

| File | Line | Description | Severity |
|------|------|-------------|----------|
{rows}

## Reproduce
Run: `/rcode-audit lens {N}` on commit `{git rev-parse --short HEAD}`

## Suggested fix
{one-line fix suggestion per critical finding}
```

Print to stdout only — do NOT create issues automatically.

## Step 7 — Summary banner

```
╔══════════════════════════════════════════════════════╗
║  LENS AUDIT COMPLETE                                 ║
╠══════════════════════════════════════════════════════╣
║  Lenses run:     {count}                             ║
║  Total findings: {total}                             ║
║  Critical:       {critical}                          ║
║  Warnings:       {warnings}                          ║
╚══════════════════════════════════════════════════════╝

{N}. {lens-name} — {count} findings (primary: {skill})
...

Next: file the GH issues above, then run /rcode-audit fix to address them.
```

## Success Criteria

- [ ] Skill mapping table is shown at top of output
- [ ] Each lens dispatches to its primary skill via Task(subagent_type=...)
- [ ] Secondary skills run in parallel where applicable (L1, L3, L11, L14, L15)
- [ ] Partial-fail: one skill error does not abort remaining lenses
- [ ] PASS case handled cleanly (no spurious findings printed)
- [ ] GH issue bodies printed to stdout only
- [ ] Summary banner shows per-lens skill attribution
- [ ] response_language passed through to all subagent prompts

## On Error

- **rcode-tools not found**: print `Run: npx @hanzlaa/rcode install .` and STOP.
- **Lens N out of range (not 1–16)**: print valid range and STOP.
- **Subagent skill not installed**: note `(skill not available — skipping)`, continue.
- **Scope dirs empty**: note `(no source files in scope)` per lens, still run dispatch.
- **Karpathy dispatch fails** (Lens 11): note failure, continue with remaining lenses.

## Next Up

```
File findings as GH issues:   gh issue create --title "[lens-audit] Lens N..." --body "..."
Auto-fix what's fixable:       /rcode-audit fix
Re-run a single lens:          /rcode-audit lens <N>
Full re-audit after fixes:     /rcode-audit lens all
View audit settings:           /rcode-settings show
```
