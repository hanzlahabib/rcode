/**
 * rcode workflow [list|show <name>] — lifecycle bridge for non-Claude runtimes.
 *
 * Codex, Copilot, Grok, and other non-Claude agents cannot invoke slash
 * commands directly. This command exposes rcode's lifecycle workflows as
 * readable markdown so any agent can follow the same process:
 *
 *   rcode workflow list               → list available workflow names
 *   rcode workflow show <name>        → print workflow markdown to stdout
 *   rcode workflow show plan          → print the plan workflow
 *
 * An agent consuming `rcode workflow show <name>` should treat the output
 * as its operative instructions for that lifecycle step (the same content
 * Claude Code loads when a slash command fires).
 */

const fs = require('fs');
const path = require('path');

// Canonical lifecycle order shown in help output
const LIFECYCLE_ORDER = [
  'new-project',
  'create-prd',
  'discuss-phase',
  'plan',
  'execute-sprint',
  'verify-phase',
  'retrospective',
  'ship',
];

module.exports = function workflow(args, { packageRoot }) {
  const workflowsDir = path.join(packageRoot, 'rcode', 'workflows');

  const subcommand = args[0];

  if (!subcommand || subcommand === 'list' || subcommand === '--list') {
    return listWorkflows(workflowsDir);
  }

  if (subcommand === 'show' || subcommand === 'get' || subcommand === 'run') {
    const name = args[1];
    if (!name) {
      console.error('Usage: rcode workflow show <name>');
      console.error('       rcode workflow list');
      process.exit(1);
    }
    return showWorkflow(workflowsDir, name);
  }

  // Treat bare `rcode workflow <name>` as show
  return showWorkflow(workflowsDir, subcommand);
};

function listWorkflows(workflowsDir) {
  const all = fs.readdirSync(workflowsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort();

  // Show lifecycle commands first, then remaining alphabetically
  const lifecycle = LIFECYCLE_ORDER.filter(n => all.includes(n));
  const rest = all.filter(n => !LIFECYCLE_ORDER.includes(n));

  console.log('🕌 rcode lifecycle workflows\n');
  console.log('Core lifecycle (in order):');
  lifecycle.forEach(n => console.log(`  rcode workflow show ${n}`));
  if (rest.length) {
    console.log('\nOther workflows:');
    rest.forEach(n => console.log(`  rcode workflow show ${n}`));
  }
  console.log('\nUsage: rcode workflow show <name>  — print the full workflow instructions');
}

function showWorkflow(workflowsDir, name) {
  // Normalise: strip rcode- prefix so both `plan` and `rcode-plan` resolve (#883)
  const bare = name.startsWith('rcode-') ? name.slice('rcode-'.length) : name;
  const candidates = [
    path.join(workflowsDir, `${bare}.md`),
    path.join(workflowsDir, `${name}.md`),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      process.stdout.write(fs.readFileSync(p, 'utf8'));
      return;
    }
  }

  // Not found — list available and exit non-zero
  const available = fs.readdirSync(workflowsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort()
    .join(', ');
  console.error(`Error: workflow '${name}' not found.`);
  console.error(`Available: ${available}`);
  process.exit(1);
}
