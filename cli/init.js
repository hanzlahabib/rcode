/**
 * rihal-code init — scaffold .rihal/ AND install skills/commands for multiple AI editors
 *
 * Discovery paths by editor:
 *   • Claude Code:    .claude/skills/     + .claude/commands/rihal/
 *   • Cursor:         .cursor/rules/      (.mdc files)
 *   • Windsurf:       .windsurf/rules/    (same .mdc format as Cursor)
 *   • Antigravity:    .antigravity/agents/ (follows AGENTS.md spec)
 *   • OpenAI Codex:   AGENTS.md (appended) + ~/.codex/ agents dir
 *   • Universal:      AGENTS.md at project root (standard)
 *
 * State directory:
 *   • .rihal/             — project state (git-friendly)
 *
 * Flags:
 *   --editor=claude|cursor|windsurf|antigravity|codex|all   (default: all)
 */

const fs = require('fs');
const path = require('path');

const RIHAL_DIRS = [
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

const CLAUDE_DIRS = [
  '.claude/skills',
  '.claude/commands/rihal',
];

function initStateFile() {
  return (
    JSON.stringify(
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
    ) + '\n'
  );
}

const STATE_FILES = {
  '.rihal/state.json': initStateFile(),

  '.rihal/context/active.md': `# Active Context

## Project
{fill this in}

## Phase
Not started

## Goal
{what are you building, why}

## Last completed
- Project initialized

## In progress
- Waiting for first task

## Blockers
- None

## Next steps
- Run the kickoff: /rihal:kickoff
- Or convene the Majlis: /rihal:convene "your strategic question"
`,

  '.rihal/README.md': `# .rihal/ — Project State

Managed by Rihal Code.

## Structure
- \`state.json\` — current project state
- \`phases/\` — phase briefs, sprints, stories
- \`decisions/\` — ADRs
- \`artifacts/\` — design system, pitch decks, reviews, bugs
- \`progress/\` — logs, retros, dispatch plans, Majlis sessions
- \`context/active.md\` — compacted context (under 2000 tokens)

## Slash Commands (Claude Code)
- \`/rihal:team\` — list the team
- \`/rihal:convene <question>\` — multi-agent Majlis
- \`/rihal:dispatch <request>\` — route to the right specialist
- \`/rihal:kickoff\` — start a new phase
- \`/rihal:dashboard\` — start the Diwan dashboard

## CLI
- \`npx github:hanzlahabib/rihal-code dashboard\`
- \`npx github:hanzlahabib/rihal-code team\`
- \`npx github:hanzlahabib/rihal-code doctor\`
`,
};

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

/**
 * Install skills into .claude/skills/ so Claude Code can auto-discover them.
 * We install BOTH agent skills and action skills with namespaced prefixes so
 * they don't clash with other installed skills.
 */
function installSkills(packageRoot, cwd) {
  const skillsSource = path.join(packageRoot, 'rihal/skills');
  const skillsDest = path.join(cwd, '.claude/skills');

  if (!fs.existsSync(skillsSource)) {
    console.log(`   ⚠ rihal/skills/ not found in package`);
    return 0;
  }

  fs.mkdirSync(skillsDest, { recursive: true });
  let count = 0;

  // Copy agent skills
  const agentsDir = path.join(skillsSource, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const src = path.join(agentsDir, entry.name);
      const dest = path.join(skillsDest, `rihal-${entry.name}`);
      copyDirRecursive(src, dest);
      count++;
    }
  }

  // Copy action skills
  const actionsDir = path.join(skillsSource, 'actions');
  if (fs.existsSync(actionsDir)) {
    for (const entry of fs.readdirSync(actionsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'research') {
        // Handle research sub-directory
        const researchDir = path.join(actionsDir, 'research');
        for (const sub of fs.readdirSync(researchDir, { withFileTypes: true })) {
          if (!sub.isDirectory()) continue;
          const src = path.join(researchDir, sub.name);
          const dest = path.join(skillsDest, sub.name);
          copyDirRecursive(src, dest);
          count++;
        }
        continue;
      }
      const src = path.join(actionsDir, entry.name);
      const dest = path.join(skillsDest, entry.name);
      copyDirRecursive(src, dest);
      count++;
    }
  }

  return count;
}

