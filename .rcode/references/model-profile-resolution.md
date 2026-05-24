# Model Profile Resolution

rcode lets each project pick a `model_profile` in `.rcode/config.yaml`. The profile decides which Claude model each spawned agent uses.

## Profiles

| Profile | When to pick | Model assignment |
|---------|--------------|------------------|
| `quality` | Critical milestone, hard problem, high blast radius | Most agents → Opus; tactical sub-agents → Sonnet |
| `balanced` *(default)* | Day-to-day work | Most agents → Sonnet; orchestrators → Opus; trivial helpers → Haiku |
| `budget` | Exploration, low-stakes prototyping, cost-sensitive | Most agents → Haiku; only orchestrators → Sonnet |
| `inherit` | Use whatever model the calling Claude Code session is on | All agents → session model |

## Resolution order

When a workflow spawns an agent:

1. **Per-agent override** — if the agent's `.md` frontmatter has `model: <name>`, use that.
2. **Profile mapping** — look up the agent role (strategic / technical / tactical / quality) in the active profile's table.
3. **Project profile** — read `model_profile` from `.rcode/config.yaml`.
4. **Global profile** — fall back to `~/.rcode/defaults.json` if the project doesn't specify.
5. **Hard default** — `balanced`.

## Model names referenced

- **Claude Opus 4.7** (`claude-opus-4-7`) — strongest reasoning. Use for orchestration, council moderation, hard architecture calls.
- **Claude Sonnet 4.6** (`claude-sonnet-4-6`) — balanced. Default for most agents.
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) — fast + cheap. Use for tactical helpers (file walkers, simple transforms).

When using the Anthropic API directly, defaults to the latest available model in each tier.

## Override at invocation

Per-invocation override:

```bash
RCODE_MODEL_PROFILE=quality /rcode-execute-phase 04
```

Survives the session, doesn't persist to config.

## Why profiles exist

Cost vs quality is a real tradeoff. A retrospective doesn't need Opus. A council on a strategic decision shouldn't run on Haiku. Letting users pick a profile per-project means they don't have to reason about model selection per-agent.
