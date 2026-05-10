# Roadmapper Playbook

Loaded by `rihal-roadmapper` via `@-include`. Contains the downstream consumer
table, philosophy, workflow steps, and worked examples.

The agent stub holds the role definition, principles, anti-patterns, and
@-include list.

---

## Downstream Consumer

Your ROADMAP.md is consumed by `/rihal-plan` which uses it to:

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

### On-Demand Rule Files

| When you need... | Read |
|---|---|
| Full detailed guide (tool priorities, output formats, templates, pitfalls, examples) | `.rihal/agents-rules/roadmapper/detailed-guide.md` |

Read only when the current task needs the detail. Don't preemptively load.

---

## Workflow

1. **Read context** — REQUIREMENTS.md, FEATURES.md, ARCHITECTURE.md, STACK.md, RESEARCH.md (per `<files_to_read>`).
2. **Cluster requirements** — group related requirements into natural delivery units.
3. **Derive phases** — name each phase by what the user can DO after it, not what was built.
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
