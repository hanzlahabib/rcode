# Active Context

## Project
Rihal Method — self-hosted BMAD module for team-based AI development.

## Phase
`phase-01-foundation` — build initial agents, workflows, and dashboard

## Goal
Ship v0.1.0 with 9 agents, 11 workflows, view-only dashboard, and complete methodology docs.

## Last completed
- Agent definitions for all 9 roles (Ahmed, Sadiq, Hussain, Layla, Omar, Fatima, Khalid, Noor, Majlis)
- 11 workflows including context-reset and context-build
- Majlis dashboard server (single Node.js file, no dependencies)
- README and METHODOLOGY.md

## In progress
- Testing dashboard with example state

## Blockers
- None

## Next steps
- Test dashboard server locally
- Git init and first commit
- Prepare for GitHub publish

## Key decisions (recent)
- View-only server (no CRUD) — reduces fragility
- File-based state in `.rihal/` — git-native, portable
- Arabic agent names as placeholders — user will customize via team.yaml

## Do NOT reload
- Other folders (vibe-coding, build-in-public)
- Old research docs
- Unrelated Rihal anniversary code
