# The 999.x Parking-Lot Convention

**TL;DR:** Use phase numbers `999.1`, `999.2`, `999.3`, ... for backlog items that have a concrete name but no committed window yet. Promote to a real phase number (e.g. `07`) when the team decides to schedule them.

---

## Why

Every project accumulates ideas that are too shaped to live in a Notion backlog but too unscheduled to occupy real phase numbers. Without a convention, those ideas either:

- Clog the roadmap with ambiguous "future" entries.
- Get lost in scattered Slack threads.
- Become phase 73 when the team wanted 73 to be something else.

The `999.x` convention fixes all three: parking-lot items have real numeric identity (so you can reference `999.5` in a PR), but `999.x` is unambiguously not part of any active milestone.

---

## Usage

### Capturing a parking-lot item

Use `/rihal:plant-seed` — it writes into ROADMAP.md under the parking-lot section AND appends to `state.phases[]` with `status: parking-lot`.

```
Backlog (999.x — promotable with /rihal:state promote-backlog):

  999.1  Cross-post to LinkedIn         — deferred: requires LinkedIn OAuth
  999.2  Auto-DM feature                — deferred: abuse risk
  999.3  Mobile native app              — deferred: PWA sufficient for launch
  999.4  Enterprise SSO                 — deferred: no enterprise customers yet
  999.5  Audit log export               — deferred: nice-to-have for M2
```

### Promoting one to a scheduled phase

When the team commits to building a parking-lot item, run:

```bash
node .rihal/bin/rihal-tools.cjs state promote-backlog 999.5 --to 07
```

This:
- Updates `state.phases[]` — moves the entry from `999.5` to `07`, records `promoted_from: 999.5` and `promoted_at: <timestamp>` for audit.
- Renames the on-disk `.planning/phases/999.5-audit-log-export/` directory to `07-audit-log-export/` if it exists.
- Does **not** touch ROADMAP.md — you still edit that manually to move the item out of the Backlog section into the right milestone. (The CLI does one thing well; roadmap prose is yours to write.)

### Listing current parking-lot items

```bash
node .rihal/bin/rihal-tools.cjs state read | python3 -c "
import sys, json
for p in json.load(sys.stdin).get('state', {}).get('phases', []):
    if str(p.get('number', '')).startswith('999.'):
        print(p['number'], '—', p.get('name', ''))
"
```

Or, simpler: `/rihal:progress` includes parking-lot items in its phase listing, labelled as parking-lot when their number matches `999.x`.

---

## Numbering rules

- Parking-lot items use decimal sub-numbering: `999.1`, `999.2`, ..., `999.99`. No gaps needed — increment by 1.
- When promoting, pick any available integer phase number (`07`, `12`, `73`). Do not reuse `999.5` for a new parking-lot item after it's been promoted; allocate `999.6` next.
- Decimal sub-numbering is also available for **urgent insertion** (e.g. `07.1` slotted between `07` and `08`) — see `/rihal:insert-phase` for that flow. Different tool, same numeric grammar.

---

## Why not a separate `backlog.yaml`?

Because parking-lot items become active phases. Keeping them in the same data structure means:

- Zero migration when we promote (`promoted_from` is just metadata).
- `/rihal:progress` sees everything in one pass — no separate loader.
- CODEOWNERS rules, reviews, and audit flows work on parking-lot items out of the box.

---

## Why this specific number

`999.x` works because:

- `999` is far above any plausible real phase number — no collision risk with active milestones.
- The decimal sub-numbering (`999.1`, `999.2`, …) preserves order and makes parking-lot items individually addressable.
- When promoted, the integer phase number it lands on (e.g. `07`) is unrelated to the parking-lot id, so the promotion doesn't disturb other phase numbering.

The convention has been validated across multiple project lifecycles in adjacent tooling that solved the same problem.
