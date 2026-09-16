# WF-config-customization — Workflow Audit

**Lens:** config-customization
**Date:** 2026-09-16
**Auditor:** parallel auditor cohort (config-customization lens)

---

## Verdict

Configuration as a user lever is **leaky**: the settings wizard exposes 12 of 44 consumed keys, leaving 32 keys that silently govern critical workflow behaviour (worktree isolation, security enforcement, thinking partner, webhook notifications) with zero UI surface. The get/set plumbing is solid — atomic writes, alias fallback, clean nested YAML — but three independent naming schemes for the same concept (`commit_planning` / `commit_docs` / `git.commit_docs`), an invisible 3-alias language chain, and internal ephemeral state flags co-mingled with user settings make the config layer actively deceptive. The strongest single fix is not adding more settings but deleting the hidden state flags from the user's yaml file.

---

## The user's actual experience

**Setup path (first run)**

1. User runs `/rcode-init`. `rcode/workflows/init.md:135-142` prompts for `user_name`, `communication_language`, `model_profile`, writes them via `rcode-tools.cjs config-set`. Mode defaults to `guided`. That is the entire wizard — 4 keys total.

2. After init, `.rcode/config.yaml` exists with those 4 keys. The user has no awareness that `workflow.use_worktrees`, `workflow.security_enforcement`, `features.thinking_partner`, or `workflow.max_sprints_per_phase` even exist.

**Discovery path (later)**

3. User discovers `/rcode-settings` (or `/rcode-config` via alias in `rcode/command-aliases.yaml:15`). Runs it; `rcode/workflows/settings.md:49-61` calls `rcode-tools.cjs config-get` for exactly 11 keys. An additional 12th key (`output.verbose`) appears in the interactive menu (`settings.md:143`).

4. User changes `model_profile balanced → quality`. `rcode-tools.cjs:2875 cmdResolveModel()` maps quality → `claude-opus-4-7` for 6 hardcoded "QUALITY_AGENTS" (`sadiq`, `waleed`, `planner`, `sprint-checker`, `fatima`, `executor`/`verifier`). The user cannot see or change this QUALITY_AGENTS map from config — the mapping is hardcoded.

5. User sets `communication_language: Arabic`. `rcode-tools.cjs:107 readConfig()` re-aliases it as `language`. `rcode/workflows/init.md:588` resolves via `config.response_language || config.language || null`. Any subagent must receive `response_language` explicitly or it defaults to English silently. The user set one key; three aliases later it may or may not arrive at the workflow.

6. User inspects `.rcode/config.yaml` directly and sees:
   ```yaml
   workflow._auto_chain_active: false
   workflow._herdr_checked: false
   workflow._herdr_available: false
   ```
   These look like toggle-able settings. They are not — they are ephemeral runtime state written and cleared by `do.md`/`herdr` flows. Editing them manually has unpredictable effects.

7. User sets `git.commit_docs: true` in settings. `/rcode-execute` calls `cmdInitExecute()` at `rcode-tools.cjs:918`, which does NOT surface `commit_docs` — it surfaces `commit_planning`. The `commit_planning` key is read by `rcode/bin/lib/gitignore.cjs` via a raw regex (`cfg.match(/^\s*commit_planning:\s*(true|false)/m)`). The user's `git.commit_docs: true` has zero effect on gitignore during execute.

---

## Leaks

1. 🔴 **32 of 44 config keys are invisible to users** — `workflow.use_worktrees`, `workflow.security_enforcement`, `workflow.security_asvs_level`, `workflow.security_block_on`, `workflow.code_review_enabled`, `workflow.code_review_depth`, `features.thinking_partner`, `features.global_learnings`, `workflow.max_sprints_per_phase`, `workflow.max_checker_iterations`, `workflow.max_discuss_passes`, `slack_webhook_url`, `discord_webhook_url`, `teams_webhook_url`, `git.base_branch`, `context_window`, `audit_model` and 15 others are consumed by workflows but never exposed in `/rcode-settings`. Users configure blindly or not at all. Evidence: grep of `config-get` calls across `rcode/workflows/` vs `rcode/workflows/settings.md:49-61`.

