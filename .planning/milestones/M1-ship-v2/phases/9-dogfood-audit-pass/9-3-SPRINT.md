---
phase: 9
plan_number: 3
title: state path audit — find dual-path / orphan-state anti-patterns
wave: 1
depends_on: []
files_modified:
  - .planning/phases/9-dogfood-audit-pass/STATE-PATHS.md
autonomous: true
sequential: false
requirements: [phase-9-state-paths]
---

<objective>
#462's root cause was two state files (`.rihal/state.json` and `.planning/state.json`) being written/read by different commands. Audit every state-touching path in the codebase to find any other instances of the same anti-pattern.
</objective>

<must_haves>
- Single artifact: `.planning/phases/9-dogfood-audit-pass/STATE-PATHS.md`
- Documents every path containing `state.json` referenced anywhere in `rihal/`, `.claude/`, `.github/`, `cli/`
- Confirms there is exactly one canonical state file
- Issues filed for any divergence
</must_haves>

<task id="9.3.1">
<title>Enumerate all state.json references in code and config</title>
<read_first>
- (Discovery — grep across the repo)
</read_first>

<action>
Run:

```bash
grep -rEn "state\.json" rihal/ .claude/ .github/ cli/ docs/ 2>/dev/null | \
  grep -v "node_modules\|\.git/" | \
  sort -u
```

Categorize each result:
- **Canonical reads/writes** — uses `RIHAL_DIR + 'state.json'` (the right path)
- **Wrong-path reads/writes** — uses `PLANNING_DIR + 'state.json'` or any other location (#462 pattern)
- **Documentation references** — workflow .md or docs/ that mention state.json (these are usually fine, just verify they reference the right path)
- **gitignore / config** — `.gitignore`, `.claude/settings.json`, etc.

Write to STATE-PATHS.md:

```markdown
# State Path Audit

**Audit date:** 2026-04-29
**Pattern this catches:** #462 (cmdPhase wrote to PLANNING_DIR/state.json instead of RIHAL_DIR/state.json)

## Canonical path

`.rihal/state.json` — RIHAL_DIR-rooted, gitignored, used by `cmdState` and (post-#462) `cmdPhase`.

## All references found

### Canonical (uses RIHAL_DIR or .rihal/state.json) ({n})

| File | Line | Context |
|---|---|---|
| rihal/bin/rihal-tools.cjs | 634 | `const statePath = path.join(RIHAL_DIR, 'state.json');` |
| ... | | |

### Wrong-path (file /= canonical) ({n})

| File | Line | Path used | Issue |
|---|---|---|---|
| ... | | | #NNN |

### Documentation (mentions state.json descriptively) ({n})

| File | Line | Context |
|---|---|---|
| ... | | |

### Config / gitignore ({n})

| File | Line | Entry |
|---|---|---|
| .gitignore | N | `.rihal/state.json` |
| ... | | |
```

If zero wrong-path references: report says "All {N} state references resolve to the canonical RIHAL_DIR/state.json. #462 pattern fully closed."
</action>

<acceptance_criteria>
- File `.planning/phases/9-dogfood-audit-pass/STATE-PATHS.md` exists
- Contains the four sections (Canonical / Wrong-path / Documentation / Config)
- Wrong-path table either has rows with issue links OR explicitly empty with "Clean" footer
</acceptance_criteria>
</task>

<task id="9.3.2">
<title>File issues for any wrong-path references</title>
<read_first>
- .planning/phases/9-dogfood-audit-pass/STATE-PATHS.md (after 9.3.1)
</read_first>

<action>
For each row in the "Wrong-path" table:

```bash
gh issue create --title "fix(<scope>): <file> references wrong state path" --body "..."
```

Body: file:line, path used, expected canonical path, suggested fix.

Update STATE-PATHS.md with issue numbers.

If the wrong-path table is empty after 9.3.1, this task simply confirms: state-path audit clean, no follow-up issues needed. Add a `**Status: Clean**` line at the top of STATE-PATHS.md.
</action>

<acceptance_criteria>
- Every Wrong-path row populated with `#NNN`, OR top-of-file states `**Status: Clean**`
- Report-truthful: cannot claim Clean if Wrong-path has rows
</acceptance_criteria>
</task>
