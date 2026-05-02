# Workflow: rihal-lens-audit

<purpose>
Run a structured 15-lens code audit against the current project. Each lens is an
independent inspection angle (security, performance, testability, etc.). The user
picks one lens or all 15; the workflow runs every selected lens, prints labelled
findings, and outputs ready-to-paste GitHub issue bodies — one per lens. Never
fixes anything; audit-first, fix-second is the rule.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` is `--help` or `-h`:

```
/rihal-lens-audit                # interactive — asks which lens
/rihal-lens-audit all            # run all 15 lenses sequentially
/rihal-lens-audit <N>            # run lens N (1-15) only
/rihal-lens-audit <name>         # run by name, e.g. "security", "performance"

Lenses:
  1.  security         — injection, secrets, path traversal, auth
  2.  performance      — unbounded reads, missing guards, wasted passes
  3.  testability      — untested code paths, missing assertions
  4.  extensibility    — hardcoded values, no extension points
  5.  dep-health       — outdated deps, CVEs, unused packages
  6.  error-recovery   — missing fallbacks, swallowed errors
  7.  state-machine    — invalid transitions, schema drift
  8.  i18n             — hardcoded strings, missing response_language
  9.  documentation    — missing Next Up, stale references, dead links
  10. cross-platform   — bash-isms, macOS-only flags, Windows gaps
  11. karpathy         — overengineering, stubs, unclear assumptions
  12. sxo              — dead-end flows, missing guidance
  13. observability    — unguarded tool calls, silent failures
  14. naming           — variable/file naming drift across workflows
  15. coverage         — untested commands, missing parity checks
```

STOP after printing help.

## Step 1 — Resolve target lens(es)

```bash
TOOL="node .rihal/bin/rihal-tools.cjs"
INIT=$($TOOL init 2>/dev/null || echo '{"ok":false}')
MODE=$($TOOL config-get mode 2>/dev/null || echo "guided")
```

Parse `$ARGUMENTS`:
- `all` → `LENSES=(1 2 3 4 5 6 7 8 9 10 11 12 13 14 15)`
- digit 1–15 → `LENSES=(<N>)`
- known lens name → map to number → `LENSES=(<N>)`
- empty → continue to Step 2 (interactive picker)

## Step 2 — Interactive picker (when no argument given)

Call AskUserQuestion:

```
Question:
Kaun sa lens run karna hai? (Which lens to run?)

Options:
  1.  security         — injection, secrets, path traversal, auth
  2.  performance      — unbounded reads, missing guards, wasted passes
  3.  testability      — untested code paths, missing assertions
  4.  extensibility    — hardcoded values, no extension points
  5.  dep-health       — outdated deps, CVEs, unused packages
  6.  error-recovery   — missing fallbacks, swallowed errors
  7.  state-machine    — invalid transitions, schema drift
  8.  i18n             — hardcoded strings, missing response_language
  9.  documentation    — missing Next Up, stale references, dead links
  10. cross-platform   — bash-isms, macOS-only flags, Windows gaps
  11. karpathy         — overengineering, stubs, unclear assumptions
  12. sxo              — dead-end flows, missing guidance
  13. observability    — unguarded tool calls, silent failures
  14. naming           — variable/file naming drift across workflows
  15. coverage         — untested commands, missing parity checks
  16. all              — run all 15 lenses (files issues for each)
  0.  cancel
```

Set `LENSES` from the choice.

## Step 3 — Determine scope

```bash
# Default: rihal/workflows/ + rihal/skills/ + rihal/bin/ + rihal/commands/
SCOPE_DIRS="rihal/workflows rihal/skills rihal/bin rihal/commands rihal/templates"
# Override if .rihal/ already installed:
[ -d .rihal ] && SCOPE_DIRS="$SCOPE_DIRS .rihal/workflows .rihal/skills .rihal/bin"
```

## Step 4 — Run each lens

For each lens in `LENSES`, run the corresponding checks below. Accumulate findings
into `FINDINGS[<lens_name>]`. A finding = one-liner: `<file>:<line> — <description>`.

---

### Lens 1 — Security

Check for:

```bash
# Hardcoded secrets / tokens
grep -rn "password\s*=\s*['\"][^'\"]\|api_key\s*=\s*['\"][^'\"]\|secret\s*=\s*['\"][^'\"]" \
  $SCOPE_DIRS --include="*.md" --include="*.cjs" --include="*.js" --include="*.ts" \
  --include="*.yaml" --include="*.json" 2>/dev/null | grep -v ".env.example\|PLACEHOLDER\|YOUR_"

