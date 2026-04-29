#!/usr/bin/env bash
# Dogfood smoke checks — runs against rihal-code itself.
# Phase 9 plan 9.4 (#463). Fails on regression of:
#   - #455 (sync silent no-op on heading-style ROADMAP)
#   - #460 (phase add CLI missing)
#   - #462 (phase add wrote to wrong state file)
#   - #464 (roadmap parser only handled pipe-table format)
#   - #465 (workflows reference non-existent CLI subcommands)
#
# Designed to run in <30 seconds — no agent spawning, no network calls
# beyond what GitHub Actions provides.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

CLI="node rihal/bin/rihal-tools.cjs"
FAIL=0
fail() { echo "  ✗ FAIL: $1"; FAIL=1; }
pass() { echo "  ✓ pass: $1"; }

echo "Dogfood checks — rihal-code"
echo

# Check 1 — orphan .planning/state.json must not exist (#462)
if [ -f .planning/state.json ]; then
  fail "orphan .planning/state.json exists (#462 regression)"
else
  pass "no orphan state.json (#462)"
fi

# Check 2 — phase add subcommand exists (#460)
if $CLI help 2>&1 | grep -qE "^\s*phase add"; then
  pass "phase add subcommand registered (#460)"
else
  fail "phase add missing from help (#460 regression)"
fi

# Check 3 — state sync handles heading-style ROADMAP (#455)
SYNC_OUT=$($CLI state sync --from-disk 2>&1)
if echo "$SYNC_OUT" | grep -q '"phases_found": [1-9]'; then
  pass "state sync parses heading-style ROADMAP (#455)"
else
  fail "state sync returned phases_found: 0 — possible #455 regression"
  echo "$SYNC_OUT" | head -10
fi

if echo "$SYNC_OUT" | grep -q '"warnings"'; then
  fail "state sync returned warnings — investigate"
  echo "$SYNC_OUT"
else
  pass "state sync warnings: none"
fi

# Check 4 — roadmap list-phases / get-phase parse heading-style (#464)
LIST_OUT=$($CLI roadmap list-phases 2>&1)
if echo "$LIST_OUT" | grep -q '"number"'; then
  pass "roadmap list-phases returns entries (#464 regex part)"
else
  fail "roadmap list-phases returned [] — #464 regression"
fi

GET_OUT=$($CLI roadmap get-phase 6 2>&1)
if echo "$GET_OUT" | grep -q '"found": true'; then
  pass "roadmap get-phase finds heading-style phase (#464 regex part)"
else
  fail "roadmap get-phase returned found:false — #464 regression"
fi

# Check 5 — workflow ↔ CLI ref sweep (#465 regression detector)
# Extract every node rihal-tools.cjs <subcmd> reference and verify each top-level
# subcommand appears in help. (Subcommand args like 'state add-decision' are
# verified by their first token only — looser check, but catches #460-class breakage.)
HELP=$($CLI help 2>&1)
WORKFLOW_REFS=$(grep -rEoh 'node\s+["\.][^"]*rihal-tools\.cjs["\.]?\s+[a-z][a-zA-Z0-9-]+' rihal/workflows/ 2>/dev/null | \
  sed -E 's|^node\s+["\.][^"]*rihal-tools\.cjs["\.]?\s+||' | \
  sort -u)
DRIFT_COUNT=0
for ref in $WORKFLOW_REFS; do
  # Skip empty or pure-comment matches
  [ -z "$ref" ] && continue
  if ! echo "$HELP" | grep -qE "^\s*${ref}\b" && ! grep -qE "case '${ref}'" rihal/bin/rihal-tools.cjs 2>/dev/null; then
    # This is one of the known-missing subcommands from #465. Don't fail the
    # gate on those — they're already filed and tracked. But fail on NEW drift.
    case "$ref" in
      audit-uat|check-implementation-readiness|classify-tech|commit-to-subrepo|context|find-phase|frontmatter|generate-claude-md|learnings|phase-plan-index|phases|requirements|todo|uat)
        # Known-tracked drift (#465). Don't count.
        # NOTE: 'commit' was implemented in Phase 10 / #466 — removed from
        # this allowlist so any future regression of cmdCommit fails the gate.
        ;;
      *)
        DRIFT_COUNT=$((DRIFT_COUNT + 1))
        echo "    NEW DRIFT: workflow references CLI subcommand '$ref' which is missing"
        ;;
    esac
  fi
done

if [ "$DRIFT_COUNT" -gt 0 ]; then
  fail "$DRIFT_COUNT new workflow ↔ CLI drift(s) — file follow-up issue"
else
  pass "no new workflow ↔ CLI drift beyond known #465"
fi

# Check 6 — phase-status alignment (#461 / Phase 8 plan 8.3)
# Compares ROADMAP claim against shipping signals. Fails on MAJOR drift only
# (the kind that lies — Status: Complete with no SUMMARY and no commits on
# phase scope, or Status: Planned with all acceptance items shipped). TRIVIAL
# drift (missing ✅) and PARTIAL drift (N of M items shipped) just warn.
PHASE_STATUS_MAJOR=0
if [ -f .rihal/state.json ]; then
  PHASES=$($CLI roadmap list-phases 2>&1)
  if echo "$PHASES" | grep -q '"number"'; then
    # For each phase, check the obvious major-drift signals
    while IFS= read -r line; do
      num=$(echo "$line" | grep -oE '"number": "[^"]+"' | head -1 | cut -d'"' -f4)
      [ -z "$num" ] && continue
      # Find phase dir
      dir=$(ls -d .planning/phases/${num}-* 2>/dev/null | head -1)
      [ -z "$dir" ] && continue
      # Read status from ROADMAP
      status=$(grep -A 2 "^## Phase ${num}\b" .planning/ROADMAP.md | grep -oE "\*\*Status:\*\* [^(]+" | head -1 | sed 's/\*\*Status:\*\* //;s/[[:space:]]*$//')
      summary_present=$(ls "$dir"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
      sprint_present=$(ls "$dir"/*-SPRINT.md 2>/dev/null | wc -l | tr -d ' ')
      # Major drift: Status says Complete but no SUMMARY AND no SPRINT (truly nothing shipped)
      if [ "$status" = "Complete" ] && [ "$summary_present" = "0" ] && [ "$sprint_present" = "0" ]; then
        # Allow legacy phases (01-05) — they shipped before SUMMARY convention existed
        if [ "$num" -gt "5" ] 2>/dev/null; then
          PHASE_STATUS_MAJOR=$((PHASE_STATUS_MAJOR + 1))
          echo "    MAJOR drift: phase $num — Status: Complete but no SUMMARY/SPRINT artifacts"
        fi
      fi
    done <<< "$(echo "$PHASES" | grep '"number"')"
  fi
fi

if [ "$PHASE_STATUS_MAJOR" -gt 0 ]; then
  fail "$PHASE_STATUS_MAJOR phase(s) with major status drift (#461)"
else
  pass "phase-status alignment: ROADMAP claim matches shipping signals (#461)"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "✓ Dogfood checks passed"
  exit 0
else
  echo "✗ Dogfood checks failed — see output above"
  exit 1
fi