/**
 * Create slash commands in .claude/commands/rihal/ that Claude Code auto-discovers.
 * Each command is a markdown file with frontmatter defining the command entry point.
 */
function installSlashCommands(packageRoot, cwd) {
  const commandsDir = path.join(cwd, '.claude/commands/rihal');
  fs.mkdirSync(commandsDir, { recursive: true });

  const commands = {
    'team.md': `---
name: rihal:team
description: List the full Rihal team roster with roles and authorities
allowed-tools:
  - Read
  - Bash
---

Read \`.claude/skills/rihal-*-*/SKILL.md\` (all installed agent skills) and produce a clean table of the team roster showing: Agent name, Arabic name, Role, Authority domain. Also show the currently loaded model profile from \`.rihal/config.json\` if present.

Do NOT load full SKILL.md content — just the YAML frontmatter for each.
`,

    'convene.md': `---
name: rihal:convene
description: Convene the Majlis on a cross-domain question — sequential multi-agent consultation
argument-hint: <strategic question>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

Convene the Rihal Majlis on this question: **$ARGUMENTS**

Follow the sequential chain protocol in \`.claude/skills/rihal-majlis-council/SKILL.md\` (the Majlis agent skill) and the detailed workflow in the package's \`rihal/workflows/majlis-sequential/instructions.md\`.

Steps:
1. Frame the question clearly
2. Determine council scope (full 13-agent or narrowed technical/business/design)
3. Load agent digests from \`rihal/digests/\` (lean summaries, not full SKILL.md)
4. Dispatch agents SEQUENTIALLY — each agent reads previous agent responses before adding their own
5. Collect structured positions (position / confidence / key reason / conditions)
6. Synthesize with explicit dissent surfaced (never buried)
7. Save full session to \`.rihal/progress/majlis-$(date +%Y-%m-%d)-<slug>.md\`
8. Present synthesis inline with decision owner named

Use the model profile from \`.rihal/config.json\` or default to \`balanced\`. Strategic agents (Sadiq, Waleed, Majlis) use opus; executors use sonnet.
`,

    'dispatch.md': `---
name: rihal:dispatch
description: Route a request to the right Rihal specialist via Raees (orchestration director)
argument-hint: <request>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

Route this request through Raees (orchestration director): **$ARGUMENTS**

1. Load \`.claude/skills/rihal-raees-orchestrator/SKILL.md\` for the Raees persona and dispatch matrix
2. Identify the primary owner from the matrix
3. Check dependencies and parallel opportunities
4. Build a numbered execution sequence with owners
5. Save the dispatch plan to \`.rihal/progress/dispatch-$(date +%Y-%m-%d).md\`
6. Present to user and ask confirmation before executing
`,

    'kickoff.md': `---
name: rihal:kickoff
description: Start a new project phase — Memory Bank setup with Sadiq, Waleed, Hussain-PM, Layla
allowed-tools:
  - Read
  - Write
  - Bash
---

Start a new Rihal Code phase. Follow the workflow in \`rihal/workflows/kickoff/instructions.md\`.

Steps:
1. Initialize \`.rihal/\` directories if missing
2. Load Sadiq (strategist) — ask: what problem, who for, kill criteria
3. Load Waleed (CTO) — lock tech stack, write ADR
4. Load Hussain-PM — break into 3-5 sprints
5. Load Layla — define design system baseline
6. Update \`.rihal/state.json\` with new phase
7. Create \`.rihal/context/active.md\` with phase summary
`,

    'dashboard.md': `---
name: rihal:dashboard
description: Start the Diwan view-only dashboard server
allowed-tools:
  - Bash
---

Start the Rihal Code dashboard (Diwan) on http://localhost:7717

\`\`\`bash
npx --yes github:hanzlahabib/rihal-code dashboard
\`\`\`

The dashboard scans \`.rihal/\` in the current working directory and shows phases, progress, decisions, team roster, and active context. View-only — no writes.

Stop with: \`kill $(lsof -t -i:7717)\`
`,

    'status.md': `---
name: rihal:status
description: Show current project status from .rihal/ state
allowed-tools:
  - Read
  - Bash
  - Glob
---

Read \`.rihal/state.json\` and \`.rihal/context/active.md\` and show a concise project status:

- Current phase
- Active agents
- Last 3 entries from \`.rihal/progress/\`
- Latest decisions from \`.rihal/decisions/\`
- Any blockers or risks flagged

Keep under 300 words. Do not load full file contents — just headers and summaries.
`,

    'progress.md': `---
name: rihal:progress
description: Check project progress, show situational awareness, and route to the next action
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

<objective>
Provide situational awareness: where the project stands, what's been done, what's next. Then route to the right action (execute, convene, kickoff, or stop for user input).
</objective>

<process>

1. **Load state** — Read \`.rihal/state.json\` for current phase, active agents, and counters.

2. **Scan progress/** — List latest 10 files in \`.rihal/progress/\` (dispatch plans, Majlis sessions, status reports, retros).

3. **Scan decisions/** — List latest 5 ADRs in \`.rihal/decisions/\`.

4. **Scan current phase** — Read \`.rihal/phases/{current_phase}/brief.md\` and \`sprints.md\` if present.

5. **Check active context** — Read \`.rihal/context/active.md\`.

6. **Summarize in this exact structure:**

   \`\`\`
   # Rihal Code — Progress Report ({date})

   ## Where we are
   - Project: {name}
   - Current phase: {phase}
   - Active agents: {list}

   ## Recent work (last 5 days)
   - {date}: {entry}

   ## Decisions made
   - {ADR title} ({date})

   ## What's next
   - {suggested next action}

   ## Recommended command
   → /rihal:{command} {args}
   \`\`\`

7. **Route to next action** based on state:
   - No current phase → suggest \`/rihal:kickoff\`
   - Phase but no sprint plan → suggest \`/rihal:dispatch "plan the first sprint"\`
   - Sprint has unstarted stories → suggest \`/rihal:next\`
   - Stories in progress but blockers → suggest \`/rihal:convene "how to unblock X"\`
   - Sprint complete → suggest \`/rihal:discuss "retro"\`

Keep the report under 500 words. This is a quick check-in, not a full audit.

</process>
`,

    'next.md': `---
name: rihal:next
description: Automatically advance to the next logical step in the Rihal workflow
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---

<objective>
Detect the current project state and automatically invoke the next logical step. No arguments needed — reads \`.rihal/state.json\`, the current phase, and recent progress to determine what comes next.

Designed for rapid workflow — remembering which phase/step you're on is overhead.
</objective>

<process>

1. **Read state**:
   - \`.rihal/state.json\` — current phase, active agents
   - \`.rihal/phases/{current}/sprints.md\` — sprint status
   - \`.rihal/phases/{current}/stories/\` — story files and their statuses
   - \`.rihal/progress/\` — latest entries

2. **Decision tree:**

   - **No \`.rihal/\` state** → run \`/rihal:kickoff\`
   - **No current phase** → ask user which phase, or run \`/rihal:kickoff\`
   - **Phase has no sprints.md** → invoke Hussain-SM via \`rihal-sprint-planning\` skill
   - **Sprint has unstarted story** → invoke Omar/Haitham via \`rihal-dev-story\` on the next story
   - **All stories in progress** → ask user which to pick up, or run \`/rihal:convene "unblock the sprint"\`
   - **Stories marked ready-for-review** → invoke Omar via \`rihal-code-review\`
   - **Review done, release pending** → invoke Fatima via \`rihal-qa-generate-e2e-tests\` + release gate
   - **Release gate GO** → invoke Khalid via \`rihal-ship-it\`
   - **Sprint complete** → invoke Hussain-SM via \`rihal-retrospective\`
   - **Phase complete (all sprints done)** → prompt user: mark phase complete + \`/rihal:kickoff\` next phase

3. **Report the decision to the user BEFORE executing:**

   \`\`\`
   Current state: {state summary}
   Next action:   {what I'm about to do}
   Will invoke:   {skill or command}

   Proceed? (yes / different action / stop)
   \`\`\`

4. **Wait for confirmation.** Do NOT auto-execute destructive or scope-expanding actions.

5. **Execute the chosen action** by invoking the appropriate skill or slash command.

</process>
`,

    'quick.md': `---
name: rihal:quick
description: Execute a quick task with Rihal Code guarantees (atomic commits, state tracking) but skip optional agents
argument-hint: <task description>
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - SlashCommand
---

<objective>
Execute a small task end-to-end with minimal ceremony. Skip Majlis consultation, skip full sprint planning, skip retrospectives. Just do the work, commit atomically, and update \`.rihal/progress/\`.

For bigger tasks, use \`/rihal:dispatch\` or \`/rihal:convene\` instead.
</objective>

<when_to_use>

- ✅ Small bug fix (under 50 lines)
- ✅ Copy change, config tweak, single dependency update
- ✅ Rename or refactor that's obviously safe
- ✅ Documentation update
- ✅ Test fix

Do NOT use for:

- ❌ Architecture changes (use \`/rihal:convene\` + ADR)
- ❌ New features (use \`/rihal:dispatch\`)
- ❌ Breaking changes (use \`/rihal:convene\`)
- ❌ Cross-team coordination (use Raees via \`/rihal:dispatch\`)

</when_to_use>

<process>

1. **Parse the task** from $ARGUMENTS. If unclear, ask ONE clarifying question.

2. **Pre-flight:**
   - \`git status\` — any uncommitted changes? If yes, ask user to stash/commit first.
   - Identify the exact files that will change (glob before editing)

3. **Load minimal context:**
   - Only the files being modified + their direct importers
   - Do NOT load \`.rihal/\` state or agent files
   - Do NOT invoke any Rihal agent unless the task explicitly needs one

4. **Make the change.** One atomic edit. No "while I'm here" improvements.

5. **Verify:**
   - Run tests if the project has them
   - \`git diff\` — confirm the change matches the task
   - Check for unintended side effects

6. **Commit atomically:**
   \`\`\`bash
   git add {specific files}
   git commit -m "{type}({scope}): {subject}"
   \`\`\`
   Follow Conventional Commits. No AI attribution in messages.

7. **Log to progress:**
   - Append one line to \`.rihal/progress/quick-tasks.md\` with date, task, and commit hash

8. **Report:**
   \`\`\`
   ✅ Quick task complete
   Files changed: {list}
   Commit: {sha} {message}
   Tests: {PASS / SKIPPED / FAIL}
   \`\`\`

9. **Do NOT push.** Per AGENTS.md rules, pushes require explicit per-action approval.

</process>
`,

    'fix.md': `---
name: rihal:fix
description: Systematic debugging with the Rihal team — gather symptoms, form hypothesis, test, fix
argument-hint: <issue description>
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Edit
  - SlashCommand
---

<objective>
Debug an issue using the scientific method. Gather symptoms, form a hypothesis, design a falsifying test, run it, and iterate. Use Fatima for test design and Omar/Haitham/Yousef for the actual fix, depending on the layer.
</objective>

<process>

1. **Capture the issue** from $ARGUMENTS. Ask for:
   - Reproduction steps (exact)
   - Expected behavior
   - Actual behavior
   - Environment (OS, browser, version)
   - Recent changes that might be related
   - Error messages or logs (paste verbatim)

   If the user has not provided enough, ask for it before proceeding.

2. **Classify the severity:**
   - **Critical:** blocks users, data loss risk, security issue → escalate to Fatima (release gate)
   - **High:** significant user impact → proceed with fix
   - **Medium:** minor impact, workaround exists → schedule via \`/rihal:dispatch\`
   - **Low:** cosmetic or edge case → consider logging and deferring

3. **Reproduce the bug FIRST.** If you cannot reproduce it reliably, debugging is guesswork. Document the exact reproduction sequence.

4. **Form ONE hypothesis at a time.** Write it down:
   > "I hypothesize that [cause], which would explain [symptoms]."

5. **Design a test that could falsify the hypothesis.** A good test is one where both outcomes (pass/fail) give you information.

6. **Run the test. Observe.** Update the hypothesis or proceed.

7. **Once the root cause is identified:**
   - Pick the right agent for the fix:
     - Frontend bug → Haitham
     - Backend bug → Yousef
     - ML/data bug → Zayd
     - Infra/deploy bug → Khalid
     - Cross-layer → Omar
   - Load that agent's skill
   - Apply the minimum fix that addresses the root cause

8. **Verify the fix:**
   - Run the original reproduction — should no longer reproduce
   - Run related tests
   - Consider adding a regression test (Fatima)

9. **Commit atomically** with a \`fix(scope): subject\` conventional commit message.

10. **Log the debug session** to \`.rihal/progress/debug-$(date +%Y-%m-%d)-{slug}.md\` with:
    - Symptoms
    - Root cause
    - Fix summary
    - Regression test added
    - Time spent

11. **If the bug was caused by a missing process** (no test, no gate, no review), flag it for discussion in next retro.

</process>
`,

    'discuss.md': `---
name: rihal:discuss
description: Structured discussion on a topic — adaptive questioning before taking action
argument-hint: <topic>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Gather context through adaptive questioning before committing to a decision or plan. Use this when you have a half-formed idea and need the Rihal team to help clarify it BEFORE Majlis convenes or Raees dispatches.

Think of this as "pre-Majlis" — get your thinking straight first.
</objective>

<when_to_use>

- You have an idea but are not sure if it's worth building
- You need to frame a decision before asking the council
- You want to surface assumptions before committing
- The problem is fuzzy and needs to be sharpened
- Multiple competing ideas and you want to compare them

For structured multi-agent synthesis, use \`/rihal:convene\` instead.
For routing a clear request, use \`/rihal:dispatch\` instead.

</when_to_use>

<process>

1. **Read the topic** from $ARGUMENTS. If no topic, ask what we are discussing.

2. **Frame the discussion:**
   - What kind of question is this? (strategy / architecture / product / design / process)
   - What decision are we trying to make?
   - What is the reversibility? (one-way door vs two-way door)
   - What are the constraints (time, budget, team capacity)?

3. **Ask 3-5 adaptive questions** to surface context. Examples depending on topic type:

   **Strategy topic:**
   - Who specifically would use this?
   - What do they do today without it?
   - What would make us kill this in 3 months?

   **Architecture topic:**
   - Expected scale and lifetime?
   - Team experience with the candidate stacks?
   - Integration with existing systems?

   **Product topic:**
   - What user outcome are we trying to create?
   - How will we measure success?
   - What's the smallest thing that validates the assumption?

   **Process topic:**
   - What is the current process?
   - Where does it break?
   - What would "better" look like concretely?

4. **Listen.** Do not skip this step. The user's answers are data.

5. **Synthesize what you heard:**
   - Restate the problem in your own words
   - List the constraints
   - List the open questions

6. **Recommend a next action:**
   - **Clear enough to plan?** → \`/rihal:dispatch "{framed request}"\`
   - **Needs multi-agent synthesis?** → \`/rihal:convene "{framed question}"\`
   - **Still fuzzy?** → another round of \`/rihal:discuss\`
   - **Actually two problems?** → split and discuss each separately
   - **Not worth pursuing?** → document why and archive

7. **Save the discussion** to \`.rihal/progress/discuss-$(date +%Y-%m-%d)-{slug}.md\`:

   \`\`\`markdown
   # Discussion — {topic}

   **Date:** {date}
   **Reversibility:** {one-way / two-way}

   ## Framing
   {restated problem}

   ## Constraints
   - {constraint 1}

   ## Open questions
   - {question 1}

   ## Recommended next action
   {command to run next}
   \`\`\`

</process>
`,

    'help.md': `---
name: rihal:help
description: Show available Rihal Code commands and workflows
allowed-tools:
  - Read
  - Glob
---

Show all available Rihal Code slash commands, agent skills, and workflows.

**Workflow Commands:**
- \`/rihal:kickoff\` — start a new phase
- \`/rihal:progress\` — situational awareness + route to next action
- \`/rihal:next\` — automatically advance to the next logical step
- \`/rihal:status\` — concise project status
- \`/rihal:discuss <topic>\` — structured discussion before committing
- \`/rihal:convene <question>\` — multi-agent Majlis consultation
- \`/rihal:dispatch <request>\` — route via Raees to the right specialist
- \`/rihal:quick <task>\` — execute a small task with atomic commit
- \`/rihal:fix <issue>\` — systematic debugging

**Utility Commands:**
- \`/rihal:team\` — list the team roster
- \`/rihal:dashboard\` — start the Diwan view-only dashboard
- \`/rihal:help\` — this message

**Agents** (load via \`.claude/skills/rihal-<agent>/SKILL.md\` or invoke by name):
- Strategy: Sadiq
- Leadership: Waleed (CTO), Ahmed Al Hassani (Tech Director), Nasser (Eng Manager)
- Product: Hussain (PM + SM)
- Design: Layla (UX), Zahra (Branding)
- Engineering: Omar (full-stack), Haitham (FE), Yousef (BE), Zayd (ML)
- Quality & Ops: Fatima (QA), Khalid (DevOps)
- Content: Noor (writer), Mariam (marketing)
- Meta: Raees (orchestrator), Majlis (council), Diwan (dashboard)

**Common patterns:**
- Just started? → \`/rihal:kickoff\`
- Coming back after a break? → \`/rihal:progress\`
- Unsure what to do next? → \`/rihal:next\`
- Have a quick task? → \`/rihal:quick "description"\`
- Have a bug? → \`/rihal:fix "description"\`
- Stuck on a decision? → \`/rihal:discuss "topic"\` then \`/rihal:convene\`
- Need multi-agent perspective? → \`/rihal:convene "question"\`
`,
  };

  let count = 0;
  for (const [file, content] of Object.entries(commands)) {
    fs.writeFileSync(path.join(commandsDir, file), content);
    count++;
  }
  return count;
}

