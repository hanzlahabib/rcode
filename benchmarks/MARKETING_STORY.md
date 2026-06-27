# Marketing story — rcode-lazy

> Angle: ride the trending ponytail/Colin debate, but position rcode as
> substance-over-hype. We shipped the same "lazy senior dev" superpower —
> and then did the one thing the viral version didn't: benchmarked it
> honestly against the 7 words that humbled it.

---

## The hook (headline options)

1. **"Ponytail got 20,000 stars for a 100-line prompt. An engineer beat it with 7 words. So we shipped the honest version."**
2. **"We added 'lazy senior dev' mode to rcode. Then we tried to prove it was useless — and told you the result."**
3. **"Everyone's starring the prompt. Nobody benchmarked it. We did."**

## The story arc (the 60-second read)

In June 2026 a skill called **ponytail** — "make your AI agent think like the
laziest senior dev in the room" — went from zero to 20,000+ GitHub stars in a
week. The pitch was great: agents over-build, ponytail makes them write one
line instead of fifty.

Then Colin Eberhardt (CTO, Scott Logic) actually opened the repo. Inside the
6,000-line project was a ~100-line markdown file restating **YAGNI** — a
principle from the 1990s. He re-ran ponytail's own benchmark and found the
baseline only looked bloated because it was answering in *chat mode* (multiple
options + commentary). Constrained fairly, and handed just **seven words** —
*"Follow YAGNI principles, and one-liner solutions"* — the plain model **beat
ponytail on its own benchmark.**

The lesson wasn't "lazy mode is worthless." It was: **a skill that can't beat
its own one-line summary is hype, not substance — and you only find out if you
benchmark.**

So when we added the same capability to **rcode** as `rcode-lazy`, we did three
things differently:

- **We told the truth in the skill itself.** rcode-lazy's own docs say its floor
  is one YAGNI sentence; the value it adds is *persistence, intensity levels,
  and guardrails* — not secret sauce.
- **We benchmarked it against the 7-word rival** that humbled the original —
  fair baseline, code-only LOC, multiple reps, correctness flagged (see table below).
- **We wired it into a system that does the work** — 87 skills, an intent
  router, a Memory Bank — not a standalone prompt riding a star count.

### What we actually measured (Haiku, 5 tasks, fair baseline, n=2)

| Variant | Mean code-LOC (lower = better) |
|---|---|
| Raw baseline | 10.4 |
| Baseline — "one solution, no commentary" | 14.9 |
| **7-word rival** — "Follow YAGNI, one-liners" | **9.4** |
| **rcode-lazy** (full skill) | **8.5** |

The honest read: **rcode-lazy wrote the least code — but it beat the seven-word
YAGNI prompt by about one line.** That margin is inside the noise. And notice
the "fair baseline" came out *higher* than the raw one — proof of Colin's point
that LOC is a fragile metric you can accidentally rig in either direction.

So we're not claiming a miracle. We're claiming what the skill's own docs claim:
a one-line YAGNI prompt gets you ~90% of the way; the skill adds **persistence,
intensity dials, and guardrails** on top — and we can show you the number
instead of asking you to take it on faith.

**rcode isn't a viral prompt. It's the discipline — benchmarked, margins and
all.**

---

## Ready-to-post variants

### X / Twitter thread
1/ Ponytail hit 20k⭐ in a week for a ~100-line YAGNI prompt.
Then a CTO beat it with 7 words on its own benchmark.
We added the same "lazy senior dev" mode to rcode — and benchmarked it honestly. 🧵

2/ The trap: ponytail's baseline looked bloated only because it answered in
chat mode. Tell any model "one solution, no commentary, follow YAGNI" and the
gap mostly vanishes. A skill that can't beat its own one-liner is hype.

3/ So rcode-lazy ships with: (a) honest docs — its floor IS that one line,
(b) a fair benchmark vs the 7-word rival (8.5 vs 9.4 LOC — we win by ~1 line and say so), (c) it's 1 of 87 skills in
a system that actually plans, executes and remembers.

4/ The takeaway for everyone shipping AI skills: if you don't have a fair
benchmark, you're riding the hype wave. Numbers > vibes.
→ [repo link]

### LinkedIn
A 100-line prompt got 20,000 GitHub stars last week. Then Colin Eberhardt
showed seven words could beat it on its own benchmark.

That's not a takedown of "lazy" AI coding — it's a reminder that **unbenchmarked
skills are marketing, not engineering.**

We added the same capability to rcode as `rcode-lazy`. The difference is what we
shipped around it: honest framing (the skill admits its floor is one YAGNI
line), a fair benchmark against that 7-word rival (8.5 vs 9.4 LOC — we win by
about one line and say the margin is within noise), and integration into an
87-skill system that does the actual planning and execution.

If you build AI skills: benchmark them, or admit you're guessing.
