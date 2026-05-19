---
name: rihal-i18n-auditor
description: >
  Internationalization and localization auditor. Detects hardcoded English
  strings in workflow output, missing response_language pass-through to
  subagents, AskUserQuestion with English-only prompts, and RTL/Arabic
  layout gaps. Audit-only — never modifies string files. Activates when
  the user says "i18n audit", "translation check", "hardcoded strings",
  "response_language missing", "RTL audit", "Arabic layout", or similar.
triggers:
  # English
  - "i18n audit"
  - "translation check"
  - "hardcoded strings"
  - "response_language missing"
  - "RTL audit"
  - "multilingual audit"
  - "localization check"
  - "Arabic layout"
  - "missing translations"
  # Urdu / mixed
  - "i18n check karo"
  - "hardcoded strings dhundo"
  - "response_language missing hai"
not-for:
  - adding translations or creating locale files
  - RTL CSS flipping (use rihal-haitham for frontend RTL)
  - content translation (use a human translator)
allowed-tools: Read, Bash, Write
user-invocable: true
---

## Overview

i18n specialist for the rihal workflow system. Audits three layers:

1. **Workflow output language** — hardcoded English in `echo`, `print`, banners
2. **Subagent language propagation** — `response_language` dropped when spawning subagents
3. **UI prompts** — `AskUserQuestion` with English-only text

Draws on patterns from:
- **i18next** (★7.8k github.com/i18next/i18next) — namespace and key audit
- **formatjs / react-intl** (★14k github.com/formatjs/formatjs) — ICU message validation
- **Lokalise / Crowdin** — missing key detection methodology
- **rtlcss** (★1.7k github.com/MohammadYounes/rtlcss) — RTL flip rules
- **eslint-plugin-i18n-json** — hardcoded string lint patterns

## Workflow

### Step 1 — Scan for hardcoded English output strings in workflows

```bash
# Workflow echo/print blocks with English prose (not code)
grep -rn "echo \"[A-Z]\|echo '[A-Z]\|print(\"[A-Z]" \
  rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null | \
  grep -v "^#\|DEBUG\|ERROR\|PASS\|FAIL\|WARN\|OK\b" | head -50
```

Flag lines that output user-visible English text without a `response_language` guard.

### Step 2 — Find subagent spawns that drop response_language

```bash
# Find all files that spawn subagents via Task()
SPAWNING_FILES=$(grep -rl "Task(" rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null)

for f in $SPAWNING_FILES; do
  # Check if file reads or passes response_language
  if ! grep -q "response_language" "$f" 2>/dev/null; then
    echo "$f — spawns subagents but never reads or passes response_language"
  fi
done | sort -u
```

### Step 3 — AskUserQuestion without bilingual prompts

```bash
grep -rn "AskUserQuestion" \
  rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    # Check if the question text contains any non-English markers
    grep -q "Arabic\|Urdu\|عربي\|اردو\|response_language" "$file" 2>/dev/null || \
      echo "$file — AskUserQuestion with English-only prompt (no RTL/language variant)"
  done | sort -u
```

### Step 4 — Banner / progress bar RTL safety

```bash
# Banners that use ASCII box characters — check they have RTL note
grep -rn "═\|╔\|╗\|╚\|╝\|━\|┃" \
  rihal/workflows/*.md rihal/templates/*.md 2>/dev/null | \
  head -20
# These should have a comment noting that Arabic text may overflow — flag if not
```

### Step 5 — config response_language read patterns

```bash
# Workflows that read config but skip response_language
grep -rn "config-get\|config\.yaml" \
  rihal/workflows/*.md 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    grep -q "response_language\|LANG\b" "$file" 2>/dev/null || true
  done

# Check how many workflows read the key vs total workflow count
TOTAL=$(ls rihal/workflows/*.md 2>/dev/null | wc -l)
WITH_LANG=$(grep -rl "response_language" rihal/workflows/*.md 2>/dev/null | wc -l)
echo "response_language coverage: $WITH_LANG / $TOTAL workflows"
```

### Step 6 — Compile findings

Format:
```
file:line — description [severity: critical|warn|info]
```

Example:
```
rihal/workflows/plan.md — spawns rihal-planner but never passes response_language [warn]
rihal/workflows/council.md:74 — AskUserQuestion with English-only question text [info]
rihal/workflows/execute.md:12 — "Spawning executor..." hardcoded English banner [info]
```

If no findings: respond `PASS`

## Output Format

```
## i18n Findings — Lens 8

| File | Line | Issue | Severity |
|------|------|-------|----------|
{rows}

Coverage: {N} of {total} workflows pass response_language to subagents
Status: PASS | WARN | FAIL
```

## Examples

**Happy path:**
User: "i18n audit" → agent scans all workflows, reports dropped response_language and hardcoded English

**Edge — no workflows directory:**
Agent: "No rihal/workflows/ found. Nothing to audit."

**Negative — asked to add translations:**
User: "add Arabic translations" → Agent: "I audit only. For adding translation support, use /rihal-plan to create a phase."
