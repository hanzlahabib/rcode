---
phase: 04-template-improvements
sprint: 04.1
type: execute
autonomous: true
requirements: [REQ-TEMPLATE]

must_haves:
  truths:
    - "New project from rihal-om/template uses pnpm, not npm"
    - "Template targets Node 20+ LTS"
    - "Template has .rihal/config.json so rihal skills load immediately"
    - "Template has proper .gitignore covering Rihal patterns"
  artifacts:
    - path: "package.json"
      provides: "pnpm scripts, Node 20+ engines"
    - path: ".rihal/config.json"
      provides: "Rihal skill config scaffold"
    - path: ".gitignore"
      provides: "Standard ignores for Rihal projects"
    - path: "README.md"
      provides: "Template with placeholder sections"
  key_links:
    - from: ".rihal/config.json"
      to: "rihal-code install"
      via: "Skills load config on activation"
---

# Sprint 04.1 — Modernize rihal-om/template

**Goal:** Modernize rihal-om/template repo — pnpm, Node 20+, gitignore, README, rihal config

## Stories

| ID | Title | Points | Status | Acceptance |
|----|-------|--------|--------|------------|
| 04.1.01 | Audit rihal-om/template current state — list outdated deps + patterns | 2 | todo | Audit doc with findings |
| 04.1.02 | Replace npm scripts with pnpm in package.json + docs | 1 | todo | No npm references remain |
| 04.1.03 | Add .nvmrc + package.json engines targeting Node 20+ LTS | 1 | todo | engines.node >= 20 |
| 04.1.04 | Add .gitignore with Rihal patterns | 1 | todo | node_modules, .env, .rihal/state.json, dist, .next covered |
| 04.1.05 | Add README.md template with placeholder sections | 2 | todo | Has name, stack, setup, contribution sections |
| 04.1.06 | Add .rihal/config.json scaffold | 3 | todo | rihal skills load without manual config |
| 04.1.07 | Enable TypeScript strict mode in tsconfig | 2 | todo | strict: true in tsconfig.json |
| 04.1.08 | Close GH issue #101 with PR links | 1 | todo | #101 closed |

## Capacity

- **Velocity target:** 13 points
- **Total committed:** 13 points
- **Buffer:** 0 points (0%) — first sprint, no history

## Dependencies

- Requires access to `rihal-om/template` repo (separate from rihal-code)
- PRs opened on template repo, not rihal-code

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template repo access / permissions | Blocks all work | Verify access before starting |
| TypeScript may not be in template | Story 04.1.07 becomes no-op | Check during audit (04.1.01) |
