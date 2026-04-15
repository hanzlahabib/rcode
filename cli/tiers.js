/**
 * rihal-code tiers — print the tier map
 *
 * Reads docs/TIERS.md from the package and prints a compact version.
 * Full detail stays in docs/TIERS.md (single source of truth).
 */

module.exports = function tiers(_args, { packageJson }) {
  console.log(`
🕌 Rihal Code v${packageJson.version} — Tiers

Everything is organized into 4 tiers + a preview track. Start with 🌱 Starter.

🌱 STARTER — The Golden Path (7 skills)
   First-time Rihalian. Scaffold → ship, end-to-end.
     1. rihal-scaffold-project      "scaffold a new project"
     2. rihal-create-prd            "create a PRD"
     3. rihal-create-story          "create a story"
     4. rihal-sprint-planning       "plan a sprint"
     5. rihal-dev-story             "dev this story"
     6. rihal-code-review           "review this code"
     7. rihal-sprint-status         "sprint status"
   Agents: Sadiq · Hussain · Nasser

🌿 ADVANCED — Real Sprint Team (9 skills)
   For teams running multiple sprints with formal ceremonies.
     product-brief · edit-prd · validate-prd · create-epics-and-stories
     create-architecture · create-ux-design · frontend-design
     qa-generate-e2e-tests · retrospective
   Agents: Waleed · Ahmed · Layla · Zahra · Haitham · Yousef · Fatima · Hussain-SM

🌳 ULTRA ADVANCED — Power User Workflows (6 skills)
   Multi-agent consultation, reverse engineering, project recovery.
     check-implementation-readiness · correct-course · clone-website
     document-project · generate-project-context · research
   Agents: Majlis · Raees · Diwan · Zayd · Omar · Mariam · Noor
   Power tools: dashboard · digest · github-sync · context --refresh

📐 STANDARDS — Contributors
   5-component skill spec, commit rules, PR checklist.
   See: docs/STANDARDS.md

🧪 PREVIEW — v2
   Next-gen methodology (36 agents, 67 workflows). In development.
   See: docs/V2-PREVIEW.md

Full detail: docs/TIERS.md
  `.trim());
};
