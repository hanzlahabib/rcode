# FAQ: Frequently Asked Questions

Answers to common questions about Rihal Code.

---

## Installation & Setup

### Q: Why doesn't `/rihal:do` appear after installing?

**A:** Restart your IDE.

Rihal installs commands by writing to `.claude/commands/rihal/` and `.claude/settings.json`. IDEs typically scan these files only on startup. After install:

- **Claude Code:** Restart from Command Palette
- **Cursor:** Reload window
- **Gemini CLI:** Start a new session

---

### Q: Can I install just the council without execution?

**A:** Yes, use the `core` module:

```bash
node /tmp/rihal-src/cli/install-v2.js . --yes --module core
```

This gives you:
- 5 council agents
- `/rihal:council`, `/rihal:discuss`, `/rihal:status`
- State management

Then add execution later:
```bash
node /tmp/rihal-src/cli/install-v2.js . --yes --module execution --force
```

---

### Q: Does Rihal require any npm dependencies?

**A:** No. Rihal ships as pure files (Markdown, YAML, Node.js binary). Zero npm dependency.

The installer is a single Node.js script (`cli/install-v2.js`) that copies files. You don't `npm install` anything.

---

### Q: Can I install Rihal into a project that already has other agents?

**A:** Yes. Rihal installs into `.claude/agents/` and `.claude/commands/rihal/`, which don't conflict with your existing agents.

Your existing agents stay untouched. Rihal agents are namespaced under `rihal-*`.

---

## Usage & Commands

### Q: When should I use council vs. discuss vs. chain?

**A:** See `docs/three-modes.md` for detailed comparison. Quick version:

- **Council** — Strategic decision ("should we?" "yes or no?")
- **Chain** — Building something step-by-step (research → scope → plan)
- **Discuss** — Quick question for one expert

Start with `/rihal:do` — it routes you based on state.

---

### Q: How do I know which command to run next?

**A:** Run `/rihal:do`.

It's the interactive router. Based on your project state, it suggests what you should do next:
- Fresh project? → Suggest new-project or research
- Have a decision? → Suggest council
- Have a plan? → Suggest execute
- Stuck? → Suggest pause-work or correct-course

---

### Q: Why didn't my command work?

**A:** Check intent guard output.

Every Rihal workflow has a "Step 0.5" that detects mismatched intent. If you run the wrong command, you get a single-line copy-paste redirect:

```
/rihal:plan should we use postgres or mongo?
⚠ That's a decision question, not a planning input.
Copy-paste this instead:
/rihal:council should we use postgres or mongo?
```

---

### Q: Can I customize which agents appear in a council?

**A:** Yes, two ways:

**Option 1: Override panel for one council**
```
/rihal:council --agents=waleed,fatima,sadiq should we migrate to serverless?
```

**Option 2: See scoring breakdown (why agents were picked)**
```
/rihal:council --explain "should we hire a DevOps person?"
```

Shows which agents scored highest and why. Used this to tune scoring.

---

### Q: What does "Intent guard" mean?

**A:** Step 0.5 of every workflow detects if you're asking the wrong command.

Examples:
- Ask `/rihal:plan` a decision question → redirects to `/rihal:council`
- Ask `/rihal:council` "how do I implement X?" → redirects to `/rihal:discuss` or `/rihal:chain`
- Ask `/rihal:execute` without a plan → redirects to `/rihal:plan`

Catches mistakes early with a copy-paste fix.

---

## Agents & Customization

### Q: Can I create my own agents?

**A:** Yes. Create a file at:

```
~/.rihal/agents/rihal-<name>.md
```

Format:
```markdown
---
name: rihal-my-expert
alias: my-expert
role: Your custom role
model: claude-opus-4-20250514
constraints: |
  - Think in terms of [X]
  - Focus on [Y]
  - Always consider [Z]
---

## Persona

You are an expert in [domain]. Your job is to [purpose].

When someone asks you something, [how you respond].

## Response style

[Instructions for tone, format, depth]

## Out of scope

- This topic
- This other topic
```

Then use it:
```
/rihal:discuss my-expert should we use this library?
/rihal:chain my-expert,waleed,planner "your topic"
```

---

### Q: Where are the agent definitions?

**A:** In two places:

**Project-local agents:**
```
.claude/agents/rihal-*.md
```
Installed with Rihal. Only these three:
- `rihal-sadiq.md`
- `rihal-waleed.md`
- `rihal-fatima.md`

**Global agents (for customization):**
```
~/.rihal/agents/rihal-*.md
```
Create your own here. They appear alongside project-local agents.

---

### Q: Why only 3 council agents installed if there are 5?

**A:** v2-prototype ships with 3 primary council agents (Sadiq, Waleed, Fatima). Mariam and Hussain-PM are specialist agents, not first-class council members.

The panel scorer may suggest them, but they're not installed as subagents yet. Roadmap includes all 5 as first-class council members.

**Workaround:** Add them yourself:
1. Copy a council agent (e.g., `rihal-waleed.md`)
2. Customize for Mariam/Hussain-PM
3. Save as `.claude/agents/rihal-mariam.md`

