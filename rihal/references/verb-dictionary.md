# Verb Dictionary — multilingual intent matching

**Purpose:** single source of truth for action verbs across all Rihal workflows that do intent matching. Without this, each workflow's matcher diverges and Roman Urdu / Hindi instructions silently miss.

**How to use from a workflow:** include this file via `@.rihal/references/verb-dictionary.md` and reference categories by name (e.g. *"verbs from §Create"*) instead of restating English-only lists inline.

---

## §Create — make / start / new / open

Match if `$QUESTION` contains any of these (case-insensitive):

- **English:** `create`, `make`, `start`, `build`, `set up`, `setup`, `kick off`, `spin up`, `open`, `begin`, `draft`, `generate`, `produce`, `initialize`, `init`, `bootstrap`, `establish`, `form`
- **Roman Urdu / Hindi:** `bnao`, `banao`, `bana do`, `bnado`, `banaa`, `banade`, `banayein`, `banadijiye`, `shuru karo`, `shuro karo`, `start karo`, `create karo`, `naya banao`, `nya banao`, `draft karo`, `banalo`, `khol do`, `khol lo`, `kholiye`
- **Arabic transliteration:** `ansha'`, `inshaa'`, `a3mal`, `ibda'`

## §Add — append / include / attach / extend

- **English:** `add`, `append`, `include`, `attach`, `insert`, `extend`, `expand`, `register`
- **Roman Urdu / Hindi:** `add karo`, `daal do`, `daalo`, `daal de`, `jor do`, `jor de`, `lagao`, `lagado`, `shamil karo`, `shaamil karo`, `barhao`
- **Arabic transliteration:** `azif`, `dam'`

## §Plan — design / scope / outline

- **English:** `plan`, `design`, `draft`, `scope`, `outline`, `architect`, `lay out`, `schedule`
- **Roman Urdu / Hindi:** `plan karo`, `design karo`, `sochlo`, `soch lo`, `layout banao`, `tarteeb do`, `tartib karo`
- **Arabic transliteration:** `khattit`, `tasmim`

## §Execute — run / build / ship / implement / do

- **English:** `execute`, `run`, `build`, `ship`, `complete`, `do`, `implement`, `deliver`, `finish`, `wrap up`, `compile`
- **Roman Urdu / Hindi:** `chalao`, `chala do`, `run karo`, `kar do`, `kardo`, `kar lo`, `karlo`, `implement karo`, `mukammal karo`, `complete karo`, `khatam karo`, `pura karo`
- **Arabic transliteration:** `naffidh`, `aakmel`, `nafidh`

## §Review — audit / check / inspect / verify / validate

- **English:** `review`, `audit`, `check`, `inspect`, `verify`, `validate`, `examine`, `assess`, `evaluate`
- **Roman Urdu / Hindi:** `dekho`, `dekh lo`, `dekhlo`, `check karo`, `audit karo`, `verify karo`, `validate karo`, `parkho`, `parakhh`, `mulahiza karo`, `nazar dalo`, `jaiza lo`
- **Arabic transliteration:** `raji'`, `tahaqqaq`, `dakhq`

## §Show — list / display / get / fetch / see

- **English:** `show`, `list`, `display`, `get`, `fetch`, `see`, `view`, `print`, `output`, `summarize`
- **Roman Urdu / Hindi:** `dikhao`, `dikha do`, `dikhado`, `dikha de`, `list karo`, `batao`, `bata do`, `bata de`, `kholo`, `khol do`
- **Arabic transliteration:** `azhir`, `arini`, `aktub`

## §Remove — delete / drop / undo / revert / kill

- **English:** `remove`, `delete`, `drop`, `undo`, `revert`, `rollback`, `kill`, `purge`, `uninstall`, `clear`, `wipe`, `erase`
- **Roman Urdu / Hindi:** `hatao`, `hata do`, `hatado`, `mita do`, `mita lo`, `mitao`, `delete karo`, `ulto`, `revert karo`, `nikalo`, `nikal do`, `khaali karo`
- **Arabic transliteration:** `ihdhif`, `azhil`, `imhu`

