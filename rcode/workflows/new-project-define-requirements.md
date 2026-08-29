<purpose>
Sub-step of new-project.md — Step 7 Define Requirements. Gathers functional requirements through conversation and writes REQUIREMENTS.md.
</purpose>

## 7. Define Requirements

Display stage banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► DEFINING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Load context:**

Read PROJECT.md and extract:

- Core value (the ONE thing that must work)
- Stated constraints (budget, timeline, tech limitations)
- Any explicit scope boundaries

**If research exists:** Read research/FEATURES.md and extract feature categories.

**If auto mode:**

- Auto-include all table stakes features
- Include features explicitly mentioned in provided document
- Auto-defer differentiators not mentioned in document
- Skip per-category AskUserQuestion loops
- Skip "Any additions?" question
- Skip requirements approval gate
- Generate REQUIREMENTS.md and commit directly

**Present features by category (interactive mode only):**

```
Here are the features for [domain]:

## Authentication
**Table stakes:**
- Sign up with email/password
- Email verification
- Password reset
- Session management

**Differentiators:**
- Magic link login
- OAuth (Google, GitHub)
- 2FA

**Research notes:** [any relevant notes]

---

## [Next Category]
...
```

**If no research:** Gather requirements through conversation.

Ask: "What are the main things users need to be able to do?"

For each capability mentioned:

- Ask clarifying questions to make it specific
- Probe for related capabilities
- Group into categories

**Scope each category:**

For each category, use AskUserQuestion:

- header: "[Category]" (max 12 chars)
- question: "Which [category] features are in v1?"
- multiSelect: true
- options:
  - "[Feature 1]" — [brief description]
  - "[Feature 2]" — [brief description]
  - "[Feature 3]" — [brief description]
  - "None for v1" — Defer entire category

Track responses:

- Selected features → v1 requirements
- Unselected table stakes → v2
- Unselected differentiators → out of scope

**Identify gaps:**

Use AskUserQuestion:

- header: "Additions"
- question: "Any requirements research missed?"
- options:
  - "No, research covered it" — Proceed
  - "Yes, let me add some" — Capture additions

**Validate core value:**

Cross-check requirements against Core Value from PROJECT.md. If gaps detected, surface them.

**Generate REQUIREMENTS.md:**

Create `.planning/REQUIREMENTS.md` with:

- v1 Requirements grouped by category (checkboxes, REQ-IDs)
- v2 Requirements (deferred)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty, filled by roadmap)

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02)

**Every requirement carries its testable consequences.** This is the shape:

```markdown
- [ ] **AUTH-01**: User can log in with email and password and stay logged in
      across sessions.
  - **Consequences (testable):**
    - A valid credential pair returns a session cookie with a 30-day expiry
    - An invalid password returns 401 and does not reveal whether the email exists
    - A logged-in user reloading the page stays logged in
```

**Why the consequences live here and not in the plan.** rcode's verifier derives
`must_haves` at verification time, long after the requirement was written — so it
is guessing at what "done" meant for a requirement someone else authored. That
guess is where verification quietly goes wrong: a phase passes because the
verifier's invented criterion was met, not the one the requirement intended.

Writing the consequences with the requirement moves that decision to the moment
the person actually knows the answer. The planner then copies them into
`must_haves.truths` instead of inventing them, and the verifier checks the
requirement's own criteria rather than its own reconstruction.

A requirement whose consequences you cannot state is a requirement you have not
finished writing. "Handle authentication properly" has no consequences because it
has no meaning — that is the signal to push for specificity, not to move on.

**Scope dial:** hobby/solo — one consequence per requirement is usually enough,
and it can be a sentence. Internal tool — the happy path plus the one failure
mode that matters. Launch — every condition a reviewer would ask about, including
the negative cases.

**Do not change the traceability table's shape.** `requirements mark-complete`
rewrites the status cell of a `| ID | ... | status |` row; consequences are nested
under the requirement in the list above, not added as table columns.

**Requirement quality criteria:**

Good requirements are:

- **Specific and testable:** "User can reset password via email link"
- **User-centric:** "User can X"
- **Atomic:** One capability per requirement
- **Independent:** Minimal dependencies on other requirements
- **Consequential:** you can name what must be true for it to be done

Reject vague requirements. Push for specificity:

- "Handle authentication" → "User can log in with email/password and stay logged in across sessions"
- "Support sharing" → "User can share post via link that opens in recipient's browser"

**Present full requirements list (interactive mode only):**

Show every requirement for user confirmation:

```
## v1 Requirements

### Authentication
- [ ] **AUTH-01**: User can create account with email/password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
- [ ] **AUTH-03**: User can log out from any page

### Content
- [ ] **CONT-01**: User can create posts with text
- [ ] **CONT-02**: User can edit their own posts

[... full list ...]

---

Does this capture what you're building? (yes / adjust)
```

If "adjust": Return to scoping.

**Commit requirements (guarded):**

```bash
git add .planning/REQUIREMENTS.md 2>/dev/null \
  && git commit -m "docs: define v1 requirements" 2>/dev/null \
  || echo "ℹ .planning/ gitignored — requirements written, not committed"
```


## Next Up

This is a sub-step invoked by `/rcode-new-project`. If you reached this directly:

- `/rcode-new-project` — re-enter the parent flow which orchestrates research → requirements → roadmap
- `/rcode-status` — see where you are in the current project lifecycle
