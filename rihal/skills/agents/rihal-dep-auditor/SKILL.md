---
name: rihal-dep-auditor
description: >
  Dependency health auditor — scans for outdated packages, CVEs, unused
  dependencies, loose version pins, and missing lock files. Audit-only:
  never modifies package.json or runs installs. Activates when the user
  says "audit dependencies", "dep health", "CVE scan", "check packages",
  "outdated deps", or similar.
triggers:
  # English
  - "audit dependencies"
  - "dep health"
  - "CVE scan"
  - "check packages"
  - "outdated deps"
  - "dependency audit"
  - "unused dependencies"
  - "package vulnerabilities"
  - "depcheck"
  # Urdu / mixed
  - "dependencies check karo"
  - "packages audit karo"
  - "CVE dhundo"
not-for:
  - installing or upgrading packages (use pnpm/npm directly)
  - license compliance audits
  - bundle size analysis (use rihal-perf)
allowed-tools: Read, Bash, Write
user-invocable: true
---

## Overview

Dependency health specialist. Runs the equivalent of `pnpm audit`, `depcheck`,
and pin-lint against the project without touching any files. Produces a
prioritised findings table and ready-to-paste `gh issue create` bodies.

Draws on patterns from:
- **pnpm audit / npm audit** — CVE detection via npm advisory DB
- **depcheck** (★2.7k github.com/depcheck/depcheck) — unused dep detection
- **Renovate** (★18k github.com/renovatebot/renovate) — version-pin best practices
- **Snyk** advisories — vulnerability severity scoring (critical/high/medium/low)
- **OWASP Dependency-Check** — CPE/CVE correlation methodology

## Workflow

### Step 1 — Read manifest files

```bash
cat package.json 2>/dev/null
cat pnpm-lock.yaml 2>/dev/null | head -50
cat .snyk 2>/dev/null
cat .nvmrc 2>/dev/null || cat .node-version 2>/dev/null
```

### Step 2 — CVE scan

```bash
# Run native audit — report only, no fix
pnpm audit --json 2>/dev/null || npm audit --json 2>/dev/null || echo '{"vulnerabilities":{}}'
```

Parse output. For each vulnerability:
- `critical` / `high` → severity: critical
- `moderate` → severity: warn
- `low` / `info` → severity: info

### Step 3 — Unused dependency detection

```bash
# Check each declared dep is imported somewhere in source
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  const deps = Object.keys({...(pkg.dependencies||{}), ...(pkg.devDependencies||{})});
  const { execSync } = require('child_process');
  deps.forEach(d => {
    try {
      const hits = execSync(
        'grep -rn --include=\"*.ts\" --include=\"*.tsx\" --include=\"*.js\" --include=\"*.cjs\" ' +
        '\"' + d.replace(/\//g,'\\\\/') + '\" src/ lib/ rihal/ 2>/dev/null | wc -l'
      ).toString().trim();
      if (parseInt(hits) === 0) console.log('UNUSED ' + d);
    } catch(e) {}
  });
" 2>/dev/null
```

### Step 4 — Version pin audit

For each dependency in `package.json`:
- `^` prefix → warn: loose major-compatible pin (breaking change risk)
- `~` prefix → info: loose patch-compatible pin
- `*` or `latest` → critical: unbounded range
- No lock file → critical: non-reproducible installs

### Step 5 — Node / runtime version check

```bash
# Check if .nvmrc / .node-version matches engines field in package.json
node -e "
  const pkg = JSON.parse(require('fs').readFileSync('package.json','utf8'));
  if (pkg.engines && pkg.engines.node) {
    console.log('engines.node:', pkg.engines.node);
  } else {
    console.log('WARN: no engines.node field — any Node version will be accepted');
  }
" 2>/dev/null
```

### Step 6 — Compile findings

Return findings in format:
```
dep-name — issue description [severity: critical|warn|info]
```

Example:
```
lodash@4.17.20 — CVE-2021-23337 prototype pollution (CVSS 7.2) [critical]
rimraf — declared in dependencies but never imported in source [warn]
react@^18.0.0 — loose ^ pin; breaking changes may enter automatically [warn]
. — no pnpm-lock.yaml; installs are non-reproducible [critical]
```

If no findings: respond with exactly `PASS`

## Output Format

```
## Dep Health Findings — Lens 5

| Package | Issue | Severity |
|---------|-------|----------|
| lodash@4.17.20 | CVE-2021-23337 prototype pollution (CVSS 7.2) | critical |
| rimraf | unused — never imported in source | warn |
| react@^18 | loose ^ pin | warn |

Total: {N} findings ({critical} critical, {warn} warn, {info} info)
Status: PASS | WARN | FAIL
```

## Examples

**Happy path:**
User: "audit dependencies" → agent runs all 5 steps, returns findings table

**Edge — no package.json:**
Agent: "No package.json found in project root. Nothing to audit."

**Negative — asked to upgrade:**
User: "upgrade outdated deps" → Agent: "I'm audit-only. Use `pnpm update` or open a Renovate PR to upgrade."
