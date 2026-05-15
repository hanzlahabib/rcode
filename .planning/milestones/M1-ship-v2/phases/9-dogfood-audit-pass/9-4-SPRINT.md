---
phase: 9
plan_number: 4
title: CI dogfood gate — fail-on-regression check on push
wave: 2
depends_on: [9.1, 9.2, 9.3]
files_modified:
  - .github/workflows/dogfood.yml
  - package.json
autonomous: true
sequential: false
requirements: [phase-9-ci]
---

<objective>
Make sure the gaps closed in plans 9.1–9.3 stay closed. Add a lightweight CI gate (and matching local script) that runs the dogfood smoke checks on every push to main. Anything that would re-surface #455 / #460 / #462 fails the gate.
</objective>

<must_haves>
- New file `.github/workflows/dogfood.yml` runs on push to main and on PR
- New `package.json` script entry: `"dogfood": "..."` for local invocation
- Gate runs in <30s — no agent spawning, no network beyond GitHub Actions setup
- Fails if: any CLI subcommand returns "Unknown subcommand", any orphan state file appears, any workflow grep finds an unresolved CLI ref, `state sync --from-disk` returns warnings
</must_haves>

<task id="9.4.1">
<title>Write the dogfood smoke-test script</title>
<read_first>
- package.json (current scripts section)
- .github/workflows/ (existing CI structure for style consistency)
- .planning/phases/9-dogfood-audit-pass/DRIFT-SWEEP.md (Plan 9.2 output — extract canonical CLI invocations)
</read_first>

<action>
Create `scripts/dogfood-check.sh` (or add an inline script in package.json — pick whichever matches existing repo conventions).

Script must run these checks, all of which must pass:

```bash
set -e

# Check 1 — every advertised CLI subcommand exists
node rihal/bin/rihal-tools.cjs help > /tmp/help.txt
for cmd in "init phase-op" "state sync --from-disk" "phase add Test_Phase_Throwaway" "roadmap list-phases"; do
  # Smoke each (some are dry-runnable, others need teardown)
  echo "Smoking: $cmd"
done

# Check 2 — orphan state file detector
if [ -f .planning/state.json ]; then
  echo "ORPHAN: .planning/state.json must not exist (closed in #462)"
  exit 1
fi

# Check 3 — workflow ↔ CLI ref sweep (re-runs Plan 9.2 logic)
UNKNOWN=$(node rihal/bin/rihal-tools.cjs help)
WORKFLOW_REFS=$(grep -rEoh 'rihal-tools\.cjs[[:space:]]+[a-z][a-z0-9-]+' rihal/workflows/ | awk '{print $2}' | sort -u)
for ref in $WORKFLOW_REFS; do
  if ! echo "$UNKNOWN" | grep -q "^[[:space:]]*$ref"; then
    echo "DRIFT: workflow references CLI subcommand '$ref' which is not in help output"
    exit 1
  fi
done

# Check 4 — sync warnings
SYNC_OUT=$(node rihal/bin/rihal-tools.cjs state sync --from-disk 2>&1)
if echo "$SYNC_OUT" | grep -q '"warnings"'; then
  echo "DRIFT: sync returned warnings"
  echo "$SYNC_OUT"
  exit 1
fi

echo "✓ Dogfood checks passed"
```

Add to `package.json`:
```json
"scripts": {
  "dogfood": "bash scripts/dogfood-check.sh"
}
```
</action>

<acceptance_criteria>
- File `scripts/dogfood-check.sh` exists and is executable (chmod +x)
- File runs end-to-end on the current repo and exits 0
- `package.json` contains literal `"dogfood":` script entry
- Running `pnpm dogfood` (or `npm run dogfood`) produces "✓ Dogfood checks passed"
</acceptance_criteria>
</task>

<task id="9.4.2">
<title>Add GitHub Action that runs dogfood on push</title>
<read_first>
- .github/workflows/ (existing actions for triggers + setup-node version)
- scripts/dogfood-check.sh (from 9.4.1)
</read_first>

<action>
Create `.github/workflows/dogfood.yml`:

```yaml
name: Dogfood

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  dogfood:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run dogfood smoke checks
        run: pnpm dogfood || npm run dogfood
```

Match indentation, action versions, and Node version with whatever other workflows in the repo already use. If pnpm isn't pre-installed in the action, prefer `corepack enable && corepack prepare pnpm@latest --activate` or fall back to `npm run`.
</action>

<acceptance_criteria>
- File `.github/workflows/dogfood.yml` exists
- Triggers on push to main + on PR
- Has timeout-minutes set (≤5)
- Calls the `dogfood` script from package.json
- File parses as valid YAML (no syntax errors)
</acceptance_criteria>
</task>
