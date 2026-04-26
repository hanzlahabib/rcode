---
name: rihal-rebrand
description: Stack-wide rebranding migration — refs, assets, copy, env vars, docs, redirects, package names. Use when a project's brand changes mid-flight and the rename has to ripple through dozens of files without breaking anything. Specifically encodes the Rihal "had to do complete rebranding" pain — the rename touched 100+ files and broke 3 deploys before we got it right.
triggers:
  - "rebrand"
  - "stack-wide rename"
  - "product rename"
  - "rename project"
  - "brand migration"
  - "logo refresh"
  - "domain change"
  - "company name change"
user-invocable: true
---

## Overview

A rebrand is N renames at once: package name, npm scope, repo URL, environment variables, asset paths, copy strings, redirects, social handles, contracts. Each one looks small. Together they break things. This skill enforces a checklist + a decomposition (one category per commit) so the rename ships incrementally without a "Friday at 5pm" big-bang deploy.

## The 9 surfaces of a rebrand

For each: scope it before touching code, identify cross-references, decompose into commits.

### 1. Package + repo identity

- [ ] `package.json` `name`, `description`, `repository.url`, `homepage`, `bugs.url`
- [ ] `README.md` heading, badges, CDN URLs, npm install commands
- [ ] Repository name on GitHub (and any forks / deploy keys / webhooks)
- [ ] npm scope rename (this is one-way; coordinate carefully)

### 2. Environment variables + secrets

- [ ] Old prefix `OLDBRAND_*` → `NEWBRAND_*`
- [ ] Update `.env.example`, all CI environment definitions, K8s ConfigMaps and Secrets
- [ ] Compatibility window: read both names for 1 release, then drop the old

### 3. Assets

- [ ] Logos, favicons, OG images, brand-coloured graphics
- [ ] Email templates (transactional + marketing)
- [ ] PDF templates, certificate templates, invoice templates

### 4. Copy strings

- [ ] User-facing UI copy
- [ ] Email subject lines + bodies
- [ ] Push notification text
- [ ] Error messages
- [ ] Marketing site / landing page

### 5. URLs + redirects

- [ ] Old domain → new domain HTTP 301s
- [ ] Email-link tracking domains
- [ ] Deep-link schemes (`oldbrand://` → `newbrand://`) with backwards-compat for installed apps
- [ ] CDN paths + old-image redirects

### 6. Social + external

- [ ] Twitter / LinkedIn / Instagram handles (one-way; rename last after rest is verified)
- [ ] App Store / Play Store listings + reviews moved
- [ ] Crashlytics / Sentry project name
- [ ] Stripe / payment processor business name

### 7. Documentation + onboarding

- [ ] README, CONTRIBUTING, all `docs/`
- [ ] Internal wiki / Notion
- [ ] Customer-facing help docs

### 8. Code-internal references

- [ ] CSS variable names (`--oldbrand-blue` → `--newbrand-blue`)
- [ ] TS / JS namespace exports
- [ ] Test fixture data containing the old name

### 9. Legal + contracts

- [ ] Customer contracts referencing the old name
- [ ] Privacy policy, terms of service, DPA
- [ ] Trademark registrations + domain whois

## Workflow

1. **Inventory.** Grep for the old brand name across the entire monorepo (case-insensitive, all variants — `OldBrand`, `oldbrand`, `old-brand`, `OLD_BRAND`).
2. **Categorise** each hit into one of the 9 surfaces.
3. **Decompose into commits** — one surface per commit minimum. Surfaces 1, 2, 4, 5, 7, 8 can be one commit each; surface 6 (social) is the LAST commit because it's hardest to revert.
4. **Compatibility window.** For env vars, deep links, public APIs: read both names for 1 release, drop the old in the next.
5. **Verify after each commit:** the build passes, the tests pass, no broken links to the old name.
6. **Communicate.** Customer-facing rename is an event — schedule it, announce it, follow with a status post 24h later confirming nothing's broken.

## Output Format

```
Rebrand inventory — <old> → <new>
Total occurrences: <count> across <files>

By surface:
  1. Package + repo:    <count>
  2. Env vars:          <count>
  3. Assets:            <count>
  ...

Commit plan:
  1. refactor(meta): rename package + repo references
  2. refactor(env): migrate OLDBRAND_* env vars with compat fallback
  3. refactor(assets): swap logos, favicons, OG images
  ...

Compatibility windows:
  - env vars: 1 release
  - public API: 1 minor version with deprecation warning
  - deep links: 6 months for installed apps

Communication plan:
  - Internal heads-up: <date>
  - Customer email: <date>
  - Social handle change: <last commit ships>
  - 24h post-launch status: <date>
```

## Examples

**Happy path** — `OldBrand → NewBrand` rename. Inventory: 312 occurrences across 87 files in 9 surfaces. 9 commits over 4 days, compat window of 1 release for env vars + public API. Social handles renamed last. Zero customer reports of broken links.

**Edge case — domain change with email** — Old domain hosts customer email aliases. Old domain MUST keep MX records during compatibility window OR customers lose email. Add domain-MX to the checklist before touching DNS.

**Negative — rename in one commit** — Refuse. A 312-line diff across 87 files cannot be reviewed meaningfully and cannot be reverted partially. Decompose into 9 commits minimum.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/people/stakeholders.md` (who needs to approve external changes)
- **Writes:** `.rihal/memory/change-records/YYYYMMDD-NNN.md` per commit; `.rihal/memory/project/decisions.md` for the rebrand kickoff
