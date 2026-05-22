---
name: rcode-cross-platform-auditor
description: >
  Cross-platform portability auditor. Detects bash-isms, macOS-only flags
  (BSD sed/awk), hardcoded absolute Unix paths in Node code, Windows path
  separators, and CRLF line endings. Audit-only — never modifies scripts.
  Activates when the user says "cross-platform audit", "bash-isms",
  "macOS only", "Windows compatibility", "portability check", or similar.
triggers:
  # English
  - "cross-platform audit"
  - "bash-isms"
  - "macOS only"
  - "Windows compatibility"
  - "portability check"
  - "POSIX compliance"
  - "sed -i bug"
  - "bash array"
  - "hardcoded path"
  - "CRLF"
  # Urdu / mixed
  - "cross-platform check karo"
  - "portability audit karo"
not-for:
  - fixing compatibility issues (audit-only)
  - Docker / container portability (use rcode-khalid for infra)
  - browser compatibility (use rcode-haitham)
allowed-tools: Read, Bash, Write
user-invocable: true
---

## Overview

Portability specialist for shell scripts, Node.js code, and workflow markdown.
Focuses on the macOS/Linux/Windows triangle and POSIX vs bashism divergence.

Draws on:
- **ShellCheck** (★36k github.com/koalaman/shellcheck) — POSIX/bash lint rules
- **cross-env** (★6.2k github.com/kentcdodds/cross-env) — cross-platform env var patterns
- **shx** (★1.6k github.com/shelljs/shx) — portable npm script commands
- **is-wsl** (github.com/sindresorhus/is-wsl) — WSL detection patterns
- GNU vs BSD coreutils divergence reference (man pages differ on macOS/Linux)

## Workflow

### Step 1 — BSD/GNU divergence (macOS-specific flags)

```bash
# sed -i '' (BSD) vs sed -i (GNU) — fails on opposite platform
grep -rn "sed -i ''" \
  rcode/ .rcode/ --include="*.md" --include="*.sh" --include="*.cjs" 2>/dev/null

# macOS GNU-prefixed wrappers (greadlink, gsed, gfind, gawk)
grep -rn "greadlink\|gsed\|gfind\|gawk\|gdate\|gstat" \
  rcode/ .rcode/ 2>/dev/null | grep -v "^#"

# BSD stat vs GNU stat (-f vs --format)
grep -rn "stat -f\b\|stat --format\b" \
  rcode/ .rcode/ 2>/dev/null
```

### Step 2 — Bash-isms in sh scripts

```bash
# [[ ]] conditional — bash only, not sh
grep -rn "\[\[\ \|\[\[!" \
  rcode/ .rcode/ --include="*.sh" 2>/dev/null

# Bash arrays in sh context
grep -rn "declare -a\|local -a\|read -a\|mapfile\|readarray" \
  rcode/ .rcode/ --include="*.sh" 2>/dev/null

# Process substitution <() — bash only
grep -rn "<(" \
  rcode/ .rcode/ --include="*.sh" 2>/dev/null

# $'...' ANSI-C quoting — not in POSIX sh
grep -rn "\$'\\\\[ntr" \
  rcode/ .rcode/ --include="*.sh" --include="*.md" 2>/dev/null

# Check shebang vs usage
find rcode/ .rcode/ -name "*.sh" 2>/dev/null | while read -r f; do
  shebang=$(head -1 "$f")
  if echo "$shebang" | grep -q "#!/bin/sh" && \
     grep -q "\[\[\ \|declare -a\|mapfile" "$f" 2>/dev/null; then
    echo "$f — #!/bin/sh shebang but uses bash-only syntax"
  fi
done
```

### Step 3 — Hardcoded absolute paths in Node.js/JS

```bash
# Absolute Unix paths in JS/TS source
grep -rn "'/home/\|'/usr/\|'/etc/\|'/var/\|'/tmp/" \
  rcode/ .rcode/ --include="*.cjs" --include="*.js" --include="*.ts" 2>/dev/null | \
  grep -v "# example\|PLACEHOLDER\|os\.homedir\|os\.tmpdir"

# Windows path separators used on Unix path logic
grep -rn 'path\.join.*"\\\\\\\\"' \
  rcode/ .rcode/ --include="*.cjs" --include="*.js" 2>/dev/null

# __dirname vs import.meta.url (CJS vs ESM compat)
grep -rn "__dirname\|__filename" \
  rcode/ .rcode/ --include="*.ts" --include="*.mjs" 2>/dev/null
```

### Step 4 — CRLF line endings

```bash
# Find files with Windows-style line endings
find rcode/ .rcode/ \( -name "*.md" -o -name "*.yaml" -o -name "*.sh" \) \
  -maxdepth 8 2>/dev/null | \
  xargs grep -lP "\r$" 2>/dev/null | \
  while read -r f; do echo "$f — CRLF line endings [warn]"; done
```

### Step 5 — npm scripts cross-platform check

```bash
if [ -f package.json ]; then
  # Check scripts that use Unix-only syntax
  node -e "
    const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8'));
    const scripts = pkg.scripts || {};
    Object.entries(scripts).forEach(([name, cmd]) => {
      if (/&&|\|\||\bsed\b|\brm -rf\b|\bcp -r\b/.test(cmd)) {
        console.log('package.json scripts.' + name + ': ' + cmd.slice(0,60));
      }
    });
  " 2>/dev/null
fi
```

### Step 6 — Compile findings

Format: `file:line — description [severity: critical|warn|info]`

If no findings: respond `PASS`

## Output Format

```
## Cross-platform Findings — Lens 10

| File | Line | Issue | Severity |
|------|------|-------|----------|
{rows}

Platform gaps: macOS={N} / Windows={N} / POSIX={N}
Status: PASS | WARN | FAIL
```

## Examples

**Happy path:**
User: "cross-platform audit" → scans for BSD flags, bash-isms, hardcoded paths

**Edge — no shell scripts:**
Agent: "No .sh files found. Checking only inline bash in workflow .md files and Node source."

**Negative — asked to fix:**
User: "replace sed -i with cross-platform version" → Agent: "Audit-only. Open a fix issue from the findings above."
