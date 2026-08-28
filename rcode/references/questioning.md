# Questioning Patterns

Effective exploration relies on **Socratic questioning** — progressively uncovering assumptions, clarifying intent, and narrowing scope through structured dialog.

## Question Types

### Open-Ended (Exploration Phase)
Probe for breadth and depth without constraining answers.

**Purpose:** Discover unknowns, surface vague thinking, generate ideas.

**Examples:**
- "What problem are you trying to solve?"
- "Walk me through how this currently works."
- "What would success look like?"
- "What constraints haven't we discussed yet?"

**When to use:**
- First contact with a new domain
- User's intent is fuzzy ("build a dashboard")
- Exploring edge cases or variations
- After a checkpoint, to reset assumptions

---

### Closed / Clarifying (Verification Phase)
Pin down specifics with binary or bounded responses.

**Purpose:** Confirm understanding, verify assumptions, reduce ambiguity.

**Examples:**
- "So you need real-time sync, not eventual consistency?"
- "Is this for internal use only, or customer-facing?"
- "Must this work offline?"
- "Budget constraint is $10k/month?"

**When to use:**
- You've heard the answer and need to confirm
- Narrowing from many options to the chosen few
- Verifying a critical decision before planning
- During a gate (approval/abort checkpoint)

---

### Follow-Up (Depth Phase)
Dig deeper into a specific answer without abandoning the main thread.

**Purpose:** Uncover hidden assumptions, validate reasoning, stress-test ideas.

**Examples:**
- "Why did you choose that approach?"
- "What would break if you didn't do X?"
- "Have you considered Y as an alternative?"
- "When did this constraint become important?"

**When to use:**
- A user answer is incomplete or hand-wavy
- Detecting contradictions between stated goals and requirements
- Stress-testing a design decision
- Building confidence that the user understands their own problem

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Fix |
|---|---|---|
| **Loaded questions** | "You do want scalability, right?" | Ask neutral: "What's your scalability target?" |
| **Question stacking** | "Is it real-time, cloud, and multi-tenant?" | Ask one at a time |
| **Assuming expertise** | "What's your latency budget in ms?" | Context first: "Do you have SLA constraints?" |
| **Freeform overload** | Multiple open-ended with no structure | Bracket by topic; use closed to confirm each bracket |
| **Interrupting answers** | "So it's like Netflix?" | Let the user finish, then follow up |

---

## Freeform Rule

When a user selects "Other" or provides freeform text:

1. **Read the text literally** — Don't paraphrase or "help" the user by guessing what they meant
2. **Ask one clarifying question max** — Confirm you understood the specific freeform input
3. **Don't drill into theory** — Stay focused on their stated goal, not the general problem space

**Example:**
- User: "Other: I want to sync data between 3 databases"
- Good follow-up: "Are these databases already running, or do you need to set them up?"
- Bad follow-up: "Have you considered the CAP theorem? Let me explain eventual consistency..."

---

## Socratic Conversation Structure

A well-paced Socratic conversation follows a natural arc:

```
1. Open Question (5-10 min)
   ↓ User provides high-level intent + constraints
2. Clarifying Questions (3-5 min)
   ↓ You confirm key decisions + rule out ambiguities
3. Follow-Up Questions (3-5 min)
   ↓ You stress-test reasoning + surface hidden assumptions
4. Summary + Confirmation (1-2 min)
   ↓ User confirms you understand correctly
5. Decision Gate
   ↓ Proceed to planning or revisit if gaps remain
```

Each phase should feel **natural, conversational**, not like a checklist. If the user volunteers information, use it; don't force a predetermined sequence. **This is a rule about TONE, not about coverage** — the decisions in the Mandatory decision set below still all get resolved, in whatever order the conversation makes natural.

---

## Working mode — offer it, don't read it from config

**Before any planning questions, ask how the user wants to work.** This is a
per-run choice presented to them, never a config flag read silently:

- **Fast path** — batch the remaining gaps into one or two consolidated
  questions, then draft the full artifact, marking every inferred value with an
  `[ASSUMPTION]` tag inline. The user reviews and iterates. Initial quality
  depends on how much they gave upfront.
- **Coaching path** — walk the decisions together, section by section.

Why it must be asked: a user who never enabled autonomous mode should never be
*treated* as if they had. Confirmed live — a user asked for a project to be
planned, was never offered this choice, got no defined questions, and received a
plan built on assumptions they never saw. "You didn't turn on yolo" is not a
defence when nothing ever asked.

Auto/yolo mode picks Fast path automatically. Everything else asks.

## Stakes calibration — one probe, before anything else

Ask once, early: **is this a hobby/solo thing, an internal tool, or a launch?**
Then scale rigor to the answer. rcode's pipeline is built for the launch case and
applying it whole to a weekend project is its own kind of failure — the user
abandons the process rather than the project.

| Stakes | Depth |
|---|---|
| Hobby / solo | Minimal artifacts. Reviewer gates run quietly or not at all |
| Internal tool | Normal pipeline, lighter review |
| Launch / production | Full pipeline, all gates, nothing skipped |

## Elicitation, not direction — the hand-back rule

