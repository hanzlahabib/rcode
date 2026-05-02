---
name: rihal-observability-auditor
description: >
  Observability and silent-failure auditor. Detects unguarded rihal-tools
  shell calls, Task() results that are never checked, bare 2>/dev/null
  without fallback echo, INIT calls without .ok checks, and unstructured
  console.log in production code. Audit-only — never adds instrumentation.
  Activates when the user says "observability audit", "silent failures",
  "unguarded calls", "missing error handling", "tool call guard", or similar.
triggers:
  # English
  - "observability audit"
  - "silent failures"
  - "unguarded calls"
  - "missing error handling"
  - "tool call guard"
  - "swallowed errors"
  - "unchecked results"
  - "2>/dev/null check"
  - "INIT ok check"
  - "Task result not checked"
  # Urdu / mixed
  - "observability check karo"
  - "silent failures dhundo"
  - "unguarded calls dhundo"
not-for:
  - adding observability instrumentation (use OpenTelemetry directly)
  - performance monitoring (use rihal-perf)
  - log aggregation setup (use rihal-khalid)
allowed-tools: Read, Bash, Write
---

## Overview

Observability specialist for the rihal workflow system. Identifies the "dark
corners" where failures are swallowed silently — the most dangerous class of
bugs in orchestrated multi-agent workflows.

Draws on patterns from:
- **OpenTelemetry** (CNCF, opentelemetry.io) — traces/metrics/logs standards
- **Pino** (★13k github.com/pinojs/pino) — structured JSON logging, level guards
- **Winston** (★22k github.com/winstonjs/winston) — multi-transport logging patterns
- **node:assert** — assertion-based guard patterns
- **Bash errexit/pipefail** (`set -euo pipefail`) — shell error propagation

## Workflow

### Step 1 — Unguarded rihal-tools calls in workflows

```bash
# rihal-tools calls without 2>/dev/null or error handling
grep -rn "rihal-tools\.cjs\b\|node.*rihal-tools" \
  rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null | \
  grep -v "2>/dev/null\||| echo\||| true\|^#\|example"

# Shell calls using $() without error guards
grep -rn "\$(\(node\|bash\|sh\)\b" \
  rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null | \
  grep -v "2>/dev/null\||| echo\|try\b"
```

### Step 2 — Task() results not captured or checked

```bash
# Task() calls where result is not stored or checked
grep -rn "Task(" \
  rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    lineno=$(echo "$line" | cut -d: -f2)
    # Check within 6 lines after Task() for result capture
    result=$(sed -n "$lineno,$((lineno+6))p" "$file" 2>/dev/null)
    if ! echo "$result" | grep -qE "result|output|ok|error|fail|FINDINGS|RESULT"; then
      echo "$file:$lineno — Task() result not captured [warn]"
    fi
  done
```

### Step 3 — Bare 2>/dev/null without fallback

```bash
# 2>/dev/null at end of line with no || fallback
grep -rn "2>/dev/null$" \
  rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null | \
  grep -v "|| echo\||| true\||| exit\||| :\b"
```

### Step 4 — INIT calls without .ok guard

```bash
# INIT= assignments followed by no .ok check in next 15 lines
grep -rn "INIT=\$(" \
  rihal/workflows/*.md .rihal/workflows/*.md 2>/dev/null | \
  while read -r line; do
    file="${line%%:*}"
    lineno=$(echo "$line" | cut -d: -f2)
    window=$(sed -n "$lineno,$((lineno+15))p" "$file" 2>/dev/null)
    if ! echo "$window" | grep -qE "\.ok|ok.*false|INIT.*ok"; then
      echo "$file:$lineno — INIT= assigned but no .ok check in next 15 lines [warn]"
    fi
  done
```

### Step 5 — console.log in production Node code

```bash
# console.log/error/warn/debug in non-test production code
for f in $(find rihal/bin/ .rihal/bin/ -name "*.cjs" -o -name "*.js" 2>/dev/null); do
  [[ "$f" == *.test.* ]] || [[ "$f" == *.spec.* ]] && continue
  grep -n "console\.\(log\|error\|warn\|debug\)" "$f" 2>/dev/null | \
    while read -r line; do
      echo "$f:${line%%:*} — unstructured console.log in production code [info]"
    done
done
```

### Step 6 — set -e / set -euo pipefail missing in shell scripts

```bash
find rihal/ .rihal/ -name "*.sh" -maxdepth 8 2>/dev/null | \
  while read -r f; do
    if ! grep -q "set -e\|set -euo pipefail\|set -o errexit" "$f" 2>/dev/null; then
      echo "$f — no set -e or set -euo pipefail (errors silently ignored) [warn]"
    fi
  done
```

### Step 7 — Compile findings

Format: `file:line — description [severity: critical|warn|info]`

If no findings: respond `PASS`

## Output Format

```
## Observability Findings — Lens 13

| File | Line | Issue | Severity |
|------|------|-------|----------|
{rows}

Silent failure risk: {critical} critical, {warn} warnings, {info} info
Status: PASS | WARN | FAIL
```

## Examples

**Happy path:**
User: "observability audit" → scans all workflows and bin files for unguarded calls

**Edge — rihal not installed:**
Agent: "rihal/workflows/ not found. Checking .rihal/ instead."

**Negative — asked to add logging:**
User: "add OpenTelemetry traces" → Agent: "Audit-only. The findings above show where instrumentation is missing — open a fix issue to add it."
