# Workflow: rihal-scaffold-skill

<purpose>
Create a new compliant SKILL.md file for a Rihal role in one command. Eliminates the friction of finding a folder, reading an existing skill, copying it, renaming, and chasing the 5-component compliance check.

Output: a SKILL.md that already passes `test/compliance.test.cjs` and is ready to be filled in.
</purpose>

## Step 0 — Parse Arguments

Expected forms:

```
/rihal-scaffold-skill --role <role> --name <skill-name>
/rihal-scaffold-skill --role pm --name sharper-prd-discovery
/rihal-scaffold-skill --help
```

Required: `--role` (one of: `pm`, `qa`, `architect`, `frontend`, `backend`, `marketing`, `designer`, `writer`, `engineer`, `ml`, `branding`, `eng-manager`, `analyst`, `director`, `scout`).

Required: `--name` — kebab-case identifier. Validate it matches `^[a-z][a-z0-9-]+$`.

Optional: `--dry-run` — print the file content to stdout instead of writing.

If `$ARGUMENTS` is `--help` or empty, print usage and STOP.

## Step 1 — Resolve target path

Map `--role` to a directory under `rihal/skills/actions/`. Group by role family:

| Role flag | Target directory |
|-----------|------------------|
| `pm` | `rihal/skills/actions/1-discovery/rihal-<name>/` |
| `architect` | `rihal/skills/actions/2-planning/rihal-<name>/` |
| `engineer`, `frontend`, `backend`, `ml` | `rihal/skills/actions/4-implementation/rihal-<name>/` |
| `qa` | `rihal/skills/actions/5-verification/rihal-<name>/` |
| `designer`, `branding` | `rihal/skills/actions/3-design/rihal-<name>/` |
| `marketing`, `writer`, `eng-manager`, `analyst`, `director`, `scout` | `rihal/skills/actions/6-other/rihal-<name>/` |

If the directory already exists, abort with: `Skill rihal-<name> already exists at <path>. Pick a different --name or delete the existing directory first.`

## Step 2 — Write the template

Write `rihal/skills/actions/<group>/rihal-<name>/SKILL.md` with this content (substitute `<NAME>`, `<ROLE>`, `<DESCRIPTION_FILLER>`):

```yaml
---
name: rihal-<NAME>
description: >
  <One-line summary of what this skill does. Activates when the user says
  "<trigger phrase>", "<another phrase>". Do NOT use for: <negative
  boundaries>.>
triggers:
  - "<trigger phrase 1>"
  - "<trigger phrase 2>"
  - "<trigger phrase 3>"
  - "<trigger phrase 4>"
  - "<trigger phrase 5>"
---

# <NAME> — <ROLE>

## Overview

<2-3 sentences explaining what the skill does and when it's invoked. What
real-world problem does it solve? What does the user get back when they
invoke it?>

## Workflow

<Step-by-step instructions the model follows. Use numbered steps. Each step
should be specific enough that two different models converge to similar
output. Reference rihal-tools subcommands where state changes are needed.>

1. <First step>
2. <Second step>
3. <Third step>

## Output Format

<Exact shape of the output. If markdown, include the headers. If JSON, the
schema. The compliance check expects this section verbatim — keep the
heading text as "## Output Format".>

## Examples

### Happy path

<Input → output example showing the skill at its best>

### Edge case

<Input → output for a tricky variant (missing data, ambiguous request, etc.)>

### Negative

<Input that should NOT trigger this skill — show the redirect>
```

## Step 3 — Verify compliance

Run the 5-component check on the new file:

```bash
F="rihal/skills/actions/<group>/rihal-<name>/SKILL.md"
fails=""
grep -q "^triggers:" "$F" || fails="$fails triggers-frontmatter"
grep -q "^## Overview"      "$F" || fails="$fails overview"
grep -q "^## Workflow"      "$F" || fails="$fails workflow"
grep -q "^## Output Format" "$F" || fails="$fails output-format"
grep -q "^## Examples"      "$F" || fails="$fails examples"

if [ -n "$fails" ]; then
  echo "✖ Scaffolded skill missing components:$fails"
  echo "  This is a bug in the scaffolder template — file an issue."
  exit 1
fi
```

## Step 4 — Confirm and Next Up

Print:

```
✓ Skill scaffolded: rihal-<NAME>
  Location: rihal/skills/actions/<group>/rihal-<NAME>/SKILL.md

  All 5 required components are present (triggers, Overview, Workflow,
  Output Format, Examples). The placeholders need real content before
  the skill becomes useful.

▶ Next Up
  $EDITOR rihal/skills/actions/<group>/rihal-<NAME>/SKILL.md
                                                  # fill in placeholders
  npx @hanzlaa/rcode install --force              # install to .claude/skills/
  node --test test/compliance.test.cjs            # verify compliance
```
