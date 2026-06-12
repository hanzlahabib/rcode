# Data Contract — `GET /api/state`

The single source of truth for the redesigned Majlis dashboard. The server
(`server/lib/scanner.js` reading `.rcode/`) produces this exact JSON shape and
serves it from `GET /api/state`. Every Preact component **reads its slice from
props** and **never fetches** — the only fetch is the mount glue in
`server/lib/html/components/entry.js`.

This contract is **load-bearing**: components destructure these exact keys.
Changing a key name or nesting requires updating both the scanner and the
consuming component in the same change.

---

## Top-level shape

```jsonc
{
  "project":      { ... },   // identity + current user
  "progress":     { ... },   // ProgressDonut
  "currentPhase": { ... },   // CurrentPhase
  "timeline":     { ... },   // Timeline
  "tasks":        { ... },   // CompletedTasks + InProgress
  "blockers":     [ ... ],   // Blockers
  "health":       { ... },   // ProjectHealth + Sidebar mini-card
  "decisions":    [ ... ],   // RecentDecisions
  "phases":       [ ... ]    // ProgressTimeline
}
```

---

## Fields

### `project` → Sidebar, App header
```jsonc
{
  "name": "Acme AI Platform",          // string — display name
  "user": {
    "name":  "Hanzla",                 // string — greeting + profile footer
    "email": "hanzla@example.com"      // string — profile footer
  }
}
```

### `progress` → ProgressDonut
```jsonc
{
  "completed":   12,   // integer — done task count
  "inProgress":   3,   // integer — active task count
  "notStarted":   9,   // integer — not-yet-started count
  "total":       24,   // integer — completed + inProgress + notStarted
  "pct":         50    // integer 0–100 — completed / total, rounded
}
```

### `currentPhase` → CurrentPhase
```jsonc
{
  "name":   "Phase 8 — Foundation",
  "status": "in_progress",                  // string — free-form status label
  "milestones": [
    { "name": "Vendor Preact", "state": "done" },     // state: done | active | todo
    { "name": "Design tokens", "state": "active" },
    { "name": "Wire API",      "state": "todo" }
  ]
}
```

### `timeline` → Timeline
```jsonc
{
  "launchDate": "2026-08-01",   // string — ISO date or display string
  "onTrack":    true,           // boolean — drives on-track/at-risk styling
  "points": [                   // array — ordered series for the line chart
    { "label": "W1", "value": 10 },
    { "label": "W2", "value": 22 }
  ]
}
```
`points[]` is an ordered series; each entry is `{ label: string, value: number }`.

### `tasks` → CompletedTasks (`.completed`) + InProgress (`.inProgress`)
```jsonc
{
  "completed": [
    { "title": "Scaffold server", "date": "2026-06-10" }   // title: string, date: string
  ],
  "inProgress": [
    { "title": "Build shell", "pct": 60 }                  // title: string, pct: int 0–100
  ]
}
```

### `blockers` → Blockers
```jsonc
[
  {
    "title":    "Auth token drift",
    "desc":     "Long-open tabs 401 after restart",
    "severity": "high"                  // "high" | "medium" | "low"
  }
]
```
`severity` maps to design tokens: `high → --sev-high`, `medium → --sev-medium`,
`low → --sev-low`.

### `health` → ProjectHealth + Sidebar mini-card
```jsonc
{
  "pct":    82,                  // integer 0–100 — overall health score
  "label":  "Healthy",           // string — short status label
  "points": [                    // array — ordered series for sparkline/chart
    { "label": "Mon", "value": 80 }
  ]
}
```

### `decisions` → RecentDecisions
```jsonc
[
  {
    "title":  "Adopt Preact for dashboard",
    "status": "Approved",        // string — e.g. "Approved" | "Proposed" | "Rejected"
    "date":   "2026-06-09"       // string
  }
]
```

### `phases` → ProgressTimeline
```jsonc
[
  {
    "name":  "Foundation",
    "range": "Jun 1 – Jun 14",   // string — display range
    "state": "active"            // "done" | "active" | "todo"
  }
]
```

---

## Rules for consumers

- **Never fetch inside a component.** Read the slice from props. The only HTTP
  call lives in `entry.js`.
- **Tolerate missing data.** All arrays may be empty; all objects may be absent.
  Components default to empty (`= []` / `= {}`) so the shell renders before data
  arrives. `entry.js` provides a full `EMPTY_STATE` of this exact shape.
- **Numbers are numbers, not strings.** `pct`, `value`, counts are integers.
- **Enums are lowercase** except human-facing `status`/`label` strings:
  - milestone/phase `state`: `done | active | todo`
  - blocker `severity`: `high | medium | low`
