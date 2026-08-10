# Audit: Codex CLI in an existing Claude-Code-first rcode project (issue #1025)

**Date:** 2026-08-10
**Scope:** verify, with a real `codex` CLI session, what a user actually experiences when they open Codex in an existing project where rcode's `/rcode-init` Step 4c never generated `AGENTS.md`.
**Method:** live `codex exec` runs (read-only sandbox) + code reading. No changes made to any inspected project.

---

## 1. Root-cause code (confirmed, not theoretical)

`rcode/workflows/init.md` Step 4c:

```bash
if [ ! -f CLAUDE.md ]; then
  node .rcode/bin/rcode-tools.cjs generate-claude-md
fi
```

Gate is `! -f CLAUDE.md` — it never checks whether `AGENTS.md` is missing. Any project that already has a `CLAUDE.md` (the common case for a Claude-Code-first repo running `/rcode-init` to add rcode) skips this block entirely. `generate-claude-md` never runs, so `AGENTS.md` is never written.

Worse: even if Step 4c's own guard were fixed, `cmdGenerateClaudeMd()` in `rcode/bin/rcode-tools.cjs` (~line 4544) is itself all-or-nothing:

```js
if (fs.existsSync(claudeMdPath) && !force) {
  throw new Error(`CLAUDE.md already exists at ${claudeMdPath}. Use --force to overwrite.`);
}
```

This throw happens *before* any AGENTS.md-specific logic runs. The function's own doc comment claims "AGENTS.md is written when absent (or with --force) so an install-managed roster section is never clobbered" — that's aspirational, not what the code does. In its current form, an existing `CLAUDE.md` blocks `AGENTS.md` generation twice over: once in `init.md`'s bash guard, and again inside the tool itself.

## 2. Live-project inspection

Checked the three candidate projects (read-only, no writes):

| Project | CLAUDE.md | AGENTS.md | .rcode/ | Notes |
|---|---|---|---|---|
| `social-poster` | yes (40KB, hand-grown) | yes (2KB, generic agent roster) | **no** — legacy `.rihal/` install | Predates the current rcode/`do.md` toolchain entirely; not a valid test case for this bug. AGENTS.md here has no `do.md` routing content at all (it was written by an old rihal generator, not `generate-claude-md`). |
| `progress-tracker` | yes | yes, **byte-for-byte identical content**, same mtime (Aug 6 20:11, 1 min after CLAUDE.md) | yes | Both files were generated together by `generate-claude-md` in the same run — meaning CLAUDE.md did *not* pre-exist when `/rcode-init` ran here. Doesn't reproduce #1025's precondition. |
| `codewithhanzla-short` | yes | yes, **byte-identical**, same mtime | yes | Same situation as above — not a reproduction of the bug precondition. |

