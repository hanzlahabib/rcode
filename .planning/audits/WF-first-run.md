# WF-first-run — First 10 Minutes Workflow Audit

**Lens:** first-run — what a brand-new user experiences immediately after `npx @hanzlaa/rcode install` succeeds.
**Audited:** `rcode/workflows/do.md`, `.rcode/workflows/do.md`, `.rcode/workflows/init.md`, `.rcode/workflows/new-project.md`, `.rcode/workflows/help.md`, `.rcode/references/auto-init-guard.md`, `rcode/commands/quick.md`, `rcode/commands/brainstorm.md`, `rcode/commands/new-project.md`, `docs/getting-started.md`

---

## Verdict

The first-run experience is **leaky** — the auto-init guard is solid engineering but the user-facing story has two competing entry points (`/rcode-init` vs `/rcode-do`), the empty-`/rcode-do` menu presents 16 options with no state-aware filter for someone who has never run anything, and the single highest-value action (start a project) is buried under guards that fire when there's no project yet. A new user who types `/rcode-do` with no args gets the full 16-item menu regardless of whether they have a PRD, phases, or any state at all — the menu is not context-filtered for zero state. The path from "just installed" to "first meaningful output" requires navigating at minimum 2 modal choice points that could be collapsed to zero.

---

## The user's actual experience

**Precondition:** User ran `npx @hanzlaa/rcode install`, restarted IDE. `.rcode/config.yaml` exists (installer seeded it with defaults). No `.rcode/JOURNEY.md`. No `.planning/` artifacts. No PRD, no phases.

**Step 1 — User types `/rcode-do` (no args)**

`.rcode/workflows/do.md:92` — `validate` step fires. `$QUESTION` is empty → `AskUserQuestion` presents the 16-item main menu:

```
— Talk —
1. Quick chat with one expert
2. Convene the council
3. Discuss an unlocked phase
— Plan & build —
4. Plan a phase
5. Execute a phase
...
16. Something else — describe it
0.  Cancel
```

**Problem:** This menu is shown identically to a zero-state user and a user mid-project. Items 3, 4, 5, 6, 7, 8, 9, 11, 12 require `.planning/` state that does not exist yet. The user has no signal about which items are valid. There is no "NEW? Start here" item. `/rcode-init` does not appear in the menu at all (`do.md:92-123` — confirmed by reading).

**Step 2 — Auto-init guard runs first (or does it?)**

`.rcode/references/auto-init-guard.md:12-21` — the guard checks for `rcode-seeded-not-configured` (config.yaml exists but no JOURNEY.md). The installer pre-seeds config.yaml (`auto-init-guard.md:22`), so the guard SHOULD fire and route the user through the 5-question flow before the menu appears.

BUT: the guard's "inline init flow" is described only for `rcode-not-initialized` (no config.yaml). The `rcode-seeded-not-configured` path says "skip step 1, go to step 2 (ask the 5 questions), then continue with steps 3-6" — so it does interrupt, but it does NOT redirect the user to `/rcode-new-project` or suggest the highest-value next action. It just resumes "the original workflow" (the dispatcher) which then shows the 16-item menu again (`auto-init-guard.md:122`: "Continue with the original workflow as if it had been initialized from the start").

**Step 3 — User picks from the menu (guessing)**

There is no item labeled "Start a new project" in the `validate` menu. The closest is item 16 ("Something else — describe it"). The only way to reach `/rcode-new-project` directly is to type `/rcode-do "start a new project"` which matches the routing table at `do.md:288` (`Starting a new project, "set up", "initialize" → /rcode-new-project`). A user who typed `/rcode-do` with no args is not on that path.

**Step 4 — `/rcode-init` path (if user reads docs first)**

`docs/getting-started.md:27` says "`/rcode-init` is **the** first command — always run this one, never anything else to start." But `rcode/commands/init.md:3` is the only place this appears prominently in the IDE autocomplete description (`[START HERE] Configure rcode for this project — first command after install`). A user who opens Claude Code, types `/`, sees the list of `/rcode-*` commands, and reads descriptions will see `[START HERE]` on `/rcode-init`. A user who types `/rcode-do` bypasses this entirely.

**Step 5 — `/rcode-init` runs**

`.rcode/workflows/init.md:34-69` — Init greets user, detects state (fresh/existing-new-rcode/returning/reset), asks 5 config questions, writes JOURNEY.md, then at `init.md:292-303` prints a contextual suggestion. For `fresh` state it says:

```
✓ rcode configured. Your journey begins.
Ready to design a new project? Try:
/rcode-new-project {your-project-name}
```

**This is the correct first-run path.** It gets the user to `/rcode-new-project` in one more command. Total: 2 commands (`/rcode-init` → `/rcode-new-project`), 5 config questions, then project creation. That's the happy path.

**Step 6 — `/rcode-new-project` with no args**