---

## State & Recovery

### Q: How do I save my progress if I have to stop?

**A:** Use `/rihal:pause-work`:

```
/rihal:pause-work
```

Creates:
- `.rihal/HANDOFF.json` — machine-readable context
- `.planning/.continue-here.md` — human-readable summary

Later, resume with:
```
/rihal:resume-work
```

---

### Q: What if state.json gets corrupted?

**A:** Run health check:

```
/rihal:health --fix
```

Detects and auto-fixes:
- Malformed JSON
- Missing artifacts
- Stale locks
- Invalid timestamps

If `--fix` doesn't work, check git history:
```
git log --oneline .rihal/state.json
git show HEAD~1:.rihal/state.json
```

---

### Q: Can I undo the last execution?

**A:** Yes, use `/rihal:undo`:

```
/rihal:undo
```

Reverts:
- Last phase marked incomplete
- Commits from that phase
- Updates state

**Keep artifacts:** Add `--keep-artifacts` to preserve markdown files.

---

### Q: How do I recover from a failed phase?

**A:** Run `/rihal:correct-course`:

```
/rihal:correct-course
```

Analyzes the failure and suggests:
1. Rollback to previous phase
2. Skip current phase, continue
3. Pivot to different approach
4. Merge with different branch

Interactive prompt helps choose.

---

## Planning & Execution

### Q: What's the difference between `/rihal:plan` and `/rihal:chain`?

**A:**

- **`/rihal:plan`** — Write a plan for one phase. You know what you want; just need the breakdown.
  ```
  /rihal:plan 02 build user authentication
  ```
  Output: PLAN.md with tasks + success criteria

- **`/rihal:chain`** — Discover what to build step-by-step. Research → Scope → Plan.
  ```
  /rihal:chain research-plan build a rental app for dubai
  ```
  Output: RESEARCH.md, SCOPE.md, PLAN.md

If you're uncertain, use chain first, then plan. If you know what to build, use plan directly.

---

### Q: What happens when I execute a plan?

**A:** `/rihal:execute` does this:

1. Load the plan's tasks
2. Create feature branch (if configured)
3. For each task:
   - Spawn executor
   - Write code
   - Create atomic commit
   - Verify work matches plan
4. Run post-execute gates:
   - integration-checker (E2E verification)
   - nyquist-auditor (test coverage check)
5. Output: SUMMARY.md + all commits

---

### Q: Can I execute a plan I didn't create?

**A:** Yes. Plan format is just Markdown:

```markdown
## Tasks

### 01.01.01 — Build login form
- Create src/auth/LoginForm.tsx
- Add email + password fields
- Wire to API endpoint

**Success criteria:**
- Form validates email format
- Form submits to /api/auth/login
- Error messages display on failure
```

Executor doesn't care where plan came from. Point it at any PLAN.md:

```
/rihal:execute ./some-other-plan.md
```

---

### Q: What if a task fails during execution?

**A:** Executor stops and reports the blocker:

```
❌ Task 02.01.02 failed: "npm install stripe" failed with: no npm
Blocked: Can't proceed to next task (depends on stripe installed)
Recommendation: Install Node.js and npm, then rerun
/rihal:rerun 02.01.02
```

Fix the blocker manually, then rerun:

```
/rihal:rerun 02.01.02
```

---

## Multilingual & Classifiers

### Q: Why does Mariam get picked for some questions?

**A:** Multilingual classifier recognizes words in Urdu, Arabic, and English.

Mariam auto-triggers for:
- GCC/MENA market questions
- Words like: `dubai`, `affiliate`, `karobar`, `bnanai`, `دبئی`, `مارکیٹ`

Example:
```
/rihal:council yar affiliate site bnanai hai dubai ma
→ Panel: [mariam, hussain-pm, sadiq]
```

Mariam picked because "dubai", "affiliate", "bnanai" are in her keyword list.

---

### Q: Can I change the language of responses?

**A:** Yes, via config:

```bash
/rihal:settings
# or edit directly:
nano .rihal/config.yaml
```

Set:
```yaml
communication_language: "Urdu"  # or Arabic, English
```

Agents will respond in that language (if they know it).

---

## File Size Limits

### Q: Why do I get warnings about file size?

**A:** Rihal enforces max 600-1000 lines per file to avoid bloat.

If an agent file or PLAN.md approaches 600 lines, you get a warning. Once you hit ~800, it's an error.

**Reason:** Large files are hard to navigate and reason about.

**Solution:** Split into multiple files:

```
# Instead of one 1000-line plan:
02/PLAN.md           # 250 lines overview
02/02.01.PLAN.md     # 200 lines first plan
02/02.02.PLAN.md     # 150 lines second plan
etc.
```

---

## Karpathy Guidelines

### Q: What are "Karpathy guidelines"?

**A:** 4 coding principles from Andrej Karpathy's observations on LLM coding pitfalls:

1. **Think before coding** — Surface assumptions, don't hide confusion
2. **Simplicity first** — Minimum code, no speculative abstractions
3. **Surgical changes** — Touch only what's needed, match existing style
4. **Goal-driven execution** — Define verifiable success criteria

Wired into every code-writing agent as hard constraints. Audit recent changes:

```
/rihal:code-review HEAD~5..HEAD --karpathy
```

---

### Q: How do I enforce these in my own agents?

**A:** Add to your agent definition:

```markdown
---
name: rihal-my-agent
role: ...
---

## Constraints

- **Think first:** Surface all assumptions in your response before proposing code.
- **Simplicity:** Propose the minimum code needed. No premature abstractions.
- **Surgical:** Modify only what's necessary. Match existing code style.
- **Goal-driven:** Define 3 verifiable success criteria before implementing.
```

---

## Tokens & Cost

### Q: How many tokens does a council use?

**A:** Roughly:

- **Round 1:** 20-30K tokens (all agents independently)
- **Round 2:** 10-20K tokens (cross-talk)
- **Total:** ~30-50K tokens per council session

Varies based on question complexity and agent verbosity.

---

### Q: How do I see token usage?

**A:** Run `/rihal:stats`:

```
/rihal:stats
```

Shows:
- Total tokens by model
- Tokens per agent/mode
- Sessions run
- Average cost per session

---

### Q: Can I switch to a cheaper model?

**A:** Yes, via model profile:

```
/rihal:settings
```

Profiles:
- **quality** — opus/sonnet for complex reasoning
- **balanced** — sonnet-4.6 everywhere (default)
- **budget** — haiku-4.5 everywhere
- **inherit** — use parent session's model

Change with:
```
/rihal:config --set=model_profile=budget
```

---

## Git Integration

### Q: Does Rihal auto-commit?

**A:** No. Rihal writes to `.rihal/state.json` and `.planning/`, but doesn't commit.

**You control commits.** After execution:

```
git status
git add .rihal/state.json .planning/
git commit -m "feat(phase-02): user authentication (02.01, 02.02)"
```

---

### Q: Can I see what changed in a phase?

**A:** Yes, use `/rihal:diff`:

```
/rihal:diff 01 02
```

Shows what changed between phases. Or compare commits:

```
git log --oneline 01..02
```

---

### Q: Does Rihal enforce a branching strategy?

**A:** Optional. Configure in `config.yaml`:

```yaml
git:
  branching_strategy: "feature-branch"  # or "worktree-isolation" or "none"
```

- **none** — Rihal doesn't touch git
- **feature-branch** — `/rihal:execute` creates `feature/phase-{N}` branches
- **worktree-isolation** — Uses git worktrees (experimental)

---

## Troubleshooting

### Q: A command timed out. What do I do?

**A:** Commands can timeout if they're too complex. Options:

1. **Pause and resume:**
   ```
   /rihal:pause-work
   /rihal:resume-work
   ```

2. **Reduce scope:**
   ```
   /rihal:quick fix just this one thing
   ```

3. **Use simpler model:**
   ```
   /rihal:config --set=model_profile=budget
   ```

---

### Q: I see "Unauthorized git operation" error. What's happening?

**A:** Rihal has a safety rule: no auto-pushes. Push requires explicit user approval.

To push:
```
git push origin feature/phase-02
```

(You type it yourself; Rihal won't do it automatically.)

---

### Q: Artifacts aren't being created. Why?

**A:** Check `.planning/` directory exists:

```bash
ls -la .planning/
```

If missing, create it:
```bash
mkdir -p .planning/{phases,council-sessions,chains,notes}
```

Then rerun the command.

---

### Q: How do I see what agents are installed?

**A:** Check `.claude/agents/`:

```bash
ls .claude/agents/rihal-*.md
```

Or run:
```
/rihal:help
```

---

## Performance

### Q: Councils are slow. How do I speed them up?

**A:** Options:

1. **Reduce panel size:**
   ```
   /rihal:council --agents=waleed,sadiq "your question"
   ```
   Smaller panel = faster parallel execution

2. **Use discuss instead:**
   ```
   /rihal:discuss waleed "your question"
   ```
   Single agent is much faster

3. **Use budget model:**
   ```
   /rihal:config --set=model_profile=budget
   ```

4. **Simpler question:**
   Council responses are proportional to question complexity. More specific questions = shorter responses.

---

### Q: Can I run multiple commands in parallel?

**A:** Not recommended. Rihal uses file-based locking (`.rihal/.lock`) to prevent concurrent access to state.

If you try parallel commands, the second one will wait for the first to complete.

---

## More Help

- **Full command reference:** `docs/commands.md`
- **Agent reference:** `docs/agents.md`
- **Numbering system:** `docs/numbering.md`
- **Three modes deep-dive:** `docs/three-modes.md`
- **State & recovery:** `docs/state-and-recovery.md`
- **README:** Overview + 90-second examples

Still stuck? Check:
```
/rihal:help <command>
/rihal:forensics --last
/rihal:health
```
