/**
 * rihal-code postinstall hook — runs automatically after `npm install`
 */

// Only print the welcome if not running in CI/test environments
if (process.env.CI || process.env.NODE_ENV === 'test') {
  process.exit(0);
}

console.log(`
🕌 Rihal Code installed.

First-time setup:
  npx @hanzlahabib/rihal-code install     # set up agents + slash commands
  npx @hanzlahabib/rihal-code tiers       # see the tier map

🌱 The Golden Path (say these phrases in your AI IDE):
  1. "scaffold a new project"     → rihal-scaffold-project
  2. "create a PRD"               → rihal-create-prd
  3. "create a story"             → rihal-create-story
  4. "plan a sprint"              → rihal-sprint-planning
  5. "dev this story"             → rihal-dev-story
  6. "review this code"           → rihal-code-review
  7. "sprint status"              → rihal-sprint-status

More:
  npx @hanzlahabib/rihal-code help        # all commands (grouped)
  npx @hanzlahabib/rihal-code dashboard   # view-only Diwan on :7717

Docs: https://github.com/hanzlahabib/rihal-code
Tiers: docs/TIERS.md   ·   Standards: docs/STANDARDS.md
`);