**None of the three suggested projects currently reproduces the bug's precondition** (pre-existing CLAUDE.md + rcode init running against it). In both real rcode installs, CLAUDE.md and AGENTS.md were generated together in the same second, which only happens when CLAUDE.md did *not* already exist — i.e., these two projects hit the `fresh`/`existing-new-rcode` path, not the "CLAUDE.md already there" path that #1025 is about. This narrows the bug's actual blast radius: it fires only when a project already had its own `CLAUDE.md` *before* rcode was ever added, which is a real but not universal case among rcode-enabled projects on this machine. (`social-poster` is disqualified — it's on the legacy `rihal-*` toolchain, not current rcode.)

Since no live project matched the precondition, I built a minimal disposable repro in the scratchpad (not touching any of the inspected projects) with only `CLAUDE.md` present — mirroring exactly the state `cmdGenerateClaudeMd()` guards against — and ran the real `codex` CLI (v0.147.0, `codex exec --sandbox read-only`) against it.

## 3. Observed Codex behavior (live, not inferred)

**Test A — explicit prompt naming CLAUDE.md's content ("do you have routing instructions"):**
Codex read `CLAUDE.md` (found via a general file listing) and correctly summarized its rcode-routing instructions, including pointing at `.rcode/workflows/do.md`. So Codex *can* use CLAUDE.md's content when it happens to open the file.

**Test B — neutral prompt, no repo present, "what conventions should I follow" (no file access):**
Codex answered from general training/defaults and explicitly said:

> "If the repository defines its own rules—typically in `AGENTS.md`, `CONTRIBUTING.md`, or CI configuration—those take precedence."

It named `AGENTS.md` unprompted as the canonical place it expects project rules to live. It did not mention `CLAUDE.md`.

**Test C — realistic task prompt ("add hello.txt, but tell me the rules first") in a repo containing only CLAUDE.md:**
This is the most telling result. Codex's *first* tool call was:

```
rg --files -g 'AGENTS.md' -g '!node_modules' -g '!vendor' -g '!dist' -g '!build'
```

— i.e., it reflexively searched **specifically for `AGENTS.md`**, not for project instructions generically and not for `CLAUDE.md`. That search came back empty. Only a second, broader `find . -maxdepth 2 -type f` call (issued because the repo was otherwise unfamiliar/empty) incidentally turned up `CLAUDE.md`, which Codex then read and did honor in its final answer, correctly citing the Conventional Commits rule and the (missing) `do.md` file.

## 4. What this confirms vs. adds to issue #1025

**Confirms:**
- The theoretical claim — "Codex has zero *ambient* routing instruction on existing Claude-Code-first projects" — is correct at the mechanism level. Codex's own reflexive discovery step targets `AGENTS.md` by name, not `CLAUDE.md`. There is no ambient/automatic AGENTS.md-equivalent pickup of CLAUDE.md.

**Adds nuance (this is the real-world finding, not the theoretical one):**
- The failure mode is **not** "Codex is completely blind to rcode." In this test, once Codex stumbled onto `CLAUDE.md` (via a broad directory listing triggered by the specific prompt), it read it and correctly followed the routing instruction, including looking for `.rcode/workflows/do.md`. So the practical risk is not "always fails silently" — it's **stochastic**: whether Codex ever finds and honors CLAUDE.md's rcode-routing rule depends entirely on whether some other part of its own exploration happens to open that file. On a larger, real codebase (not a 1-file scratch repo), an agent doing a targeted task (e.g., editing one specific source file) has much lower odds of any tool call surfacing `CLAUDE.md` at all, since Codex's own default habit is to look for `AGENTS.md`, not to enumerate root files hoping to find a Claude-specific one.
- Confirmed the bug is two-layered, not one: (1) `init.md`'s Step 4c guard only checks `CLAUDE.md` existence, and (2) even a corrected guard would still hit `cmdGenerateClaudeMd()` throwing on any existing `CLAUDE.md` before it reaches AGENTS.md-specific logic. A real fix needs to split "write CLAUDE.md" and "write AGENTS.md" into independently-gated operations, not just fix the shell `if` in `init.md`.
- None of the three candidate real projects on this machine currently reproduces the precondition — both live rcode installs got CLAUDE.md and AGENTS.md generated together (meaning CLAUDE.md didn't pre-exist for them). This means the bug's real-world footprint on this machine specifically is currently zero live instances, but the code path is real and will bite the next "run `/rcode-init` on a project that already has a hand-written or Claude-Code-authored `CLAUDE.md`" case — which is exactly the scenario issue #1025 was filed to cover.

## 5. Bottom line — what a real user experiences

A user who runs `/rcode-init` on a project that already has `CLAUDE.md` gets no `AGENTS.md`, and therefore no guaranteed hand-off of the rcode routing rule to Codex. When they then open Codex CLI in that project:
- Codex will *not* automatically discover rcode or `do.md` the way it does in an AGENTS.md-bearing project (confirmed: its default reflex is to search for `AGENTS.md` specifically).
- If, incidentally, some other exploration step causes Codex to open `CLAUDE.md` anyway, it *will* correctly parse and follow the rcode routing instructions inside it — Codex is not incapable of reading CLAUDE.md, it just doesn't go looking for it on its own.
- Net effect: intermittent, prompt-shape-dependent loss of rcode awareness in Codex sessions on these projects, rather than a hard, always-reproducing failure. That's a more precise and slightly more forgiving characterization than "Codex has zero ambient routing instruction" — it has zero *guaranteed* ambient routing instruction.
