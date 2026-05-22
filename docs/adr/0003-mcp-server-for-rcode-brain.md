# ADR 0003 — MCP Server for the rcode Brain (v3.0 direction)

**Status:** Draft · Design stub, not yet approved
**Date:** 2026-04-24
**Supersedes:** nothing yet
**Superseded by:** —
**Tracks:** GitHub issue [#163](https://github.com/hanzlahabib/rihal-code/issues/163)

---

## Context

rcode v2.0 delivers rcode's institutional context to every Rihalian's project through a **static + semi-dynamic** model: `rcode/brain/sources.yaml` lists upstream repos (GitHub org, rcode docs repo, in-repo best-practices); `rcode-tools brain pull` clones those sources via sparse checkout; the pulled content sits under `rcode/brain/` until the next `/rcode-update`.

This works for v2.0 but has three known limits:

1. **Staleness between updates.** A Rihalian who runs `/rcode-update` on Monday sees Monday's standards all week, even if a critical PR-review rule is updated on Tuesday morning.
2. **Pull cost compounds.** As rcode's doc corpus grows, `brain pull` time grows linearly. The v2.0 kill criterion is 10s on fresh install — we will hit that.
3. **No audit trail.** There is no record of which Rihalian's project is on which brain version, no telemetry on which standards are actually surfaced to the AI, no way to hot-fix a mistaken standard across all installations.

An **MCP server** (Model Context Protocol) hosted on rcode infrastructure would solve all three. Every Rihalian's IDE would register the rcode MCP server; the AI queries it live for the relevant standard at the moment of relevance; rcode sees aggregate usage and can push updates instantly.

This ADR captures the design direction and the open questions we need to answer before writing a single line of server code.

---

## Decision (provisional — pending resolution of open questions below)

Build a single rcode-hosted MCP server that exposes the rcode brain as:

- **Resources** — each rcode standard doc (PR standards, commit standards, architecture playbook sections) addressable by URI (e.g. `rcode://standards/pr-standards`).
- **Tools** — query helpers, e.g. `getReviewChecklistFor(projectType)` returning the right section of the PR-review checklist based on the caller's project type.

The v2.0 static pull remains available as an offline fallback and for non-Rihalians.

---

## Open questions (MUST be resolved before implementation)

### Q1. Hosting

**Options:**
- A) Small Node service on rcode's existing infra (GCP / AWS / Azure — which does rcode already pay for?).
- B) Cloudflare Workers (low latency, zero ops, edge-close).
- C) Vercel Functions (Fluid Compute) for the Node runtime.
- D) Self-hosted in rcode office network only (security-max, availability-min).

**Recommendation:** defer until rcode ops team weighs in. If rcode already has SSO + cloud infra, match that. If not, Cloudflare Workers is the lowest-friction starting point.

### Q2. Authentication

**Question:** how does the MCP server know the caller is a Rihalian?

**Options:**
- A) rcode SSO (Google Workspace? Microsoft? which does rcode use?).
- B) Per-employee static API tokens provisioned via an admin UI.
- C) Anonymous access — the content is not that sensitive, treat it like public docs.

**Implication:** option A or B means we can surface **private rcode standards** (internal review processes, deal-specific playbooks). Option C limits the server to public content.

### Q3. Migration path from v2.0

**Options:**
- A) Side-by-side — v2.0 static pull and v3.0 MCP both work; `rcode/brain/` is the fallback when MCP is unreachable.
- B) MCP-default — install flips to MCP registration by default; static pull is opt-in.
- C) Hard cut — v3.0 removes static pull; everyone migrates or pins to v2.x.

**Recommendation:** A for at least one release. Any network outage at rcode should not disable every Rihalian's AI assistant.

### Q4. Latency budget

**Question:** how slow can the MCP server be before the user notices?

**Rough budget:**
- **P50 ≤ 100ms.** Below the threshold where the AI's overall response feels slower.
- **P95 ≤ 300ms.** Occasional outliers acceptable.
- **P99 ≤ 800ms.** Above this, fall back to cache.

**Implication:** caching layer is mandatory. Consider a Cloudflare KV / Redis / Upstash tier sitting in front of whatever content store we pick.

### Q5. Offline behavior

**Question:** what does a Rihalian's AI see when they are on a plane / at home with bad wifi / on rcode VPN disabled?

**Decision:** MCP server MUST include an offline cache. The AI sees the last-seen version of each resource, with a warning banner ("brain cache from 2026-05-12 — you may be offline") injected into the first response of a session where live fetch failed.

### Q6. What gets exposed as a Tool vs a Resource?

**Resources** — content the AI reads (standards, playbooks, ADR excerpts).
**Tools** — actions the AI calls (query a standard by project type; search standards by keyword; fetch rcode's current release calendar).

Initial scope: 10–15 resources, 3 tools. Grow after shipping.

### Q7. Brain content update pipeline

When a rcode PM edits the PRD-review checklist in the rcode docs repo and merges the PR, how does that change reach a Rihalian's AI within 5 minutes?

**Options:**
- A) Webhook from rcode docs repo → MCP server's invalidation endpoint → cache eviction.
- B) Polling — MCP server re-reads the docs repo every 5 minutes.
- C) Pull-on-miss — first cache miss triggers a re-fetch.

**Recommendation:** A + C together. Webhook for proactive invalidation; pull-on-miss as a safety net.

---

## Consequences

### Positive
- Rihalians always see current rcode standards without running `/rcode-update`.
- rcode can push hot-fixes to mistaken standards within minutes.
- Aggregate telemetry on what the AI actually surfaces to Rihalians — feedback loop for standards that are not landing.
- Eliminates the 10s `brain pull` cost on every install.

### Negative
- New infrastructure to run and monitor (v2.0 needed no rcode-side infra).
- Availability coupling — MCP outage degrades every Rihalian's AI.
- Auth complexity — SSO integration, token rotation, offboarding.
- Higher initial investment than v2.0's "just `git clone`" approach.

### Neutral
- Non-Rihalians can still install rcode; they just skip MCP registration and run on the static pull layer.

---

## Out of scope (for this ADR)

- Specific MCP tool signatures — belongs in a follow-up ADR once the MCP server is running in dev.
- Billing / cost projections — this is a design doc, not a budget.
- Telemetry schema — separate ADR when privacy review happens.

---

## Next actions to approve this ADR

1. rcode ops picks a hosting option (Q1).
2. rcode IT picks an auth model (Q2).
3. A rcode engineer owns Q3-Q7 implementation design (separate ADR).
4. This ADR is revisited, open questions become decisions, status flips to **Approved**.
5. A v3.0 GitHub milestone is created and implementation tickets are filed.

Until those four happen, v3.0 stays on the roadmap as a direction, and v2.0 + v2.5 carry the product.
