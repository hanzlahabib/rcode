# Roadmapper Playbook

Loaded by `rcode-roadmapper` via `@-include`. Contains the downstream consumer
table, philosophy, workflow steps, and worked examples.

The agent stub holds the role definition, principles, anti-patterns, and
@-include list.

---

## Downstream Consumer

Your ROADMAP.md is consumed by `/rcode-plan` which uses it to:

| Output | How Plan-Phase Uses It |
|--------|------------------------|
| Phase goals | Decomposed into executable plans |
| Success criteria | Inform must_haves derivation |
| Requirement mappings | Ensure plans cover phase scope |
| Dependencies | Order plan execution |

**Be specific.** Success criteria must be observable user behaviors, not implementation tasks.

---

## Philosophy

### Solo Developer + Agent Workflow

You are roadmapping for ONE person (the user) and ONE implementer (the agent).
- No teams, stakeholders, sprints, resource allocation
- User is the visionary/product owner
- The agent is the builder
- Phases are buckets of work, not project management artifacts

### Anti-Enterprise

NEVER include phases for:
- Team coordination, stakeholder management
- Sprint ceremonies, retrospectives
- Documentation for documentation's sake
- Change management processes

If it sounds like corporate PM theater, delete it.

### UI Projects Need a Shell Phase — Not an Assumption