2. 🔴 **`git.commit_docs` and `commit_planning` are the same concept under 3 names** — `rcode/bin/lib/gitignore.cjs` reads `commit_planning` via raw regex; `cmdInit()` resolves `config.git?.commit_docs ?? config.commit_docs`; `settings.md` exposes `git.commit_docs`. Setting `git.commit_docs true` in the wizard does NOT affect gitignore behaviour in execute because `cmdInitExecute()` (`rcode-tools.cjs:918`) sources `config.commit_planning` directly. User-facing cost: commit-planning toggle silently does nothing during execute.

3. 🔴 **Internal ephemeral state flags stored in user config** — `workflow._auto_chain_active`, `workflow._herdr_checked`, `workflow._herdr_available` are written to `.rcode/config.yaml` alongside user settings (`rcode-tools.cjs:cmdSet`). They look like settings; they are runtime state. A user who manually edits them or runs `config-set` can corrupt the herdr decision path. Evidence: `.rcode/config.yaml` in this repo; `do.md` writes these flags.

4. 🟡 **`communication_language` → `language` → `response_language` 3-alias chain is invisible** — User sets `communication_language`. `readConfig()` (`rcode-tools.cjs:107`) aliases it as `language`. Workflows then read `config.response_language || config.language`. Subagents spawned without explicit `response_language` passthrough silently default to English. The user has no indication their language setting requires forwarding. Evidence: `rcode-tools.cjs:107`, `447`, `588`, `1017`.

5. 🟡 **`model_profile` maps to hardcoded QUALITY_AGENTS list users cannot see** — `quality` profile routes 6 agents to `claude-opus-4-7` via a hardcoded map in `rcode-tools.cjs:2875`. Users cannot add agents to this list, pin a different model per agent, or see which agents get upgraded. The `model_override` key bypasses all profiles but is exposed nowhere in settings. Evidence: `rcode-tools.cjs:2875-2919`.

6. 🟡 **`rcode/references/model-profiles.md` documents stale model IDs** — The reference doc names `claude-3-5-opus-20241022`, `claude-3-5-sonnet-20241022`; the code (`rcode-tools.cjs:2895-2919`) uses `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`. Users reading the reference docs configure expectations against models that no longer exist. Evidence: `rcode/references/model-profiles.md` vs `rcode-tools.cjs:2895`.

7. 🟡 **`features.thinking_partner` and `features.global_learnings` are hidden power features** — Both are consumed by workflows and materially affect output quality and cost. Neither appears in `/rcode-settings`. Users who would benefit most (power users) will never discover them. Evidence: grep of `config-get features` in `rcode/workflows/`.

8. 🟡 **`cmdGet` returns empty stdout + exit 0 for missing keys** — `rcode/bin/lib/config.cjs:133` returns `null` when a key is unset; callers print empty string. Workflows using `|| echo "(unset)"` as fallback will fire, but any workflow that pipes the value without testing emptiness silently gets an empty string. Evidence: `config.cjs:128-133`.

9. 🟢 **`output.verbose` is only consumed by 2 workflows** — `settings.md` presents it as a general setting; grep shows it is only read by `status.md` and `council.md`. User sets it expecting verbose mode everywhere; most workflows ignore it.

10. 🟢 **`rcode/config.yaml` is a module identity file, not a user config** — The file name mirrors `.rcode/config.yaml` exactly. A user searching documentation for "config.yaml" may conflate the two. `rcode/config.yaml` contains `communication_language: English` as a module default — not a user-editable setting.

---

## Strengthenings

**Ranked by impact:**