`.rcode/workflows/new-project.md` Step 0 (`new-project.md:93-100`): if `$ARGUMENTS` is empty, it prints usage examples and says STOP. The user must re-type the command with their project description. This is a third friction point.

**Step 7 — The `/rcode-help` path**

`.rcode/workflows/help.md:56-92` — Tier 1 shows the 8 essentials. The "Minimal happy path" at `help.md:68-72` is correctly sequenced:
```
/rcode-init → /rcode-new-project → /rcode-plan 1 → /rcode-execute 1 → /rcode-next
```
But `/rcode-help` does not appear in the `/rcode-do` empty menu. A user who types `/rcode-do` (no args) cannot reach `/rcode-help` without typing it explicitly.

**Summary of path:** A first-run user who types `/rcode-do` (the most discoverable "smart router") gets a 16-item menu with no new-user orientation, no `/rcode-init` item, and no indication that most items require state that doesn't exist. The correct first-run path (`/rcode-init` → `/rcode-new-project <idea>`) is only reachable by (a) reading the docs or (b) typing `/rcode-init` directly from the IDE autocomplete.

---

## Leaks

**1.** 🔴 **`/rcode-do` empty menu has no first-run orientation and no `/rcode-init` item**

Evidence: `.rcode/workflows/do.md:92-123` — 16-item menu; none of the options is `/rcode-init` or "Set up this project for the first time". A brand new user types `/rcode-do`, gets the menu, and every "Plan & build" option requires `.planning/` state they don't have. No item says "you should run `/rcode-init` first".

User-facing cost: User picks an item (e.g. "Plan a phase"), hits a prerequisite guard, and gets redirected — confusing bounce. Or they pick "Quick chat with one expert" and get an unanchored conversation with no project context. Time wasted: 2-5 minutes of confusion before landing on the right path.

**2.** 🔴 **`/rcode-do` routing table has no explicit "I just installed, what now?" trigger**

Evidence: `.rcode/workflows/do.md:285-322` — the routing table has 30+ rows. None matches "I just installed" / "what do I do first" / "getting started" / "help". The closest match is "Starting a new project, 'set up', 'initialize'" → `/rcode-new-project` (`do.md:288`), but this doesn't fire for a user who just types "what now?" or "help" or "/rcode-do" with no args. Classifier fallback at `do.md:325` routes to `/rcode-discuss` as default — a conversational agent, not orientation.

User-facing cost: A user who types `/rcode-do what now?` gets routed to `/rcode-discuss` (a single expert chat), not `/rcode-init` or the getting-started guide. They get a general conversation instead of structured onboarding.

**3.** 🔴 **`/rcode-new-project` with no args shows usage and STOPS instead of prompting**

Evidence: `.rcode/workflows/new-project.md:93-100` — "If `$ARGUMENTS` is empty or contains only `--help` or `-h`: [print examples]. STOP — do not proceed." A user who follows the docs and types `/rcode-new-project` with nothing gets a static example block and has to re-type.

User-facing cost: The user must invoke the command twice. More importantly, if a user reaches `/rcode-new-project` from `/rcode-do` routing (which passes no args because the user just said "new project"), they immediately stall at this guard. Correct behavior would be to ask an opening question ("What are you building?") using `AskUserQuestion`.

**4.** 🟡 **Auto-init guard on `rcode-seeded-not-configured` resumes the original workflow (the menu) instead of routing to onboarding**

Evidence: `.rcode/references/auto-init-guard.md:25` — "skip step 1, go to step 2 (ask 5 questions), then continue with steps 3-6 as written" + `auto-init-guard.md:122` — "Continue with the original workflow as if it had been initialized from the start." For `/rcode-do` with no args, this means: 5 config questions → then back to the 16-item menu. The guard doesn't say "after first config, redirect to new-project or help."

User-facing cost: Correct config gets written, but the user lands back in the undirected menu. A better outcome would be to surface the same "✓ rcode configured. Try: /rcode-new-project {idea}" message that `/rcode-init` itself shows at `init.md:292-303`.

**5.** 🟡 **`/rcode-help` (the orientation command) is not wired into the `/rcode-do` empty menu**

Evidence: `.rcode/workflows/do.md:92-123` — the 16-item menu has no "Get oriented / see commands" option. `rcode/commands/help.md` exists and Tier 1 has the correct happy path, but it's not reachable from the menu that appears when a user types `/rcode-do` with no args.

User-facing cost: Users who want to orient themselves have to already know `/rcode-help` exists. It's not discoverable from the most-typed entry point.

**6.** 🟢 **`docs/getting-started.md:47` references `docs/getting-started.md` from `help.md:47` — but `getting-started.md:80-89` references `docs/commands.md`, `docs/agents.md`, `docs/numbering.md`, etc. without verifying they exist**

Evidence:
```bash
ls docs/agents.md docs/numbering.md docs/state-and-recovery.md 2>/dev/null
```
Output: (these files do exist — not a hard break, but getting-started is a cross-referencing doc that could link to stale paths over time).

