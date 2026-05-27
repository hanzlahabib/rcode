#!/bin/bash
# Background heartbeat for the autonomous fix campaign.
#
# Run:   bash heartbeat.sh & echo $! > .planning/campaign/HEARTBEAT.pid
# Kill:  kill $(cat .planning/campaign/HEARTBEAT.pid) && rm .planning/campaign/HEARTBEAT.pid
#
# Touches .planning/campaign/HEARTBEAT every 30s with an ISO-8601 UTC timestamp.
# External watchers can monitor mtime to see the campaign is alive.
#
# This is the SECONDARY heartbeat. The PRIMARY heartbeat is ScheduleWakeup inside
# the assistant session — without ScheduleWakeup the assistant goes silent regardless
# of this bash loop.

set -euo pipefail

HEARTBEAT_DIR="${HEARTBEAT_DIR:-.planning/campaign}"
mkdir -p "$HEARTBEAT_DIR"

HEARTBEAT_FILE="$HEARTBEAT_DIR/HEARTBEAT"
INTERVAL="${HEARTBEAT_INTERVAL:-30}"

echo "[heartbeat] starting — writes to $HEARTBEAT_FILE every ${INTERVAL}s" >&2

trap 'echo "[heartbeat] received SIGTERM, exiting" >&2; exit 0' TERM INT

while true; do
  date -u +%FT%TZ > "$HEARTBEAT_FILE"
  sleep "$INTERVAL"
done
