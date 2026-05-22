# Pre-Demo Checklist — rcode v2

One-page script for when demo time arrives. Work top-to-bottom. Each item is a minute or less except the two **blocker** items at the top.

---

## Blockers — do these first or the demo is dark

### ☐ 1. Fix CI billing ([#165](https://github.com/hanzlahabib/rihal-code/issues/165))
GitHub → repo Settings → Billing → Actions spending. Raise the limit, or flip the repo to public for free Actions minutes, or add a self-hosted runner. Without this, no `release.yml` runs, no automated tests, no semantic PR checks.

### ☐ 2. Wire real rcode URLs ([#162](https://github.com/hanzlahabib/rihal-code/issues/162))
Open `rcode/brain/sources.yaml`. Replace the two `<PLACEHOLDER>` entries with the actual rcode GitHub org + docs repo URLs. Commit. Push. Tag a patch release (e.g. `v2.0.1`). After this, every fresh install pulls real rcode standards.

---

## Tag the current state

### ☐ 3. Tag `v2.1.0`
M2.5 (rebuilt `/progress` and `/status`) is on main. If the tag was missed, run:
```bash
git checkout main && git pull
git tag -a v2.1.0 -m "v2.1.0 — Progress/Status CLI rebuild"
git push origin v2.1.0
```
Once #165 is fixed, `release.yml` will auto-publish. If #165 isn't fixed, publish manually with `gh release create v2.1.0 ...` (see how v2.0.0 was done).

### ☐ 4. Verify the installer works against the tag
In a clean scratch dir:
```bash
mkdir /tmp/rcode-demo && cd /tmp/rcode-demo
npx @hanzlaa/rcode@latest install
ls -la .rcode/ .claude/
node .rcode/bin/rcode-tools.cjs brain pull
node .rcode/bin/rcode-tools.cjs progress init | head -30
```
All four commands should succeed. Brain pull should either fetch real rcode content (if #162 is done) or skip placeholders with a clean message.

---

## Demo script

### ☐ 5. Open Claude Code in the scratch dir
Run `claude` in `/tmp/rcode-demo`. Confirm the 55 skills, 44 agents, 93 commands banner from the install output.

### ☐ 6. Show the golden path — 7 skills end-to-end
Demo flow, in this order:

1. `/rcode:scaffold-project` — show project init
2. `/rcode:create-prd` — ask a short PRD question; demo the halt-at-menu discovery (this is the #124 fix in action)
3. `/rcode:create-milestone` — turn the PRD into a roadmap with binary kill criteria (the #134 step files show their value here)
4. `/rcode:create-epics-and-stories` — decompose M1 into stories
5. `/rcode:sprint-planning` — demo the capacity gate (asks for devs/PTO/velocity — #127 in action)
6. `/rcode:dev-story` — implement one story
7. `/rcode:progress` — show the Route A/B/C next-up menu (M2.5 — CLI-rendered)

### ☐ 7. Show the brain
```bash
ls .rcode/brain/rcode-github/
ls .rcode/brain/rcode-docs/ | head
cat .rcode/brain/best-practices/no-autonomous-bypass.md | head -10
```
This is the punchline — every Rihalian's install has rcode's standards already sitting in their project context.

### ☐ 8. Show the docs
Quick scroll through:
- `README.md` — lead with the brain framing
- `docs/what-is-rcode.md` — product story
- `docs/ROADMAP.md` — v2 → v3 direction (MCP on the horizon)
- `CONTRIBUTING.md` — per-role "who owns what" table

---

## Close on impact

### ☐ 9. Pull up the milestone board
`https://github.com/hanzlahabib/rihal-code/milestone/4` — show 6 of 7 issues CLOSED, the M5 URL ticket now resolved, the v3 MCP design doc pinned.

### ☐ 10. Name the next ask
Depending on audience:

- **rcode leadership** — approval for v3.0 MCP infrastructure spend (see `docs/adr/0003-mcp-server-for-rcode-brain.md` Q1–Q7).
- **rcode engineering** — volunteer role-owners for each skill folder (see CODEOWNERS placeholder — currently all routed to @hanzlahabib).
- **rcode PMs** — write their first PR against `rcode/skills/actions/2-plan/` to prove the per-role contribution model works before the 60-day kill criterion hits.

---

## Fallback plan — if something breaks live

- `/rcode:progress` on the scratch dir gives an honest "here's where we are" even if a skill misfires.
- `rcode-tools state read` always works as a ground-truth fallback.
- If a slash command misfires, show the rule text — e.g. `cat rcode/skills/_shared/no-autonomous-bypass.md`. The rule itself is demo-worthy; watching the agent enforce it is the bonus.

---

**Prep time from cold:** ~15 min if blockers 1+2 are already done. ~45 min if you're doing them live at the demo.

**Demo runtime:** 12–15 min for the full script. Trim to items 5, 6, 7 for a tight 7-min version.
