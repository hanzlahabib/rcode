# Security Policy

## Supported Versions

| Version | Status |
|---------|--------|
| 4.x     | Active — bug fixes + security patches |
| 3.x     | End-of-life as of v4.0.0 release (2026-05-23). No further updates. |
| < 3.x   | End-of-life. |

The v4 release was a hard break from v3 (full `rihal` → `rcode` rename across paths, identifiers, and slash commands). v3 installations cannot be auto-migrated. If you are on v3 and need a security fix, the upgrade path is a fresh `pnpm dlx @hanzlaa/rcode install` in your project.

## Reporting a Vulnerability

Please **do not** open public GitHub issues for security vulnerabilities.

Email reports to **hanzla.dev@gmail.com** with:

- A clear description of the issue and the affected component
- Steps to reproduce or a proof-of-concept
- The rcode version (`rcode-tools version`)
- Any suggested remediation if you have one

You will receive an acknowledgement within 72 hours. I aim to ship a fix or mitigation within 14 days for high-severity issues, and within 30 days for medium-severity issues. The 90-day public disclosure window starts from the date of your initial report.

## Scope

The following components are in scope:

- The `@hanzlaa/rcode` npm CLI (`cli/`, `dist/`)
- Shipped agent, skill, workflow, and template files (`rcode/`)
- The `rcode-tools` and `rcode-hooks` binaries
- The Diwan dashboard server (`server/dashboard.js`)
- The post-commit Git hook installed by `rcode install`

The following are explicitly out of scope:

- Third-party LLM APIs (Anthropic, OpenAI, Google, etc.)
- IDE extensions that rcode plugs into (Claude Code, Cursor, Gemini, VS Code, Antigravity, Windsurf)
- User-installed dependencies in projects that use rcode
- Vulnerabilities in user-authored content under `.rcode/memory/`, `.planning/`, or `rcode/brain/<dest>/` (pulled from external repos via `brain pull`)
- Issues that require local filesystem write access to a user's project (the threat model assumes the user trusts their own working tree)

## Acknowledgements

This section will be updated as reports are received and fixes ship.

_None yet._

## Disclosure Policy

Once a fix is shipped:

1. A CVE will be requested if appropriate (rcode is a tool, not a service, so most issues will be CWE-tracked rather than CVE-tracked).
2. The fix commit will reference the report in `CHANGELOG.md` under a `Security` heading for the affected version.
3. The reporter will be credited in the Acknowledgements above unless they prefer to remain anonymous.

Reports made in good faith will be welcomed, even if the issue turns out to be out of scope or a known limitation.
