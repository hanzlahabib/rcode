# rcode Planner: Goal-Backward Thinking Methodology

## The Process: Goal-Backward Derivation

Goal-backward planning starts from "what must be TRUE" and derives tasks backward to make it true.

---

## Step 1: State the Goal

Take the phase goal from ROADMAP.md. Must be outcome-shaped, not task-shaped.

**Good goals (outcomes):**
- "Working chat interface"
- "Users can authenticate with email or OAuth"
- "Payment system accepts and processes Stripe charges"

**Bad goals (tasks):**
- "Build chat components"
- "Implement authentication"
- "Integrate Stripe"

---

## Step 2: Derive Observable Truths

"What must be TRUE for this goal to be achieved?" List 3-7 truths from USER's perspective (not developer perspective).

**Example: Chat Interface Goal**

Must be TRUE:
- User can see existing messages
- User can type a new message
- User can send the message
- Sent message appears in the list immediately
- Messages persist across page refresh
- User cannot see messages from other users

**Test:** Each truth verifiable by a human using the application without reading code.

**UI goals — add a reachability truth.** If any artifact for this goal is a page, route, or screen a user navigates to, one of the truths must be that the user can reach it through existing navigation, not just that it works once they're on it:
- "User can reach {feature} from existing navigation without typing the URL directly"

This must carry through to Step 3 (a nav component — header, sidebar, menu — is a required artifact alongside the new page) and Step 5 (a key link from that nav component to the new route). A feature that functions perfectly at an orphan route with no menu entry or link pointing to it does not satisfy the goal.

**Nav artifact precondition.** "Nav/menu component updated with a link" is not itself a valid artifact — it is single-role and structure-agnostic, and satisfying it by bolting one more top-level `<a>` onto whatever markup exists guarantees IA drift across phases. Before writing that artifact line:
- Reference the existing IA decision (the ROADMAP-level nav/IA plan) that this route slots into. If no IA doc exists yet — this is genuinely the first UI phase — this phase must produce one (containers, nesting levels, role visibility) before the nav artifact can be written; do not defer it to a later phase.
- State which nav container the link belongs in (e.g. sidebar primary, topbar, settings submenu), not just "the nav."
- State the nesting depth (top-level vs. nested under an existing section).
- State which roles see it, if the app has more than one role.

**Multi-role goals — add a role-visibility truth.** If the project has more than one user role/permission level (per REQUIREMENTS.md/PROJECT.md), one of the truths must state what that role sees or cannot see on screen — nav items, dashboard content, visible/hidden fields, enabled/disabled actions — not only what API calls it can or cannot make:
- "Employee sees only their own timesheet in nav; Manager additionally sees a Team Approvals nav item; Admin additionally sees a Users/Roles admin screen."

A truth like "User can't access protected pages without logging in" covers the route gate but not RBAC — it says nothing about what an authenticated Employee vs Manager vs Admin actually sees. RBAC = each role has a different UI, not just a blocked route.

**Example: Settings Page Goal**

Must be TRUE:
- User can view and edit their profile settings
- Changes save and persist
- User can reach the settings page from existing navigation without typing the URL directly

Artifacts:
- Settings page component
- Settings API route
- Nav/menu component updated with a link to the settings route, per existing IA plan: sidebar primary nav, top-level, visible to all authenticated roles

Key link:
- Nav component → `/settings` route link → if broken: page works but is undiscoverable

---

## Step 3: Derive Required Artifacts

For each truth: "What must EXIST for this to be true?"

**Example: "User can see existing messages"**

Requires:
- Message list component (renders Message[])
- Messages state (loaded from somewhere)
- API route or data source (provides messages)
- Message type definition (shapes the data)
- Database table (Message model)

**Test:** Each artifact = a specific file or database object, not abstract.

---

## Step 4: Derive Required Wiring

For each artifact: "What must be CONNECTED for this to function?"

**Example: Message list component wiring**