1. **Remove ephemeral flags from user config** — Move `workflow._auto_chain_active`, `workflow._herdr_checked`, `workflow._herdr_available` to `.rcode/state.json` (already exists for runtime state) or a dedicated `.rcode/.runtime.json`. The user's config.yaml is then free of surprise fields. Effort: **S**. Files: `rcode/bin/rcode-tools.cjs` (cmdSet/cmdGet routing), `rcode/workflows/do.md`, `rcode/workflows/herdr.md`.

2. **Fix the `commit_planning` / `git.commit_docs` split** — Pick one canonical key. The cleanest path: `git.commit_docs` (already in settings wizard). Update `rcode/bin/lib/gitignore.cjs` to resolve via `config.cjs cmdGet('git.commit_docs') ?? cmdGet('commit_planning')`. Remove the dead `commit_planning` key from new inits. Effort: **S**. Files: `gitignore.cjs`, `rcode-tools.cjs:cmdInitExecute`, `rcode/workflows/init.md`.

3. **Expose the top 5 hidden power keys in `/rcode-settings`** — Add to the settings wizard: `workflow.use_worktrees` (bool), `features.thinking_partner` (bool), `features.global_learnings` (bool), `workflow.max_sprints_per_phase` (int), `model_override` (string|empty). These five drive the biggest user-visible behaviour change per line of wizard code. Effort: **S**. Files: `rcode/workflows/settings.md`.

4. **Fix the language alias chain** — Replace the 3-alias chain with a single canonical key `communication_language` read everywhere. Remove `language` as an alias from `readConfig()`; update the 4 call sites in `rcode-tools.cjs` that check `config.response_language || config.language`. Effort: **M**. Files: `rcode-tools.cjs:107,447,588,1017`, any workflow that reads `response_language` directly.

5. **Update `model-profiles.md` to current model IDs** — Replace `claude-3-5-opus-20241022` / `claude-3-5-sonnet-20241022` with `claude-opus-4-7` / `claude-sonnet-4-6` / `claude-haiku-4-5-20251001`. Effort: **S**. Files: `rcode/references/model-profiles.md`.

6. **Surface QUALITY_AGENTS list in docs or config** — Add a note in `model-profiles.md` listing which agents get the quality model. Long-term: make the list configurable via `workflow.quality_agents` array (but document before you implement). Effort: **M**. Files: `rcode/references/model-profiles.md`, `rcode-tools.cjs:2875`.

7. **Scope `output.verbose` honestly** — Either (a) implement it in all major workflows (L effort) or (b) rename it `output.verbose_council` and document the actual scope in settings.md. False-scope settings erode trust in the config system. Effort: **S** for rename/document. Files: `rcode/workflows/settings.md`.

---

## Kill your darlings

1. **Delete `workflow._auto_chain_active`, `workflow._herdr_checked`, `workflow._herdr_available` from config.yaml schema entirely.** They are not user settings. They belong in state.json. Their presence in user config is pure noise that invites manual edits with undefined effects.

2. **Delete the `language` alias in `readConfig()` (`rcode-tools.cjs:107`).** It exists only because a past refactor renamed `communication_language` to `language` halfway. The two-name lookup is now a permanent ambiguity trap. One name, one lookup.

3. **Delete `commit_planning` as an accepted key in new project inits.** The key predates the nested `git.commit_docs` scheme. Three names for one boolean is two too many. Keep `git.commit_docs`, deprecate the others, remove from init.md template.

4. **Delete or merge `rcode/config.yaml` from the user-facing mental model.** It is a module identity file. Rename it `rcode/module.yaml` or `rcode/manifest.yaml` so users can't confuse it with their per-project `.rcode/config.yaml`. The `communication_language: English` default living there is a subtle gotcha — it looks authoritative when `.rcode/config.yaml` is the real source.

5. **Delete `KEY_ALIASES` in `config.cjs` once the naming split is fixed.** The aliases exist because `git.commit_docs` and `discuss_mode` were once flat keys. After the canonical names are settled and migrated, the alias map becomes a compatibility shim that silently hides future naming bugs. Ship the migration, then remove the aliases.