**If the project has any user-facing UI, an early phase MUST explicitly cover
the app shell: navigation (nav bar/sidebar), layout, and auth entry (login
screen) if auth exists.** Do not assume this "comes for free" alongside a
domain/feature phase — it doesn't. A roadmap built entirely from
domain-sliced phases (e.g. "Org graph," "Evidence ledger," "Attainment
engine," "Authorization," "Audit trail") can ship every one of those phases
individually verified and working, while the app itself has no way for a real
user to navigate between them — every page only reachable by typing its exact
URL. That is a real, observed failure mode, not a hypothetical.

Concretely: the roadmap's Phase 1 (or the first UI-touching phase) success
criteria must include something like "user can log in and see navigation to
every top-level area the project will eventually have" — even if most of
those areas are placeholder links until their own phase lands. Every later
phase that adds a new user-facing route must include "linked from the app's
navigation" as one of its own success criteria, not just "the page renders."

This is what `rcode-verifier`'s Level-5 Reachability check enforces at
verification time — but it can only enforce what the roadmap and plan
actually asked for. If no phase ever planned the nav, no plan ever built it,
and the verifier is left checking pages that are correct in isolation but
orphaned from the UI. Plan the shell so verification has something to check.

**Run `/rcode-ui-phase` before planning the shell phase's sprints, not after.**
It produces UI-SPEC.md (design tokens grounded in `rcode/references/design-library/`,
not invented) and WIREFRAMES.md (every screen from the IA decision in step 3b
of the Workflow section below, with role visibility and required
loading/empty/error/success states). Planning the
shell phase's tasks without these means the planner is guessing at what to
build — the shell phase's success criteria should reference both artifacts as
existing, not just "nav exists."

### Enterprise Projects Need Auth Strategy and Role Mapping Decided Up Front

**If the project is multi-role, SSO-integrated, or compliance-sensitive, an
early phase MUST explicitly decide auth strategy (SSO/SAML/OIDC vs local
auth, session/tenant model) and produce a role-to-screen mapping — not defer
either to whichever phase happens to touch auth first.** Do not assume these
"come for free" alongside the shell phase — they don't. A roadmap that plans
navigation and a login screen but never decides which roles can reach which
screens can ship every phase individually verified and working, while an
Auditor role sees write actions it should never have access to, or SSO gets
retrofitted in a later phase and breaks every session model earlier phases
assumed. That is a real, observed failure mode, not a hypothetical.

Concretely: for multi-role/SSO/compliance-sensitive projects, the roadmap's
foundation phase (the same phase that plans the shell) success criteria must
also include something like "auth strategy (SSO provider or local auth) is
decided and documented" and "each role in scope is mapped to the
screens/actions it can access" — even if some roles' full permission sets are
refined in later phases. Every later phase that adds a new user-facing route
must include "role access defined for this route" as one of its own success
criteria, not just "linked from the app's navigation."

This is what `rcode-verifier`'s Level-5 Reachability check does NOT enforce —
it verifies a page is linked from nav, not that it's linked only for the
correct roles. If no phase ever planned the role mapping, no plan ever built
access control, and the verifier passes pages that are reachable but
reachable by everyone.

### Multi-Role Projects Need Role-Differentiated UI Success Criteria

**If the project has more than one user role/permission level, at least one
phase's success criteria MUST include an observable statement of what each
role sees differently on screen** (e.g. "Employee sees own-record views only;
Manager sees a Team Approvals screen; Admin sees a Users/Roles management
screen") — not just "RBAC enforced at the API" or "permissions checked on the
backend." A roadmap can cleanly plan and ship Auth, RBAC-enforcement, and
Audit-trail phases, all individually verified and working, while never
producing a phase whose success criteria mentions what a Manager's screen has
that an Employee's doesn't. That is the same class of orphan-feature failure
the Shell Phase rule above exists to prevent, just for role visibility instead
of nav reachability: backend permission checks shipped, zero
role-differentiated UI ever asked about.

This applies to the nav itself, not just screen content: the Shell Phase's
success criteria must state which roles see which top-level nav
sections/menu items, not only "user can log in and see navigation to every
top-level area." Showing every role an identical full nav and relying on
route-level auth to 403 the sections they can't use is a common but bad
pattern — it leaks the existence of features a role shouldn't know about and
is worse UX than a nav that's filtered per role. For 2+-role projects, the
IA decision in step 3b below must include a `{top-level section -> roles
that see it}` mapping, and the Shell Phase success criteria must include an
observable statement like "user logged in as role X sees only the nav
sections role X is entitled to."

### On-Demand Rule Files

| When you need... | Read |
|---|---|
| Full detailed guide (tool priorities, output formats, templates, pitfalls, examples) | `.rcode/agents-rules/roadmapper/detailed-guide.md` |

Read only when the current task needs the detail. Don't preemptively load.

---

## Workflow

1. **Read context** — REQUIREMENTS.md, FEATURES.md, ARCHITECTURE.md, STACK.md, RESEARCH.md (per `<files_to_read>`).
   **STACK.md is a suggestion until a `state add-decision` entry shows the user
   confirmed it.** If no such entry exists, do not build the roadmap around that
   stack — say the stack is unconfirmed and route back to the stack gate. A
   roadmap phased around an unconfirmed stack is what makes the wrong choice
   expensive: by the time anyone questions it, every phase depends on it.
   If the project has pivoted since the stack was chosen, check whether the
   premise recorded with that decision still holds. If it does not, the decision
   is stale, not locked.
2. **Cluster requirements** — group related requirements into natural delivery units.
3. **Derive phases** — name each phase by what the user can DO after it, not what was built.
3b. **Declare the Information Architecture** (UI projects only) — before phases are finalized, explicitly decide the app's eventual final-state IA, not per-phase: enumerate the top-level sections (e.g. Dashboard / Operations / Reports / Admin), pick sidebar vs topbar vs tabs, state max nesting depth (e.g. 2 levels: section > subsection), and group every planned phase's screens under one of those sections. Persist this as an `IA.md` (or a "## Information Architecture" section in ROADMAP.md). A flat list of nav links that grows by one item per phase is not an IA decision — it's the failure mode this step exists to prevent. Later phases must slot new routes under an existing top-level section or explicitly propose adding one, never silently append a new sidebar item.
4. **Map 100% of requirements** — every req maps to exactly one phase. Verify coverage.
5. **Write success criteria** — 2-5 observable behaviors per phase. Goal-backward.
6. **Assign dependencies** — which phases must complete before others can start?
7. **Initialize STATE.md** — project memory with phase list, status=pending.
8. **Return draft for approval** — user approves or adjusts before planning begins.

---

## Examples

**Happy path** — SaaS product roadmap
> Roadmapper output for "task management app":
> Phase 1 — Foundation: User can create an account, log in, and see an empty dashboard. (covers REQ-01, REQ-02, REQ-03)
> Phase 2 — Core tasks: User can create, edit, complete, and delete tasks. (REQ-04 through REQ-09)
> Phase 3 — Collaboration: User can share a board and assign tasks to another user. (REQ-10, REQ-11)
> Each phase: 2-4 weeks of solo implementation. Observable success criteria listed.

**Edge case** — research reveals a dependency conflict between phases
> A feature in Phase 3 requires a data model change that breaks Phase 2 API contracts. Detected at roadmap time. Resolution: move the model change to Phase 2 and add a "no breaking API changes without migration" constraint to Phase 3.

**Negative** — asked to add a "testing phase" at the end
> Testing is not a phase — it's embedded in every phase's success criteria and verification step. A standalone testing phase at the end of a solo-developer project is corporate theater. Each phase ships working, tested code or it doesn't ship. Removing.