/**
 * Install skills as Cursor rules (.cursor/rules/*.mdc)
 */
function installCursorRules(packageRoot, cwd) {
  const digestsDir = path.join(packageRoot, 'rihal/digests');
  const rulesDir = path.join(cwd, '.cursor/rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  if (!fs.existsSync(digestsDir)) return 0;

  let count = 0;
  for (const file of fs.readdirSync(digestsDir)) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const agent = file.replace('.md', '');
    const digestContent = fs.readFileSync(path.join(digestsDir, file), 'utf8');

    // Convert digest markdown → Cursor .mdc with frontmatter
    const mdc = `---
description: Rihal Code ${agent} agent — activates on @${agent} or when the user asks to consult ${agent}
globs: []
alwaysApply: false
---

# ${agent.toUpperCase()} — Rihal Code Agent

This rule activates when the user types \`@${agent}\` or asks to talk to ${agent}, consult ${agent}, or invoke ${agent}'s expertise.

${digestContent}

## Activation

When activated, adopt the ${agent} persona fully. Follow the principles and authority listed above. Defer to other agents on their domains. For deep agent behavior, load the full skill file from \`.claude/skills/rihal-${agent}-*/SKILL.md\` if present.
`;
    fs.writeFileSync(path.join(rulesDir, `rihal-${agent}.mdc`), mdc);
    count++;
  }

  // Meta rule: Rihal Code overview (always on)
  const overviewMdc = `---
description: Rihal Code — 19 specialized agents for AI-assisted team development
globs: []
alwaysApply: true
---

# Rihal Code Active

This project uses the Rihal Code — a context-aware AI team methodology with 19 specialized agents.

When the user invokes an agent by name (@waleed, @sadiq, @haitham, etc.) or asks strategic/cross-domain questions, load the matching rule from \`.cursor/rules/rihal-*.mdc\` and follow the agent's persona strictly.

For multi-agent questions, run the sequential Majlis protocol — consult agents one at a time in dependency order, each reading previous responses before adding their own position.

Full state lives in \`.rihal/\` directory.
Team roster: \`.rihal/team.yaml\` or \`rihal/digests/*.md\` in the package.
Model profiles: \`.rihal/model-profiles.json\` (quality / balanced / budget / inherit).

Available agents: sadiq, waleed, ahmed-hassani, nasser, hussain-pm, hussain-sm, layla, zahra, omar, haitham, yousef, zayd, fatima, khalid, noor, mariam, raees, majlis, diwan.
`;
  fs.writeFileSync(path.join(rulesDir, 'rihal-code.mdc'), overviewMdc);
  count++;

  return count;
}

