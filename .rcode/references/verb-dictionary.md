# Verb Dictionary — multilingual intent matching

**Purpose:** single source of truth for action verbs across all Rihal workflows that do intent matching. Without this, each workflow's matcher diverges and Roman Urdu / Hindi / Arabic instructions silently miss.

**How to use from a workflow:** include this file via `@.rihal/references/verb-dictionary.md` and reference categories by name (e.g. *"verbs from §Create"*) instead of restating English-only lists inline.

**Arabic priority:** Rihal's primary user base operates in Arabic. Native Arabic script (المشروع, مرحلة, راجع) MUST be in every category — transliteration is a fallback for keyboard input only. When you see a new Arabic phrasing in user input, add the native script first, then the transliteration.

---

## §Create — make / start / new / open

Match if `$QUESTION` contains any of these (case-insensitive):

- **English:** `create`, `make`, `start`, `build`, `set up`, `setup`, `kick off`, `spin up`, `open`, `begin`, `draft`, `generate`, `produce`, `initialize`, `init`, `bootstrap`, `establish`, `form`, `new`
- **Roman Urdu / Hindi:** `bnao`, `banao`, `bana do`, `bnado`, `banaa`, `banade`, `banayein`, `banadijiye`, `shuru karo`, `shuro karo`, `start karo`, `create karo`, `naya banao`, `nya banao`, `draft karo`, `banalo`, `khol do`, `khol lo`, `kholiye`
- **Arabic native:** `أنشئ`, `أنشأ`, `ابدأ`, `اعمل`, `افتح`, `كوّن`, `كون`, `أسس`, `اصنع`, `أوجد`, `سوّي`, `سوي`, `جديد`, `جديدة`, `ابني`, `ابن`, `هيّئ`
- **Arabic transliteration:** `anshi'`, `inshaa'`, `ibda'`, `i3mal`, `iftah`, `kawwen`, `asses`, `isna3`, `awjid`, `sawwi`, `jadid`, `jadida`

## §Add — append / include / attach / extend

- **English:** `add`, `append`, `include`, `attach`, `insert`, `extend`, `expand`, `register`
- **Roman Urdu / Hindi:** `add karo`, `daal do`, `daalo`, `daal de`, `jor do`, `jor de`, `lagao`, `lagado`, `shamil karo`, `shaamil karo`, `barhao`
- **Arabic native:** `أضف`, `زِد`, `ضمّ`, `أرفق`, `أدمج`, `ألحق`, `أدخل`, `أضِف`
- **Arabic transliteration:** `adhif`, `azif`, `zid`, `dhomm`, `arfeq`, `admij`, `alheq`

## §Plan — design / scope / outline

- **English:** `plan`, `design`, `draft`, `scope`, `outline`, `architect`, `lay out`, `schedule`
- **Roman Urdu / Hindi:** `plan karo`, `design karo`, `sochlo`, `soch lo`, `layout banao`, `tarteeb do`, `tartib karo`
- **Arabic native:** `خطّط`, `خطط`, `صمّم`, `صمم`, `رتّب`, `رتب`, `نظّم`, `حدّد`, `هيكلة`, `خطة`, `تصميم`
- **Arabic transliteration:** `khattit`, `tasmim`, `sammim`, `rattib`, `nazzim`, `haddid`, `hayakla`

## §Execute — run / build / ship / implement / do

- **English:** `execute`, `run`, `build`, `ship`, `complete`, `do`, `implement`, `deliver`, `finish`, `wrap up`, `compile`
- **Roman Urdu / Hindi:** `chalao`, `chala do`, `run karo`, `kar do`, `kardo`, `kar lo`, `karlo`, `implement karo`, `mukammal karo`, `complete karo`, `khatam karo`, `pura karo`
- **Arabic native:** `نفّذ`, `نفذ`, `أكمل`, `اكمل`, `أنجز`, `شغّل`, `شغل`, `حقّق`, `سلّم`, `بنّ`, `ابنِ`, `أنهِ`, `جهّز`
- **Arabic transliteration:** `naffidh`, `nafidh`, `aakmel`, `akmil`, `anjiz`, `shaghghil`, `haqqiq`, `sallim`, `jahhiz`

## §Review — audit / check / inspect / verify / validate

- **English:** `review`, `audit`, `check`, `inspect`, `verify`, `validate`, `examine`, `assess`, `evaluate`, `look over`, `go over`, `spot check`
- **Roman Urdu / Hindi:** `dekho`, `dekh lo`, `dekhlo`, `check karo`, `audit karo`, `verify karo`, `validate karo`, `parkho`, `parakhh`, `mulahiza karo`, `nazar dalo`, `jaiza lo`
- **Arabic native:** `راجع`, `تحقّق`, `تحقق`, `افحص`, `دقّق`, `دقق`, `تأكّد`, `تأكد`, `فتّش`, `فتش`, `قيّم`, `قيم`, `تفقّد`, `مراجعة`, `فحص`, `تدقيق`
- **Arabic transliteration:** `raji3`, `tahaqqaq`, `ifhas`, `daqqaq`, `ta'akkad`, `fattish`, `qayyim`, `tafaqqad`

