# /rcode-do — persona shortcut

Read only when `$QUESTION` starts with `@`. Referenced from `.rcode/workflows/do.md`.

If the named persona's agent is not installed (`.claude/agents/<agent-id>.md` missing), print `persona not installed in the minimal profile: rcode install --profile full` and stop.

**Recognize `@persona CODE` shortcuts as the deterministic API surface.**

Every rcode persona file has a Capabilities table listing 2-3-letter codes (Waleed: ADR/RV/TS/FZ/KS · Hussain-PM: CP/VP/EP/CE/CS/IR/CC · Mariam: MR/ICP/GTM/POS/LP · Fatima: TS/RG/EC/RR/RP/FT · Hanzla: DS/IS/BF/RF/KA/CR · Sadiq: KC/OC/PT/MT/KS · Dalil: SC/MC/RF/TS · Khattat / Munaffidh / Bahith / Muhaqqiq similarly).

Match if `$QUESTION` starts with `@<persona> <CODE>` or `@<persona>:<CODE>` — case-insensitive on persona, codes uppercase. Examples:

- `@hussain CP` → dispatch to Hussain-PM with capability `CP` (Create PRD via interview)
- `@waleed ADR` → dispatch to Waleed with capability `ADR` (write an ADR)
- `@fatima RG` → dispatch to Fatima with capability `RG` (release-gate review)
- `@dalil SC --topic "Sentry"` → dispatch to Dalil with capability `SC` (lightweight scan, topic phrase passed)

**Persona-name aliases** (lowercased, common nicknames):
| Alias | Resolves to | Agent file |
|---|---|---|
| `sadiq`, `strategy`, `director` | Sadiq | rcode-sadiq |
| `waleed`, `cto`, `architect` | Waleed | rcode-waleed |
| `hussain`, `hussain-pm`, `pm` | Hussain | rcode-hussain-pm |
| `mariam`, `marketing` | Mariam | rcode-mariam |
| `fatima`, `qa` | Fatima | rcode-fatima |
| `hanzla`, `dev`, `engineer` | Hanzla | rcode-hanzla |
| `dalil`, `scout`, `mapper` | Dalil | rcode-codebase-mapper |
| `khattat`, `planner` | Khattat | rcode-planner |
| `munaffidh`, `executor` | Munaffidh | rcode-executor |

**Behavior:**

1. Parse the persona alias and CODE.
2. Read the persona's agent file at `.claude/agents/{agent-id}.md` (or `.claude/agents/{agent-id}.local.md` if it exists — local overrides take precedence).
3. Look up the CODE in the Capabilities table. If found, the table row's "Skill / workflow" column tells you which sub-command to invoke; pass the rest of `$QUESTION` (after the shortcut) as arguments.
4. If the CODE is not in that persona's Capabilities table, print:
   ```
   Persona '{persona}' has no capability '{CODE}'. Available codes:
   {list from the persona's Capabilities table}
   ```
   And stop. Do not fall back to fuzzy intent matching — the user used the deterministic API, honour it.
5. Dispatch directly: show the plain `ROUTING` banner (the `display` step's format — "Routing to: {chosen command}") and call the `Skill` tool. Skip greenfield_guard / external_data_guard / explicit_intent_check / route — the user already chose the persona AND the action. This is a `Skill()` dispatch, not a `Task(subagent_type=...)` spawn, so it does NOT use the persona-voiced `dispatch-banner.md` format. The persona itself can still refuse internally if its preconditions aren't met.

**This is the deterministic API surface.** Power users (and other agents in council follow-ups) can invoke specific capabilities without re-reading triggers or risking fuzzy match. It's the cheapest way to get repeatable behaviour out of the persona system.

**Edge cases:**

- `@waleed` (no code) → dispatch to Waleed with no capability hint; persona uses its default workflow.
- `@nobody CP` (unknown persona) → fail loud: list known personas, exit.
- `CP @hussain` (code first) → reorder; do not match. The `@persona CODE` order is canonical.
- `@hussain CP fix the auth bug` → dispatch with `CP` and pass `fix the auth bug` as argument context.

If this step does NOT fire (no `@` prefix), continue to validate.