## §Update — modify / change / edit / refresh / fix

- **English:** `update`, `modify`, `change`, `edit`, `refresh`, `fix`, `patch`, `tweak`, `adjust`, `correct`, `repair`
- **Roman Urdu / Hindi:** `update karo`, `badlo`, `badal do`, `badal de`, `change karo`, `edit karo`, `theek karo`, `theek kar do`, `thiek karo`, `fix karo`, `behtar karo`, `behter karo`, `improve karo`
- **Arabic transliteration:** `ghair`, `aslih`, `hadith`

## §Pause — stop / wait / hold / cancel

- **English:** `pause`, `stop`, `wait`, `hold`, `cancel`, `abort`, `halt`, `freeze`, `defer`
- **Roman Urdu / Hindi:** `ruko`, `ruk jao`, `band karo`, `band kardo`, `cancel karo`, `roko`, `rok do`, `rok de`, `pause karo`, `wapas karo`
- **Arabic transliteration:** `tawaqaf`, `intazir`

## §Resume — continue / pick up / restart

- **English:** `resume`, `continue`, `pick up`, `restart`, `re-run`, `replay`, `re-do`, `keep going`, `proceed`
- **Roman Urdu / Hindi:** `phir se shuru karo`, `aage barho`, `aage chalao`, `continue karo`, `wapas chalao`, `dobara chalao`, `dobara karo`
- **Arabic transliteration:** `astamir`, `i'ad`

---

## Scope nouns (paired with verbs to detect intent)

These are matched alongside §Create / §Add / §Plan verbs to determine the dispatch route.

| Scope noun | Aliases (English + Urdu) | Maps to (workflow) |
|---|---|---|
| milestone | `milestone`, `milestones`, `release`, `version`, `cycle` | `/rihal:new-milestone` |
| phase | `phase`, `phases` (singular intent — "add a phase") | `/rihal:add-phase` |
| story | `story`, `stories`, `user story`, `kahani` | `/rihal:create-story` |
| epic | `epic`, `epics`, `epics and stories` | `/rihal:create-epics-and-stories` |
| sprint | `sprint`, `iteration` | `/rihal:sprint-planning` |
| PRD | `PRD`, `requirements doc`, `product requirements` | `/rihal:create-prd` |
| roadmap | `roadmap`, `plan` (top-level) | `/rihal:create-milestone` |
| council | `council`, `majlis`, `panel`, `mashwara`, `salah` | `/rihal:council` |
| plan (verb form — "plan phase N") | `plan` | `/rihal:plan` |
| story (impl) | `dev story`, `implement story`, `build story` | `/rihal:dev-story` |
| brainstorm | `brainstorm`, `ideas`, `sochain`, `sochna` | `/rihal:brainstorm` |
| review (code) | `code review`, `karpathy`, `check my diff` | `/rihal:karpathy-audit` / `/rihal:code-review` |
| debug | `debug`, `fix`, `bug`, `error`, `crash`, `kharab`, `theek` | `/rihal:debug` |

---

## Usage examples

**From a workflow (e.g. `do.md`):**

```markdown
## Step: Match intent

Apply §Create + scope-noun match per @.rihal/references/verb-dictionary.md.

If `$QUESTION` contains any verb from §Create AND any scope noun from the
table above, dispatch directly to the mapped workflow without an
ambiguity prompt.

Example: "milestone bnao" → §Create matches "bnao", scope matches
"milestone" → /rihal:new-milestone (with state-aware redirect to
/rihal:add-phase if a milestone is already active).
```

**From an agent file (e.g. `rihal-codebase-mapper.md`) when interpreting the orchestrator prompt:**

```markdown
@.rihal/references/verb-dictionary.md

## Workflow

Recognize §Show / §Review / §Update verbs against the codebase. Honor
multilingual phrasing — never silently fall through because a Roman
Urdu instruction was the verb form.
```

---

## Maintenance

Every entry must be a verb actually observed in user input — not invented. When you discover a new phrasing that broke matching, add it to the relevant category here rather than to the consuming workflow's local list. Single source of truth.