## §Show — list / display / get / fetch / see

- **English:** `show`, `list`, `display`, `get`, `fetch`, `see`, `view`, `print`, `output`, `summarize`
- **Roman Urdu / Hindi:** `dikhao`, `dikha do`, `dikhado`, `dikha de`, `list karo`, `batao`, `bata do`, `bata de`, `kholo`, `khol do`
- **Arabic native:** `أظهر`, `أرني`, `اعرض`, `اعرضها`, `شاهد`, `اطبع`, `لخّص`, `لخص`, `بيّن`, `بين`, `قائمة`, `اعرض القائمة`
- **Arabic transliteration:** `azhir`, `arini`, `i3rid`, `shahid`, `itba3`, `lakhkhis`, `bayyin`, `qa'ima`

## §Remove — delete / drop / undo / revert / kill

- **English:** `remove`, `delete`, `drop`, `undo`, `revert`, `rollback`, `kill`, `purge`, `uninstall`, `clear`, `wipe`, `erase`
- **Roman Urdu / Hindi:** `hatao`, `hata do`, `hatado`, `mita do`, `mita lo`, `mitao`, `delete karo`, `ulto`, `revert karo`, `nikalo`, `nikal do`, `khaali karo`
- **Arabic native:** `احذف`, `أزل`, `ألغِ`, `الغ`, `امسح`, `أبطل`, `تراجع`, `أرجع`, `أزِل`, `حذف`
- **Arabic transliteration:** `ihdhif`, `azil`, `alghi`, `imsah`, `ibtil`, `taraja3`, `arji3`

## §Update — modify / change / edit / refresh / fix

- **English:** `update`, `modify`, `change`, `edit`, `refresh`, `fix`, `patch`, `tweak`, `adjust`, `correct`, `repair`
- **Roman Urdu / Hindi:** `update karo`, `badlo`, `badal do`, `badal de`, `change karo`, `edit karo`, `theek karo`, `theek kar do`, `thiek karo`, `fix karo`, `behtar karo`, `behter karo`, `improve karo`
- **Arabic native:** `غيّر`, `غير`, `عدّل`, `عدل`, `أصلح`, `اصلح`, `حدّث`, `حدث`, `رقّع`, `صحّح`, `صحح`, `حسّن`, `حسن`, `تحديث`, `تعديل`
- **Arabic transliteration:** `ghayyir`, `aslih`, `haddith`, `raqqi3`, `sahheh`, `hassen`, `ta3deel`, `tahdeeth`

## §Pause — stop / wait / hold / cancel

- **English:** `pause`, `stop`, `wait`, `hold`, `cancel`, `abort`, `halt`, `freeze`, `defer`
- **Roman Urdu / Hindi:** `ruko`, `ruk jao`, `band karo`, `band kardo`, `cancel karo`, `roko`, `rok do`, `rok de`, `pause karo`, `wapas karo`
- **Arabic native:** `توقّف`, `توقف`, `انتظر`, `أوقف`, `علّق`, `علق`, `إلغاء`, `أجّل`, `أجل`
- **Arabic transliteration:** `tawaqqaf`, `intazir`, `awqif`, `3alliq`, `ajjil`, `ilgha'`

## §Resume — continue / pick up / restart

- **English:** `resume`, `continue`, `pick up`, `restart`, `re-run`, `replay`, `re-do`, `keep going`, `proceed`
- **Roman Urdu / Hindi:** `phir se shuru karo`, `aage barho`, `aage chalao`, `continue karo`, `wapas chalao`, `dobara chalao`, `dobara karo`
- **Arabic native:** `استمرّ`, `استمر`, `أعد`, `تابع`, `أكمل`, `ارجع`, `استأنف`, `كمّل`, `واصل`
- **Arabic transliteration:** `astamir`, `i'ad`, `tabi3`, `akmil`, `arji3`, `ista'naf`, `kammil`, `wasel`

## §Find — search / locate / discover / hunt

(New category — captures "find edge cases", "find bugs", "look for", which the original dictionary missed.)

- **English:** `find`, `search`, `locate`, `discover`, `hunt`, `surface`, `uncover`, `look for`, `identify`, `detect`
- **Roman Urdu / Hindi:** `dhoondo`, `dhoondh do`, `talash karo`, `khojo`, `dekho kahan`, `pata karo`, `find karo`, `search karo`
- **Arabic native:** `ابحث`, `جِد`, `اكتشف`, `استكشف`, `حدّد`, `بيّن`, `اعثر`, `استخرج`, `بحث`
- **Arabic transliteration:** `ibhath`, `jid`, `iktashif`, `i3thar`, `istakhrij`, `bahath`

## §Quality — bad code / smell / issues / problems

(New category — captures "bad code practices", "code smells", "issues" used in audit-style requests.)

