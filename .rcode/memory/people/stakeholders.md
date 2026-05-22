# Stakeholders — `rcode`

External contacts with decision authority. Client name, role, comm channel, response cadence, areas they own.

> **This file directly addresses the "client late requirements → delays" pain.** When stakeholders' response cadence and ownership areas are documented, work can be sequenced around real human availability instead of optimistic assumptions.

---

## Format

```
### Name — Role @ Organisation

- **Owns:** what they decide on
- **Comm:** preferred channel (Slack / email / WhatsApp)
- **Response cadence:** typical turnaround (e.g. 24h / weekly sync only)
- **Time zone:** GMT+X
- **Notes:** quirks, escalation path, who covers when away
```

---

## Stakeholders

<!-- Add entries here -->

### Hanzla Habib — solo builder / maintainer / sole decision authority

- **Owns:** every architectural call, brand surface, release cadence, and dogfeed verdict
- **Comm:** GitHub (`@hanzlahabib`) for issues/PRs; direct for everything else
- **Response cadence:** same-day on active work; rcode is a solo side-project shipped in dialogue with Claude
- **Time zone:** GMT+5 (PK) / GMT+4 (Oman) overlap
- **Notes:** rcode is built *with* Claude, not just *for* it — the methodology shipped here is the one Hanzla uses to build rcode itself. Every workflow, agent, and skill was designed in dialogue with the same LLM users will be running.

### npm users — `@hanzlaa/rcode` consumers

- **Owns:** real-world feedback on whether rcode reduces context loss in their projects
- **Comm:** GitHub Issues + PRs at `hanzlahabib/rihal-code`
- **Response cadence:** best-effort; bug reports prioritised within 1 week
- **Time zone:** global
- **Notes:** primary audience is solo devs and startup teams. Personas (Sadiq, Waleed, Dalil, etc.) keep Arabic names as brand vocabulary — universally usable, not rcode-only.

### rcode team (internal) — institutional knowledge consumers

- **Owns:** rcode-specific brain content pulled into every install via `.rcode/brain/`
- **Comm:** Slack (rcode workspace)
- **Response cadence:** day-of for active projects
- **Time zone:** GMT+4 (Oman)
- **Notes:** rcode evolved as a personal side-project that ships rcode's PR/commit/architecture standards. The `.rcode/brain/sources.yaml` file points at upstream rcode repos.

### Claude Code / Cursor / Gemini — IDE platform partners

- **Owns:** the slash-command + skill protocols rcode targets
- **Comm:** none direct; we conform to their public APIs and changelogs
- **Response cadence:** asynchronous — track upstream releases for breaking changes
- **Time zone:** n/a
- **Notes:** if Claude Code changes its skill discovery format, the installer's prefix logic at `cli/install.js:741-743` may need to follow.
