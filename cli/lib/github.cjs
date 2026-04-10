/**
 * GitHub CLI wrapper library for Rihal Code.
 *
 * Uses the `gh` CLI exclusively. Never calls the GitHub API directly (keeps auth
 * in the user's existing `gh` session, respects GH_TOKEN, and works with SSO).
 *
 * All functions are DESIGNED TO BE SAFE:
 *  - Read operations are always allowed
 *  - Mutations require an explicit `execute: true` option
 *  - In dry-run mode, mutations log what they WOULD do but don't call gh
 *
 * IMPORTANT: Per AGENTS.md rules, GitHub mutations are treated like pushes.
 * They affect shared state visible to colleagues, CI, and the public.
 * Never chain mutations without per-action user confirmation.
 */

const { execSync, spawnSync } = require('child_process');

// ---------- Utility: run gh commands safely ----------

function runGh(args, { input = null, allowFailure = false } = {}) {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    input,
    stdio: input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `gh ${args.join(' ')} failed:\n${result.stderr || result.stdout || '(no output)'}`
    );
  }

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

// ---------- Auth and repo detection ----------

function checkAuth() {
  try {
    const result = runGh(['auth', 'status'], { allowFailure: true });
    if (result.status !== 0) {
      return { authenticated: false, error: result.stderr };
    }
    // Parse active account from stderr (gh writes status to stderr)
    const match = (result.stderr + result.stdout).match(/Logged in to github\.com account (\S+)/);
    return {
      authenticated: true,
      account: match ? match[1] : 'unknown',
    };
  } catch (e) {
    return { authenticated: false, error: e.message };
  }
}

