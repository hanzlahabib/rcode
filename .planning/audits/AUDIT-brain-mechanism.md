# AUDIT — rcode "Brain" mechanism (`.rcode/brain/`, `brain.cjs`)

**Scope:** Diagnose + live-verify whether the "pull an external GitHub repo's rules/docs into rcode" feature (issues #158, #162, #163) actually works today. No fixes applied.

**Date:** 2026-08-10
**Method:** Static read of `rcode/bin/lib/brain.cjs`, `.rcode/brain/sources.yaml`, `docs/adr/0003-mcp-server-for-rcode-brain.md`, `cli/install.js`, `rcode/workflows/update.md`, `gh issue view` on #158/#162/#163, plus a live end-to-end `brain pull` run against a real public repo (`hanzlahabib/rcode`) in a throwaway scratch project.

---

## 1. Does the mechanism exist and run?

**Yes.** `rcode/bin/lib/brain.cjs` (353 lines) implements `cmdBrain(args, {PROJECT_ROOT, RCODE_DIR})` with three subcommands: `list`, `status`, `pull`. It is wired into `rcode/bin/rcode-tools.cjs` (dispatcher) and called from:

- `cli/install.js:2767` — runs `node <toolsPath> brain pull` as a child process at the end of every fresh install, with a **60s timeout** (issue #706), best-effort (failure doesn't fail install).
- `rcode/workflows/update.md` Step 8 — `/rcode-update` re-runs `node .rcode/bin/rcode-tools.cjs brain pull` after every update, described as "idempotent and safe to re-run."
- `cli/install.js:1054` `installBrainScaffold()` — copies `rcode/brain/sources.yaml` + README into `.rcode/brain/` on install (this itself closed issue #188, "sources.yaml was never copied to the target at all, leaving brain pull permanently broken" — i.e. the mechanism was non-functional at least once in its history until that fix).

## 2. Is `sources.yaml` real or placeholder?

**Entirely placeholder for the two real sources.** Confirmed by reading `.rcode/brain/sources.yaml` in this worktree:

- `rcode-github-standards` → `repo: "<PLACEHOLDER: github.com/rcode-om/???>"`
- `rcode-docs` → `repo: "<PLACEHOLDER: github.com/rcode-om/???>"`
- `rcode-best-practices` → `repo: self` — this one is **real and functional**: it's an in-repo copy (not a network pull) that walks `.rcode/skills/_shared/**/*.md` / `rcode/skills/_shared/**/*.md` under `PROJECT_ROOT` and copies `.md` files into `.rcode/brain/best-practices/`. Verified this is the *only* source that pulls anything on a normal `brain pull` today (see §4).

The two placeholder sources are silently skipped with a clear machine-readable reason (`"placeholder URL — fill in via issue #162 (M5)"`), never error out, and never block install/update. This matches the design intent stated in the file's own header comment and in issue #158's verification checklist ("with placeholder sources, command prints a clear message and exits 0").

## 3. What do issues #158, #162, #163 reveal?

All three are **closed**, all filed under the same now-defunct `rihal` naming (this repo has since been renamed to `rcode` — the issues literally say `rihal-tools.cjs`, `rihal/brain/`, `.rihal/`), and all reference milestone **"v2.0 — Rihal Brain"**:

- **#158 (M2 — Brain Ingestion, closed):** Scoped the ingestion pipeline itself — `sources.yaml`, `brain pull` subcommand, install hook, `/rihal:update` wiring. Explicitly says **"Does NOT need real Rihal URLs to merge — placeholders are acceptable. Real URLs arrive in M5."** This issue is fully delivered — the mechanism described here is exactly what exists in `brain.cjs` today (sparse checkout, graceful placeholder skip, install/update wiring).
- **#162 (M5 — Real Content, closed):** Scoped filling in the real org/docs repo URLs. Lists as an **open blocker: "Rihal GitHub org name + docs repo URL — supplied by Hanzla. Not yet available."** This issue is closed but its own stated blocker was never resolved — `sources.yaml` still has the literal `<PLACEHOLDER>` strings today, years later in the timeline the repo now uses (`rcode` era, `.rcode/`). Closing this issue did not mean the work was done; it means the ticket was closed without the real URLs ever being supplied.
- **#163 (M6/v3.0 — MCP server, closed, "design only"):** Scoped writing `docs/adr/mcp-design.md` and creating a v3 milestone with ≥3 implementation issues. `docs/adr/0003-mcp-server-for-rcode-brain.md` exists and matches the described content (hosting/auth/migration/latency/offline/tools-vs-resources open questions) — **but its own header says `Status: Draft · Design stub, not yet approved`**, and no v3.0 milestone or implementation issues exist in the tracker. So #163 was closed on producing the design stub, not on reaching "Approved" status per the ADR's own "Next actions to approve this ADR" section.

**Net read:** the "real URLs" and "MCP server" halves of the original v2.0 Brain plan were never delivered — the tickets were closed as scope-complete against a narrower bar ("placeholder is fine," "design doc only") rather than against the user-facing outcome ("rcode users have real institutional content" / "MCP server live"). The mechanism itself is real; the content behind it is not.

## 4. Live end-to-end test

Ran the actual `brain pull` subcommand from a scratch project (`/tmp/.../scratchpad/brain-test`), pointed at the real, small, public `hanzlahabib/rcode` GitHub repo (in the allowlist — see §5), pulling 2 files (`README.md`, `docs/adr/0003-mcp-server-for-rcode-brain.md`) pinned to commit `23bb1e9`. The real worktree's `.rcode/brain/sources.yaml` was never touched — verified clean via `git status`/`git diff` after the test, and the scratch dir + global cache slot created during the test were deleted afterward.

**Result: the pull mechanism genuinely works.**

```
{
  "ok": true,
  "pulled": [{
    "name": "rcode-live-test", "kind": "git",
    "repo": "https://github.com/hanzlahabib/rcode.git",
    "branch": "main", "cache": "miss", "cache_key": "5e2b66fdcb1faf31"
  }],
  "skipped": [], "errors": []
}
```

Files genuinely landed on disk at `.rcode/brain/live-test/`. Confirmed via `brain status` (`"fetched": true`) and `find`.

**Timing — first pull (cache miss): 58.34 seconds wall clock.** This is the `git clone --depth=1 --filter=blob:none --no-checkout` + sparse-checkout init/set/checkout sequence against GitHub over this network. That is **dangerously close to the 60s `execFileSync` timeout** set in `cli/install.js` for the install-time brain pull (issue #706) — a real install pulling from a source this slow (or slower) would have its brain pull silently killed and fall through to the best-effort catch block, reporting `Brain: skipped (...)`. It also blows well past the **10-second kill criterion issue #162 itself specified** ("`brain pull` completes in ≤ 10s on a typical connection... if it exceeds 10s, rebuild as MCP") — on this live test, a single 2-file source alone took ~6x that budget.

**Second pull (cache hit): 0.038 seconds.** The `~/.rcode/brain-cache/<sha1>/` cache (issue #170) works correctly — `isCacheFresh()` compares `pulled_at` against `cache_ttl` (default 6h) and short-circuits straight to a local `copyTree()`, no network call. This is a legitimate, verified mitigation for the timing problem *after* the first pull, but does not help a fresh install's first pull, nor a CI/ephemeral environment that never warms the cache.

**Unexpected finding — sparse-checkout over-fetches beyond declared paths.** `sources.yaml` declared exactly two paths (`README.md`, `docs/adr/0003-mcp-server-for-rcode-brain.md`), but the checkout that landed contained **six** files, including `README.md` copies nested under `.rcode/brain/README.md`, `rcode/brain/README.md`, `rcode/digests/README.md`, `.planning/summaries/v2-improvements/README.md`, and a skills-steps `README.md` — every `README.md` anywhere in the source repo's tree, not just the root one. This is because `git sparse-checkout set` in `--no-cone` mode (used here, per `brain.cjs:317`) treats each path entry as a `.gitignore`-style pattern, not a literal path pin — a bare filename like `README.md` matches that filename at any depth. The `docs/adr/...` path (a full path, no wildcards) behaved as expected and pulled only the one file. **Any source in `sources.yaml` using a bare filename pattern (not just this test source — worth checking is whether a real future source would do the same) will over-fetch every file with that name repo-wide**, silently expanding what content reaches every rcode user's project context beyond what the source's own declared `paths:` implies. This is a genuine gap in the mechanism's path-scoping guarantee, not a placeholder-content issue — it would reproduce with real URLs the moment M5 ships.

## 5. Security guard present and functional

`brain.cjs:204-235` (issue #925) enforces an allowlist: only `github.com` host + `hanzlahabib`/`rcode-om` orgs are pulled without an explicit `RCODE_BRAIN_ALLOW_UNVERIFIED=1` opt-out, and any un-pinned source (no `ref:` SHA) is skipped with a warning rather than silently tracking a mutable branch tip. Verified this live: the test source had to both match the allowlist and carry a pinned `ref:` SHA, or it was skipped — this guard is real, not aspirational.

## 6. Summary — what's real vs. placeholder-only

| Piece | Status |
|---|---|
| `brain.cjs` pull/list/status subcommands | **Real, working.** Live-verified end to end. |
| Sparse-checkout + git clone of external repos | **Real, working**, but slow (~58s cold) and over-fetches on bare-filename path patterns |
| Global cache (`~/.rcode/brain-cache/`, issue #170) | **Real, working.** Cache hit is near-instant and correctly TTL-gated. |
| Supply-chain allowlist + ref-pinning guard (issue #925) | **Real, working.** Verified live. |
| Install-time (`cli/install.js`) + update-time (`update.md`) wiring | **Real, working**, best-effort with a 60s timeout that the live test came close to exceeding on a single 2-file source |
| `self` in-repo source (`rcode-best-practices`) | **Real, working**, and the only source that currently fetches anything on an unmodified `brain pull` in this repo |
| `rcode-github-standards` / `rcode-docs` real URLs (issue #162 / M5) | **Never delivered.** Still literal `<PLACEHOLDER>` strings; #162's own blocker ("URLs supplied by Hanzla") was never resolved before the issue was closed. |
| MCP server v3.0 (issue #163 / ADR 0003) | **Design stub only**, `Status: Draft · not yet approved`. No v3 milestone, no implementation issues, no server. |

**Bottom line:** the project owner's memory is accurate that this feature was built — the pull mechanism, caching, security guard, and install/update wiring are all real and functional, confirmed by live-testing against an actual public GitHub repo. What was never finished is supplying rcode's own real org/docs repo URLs into `sources.yaml` (#162) and the MCP-server evolution (#163) — both tickets were closed against a "design/plumbing only" bar rather than the outcome the milestone name ("v2.0 — Rihal/Rcode Brain") implies. Additionally, this audit surfaced two live-verified risks that predate and are independent of the placeholder-URL gap: (a) cold-pull latency (~58s for 2 files) sits close to the install-time 60s timeout and ~6x over the issue's own 10s kill criterion, and (b) `--no-cone` sparse-checkout path patterns over-fetch when a source uses a bare filename, silently pulling more content than `sources.yaml` declares.
