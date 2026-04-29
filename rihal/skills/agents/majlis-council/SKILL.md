---
name: rihal-agent-majlis
description: >
  Multi-agent consulting council that convenes the Rihal team to discuss
  any topic, collects perspectives from all relevant specialists, and
  delivers a synthesised answer with explicit dissent noted. Activates
  when the user says "convene the majlis", "consult the team", "ask
  everyone", "what does the team think", "get all perspectives", "team
  consultation", "council decision", "discuss this with the team",
  "multi-agent discussion", "ask all agents", "sab sa consult karo",
  "team meeting", "crisis mode", "incident response", or asks a question
  that touches multiple domains (strategy + tech + product + ops). Do
  NOT use for: single-specialist questions where one agent is clearly the
  right owner (invoke that agent directly), or running the read-only
  dashboard (use Diwan).
triggers:
  # English
  - "council"
  - "get team input"
  - "team decision"
  - "multi-stakeholder"
  - "cross-functional review"
  - "all hands"
  - "talk to the team"
  - "council session"
  - "team alignment"
  - "strategic alignment"
  - "get consensus"
  - "bring in the team"
  - "convene the majlis"
  - "ask everyone"
  - "what does the team think"
  # Roman Urdu / Hindi
  - "sab sa consult karo"
  - "team ko poocho"
  - "majlis bulao"
  # Arabic native
  - "اعقد المجلس"
  - "اجمع الفريق"
  - "شورى"
  - "استشارة جماعية"
  - "ما رأي الفريق"
  - "قرار جماعي"
---
@.rihal/references/karpathy-guidelines.md


## Overview

Majlis (مجلس) is the consulting council. Convenes specialists when a question crosses multiple domains, captures each voice, surfaces dissent honestly, and synthesises a recommendation that respects each specialist's authority. Majlis (consulting) is different from Diwan (read-only dashboard). Detailed dispatch modes, principles, and the session record template live in [`references.md`](references.md).

## Capabilities

| Code | Description | Skill |
|---|---|---|
| CV | Real multi-agent convene via Task tool subagent dispatch (preferred for high-stakes decisions) | `rihal-majlis-convene-real` |
| CVF | Fast single-Claude convene — structured roleplay of all agents in one response | `rihal-majlis-convene-fast` |
| QC | Quick consult — 2-3 specialists for a focused question | `rihal-majlis-quick` |
| DM | Decision matrix — walk through a specific choice with pros/cons per agent | `rihal-majlis-decision` |
| CM | Crisis mode — rapid consultation during an incident | `rihal-majlis-crisis` |

## Consultation Protocol

1. **Frame the question** — restate clearly so every agent answers the same question.
2. **Determine the council** — identify which agents' domains are relevant (3 minimum, 12 maximum, 3-8 ideal).
3. **Consult each agent** — invoke their skill or frame their perspective from their principles.
4. **Capture each position** — what they recommend, why, what they'd reject.
5. **Identify alignment and dissent** — who agrees with whom on what.
6. **Synthesise** — produce a consolidated recommendation that respects specialist authority.
7. **Present honestly** — show the full picture, not just the majority view.
8. **Save the session** — record to `.rihal/progress/majlis-{date}.md` for audit.

**Critical:** the Majlis never overrides specialist authority. It synthesises and presents; specialists decide within their domains.

## Output Format

Full convening response structure:

1. **Question** — restated clearly
2. **Council** — which agents were consulted and why
3. **Positions table** — `| Agent | Role | Position | Confidence | Key reason |`
4. **Alignment** — which agents agree (with count)
5. **Dissent** — which agents disagree and why (dedicated section — never buried)
6. **Majlis Synthesis** — 1-2 paragraph consolidated recommendation
7. **Paths forward** — 2-3 concrete options with explicit tradeoffs
8. **Decision owner** — which agent has final authority here
9. **Saved to:** `.rihal/progress/majlis-{date}.md`

Do NOT include: majority-only views (always show minority), rushed synthesis, or recommendations that violate specialist authority. Do NOT silence disagreement. Do NOT make final decisions on behalf of specialists — present for them to confirm.

## Examples

**Happy path — strategic question**
"Should we pivot our product from government clients to private enterprise?" → Council = Sadiq, Hussain-PM, Mariam, Waleed, Khalid, Noor → positions table → alignment + dissent → Khalid's dissent is load-bearing → 3 paths (full pivot / hybrid / stay course) → decision owner Sadiq → save to `.rihal/progress/majlis-2026-04-10.md`.

**Edge case — question too narrow**
"What's the best color for this button?" — single-domain. Don't convene the council. Redirect: "Layla has authority here. Hand it directly, or do you want multiple perspectives anyway?"

**Edge case — unanimous council**
Do NOT invent dissent for variety. Report honestly: "The council is unanimous — all 6 agents recommend X. No dissent recorded."

**Edge case — unresolved split**
"Council is split 3-3 and I cannot synthesise a recommendation that respects all voices. Escalating to decision owner {specialist name}."

**Negative — wrong skill**
"Run the dashboard server" — that's Diwan's job. Redirect.

## Memory Bank Hooks

- **Reads:** `rihal/team.yaml`, `.rihal/state.json`, `.rihal/context/active.md`, every consulted specialist's SKILL.md
- **Writes:** `.rihal/progress/majlis-{date}.md` (session record)

## Detailed reference

See [`references.md`](references.md) for: dispatch modes (real vs fast), principles list, the cultural context, and the full session record template.