function detectRepo(cwd = process.cwd()) {
  try {
    const result = spawnSync('gh', ['repo', 'view', '--json', 'owner,name,nameWithOwner,url'], {
      cwd,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      return null;
    }
    return JSON.parse(result.stdout);
  } catch (e) {
    return null;
  }
}

// ---------- Labels ----------

function ensureLabel(name, color, description, { execute = false, dryRun = true } = {}) {
  if (dryRun || !execute) {
    console.log(`   [dry-run] would ensure label: ${name} (${color})`);
    return { dryRun: true };
  }

  // Check if label exists
  const check = runGh(['label', 'list', '--search', name, '--json', 'name'], { allowFailure: true });
  if (check.status === 0) {
    const labels = JSON.parse(check.stdout || '[]');
    if (labels.some((l) => l.name === name)) {
      return { existed: true, name };
    }
  }

  // Create it
  const args = ['label', 'create', name, '--color', color];
  if (description) args.push('--description', description);
  const result = runGh(args, { allowFailure: true });
  return {
    created: result.status === 0,
    name,
    error: result.status !== 0 ? result.stderr : null,
  };
}

// ---------- Milestones (one per phase) ----------

function createMilestone(title, description, dueDate, { execute = false, dryRun = true, repo = null } = {}) {
  if (dryRun || !execute) {
    console.log(`   [dry-run] would create milestone: "${title}"`);
    return { dryRun: true, title };
  }

  // gh does not have a first-class `milestone create` command — use the API
  const repoFlag = repo ? `/repos/${repo}` : '/repos/{owner}/{repo}';
  const args = [
    'api',
    '--method', 'POST',
    `${repoFlag}/milestones`,
    '-f', `title=${title}`,
    '-f', `description=${description || ''}`,
    '-f', 'state=open',
  ];
  if (dueDate) args.push('-f', `due_on=${dueDate}`);

  const result = runGh(args, { allowFailure: true });
  if (result.status !== 0) {
    return { error: result.stderr };
  }
  const data = JSON.parse(result.stdout);
  return { created: true, number: data.number, id: data.id, title: data.title, url: data.html_url };
}

// ---------- Issues (epics and stories) ----------

/**
 * Fetch an existing issue by number.
 * Always read-only — no execute guard needed.
 */
function getIssue(number, { repo = null } = {}) {
  const args = ['issue', 'view', String(number), '--json', 'number,title,body,labels,milestone,state,url'];
  if (repo) args.push('--repo', repo);
  const result = runGh(args, { allowFailure: true });
  if (result.status !== 0) {
    return { error: result.stderr };
  }
  return JSON.parse(result.stdout);
}

function createIssue(
  { title, body, labels = [], milestone = null, assignees = [] },
  { execute = false, dryRun = true, repo = null } = {}
) {
  if (dryRun || !execute) {
    console.log(`   [dry-run] would create issue: "${title}" (labels: ${labels.join(',')})`);
    return { dryRun: true, title };
  }

  const args = ['issue', 'create', '--title', title, '--body', body || ''];
  for (const label of labels) {
    args.push('--label', label);
  }
  if (milestone) args.push('--milestone', String(milestone));
  for (const assignee of assignees) {
    args.push('--assignee', assignee);
  }
  if (repo) args.push('--repo', repo);

  const result = runGh(args, { allowFailure: true });
  if (result.status !== 0) {
    return { error: result.stderr };
  }

  // gh issue create outputs the URL on success
  const url = result.stdout.trim();
  const numberMatch = url.match(/\/issues\/(\d+)/);
  return {
    created: true,
    url,
    number: numberMatch ? parseInt(numberMatch[1], 10) : null,
  };
}

/**
 * Update an existing issue (title, body, labels, milestone, state).
 *
 * IMPORTANT: This mutates shared state. Gated by execute flag.
 * Only called from github-sync when --update is passed.
 *
 * Unlike createIssue which uses `gh issue create`, this uses individual
 * `gh issue edit` calls because gh separates the operations.
 */
function updateIssue(
  number,
  { title, body, addLabels, removeLabels, milestone, state },
  { execute = false, dryRun = true, repo = null } = {}
) {
  if (dryRun || !execute) {
    const changes = [];
    if (title !== undefined) changes.push(`title`);
    if (body !== undefined) changes.push(`body`);
    if (addLabels && addLabels.length) changes.push(`+labels:${addLabels.join(',')}`);
    if (removeLabels && removeLabels.length) changes.push(`-labels:${removeLabels.join(',')}`);
    if (milestone !== undefined) changes.push(`milestone`);
    if (state !== undefined) changes.push(`state:${state}`);
    console.log(`   [dry-run] would update issue #${number} (${changes.join(', ')})`);
    return { dryRun: true, number };
  }

  const errors = [];

  // Build the edit args
  const args = ['issue', 'edit', String(number)];
  if (repo) args.push('--repo', repo);
  if (title !== undefined) args.push('--title', title);
  if (body !== undefined) args.push('--body', body);
  if (milestone !== undefined) {
    if (milestone === null) {
      args.push('--remove-milestone');
    } else {
      args.push('--milestone', String(milestone));
    }
  }
  if (addLabels && addLabels.length) {
    for (const label of addLabels) args.push('--add-label', label);
  }
  if (removeLabels && removeLabels.length) {
    for (const label of removeLabels) args.push('--remove-label', label);
  }

  if (args.length > 3 + (repo ? 2 : 0)) {
    const result = runGh(args, { allowFailure: true });
    if (result.status !== 0) errors.push(`edit: ${result.stderr}`);
  }

  // State change is a separate command (close/reopen)
  if (state === 'closed') {
    const closeArgs = ['issue', 'close', String(number)];
    if (repo) closeArgs.push('--repo', repo);
    const result = runGh(closeArgs, { allowFailure: true });
    if (result.status !== 0) errors.push(`close: ${result.stderr}`);
  } else if (state === 'open') {
    const openArgs = ['issue', 'reopen', String(number)];
    if (repo) openArgs.push('--repo', repo);
    const result = runGh(openArgs, { allowFailure: true });
    if (result.status !== 0) errors.push(`reopen: ${result.stderr}`);
  }

  if (errors.length > 0) {
    return { error: errors.join('; ') };
  }
  return { updated: true, number };
}

/**
 * Update an existing milestone (title, description, state).
 */
function updateMilestone(
  number,
  { title, description, state, dueDate },
  { execute = false, dryRun = true, repo = null } = {}
) {
  if (dryRun || !execute) {
    console.log(`   [dry-run] would update milestone #${number}`);
    return { dryRun: true, number };
  }

  const repoFlag = repo ? `/repos/${repo}` : '/repos/{owner}/{repo}';
  const args = ['api', '--method', 'PATCH', `${repoFlag}/milestones/${number}`];
  if (title !== undefined) args.push('-f', `title=${title}`);
  if (description !== undefined) args.push('-f', `description=${description}`);
  if (state !== undefined) args.push('-f', `state=${state}`);
  if (dueDate !== undefined) {
    if (dueDate === null) {
      args.push('-f', 'due_on=');
    } else {
      args.push('-f', `due_on=${dueDate}`);
    }
  }

  const result = runGh(args, { allowFailure: true });
  if (result.status !== 0) {
    return { error: result.stderr };
  }
  return { updated: true, number };
}

// ---------- Projects v2 (optional — for advanced users) ----------

function listProjects(owner, { execute = true } = {}) {
  // Read-only, no execute guard needed
  const result = runGh(
    ['project', 'list', '--owner', owner, '--format', 'json'],
    { allowFailure: true }
  );
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    return null;
  }
}

function createProject(owner, title, { execute = false, dryRun = true } = {}) {
  if (dryRun || !execute) {
    console.log(`   [dry-run] would create Project v2: "${title}" (owner: ${owner})`);
    return { dryRun: true, title };
  }

  const result = runGh(
    ['project', 'create', '--owner', owner, '--title', title, '--format', 'json'],
    { allowFailure: true }
  );
  if (result.status !== 0) {
    return { error: result.stderr };
  }
  return JSON.parse(result.stdout);
}

function addIssueToProject(projectNumber, owner, issueUrl, { execute = false, dryRun = true } = {}) {
  if (dryRun || !execute) {
    console.log(`   [dry-run] would add ${issueUrl} to project ${projectNumber}`);
    return { dryRun: true };
  }

  const result = runGh(
    [
      'project', 'item-add',
      '--owner', owner,
      String(projectNumber),
      '--url', issueUrl,
      '--format', 'json',
    ],
    { allowFailure: true }
  );
  if (result.status !== 0) {
    return { error: result.stderr };
  }
  return JSON.parse(result.stdout);
}

// ---------- Rate limit awareness ----------

function getRateLimit() {
  try {
    const result = runGh(['api', 'rate_limit'], { allowFailure: true });
    if (result.status !== 0) return null;
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

module.exports = {
  runGh,
  checkAuth,
  detectRepo,
  ensureLabel,
  createMilestone,
  updateMilestone,
  getIssue,
  createIssue,
  updateIssue,
  listProjects,
  createProject,
  addIssueToProject,
  getRateLimit,
};