User-facing cost: Low — but a user following the "What's next" section in getting-started.md clicks to a doc that may be renamed or missing.

---

## Strengthenings

**1. State-aware `/rcode-do` empty menu (highest ROI, S effort)**

When `$QUESTION` is empty AND project state shows `rcode-seeded-not-configured` or `fresh` (no JOURNEY.md, no `.planning/`), replace the 16-item menu with a shorter first-run menu:

```
Welcome to rcode. Looks like you're just getting started.

1. Configure this project and start designing (/rcode-init)
2. Just want to explore — chat with an expert (/rcode-discuss)
3. See all commands (/rcode-help)
```

Why it helps the USER: Instead of a 16-option wall, the new user gets 3 choices, all valid for their state. They don't bounce off prerequisite guards. One decision, immediate progress.

Effort: S — add a state check before the `validate` step in `.rcode/workflows/do.md` and a second menu branch.

Files: `.rcode/workflows/do.md` (validate step, lines 89-123).

**2. `/rcode-new-project` with no args: ask instead of stop (M effort)**

Change `.rcode/workflows/new-project.md` Step 0 from "print examples and STOP" to ask via `AskUserQuestion`: "What are you building? Give me a one-sentence description." Then proceed with that as `$ARGUMENTS`.

Why it helps the USER: `/rcode-do "new project"` → `/rcode-new-project` (no args from router) → immediate opening question. No bounce. The user keeps typing in one conversation, not re-running a command.

Effort: M — modify Step 0 guard, wire the AskUserQuestion response as the `$ARGUMENTS` substitute.

Files: `.rcode/workflows/new-project.md` (lines 87-100).

**3. Auto-init guard post-config redirect (S effort)**

After the `rcode-seeded-not-configured` inline init completes (5 questions answered, config written), instead of "continue with the original workflow", print the same next-step suggestion that `/rcode-init` already produces at `init.md:292-303`. For `/rcode-do` specifically, redirect to a 3-item first-run menu (see #1) rather than the 16-item menu.

Why it helps the USER: The user who typed `/rcode-do` with no args — and then answered 5 config questions — doesn't land back in an undirected menu. They land at the logical next action: start a project.

Effort: S — add a post-init redirect hook in `.rcode/references/auto-init-guard.md` (lines 117-123) that passes context back to `do.md`.

Files: `.rcode/references/auto-init-guard.md` (lines 117-130).

**4. Add "help / orientation / getting-started" trigger to `/rcode-do` routing table (S effort)**

Add a row to the routing table at `do.md:288`:

| "help", "what now", "getting started", "what can you do", "orientation", "I just installed" | `/rcode-help` | Entry-point orientation request |

Why it helps the USER: A user who doesn't know rcode and types "what now" or "help" gets the tiered command reference, not a generic `/rcode-discuss` chat. One correct step instead of a confused conversation.

Effort: S — add one routing table row.

Files: `.rcode/workflows/do.md` (route step, ~line 288).

**5. Make `/rcode-init` more prominent in IDE autocomplete context (L effort)**

`rcode/commands/init.md:3` already has `[START HERE]` in the description — this is good. The L effort is adding a post-install hook that opens Claude Code with `/rcode-init` pre-typed or prints an interstitial message after `npx @hanzlaa/rcode install` completes. This requires changes to the installer CLI.

Why it helps the USER: The user doesn't have to know `/rcode-init` exists — the install flow tells them.

Effort: L — installer change.

Files: `cli/install.js`, post-install hook.

---

## Kill your darlings

**Kill: The 16-item `/rcode-do` empty menu for zero-state users.**

The current menu (`do.md:92-123`) makes sense for a user mid-project who doesn't know what to type next. It does NOT make sense for a zero-state user — it presents 16 options, 10 of which require state that doesn't exist yet. The menu itself says nothing about state requirements. For zero-state sessions this menu should be replaced by the 3-item first-run menu described in Strengthening #1.

The 16-item menu can survive for mid-project use. The problem is showing it unconditionally. Kill the unconditional display; gate it on state.

**Simplify: The auto-init guard's "continue" instruction.**

`.rcode/references/auto-init-guard.md:122` — "Continue with the original workflow as if it had been initialized from the start" is a blanket instruction that works fine for most workflows but produces a bad first-run outcome specifically from `/rcode-do`. A single added clause — "EXCEPT for `/rcode-do` with no args, redirect to the first-run menu" — would prevent the bounce without changing behavior for every other workflow.

**Simplify: `/rcode-new-project` empty-args STOP.**

`.rcode/workflows/new-project.md:98` — "STOP — do not proceed." This is the wrong behavior for a command the router calls without args. Replace the static-example STOP with a single `AskUserQuestion`. The examples in the current STOP message can become the placeholder text of the question.