- Imports Message type (not using `any`)
- Receives messages prop or fetches from API
- Maps over messages to render (not hardcoded)
- Handles empty state (doesn't crash)
- Passes correct data shape to component

---

## Step 5: Identify Key Links (Breakage Points)

"Where is this most likely to break?" Key links = critical connections where breakage causes cascading failures.

**Example: Chat Interface**

- Input onSubmit → API call → if broken: typing works but sending doesn't
- API save → database → if broken: appears to send but doesn't persist
- Component → real data source → if broken: shows placeholder, not messages

---

## Must-Haves Output Format

```yaml
must_haves:
  truths:
    - "User can see existing messages"
    - "User can send a message"
    - "Messages persist across refresh"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "Message list rendering"
      min_lines: 30
    - path: "src/app/api/chat/route.ts"
      provides: "Message CRUD operations"
      exports: ["GET", "POST"]
    - path: "prisma/schema.prisma"
      provides: "Message model"
      contains: "model Message"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/chat"
      via: "fetch in useEffect"
      pattern: "fetch.*api/chat"
    - from: "src/app/api/chat/route.ts"
      to: "prisma.message"
      via: "database query"
      pattern: "prisma\\.message\\.(find|create)"
```

---

## Common Failures in Goal-Backward Thinking

### Truths Too Vague
**Bad:** "User can use chat"
**Good:** "User can see messages", "User can send message", "Messages persist"

### Artifacts Too Abstract
**Bad:** "Chat system", "Auth module"
**Good:** "src/components/Chat.tsx", "src/app/api/auth/login/route.ts", "prisma/schema.prisma"

### Missing Wiring
**Bad:** Listing components without how they connect
**Good:** "Chat.tsx fetches from /api/chat via useEffect on mount"

### Truths Not Verifiable by User
**Bad:** "System is fault-tolerant"
**Good:** "User can send message even if network hiccups once"

---

## Why Goal-Backward Works

**Forward planning:** "What should we build?" → produces biased, incomplete task lists
- Risk: Include nice-to-have features that don't matter
- Risk: Forget critical pieces
- Result: Tasks that don't achieve goal

**Goal-backward planning:** "What must be TRUE?" → produces complete task lists
- Starts from user experience, not developer wishlist
- Ensures nothing critical is forgotten
- Tasks directly map to user-observable outcomes

---

## Example: Authentication Feature

### Goal
"Users can securely sign up, log in, and stay logged in"

### Truths (User perspective)
1. User can enter email and password on login page
2. Invalid credentials show error message
3. Valid credentials log user in
4. User sees personalized dashboard after login
5. User stays logged in after page refresh
6. User can log out
7. User can't access protected pages without logging in
8. Each role sees a different UI: Employee's nav shows only their own timesheet; Manager's nav additionally shows Team Approvals; Admin's nav additionally shows a Users/Roles admin screen

### Artifacts Needed
- Login form component
- Registration form component
- Auth API routes (login, register, logout, refresh)
- User database model
- Session/JWT infrastructure
- Protected route wrapper
- Role-aware nav component (renders nav items conditionally per role)

### Wiring
- Form → API endpoint
- API endpoint → database validation
- Database → JWT token generation
- Token → session management
- Protected routes → auth check

### Key Links (Where It Breaks)
- Form submission to API: if broken, nothing gets sent
- API to database: if broken, can't validate credentials
- Token generation: if broken, can't stay logged in
- Protected route check: if broken, unauthorized users access pages

---

## Using Must-Haves in Plans

When creating tasks in SPRINT.md, reference must-haves:

```xml
<task type="auto">
  <name>Task: Create Message model</name>
  <files>prisma/schema.prisma</files>
  <action>Add Message model per must_haves.artifacts (provides Message model). Fields: id, content, authorId, createdAt.</action>
  <done>Message model created in schema, matches must_haves spec</done>
</task>

<task type="auto">
  <name>Task: Create Chat API route</name>
  <files>src/app/api/chat/route.ts</files>
  <action>Create GET and POST per must_haves.artifacts (exports ["GET", "POST"]). GET returns all messages. POST creates new message.</action>
  <done>Both methods implemented, types exported correctly</done>
</task>
```

Each task directly satisfies an artifact requirement from must-haves.

---

## Validation Checklist

Before finalizing plan:
- [ ] Every truth has an artifact that makes it true
- [ ] Every artifact has a file assigned
- [ ] Every artifact maps to at least one task
- [ ] Key links identify where breakage matters most
- [ ] Tasks reference must-haves artifacts
- [ ] No task is missing from must-haves coverage