# Path traversal: unsanitised user input used in file reads
grep -rn "\.\./\|readFileSync.*\$\|fs\.read.*\$" \
  $SCOPE_DIRS --include="*.cjs" --include="*.js" --include="*.ts" 2>/dev/null

# Shell injection: unquoted variables in exec/spawn calls
grep -rn "exec(\`\|spawn(\`\|execSync(\`" \
  $SCOPE_DIRS --include="*.cjs" --include="*.js" --include="*.ts" 2>/dev/null | grep '\$'

# Auth bypass patterns
grep -rn "skipAuth\|bypassAuth\|noAuth\|auth.*false\|auth.*skip" \
  $SCOPE_DIRS 2>/dev/null
```

---

### Lens 2 — Performance

Check for:

```bash
# Unbounded file reads (no head/limit)
grep -rn "find\s\+\.\|find\s\+/\|cat\s\+\." \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  grep -v "maxdepth\|head\s\+-\|2>/dev/null\|# example"

# Missing -maxdepth on recursive find
grep -rn "find\s.*-name\|find\s.*-type" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "\-maxdepth"

# readFileSync inside loops (blocking I/O in hot paths)
grep -rn "readFileSync" \
  $SCOPE_DIRS --include="*.cjs" --include="*.js" 2>/dev/null

# Synchronous JSON.parse on large unknown blobs (no try/catch guard)
grep -rn "JSON\.parse" \
  $SCOPE_DIRS --include="*.cjs" --include="*.js" 2>/dev/null | grep -v "try\|catch"
