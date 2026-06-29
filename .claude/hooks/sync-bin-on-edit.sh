#!/usr/bin/env bash
# .claude/hooks/sync-bin-on-edit.sh — triggered by PostToolUse hook on Edit/Write.
#
# When an Edit/Write touches rcode/bin/**, sync the source to .rcode/bin/ so
# the runtime copy that workflows invoke stays current. Closes #470.
# When an Edit/Write touches rcode/data/**, sync to .rcode/data/ so the
# intent-table and any future data files stay current on dogfood sessions. (#952)
#
# Receives the tool's JSON payload on stdin. Extracts the file path from
# `tool_input.file_path` and acts only if it's under rcode/bin/ or rcode/data/.

set -e

input="$(cat)"
file_path="$(printf '%s' "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"

case "$file_path" in
  */rcode/bin/*)
    REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
    [ -n "$REPO_ROOT" ] || exit 0
    [ -d "$REPO_ROOT/.rcode/bin" ] || exit 0
    cp -r "$REPO_ROOT/rcode/bin/." "$REPO_ROOT/.rcode/bin/"
    echo "[sync-bin] rcode/bin/ → .rcode/bin/ (after edit to $file_path)" >&2
    ;;
  */rcode/data/*)
    REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
    [ -n "$REPO_ROOT" ] || exit 0
    mkdir -p "$REPO_ROOT/.rcode/data"
    cp -r "$REPO_ROOT/rcode/data/." "$REPO_ROOT/.rcode/data/"
    echo "[sync-data] rcode/data/ → .rcode/data/ (after edit to $file_path)" >&2
    ;;
esac

exit 0
