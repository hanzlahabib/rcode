/**
 * rihal-method init — scaffold .rihal/ in current project
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIRS = [
  '.rihal/phases',
  '.rihal/plans',
  '.rihal/decisions',
  '.rihal/artifacts',
  '.rihal/artifacts/brand',
  '.rihal/artifacts/reviews',
  '.rihal/artifacts/bugs',
  '.rihal/progress',
  '.rihal/context',
];

const TEMPLATE_FILES = {
  '.rihal/state.json': JSON.stringify(
    {
      project_name: null,
      created: new Date().toISOString(),
      current_phase: null,
      phases: [],
      active_agents: [],
      context_version: 1,
    },
    null,
    2,
  ) + '\n',

  '.rihal/context/active.md': `# Active Context

## Project
{fill this in with \`npx @hanzlahabib/rihal-method init\` or manually}

## Phase
Not started

## Goal
{what are you building, why}

## Last completed
- Project initialized with Rihal Method

## In progress
- Waiting for first task

## Blockers
- None

## Next steps
- Run kickoff with the Rihal team (invoke Hussain-PM or Majlis)
`,

  '.rihal/README.md': `# .rihal/ — Project State

This directory is managed by the Rihal Method (https://github.com/hanzlahabib/rihal-method).

## What's in here
- \`state.json\` — current project state (phase, active agents, counters)
- \`phases/\` — phase briefs, sprints, stories, tasks
- \`plans/\` — implementation plans
- \`decisions/\` — Architecture Decision Records (ADRs)
- \`artifacts/\` — design system, pitch decks, brand guidelines, reviews, bugs
- \`progress/\` — daily logs, retros, status reports, dispatch plans, Majlis sessions
- \`context/active.md\` — compacted context for AI agents (kept under 2000 tokens)

## Commands
\`\`\`bash
# View dashboard
npx @hanzlahabib/rihal-method dashboard

# List team
npx @hanzlahabib/rihal-method team

# Check health
npx @hanzlahabib/rihal-method doctor
\`\`\`

This directory is git-friendly. Commit it alongside your code.
`,
};

function copyFrom(source, dest) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
}

function copyDirRecursive(source, dest) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else if (entry.isFile()) fs.copyFileSync(srcPath, destPath);
  }
}

module.exports = function init(args, { packageRoot }) {
  const cwd = process.cwd();
  const rihalDir = path.join(cwd, '.rihal');

  console.log(`\n🕌 Rihal Method — initializing in ${cwd}\n`);

  if (fs.existsSync(rihalDir)) {
    console.log(`⚠️  .rihal/ already exists. Skipping scaffolding to avoid overwriting.`);
    console.log(`   Delete .rihal/ first if you want a fresh setup.`);
    return;
  }

  // Create directories
  for (const dir of TEMPLATE_DIRS) {
    fs.mkdirSync(path.join(cwd, dir), { recursive: true });
    console.log(`   ✓ created ${dir}/`);
  }

  // Create template files
  for (const [file, content] of Object.entries(TEMPLATE_FILES)) {
    fs.writeFileSync(path.join(cwd, file), content);
    console.log(`   ✓ created ${file}`);
  }

  // Copy models.json to .rihal/models.json so the project has its own
  const modelsSource = path.join(packageRoot, 'rihal/config/models.json');
  const modelsDest = path.join(cwd, '.rihal/models.json');
  if (fs.existsSync(modelsSource)) {
    fs.copyFileSync(modelsSource, modelsDest);
    console.log(`   ✓ copied models.json (model selection config)`);
  }

  // Copy memory bank templates
  const memoryBankSource = path.join(packageRoot, 'rihal/templates/memory-bank');
  if (fs.existsSync(memoryBankSource)) {
    const memoryBankDest = path.join(cwd, '.rihal/templates/memory-bank');
    copyDirRecursive(memoryBankSource, memoryBankDest);
    console.log(`   ✓ copied memory bank templates`);
  }

  // Copy CLAUDE.md if user doesn't have one
  const claudeMdDest = path.join(cwd, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdDest)) {
    const claudeMdSource = path.join(packageRoot, 'rihal/templates/claude-md-starter.md');
    if (fs.existsSync(claudeMdSource)) {
      fs.copyFileSync(claudeMdSource, claudeMdDest);
      console.log(`   ✓ created CLAUDE.md with Rihal rules`);
    }
  } else {
    console.log(`   ⚠ CLAUDE.md exists — not overwriting`);
  }

  console.log(`
✅ Rihal Method initialized.

Next steps:
  1. Fill in .rihal/context/active.md with your project context
  2. Run: npx @hanzlahabib/rihal-method dashboard
  3. Open: http://localhost:7717
  4. Invoke an agent in Claude Code by loading its skill:
       rihal/skills/agents/sadiq-analyst/SKILL.md  (for strategy)
       rihal/skills/agents/waleed-architect/SKILL.md (for architecture)
       rihal/skills/agents/majlis-council/SKILL.md  (to convene the full team)

See docs/METHODOLOGY.md for the full workflow.
`);
};