- **English:** `bad code`, `code smell`, `smells`, `issues`, `problems`, `bugs`, `gotchas`, `pitfalls`, `anti-patterns`, `bad practices`, `tech debt`, `quality gaps`, `lint issues`
- **Roman Urdu / Hindi:** `kharab code`, `bad code`, `mistakes`, `ghaltiyan`, `masail`, `bug bug karo`, `quality check`
- **Arabic native:** `كود سيّئ`, `كود سيء`, `أخطاء`, `مشاكل`, `عيوب`, `ثغرات`, `جودة الكود`, `أنماط سيّئة`
- **Arabic transliteration:** `code sayyi'`, `akhta'`, `mashakil`, `3uyub`, `thaghrat`, `jawdat al-code`

---

## Scope nouns (paired with verbs to detect intent)

These are matched alongside §Create / §Add / §Plan verbs to determine the dispatch route.

| Scope noun | Aliases (English + Urdu + Arabic) | Maps to (workflow) |
|---|---|---|
| milestone | `milestone`, `milestones`, `release`, `version`, `cycle`, **AR:** `معلم`, `إصدار`, `دورة`, `مرحلة كبرى` | `/rihal-new-milestone` |
| phase | `phase`, `phases`, **AR:** `مرحلة`, `مراحل`, `طور`, `فاز` | `/rihal-add-phase` |
| story | `story`, `stories`, `user story`, `kahani`, **AR:** `قصة`, `قصص`, `قصة مستخدم` | `/rihal-create-story` |
| epic | `epic`, `epics`, `epics and stories`, **AR:** `ملحمة`, `ملاحم`, `فصل`, `فصول` | `/rihal-create-epics-and-stories` |
| sprint | `sprint`, `iteration`, **AR:** `سباق`, `جولة`, `دورة عمل`, `سبرنت` | `/rihal-sprint-planning` |
| PRD | `PRD`, `requirements doc`, `product requirements`, **AR:** `وثيقة المتطلبات`, `متطلبات المنتج`, `وثيقة المنتج` | `/rihal-create-prd` |
| roadmap | `roadmap`, `plan` (top-level), **AR:** `خارطة طريق`, `خريطة الطريق`, `خطة عامة` | `/rihal-create-milestone` |
| council | `council`, `majlis`, `panel`, `mashwara`, `salah`, **AR:** `مجلس`, `شورى`, `لجنة`, `استشارة` | `/rihal-council` |
| plan (verb form — "plan phase N") | `plan`, **AR:** `خطّط`, `خطة` | `/rihal-plan` |
| story (impl) | `dev story`, `implement story`, `build story`, **AR:** `نفذ القصة`, `طبّق القصة` | `/rihal-dev-story` |
| brainstorm | `brainstorm`, `ideas`, `sochain`, `sochna`, **AR:** `عصف ذهني`, `أفكار`, `تفكير` | `/rihal-brainstorm` |
| review (code) | `code review`, `karpathy`, `check my diff`, **AR:** `مراجعة الكود`, `راجع الكود`, `فحص الكود` | `/rihal-code-review [--karpathy]` |
| edge cases | `edge cases`, `edge case hunt`, `find edge cases`, `corner cases`, **AR:** `حالات استثنائية`, `حالات حدية`, `حالات نادرة` | `/rihal-review-edge-case-hunter` |
| debug | `debug`, `fix`, `bug`, `error`, `crash`, `kharab`, `theek`, **AR:** `صحّح`, `أصلح`, `خطأ`, `مشكلة`, `عطل` | `/rihal-debug` |
| audit | `audit`, `quality audit`, `health check`, **AR:** `تدقيق`, `مراجعة شاملة`, `فحص الجودة`, `جودة` | `/rihal-audit` |

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
"milestone" → /rihal-new-milestone (with state-aware redirect to
/rihal-add-phase if a milestone is already active).

Example: "ابدأ مرحلة جديدة" (Arabic — "start a new phase") → §Create
matches `ابدأ` + scope `مرحلة` + intensifier `جديدة` → /rihal-add-phase.
```

**From an agent file (e.g. `rihal-codebase-mapper.md`) when interpreting the orchestrator prompt:**

```markdown
@.rihal/references/verb-dictionary.md

## Workflow

Recognize §Show / §Review / §Update verbs against the codebase. Honor
multilingual phrasing — never silently fall through because a Roman
Urdu, Hindi, or Arabic instruction was the verb form.
```

**From a SKILL.md `triggers:` array** — DO NOT restate the dictionary inline. Instead, copy the most-likely surface phrases per language so Claude Code's literal trigger matcher fires:

```yaml
triggers:
  # English
  - "review the code"
  - "code review"
  - "check the diff"
  - "find bad practices"
  # Roman Urdu / Hindi
  - "code check karo"
  - "review karo"
  # Arabic native
  - "راجع الكود"
  - "مراجعة الكود"
  - "افحص الكود"
```

5-12 triggers per skill is the spec. Always include English + Roman Urdu + Arabic for skills used in user-facing dispatch (council, do, add-phase, create-*, review-*).

---

## Maintenance

Every entry must be a verb actually observed in user input — not invented. When you discover a new phrasing that broke matching, add it to the relevant category here rather than to the consuming workflow's local list. Single source of truth.

**Arabic verbs:** add native script first (e.g. `أنشئ`), transliteration second (e.g. `anshi'`). Native script is what users actually type; transliteration is a keyboard fallback.
