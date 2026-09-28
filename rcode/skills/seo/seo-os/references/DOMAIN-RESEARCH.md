# Domain Research

**Purpose:** the OS-level judgment that gates *why* a domain/niche is worth researching before spending
research budget on it — the mechanics of doing generic industry research already exist in
`rcode-domain-research`; this file does not repeat them.

## The failure mode this exists to block

```
low KD → available domain → buy it → generate AI site → hope
```

That sequence is banned. Domain research must run in this order instead:

```
SERP → intent → dedicated competition → click potential → topical expansion → monetization → domain fit
```

A domain is not "validated" because a keyword tool returned a number. It is validated when a human
(or agent) has looked at the actual SERP, understood who is winning it and why, and confirmed a
realistic path to outrank them with a monetizable, buildable product. See `SERP-INTENT.md` for the
SERP-first workflow and `SITE-ARCHITECTURE.md` for what "topical expansion" concretely requires.

## When this module is the right one to load

- The task is "should we pursue domain/niche X" or "research this industry before we commit."
- The task is a **generic subject-matter deep dive** (market size, terminology, players, regulation)
  with no SEO opportunity judgment attached — delegate the whole task to `rcode-domain-research`
  instead; do not duplicate its research methodology here.

## Workflow

1. Run `rcode-domain-research` (or equivalent web research) for the industry/business context if it
   hasn't been done for this project — check `.rcode/seo/RESEARCH.md` first (see
   `LIFECYCLE-AND-STAGE-GATES.md` for the "don't repeat expensive research" rule).
2. Classify the project (`PROJECT-CLASSIFICATION.md`) from what the research surfaces.
3. Run SERP-first validation on the 3-10 highest-priority candidate queries (`SERP-INTENT.md`) —
   this, not domain availability, is the gate.
4. Only after intent + click potential + dedicated competition are understood, weigh domain/brand
   fit as one input among nine in `OPPORTUNITY-SCORING.md` (5-point weight — not a veto on its own).
5. Record durable findings in `.rcode/seo/PROJECT.md` and `RESEARCH.md`, tagged with a freshness
   class (durable / semi-durable / freshness-sensitive — see `EVIDENCE-POLICY.md`).

## See also

- **See also:** `rcode-domain-research` (existing skill) — generic industry deep-dive mechanics,
  citation discipline, output format.
- `SERP-INTENT.md` — the SERP classification and click-potential concepts this file's ordering
  depends on.
- `OPPORTUNITY-SCORING.md` — where domain fit is weighed alongside the other eight dimensions.
