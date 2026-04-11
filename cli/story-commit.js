/**
 * rihal-code story-commit — commit files against a specific story with
 * structured trailers that github-sync can round-trip as issue labels.
 *
 * Usage:
 *   rihal-code story-commit <story-id> <files...> [--type=feat|fix|...] [--message='...']
 *                           [--label=type:story] [--label=area:frontend]
 *                           [--body='...'] [--by='Haitham (frontend)']
 *                           [--no-labels]  (skip auto-inferred labels)
 *
 * Behavior:
 *   1. Verifies the story exists in the active sprint's state.json
 *   2. Looks up the GitHub issue number from .rihal/integrations/github-map.json
 *      (if the story has been pushed) to populate "Refs: #N"
 *   3. Resolves the story's milestone via the milestone library
 *   4. Auto-infers labels: type:story always; area:<area> if story has area;
 *      priority:<priority> if story has priority. User can override with
 *      --label flags or --no-labels.
 *   5. Stages the files (git add), builds the commit message via
 *      story-commit.cjs, runs git commit
 *   6. Appends the new commit sha to state.stories[idx].commits atomically
 *
 * Errors:
 *   - Story not found: refuses
 *   - Invalid --type: suggests closest valid commit type
 *   - Invalid --label: suggests closest valid label
 *   - git commit failure: reports stderr, does NOT touch sprint state
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  formatCommitMessage,
  validateLabels,
} = require('./lib/story-commit.cjs');
const {
  getCurrentPhase,
  getActiveSprint,
  readSprintState,
  updateStoryStatus,
} = require('./lib/sprint-state.cjs');
const { resolveMilestoneForStory } = require('./lib/milestones.cjs');

function parseArgs(args) {
  const opts = {
    type: 'feat',
    message: null,
    body: null,
    labels: [],
    noLabels: false,
    coordinatedBy: [],
    sprint: null, // override
    phase: null, // override
    positional: [],
  };
  for (const arg of args) {
    if (arg.startsWith('--type=')) opts.type = arg.slice('--type='.length);
    else if (arg.startsWith('--message=')) opts.message = arg.slice('--message='.length);
    else if (arg.startsWith('-m=')) opts.message = arg.slice('-m='.length);
    else if (arg.startsWith('--body=')) opts.body = arg.slice('--body='.length);
    else if (arg.startsWith('--label=')) opts.labels.push(arg.slice('--label='.length));
    else if (arg === '--no-labels') opts.noLabels = true;
    else if (arg.startsWith('--by=')) opts.coordinatedBy.push(arg.slice('--by='.length));
    else if (arg.startsWith('--sprint=')) opts.sprint = arg.slice('--sprint='.length);
    else if (arg.startsWith('--phase=')) opts.phase = arg.slice('--phase='.length);
    else opts.positional.push(arg);
  }
  return opts;
}

function ensureRihal(cwd) {
  if (!fs.existsSync(path.join(cwd, '.rihal'))) {
    console.error(`❌ No .rihal/ found in ${cwd}`);
    console.error(`   Run 'rihal-code install' first.`);
    process.exit(1);
  }
}

// ---------- Story lookup ----------

function findStoryAcrossSprints(cwd, phase, storyId) {
  // Prefer active sprint, then scan all sprints in the phase
  const active = getActiveSprint(cwd, phase);
  const candidates = [];
  if (active) candidates.push(active);

  const sprintsDir = path.join(cwd, '.rihal/phases', phase, 'sprints');
  if (fs.existsSync(sprintsDir)) {
    for (const entry of fs.readdirSync(sprintsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('sprint-')) continue;
      if (!candidates.includes(entry.name)) candidates.push(entry.name);
    }
  }

  for (const sprintId of candidates) {
    const state = readSprintState(cwd, phase, sprintId);
    if (!state) continue;
    const story = (state.stories || []).find((s) => s.id === storyId);
    if (story) return { sprintId, story, state };
  }
  return null;
}

// ---------- GitHub map lookup ----------

function lookupIssueNumber(cwd, storyId) {
  const p = path.join(cwd, '.rihal/integrations/github-map.json');
  if (!fs.existsSync(p)) return null;
  try {
    const map = JSON.parse(fs.readFileSync(p, 'utf8'));
    const entry = (map.stories || {})[storyId];
    return entry ? entry.issue_number : null;
  } catch {
    return null;
  }
}

// ---------- Git operations ----------

function gitAdd(cwd, files) {
  const result = spawnSync('git', ['add', '--', ...files], {
    cwd,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return { ok: false, error: result.stderr || 'git add failed' };
  }
  return { ok: true };
}

function gitCommit(cwd, message) {
  const result = spawnSync('git', ['commit', '-m', message], {
    cwd,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return { ok: false, error: result.stderr || result.stdout || 'git commit failed' };
  }
  // Extract the new commit sha
  const shaResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
  const sha = shaResult.status === 0 ? shaResult.stdout.trim().slice(0, 7) : null;
  return { ok: true, sha };
}

// ---------- Main ----------

module.exports = function storyCommit(args) {
  const cwd = process.cwd();
  ensureRihal(cwd);
  const opts = parseArgs(args);

  if (opts.positional.length < 2) {
    console.error(`Usage: rihal-code story-commit <story-id> <files...> [flags]`);
    console.error(`Flags:`);
    console.error(`  --type=feat|fix|refactor|docs|test|chore|perf|revert  (default: feat)`);
    console.error(`  --message='short title'     override the story's title`);
    console.error(`  --body='body text'           optional body (can be multi-line)`);
    console.error(`  --label=<name>               add a label (repeatable)`);
    console.error(`  --no-labels                  skip auto-inferred labels`);
    console.error(`  --by='Name (role)'           co-ordinated-by (repeatable)`);
    console.error(`  --phase=<id>                 override current phase detection`);
    console.error(`  --sprint=<id>                override active sprint detection`);
    process.exit(1);
  }

  const [storyId, ...files] = opts.positional;

  // ------ Resolve phase ------
  const phase = opts.phase || getCurrentPhase(cwd);
  if (!phase) {
    console.error(`❌ No current phase. Pass --phase=<id> or run /rihal:kickoff first.`);
    process.exit(1);
  }

  // ------ Find the story ------
  const found = findStoryAcrossSprints(cwd, phase, storyId);
  if (!found) {
    console.error(`❌ Story '${storyId}' not found in any sprint of phase '${phase}'.`);
    console.error(`   Run 'rihal-code sprint current' to see available stories.`);
    process.exit(1);
  }
  const { sprintId, story } = found;

  // ------ Resolve milestone ------
  const milestoneId = resolveMilestoneForStory(cwd, phase, sprintId, storyId);

  // ------ Resolve title ------
  const title = opts.message || story.title || storyId;

  // ------ Look up GitHub issue number ------
  const issueNum = lookupIssueNumber(cwd, storyId);

  // ------ Auto-infer labels from story metadata unless --no-labels ------
  let labels = [];
  if (!opts.noLabels) {
    labels.push('type:story');
    if (story.area) labels.push(`area:${story.area}`); // likely not in taxonomy
    if (story.priority) labels.push(`priority:${story.priority}`);
  }
  // Append user-specified labels
  labels.push(...opts.labels);
  // De-dup, preserve order
  labels = [...new Set(labels)];
  // Strip any labels that aren't in the taxonomy (fail fast with suggestion)
  const labelResult = validateLabels(labels);
  if (!labelResult.ok) {
    console.error(`❌ Invalid label '${labelResult.invalid}'.`);
    if (labelResult.suggestion) {
      console.error(`   Did you mean '${labelResult.suggestion}'?`);
    }
    console.error(`   Drop invalid labels with --no-labels or fix with --label=...`);
    process.exit(1);
  }

  // ------ Build the commit message ------
  let message;
  try {
    message = formatCommitMessage({
      type: opts.type,
      storyId,
      title,
      issueNum,
      sprint: sprintId,
      milestone: milestoneId || null,
      labels,
      coordinatedBy: opts.coordinatedBy,
      bodyLines: opts.body ? opts.body.split('\n') : [],
    });
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // ------ Stage files ------
  const addResult = gitAdd(cwd, files);
  if (!addResult.ok) {
    console.error(`❌ git add failed:`);
    console.error(addResult.error);
    process.exit(1);
  }

  // ------ Commit ------
  console.log(`\n📦 Staging ${files.length} file(s) for ${storyId}`);
  console.log();
  console.log('--- commit message ---');
  console.log(message);
  console.log('--- end ---');
  console.log();

  const commitResult = gitCommit(cwd, message);
  if (!commitResult.ok) {
    console.error(`❌ git commit failed:`);
    console.error(commitResult.error);
    process.exit(1);
  }

  // ------ Append commit sha to sprint state (atomic) ------
  try {
    const existingCommits = story.commits || [];
    const newCommits = [...existingCommits, commitResult.sha].filter(Boolean);
    updateStoryStatus(cwd, phase, sprintId, storyId, { commits: newCommits });
  } catch (err) {
    // Don't fail the command if state update fails — the git commit already landed
    console.warn(`   ⚠ Could not update sprint state with commit sha: ${err.message}`);
  }

  console.log(`✓ Committed ${commitResult.sha} → ${storyId}`);
  if (milestoneId) console.log(`  Milestone: ${milestoneId}`);
  console.log(`  Sprint:    ${sprintId}`);
  if (issueNum) console.log(`  Refs:      #${issueNum}`);
  if (labels.length > 0) console.log(`  Labels:    ${labels.join(', ')}`);
  console.log();
};