Discovery pulls the user's vision out. It does not insert yours.

**When you catch yourself naming the stack, picking the MVP cut, or proposing the
phase breakdown — stop. You have crossed from asking into authoring. Hand the pen
back.**

Infer-and-confirm is fine: *"I'm assuming the maintainer is you, not a client —
right?"* Quizzing the user through a tree of your own options is not, and neither
is presenting your conclusion as the finding.

This is the rule that would have prevented the most expensive failure in rcode's
own history: a session picked a stack, phased a roadmap around it, and built on
it, having never handed the pen back once.

## Mandatory decision set — tone is conversational, coverage is not

The "don't feel like a checklist" rule above governs **tone**. It does not govern
**coverage**. There is a set of decisions that shape everything downstream, and
each one must be either answered by the user or recorded as an assumption with
its reason. Silently deciding one on the user's behalf is not conversational
skill, it is skipping the question.

Confirmed live: a user asked for a project to be planned, was never asked a
single defined question, and got a stack, a roadmap, and an implementation built
on a premise they had never confirmed. When the premise turned out to be wrong
the whole build was thrown away. Nothing in this file forced the question,
because this file told the asker to avoid predetermined sequences.

Every one of these must be resolved before PROJECT.md is written:

| Decision | Why it cannot be assumed |
|---|---|
| **Who maintains this after launch** | Drives the stack more than any technical factor. "Non-technical client" and "you, the technical owner" give opposite answers |
| **Stack** | Most expensive thing in the project to reverse. Never decided for the user — see the stack gate |
| **Who the users are, and whether there are roles** | Auth, permissions, and data model all hang off it |
| **What is explicitly OUT of scope for v1** | An unstated exclusion reappears later as a gap |
| **What already exists** | Greenfield vs brownfield changes every phase |
| **What "done" means for the first milestone** | Without it there is no way to verify anything |
| **Any hard constraint** — budget, deadline, hosting, compliance, locale | These invalidate otherwise-correct plans |

**How to run it without sounding like a form:** weave them into the conversation
in whatever order the user's own answers suggest — that part stays conversational.
But **track them, and before you write PROJECT.md, state which ones the user
actually answered and which you are assuming, with the assumption spelled out.**

```
Before I write this up — you answered: maintainer (you), scope (city pages only),
users (visitors, no login).
I'm assuming: no deadline, hosting undecided, English only.
Correct any of those, or say go.
```

**Tag assumptions in the artifact itself, not just in chat.** Every inferred value
written into PROJECT.md, REQUIREMENTS.md, or ROADMAP.md carries an inline
`[ASSUMPTION]` marker. A summary the user scrolled past is not consent; a tag in
the document survives the conversation and can be triaged later.

Before any artifact is marked final, **walk every `[ASSUMPTION]` tag with the
user**: confirm it, correct it, or defer it with an owner. An untriaged assumption
in a finalised document is a decision nobody made.

That block is not optional and auto mode does not remove it. An assumption the
user never saw is indistinguishable from a decision you made for them.

## Context Checklist

After Socratic questioning, verify these dimensions were covered:

- [ ] **User intent** — What success looks like, why it matters
- [ ] **Scope** — Feature, product, initiative, or experiment?
- [ ] **Constraints** — Budget, timeline, team size, tech stack
- [ ] **Known unknowns** — What research is needed before planning?
- [ ] **Success metrics** — How will we measure completion?
- [ ] **User roles** — Who are the distinct user types and what does each see/do?
- [ ] **Auth/identity** — SSO, local accounts, guest access, or a specific IdP?
- [ ] **Locale/i18n** — Which languages/regions must be supported, RTL needed?

If gaps remain after natural conversation, weave questions naturally. Don't suddenly shift to checklist mode — but do NOT let "not a checklist" become "never asked". Anything from the Mandatory decision set still unresolved gets asked outright before you move on, plainly, rather than silently assumed.

---

## Recovery Patterns

### User Gives Vague Answer

**Pattern:** "I need it to be fast."

**Response:** 
1. Accept the answer (don't dismiss)
2. Clarify specifics: "What does 'fast' mean for your users — sub-second response, or <5 seconds?"
3. Offer benchmarks if user has none: "Typical targets are 100ms for web, 1s for mobile."

### User Contradicts Earlier Statement

**Pattern:** "We need real-time" vs. later "batch job at midnight is fine."

**Response:**
1. Surface the contradiction neutrally: "Earlier you mentioned real-time. Now you're describing batch?"
2. Let user reconcile: "Help me understand — which requirement is driving your design?"
3. Document the clarified intent

### User Says "I Don't Know"

**Pattern:** "I don't know how many users we'll have."

**Response:**
1. Validate the uncertainty: "That's common at this stage."
2. Propose exploration: "Should we scope for 100 users initially and design for 10k later?"
3. Document as a risk: "Scale assumptions to be revisited when user count is clearer."

---

## Tempo Rules

- **Early questions:** Slower, more open. Give user space to think.
- **Mid-conversation:** Tighter, more specific. Confirm each decision.
- **Late-stage:** Faster, very closed. Lock in decisions for planning.

If conversation stalls, revert to open questions to restart momentum.
