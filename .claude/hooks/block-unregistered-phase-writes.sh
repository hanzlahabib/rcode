#!/usr/bin/env bash
# .claude/hooks/block-unregistered-phase-writes.sh — PreToolUse on Write/Edit.
#
# Closes #475 — LLMs bypass /rcode-add-phase + /rcode-plan and write
# .planning/phases/<NN>-*/SPRINT.md (or similar) directly. Result: phase
# is invisible to /rcode-status, /rcode-execute, /rcode-progress because
# it was never registered in .rcode/state.json or ROADMAP.md.
#
# This hook intercepts Write/Edit on files under .planning/phases/<NN>-*/
# and refuses if <NN> is not registered. Operator can opt out with a
# `<!-- rcode-bypass: <reason> -->` comment in the new content (for
# retroactive documentation of unregistered phases that already shipped).
#
# Receives the tool's JSON payload on stdin. Extracts file_path + content.
# Exit 0 = allow, exit 2 = block (PreToolUse convention).

set -e

input="$(cat)"

# Extract file_path. Tolerant grep — works for both Write and Edit shapes.
file_path="$(printf '%s' "$input" \
  | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"

# Only fire on .planning/phases/<NN>-*/SPRINT.md / SCOPE.md / PLAN.md / CONTEXT.md.
# Match via regex on resolved path (any prefix path before .planning/).
case "$file_path" in
  */.planning/phases/*-*/*-*-SPRINT.md|*/.planning/phases/*-*/*-*-PLAN.md|*/.planning/phases/*-*/*-CONTEXT.md|*/.planning/phases/*-*/*-RESEARCH.md|*/.planning/phases/*-*/SCOPE.md|*/.planning/phases/*-*/SPRINT.md|*/.planning/phases/*-*/PLAN.md|*/.planning/phases/*-*/CONTEXT.md|*/.planning/phases/*-*/RESEARCH.md)
    : # match — keep going
    ;;
  *)
    exit 0 # not a phase artifact — allow
    ;;
esac

# Find PROJECT_ROOT by walking up from file_path until we hit .rcode/.
dir="$(dirname "$file_path")"
project_root=""
while [ "$dir" != "/" ] && [ "$dir" != "." ]; do
  if [ -d "$dir/.rcode" ]; then project_root="$dir"; break; fi
  dir="$(dirname "$dir")"
done
[ -z "$project_root" ] && exit 0  # no rcode install — out of scope

state_path="$project_root/.rcode/state.json"
roadmap_path="$project_root/.planning/ROADMAP.md"

# Extract phase number from path: .planning/phases/NN-slug/...
phase_num="$(printf '%s' "$file_path" \
  | grep -oE '\.planning/phases/[0-9]+(\.[0-9]+)?-' \
  | head -1 \
  | grep -oE '[0-9]+(\.[0-9]+)?')"
[ -z "$phase_num" ] && exit 0  # weird path — not our concern

# Bypass marker: if Write content contains `<!-- rcode-bypass:` allow.
content="$(printf '%s' "$input" \
  | grep -oE '"(content|new_string)"[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"' \
  | head -1)"
if printf '%s' "$content" | grep -q 'rcode-bypass:'; then
  echo "[block-unregistered-phase] bypass marker detected — allowing write to $file_path" >&2
  exit 0
fi

# Check ROADMAP.md for the phase entry.
roadmap_has_phase=0
if [ -f "$roadmap_path" ]; then
  if grep -qE "^#{2,4}[[:space:]]+Phase[[:space:]]+0*${phase_num}\b" "$roadmap_path" 2>/dev/null; then
    roadmap_has_phase=1
  fi
fi

# Check state.json phases[].
state_has_phase=0
if [ -f "$state_path" ]; then
  # Use node for accurate JSON parsing if available.
  if command -v node >/dev/null 2>&1; then
    state_has_phase=$(node -e "
      try {
        const s = JSON.parse(require('fs').readFileSync('$state_path','utf8'));
        const phases = s.phases || s.state?.phases || [];
        const norm = (k) => String(k ?? '').replace(/^0+(?=\d)/, '');
        const target = norm('$phase_num');
        const hit = phases.some(p => norm(p?.number ?? p?.id ?? '') === target);
        process.stdout.write(hit ? '1' : '0');
      } catch { process.stdout.write('0'); }
    " 2>/dev/null || echo 0)
  fi
fi

if [ "$roadmap_has_phase" = "1" ] && [ "$state_has_phase" = "1" ]; then
  exit 0  # phase is registered — allow
fi

# Block.
{
  echo ""
  echo "✖ rcode #475 guard — phase $phase_num is NOT registered."
  echo ""
  echo "  Target file:  $file_path"
  echo "  ROADMAP.md:   $([ "$roadmap_has_phase" = "1" ] && echo 'has entry' || echo 'MISSING')"
  echo "  state.json:   $([ "$state_has_phase" = "1" ] && echo 'has entry' || echo 'MISSING')"
  echo ""
  echo "  Direct writes to .planning/phases/ produce planning artifacts that are"
  echo "  invisible to /rcode-status, /rcode-execute, /rcode-progress, and"
  echo "  'roadmap list-phases'."
  echo ""
  echo "  Fix:    Run /rcode-add-phase \"<name>\" first to register phase $phase_num,"
  echo "          then retry the write."
  echo ""
  echo "  CLI:    node .rcode/bin/rcode-tools.cjs phase add \"<name>\""
  echo ""
  echo "  Bypass: For retroactive documentation of an already-shipped phase, add"
  echo "          '<!-- rcode-bypass: <one-line reason> -->' at the top of the file."
} >&2

exit 2
