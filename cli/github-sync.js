/**
 * rihal-code github-sync — sync .rihal/ state to GitHub (milestones, issues, projects)
 *
 * IMPORTANT: This command modifies shared state on GitHub (creates issues,
 * milestones, projects). Per AGENTS.md rules, it:
 *
 *   1. Defaults to DRY-RUN mode — shows what would be created without doing it
 *   2. Requires an explicit --execute flag to actually mutate GitHub
 *   3. Requires the user to have `gh auth status` working
 *   4. Asks for confirmation before each destructive operation
 *   5. Logs every created ID to .rihal/integrations/github-map.json for re-sync
 *
 * Usage:
 *   rihal-code github-sync                             # dry-run, current repo
 *   rihal-code github-sync --dry-run                   # explicit dry-run (default)
 *   rihal-code github-sync --execute                   # actually create issues
 *   rihal-code github-sync --repo=owner/name           # target a specific repo
 *   rihal-code github-sync --only=milestones           # sync only milestones
 *   rihal-code github-sync --only=epics                # sync only epics
 *   rihal-code github-sync --only=stories              # sync only stories
 *   rihal-code github-sync --only=labels               # ensure labels only
 *   rihal-code github-sync --phase=phase-02            # sync a specific phase
 *   rihal-code github-sync --project                   # also create a Project v2
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const gh = require('./lib/github.cjs');

// ---------- Arg parsing ----------

function parseArgs(args) {
  const opts = {
    execute: false,
    dryRun: true,
    repo: null,
    only: null, // null = all, or 'labels' | 'milestones' | 'epics' | 'stories'
    phase: null, // null = current phase, or specific phase id
    createProject: false,
    yes: false, // skip interactive confirmation
  };

  for (const arg of args) {
    if (arg === '--execute' || arg === '-e') {
      opts.execute = true;
      opts.dryRun = false;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.execute = false;
    } else if (arg === '--yes' || arg === '-y') {
      opts.yes = true;
    } else if (arg === '--project') {
      opts.createProject = true;
    } else if (arg.startsWith('--repo=')) {
      opts.repo = arg.slice('--repo='.length);
    } else if (arg.startsWith('--only=')) {
      opts.only = arg.slice('--only='.length);
    } else if (arg.startsWith('--phase=')) {
      opts.phase = arg.slice('--phase='.length);
    }
  }

  return opts;
}

// ---------- Interactive prompt ----------

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ---------- Discover .rihal/ content ----------

function loadState(cwd) {
  const statePath = path.join(cwd, '.rihal/state.json');
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function discoverPhases(cwd) {
  const phasesDir = path.join(cwd, '.rihal/phases');
  if (!fs.existsSync(phasesDir)) return [];

  const phases = [];
  for (const entry of fs.readdirSync(phasesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const phaseDir = path.join(phasesDir, entry.name);
    const briefPath = path.join(phaseDir, 'brief.md');
    const sprintsPath = path.join(phaseDir, 'sprints.md');
    const storiesDir = path.join(phaseDir, 'stories');
    const tasksDir = path.join(phaseDir, 'tasks');

    const phase = {
      id: entry.name,
      brief: fs.existsSync(briefPath) ? fs.readFileSync(briefPath, 'utf8') : null,
      sprints: fs.existsSync(sprintsPath) ? fs.readFileSync(sprintsPath, 'utf8') : null,
      stories: [],
      epics: [],
    };

    if (fs.existsSync(storiesDir)) {
      for (const file of fs.readdirSync(storiesDir)) {
        if (!file.endsWith('.md')) continue;
        const content = fs.readFileSync(path.join(storiesDir, file), 'utf8');
        phase.stories.push({
          id: file.replace('.md', ''),
          file,
          content,
          title: extractTitle(content) || file.replace('.md', ''),
        });
      }
    }

    if (fs.existsSync(tasksDir)) {
      for (const file of fs.readdirSync(tasksDir)) {
        if (!file.endsWith('.md')) continue;
        const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
        phase.epics.push({
          id: file.replace('.md', ''),
          file,
          content,
          title: extractTitle(content) || file.replace('.md', ''),
        });
      }
    }

    phases.push(phase);
  }

  return phases;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

// ---------- Load/save sync map (for idempotency) ----------

function loadSyncMap(cwd) {
  const mapPath = path.join(cwd, '.rihal/integrations/github-map.json');
  if (!fs.existsSync(mapPath)) {
    return { phases: {}, epics: {}, stories: {}, project: null, labels: [] };
  }
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
}

function saveSyncMap(cwd, map) {
  const integrationsDir = path.join(cwd, '.rihal/integrations');
  fs.mkdirSync(integrationsDir, { recursive: true });
  const mapPath = path.join(integrationsDir, 'github-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n');
}

// ---------- Main sync flow ----------

async function main(args) {
  const opts = parseArgs(args);
  const cwd = process.cwd();

  console.log(`\n🕌 Rihal Code — GitHub Sync`);
  console.log(`   Mode: ${opts.dryRun ? 'DRY-RUN (no changes)' : 'EXECUTE (will create on GitHub)'}`);
  console.log(`   Scope: ${opts.only || 'full (labels + milestones + epics + stories)'}`);
  if (opts.phase) console.log(`   Phase: ${opts.phase}`);
  console.log();

  // ------ Precondition: gh auth ------
  const auth = gh.checkAuth();
  if (!auth.authenticated) {
    console.error(`❌ gh CLI not authenticated.`);
    console.error(`   Run: gh auth login`);
    console.error(`   Error: ${auth.error || 'unknown'}`);
    process.exit(1);
  }
  console.log(`   ✓ Authenticated as ${auth.account}`);

  // ------ Precondition: target repo ------
  let repo = opts.repo;
  if (!repo) {
    const detected = gh.detectRepo(cwd);
    if (!detected) {
      console.error(`❌ Could not detect GitHub repo. Run from a git repo or pass --repo=owner/name`);
      process.exit(1);
    }
    repo = detected.nameWithOwner;
  }
  console.log(`   ✓ Target repo: ${repo}`);

  // ------ Precondition: .rihal/ exists ------
  const state = loadState(cwd);
  if (!state) {
    console.error(`❌ No .rihal/state.json found. Run 'rihal-code init' first.`);
    process.exit(1);
  }
  console.log(`   ✓ Project: ${state.project_name || '(unnamed)'}`);

  // ------ Discover phases ------
  let phases = discoverPhases(cwd);
  if (opts.phase) {
    phases = phases.filter((p) => p.id === opts.phase);
    if (phases.length === 0) {
      console.error(`❌ Phase '${opts.phase}' not found.`);
      process.exit(1);
    }
  }

  if (phases.length === 0) {
    console.error(`❌ No phases found in .rihal/phases/.`);
    process.exit(1);
  }

  console.log(`   ✓ Phases found: ${phases.length}`);
  for (const p of phases) {
    console.log(`     - ${p.id} (${p.epics.length} epics, ${p.stories.length} stories)`);
  }

  // ------ Load existing sync map (for idempotency) ------
  const syncMap = loadSyncMap(cwd);
  const alreadySynced = {
    phases: Object.keys(syncMap.phases).length,
    epics: Object.keys(syncMap.epics).length,
    stories: Object.keys(syncMap.stories).length,
  };
  if (alreadySynced.phases + alreadySynced.epics + alreadySynced.stories > 0) {
    console.log(
      `   ℹ Existing sync map: ${alreadySynced.phases} phases, ${alreadySynced.epics} epics, ${alreadySynced.stories} stories`,
    );
  }

  // ------ Plan the operations ------
  // Label taxonomy follows the Rihal GitHub Standards
  // (best-practices/github/github-workflow-best-practices/):
  // 4 categories: Type / Priority / Status / Area
  const plan = {
    labels: [
      // Type (what kind of work)
      { name: 'epic', color: '6f42c1', description: 'Strategic initiative spanning multiple sprints' },
      { name: 'type:feature', color: '0e8a16', description: 'New functionality' },
      { name: 'type:task', color: 'c5def5', description: 'Development work' },
      { name: 'type:bug', color: 'd73a4a', description: 'Something is broken' },
      { name: 'type:docs', color: '0075ca', description: 'Documentation' },

      // Priority
      { name: 'priority:critical', color: 'b60205', description: 'Drop everything' },
      { name: 'priority:high', color: 'd93f0b', description: 'Important for sprint' },
      { name: 'priority:medium', color: 'fbca04', description: 'Standard priority' },
      { name: 'priority:low', color: '0e8a16', description: 'Nice to have' },

      // Status (flow state)
      { name: 'status:backlog', color: 'c5def5', description: 'Not started' },
      { name: 'status:todo', color: '0075ca', description: 'Ready to start' },
      { name: 'status:in-progress', color: 'fbca04', description: 'Currently working' },
      { name: 'status:blocked', color: 'd73a4a', description: 'Cannot progress' },
      { name: 'status:review', color: '6f42c1', description: 'Code review needed' },
      { name: 'status:done', color: '0e8a16', description: 'Completed' },

      // Area (team/layer)
      { name: 'FE', color: '1e3a8a', description: 'Frontend' },
      { name: 'BE', color: '0e8a16', description: 'Backend' },
      { name: 'ML', color: '6f42c1', description: 'Machine Learning' },
      { name: 'API', color: '0075ca', description: 'API / Backend services' },
      { name: 'Design', color: 'f59e0b', description: 'UI/UX design work' },
      { name: 'DevOps', color: 'fbca04', description: 'Infrastructure and deployment' },
      { name: 'QA', color: 'd73a4a', description: 'Quality assurance' },
      { name: 'Docs', color: 'c5def5', description: 'Documentation' },
    ],
    milestones: phases.filter((p) => !syncMap.phases[p.id]),
    epics: phases.flatMap((p) =>
      p.epics.filter((e) => !syncMap.epics[e.id]).map((e) => ({ ...e, phase: p.id })),
    ),
    stories: phases.flatMap((p) =>
      p.stories.filter((s) => !syncMap.stories[s.id]).map((s) => ({ ...s, phase: p.id })),
    ),
  };

  console.log(`\n📋 Plan:`);
  if (!opts.only || opts.only === 'labels') console.log(`   Labels to ensure:     ${plan.labels.length}`);
  if (!opts.only || opts.only === 'milestones') console.log(`   Milestones to create: ${plan.milestones.length}`);
  if (!opts.only || opts.only === 'epics') console.log(`   Epics to create:      ${plan.epics.length}`);
  if (!opts.only || opts.only === 'stories') console.log(`   Stories to create:    ${plan.stories.length}`);
  if (opts.createProject) console.log(`   Project v2: will create "${state.project_name || repo}"`);
  console.log();

  // ------ Permission gate ------
  if (opts.execute && !opts.yes) {
    console.log(`⚠️  This will modify ${repo} on GitHub.`);
    console.log(`   Items to create: ${
      plan.labels.length + plan.milestones.length + plan.epics.length + plan.stories.length
    }`);
    console.log();
    const answer = await prompt(`   Proceed? Type 'yes' to continue: `);
    if (answer !== 'yes' && answer !== 'y') {
      console.log(`\n❌ Aborted by user. No changes made.`);
      process.exit(0);
    }
    console.log();
  }

  // ------ Execute (or dry-run) ------
  const results = { labels: [], milestones: [], epics: [], stories: [], errors: [] };
  const syncOpts = { execute: opts.execute, dryRun: opts.dryRun, repo };

  // 1. Labels
  if (!opts.only || opts.only === 'labels') {
    console.log(`\n🏷️  Labels`);
    for (const label of plan.labels) {
      const result = gh.ensureLabel(label.name, label.color, label.description, syncOpts);
      results.labels.push(result);
      if (result.error) {
        results.errors.push(`label ${label.name}: ${result.error}`);
      } else if (!result.dryRun) {
        if (!syncMap.labels.includes(label.name)) syncMap.labels.push(label.name);
        console.log(`   ✓ ${result.existed ? 'exists' : 'created'}: ${label.name}`);
      }
    }
  }

  // 2. Milestones (phases)
  if (!opts.only || opts.only === 'milestones') {
    console.log(`\n🎯 Milestones (phases)`);
    for (const phase of plan.milestones) {
      const desc = phase.brief ? phase.brief.split('\n').slice(0, 5).join('\n') : 'Rihal Code phase';
      const result = gh.createMilestone(phase.id, desc, null, syncOpts);
      results.milestones.push({ phase: phase.id, ...result });
      if (result.error) {
        results.errors.push(`milestone ${phase.id}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.phases[phase.id] = {
          milestone_number: result.number,
          milestone_id: result.id,
          url: result.url,
          synced_at: new Date().toISOString(),
        };
        console.log(`   ✓ created: ${phase.id} → milestone #${result.number}`);
      }
    }
  }

  // 3. Epics — use Rihal standard epic template structure
  if (!opts.only || opts.only === 'epics') {
    console.log(`\n📦 Epics`);
    for (const epic of plan.epics) {
      const body = [
        `## 🎯 Epic Vision`,
        ``,
        `_Strategic goal this Epic contributes to. Fill in from \`.rihal/phases/${epic.phase}/tasks/${epic.file}\`._`,
        ``,
        `## 📋 Source Content`,
        ``,
        epic.content.slice(0, 3000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        `- **Phase:** \`${epic.phase}\``,
        `- **Source:** \`.rihal/phases/${epic.phase}/tasks/${epic.file}\``,
        `- **Synced by:** Rihal Code github-sync`,
        ``,
        `> **Note:** This epic follows the Rihal GitHub standards (type: epic).`,
        `> Add related stories as sub-issues or link them in comments with \`refs #${'{issue}'}\`.`,
      ].join('\n');

      const milestoneNumber =
        syncMap.phases[epic.phase] && syncMap.phases[epic.phase].milestone_number;

      const result = gh.createIssue(
        {
          title: `[Epic] ${epic.title}`,
          body,
          labels: ['epic', 'priority:medium', 'status:backlog'],
          milestone: milestoneNumber,
        },
        syncOpts,
      );
      results.epics.push({ epic: epic.id, ...result });
      if (result.error) {
        results.errors.push(`epic ${epic.id}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.epics[epic.id] = {
          issue_number: result.number,
          url: result.url,
          phase: epic.phase,
          synced_at: new Date().toISOString(),
        };
        console.log(`   ✓ created: ${epic.id} → #${result.number}`);
      }
    }
  }

  // 4. Stories — use Rihal standard feature template structure
  if (!opts.only || opts.only === 'stories') {
    console.log(`\n📄 Stories`);
    for (const story of plan.stories) {
      const parentEpicRef = Object.values(syncMap.epics).find((e) => e.phase === story.phase);
      const parentRef = parentEpicRef
        ? `- **Parent Epic:** #${parentEpicRef.issue_number}`
        : `- **Parent Epic:** (none — standalone story)`;

      const body = [
        `## 🎯 Problem Statement`,
        ``,
        `_Clear explanation of what this story solves. Fill in from \`.rihal/phases/${story.phase}/stories/${story.file}\`._`,
        ``,
        `## ✅ Acceptance Criteria`,
        ``,
        `- [ ] Given/When/Then flows documented in source`,
        `- [ ] Tests written and passing`,
        `- [ ] Code review complete`,
        ``,
        `## 📋 Source Content`,
        ``,
        story.content.slice(0, 3000),
        ``,
        `---`,
        ``,
        `## 📊 Meta`,
        ``,
        parentRef,
        `- **Phase:** \`${story.phase}\``,
        `- **Source:** \`.rihal/phases/${story.phase}/stories/${story.file}\``,
        `- **Synced by:** Rihal Code github-sync`,
        ``,
        `> **Note:** This story follows the Rihal GitHub standards (type: feature).`,
        `> Link commits with \`(refs #${'{issue}'})\` and close via PR with \`Closes #${'{issue}'}\`.`,
      ].join('\n');

      const milestoneNumber =
        syncMap.phases[story.phase] && syncMap.phases[story.phase].milestone_number;

      const result = gh.createIssue(
        {
          title: story.title,
          body,
          labels: ['type:feature', 'priority:medium', 'status:backlog'],
          milestone: milestoneNumber,
        },
        syncOpts,
      );
      results.stories.push({ story: story.id, ...result });
      if (result.error) {
        results.errors.push(`story ${story.id}: ${result.error}`);
      } else if (!result.dryRun) {
        syncMap.stories[story.id] = {
          issue_number: result.number,
          url: result.url,
          phase: story.phase,
          synced_at: new Date().toISOString(),
        };
        console.log(`   ✓ created: ${story.id} → #${result.number}`);
      }
    }
  }

  // 5. Project v2 (optional)
  if (opts.createProject && (!opts.only || opts.only === 'project')) {
    console.log(`\n📊 Project v2`);
    const owner = repo.split('/')[0];
    const title = state.project_name || repo.split('/')[1];
    const result = gh.createProject(owner, title, syncOpts);
    if (result.error) {
      results.errors.push(`project: ${result.error}`);
    } else if (!result.dryRun) {
      syncMap.project = { number: result.number, url: result.url, synced_at: new Date().toISOString() };
      console.log(`   ✓ created: Project v2 "${title}" → ${result.url}`);
    }
  }

  // ------ Save sync map (only if we executed) ------
  if (opts.execute) {
    saveSyncMap(cwd, syncMap);
    console.log(`\n💾 Sync map saved to .rihal/integrations/github-map.json`);
  }

  // ------ Summary ------
  console.log(`\n📊 Summary`);
  console.log(`   Labels:     ${results.labels.length}`);
  console.log(`   Milestones: ${results.milestones.length}`);
  console.log(`   Epics:      ${results.epics.length}`);
  console.log(`   Stories:    ${results.stories.length}`);
  if (results.errors.length > 0) {
    console.log(`   Errors:     ${results.errors.length}`);
    for (const err of results.errors) console.log(`     ❌ ${err}`);
  }

  if (opts.dryRun) {
    console.log(`\n⚠️  This was a DRY-RUN. No changes were made to GitHub.`);
    console.log(`   To actually create these items, run again with: --execute`);
  } else {
    console.log(`\n✅ Sync complete. View on GitHub: https://github.com/${repo}`);
  }
}

module.exports = function githubSync(args) {
  main(args).catch((err) => {
    console.error(`\n❌ GitHub sync failed:`, err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
};
