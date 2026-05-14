---
phase: 05
sprint: 05.1
type: execute
autonomous: false
requirements: [REQ-LAUNCH]

must_haves:
  truths:
    - "Package published on npm as @hanzlaa/rcode"
    - "README has install command, demo, feature highlights"
    - "At least 1 demo asset exists (GIF or video)"
    - "Launch announced on at least 2 channels"
  artifacts:
    - path: "package.json"
      provides: "npm publishConfig, version, description"
    - path: "README.md"
      provides: "Polished install + demo + features"
  key_links:
    - from: "npm registry"
      to: "package.json"
      via: "npm publish"
---

# Sprint 05.1 — Marketing + Launch

**Goal:** Publish to npm, polish README, demo video, first 10 external installs

## Stories

| ID | Title | Points | Status | Acceptance |
|----|-------|--------|--------|------------|
| 05.1.01 | Publish @hanzlaa/rcode to npm registry (public) | 2 | done | `npm info @hanzlaa/rcode` returns valid |
| 05.1.02 | Polish README — install command, demo GIF, feature highlights | 3 | done | README has demo, tier table, install one-liner |
| 05.1.03 | Record 90-second terminal demo (asciinema or GIF) | 3 | todo | Demo asset in repo or linked |
| 05.1.04 | Post launch thread on X (English + Arabic) | 2 | todo | Tweet posted with link |
| 05.1.05 | Post on MENA dev communities (Reddit, Discord) | 2 | todo | At least 2 communities posted |
| 05.1.06 | Track first 10 external npm installs | 1 | done | npm stats show 10+ downloads |

## Capacity

- **Velocity target:** 13 points
- **Total committed:** 13 points
- **Buffer:** 0 points

## Dependencies

- Sprint 04.1 should complete first (dashboard ready for demo)
- npm account access required for publish

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| npm publish requires 2FA | Blocks 05.1.01 | Verify auth before sprint start |
| Demo recording quality | Poor impression | Practice 2-3 takes, keep terminal clean |

## Checkpoints

**Story 05.1.01:** checkpoint:human-action — npm login + publish requires manual 2FA
**Story 05.1.04:** checkpoint:human-action — posting on social requires manual auth