/**
 * Install as Windsurf rules (same .mdc format as Cursor, different directory)
 */
function installWindsurfRules(packageRoot, cwd) {
  const rulesDir = path.join(cwd, '.windsurf/rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  // Copy from .cursor/rules/ if they already exist (created by installCursorRules)
  const cursorRulesDir = path.join(cwd, '.cursor/rules');
  if (!fs.existsSync(cursorRulesDir)) return 0;

  let count = 0;
  for (const file of fs.readdirSync(cursorRulesDir)) {
    if (!file.startsWith('rihal') || !file.endsWith('.mdc')) continue;
    fs.copyFileSync(path.join(cursorRulesDir, file), path.join(rulesDir, file));
    count++;
  }
  return count;
}

/**
 * Install as Antigravity agents (follows AGENTS.md spec)
 */
function installAntigravityAgents(packageRoot, cwd) {
  const agentsDir = path.join(cwd, '.antigravity/agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const digestsDir = path.join(packageRoot, 'rihal/digests');
  if (!fs.existsSync(digestsDir)) return 0;

  let count = 0;
  for (const file of fs.readdirSync(digestsDir)) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const src = path.join(digestsDir, file);
    const dest = path.join(agentsDir, `rihal-${file}`);
    fs.copyFileSync(src, dest);
    count++;
  }
  return count;
}

/**
 * Create or append to project-level AGENTS.md (universal standard for Codex, Aider, etc.)
 */
function installUniversalAgentsMd(packageRoot, cwd) {
  const agentsMdPath = path.join(cwd, 'AGENTS.md');

  const rihalSection = `

---

## Rihal Code Agents (installed)

This project has the Rihal Code team installed. The following agents are available when the user invokes them by name:

| Agent | Role | Authority |
|---|---|---|
| sadiq | Director of Strategy | Strategic direction, market fit, kill criteria |
| waleed | CTO | Tech stack, architecture, security |
| ahmed-hassani | Technology & Development Director | Delivery discipline, engineering standards, DORA metrics |
| nasser | Software Engineering Manager | 1:1s, hiring, growth plans, burnout prevention |
| hussain-pm | Product Manager | PRDs, requirements, scope |
| hussain-sm | Scrum Master | Sprint ops, story preparation, retros |
| layla | Lead UX Designer | Interaction design, design system, accessibility |
| zahra | Branding & Creative Director | Brand identity, typography (Latin + Arabic), color systems |
| omar | Senior Full-Stack Engineer | Implementation, code review |
| haitham | Senior Frontend Engineer | React/Next.js, Arabic RTL, pixel-perfect UIs |
| yousef | Senior Backend Engineer | APIs, databases, integrations |
| zayd | Senior ML Engineer | ML models, Arabic NLP, LLM integration |
| fatima | QA Lead | Testing, release gating |
| khalid | DevOps | CI/CD, infra, monitoring |
| noor | Technical Writer | Docs, pitch decks, diagrams |
| mariam | Marketing Lead | GTM, positioning, case studies |
| raees | Orchestration Director | Work dispatch, sequencing, handoffs |
| majlis | Consulting Council | Multi-agent consultation with dissent surfaced |
| diwan | Dashboard Registry | View-only project transparency |

Full agent digests: \`rihal/digests/<agent>.md\` (in the package) or \`.claude/skills/rihal-<agent>-*/SKILL.md\`

When the user says "@waleed", "talk to waleed", or "consult the CTO", adopt the Waleed persona from his skill/digest. For cross-domain questions, run the Majlis sequential protocol.

Model profiles (.rihal/model-profiles.json): quality / balanced / budget / inherit.

State directory: \`.rihal/\` — phases, decisions, progress, artifacts, context.
`;

  if (fs.existsSync(agentsMdPath)) {
    const current = fs.readFileSync(agentsMdPath, 'utf8');
    if (current.includes('## Rihal Code Agents (installed)')) {
      return 'updated';
    }
    fs.writeFileSync(agentsMdPath, current + rihalSection);
    return 'appended';
  } else {
    fs.writeFileSync(
      agentsMdPath,
      `# AGENTS.md\n\nThis file provides context for AI coding agents working on this project.\n${rihalSection}`,
    );
    return 'created';
  }
}

function parseArgs(args) {
  const result = { editor: 'all' };
  for (const arg of args) {
    if (arg.startsWith('--editor=')) {
      result.editor = arg.slice('--editor='.length);
    }
  }
  return result;
}

module.exports = function init(args, { packageRoot }) {
  const cwd = process.cwd();
  const rihalDir = path.join(cwd, '.rihal');
  const opts = parseArgs(args);
  const editors = opts.editor === 'all'
    ? ['claude', 'cursor', 'windsurf', 'antigravity', 'universal']
    : [opts.editor];

  console.log(`\n🕌 Rihal Code — initializing in ${cwd}`);
  console.log(`   Target editors: ${editors.join(', ')}\n`);

  // ------ Stage 1: .rihal/ state directory ------
  if (fs.existsSync(rihalDir)) {
    console.log(`   ⚠ .rihal/ already exists — skipping state scaffolding`);
  } else {
    for (const dir of RIHAL_DIRS) {
      fs.mkdirSync(path.join(cwd, dir), { recursive: true });
    }
    for (const [file, content] of Object.entries(STATE_FILES)) {
      fs.writeFileSync(path.join(cwd, file), content);
    }
    console.log(`   ✓ .rihal/ state directory created`);
  }

  // Model profiles
  const profilesSource = path.join(packageRoot, 'rihal/config/model-profiles.json');
  const profilesDest = path.join(cwd, '.rihal/model-profiles.json');
  if (fs.existsSync(profilesSource) && !fs.existsSync(profilesDest)) {
    fs.copyFileSync(profilesSource, profilesDest);
    console.log(`   ✓ model-profiles.json copied`);
  }

  // ------ Stage 2: Editor-specific installs ------

  if (editors.includes('claude')) {
    const skillsDir = path.join(cwd, '.claude/skills');
    if (!fs.existsSync(skillsDir) || !fs.readdirSync(skillsDir).some((d) => d.startsWith('rihal-'))) {
      fs.mkdirSync(skillsDir, { recursive: true });
      const skillCount = installSkills(packageRoot, cwd);
      console.log(`   ✓ claude  → ${skillCount} skills in .claude/skills/`);
      const cmdCount = installSlashCommands(packageRoot, cwd);
      console.log(`   ✓ claude  → ${cmdCount} slash commands in .claude/commands/rihal/`);
    } else {
      console.log(`   ⚠ claude  → .claude/skills/rihal-* already exist, skipping`);
    }
  }

  if (editors.includes('cursor')) {
    const cursorCount = installCursorRules(packageRoot, cwd);
    console.log(`   ✓ cursor  → ${cursorCount} rules in .cursor/rules/`);
  }

  if (editors.includes('windsurf')) {
    const windsurfCount = installWindsurfRules(packageRoot, cwd);
    console.log(`   ✓ windsurf → ${windsurfCount} rules in .windsurf/rules/`);
  }

  if (editors.includes('antigravity')) {
    const agCount = installAntigravityAgents(packageRoot, cwd);
    console.log(`   ✓ antigravity → ${agCount} agents in .antigravity/agents/`);
  }

  if (editors.includes('universal') || editors.includes('all')) {
    const result = installUniversalAgentsMd(packageRoot, cwd);
    console.log(`   ✓ universal → AGENTS.md ${result}`);
  }

  // ------ Stage 3: CLAUDE.md (only if Claude being installed and user doesn't have one) ------
  if (editors.includes('claude')) {
    const claudeMdDest = path.join(cwd, 'CLAUDE.md');
    if (!fs.existsSync(claudeMdDest)) {
      const claudeMdSource = path.join(packageRoot, 'rihal/templates/claude-md-starter.md');
      if (fs.existsSync(claudeMdSource)) {
        fs.copyFileSync(claudeMdSource, claudeMdDest);
        console.log(`   ✓ CLAUDE.md created`);
      }
    }
  }

  console.log(`
✅ Rihal Code installed.

Editor usage:

  Claude Code:
    /rihal:help                       — show all commands
    /rihal:team                       — list the team
    /rihal:convene "your question"    — multi-agent Majlis
    /rihal:dispatch "your request"    — route via Raees

  Cursor / Windsurf:
    @waleed                           — invoke the CTO
    @sadiq                            — invoke the strategist
    @zahra                            — invoke the branding director
    (19 agents total — see .cursor/rules/ or .windsurf/rules/)

  Antigravity:
    Agents loaded from .antigravity/agents/

  Any editor reading AGENTS.md:
    The Rihal team roster is in project-level AGENTS.md

Dashboard (any editor, runs outside):
  npx github:hanzlahabib/rihal-code dashboard

State: .rihal/
Model profiles: .rihal/model-profiles.json (quality / balanced / budget / inherit)

Change profile: npx github:hanzlahabib/rihal-code set-profile balanced
Show models:    npx github:hanzlahabib/rihal-code show-model
`);
};