```

---

### Lens 3 — Testability

Check for:

```bash
# Commands with no matching test/parity check
COMMAND_NAMES=$(ls rihal/commands/*.md 2>/dev/null | \
  xargs -I{} basename {} .md | grep -v "^_")
PARITY_FILE="rihal/tests/parity.sh"
[ ! -f "$PARITY_FILE" ] && PARITY_FILE=$(find . -name "parity*" -maxdepth 5 | head -1)

for cmd in $COMMAND_NAMES; do
  grep -q "$cmd" "$PARITY_FILE" 2>/dev/null || \
    echo "rihal/commands/${cmd}.md — no parity test entry"
done

# Workflows that spawn subagents but have no success_criteria section
grep -rL "## Success Criteria\|success_criteria" \
  rihal/workflows/*.md 2>/dev/null

# Subagents referenced in workflows that have no SKILL.md directory
grep -rn "subagent_type:" rihal/workflows/*.md 2>/dev/null | \
  sed 's/.*subagent_type:\s*"\?//' | sed 's/"\?.*//' | sort -u | \
  while read -r agent; do
    [ -d "rihal/skills/agents/$agent" ] || \
      echo "rihal/workflows — subagent_type '$agent' has no SKILL.md"
  done
```

---

### Lens 4 — Extensibility

Check for:

```bash
# Hardcoded lens/mode lists in workflows (not driven by config)
grep -rn "lens[_-]1\|lens[_-]2\|lens[_-]3" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "lens-audit.md"

# Hardcoded phase number ceilings (max_phases = N)
grep -rn "max_phases\|MAX_PHASES\|phases.*<.*[0-9]\{2\}" \
  $SCOPE_DIRS 2>/dev/null

# Hardcoded model names/IDs without config fallback
grep -rn "claude-\|gpt-4\|gemini-" \
  $SCOPE_DIRS --include="*.md" --include="*.yaml" 2>/dev/null | \
  grep -v "config\|default_model\|model_id\|#"

# Extension-point-less dispatch tables (plain if/elif chains > 10 branches)
grep -rn "elif.*TARGET\|elif.*MODE\|elif.*LENS" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  awk -F: '{print $1}' | sort | uniq -c | awk '$1 > 10 {print $2 " — dispatch chain > 10 branches"}'
```

---

### Lens 5 — Dependency Health

Check for:

```bash
# Package.json version pins — find ^ or ~ (loose) vs exact
if [ -f package.json ]; then
  grep -n '"\^[0-9]\|"~[0-9]' package.json | \
    while read -r line; do echo "package.json:${line} — loose version pin"; done
fi

# Deps installed but not imported anywhere
if [ -f package.json ]; then
  node -e "
    const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8'));
    const deps = Object.keys({...pkg.dependencies,...pkg.devDependencies});
    deps.forEach(d => {
      const { execSync } = require('child_process');
      try {
        const count = parseInt(execSync(
          'grep -rn \"' + d + '\" rihal/ --include=\"*.cjs\" --include=\"*.js\" 2>/dev/null | wc -l'
        ).toString().trim());
        if (count === 0) console.log('package.json — dep unused: ' + d);
      } catch(e) {}
    });
  " 2>/dev/null
fi

# Lock file missing (no package-lock.json / pnpm-lock.yaml)
[ ! -f pnpm-lock.yaml ] && [ ! -f package-lock.json ] && \
  echo ". — no lock file (non-reproducible installs)"
```

---

### Lens 6 — Error Recovery

Check for:

```bash
# Unguarded rihal-tools calls (no 2>/dev/null fallback)
grep -rn "rihal-tools\.cjs\b\|rihal-tools\b" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  grep -v "2>/dev/null\|#\|example"

# Silent JSON.parse (no try/catch)
grep -rn "JSON\.parse" \
  $SCOPE_DIRS --include="*.cjs" --include="*.js" 2>/dev/null | grep -v "try\|catch"

# Subagent Task() calls with no failure branch documented
grep -rn "Task(" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "fail\|error\|fallback\|abort"

# Missing .ok checks after init calls
grep -rn "INIT=\$(" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    lineno=$(echo "$line" | cut -d: -f2)
    # Look for .ok check within 10 lines after INIT assignment
    if ! sed -n "$((lineno+1)),$((lineno+10))p" "$file" 2>/dev/null | grep -q "\.ok\|ok.*false"; then
      echo "$file:$lineno — INIT= but no .ok check follows"
    fi
  done
```

---

### Lens 7 — State Machine

Check for:

```bash
# Phase transitions without guard (begin-phase called on already-complete phase)
grep -rn "begin-phase\|complete-phase\|begin_phase\|complete_phase" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "guard\|--force\|precondition"

# state.json schema fields that may be missing (no migrate-schema call before reads)
grep -rn "state get\|state phase\|state phases" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "migrate-schema\|2>/dev/null"

# Multiple incompatible state.json formats co-existing
node .rihal/bin/rihal-tools.cjs state list 2>/dev/null | \
  python3 -c "
import sys, json
data = json.load(sys.stdin) if sys.stdin.read(1) == '{' else None
" 2>/dev/null || echo "state.json — parse error or incompatible schema"

# Workflows that write to .planning/ without checking if directory exists
grep -rn "Write.*\.planning/\|echo.*>.*\.planning/" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "mkdir\|-p\|exists"
```

---

### Lens 8 — i18n

Check for:

```bash
# Hardcoded English output strings (not templated with response_language)
grep -rn "echo \"[A-Z].*\"\|print(\"[A-Z]" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | head -30

# Workflows that spawn subagents but never pass response_language
grep -rn "subagent_type:\|Task(" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    grep -q "response_language" "$file" 2>/dev/null || \
      echo "$file — spawns subagents without passing response_language"
  done | sort -u

# AskUserQuestion calls that have English-only prompts
grep -rn "AskUserQuestion" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null
# (manual review required — flag files for human inspection)
```

---

### Lens 9 — Documentation

Check for:

```bash
# Workflows missing a "Next Up" footer
grep -rL "Next Up\|## Next\|next_up" \
  rihal/workflows/*.md 2>/dev/null

# Dead internal links — @.rihal/ references to files that don't exist in rihal/
grep -rn "@\.rihal/" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  sed 's/.*@\.rihal\///' | sed 's/[^a-zA-Z0-9/_.-].*//' | sort -u | \
  while read -r ref; do
    src="rihal/$ref"
    [ -f "$src" ] || echo "rihal/ — dead reference: @.rihal/$ref"
  done

# ROADMAP.md or README.md referencing deleted commands/skills
if [ -f README.md ]; then
  grep -oP '/rihal-[a-z\-]+' README.md | sort -u | \
    while read -r cmd; do
      name="${cmd#/rihal-}"
      [ -f "rihal/commands/${name}.md" ] || \
        echo "README.md — dead command reference: $cmd"
    done
fi

# Skills missing required 5-component structure
for f in rihal/skills/agents/*/SKILL.md rihal/skills/actions/*/SKILL.md; do
  [ -f "$f" ] || continue
  grep -q "^## Output Format" "$f" || echo "$f — missing '## Output Format'"
  grep -q "^## Examples" "$f" || echo "$f — missing '## Examples'"
done
```

---

### Lens 10 — Cross-platform

Check for:

```bash
# macOS-only flags (BSD sed -i without extension, greadlink, etc.)
grep -rn "sed -i ''" \
  $SCOPE_DIRS --include="*.md" --include="*.sh" --include="*.cjs" 2>/dev/null
grep -rn "greadlink\|gsed\|gfind\|gawk" \
  $SCOPE_DIRS 2>/dev/null

# Bash-isms in sh scripts (arrays, [[ ]], etc.)
grep -rn "\[\[ \|declare -a\|local -a\|read -a" \
  $SCOPE_DIRS --include="*.sh" 2>/dev/null

# Hardcoded Unix paths (absolute /home/, /usr/, /etc/)
grep -rn "'/home/\|'/usr/\|'/etc/" \
  $SCOPE_DIRS --include="*.cjs" --include="*.js" 2>/dev/null | \
  grep -v "# example\|PLACEHOLDER"

# CRLF line endings
find $SCOPE_DIRS -name "*.md" -o -name "*.yaml" 2>/dev/null | \
  xargs grep -lP "\r$" 2>/dev/null | \
  while read -r f; do echo "$f — CRLF line endings"; done
```

---

### Lens 11 — Karpathy

Dispatch to the existing workflow:

```
/rihal-code-review --karpathy HEAD~20..HEAD
```

Capture output and fold into this lens's findings.

---

### Lens 12 — SXO / UX

Check for:

```bash
# Dead-end workflows (no Next Up footer, no dispatch back)
grep -rL "Next Up\|## Next\|/rihal-" rihal/workflows/*.md 2>/dev/null

# AskUserQuestion with no cancel / escape option
grep -rn "AskUserQuestion" $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    grep -q "cancel\|0\.\|exit\|quit" "$file" 2>/dev/null || \
      echo "$file — AskUserQuestion with no cancel option"
  done | sort -u

# Workflows that error-exit without a suggested recovery command
grep -rn "STOP\|exit 1\|Error:" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  grep -v "Run\|Try\|Use\|See\|→\|npx"

# Menu options that lead nowhere (dispatch table has a row with no target)
grep -rn "| .* | /rihal-" $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  sed "s/.*| \/rihal-//" | sed "s/ .*//" | sort -u | \
  while read -r cmd; do
    [ -f "rihal/commands/${cmd}.md" ] || \
      echo "rihal/ — dispatch table references missing command: /rihal-${cmd}"
  done
```

---

### Lens 13 — Observability

Check for:

```bash
# rihal-tools calls without 2>/dev/null guard
grep -rn "\$($TOOL\|node.*rihal-tools" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "2>/dev/null"

# Subagent spawns with no output validation (Task() result not checked)
grep -rn "Task(" $SCOPE_DIRS --include="*.md" 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    lineno=$(echo "$line" | cut -d: -f2)
    if ! sed -n "$lineno,$((lineno+5))p" "$file" 2>/dev/null | \
        grep -q "result\|output\|error\|fail"; then
      echo "$file:$lineno — Task() result not captured or checked"
    fi
  done

# Silent failures: error output discarded without fallback
grep -rn "2>/dev/null$" \
  $SCOPE_DIRS --include="*.md" 2>/dev/null | grep -v "|| echo\||| true\||| exit"
```

---

### Lens 14 — Naming Consistency

Check for:

```bash
# PLAN.md references that should now be SPRINT.md
grep -rn "PLAN\.md\b" \
  rihal/workflows rihal/commands rihal/templates rihal/skills \
  --include="*.md" 2>/dev/null

# Mixed rihal: vs rihal- namespace (colons should be hyphens)
grep -rn "rihal:[a-z]" \
  $SCOPE_DIRS --include="*.md" --include="*.yaml" 2>/dev/null

# Agent directory names not matching their YAML name: field
for dir in rihal/skills/agents/*/; do
  agent=$(basename "$dir")
  skill_file="$dir/SKILL.md"
  [ -f "$skill_file" ] || continue
  yaml_name=$(grep -m1 "^name:" "$skill_file" | sed 's/name:\s*//')
  [ "$yaml_name" = "$agent" ] || \
    echo "$skill_file — dir '$agent' != YAML name '$yaml_name'"
done

# Variable naming drift in workflows (PHASE_NUM vs PHASE_NUMBER)
grep -rn "PHASE_NUM\b" rihal/workflows/*.md 2>/dev/null | grep -v "PHASE_NUMBER"
grep -rn "PLAN_FILE\b\|SPRINT_FILE\b" rihal/workflows/*.md 2>/dev/null
```

---

### Lens 15 — Coverage

Check for:

```bash
# Commands with no corresponding workflow file
for cmd_file in rihal/commands/*.md; do
  cmd=$(basename "$cmd_file" .md)
  # Extract @.rihal/workflows/ reference from command
  wf=$(grep -m1 "@\.rihal/workflows/" "$cmd_file" 2>/dev/null | sed 's/.*@\.rihal\/workflows\///' | sed 's/\s.*//')
  if [ -n "$wf" ]; then
    [ -f "rihal/workflows/$wf" ] || \
      echo "$cmd_file — references missing workflow: rihal/workflows/$wf"
  fi
done

# Skills in team.yaml that have no SKILL.md directory
if [ -f rihal/config/team.yaml ]; then
  grep "^  - id:" rihal/config/team.yaml | sed 's/.*id:\s*//' | \
    while read -r id; do
      [ -d "rihal/skills/agents/$id" ] || \
        echo "rihal/config/team.yaml — agent '$id' has no skill directory"
    done
fi

# Parity test completeness
PARITY=$(find . -name "parity*.sh" -o -name "parity*.cjs" 2>/dev/null | head -3)
if [ -n "$PARITY" ]; then
  COMMAND_COUNT=$(ls rihal/commands/*.md 2>/dev/null | wc -l)
  PARITY_LINES=$(wc -l < "$PARITY" 2>/dev/null || echo 0)
  echo "Coverage check: $COMMAND_COUNT commands vs $PARITY_LINES parity lines"
fi
```

---

## Step 5 — Compile findings per lens

For each lens that was run, print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lens {N}: {NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Findings: {count}

{file:line — description}
...

Status: PASS (0) | WARN ({n}) | FAIL ({n critical})
```

If `FINDINGS[lens]` is empty: print `✓ Lens {N} ({name}): no findings`.

## Step 6 — Output GitHub issue bodies

For each lens with findings ≥ 1, print a foldable issue template:

```markdown
---
### Issue: [lens-audit] Lens {N} ({name}) — {count} findings

**Labels:** `lens-audit`, `{lens-name}`

**Body:**
## Findings — Lens {N}: {name}

| File | Line | Description | Severity |
|------|------|-------------|----------|
{rows}

## Steps to reproduce
Run: `/rihal-audit lens {N}` on commit `{git rev-parse --short HEAD}`

## Suggested fix
{one-line suggestion per finding}
```

**Do not create the issues automatically.** Print the bodies to stdout only.
User runs `/rihal-audit fix` or files them manually via `gh issue create`.

## Step 7 — Summary banner

```
╔══════════════════════════════════════════════════════╗
║  LENS AUDIT COMPLETE                                 ║
╠══════════════════════════════════════════════════════╣
║  Lenses run:   {count}                               ║
║  Total findings: {total}                             ║
║  Critical:     {critical}                            ║
║  Warnings:     {warnings}                            ║
╚══════════════════════════════════════════════════════╝

Lenses with findings:
{  N. name — count findings (critical: X, warn: Y)}

Next: file the GH issues above, then run /rihal-audit fix to address them.
```

## Success Criteria

- [ ] Lens picker shown when no argument given
- [ ] `all` runs all 15 lenses sequentially without halting on empty results
- [ ] Each lens prints its own labelled block
- [ ] Findings include `file:line — description` format
- [ ] GH issue bodies printed to stdout (not auto-filed)
- [ ] Summary banner shows per-lens counts
- [ ] Workflow exits cleanly when a lens finds nothing (PASS, no error)

## On Error

- **rihal-tools not installed**: print `rihal-tools not found. Run: npx @hanzlaa/rcode install .` and STOP.
- **Lens N out of range**: print valid range (1-15) and STOP.
- **Karpathy dispatch fails** (Lens 11): note the failure, continue with remaining lenses.
- **Scope dirs not found**: skip silently, note `(no source files in scope)` for that lens.

## Next Up

```
File findings as GH issues:   gh issue create --title "[lens-audit] Lens N..." --body "..."
Auto-fix what's fixable:       /rihal-audit fix
Re-run a single lens:          /rihal-audit lens <N>
Full re-audit after fixes:     /rihal-audit lens all
View audit settings:           /rihal-settings show
```
