# Product Specification: Übersetzungswerkstatt

**Extracted from:** `gh-pages-deploy/` (the unified working copy; also the deploy tree).
**Date:** 2026-04-19.
**Extractor:** Senior Dev Oversight Engineer (Übersetzungswerkstatt), integrating returns from the specialist team (Team Manager — Frontend/PWA; Team Manager — Content & Audio Pipeline; Security & Performance Auditor; DevOps / Deploy Manager), using the `app-spec-extractor` template and mirroring the Spanish `Taller de Traducción` baseline at `plans/spanish-spec-reference.md` (2026-04-19).
**Purpose:** (a) the single authoritative record of the German app's current capabilities, intended to be the source of truth for re-establishing app state from a fresh clone; (b) the descriptive baseline against which the German parity-gap analysis (`plans/PARITY_GAP.md`) and the prescriptive companion (`plans/ARCHITECTURE.md`) are written; (c) a working baseline for ongoing development.
**Companion documents:** `plans/PARITY_GAP.md` (delta vs. Spanish, scored row-by-row); `plans/ARCHITECTURE.md` (prescriptive invariants and review conventions, issued after this spec settles).

---

## Baseline Statement

The state of the app as described in this document — as it exists on `origin/main` HEAD `f79e45c` of the Übersetzungswerkstatt repository on 2026-04-19 — is the authoritative baseline for the German app. **Prior versions, prior drafts, earlier role-session memory, and any document that preceded this one are not canonical.** If this specification disagrees with an earlier artifact, this specification wins.

The GitHub repository is the source of truth for re-establishing app state (per Principal). Recovery paths begin by cloning fresh from `origin`; the local working copy's object database is not authoritative — see §8.2 for the local `git fsck` corruption notice that does not affect the deploy surface.

Where the German app has reached parity with the Spanish baseline at `plans/spanish-spec-reference.md`, this document records the matching capability descriptively (it is not a parity claim; the parity scoring lives in `plans/PARITY_GAP.md`). Where the German app diverges, this document records the German behavior as it actually is — the divergence rows are scored separately in `plans/PARITY_GAP.md`.

---

## 1. Overview

Übersetzungswerkstatt is an iOS-first progressive web app (also intended to be usable on desktop) for German-to-English philosophical translation practice. It presents original German passages from Wittgenstein's *Tractatus Logico-Philosophicus*, Freud's *Das Unheimliche*, and the Vorrede of Nietzsche's *Zur Genealogie der Moral* alongside per-sentence exercises for evaluated translation, vocabulary drills (FSRS-scheduled across nine sections), grammar lessons split between paradigm-drill patterns and reference units (after Jannach's textbook progression), and LLM-powered conversation practice across 21 scenarios at CEFR levels A2–C1. Audio playback is two-tier (OpenAI neural TTS → browser `speechSynthesis`); there is no pre-generated MP3 corpus and no `audio/` tree at this time. Audience is the principal (Cam) personally; the app is not publicly distributed.

**Platform:** Progressive Web App (iOS-first; desktop-compatible), served as static assets.
**Primary language(s):** JavaScript (hand-authored, no framework), HTML, CSS.
**Framework(s):** None. Vanilla DOM with event delegation; no bundler, no transpiler, no build step.
**Entry point:** `index.html` (24,703 lines, ~1.95 MB), plus `sw.js` (73 lines) and a single PWA `manifest.json` (13 lines).
**Spaced repetition:** Custom FSRS v4.5 implementation embedded in `index.html` (L18651+).
**External services:** Anthropic, OpenAI, Google Gemini (LLM providers, user-opt-in); OpenAI (neural TTS, user-opt-in). All keys are user-supplied and held browser-local in `localStorage` only. No ElevenLabs integration; no IndexedDB mirror; no `sessionStorage` carry-through.

---

## 2. Architecture

*§2.1 drafted by Team Manager — Frontend/PWA. §2.2 drafted by Senior Dev Oversight, integrating Frontend's line-range table with the architectural-pattern observations from `plans/architectural-delta-first-pass.md`. §2.3 drafted by DevOps / Deploy Manager and co-signed by Senior Dev Oversight on the architectural-pattern claim. Line-number references throughout are against `gh-pages-deploy/index.html` (24,703 lines) as of 2026-04-19.*

### 2.1 Project structure

The German repo is a hand-authored single-file PWA plus sibling static assets. There is no build step, package manifest, or module resolution — everything that runs in the browser is either inlined in `index.html` or served from a relative path.

Top-level deployable tree (`gh-pages-deploy/`):

- `index.html` — the entire single-page application. **24,703 lines, ~1,950 KB on disk.** Contains `<head>` (meta + two base64 inline icon `<link>` tags), one `<style>` block, `<body>` markup shell (sidebar, main, four modals, update banner), and two `<script>` blocks (main application and service-worker registration).
- `sw.js` — service worker. Precaches an enumerated asset list, uses cache-first for app assets and network-first for `manifest.json` plus any cross-origin or non-GET request. Activation via client-posted `SKIP_WAITING` (sole gate; install-time `skipWaiting()` removed by WP-ARCH-G-3). `CACHE_NAME = 'werkstatt-v19'` (L4).
- `manifest.json` — canonical PWA manifest. **13 lines, 429 B.** Referenced by `<link rel="manifest" href="manifest.json">` at L13. **No alternate per-icon manifests exist.** No `lang`, no `orientation`, no maskable icon variants.
- `icon-192.png`, `icon-512.png` — two PWA icons referenced by `manifest.json`. **Not** present in the SW precache list (see §8.3).
- `German-Icon-I.jpeg` … `German-Icon-V.jpeg` — five hyphenated home-screen icon variants. **Listed in `sw.js` precache** (L6–14). **Not tracked on `main`** — these are untracked working-copy duplicates. Not referenced from `index.html`'s DOM.
- `German Icon I.jpeg` … `German Icon V.jpeg` — the same five images stored under space-separated filenames. **Tracked on `main`.** Not referenced from `sw.js` or from `index.html` DOM. The icon-picker reads icons from inline base64 data URIs, not from disk; these JPEGs are precache-list candidates only.
- `.DS_Store` — macOS metadata tracked in the tree.

The space-vs-hyphen filename divergence between the tracked-on-`main` icons and the `sw.js` precache list is recorded as a P0-candidate hazard in §8.3 and §10 G-15.

Non-runtime tree added by the team project (not deployed):

- `plans/` — this draft, the `PARITY_GAP.md` companion, current-state surveys, the Spanish reference materials, and the `parity-scope-plan.md` routing document.
- `.claude/` — local agent scaffolding (contains `worktrees/` only; effectively empty).
- `.git/` — version control. (Local clone has object-corruption notice — see §8.2.)

Internal file organization of `index.html`:

| Line range | Section | Owner |
|---|---|---|
| 1–12 | `<head>` meta (viewport, `apple-mobile-web-app-*`, `mobile-web-app-capable`, `theme-color`, `description`) | Frontend |
| 13 | `<link rel="manifest" href="manifest.json">` | Frontend |
| 14 | `<link rel="apple-touch-icon" href="data:image/jpeg;base64,…">` (15,344 chars; icon-1 baked in) | Frontend |
| 15 | `<link rel="icon" type="image/jpeg" href="data:image/jpeg;base64,…">` (15,350 chars; icon-1 baked in) | Frontend |
| 16–3888 | `<style>` block — all CSS inline | Frontend |
| 3890 | `<body>` open | — |
| 3892 | `#mobile-menu-btn` hamburger (≤768px only) | Frontend |
| 3893–3922 | Sidebar shell: `#sidebar-overlay`, `#sidebar` containing `#mode-switcher`, `#sidebar-header`, `.text-tabs`, `#exercise-list`, `#grammar-sidebar`, `.progress-bar-container`, `#sidebar-footer` | Frontend |
| 3924–3993 | `#main` — `#toolbar` + `#content-area` containing four sibling panels (`#translation-content`, `#vocab-content`, `#grammar-content`, `#conversation-content`) | Frontend |
| 3995–4064 | Settings modal (`#settings-modal`) | Frontend |
| 4066–4094 | Import Text modal (`#import-modal`) | Frontend |
| 4096–4160 | Statistics & Assessment modal (`#stats-modal`) | Frontend |
| 4162–4190 | Sync Progress modal (`#sync-modal`) | Frontend |
| 4192 | Main `<script>` opens | — |
| 4193–9651 | `DICT` — flat lowercase-surface-form dictionary | Content TM |
| 9652–10727 | `TEXTS` — passage corpus | Content TM |
| 10728–13880 | `VOCAB` — vocabulary rows | Content TM |
| 13881–14826 | `MORPHOLOGICAL PROFILES` (= `GRAMMAR_PROFILES`) — verb/noun/article/pronoun paradigms | Content TM |
| 14827–18640 | `GRAMMAR_UNITS` / `GRAMMAR_LESSONS` tree (after Jannach textbook chapter structure) | Content TM |
| 18641–18917 | `FSRS v4.5` engine IIFE (`const FSRS = (() => { … })()`; storage key `uw_fsrsState` at L18665) | Senior Dev Oversight (algo); Frontend (integration) |
| 18918–18921 | `// APPLICATION` banner | — |
| 18923–24667 | `class App { … }` (sole top-level class) | Frontend |
| 24669–24670 | `DOMContentLoaded` bootstrap: `window.app = new App()` | Frontend |
| 24671 | Main `<script>` closes | — |
| 24673–24676 | `#update-banner` markup (German copy: "Neue Version verfügbar" / "Aktualisieren") | Frontend |
| 24678–24702 | SW-registration `<script>` | Frontend |
| 24703 | `</body>` (no `</html>` close in file) | — |

Line-range totals for content constants (not logical entry counts): `DICT` spans ~5,459 lines; `TEXTS` ~1,076 lines; `VOCAB` ~3,153 lines; `GRAMMAR_PROFILES` ~946 lines; `GRAMMAR_UNITS` ~3,814 lines. Logical entry counts: `DICT` 5,408 entries; `TEXTS` 733 exercises across 3 texts; `VOCAB` 3,148 rows across 9 sections; `GRAMMAR_PROFILES` 48 patterns across 10 categories; `GRAMMAR_UNITS` 34 reference lessons (`unit_0`…`unit_33`). See §5 for the full content inventory.

### 2.2 Architecture pattern

Single-file client-only PWA. No server, no build step, no framework. Data flows in one direction from corpora to UI and back through persisted state:

1. **Module-level constants** (`DICT`, `TEXTS`, `VOCAB`, `GRAMMAR_PROFILES`, `GRAMMAR_UNITS`) are baked into `index.html` at authoring time. There is no `TRANSLATION_AUDIO_MAP` and no `GRAMMAR_AUDIO_MAP` (Spanish pairs); German has no pre-generated audio corpus to map.
2. **Support modules** are sparser than Spanish. The only standalone support singleton is:
   - `FSRS` — the spaced-repetition engine, an IIFE at L18651 owning storage key `uw_fsrsState`. Exposes the FSRS v4.5 math plus `getOverdueKeys()`.
   - There is **no** `ReviewScheduler` wrapper class in German — `class App` calls into `FSRS` directly via `FSRS.review(key, rating)` and `FSRS.getOverdueKeys()`. There is no `AudioCache` and no `TallerIDB`/IDB-mirror analogue. The `ReviewScheduler` / `AudioCache` / IDB-mirror trio that Spanish carries is `MISSING` in German.
3. **`class App`** owns all UI state and all rendering (L18923–24667, ~170 methods on the prototype). Instantiated once on `DOMContentLoaded` and assigned to `window.app` (L24670). Construction order: read persisted state from `localStorage` via `App.load(...)` (L19042), apply legacy-key migration (`uw_uw_vocabProgress` → `uw_vocabProgress` at L18983–18986), apply selected app icon (`_applyAppIcon` at L18939), wire mobile menu / swipe-close / mode-switcher events (L19092–19126), start the active-time tracker (`_initActiveTimeTracking` at L19090), and render the initial mode via `switchMode("translation")`.
4. **Persistence layer:** every mutation goes through `App.save(key, val)` (L19027), which writes `localStorage.setItem("uw_" + key, JSON.stringify(val))`. Reads go through `App.load(key)` (L19042). API keys are **not** mirrored to `sessionStorage`; no key is mirrored to IndexedDB. There is no `_restoreFromIDB()` boot pass. A user under iOS storage-pressure eviction loses everything in `uw_*`.
5. **Rendering:** no virtual DOM and no framework. Mode switching (`switchMode(mode)`, L20916) toggles `display:none` on four sibling content panels (`#translation-content`, `#vocab-content`, `#grammar-content`, `#conversation-content`) and delegates to per-mode render methods which set `innerHTML` directly and bind listeners via direct or delegated handlers. There is no client-side router and no use of the `history` API.
6. **LLM and TTS providers** are abstracted behind `App.llmComplete(...)` (call sites: Anthropic at L19775, OpenAI chat at L19807, Gemini at L19839; dispatch keyed on `this.apiProvider`). TTS is a two-tier abstraction (OpenAI neural at L20054 / L20148 → browser `speechSynthesis` via `_browserSpeak` at L20200; entry point `_speakGerman` at L20187). Spanish's three-tier `tryPregenerated → neural → speechSynthesis` is reduced to two tiers in German because no pre-generated tier exists.
7. **Service worker** is independent of the app code and registered by a separate `<script>` IIFE (L24678–24702). It follows a cache-first strategy for the precached asset list and network-first for `manifest.json` and any cross-origin or non-GET request.

Event delegation is sparse (the only `keydown` handlers are at the grammar-production input L22207, the conversation input L24159, and the activity-tracker bundle at L24354). There is no central event bus. There is no global Escape-closes-modal handler and no Tab-trap inside any modal — see §6.4.

### 2.3 Build and tooling

*Drafted by DevOps / Deploy Manager; architectural-pattern claim co-signed by Senior Dev Oversight.*

No build pipeline exists at the source level. `index.html` is hand-authored; assets are hand-placed. There is no `package.json`, no bundler, no transpiler, no linter, no test runner, and no dependency manifest at the repo root. The deployable is literally the tracked contents of the repo root on `main`. See §8 for the build-to-deploy pipeline (branch strategy, `CACHE_NAME` bump protocol, `.nojekyll` handling). The SW `CACHE_NAME` value (`'werkstatt-v10'` as of HEAD `f79e45c`) is read-only from Frontend's perspective: bumping it is part of the release ritual owned by DevOps.

**Architectural-pattern claim (co-signed by Senior Dev Oversight).** The German app inherits the Spanish baseline's "single-file, no-build, static-host" invariant without modification: a hand-authored monolithic `index.html` plus `sw.js` plus icons, served as-is by GitHub Pages. Any parity work that would introduce a toolchain (bundler, transpiler, test runner) is an architectural departure and must route through `plans/ARCHITECTURE.md`, not through a DevOps work package.

---

## 3. Features

*UI-surface skeleton drafted by Team Manager — Frontend/PWA. Corpus-driven behaviors integrated from Team Manager — Content & Audio Pipeline (the rows Frontend marked `[DEFER — Content TM]`). Where §3 marks `[DEFER]` after this integration, the corresponding corpus or content detail genuinely lives in §5.*

### 3.1 Global chrome and navigation

- **Mode switcher (four modes)** — Translation, Vocabulary, Grammar, Conversation. Rendered **once**, in `#mode-switcher` at the top of the sidebar (L3895–3900). All dispatch through `App.switchMode(mode)` (L20916). **There is no mobile bottom tab bar** (Spanish has both sidebar and `#mobile-tab-bar`). On mobile, the mode switcher is reached by opening the sidebar drawer.
- **Sidebar** — per-mode navigation. In Translation mode, hosts the author tab group (L3905–3909: TLP / Freud / Nietzsche) and the `#exercise-list`; in Vocabulary, the batch list; in Grammar, the `#grammar-sidebar` unit tree; in Conversation, the scenario list. Ends with a four-button footer (L3916–3921) in the order **Sync Progress**, **Import Text File**, **Statistics & Assessment**, **Settings** (Spanish footer order is Sync / Import / Settings / Statistics — content matches; order differs).
- **Toolbar** (Translation mode only; L3925–3935) — `#exercise-title`, `#exercise-meta`, and three toggle buttons: `#pos-toggle` (POS Colors), `#gloss-toggle` (All Glosses), `#gloss-hide-toggle` (Hide Glosses). Hidden in other modes via `document.getElementById("toolbar").style.display = "none"` in `switchMode`.
- **Mobile header** — `#mobile-menu-btn` (hamburger, L3892) only; no persistent mobile header bar with app title. Spanish ships a 48-px mobile header.
- **Service worker update banner** (`#update-banner`, L24673–24676) — shown when a new SW is waiting. Copy is hard-coded German: "Neue Version verfügbar" + reload button "Aktualisieren". No dismiss control. See §8.3.1 for SW handshake behavior.
- **Export reminder banner** — **absent.** No `_checkExportReminder` method (greppable, zero hits), no `lastExport*` localStorage key, no banner DOM. Spanish injects a 7-day / ≥5-completion banner.

### 3.2 Translation mode (`#translation-content`)

- **Text selection** — three built-in author tabs (TLP, Freud, Nietzsche) at L3905–3909. Welcome copy at L3940 additionally references *Philosophische Untersuchungen*, but no PU tab is present — known visible mismatch (FE-G-11).
- **Exercise list** — sidebar list of passages for the selected text (`#exercise-list`), marked complete/incomplete. Active exercise persistence is per-tab in-memory only (`this._exercisePositions` at L18928, read/written at L19192 and L19196). Not persisted across reloads. Spanish persists `taller_translationLastGroup`.
- **German display** — tokenized per-word rendering in `#german-display` (L3961). Click-on-word / hover-on-word attaches a tooltip with POS + gloss from `DICT` (rendered inline, not via a body-portal). L19605–19622.
- **POS coloring** — per-part-of-speech CSS tokens applied when `posActive` is true. Legend at `#pos-legend` (L3946–3960) with thirteen swatches (noun/verb/adj/adv/prep/conj/art/pron/particle/aux/modal/pres.part/past.part). Toggled via `togglePOS()` (L19656) bound to `#pos-toggle`. Default `posActive = true` (L18929).
- **Automatic inline glossing** — first appearance of a word in a rendering receives an inline gloss; subsequent appearances are suppressed via `seen`, a local map seeded from `this._glossSeen` (persisted in `uw_glossSeen`). On each render, newly glossed words are added to `this._glossSeen`; if the set grew, `uw_glossSeen` is written once at the end of `renderExercise()`. A "Reset automatic glossing" button in Settings clears `uw_glossSeen` via `resetGlossSeen()`. WP-FE-G-2.
- **Glossing-suppression algorithm specifics (corpus-driven).** Suppression keys on **surface form and `DICT.lemma`**. When a word is first-glossed, its lowercase form is marked in `seen` and `this._glossSeen`; if the `DICT` entry carries a `lemma` field (e.g., `"ist"` → `lemma: "sein"`), the lemma key is also marked — so `"sein"` is not re-glossed after `"ist"` is seen. This single-hop lemma-chain walk closes the Spanish `_vocabLemmaToFSRS` parity gap for the common inflected-form case. Toggled by `toggleGlossAll()` (L19663) and `toggleGlossHide()` (L19671); the two states are mutually exclusive.
- **German TTS** — `▶ Listen` button (`#german-tts-btn`, L3962). Two-tier fallback chain via `_speakGerman` at L20187: OpenAI neural TTS (`POST https://api.openai.com/v1/audio/speech` at L20054 / L20148; in-memory cache `_ttsCache` capped at 25 entries via `MAX_TTS_CACHE` at L20096) when `ttsApiKey` (or the LLM key, if provider is OpenAI) is present → browser `speechSynthesis` (`_browserSpeak`, L20200). **No pre-generated MP3 tier, no `TRANSLATION_AUDIO_MAP`, no ElevenLabs.**
- **Translation input + actions** (`#action-row`, L3967–3972): **Get Hints**, **Evaluate**, **Show Reference**, **Next**.
- **Evaluate** — LLM-powered if an API key is set (routes through `App.llmComplete(...)`); otherwise falls through to a client-side heuristic (`evaluateHeuristic` at L19964). On success the exercise is marked complete (`this.save("completed", this.completed)` at L19715, L19725, L19922).
- **Hint** — LLM-only. Declines gracefully if no API key is set.
- **Show Reference** — reveals the reference English translation from `TEXTS` in `#reference-display` (L3978–3981).
- **Next** — advances `currentExerciseIdx` (L19202).
- **What defines a "passage-group" (corpus-driven).** German `TEXTS` exercises are a single flat `exercises: [...]` array per text (L9661, L10195, L10358). There is **no** `group`, `section`, or `chapter` field on an exercise object; what plays the role of a "group" is the human-readable `label`:
  - Tractatus: `label: "§<Wittgenstein-numeric-reference>"` — e.g., `"§1"`, `"§2.0231"`, `"§6.522"`.
  - Freud (`unheimliche`): `label: "§N.N"` paragraph numbering after the *Das Unheimliche* essay's customary numbering.
  - Nietzsche (`gm-v…` id, multi-line format): `label: "GM Vorrede §N — <stem>"`, with a German-only additional `source` field (e.g., `source: "Zur Genealogie der Moral, Vorrede §1"`). IDs run `gm-v1a/b/c/d/e`, `gm-v2a…`, `…`, `gm-v8a…e` — numeric index is the Vorrede section; letter `a–e` splits the paragraph into clauses.
- **Text ordering.** Built-in `TEXTS` order: `tractatus` → `unheimliche` → `nietzsche`. Custom-imported texts append in `allTexts` (`doImport` at L20884+).
- **Reference-translation provenance.** Not declared in data. Exercise objects carry `reference: "<English>"` (`tractatus`, `unheimliche`) or `reference + source` (`nietzsche`), but no translator attribution and no `english_source: "adjusted_reviewed"` marker. Open Question for Principal — see Appendix B #3.

### 3.3 Vocabulary mode (`#vocab-content`)

- **Batch picker** — vocab split into batches of up to 25 items grouped first by `section`, then by `num` ordering. Rendered in the sidebar by `renderVocabSidebar` (L21018); sections collapsible per `vocabExpandedGroups`. Welcome copy at L20946–20950 inlined in `switchMode`. Build path: `buildVocabBatches()` at L20980.
- **Sections (9 total).** Paradigmatic: `Noun`, `Verb`, `Adjective/Adverb`, `Preposition`, `Conjunction/Pronoun/Particle`, `Idiom`. Author-specific: `Wittgenstein`, `Freud`, `Nietzsche`. See §5.1.3 for per-section row counts.
- **Item schema** (`VOCAB` entries, L10731+): `{ section: string, num: int, german: string, english: string, extra: string }`. **No `state` field** (Spanish has universal `state: "adjusted"`).
- **Exercise types (three tiers)** — Flashcard, Multiple Choice, Typed Response. The user **chooses the exercise type explicitly** via a dropdown in the welcome text (L20948); tier is **not** chosen by FSRS card state. Spanish's `_vocabTierFailures` session-scoped demotion map and FSRS-tier → effective-tier routing do **not** exist in German.
- **Tier feeds FSRS via `_recordVocabFSRS`** (L21495) with ratings 3/1. FSRS key format `vocab_${section}_${num}` (L21496). Spaces in section names preserved verbatim (no escaping); `vocab_Conjunction/Pronoun/Particle_50` is a valid key, matching Spanish's `vocab_Cob Building_1` convention.
- **Examples-on-demand** — `loadVocabExamples(item)` (called at L20030–20039, surfaced at L20033) calls out to the LLM when an API key is present; output wrapped through `_escapeHtml` on insertion.
- **Completion view** — batch summary via `renderVocabComplete` (L21373).
- **Review mode** — `startVocabReview()` at L21520; pulls overdue keys whose prefix is `vocab_` via `FSRS.getOverdueKeys()` (L21504). Ordering is `_shuffleArray(overdue)` — no `ReviewScheduler.sortByPriority`-class prioritization (no such module exists in German).

### 3.4 Grammar mode (`#grammar-content`)

- **Welcome screen + learning path** — rendered by `_renderGrammarWelcome` and `renderGrammarLearningPath` (referenced at L20961; `renderGrammarLearningPath` at L23419).
- **Unit tree sidebar** — `renderGrammarSidebar_new` (L20958, defined at L22509), with `renderGrammarUnitTree` (L22552) + `bindGrammarUnitTreeEvents` (L23773).
- **Lesson view** — `renderGrammarLesson(unitId, lessonId)` at L22716. TTS-feedable lesson text built by `_getLessonTextForGrammar(lesson)` at L20102, which flattens the unit's `content` array into a string by concatenating `text`/`tip`/`rule`/`example.german` fields.
- **Exercise phases** — `renderGrammarExercise(unitId, exerciseId)` at L22867. Phase-routing scaffolding present (cloze, paradigm-fill, production); `_thematicSessionDemotions` / `_thematicSessionFailures` (Spanish concepts) are **absent** (greppable, zero hits).
- **Paradigm drills** — paradigm tables live in `GRAMMAR_PROFILES` (L13881–14826). FSRS key for paradigm cells: `` `grammar_${ex.profile.pattern}_${ex.paradigmKey}` `` (L22418). Recording at `recordGrammarProgress` at L22413; saving at `saveGrammarUnitProgress` at L23413.
- **Production** — `Enter`-submit binding at L22207–22208; LLM-or-heuristic evaluation pathway shared with translation Evaluate.
- **Two-structure architecture (corpus-driven).** German splits grammar into **two** data structures: `GRAMMAR_PROFILES` (48 paradigm patterns at L13884; runtime drill generation) and `GRAMMAR_UNITS` (34 reference lessons at L14830; reading material). Spanish uses a single `GRAMMAR_LESSONS`. The German split is intentional and reflects the Jannach textbook progression — see §5.1.4.
- **Inline-glossed thematic passages** — **absent.** Greppable: zero hits for `_renderGlossedPassage`, `glossedPassage`, `thematicPassage`. Spanish surface absent in German.
- **Due-review banner** — **absent.** No `_injectReviewBanner` analogue.
- **Review session** — `startGrammarReview()` at L21543 is a **stub**. It collects overdue `grammar_*` keys via `FSRS.getOverdueKeys()` and displays an alert with the count. Inline comment at L21548: `"full review queue will be built by UX Implementer (Feature 3/4)"`. Spanish `startReviewSession(patterns, count)` is a complete flow.
- **Unit-completion screen** — `renderGrammarUnitComplete(unitId)` at L23335.
- **Unit catalog** (chapter index → title; full list lives in §5.1.4): `unit_0` Pronunciation Guide → `unit_33` Subjunctive II.

### 3.5 Conversation mode (`#conversation-content`)

- **Scenario picker** — `_getConversationScenarios()` at L23878; `renderConversationSidebar` at L24032 lists scenarios; selection sets `this._convActiveScenario`.
- **Chat view** — `renderConversationChat` at L24106. Messages rendered via `_escapeHtml` interpolation (L24117); per-assistant-message TTS `▶` button (L24116).
- **Hint** — `_convGetHint()` at L24245; bound at L24167.
- **End conversation** — `_convEndConversation()` at L24278; bound at L24168. Aggregate counters `_convSessionCount` and `_convTotalExchanges` updated at L24316–24317 and persisted to `uw_convSessionCount` / `uw_convTotalExchanges`. Scenario message contents are **not** persisted across sessions.
- **Cheapest-model routing** — `_convGetCheapestModel()` at L23864; consumed at L23874 and L24124. Picks the lowest-cost model per provider for conversation traffic.
- **Scenario set (corpus-driven).** **21 scenarios** across 3 `cat` buckets (Beginner 7 / Intermediate 8 / Advanced 6) and 4 CEFR levels (A2 7 / B1 7 / B2 3 / C1 4). Scenario object shape: `{ id, cat, icon (inline SVG string), label, level, setup, vocab: string[], keyPhrases: string[], opening, sysPrompt }`.
- **System-prompt convention.** Every German `sysPrompt` ends with the correction directive: `After each student message, if they made a German error, add a brief correction at the very end in this exact format: [Korrektur: «X» → «Y»].` This is a German-only inline pattern with no documented Spanish analogue.

### 3.6 Settings modal (`#settings-modal`, L3995–4064)

See §9 for the full configuration surface. Feature-level summary:

- **LLM provider + API key** (Anthropic / OpenAI / Gemini — three options at L4001–4003).
- **OpenAI TTS API key** (single dedicated field at L4009) — no TTS-provider selector and no ElevenLabs.
- **Browser German / English voice picker + Preview** (L4011–4024).
- **App icon picker** — five radio options (L4027–4053) populated by inline base64 thumbnails. (Spanish ships per-icon PWA manifests + on-disk PNGs; German ships one canonical `manifest.json` and stores the five icons as base64 strings inline in the picker, with the five `German-Icon-*.jpeg` on disk for the precache list — see §8.3 hazard.)
- **Reset All Progress** — inline destructive button (L4058) backed by `resetProgress()` at L20724, which uses a **native `confirm()` dialog** (L20725). Spanish routes through a styled `#reset-confirm-overlay` modal.
- **"Reset automatic glossing"** button present in Settings (WP-FE-G-2). Clears `uw_glossSeen` via `resetGlossSeen()`.

### 3.7 Sync / Import / Stats modals

- **Sync Progress modal** (`#sync-modal`, L4162–4190) — export JSON / import JSON. Described in §4.3. Instructions block inlined (L4178–4184).
- **Import Text modal** (`#import-modal`, L4066–4094) — upload a JSON file conforming to the schema shown in the modal body (L4071–4086; required: `id`, `exercises` array; optional: `title`, `author`, `year`, `vocabulary`).
- **Statistics & Assessment modal** (`#stats-modal`, L4096–4160) — CEFR badge in header (`#stats-cefr-badge`, L4100), close button, four collapsible sections: Active Learning Time (today / 7-day average / total cumulative + sparkline), Performance Overview (Translation, Vocabulary, Grammar, Conversation, Streak metric containers), LLM Assessment generator (L4149–4156). Cached CEFR output stored under `uw_llmAssessment` (`{ level, assessment, recommendations[], timestamp }`).

### 3.8 Review / reset surfaces

- **Reset confirmation** — native `confirm()` only (L20725). No `#reset-confirm-overlay` DOM node.
- **Per-mode review entries** — FSRS-overdue computation exists; sidebar entries / banners surfacing the count are absent (greppable, no `_injectReviewBanner` or analogue).

---

## 4. Data Model

### 4.1 Storage mechanism

*Drafted by Team Manager — Frontend/PWA.*

**One browser-local primary store; no mirror.**

1. **`localStorage`** — primary (and only) persistence. All keys are prefixed `uw_`. Serialized via `JSON.stringify` / parsed via `JSON.parse` (`App.save(key, val)` at L19027; `App.load(key)` at L19042). No quota-exceeded handling beyond a generic `try…catch` in `FSRS._save` (L18882) and `FSRS._load` (L18892).
2. **`sessionStorage`** — **not used.** No code path writes to `sessionStorage` (greppable, zero hits). Spanish carries API-key fields through `sessionStorage` for tab-scoped key visibility.
3. **IndexedDB mirror** — **not present.** No `indexedDB.*` call sites (greppable, zero hits). Spanish ships `TallerIDB` (database `taller-backup`, object store `progress`) mirroring every `localStorage` write.

There is no server-side storage and no cross-device sync. Export/import is the only cross-device pathway (§4.3).

### 4.2 Schema

#### 4.2.1 `uw_*` keys (`localStorage` only)

All keys are `localStorage` keys with the literal prefix `uw_`. "Written by" and "Read by" cite line numbers in `index.html` and method names on `class App`. Shapes are inferred from the code unless otherwise noted.

| Key | Shape | Written by | Read by | Notes |
|---|---|---|---|---|
| `uw_completed` | `{ [textId+":"+exerciseId]: true }` | `evaluate` path (L19715, 19725, 19922); `resetProgress` (L20727); import merge (L20800) | constructor (L18932); export (L20754); import merge | Composite key = `textId + ":" + exerciseId` (same shape as Spanish). |
| `uw_apiKey` | `string` | `saveSettings` (L20686); import merge (L20805) | constructor (L18933) | **Also imported from sync files**, unlike Spanish which excludes keys from export/import. See §4.3.3 + §10 G-4. |
| `uw_apiProvider` | `"anthropic" \| "openai" \| "gemini"` | `saveSettings` (L20687) | constructor (L18934) | Default `"anthropic"`. |
| `uw_ttsApiKey` | `string` (OpenAI TTS key) | `saveSettings` (L20688) | constructor (L18935) | Optional override specifically for OpenAI TTS. No ElevenLabs key. |
| `uw_voiceDeName` | `string` (browser `SpeechSynthesisVoice.name`, German) | `saveSettings` (L20689) | constructor (L18936) | Empty = auto. |
| `uw_voiceEnName` | `string` (browser `SpeechSynthesisVoice.name`, English) | `saveSettings` (L20690) | constructor (L18937) | Empty = auto. |
| `uw_appIcon` | `"1" \| "2" \| "3" \| "4" \| "5"` | `saveSettings` (L20694) | constructor (L18938) → `_applyAppIcon` (L20650) | Default `"1"`. Drives `_applyAppIcon` which rewrites `<link rel="apple-touch-icon">` and `<link rel="icon">` `href` to the base64 data URI held in `_iconFileForValue` at L20645–20648. |
| `uw_customTexts` | `{ [id: string]: { id, title, author, year, exercises: [...] } }` | `doImport` (L20903); import merge (L20817) | constructor (L18966–18968); export (L20755) | Merged with built-in `TEXTS` into `this.allTexts` at L18968. |
| `uw_grammarProgress` | `{ [grammarKey]: <record> }` | `recordGrammarProgress` at L22413; `resetProgress` (L20731); import merge (L20828) | constructor (L18995); export (L20756) | |
| `uw_grammarUnitProgress` | `{ [unitId]: <record> }` | `saveGrammarUnitProgress` (L23413); `resetProgress` (L20732); import merge (L20839) | constructor (L19001); export (L20757) | **Additional to Spanish** (Spanish has only `grammarProgress`). German granularity is unit + lesson + exercise; Spanish is lesson-level. |
| `uw_vocabProgress` | `{ [vocabKey]: <record> }` | vocab handlers at L21404, 21432, 21469; `resetProgress` (L20733); import merge (L20850) | constructor at L21189 and L21531; also L21032 | Legacy double-prefix key `uw_uw_vocabProgress` migrated on construction (L18983–18986). |
| `uw_fsrsState` | `{ [fsrsKey]: { difficulty, stability, lastReview, reps, lapses, scheduledDays, state } }` | `FSRS._save` (L18882) | `FSRS._load` (L18892); surface via `FSRS.getCard` etc. | Written directly by the FSRS engine, not through `App.save`. Key namespace is shared across vocab (`vocab_*`) and grammar (`grammar_*`). |
| `uw_activeTime` | `{ [yyyy-mm-dd]: seconds }` | `_initActiveTimeTracking` (L24378, L24386) | constructor (L19009) | Day key = `new Date().toISOString().slice(0,10)` (UTC). |
| `uw_translationHistory` | `Array<{ date, exerciseId, score, … }>` | `recordTranslationResult` (L24426) | constructor (L19013) | |
| `uw_glossSeen` | `{ words: { [lowercased-word]: true } }` | `renderExercise()` (once per render, if new words glossed); `resetGlossSeen()`; `_doReset()` | constructor (via `this._glossSeen`) | WP-FE-G-2. Lemma forms also written alongside surface forms when `DICT[w].lemma` exists. |
| `uw_convSessionCount` | `number` | `_convEndConversation` at L24316 | constructor (L19016) | Aggregate counter only. |
| `uw_convTotalExchanges` | `number` | `_convEndConversation` at L24317 | constructor (L19017) | Aggregate counter only. |
| `uw_streakData` | `{ current, longest, lastDate }` | streak helper at L24403 | constructor (L19020) | Per-day streak record. |
| `uw_llmAssessment` | `{ level, assessment, recommendations[], timestamp }` | assessment generator (L24650) | assessment renderer (L24543) | Cached CEFR-level output. |

**Keys NOT persisted** (in-memory only; would be persisted in Spanish):

- `this._exercisePositions` — last exercise index per text. L18928.
- Last-export-date / export reminder threshold state — no tracking.
- Conversation message contents — only aggregate counters persist.

**No `uw_*` key is mirrored to IndexedDB** (§4.1 #3). **No `sessionStorage` carry-through** for API-key fields (§4.1 #2).

#### 4.2.2 `audio/manifest.json` shape

**Status: MISSING (entire pipeline).** The German repo has no `audio/` directory, no `audio/manifest.json`, and no consumer code that fetches or parses one. Confirmed by directory listing of `gh-pages-deploy/` and by greps for `AudioCache`, `audioCache`, `loadManifest`, `sanitize(`, `tryPregenerated`, `vocabKey`, `translationKey`, `grammarKey` (all zero hits).

The service-worker precache (`sw.js` L6–14) covers `index.html`, `manifest.json`, and the five `German-Icon-*.jpeg` files only (with the filename hazard noted in §8.3). There is no audio tree to precache.

When the German audio pipeline is built out (currently no scope or schedule), the manifest shape should mirror Spanish's flat `{ "<path>": true }` convention to minimize reinvention. The Spanish `AudioCache.sanitize` rule (`lowercase, [^a-z0-9\u00c0-\u024f]+ → '_', trim '_', slice(80)`) preserves the Latin-Supplement / Latin-Extended-A range and round-trips German `ä/ö/ü` verbatim, but does **not** cover `ß` — that is an explicit Open Question for Principal (Appendix B #4).

### 4.3 Data lifecycle

#### 4.3.1 Construction and boot

`new App()` (L18923+) reads every persisted key through `this.load("<name>")` (L19042: `JSON.parse(localStorage.getItem("uw_" + key))` with error-swallowing). Defaults are applied inline (`|| {}`, `|| []`, `|| "anthropic"`, `|| "1"`, etc.). After field initialization the constructor calls `this._applyAppIcon(this.appIcon)` (L18939), runs the legacy-key migration (L18983–18986), wires Mobile menu / swipe-close / mode switcher (L19092–19126), calls `this._initActiveTimeTracking()` (L19090), and renders the initial mode (`this.render()` inside `switchMode("translation")`).

Boot is initiated by `window.addEventListener("DOMContentLoaded", () => { window.app = new App(); })` at L24670.

#### 4.3.2 IDB restoration (iOS resilience)

**MISSING — no IDB, no restoration.** See §4.1 #3.

#### 4.3.3 Export (`exportProgress`, L20749)

Produces a Blob-downloaded JSON file named `uebersetzungswerkstatt-progress-YYYY-MM-DD.json`. Payload shape (v2 envelope, WP-FE-G-3):

```json
{
  "_format": "uebersetzungswerkstatt-sync",
  "_version": 2,
  "exportedAt": "<ISO-8601>",
  "completed": {...},
  "customTexts": {...},
  "grammarProgress": {...},
  "grammarUnitProgress": {...},
  "vocabProgress": {...},
  "translationHistory": [...],
  "fsrsState": { "<cardKey>": { "difficulty": ..., "stability": ..., "lastReview": "<ISO>", "reps": ..., "lapses": ..., "scheduledDays": ..., "state": ... }, ... },
  "activeTime": { "<yyyy-mm-dd>": <seconds>, ... },
  "statsAssessment": { "level": "...", "assessment": "...", "recommendations": [...], "timestamp": <ms> } | null,
  "glossSeen": { "words": { "<lowercased-word>": true, ... } }
}
```

**Fields not in envelope (N/A or deferred):**

- `vocabMastery` — concept absent in German (mastery is collapsed into `vocabProgress` + FSRS).

**Key additionally present that is not in Spanish's envelope:**

- `grammarUnitProgress` — present because German uses unit-level tracking (additional field, not a divergence from Spanish that needs porting back).

**Security.** German export does **not** include `apiKey`. The import side also refuses `apiKey` (closed by WP-AUD-G-1). See §10 G-4 and Appendix C C-G2.

After export, no `lastExportDate` is recorded (the concept does not exist in German).

#### 4.3.4 Import — progress (`importProgress`, L20774)

Accepts a file with `_format === "uebersetzungswerkstatt-sync"` (L20786). `_version` handling (WP-FE-G-3): if `_version > 2`, a non-blocking warning is shown in `#sync-status` and import continues; `_version === 1` is accepted silently (back-compat). Merge rules per section:

- `completed` — union; existing truthy values win.
- `customTexts` — append-only by `id`.
- `grammarProgress` — union by key; existing values win.
- `grammarUnitProgress` — union by key; existing values win.
- `vocabProgress` — union by key; existing values win.
- `translationHistory` — append-and-dedupe by composite key `(date + "|" + exerciseId)`; new entries appended to `this._translationHistory`.
- `fsrsState` — per-card recency merge via `FSRS.mergeCards()`; incoming card wins if its `lastReview` is newer (or reps higher when tied).
- `activeTime` — per-day max; incoming value for a day replaces local only if it is larger.
- `statsAssessment` — import wins if `timestamp` is newer than local cached value.
- `glossSeen` — union; each word key in `data.glossSeen.words` is merged into `this._glossSeen` (WP-FE-G-2). Count of newly-merged words reported in status string.
- `statsAssessment` — import wins if its `timestamp` is newer than the locally cached `llmAssessment`; otherwise local is kept.
- `apiKey` — **refused** (closed by WP-AUD-G-1).
- `vocabMastery` — not handled (N/A; mastery collapsed into vocabProgress + FSRS).

A single status string is written to `#sync-status` with per-section merge counts. On success, `this.render()` runs.

#### 4.3.5 Import — custom text (`doImport`, L20873)

Accepts a file with `id` and `exercises[]`. Required: `id`, `exercises` (array). Optional: `title`, `author`, `year`, `vocabulary`.

- `vocabulary` entries (`{ word → { pos, gloss, … } }`) are merged into the module-level `DICT` object (L20890–20893). Lowercased on write (`DICT[word.toLowerCase()] = entry`) — same plain-overwrite semantics as Spanish; an imported text can silently shadow a built-in dictionary entry.
- The text is added to `this.customTexts[data.id]` and mirrored into `this.allTexts` (L20895–20902) and persisted via `save("customTexts", …)` (L20903).
- `renderTabs()` is called so the new text appears in the text-tab strip immediately (L20906).

The format hint shown to users is inlined in the `#import-modal` markup (L4071–4086).

#### 4.3.6 Reset

`resetProgress()` at L20724 wraps the destructive flow in a native browser `confirm(...)` dialog (L20725), not a styled modal. Clears `completed`, `grammarProgress`, `grammarUnitProgress`, `vocabProgress`. **API keys, `customTexts`, `translationHistory`, `activeTime`, `streakData`, `llmAssessment`, and the FSRS state are all preserved.** Note that FSRS state is not cleared, which is a divergence from Spanish semantics (where `_doReset` nulls `fsrsState`).

#### 4.3.7 Migration shims

One migration shim (L18983–18986): rename `uw_uw_vocabProgress` → `uw_vocabProgress` if the legacy double-prefixed key exists and the canonical key is empty. Parallel to Spanish's `taller_taller_vocabProgress` shim. No other schema-version migrations exist.

---

## 5. Content

*Drafted by Team Manager — Content & Audio Pipeline.*

### 5.1 Embedded content

All primary content is baked into `index.html` as top-level `const` bindings. No external content files are fetched at runtime for the primary corpus — the app is a single-file HTML bundle with no companion asset tree.

#### 5.1.1 Passage corpus — `TEXTS` (L9655)

A single object keyed by text id. Three texts are present:

| Key | Title | Author | Year | Translator | Source attribution | Exercises |
|---|---|---|---:|---|---|---:|
| `tractatus` | *Tractatus Logico-Philosophicus* | Ludwig Wittgenstein | 1921 | `[UNVERIFIED]` | (none in data) | 526 |
| `unheimliche` | *Das Unheimliche* | Sigmund Freud | 1919 | `[UNVERIFIED]` | (none in data) | 155 |
| `nietzsche` | *Zur Genealogie der Moral — Vorrede* | Friedrich Nietzsche | 1887 | `[UNVERIFIED]` | per-exercise `source` field | 52 |
| **Total** | | | | | | **733** |

Per-exercise shape:

```js
// tractatus, unheimliche:
{
  id: "<string>",              // e.g. "tlp-2.0231", "unh-<...>"
  label: "<string>",           // human-facing e.g. "§2.0231"
  german: "<string>",          // source text
  reference: "<string>"        // English translation
}

// nietzsche: same fields + `source`
{
  id: "gm-v1a",
  label: "GM Vorrede §1 — Wir Erkennenden",
  german: "<...>",
  reference: "<...>",
  source: "Zur Genealogie der Moral, Vorrede §1"
}
```

No `english_source: "adjusted_reviewed"` marker (Spanish universal on every passage; German absent on every passage). No translator attribution in data. `custom`-imported texts (§3.7) use the same shape plus optional `vocabulary` map that merges into `DICT`.

German `TEXTS` IDs are prefixed per-work: `tlp-*` (Tractatus), `unh-*` (Das Unheimliche), `gm-v*` (Genealogie Vorrede).

Markdown / orthographic conventions preserved in both `german` and `reference` strings: Unicode diacritics (`ä`, `ö`, `ü`, `ß`), typographic quotation marks (`„…"`, `»…«`), em-dashes (`—`), ellipses (`…`), and occasional `*asterisks*` where an italic convention applies. Confirmed by spot-read at L9665–9680, L10360–10380.

#### 5.1.2 Lemma dictionary — `DICT` (L4196)

Flat object, **5,408 entries**, keyed by lowercase German surface form. Value shape:

```js
{
  pos: "NOUN" | "VERB" | "ADJ" | "ADV" | "PREP" | "CONJ" | "PRON" | "DET" | "INTERJ" | ... ,
  gloss: "<string>",           // English gloss
  lemma?: "<string>",          // optional base form pointer (e.g., "ist" → "sein"); ~59 occurrences
  gender?: "<string>"          // NOUN only; "m" | "f" | "n" | "m.pl" | "f.pl" | "n.pl"
}
```

`lemma` chain is present but **not walked** by the glossing-suppression code — German's first-appearance logic keys on surface form only. Spanish uses `_vocabLemmaToFSRS` to walk the chain; German has no such map.

`gender` is a German-only additional field Spanish does not carry (Spanish `DICT` has `{pos, gloss, lemma?}`; German has `{pos, gloss, lemma?, gender?}`). Superset of Spanish's shape.

A commented block at L8822 — `// === Additional words from exercise corpus ===` — marks the boundary between the initial lemma coverage and supplementary entries backfilled from passage tokens.

`customTexts` import path (`doImport` at L20884) accepts a `vocabulary` field whose entries are merged into `DICT` with `DICT[word.toLowerCase()] = entry`.

#### 5.1.3 Vocabulary — `VOCAB` (L10731)

Array, **3,148 rows**. Row shape:

```js
{ section: "<string>", num: <int>, german: "<string>", english: "<string>", extra: "<string>" }
```

Section distribution:

| Section | Rows |
|---|---:|
| `Noun` | 999 |
| `Verb` | 500 |
| `Nietzsche` | 462 |
| `Freud` | 320 |
| `Wittgenstein` | 317 |
| `Adjective/Adverb` | 250 |
| `Preposition` | 100 |
| `Conjunction/Pronoun/Particle` | 100 |
| `Idiom` | 100 |

`num` is 1-indexed and unique within a section. `extra` carries gender/register/pedagogy notes (empty string is common — 999 Noun rows use `extra: ""` frequently because gender lives in `DICT` instead).

No `state` field on rows (Spanish has universal `state: "adjusted"`; German is missing). FSRS key derivation: `vocab_${section}_${num}` (L21496).

`Wittgenstein`, `Freud`, `Nietzsche` are the author-linked vocabulary sets (analogous to Spanish's `Borges`, `Neruda`, `Cob Building`); the other six sections are paradigmatic.

#### 5.1.4 Grammar lessons — `GRAMMAR_PROFILES` (L13884) + `GRAMMAR_UNITS` (L14830)

German splits grammar into two structures; Spanish uses one (`GRAMMAR_LESSONS`). The split reflects the Jannach textbook progression: reference-lessons (`GRAMMAR_UNITS`) are decoupled from exercise-pattern generators (`GRAMMAR_PROFILES`).

**`GRAMMAR_PROFILES` — 48 paradigm-drill patterns.** Row shape (L13886+):

```js
{
  category: "verb" | "noun" | "modal" | "subjunctive" | "article" | "preposition"
          | "adjective" | "pronoun" | "passive" | "compound",
  pattern: "<slug>",            // stable id, e.g. "weak_present_indicative"
  description: "<string>",      // human-facing title
  rule: "<string>",             // one-paragraph summary
  baseForm: "<string>",         // e.g. "infinitive"
  paradigm: { "<person-or-slot>": "<ending-or-template>", ... },
  paradigmLabels: { rows: "<string>", cols: "<string>" },
  stems: { "<stem-or-infinitive>": null | "<notes>" | { reg: "<stem>", alt: "<altstem>" } },
  generateForms: function(stemOrStemObj) { return { "<slot>": "<form>", ... }; }
}
```

Distribution by category: verb 13, noun 6, modal 6, subjunctive 5, article 4, preposition 4, adjective 3, pronoun 3, passive 2, compound 2.

`generateForms` is a **function-valued field** — German paradigm tables are computed at runtime from a template + stem dictionary. Load-bearing for strong verbs (stem-vowel changes on `du` and `er/sie/es`) and for the declension classes.

**`GRAMMAR_UNITS` — 34 reference lessons (`unit_0` … `unit_33`).** Row shape:

```js
{
  id: "unit_<N>",
  chapter: <int>,
  title: "<string>",
  content: [
    { type: "text" | "tip" | "rule" | "example", value?: "...", content?: "...", german?: "...", ... },
    ...
  ]
}
```

Consumer: `_getLessonTextForGrammar(lesson)` at L20102 flattens `content` into a TTS-feedable string by concatenating `text`/`tip`/`rule`/`example.german` fields.

Unit catalog (`chapter` index → `title`): Pronunciation Guide (`unit_0`), General Introduction (`unit_1`), Present Tense of Verbs and Personal Pronouns (`unit_2`), Case Endings I / II (`unit_3`–`unit_4`), Adjectives and Adverbs (`unit_5`), Prepositions I / II (`unit_6`–`unit_7`), Basic Verb Placement I (`unit_8`), Pronouns (`unit_9`), Weak Nouns and Adjectives Used as Nouns (`unit_10`), Various Uses of Es (`unit_11`), Future Tense (`unit_12`), Comparison of Adjectives and Adverbs (`unit_13`), Da- and Wo-Compounds (`unit_14`), Verb Prefixes (`unit_15`), Verb Tenses I / II (`unit_16`–`unit_17`), The Plurals (`unit_18`), How to Use a German Dictionary (`unit_19`), Common Suffixes (`unit_20`), Modal Auxiliaries (`unit_21`), The Zu Construction (`unit_22`), Co-ordinating Conjunctions (`unit_23`), Basic Verb Placement II (`unit_24`), Dependent Clauses I / II / III (`unit_25`–`unit_27`), The Reflexive (`unit_28`), Overloaded Adjective Construction (`unit_29`), The Passive (`unit_30`), Fake Passive / Constructions Translated Passively (`unit_31`), Subjunctive I (`unit_32`), Subjunctive II (`unit_33`).

#### 5.1.5 Translation audio overrides — **MISSING**

No `TRANSLATION_AUDIO_MAP` equivalent exists in German. No override map, no per-passage audio-path table, no pre-generated audio to override to. Spanish's 874-entry map has no German counterpart.

#### 5.1.6 Grammar audio lookup — **MISSING**

No `GRAMMAR_AUDIO_MAP` equivalent exists in German. No per-lesson audio file path table. Spanish's 70-entry map has no German counterpart.

### 5.2 External content (runtime-fetched)

German fetches no third-party content for its primary corpus. Runtime network requests are limited to:

1. **OpenAI TTS** (`https://api.openai.com/v1/audio/speech`, L20054, L20148) — neural TTS for passage/lesson playback; `model: "tts-1"`, `voice: "nova"`, `speed: 0.95`. Keyed by user-supplied API key (`this.ttsApiKey || this.apiKey`). In-memory cache `this._ttsCache` with hard cap 25 (`MAX_TTS_CACHE`, L20096).
2. **LLM endpoints** — Anthropic (L19775), OpenAI chat (L19807), Gemini (L19839). See §7.3 for the full provider table.
3. **Browser-native `speechSynthesis`** — final fallback; `_browserSpeak()` at L20200; `_pickDeVoice()` picks a `de-DE` voice.
4. **No pre-generated mp3 fetches** — there is no `audio/` tree to fetch from.
5. **No ElevenLabs call site** — grep confirms zero `elevenlabs` matches in `index.html`.

#### 5.2.1 ElevenLabs audio import pipeline — **MISSING**

No import tooling, no generator scripts, no `scripts/` directory, no audio output tree. The conceptual pipeline Spanish documents (source prose → per-sentence prompts → ElevenLabs mp3 → `audio/translation/` → `TRANSLATION_AUDIO_MAP` update → `audio/manifest.json` regeneration → `CACHE_NAME` bump → deploy) has **no German counterpart at any stage**. Single largest content-side parity gap; see `plans/PARITY_GAP.md` §11.4.

### 5.3 Content format

#### 5.3.1 Corpus format

Passages, dictionary, vocab, grammar profiles, and grammar units are embedded as JavaScript literals in `index.html`. There is no separate JSON-on-disk copy of the corpus inside `gh-pages-deploy/`; the HTML is the canonical on-repo representation.

Strings preserve:
- Unicode diacritics (`ä`, `ö`, `ü`, `ß`, and imported French/Latin accents in loanwords).
- Typographic quotation marks per German convention: `„Zitat"` and `»Zitat«` patterns coexist (spot-read at L9663, L10205).
- Em-dashes `—`, en-dashes `–`, ellipses `…`, non-breaking spaces where present.
- `*asterisk*` italic convention (used sparingly; present in some reference English passages).
- `\n` for intra-paragraph breaks (rare; Tractatus is single-line).

#### 5.3.2 Audio file naming — **N/A**

No pre-generated audio files exist; no file-naming convention is in force. Spanish's five naming families (grammar full lesson, grammar per-token, vocab, translation override, translation AudioCache fallback) are `MISSING` for German.

Forward recommendation (not authoritative; surfaces as Open Question B-4): if the German audio pipeline is built, mirror Spanish's `AudioCache.sanitize` (`lowercase`, `[^a-z0-9\u00c0-\u024f]+ → '_'`, trim, slice 80) so umlauts (`ä`, `ö`, `ü`) round-trip verbatim. The regex does **not** cover `ß`; explicit decision needed.

#### 5.3.3 Two-tier translation audio resolution — **MISSING**

No two-tier resolution exists in German. Playback is one-tier conceptually (live TTS) with the OpenAI → browser fallback inside it. See `_speakGerman()` at L20187.

#### 5.3.4 Sync/export format

See §4.3 for the full envelope shape. Content-side note: the export payload at `exportProgress` carries `completed`, `customTexts`, `grammarProgress`, `grammarUnitProgress`, `vocabProgress`, `translationHistory`, `fsrsState`, `activeTime`, `statsAssessment`, and `glossSeen` (WP-FE-G-2). Custom-text import preserves `{id, title, author, year, exercises, vocabulary}` shape (`doImport` at L20884).

---

## 6. UI/UX

*Drafted by Team Manager — Frontend/PWA.*

### 6.1 Layout and navigation

Two primary layouts, governed by **multiple overlapping mobile breakpoints** (`max-width: 768`, `767`, `600`, `380`). Spanish uses a single clean `max-width: 767` breakpoint plus a `max-width: 375` extra-small tier.

**Desktop (≥768px):** fixed-width sidebar on the left (`#sidebar`, 280 px min-width — L66–67), content on the right (`#main`). Mode switcher (`.mode-btn` × 4) at the top of the sidebar. Author tabs (TLP / Freud / Nietzsche) beneath. Exercise list fills most of the sidebar, with a progress bar and a four-button footer (Sync / Import / Statistics / Settings).

**Mobile (<768px):** `body` remains `display:flex`. Sidebar becomes a slide-in drawer (`.open` class toggles via `App` code at L19098–19102); backed by `#sidebar-overlay.visible`. **No persistent mobile header bar and no bottom tab bar** — the hamburger `#mobile-menu-btn` is the only mode-agnostic mobile control. Spanish ships both a 48-px top mobile header and a 52-px bottom `#mobile-tab-bar`.

Swipe-left-80-px-on-sidebar closes the drawer (L19109–19121). Body scroll-lock via `html.sidebar-open` / `body.sidebar-open` classes (L59–63). Selecting an exercise on mobile auto-closes the sidebar (L19105–19107).

Within the main area:

- Translation mode shows `#toolbar` + `#content-area` containing `#translation-content`, populated at authoring time (welcome HTML at L3938–3944). Other modes' containers (`#vocab-content`, `#grammar-content`, `#conversation-content`) are empty on load and fully `innerHTML`-rendered by per-mode methods.
- Four modal overlays (`#settings-modal`, `#import-modal`, `#stats-modal`, `#sync-modal`) are hidden by default and shown by adding `.visible`. **None carry `role="dialog"` or `aria-modal="true"` or `aria-labelledby`** (greppable, zero hits).
- `#update-banner` is a separate bottom-fixed pill at the end of `<body>` (L24673–24676) with German copy.

There is no client-side router. Mode state is held in `this.currentMode`; text state in `this.currentTextId`; exercise state in `this.currentExerciseIdx` (L18925–18927). URL and `history` API are not used.

### 6.2 Styling approach

All CSS is inlined in a single `<style>` block (L16–3888). No CSS framework.

**Design tokens** live on `:root` (L17–39):

- Surface: `--bg #faf8f5`, `--sidebar-bg #f0ece6`, `--white #ffffff`, `--border #d4cfc7`
- Text: `--text #1a1a1a`, `--text-muted #595959`
- Brand: `--accent #8b4513` (saddle brown), `--accent-light #a0522d`
- Semantic: `--success #2d6a2d`, `--warning #8b6914`, `--error #8b1a1a`
- POS color scale (ten hues): `--pos-noun`, `--pos-verb`, `--pos-adj`, `--pos-adv`, `--pos-prep`, `--pos-conj`, `--pos-art`, `--pos-pron`, `--pos-part`, `--pos-num`

No stray `.pos-*` literal-hex classes outside the `:root` declaration (cleaner here than Spanish FE-5).

**Dark mode** is supported via `@media (prefers-color-scheme: dark)` (L3841–3855). Only `:root` tokens are redeclared; there are no component-scoped overrides (Spanish has a handful). No in-app toggle.

**Typography.** `body` defaults to `Georgia, 'Times New Roman', serif` (L48). Navigation chrome (`#sidebar-header`, `.text-tab`, `.mode-btn`, `.sidebar-btn`, `.toggle-btn`, `.action-btn`, `.modal-btn`, etc.) uses `'Helvetica Neue', Arial, sans-serif`. No web fonts loaded.

**Per-icon-theme PWA manifests.** **Absent.** `manifest.json` is the sole manifest. Spanish has `manifest-1.json` … `manifest-5.json`.

**Theming of selected icon.** `_applyAppIcon(val)` (L20650) rewrites `<link rel="apple-touch-icon">` and `<link rel="icon">` `href` only, to a base64 data URI returned by `_iconFileForValue(val)` (L20645). It does **not** rewrite any `<link rel="manifest">` (there is no per-icon manifest) and does **not** update any `<meta name="theme-color">`. The `theme-color` meta at L11 stays at `#faf8f5` regardless of selection.

### 6.3 Responsive behavior

CSS breakpoints (four):

- `@media (max-width: 768px)` (L1269, L2909) — primary mobile.
- `@media (max-width: 767px)` (L3589) — secondary.
- `@media (max-width: 600px)` (L3827) — narrow desktop / phablet.
- `@media (max-width: 380px)` (L1608, L3278) — small phone.

Touch-target hardening: `touch-action: manipulation` on all `button, a, select, input, textarea, .exercise-item, .unit-header, .unit-item, .vocab-group-header, .text-tab, .mode-btn, .grammar-tab, .toggle-btn, .action-btn, .sidebar-btn, .vocab-mc-option, .vocab-action-btn` (L42–46). 44×44 px minimums per selector `[UNVERIFIED]` in this pass.

Safe-area insets: `@supports (padding-top: env(safe-area-inset-top))` handling at L1248–1267. Body uses `100vh` + `100dvh` override (L52–53).

The app declares `width=device-width, initial-scale=1.0, viewport-fit=cover` in the viewport meta at L5. **It does not set `user-scalable=no` or `maximum-scale=1.0`** — pinch-zoom works. (Better than Spanish §10 #9, which fails WCAG 1.4.4.)

PWA behavior (L7–11): `display: "standalone"` (in `manifest.json`), `apple-mobile-web-app-capable: yes`, `apple-mobile-web-app-status-bar-style: default` (Spanish uses `black-translucent`), `apple-mobile-web-app-title: "Übersetzungswerkstatt"`.

### 6.4 Accessibility

**Landmarks and roles.** **No `<nav>`, no `<main>`, no `<header>`, no `<footer>`, no `<aside>`, no `<section>`, no explicit `role=…` attributes anywhere in the deployed DOM** (greppable, zero hits outside JS string literals). The sidebar is `<div id="sidebar">`, main content is `<div id="main">`. Modals are `<div class="modal">` without `role="dialog"` / `aria-modal` / `aria-labelledby`.

**Language.** `<html lang="en">` at L2. **Intentional design decision per Principal (2026-04-19, resolving Appendix B #B-12):** UI chrome is English; the `<html>` declaration is chrome-led on both apps. **No per-region `lang="de"` overrides** applied on German-text containers — Spanish applies `lang="es"` to Spanish regions; German does not apply `lang="de"` anywhere. The per-region-override gap remains accessibility-relevant even though the root declaration is settled.

**Focus management.** **No global Escape-closes-modal handler and no Tab-focus-trap.** The only `keydown` bindings are on grammar-production input at L22207 and conversation input at L24159 (both for Enter submission), plus the activity-tracker bundle at L24354.

`openSettings` (L20658), `openImport` (L20863), and `openSync` (L20739) do **not** focus the first focusable element of the modal and do **not** store `document.activeElement` for return on close.

**Buttons and ARIA.** Most interactive elements in the top-level markup carry `aria-label`s (spot-verified on every `.mode-btn`, `.text-tab`, `.sidebar-btn`, `.action-btn`, `.toggle-btn`, modal action button). Toggle buttons (`#pos-toggle`, `#gloss-toggle`, `#gloss-hide-toggle`) do **not** have `aria-pressed` attributes — state is communicated via a CSS class only.

Evaluation result is `aria-live="polite"` (L3973); `#vocab-content`, `#grammar-content`, `#conversation-content` each also carry `aria-live="polite"` (L3989–3991).

**Focus-visible.** Global `button:focus-visible, …, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` at L3600–3608.

**Touch targets.** `touch-action: manipulation` is globally applied (§6.3). 44×44 px minimums `[UNVERIFIED]`.

**Known gaps for QA / Auditor scoring:**

- No modal focus trap (major regression vs. Spanish).
- No Escape-closes-modal handler.
- No `role="dialog"` on any modal.
- No `lang="de"` regions.
- `<html lang="en">` is *intentional* per Principal (2026-04-19). Not a gap.
- Color contrast of the `--pos-*` tokens on both `:root` and dark-mode backgrounds has not been audited programmatically.
- Icon-picker radio `<input>`s (L4029 onward) use visual-only distinction — `alt` text strategy `[UNVERIFIED]`.
- Skip-link: absent.

---

## 7. Dependencies

### 7.1 Client-side libraries / CSP

*Drafted by Team Manager — Frontend/PWA.*

**Libraries: none.** No CDN scripts, no bundler-installed packages, no frameworks. The app runs on platform APIs only.

| Dependency | Version | Purpose |
|---|---|---|
| Service Worker API | Browser-native | Precache + runtime caching (`sw.js`). See §8.3. |
| `localStorage` | Browser-native | Primary persistence for all `uw_*` keys. See §4. |
| `sessionStorage` | Browser-native | **Unused.** |
| IndexedDB | Browser-native | **Unused.** |
| Web Speech API (`speechSynthesis`) | Browser-native | Final fallback for German / English TTS. Voice catalog via `speechSynthesis.getVoices()`; re-read on `voiceschanged`. |
| Fetch / Blob / `URL.createObjectURL` | Browser-native | LLM API calls, TTS binary fetch, progress-file download (L20761–20768 for export). |
| `AbortController` | Browser-native | LLM timeout abort pattern; default `API_TIMEOUT_MS = 30000` at L18921. |
| Anthropic Messages API | `anthropic-version: 2023-06-01` | `POST https://api.anthropic.com/v1/messages` at L19775. Header: `anthropic-dangerous-direct-browser-access: true` (see §10 G-2). Default model `[UNVERIFIED]`. |
| OpenAI Chat Completions API | — | `POST https://api.openai.com/v1/chat/completions` at L19807. Default model `[UNVERIFIED]`. Also the source of neural TTS: `POST https://api.openai.com/v1/audio/speech` at L20054 and L20148. |
| Google Generative Language API | `v1beta` | `POST https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}` at L19839 — **key transmitted in URL query string** (see §10 G-3). |
| ElevenLabs TTS API | — | **Not used.** No call site, no key, no UI surface. |

**Content-Security-Policy: MISSING.**

There is **no `<meta http-equiv="Content-Security-Policy">` tag in `index.html`** (confirmed via direct search by Senior Dev 2026-04-19; further verified by Auditor in §10 G-1). The German app has not opted into a meta-CSP at all. This is an **architectural gap to be established**, not a parity-delta against Spanish's ordered allow-list.

The practical consequence: every fetch the German app makes (to Anthropic, OpenAI chat, OpenAI TTS, Gemini, and the manifest.json network-first branch) is constrained only by the browser's default same-origin + CORS posture, without explicit allow-listing. Adding a `connect-src` discipline is a prerequisite for any future "add ElevenLabs" or "add a proxy" work.

### 7.2 Dev dependencies

*Drafted by DevOps / Deploy Manager.*

| Dependency | Version | Purpose |
|---|---|---|
| — | — | **None.** No `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Pipfile`, `requirements.txt`, `Cargo.toml`, `Gemfile`, or any other dependency manifest exists at the repo root of `main` (the only branch). No `node_modules/`, no virtualenv, no build toolchain. |

**Notable state, not a gap.** The app is hand-authored HTML/JS/CSS. A single `index.html` (1,949,802 bytes, ≈24,703 lines on `main` HEAD `f79e45c`) inlines all application code, style, and embedded content. `sw.js` (2,038 bytes, 73 lines) is the only other JavaScript file. There is intentionally no build step, no bundler, no transpiler, no CSS preprocessor, no test runner configured, and no linter configured. The absence of dev dependencies is load-bearing in the same way it is for Spanish: any developer can edit `index.html` directly and reload to see results without a rebuild; deploy has no build phase and therefore no build failure mode; any future CI must either adopt a runtime that can exercise the single-file app (headless browser) or continue to treat the repo as a pure static-asset set.

**Implications for CI:**

- Any verification step (asset-list sync, cache-bump check, smoke test) must be written against raw HTML/JS, not against a bundler output.
- Unlike Spanish, the German repo has **no legacy `REVIEW/` directory, no inert workflow file, no vestigial `gh-pages-deploy/` subdirectory, and no Python verification harness**. Whatever CI the German team stands up is being built onto a blank slate.

### 7.3 External services

*Drafted by Security & Performance Auditor.*

#### 7.3.1 Provider table

| Service | Purpose | Auth method | Data flow | Notes |
|---|---|---|---|---|
| Anthropic Claude API | LLM backend for translation evaluation, inline feedback, hints, conversation-practice replies, and the LLM proficiency assessment in the Statistics modal | User-supplied API key held in `localStorage` under `uw_apiKey`; transmitted as `x-api-key` request header. Two opt-in companion headers also sent: `anthropic-version: 2023-06-01` and `anthropic-dangerous-direct-browser-access: true` | Direct browser → `POST https://api.anthropic.com/v1/messages` (L19775–19783); no intermediate proxy. Response body is consumed in-process; user-facing rendering paths route through `_escapeHtml` (see §10 G-8) | Default-model selection lives in `apiProvider` / model-name fields; bounded by a 30-second `AbortController` timeout via the shared `API_TIMEOUT_MS = 30000` constant (L18921, L19772). Anthropic explicitly labels the `dangerous-direct-browser-access` header as an unsafe pattern — see §10 G-2. |
| OpenAI API (chat + audio) | Alternative LLM provider for evaluation/feedback/hint flows; also the neural TTS provider (the only neural-TTS provider — there is no ElevenLabs integration) | User-supplied API key held in `localStorage` under `uw_apiKey` (LLM) or `uw_ttsApiKey` (TTS); transmitted as `Authorization: Bearer …` header | Direct browser → `POST https://api.openai.com/v1/chat/completions` (LLM, L19807–19822) and `POST https://api.openai.com/v1/audio/speech` (TTS, L20054–20061, L20148–20153). TTS response blobs are wrapped in `URL.createObjectURL` and cached in the in-memory `_ttsCache` `Map` (L20049–20100) with a hard cap of 25 entries and `URL.revokeObjectURL` on eviction | LLM model selection is provider-driven; TTS uses model `tts-1`, voice `nova`, speed `0.95`. A distinct `uw_ttsApiKey` may be supplied so the TTS key and LLM key need not be identical (L20057, L20151). |
| Google Gemini API | Alternative LLM provider for the same evaluation/feedback/hint flows | User-supplied API key held in `localStorage` under `uw_apiKey`; transmitted in the URL **query string** (`?key=…`) | Direct browser → `POST https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}` (L19838–19839) | Query-string auth is a weaker posture than header auth: the key appears in service-worker URL routing (`sw.js:38–51` non-same-origin branch), browser history, `Referer` headers on any downstream navigation, and console/network-panel URLs. See §10 G-3. |
| GitHub Pages (hosting) | Static deploy target | Public (no auth) | Browser → `https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/` (`[UNVERIFIED]` — see Appendix B #B-1) | Not an API dependency; included for completeness of the external-service surface. |

**Absent from the German provider list (vs. Spanish §7.3):** ElevenLabs TTS. Direct grep across `index.html` returns zero matches for `elevenlabs` (case-insensitive). German has no ElevenLabs API key, no `xi-api-key` header, no `api.elevenlabs.io` call site, and no UI surface for ElevenLabs voice/key entry.

#### 7.3.2 Baseline CSP

**Status (as of 2026-04-19, WP-FE-G-1 Commit 1):** German `index.html:7` carries a `Content-Security-Policy-Report-Only` meta with the canonical allow-list (full string in the file; see also `plans/work-packages/WP-FE-G-1_design.md §1`). Promotion to enforcing pending Auditor verification (§6 of the engineer brief). The "MISSING" framing below remains until the enforcing commit lands; the Report-Only header does not enforce.

**There is no Content-Security-Policy meta tag in German `index.html`.** Direct grep returns no `Content-Security-Policy`, no `http-equiv`, no `connect-src`, no `default-src`, no `script-src` anywhere in the document `<head>` (lines 1–17) or elsewhere. GitHub Pages also emits no CSP response header (`[UNVERIFIED — needs `curl -I` against the live URL to confirm]`). The German app currently runs under the browser's permissive default — any origin is reachable, any inline script executes, any external resource loads.

This is a **`MISSING` at the architectural level**, not a parity-with-Spanish gap. Establishing a meta CSP is a German invariant the team has not yet committed to. It will be recorded in `plans/ARCHITECTURE.md` as a Phase-1 German architectural commitment, per Dispatch confirmation 2026-04-19.

When German adds ElevenLabs in a future phase, the `connect-src` allowlist must land in the same change — never opt into the provider without opting into the CSP.

#### 7.3.3 Key-storage summary

Every provider key Cam enters in the settings modal is held in **`localStorage` only**, under the `uw_` prefix. The relevant keys are `uw_apiKey` (LLM) and `uw_ttsApiKey` (OpenAI TTS). Read/write helpers are `App.load(key)` and `App.save(key, val)` at L19042 and L19027.

There is no `sessionStorage` mirror, no IndexedDB mirror, no in-memory zeroization on reset, and no companion key-revocation UI beyond manual blanking in the Settings modal (L20679–20688). Any reflected or stored XSS — there is no CSP to constrain it — reads the key directly from `localStorage`.

#### 7.3.4 Audio-playback tiering

Two-tier pipeline (versus Spanish's three-tier):

1. **Neural TTS** — OpenAI `tts-1` via `_openaiTTS` (L20130–20185). Cached per-text in `_ttsCache` (L20049–20100).
2. **Browser `speechSynthesis`** — `_browserSpeak` fallback when neural TTS errors (`onEnd("fallback")` at L20183, consumed by `_speakGerman` at L20189–20198).

There is **no pre-generated MP3 tier** (Spanish's tier 1). German has no `audio/` directory and no `audio/manifest.json`; `AudioCache` does not exist. Cam reports the German app is functional under this two-tier configuration; the absence is structural, not a defect.

---

## 8. Deployment

*Drafted by DevOps / Deploy Manager.*

### 8.1 Hosting

The app is hosted on **Cloudflare Pages**, Git-integrated against `https://github.com/cameronhubbard642-eng/uebersetzungswerkstatt.git` `main`. Cutover from GitHub Pages landed 2026-04-24 (WP-DEP-G-8).

**Branch topology:**

- `origin/main` — the only branch on origin. CF Pages subscribes to this branch; every push produces an immutable deployment with a SHA-tagged preview URL, and the production alias advances on success.
- No `gh-pages` branch, no orphan deploy branch. Unified source+deploy repository, unchanged from the prior GH Pages posture.

**Live URL (production alias):** `https://uebersetzungswerkstatt.glossolalia.dev/` — CF Pages custom domain, TLS terminated at Cloudflare edge.

**Legacy URL (dual-serve):** `https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/` — frozen at the pre-cutover tree (`origin/main` at cutover SHA). Kept live for 3 days post-cutover (through 2026-04-27) to catch A2HS icons and bookmarks still targeting the `*.github.io` origin, then Pages source disabled in repo Settings. No further pushes propagate to the legacy URL.

**Jekyll:** no longer applicable under CF Pages (CF Pages is a static-file CDN with no markup preprocessing). The absence of `.nojekyll` in the repo is now moot; it remains absent and unneeded.

**`_headers` file** (repo root, introduced WP-DEP-G-8): CF Pages edge-delivered HTTP headers per [Cloudflare Pages `_headers` grammar](https://developers.cloudflare.com/pages/configuration/headers/). Delivers CSP-Report-Only, Referrer-Policy, X-Content-Type-Options, Permissions-Policy, and Report-To on every response (`/*`), plus a `Cache-Control: no-cache` override on `/sw.js` to prevent CDN caching of the service-worker byte stream. See §8.5 for CSP reporting specifics.

### 8.2 Build process

**Still no build process in the conventional sense** — no Makefile, no `deploy.sh`, no `package.json` scripts. CF Pages treats the repo root as the publish directory directly (no framework preset configured). The `_headers` and `_redirects` files are the only CF-specific configuration; both are plain-text declarative.

`.github/workflows/` now carries two CI workflows (WP-DEP-G-4 / WP-DEP-G-5) that run on push — a pre-deploy smoke test and a post-deploy parity probe. These are unchanged by the CF Pages cutover as source files, though the probe's `PAGES_URL` still points at the legacy GH Pages origin as of the cutover commit and requires a follow-up migration.

**The deploy ritual (post-cutover):**

1. Author edits files locally on a worktree branch.
2. Author hand-increments the `CACHE_NAME` constant in `sw.js` (`'werkstatt-cf-vN'` → `'werkstatt-cf-v(N+1)'`) for any SW-touching change. Same-commit rule.
3. Author updates `_headers` `connect-src` for any new external host added to a call site (same commit, per `plans/ARCHITECTURE.md §3.4`).
4. `git add && git commit && git push origin main`.
5. CF Pages picks up within ~30 s and publishes to the production alias within 60–90 s typical.

**Rollback plan.** Preferred path is CF Pages' native "Rollback to this deployment" action in the dashboard — immutable SHA-tagged deployments mean rollback is a pointer swap at the edge. Git-path rollback (`git revert <sha> && git push origin main`) remains available and produces the same byte result. Force-push + CACHE_NAME bump is the last-resort destructive option. Full procedure in `plans/runbooks/deploy-and-rollback.md`.

**Local repository-integrity notice (not deploy-affecting).** `git fsck` on the mounted working copy reports: `missing commit 933dd38b077754b54c0e39870bd5b07bed21f592`, `dangling commit 446c83b59d50a489fce3c21033e94776a0c2b0ce`, `broken link from commit 86664ae5…` to the missing commit, and broken tree→blob links. Current `main` tip matches `origin/main` exactly; the corrupt objects lie in unreachable regions of the local object store. `git log HEAD` traverses 18 commits before failing on the missing object, so history older than `6646dff` is locally unreadable. **No impact on the deploy surface.** Origin carries the full history; a fresh clone resolves it. Recorded here to reinforce the "re-clone from origin" rollback posture.

### 8.3 PWA / offline

**Manifest:** `manifest.json` at the repo root declares `name: "Philosophische Übersetzungswerkstatt"`, `short_name: "Übersetzungs"`, `description: "German philosophical translation practice"`, `start_url: "/index.html"`, `scope: "/"`, `display: "standalone"`, `background_color: "#faf8f5"`, `theme_color: "#faf8f5"`, and two icon entries referencing `icon-192.png` and `icon-512.png`. WP-DEP-G-8 (2026-04-24) changed `start_url` from relative `./index.html` to absolute `/index.html` and added explicit `scope: "/"`, matching CF Pages' root-served topology. `manifest-1.json` through `manifest-5.json` are per-icon-theme variants (added by earlier WPs) carrying the same `start_url` / `scope` post-cutover; `lang`, `orientation`, and `maskable` icon variants on `manifest-{1..5}` are covered by WP-FE-G-14.

**Service worker:** `sw.js`, served from the repo root, scope `./`. Registration in `index.html` uses `navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })` inside a `window.addEventListener('load', …)` IIFE — `{ updateViaCache: 'none' }` prevents iOS Safari from serving stale `sw.js` from the HTTP cache. Post-WP-DEP-G-8, this is paired with a CF-Pages-delivered `Cache-Control: no-cache` on `/sw.js` (via `_headers`) so the CDN cache also never holds a stale SW byte stream — both layers point the same direction, eliminating the update-stuck failure mode at the edge as well as at the browser. See §8.3.1 for the registration flow and §8.5 for the `_headers` wiring.

**Caching strategy** (observed from `sw.js`, full file 73 lines):

- **Install** (L17–21): opens the named cache (`werkstatt-v19`) and `cache.addAll(PRECACHE_URLS)`. No install-time `skipWaiting()` — removed by WP-ARCH-G-3; activation is user-gated via the update banner (see §8.3.1).
- **Activate** (L25–31): deletes all caches whose name is not `CACHE_NAME`, then calls `self.clients.claim()`.
- **Fetch — network-first branch** (L38–51): matches URLs whose pathname ends `manifest.json`, **or** whose hostname is not `location.hostname`, **or** whose method is not `GET`. Network result is written through to cache on `ok`. The cross-origin-as-network-first heuristic is broader than Spanish's, which targets specifically `api.*` / `generativelanguage` hosts. In current usage this has no observable difference, but it is a divergent *policy*.
- **Fetch — cache-first branch** (L53–65): everything else. Serve cache hit if present; otherwise fetch and write-through on `ok`.
- **Messaging** (L67–72): listens for `{ type: 'SKIP_WAITING' }` and calls `self.skipWaiting()`. Sole activation gate — see §8.3.1.

**Precache list (`PRECACHE_URLS`)** is hand-maintained in `sw.js` L6–14, six entries: `index.html`, `manifest.json`, `German-Icon-I.jpeg` … `German-Icon-V.jpeg`. **Notably absent** from the precache: `icon-192.png` and `icon-512.png` (the PWA install icons referenced by `manifest.json`), and `sw.js` itself.

**Filename hazard (P0 candidate — see §10 G-15).** The precache references the *hyphenated* JPEG filenames (`German-Icon-I.jpeg`). The repo tree on `main` carries the *space-separated* filenames (`German Icon I.jpeg`); the hyphenated copies are untracked working-copy duplicates only. Verified via `git ls-files`: only the space-separated names are tracked. If GitHub Pages does not silently alias these, `cache.addAll` rejects atomically on install and the SW never activates — meaning the v10 SW commit (`f79e45c`) may have been silently broken in production since merge. **Live verification required** (`curl -I https://<deploy-url>/German-Icon-I.jpeg`). This is the highest-priority operational item raised by this spec.

**Offline behavior (derived).** After first install (assuming the precache hazard does not trip it), the app launches offline for `index.html`, `manifest.json`, and the five in-app German Icon JPEGs. Everything else — including the PWA install icons, any external API call, any web-font, any future audio asset — requires a prior online fetch to populate the cache-first branch.

#### 8.3.1 Client-side update UX

Service worker registration (IIFE at end of `<body>`). Wrapped in `window.addEventListener('load', …)` to defer `reg.update()` past page-parse time, avoiding the Chrome double-install race. WP-ARCH-G-3 Amendment 4 (2026-04-19) restored Spanish §1.6 parity.

**Registration flow (current — WP-ARCH-G-3 Amendment 4, Spanish-aligned):**

1. `navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })` — fresh `sw.js` fetched from network on every page load; iOS Safari HTTP cache cannot serve stale SW bytes.
2. `reg.waiting` cold-load check — if a SW is already waiting from a prior session, show banner immediately.
3. `reg.installing` guard — if a SW is installing at registration time, track it (with `!!reg.active` as the isUpdate flag).
4. `reg.addEventListener('updatefound', …)` — fires when a new SW is detected during this session. Tracks the installing worker with `!!reg.active`.
5. `reg.update()` — explicit mid-session update poll. Safe inside `load` listener (deferred past register resolution).
6. On statechange to `'installed'` with `isUpdate === true`, show banner.
7. Banner-click posts `{ type: 'SKIP_WAITING' }` to `waitingSW` → `sw.js` message handler calls `self.skipWaiting()` → SW activates → `clients.claim()` → `controllerchange` → `location.reload()` → user sees the new version. ✓
8. Dismiss-click hides the banner without activating.

**First-install path:** no banner. On first install, `reg.active` is null so `isUpdate` is `false` for the initial installing worker. SW installs and activates via `clients.claim()`; `controllerchange` fires and triggers `location.reload()`. On the reloaded page, no waiting or new-install worker → no banner. ✓

**Install-time `self.skipWaiting()` removed.** WP-ARCH-G-3 selected Option A on Appendix B #B-4 (see §B-4 below): the install-time `skipWaiting` was a reactive workaround for the v9→v10 HTTP-cache problem; the proper fix is `{ updateViaCache: 'none' }`. The `sw.js` message handler (`SKIP_WAITING` path) remains the sole `skipWaiting` call site, gated on user accept.

**User-facing update UX.**

- `#update-banner` is a bottom-bar with German copy ("Neue Version verfügbar"), a reload button "Aktualisieren", and a dismiss button "✕". Parity with Spanish.
- "Aktualisieren" button click handler: posts `{ type: 'SKIP_WAITING' }` to `waitingSW` (captured at banner-show time). Message-triggered `skipWaiting` path matches Spanish.
- `controllerchange` listener: simple reload. Matches Spanish.

### 8.4 Versioning

There is **no application version number** in any conventional sense. No `version` field in `manifest.json`, no `VERSION` file, no build-time stamp, no git SHA embedded in the artifact, no `package.json` to carry a semver. The one version string in the deploy artifact is `CACHE_NAME` on `sw.js` L4:

```js
const CACHE_NAME = 'werkstatt-cf-v1';
```

**`CACHE_NAME` as the de facto version stamp.** As in Spanish, `CACHE_NAME` serves three roles at once — Cache Storage key, invalidation token (old caches are deleted in the `activate` handler, `sw.js` L27–28), and the only observable version marker a returning user sees. Bumping it is the single mechanism that forces a returning user's browser to fetch fresh copies of precached assets, including `index.html`.

**`-cf-` infix post-cutover.** WP-DEP-G-8 introduced a migration-boundary convention: pre-cutover names follow `werkstatt-v{N}` (v1..v63 historical), post-cutover follow `werkstatt-cf-v{N}` starting at `werkstatt-cf-v1`. The infix is a human-readable signal that the cache key crosses a hosting-platform boundary; the SW's `activate` handler deletes any cache whose name is not the current `CACHE_NAME`, so the first post-cutover activation evicts the entire `werkstatt-v*` family in one sweep.

**Bump ritual (observed):** hand-edit the string in `sw.js` before or as part of the deploy commit. No automation, no template substitution, no pre-push hook. WP-DEP-G-4's pre-deploy smoke test (`.github/workflows/pre-deploy-smoke.yml`) flags an unbumped `CACHE_NAME` on a precache-affecting change; WP-DEP-G-5's post-deploy probe cross-checks the served byte stream (pending URL migration post-WP-DEP-G-8). The increment is a single digit (`vN → v(N+1)`), no semver, no date stamp. Identical posture to Spanish.

**Historical bump lineage** (from `git log -p -- sw.js`, traversable history only):

| Version | Commit | Nature |
|---|---|---|
| v2 | `6646dff` | `Fix service worker: bump cache to v2, fix precache URL` — foundational |
| v3 | `d1560a3` | `Fix SW install failure: resolve missing precache icon files` — bundled with fix |
| v4 | `ba95ab3` | `Redesign grammar tab landing page to match Spanish app architecture` — bundled, unannounced bump |
| v5 | `621f023` | `Restyle update and export banners to match app color scheme` — bundled, unannounced bump |
| v6 | `096a90b` | `feat: FSRS grammar unit recording, review queue, short_name fix, bump SW v6` — bundled, announced |
| v7 | `1779845` | `Replace emoji icons with thin-stroke SVGs throughout app` — bundled, unannounced bump |
| v8 | `ff37c06` | `Deploy: remove standalone Nietzsche tab, rename Genealogie → Nietzsche, bump SW to v8` — bundled, announced |
| v9 | `b31ab4c` | `Deploy: remove PU tab, bump SW to v9` — bundled, announced |
| v10 | `f79e45c` | `Bump SW to v10 with skipWaiting on install to force update` — explicit bump commit |

The Spanish-style "amnesia" pattern (where follow-up commits had to re-bump a version forgotten on the prior commit) does **not appear** in the German traversable history: every content-bearing commit since `6646dff` carries a bump. Discipline-quality win relative to Spanish, but author discipline only — the same failure mode remains available.

**Bump policy (observed):** bump when any file in `PRECACHE_URLS` changes, when `index.html` changes, or when manifest semantics change. Undocumented; exactly the rule a CI check could mechanize.

### 8.5 CSP delivery and violation reporting

*Introduced by WP-DEP-G-8 (2026-04-24).*

**Delivery mechanism.** CSP is delivered as an HTTP response header (`Content-Security-Policy-Report-Only`) via the `_headers` file, applied to `/*`. The previous meta-tag delivery (`<meta http-equiv="Content-Security-Policy-Report-Only">` on `index.html:7`) was removed in the cutover commit. Header delivery is the CSP spec-conformant path for directives like `frame-ancestors`, `base-uri`, and `report-uri`/`report-to`, which are invalid or silently-ignored when delivered via meta.

**Enforcement mode.** Report-Only for an initial 7-day observation window post-cutover. No blocking; violations log only. The enforce flip (rename header to `Content-Security-Policy`) is scheduled after the observation window if no unexpected violations surface.

**Directive set** (unchanged from pre-cutover except for the additions `report-uri` and `report-to`):

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self';
connect-src 'self' https://api.anthropic.com https://api.openai.com
  https://generativelanguage.googleapis.com https://api.elevenlabs.io;
worker-src 'self'; manifest-src 'self'; object-src 'none';
form-action 'none'; base-uri 'self'; frame-ancestors 'none';
report-uri https://api.glossolalia.dev/csp-report;
report-to csp
```

A companion `Report-To` header declares the `csp` reporting group pointing at the same endpoint for level-3-aware browsers.

**Reporting endpoint.** `https://api.glossolalia.dev/csp-report` is a shared Cloudflare Worker (Taller + Werkstatt), owned by Senior Dev — Taller. Worker deployment is scheduled as part of the post-sprint sync-backend architecture (`plans/sync-architecture-proposal.md`); in the interim the endpoint does not resolve and `report-uri` POSTs silently 404 under Report-Only. Observation in the interim is manual — exercise the app with DevTools console open and log any `SecurityPolicyViolationEvent` surface.

**Companion headers** (also in `_headers`):

| Header | Value | Purpose |
|---|---|---|
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Was previously meta-delivered on `index.html:8` (WP-FE-G-12); meta tag preserved for redundancy. |
| `X-Content-Type-Options` | `nosniff` | New (header-only). |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` | Was previously meta-delivered on `index.html:9` (WP-FE-G-12); meta tag preserved for redundancy. |

**Per-path override.** `/sw.js` additionally carries `Cache-Control: no-cache` via a second `_headers` rule block, paired with the existing SW-registration `{ updateViaCache: 'none' }` at §8.3.

---

## 9. Configuration

*Drafted by Team Manager — Frontend/PWA.*

All user-configurable settings live in the Settings modal (`#settings-modal`, L3995–4064). Settings are saved to `localStorage` only — no `sessionStorage` and no IDB mirror (§4.1).

### 9.1 LLM provider

- **Provider** (`uw_apiProvider`) — one of `"anthropic"`, `"openai"`, `"gemini"`. Selected via `#api-provider-select` (L4000–4004). Default `"anthropic"` (L18934).
- **API key** (`uw_apiKey`) — entered via `#api-key-input` (`type="password"`, L4006). Blank disables LLM-dependent features.

### 9.2 TTS configuration

- **OpenAI TTS key** (`uw_ttsApiKey`) — entered via `#tts-api-key-input` (L4009). Optional; if blank and `uw_apiProvider === "openai"`, the LLM key is reused.
- **No TTS-provider selector.** Spanish has `#tts-provider-select` with OpenAI / ElevenLabs options.
- **No ElevenLabs key or voice-ID config.**

### 9.3 Browser TTS voices

- **German voice** (`uw_voiceDeName`) — `SpeechSynthesisVoice.name`. Selected via `#voice-de-select` (L4013). Empty = auto.
- **English voice** (`uw_voiceEnName`) — symmetric; `#voice-en-select` (L4020).
- Preview buttons (`#voice-de-preview`, `#voice-en-preview`) speak a fixed sentence each (L20670: "Ein schöner Tag in Deutschland."; L20671: "A beautiful day for learning German.").
- Voice dropdowns are populated by `_populateVoiceDropdowns` (L20701), which enumerates `speechSynthesis.getVoices()` and filters by `lang.startsWith("de")` / `"en"`.

### 9.4 App icon

- **App icon** (`uw_appIcon`) — one of `"1"` … `"5"`. Default `"1"`. Selected via the radio-group at L4028–4052.
- On save, `_applyAppIcon` (L20650) rewrites `<link rel="apple-touch-icon">` and `<link rel="icon">` `href` to the **base64 data URI** returned by `_iconFileForValue` (L20645). No per-icon manifest is swapped; no `theme-color` meta is touched.
- **No pre-paint icon apply.** On first load, the browser paints icon-1 (baked into the `<link>` tags at L14–15) before `App.constructor` runs `_applyAppIcon(this.appIcon)` at L18939. Any user who picked a non-default icon will see a brief icon-1 flash on cold load.
- Installed PWAs retain the icon at install time — the UI note at L4054 ("If you have added this app to your home screen…") tells users they need to remove and re-add for the change to take effect.

### 9.5 Glossing and progress

- **Reset automatic glossing** — present (WP-FE-G-2). "Reset Automatic Glossing" button in Settings calls `resetGlossSeen()`, which clears `uw_glossSeen` and `this._glossSeen`.
- **Reset all progress** (`#reset-progress-btn`, L4058) — wraps `resetProgress()` at L20724, which uses native `confirm()` and does not invoke a styled confirmation overlay.

### 9.6 Non-UI / internal configuration

No `.env`, no feature flags, no config files. Code-level constants:

- `sw.js`: `CACHE_NAME = 'werkstatt-v10'` (L4) — bumped per release.
- `FSRS` IIFE (L18651): canonical FSRS v4.5, all 19 weights active. Short-term stability for Learning/Relearning states (`_nextShortTermStability`, W[17]/W[18]) implemented `werkstatt-v29`. Spanish uses FSRS v4 (17 weights); German is algorithmically ahead. See `ARCHITECTURE.md §1.4`.
- `App.llmComplete` default timeout: `API_TIMEOUT_MS = 30000` at L18921.
- Export reminder thresholds: **not applicable** (no reminder mechanism exists).

Content-driven configuration surfaces (unit/lesson selection defaults, vocab batch-size of 25, thematic tier thresholds) are described alongside content in §5 and are owned by Content TM.

---

## 10. Known Issues and Technical Debt

*Drafted by Security & Performance Auditor; integrated by Senior Dev Oversight. Severity classification mirrors Spanish §10.1 (Critical / High / Medium / Low). Per Dispatch direction (2026-04-19), copyright is OUT OF SCOPE for both apps.*

### 10.1 German Auditor primary table

Item numbers are German-side (G-N); cross-references to Spanish §10 issues are noted in the "Spanish parallel" column.

| # | Issue | Severity | Location | Spanish parallel | Notes |
|---|---|---|---|---|---|
| G-1 | No Content Security Policy declared anywhere — no meta `http-equiv`, no response header from GH Pages, no SW-injected policy | High | `index.html` `<head>` (L1–17) | (no parallel — Spanish has a meta CSP) | Architectural gap. Single highest-leverage hardening for German: a `connect-src` allowlist for the three live providers, `script-src 'self' 'unsafe-inline'` (until the inline bundle is split), `img-src 'self' data: blob:`, `media-src 'self' blob:`. Validate on-device — meta-CSP is ignored in some contexts, especially inside cached SW responses. |
| G-2 | Anthropic API called directly from the browser with `x-api-key` + `anthropic-dangerous-direct-browser-access: true` | High | L19775–19783 | Spanish §10 #2 — applies (architecturally identical) | Anthropic's own documentation classifies this header as unsafe. With no CSP (G-1), any reflected XSS reads `localStorage["uw_apiKey"]` synchronously. Mitigation arc same as Spanish (CSP first; light proxy on the static host as the second-order fix). |
| G-3 | Gemini API key passed as a URL query-string parameter | High | L19839 | Spanish §10 #3 — applies | Query-string secrets leak into `Referer`, browser history, third-party `fetch` logging, intermediate-proxy access logs, and the SW cache key (`sw.js:38–51` caches non-same-origin GETs that are `response.ok`). Gemini accepts `x-goog-api-key` as a header — that is the safer path. |
| G-4 | Sync-file import trusts `data.apiKey` and writes it to `localStorage` if no key is already set | Medium | L20803–20806 | (no Spanish parallel — Spanish import path differs) | A user tricked into importing a hostile `*-sync.json` would silently acquire an attacker-chosen key, letting the attacker bill API calls or proxy a key they control. Export does NOT include `apiKey` (verified at L20749–20772), so the leak direction is inbound only. Remove `apiKey` from the import payload; current export already omits it. |
| G-5 | Service worker caches cross-origin API responses opportunistically | Medium | `sw.js:38–51` | Spanish §10 #7 — applies-with-variation | For `api.anthropic.com`, `api.openai.com`, and `generativelanguage.googleapis.com`, the policy runs `caches.put` on every successful call. LLM prompt/response bodies and TTS audio bytes sit in CacheStorage keyed by URL under the app origin — persistent across sessions, visible via DevTools Application tab, not cleared on settings wipe. Skip caching for the three provider hosts; keep TTS blob caching since it is useful offline. |
| G-6 | Service worker precaches five `German-Icon-*.jpeg` files (~3.2 MB total) referenced nowhere in `index.html`, `manifest.json`, or CSS | Medium (perf) | `sw.js:6–14`; assets at repo root | Spanish FE-1 (different framing) | First-visit install downloads ~3.2 MB of dead weight. Manifest references only `icon-192.png` / `icon-512.png`. The repo also carries a second copy of each JPEG under the spaced filename, doubling on-disk storage to ~6.4 MB. Prune both the precache list and the duplicate files. (Combine with G-15 fix.) |
| G-7 | Monolithic single-file bundle, 1.95 MB `index.html` (24,703 lines), with a large inline base64 apple-touch-icon at L14 and an inline DICT spanning thousands of lines | Medium (perf) | `index.html` whole file | Spanish §10 #8 — applies-with-variation (Spanish bundle is ~3.2 MB) | Parse + compile cost on first load is non-trivial on iOS Safari (the target). Low-effort win: move the base64 icon to a file. Higher-effort: extract DICT and grammar-lesson data into fetched JSON the SW can cache separately. |
| G-8 | LLM-generated evaluation and assessment content rendered via `innerHTML`, with `_escapeHtml` applied at the injection sites | Low–Medium | L19898, L19901, L19907, L20018, L24567, L24660 | Spanish §10 #5 / #6 — does-not-apply at the unescaped-injection level (German escapes ex.label, grp, error messages, and feedback text); latent prompt-injection-into-DOM surface still merits the Spanish discipline | German is *safer* than Spanish at the same code locations. Keep the escape in place; do not allow raw markdown-to-HTML conversion on model output without a sanitizer. |
| G-9 | `_escapeHtml` chain uses a DOM temp-node round-trip on hot render paths | Low (perf) | L23840–23844 | (no parallel) | A pure-string escape (`str.replace(/[&<>"']/g, …)`) is ~10× faster and DOM-free. Micro-optimization; surfaced for completeness. |
| G-10 | No per-region `lang="de"` on the German display region | Low | L3946–3990 (mode panels); L19590–19625 (token wrapper construction) | Spanish FE-2 — applies-with-variation | **Reframed 2026-04-19 per Principal B-12 resolution:** `<html lang="en">` is intentional (chrome-led convention, both apps). The issue reduces to: wrap `#german-display` and each `.word-text` with `lang="de"` so AT pronounces German correctly. Per-region overrides remain recommended; the root declaration is settled. |
| G-11 | No Referrer-Policy, no Permissions-Policy, no `<meta name="robots">` | Low | L1–17 | (no parallel) | `<meta name="referrer" content="strict-origin-when-cross-origin">` is a cheap addition that also reduces Gemini-key-in-`Referer` leakage (G-3). |
| G-12 | `console.warn` / `console.error` statements shipped in the production build | Low | 12 sites: L18882, L18892, L18988, L19030, L19719, L20179, L20181, L22280, L24197, L24238, L24271, L24319 | Spanish §10 #21 — applies | Mostly legitimate error logging (API failures, audio-play failures, localStorage quota). Surfaces internal state to end-user devtools; scrub or gate behind a debug flag for a clean production console. |
| G-13 | Doubled-prefix localStorage key migration (`uw_uw_vocabProgress` → `uw_vocabProgress`) still runs on every instantiation | Low | L18981–18988 | Spanish §10 #15 — applies | One-shot migration code that fires unconditionally on every `new App()`. Cheap, but it is the traceable evidence of a prior save-path bug. Remove after a suitable deprecation window. |
| G-14 | `.DS_Store` files tracked in the deploy repo | Low | Repo root, inside `.git/` | Spanish §10 #19 — applies | macOS metadata. Leaks local directory listing and icon cache. Add to `.gitignore` and remove from history when convenient. |
| G-15 | **Precache filename mismatch — P0 candidate.** `sw.js` `PRECACHE_URLS` lists hyphenated `German-Icon-I.jpeg` … `V.jpeg`; tracked-on-`main` filenames per `git ls-files` are space-separated `German Icon I.jpeg` … `V.jpeg`. The hyphenated copies are untracked working-copy duplicates only. If GitHub Pages does not silently alias these, `cache.addAll` rejects atomically on install and the SW v10 never activates for new visitors. | **Closed — confirmed P0 (2026-04-19); fixed `b7e671c`** | `sw.js:6–14`; tracked filenames per `git ls-files` | (no parallel — Spanish does not have this filename divergence) | Live verification required: `curl -I https://<deploy-url>/German-Icon-I.jpeg` should return 200 if Pages aliases, 404 if not. If 404, the v10 commit (`f79e45c`) has been silently breaking new SW installs since merge. Routes to Principal/Auditor as Appendix B #B-3. Confirmed broken 2026-04-19; fixed by hot-fix commit `b7e671c` via URL-encoded spaced precache entries and `werkstatt-v11` cache bump; live HTTP + fresh-install verification in `plans/work-packages/WP-DEP-G-1_verification.log`. |

#### Severity classification key

- **Critical:** advertised functionality is broken or a high-value secret is directly exposed under normal use. (No Critical items in the current table; G-15 escalates to Critical if live verification confirms the 404.)
- **High:** security posture is meaningfully weaker than the declared (or absent) policy implies, or a credible injection path exists through a realistic user action.
- **Medium:** observable quality, performance, or accessibility regression; or structural debt that actively obstructs future work. May also be used for "unverified" items where the severity ceiling is Medium pending test.
- **Low:** housekeeping, drift, or dead code with no immediate user impact.

### 10.2 Per-Spanish-issue applicability table

For each row in Spanish §10.1 (numbered 1–21), the German applicability score and reason. Rows in Spanish §10.2 (Content & Audio Pipeline) and Spanish §10.3 (DevOps) are scored in `plans/PARITY_GAP.md` §11.4 and §11.7 respectively.

| Spanish # | Spanish issue (short) | German score | Reason |
|---|---|---|---|
| 1 | CSP `connect-src` omits `https://api.elevenlabs.io` | `MISSING` (Spanish-feature-not-yet-ported) | German has no ElevenLabs integration and no CSP; this is not a parity bug. When German adds ElevenLabs in a later phase, the ElevenLabs host must land in the same change as a German meta CSP. |
| 2 | `anthropic-dangerous-direct-browser-access: true` | `MATCH` | German uses the same opt-in header at L19782. No-CSP context (G-1) makes the consequence strictly worse than Spanish. Captured as G-2. |
| 3 | Gemini API key in URL query string | `MATCH` | German uses `?key=${this.apiKey}` at L19839. Captured as G-3. |
| 4 | Triple-persisted keys (`localStorage` + `sessionStorage` + IndexedDB mirror), no zeroization | `DIVERGENT` (intentional simplification, pending Senior Dev confirmation) | German uses `localStorage` only — no `sessionStorage` mirror, no IndexedDB mirror. Smaller exposure surface than Spanish; absence of the IDB mirror also means German has no iOS storage-pressure recovery. Whether to inherit the IDB mirror is an architectural decision (see `plans/ARCHITECTURE.md` once issued; Appendix B #B-5), not a parity defect. **Cross-reference:** Frontend §11.2 row 3 scores the IDB mirror itself as `MISSING` — different lens on the same fact. |
| 5 | Templated `innerHTML` interpolates `ex.label`, `grp` without escaping | `DIVERGENT` (German escapes; Spanish does not) | German wraps both fields through `_escapeHtml` at L19295, L19323, L19339. The German implementation is *safer* than Spanish at the same code locations; this divergence should be preserved when integrating Spanish-side fixes. |
| 6 | `tmp.innerHTML = text` strip-HTML idiom | `N/A` | German has no occurrences (zero-match grep on `tmp\.innerHTML` / `temp\.innerHTML` / `stripHtml` / `sanitize`). |
| 7 | SW cache has no size cap; cache-first over a 1.1 GB audio corpus | `PARTIAL` | The cache-strategy bug is the same shape (uncapped `caches.put` in both branches of the SW handler), captured as G-5. The Spanish-specific volume vector (1.1 GB audio corpus) does not apply — German has no `audio/` tree. So the privacy/sensitive-body vector applies; the storage-quota vector does not. |
| 8 | Monolithic 3.2 MB inline bundle | `MATCH` (German is ~1.95 MB but structurally identical) | Captured as G-7. |
| 9 | Viewport disables pinch-zoom (`user-scalable=no, maximum-scale=1.0`) | `N/A` | German viewport at L5 is `width=device-width, initial-scale=1.0, viewport-fit=cover` — pinch-zoom is permitted. German *exceeds* Spanish on this WCAG criterion. |
| 10 | CSP permits `script-src 'unsafe-inline'`, defeating XSS mitigation | `MISSING` (German has no CSP at all, so the constraint is vacuously absent) | Rescored under "no CSP at all" semantics — the multiplier on injection bugs (G-2, G-3, G-4) is unbounded. When German adds a CSP per G-1, `script-src 'unsafe-inline'` will be required by the current monolithic-bundle architecture; nonce/hash + extracted scripts is the path to drop it. |
| 11 | `audio/orphaned-cob/` superseded audio | `N/A` | German has no `audio/` tree. |
| 12 | Doubled-prefix audio filenames in `audio/translation/` | `N/A` | German has no `audio/` tree. |
| 13 | Minke / Cob Building text integration wiring | `N/A` | German has no Minke equivalent and no audio pipeline. |
| 14 | Passage-count drift between `TEXTS` and audio manifest | `N/A` | German has no audio manifest. |
| 15 | Doubled-prefix localStorage migration still firing | `MATCH` | German replicates the same pattern at L18981–18988 (`uw_uw_vocabProgress → uw_vocabProgress`). Captured as G-13. |
| 16 | Six PWA manifests on disk; root `manifest.json` unreachable at runtime | `N/A` | German has a single `manifest.json`. No alternate-icon manifests, no inline icon-picker rewriter. |
| 17 | Theme-color drift between meta tag, root manifest, and icon-variant manifests | `N/A` | Single manifest — no drift surface. German `<meta name="theme-color" content="#faf8f5">` (L11) matches `manifest.json:7` (`#faf8f5`). |
| 18 | Broken Open Graph / Twitter image reference | `N/A` | German `<head>` declares no `og:*` / `twitter:*` tags (verified by grep). |
| 19 | `.DS_Store` files tracked in the deploy repo | `MATCH` | Captured as G-14. |
| 20 | Nested duplicate directory `gh-pages-deploy/gh-pages-deploy/` | `N/A` | German repo has no nested duplicate. |
| 21 | `console.warn` / `console.error` shipped in production | `MATCH` | Captured as G-12. |

### 10.3 German-only items

Items in G-1 through G-15 above without a Spanish parallel: G-1 (no CSP at all), G-4 (sync-import key injection — Spanish import path differs), G-6 (dead precache JPEGs — same family as Spanish FE-1 but framed differently), G-9 (`_escapeHtml` perf nit), G-11 (no Referrer-Policy / Permissions-Policy / robots), G-15 (P0-candidate filename mismatch).

These are German-specific in the sense that they need German-side remediation. **G-1 and G-15 are the load-bearing ones** — G-1 makes G-2/G-3/G-4 worse and gates the Spanish-§10.10 `script-src 'unsafe-inline'` story; G-15 may already be silently breaking SW installs in production.

---

## Appendix A — Frontend follow-up work packages

*Drafted by Team Manager — Frontend/PWA. Stubs for routing by Senior Dev / Teams Coordinator. Each scoped to Frontend/PWA unless noted.*

### FE-G-1: Establish a meta Content-Security-Policy

**Problem.** `index.html` has no `Content-Security-Policy` meta. All provider-host allow-listing is implicit. This is an architectural gap, not a parity delta.
**Options.** (a) Ship a CSP identical in posture to Spanish's (with `connect-src` covering the three German LLM providers + `'self'` for the audio/manifest path once a German audio tree exists). (b) Start with a `Content-Security-Policy-Report-Only` header for a reporting period before enforcing. (c) Wait until Phase-2 audio integration.
**Recommendation.** (a), scoped narrowly. Defer ElevenLabs and same-origin `audio/*` entries to the phase that actually introduces them.
**Owner.** Frontend/PWA + Security/Performance Auditor (audit); Senior Dev (architectural sign-off).
**Priority.** High.

### FE-G-2: Persist inline-gloss suppression across sessions

**Problem.** German re-renders the gloss-seen map on every `render()` call. A user re-reading a passage after a reload sees the gloss inline every time.
**Options.** (a) Introduce `uw_glossSeen.v1` with the same shape as Spanish; serialize on mutation; deserialize in constructor; expose a Reset in Settings. (b) Scope by `(textId, word)` to avoid cross-text bleed. (c) Skip persistence and document the ephemeral behavior as intentional simplification.
**Recommendation.** (a) with (b) as a compatible improvement.
**Owner.** Frontend/PWA. **Priority.** Medium.

### FE-G-3: IndexedDB mirror of `localStorage`

**Problem.** iOS standalone-PWA `localStorage` is evicted under storage pressure. Spanish mitigates with a `TallerIDB` mirror. German has no mirror.
**Options.** (a) Port Spanish's `TallerIDB` as `WerkstattIDB` (db `uw-backup`, store `progress`, keyed by full `uw_*` prefix). (b) Add a `_restoreFromIDB()` boot pass. (c) Couple (a) + (b) with a schema-declared restore list.
**Recommendation.** (c). For Phase 1 land (a) + (b) with a hand-maintained list and note the schema-derivation as a follow-up.
**Owner.** Frontend/PWA (impl); Senior Dev (schema). **Priority.** High (data-loss risk on iOS).

### FE-G-4: Modal accessibility — dialog role, focus trap, Escape handler

**Problem.** Four modals render without `role="dialog"`, `aria-modal`, or `aria-labelledby`. No Escape-closes-modal global handler, no Tab focus-trap, no focus-return on close.
**Recommendation.** Ship `role="dialog" aria-modal="true" aria-labelledby="<h2-id>"` on each modal, plus Spanish's `init()`-level keydown handler, plus the `_<name>FocusOrigin` pattern. Partial landings create accessibility cliff-edges.
**Owner.** Frontend/PWA; reviewed by QA Lead. **Priority.** High (WCAG 2.1 AA).

### FE-G-5: Semantic landmarks and `lang` attributes

**Problem.** No `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, or `<section>` in the deployed DOM. No per-region `lang="de"` overrides.
**Decision (Principal, 2026-04-19, resolving B-12):** Keep `<html lang="en">` (intentional, chrome-led convention shared with Spanish). Add semantic landmarks. Add per-region `lang="de"` overrides on German-text containers.
**Recommendation.** Promote `#sidebar` → `<nav id="sidebar">`, `#main` → `<main id="main">`. Add `lang="de"` to `#german-display` and to each `.word-text` token wrapper construction.
**Owner.** Frontend/PWA. **Priority.** Medium.

### FE-G-6: Export/import envelope parity with Spanish v2

**Problem.** German envelope omits `translationHistory`, `fsrsState`, `activeTime`, `statsAssessment`. Import accepts `apiKey` but export never writes one — a latent injection vector on a hand-crafted sync file.
**Recommendation.** Bump `_version` to `2`; enlarge envelope to parity with Spanish; refuse `apiKey` on import. Include `_version` warning path.
**Owner.** Frontend/PWA; security review by Auditor. **Priority.** High (security + data-fidelity).

### FE-G-7: Single responsive breakpoint

**Problem.** CSS has four overlapping breakpoints (`768`, `767`, `600`, `380`). Spanish ships a single `max-width: 767` and an extra-small `max-width: 375`.
**Recommendation.** Audit each existing rule for intent first, then consolidate.
**Owner.** Frontend/PWA. **Priority.** Low.

### FE-G-8: Pre-paint icon application

**Problem.** Selected icon does not apply until `App.constructor` runs. Cold-load icon-1 flashes before user selection takes effect.
**Recommendation.** Add a head-inline `<script>` (~10 lines) reading `localStorage.getItem("uw_appIcon")` and rewriting the two `<link>` `href`s before first paint.
**Owner.** Frontend/PWA. **Priority.** Low.

### FE-G-9: Per-icon-theme PWA manifest parity

**Problem.** German ships one `manifest.json`; Spanish has five alternate manifests keyed to each icon set.
**Decision (Principal, 2026-04-19, resolving B-13):** Replicate Spanish's per-icon-theme manifest system in German. Icons land in repo as images. Five `manifest-1.json` … `manifest-5.json` shipped; `_applyAppIcon` promoted to also rewrite `<link rel="manifest">` href; PNG icon set regenerated in five variants.
**Owner.** Frontend/PWA. **Priority.** Promoted from Low to Medium per B-13. Tracked as `IMPLEMENTATION_PLAN.md` WP-FE-G-15 (Phase 2 Wave A).

### FE-G-10: Modal reset-confirm overlay (replace native `confirm()`)

**Problem.** `resetProgress()` uses native `confirm()`. Inconsistent with the rest of the UI; cannot be themed.
**Recommendation.** Port Spanish's `#reset-confirm-overlay` DOM + event plumbing; couple with FE-G-4.
**Owner.** Frontend/PWA. **Priority.** Low.

### FE-G-11: Author-tab ↔ welcome-copy mismatch

**Problem.** Welcome copy at L3940 references *Philosophische Untersuchungen* but the author tab strip ships only TLP / Freud / Nietzsche.
**Recommendation.** Route to TM-Content to decide whether to add the PU tab or trim the copy.
**Owner.** TM-Content (decision); Frontend/PWA (impl). **Priority.** Low.

### FE-G-12: SW update banner localization convention

**Problem.** Update banner copy is hard-coded German ("Neue Version verfügbar" / "Aktualisieren") on an English-chrome app.
**Decision (Principal, 2026-04-19, by implication of B-12):** UI chrome is English (confirmed). Banner must match chrome language: translate the two strings at `index.html` L24674–24675 to English.
**Owner.** Frontend/PWA. **Priority.** Low. Folded into WP-FE-G-11 as a coordinated chrome-localization pass.

### FE-G-13: Icon-picker offline readiness

**Problem.** The five icon options render from inline base64 (offline-fine), but the `German-Icon-*.jpeg` files on disk (precached in `sw.js`) are not referenced in the DOM. They add ~3.3 MB to every cold SW install. (See also G-15 hazard.)
**Recommendation.** Remove the `.jpeg` precache list from `sw.js`; reclaim install cost. Coupled with G-15 fix.
**Owner.** Frontend/PWA + DevOps. **Priority.** Low (perf), bundled with G-15 (P0 candidate).

---

## Appendix B — Open Questions for Principal

*Integrated by Senior Dev Oversight from TM-Content, DevOps, and Auditor returns. Each item routes to Principal via Dispatch.*

### Resolved questions (2026-04-19)

- **B-12 — `<html lang>` decision. RESOLVED.** Principal: `<html lang="en">` is intentional for both apps (chrome-led convention). Per-region `lang="de"` overrides on German-text containers remain recommended (FE-G-5). SW update banner copy (FE-G-12) translates to English to match chrome.
- **B-13 — Per-icon-theme PWA manifest scope. RESOLVED.** Principal: replicate Spanish's per-icon-theme manifest system in German. Icons land in repo as images. Tracked as `IMPLEMENTATION_PLAN.md` WP-FE-G-15 (promoted from Phase 4 Low to Phase 2 Wave A Medium).

### B-1. GitHub Pages source confirmation

Confirm that GitHub Settings → Pages serves from `main` branch, root directory (`/`), with no alternate source and no `/docs`. Observable only via the GitHub web UI or the GitHub API; outside the read scope of the mounted working copy. (DevOps Open Question #1.)

### B-2. Published URL and custom-domain decision

Confirm the served URL. Default appears to be `https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/`; if a custom domain is intended, a `CNAME` file is needed at repo root. (DevOps Open Question #2.)

### B-3. Precache filename hazard — live verification (P0 candidate)

`sw.js` precache lists hyphenated `German-Icon-I.jpeg`; tracked filenames are space-separated `German Icon I.jpeg`. If GitHub Pages does not silently alias these, `cache.addAll` is failing atomically and the v10 SW has not been installing for any new visitor since merge of `f79e45c`. Needs a live `curl -I` against the deployed site against both filename forms. **If the 404 is confirmed, this is P0 and forces a hot-fix deploy before any other parity work.** (DevOps Open Question #3, escalated by Senior Dev to P0 on §10 G-15.)

### B-4. Install-time `skipWaiting` policy

**RESOLVED 2026-04-19** — design closed by WP-ARCH-G-3 selecting Option A. Install-time skipWaiting was reactive to the v9→v10 deploy detection problem; the proper fix is the WP-DEP-G-2 hardening (now folded in via this WP), and the install-time skipWaiting is removed accordingly. ARCHITECTURE.md §1.6 aligned with Spanish §1.6.

### B-5. IDB mirror inheritance

Should the German app inherit Spanish's IDB mirror for iOS storage-pressure recovery (FE-G-3 implements it), or is the German posture of "localStorage only, accept iOS eviction risk" intentional? If the former, §10 row #4 applicability flips from `DIVERGENT` to `MISSING`. (Senior Dev / Auditor flag.)

### B-6. Translator provenance for the three German texts

Which English translations are being shown as `reference`? Ogden, Pears-McGuinness, or Anscombe for *Tractatus*? McLintock (Penguin) or Strachey for *Das Unheimliche*? Kaufmann-Hollingdale, Diethe, or Clark-Swensen for the *Genealogy of Morals* Vorrede? Needed for attribution and any future `english_source` field. (TM-Content Open Question #1.)

### B-7. Wittgenstein *Tractatus* parity-target scope

German has 526 of the ~527 Tractatus propositions; Spanish's Borges corpus is 674 paragraph-units across multiple stories. Is full Tractatus the intended match for the Borges role, or is a different scope target preferred? (TM-Content Open Question #2.)

### B-8. Nietzsche scope

Is partial Nietzsche (Vorrede only, 52 exercises) the intended terminal scope, or should the later essays of the *Genealogie* be added? If expanded, target exercise count? (TM-Content Open Question #3.)

### B-9. Audio pipeline scope and sanitize convention

Should the German pipeline (when built) mirror Spanish's three-bucket layout (grammar / vocab / translation) with the same `sanitize()` rule (preserves `ä/ö/ü`), or should the German scheme diverge (e.g., transliterate `ae/oe/ue/ss`)? The Latin-accent regex `\u00c0-\u024f` preserves `ä/ö/ü` verbatim but does **not** cover `ß` — needs explicit decision. (TM-Content Open Question #4.)

### B-10. Vocabulary `state` field

Spanish vocabulary rows carry `state: "adjusted"` universally; German rows have no `state`. Should the field be added to all German rows (and passage exercises as `english_source`) for audit-trail parity, or is the marking intentionally being dropped? (TM-Content Open Question #5.)

### B-11. Open Graph / share-card target URL

Spanish's OG URLs hard-code the served URL for share cards. German `<head>` declares no `og:*` / `twitter:*` tags. Add OG tags pointed at the confirmed URL from B-2, or leave them omitted? (DevOps cross-cut on B-2.)

---

## Appendix C — Recommended follow-up audits (Security & Performance)

*Drafted by Security & Performance Auditor. Listed for Dispatch to convert into work packages against the next-phase implementation plan after `SPEC.md` and `PARITY_GAP.md` integrate.*

### Per-Spanish-Appendix-C applicability

| Spanish # | Spanish audit (short) | German applicability | Notes |
|---|---|---|---|
| 1 | ElevenLabs-CSP on-device reconciliation | `N/A today; MISSING (Spanish-feature-not-yet-ported) when ElevenLabs lands` | German has no ElevenLabs and no CSP. The audit becomes meaningful only once both exist. |
| 2 | CSP tightening (extract inline scripts, nonce/hash, drop `'unsafe-inline'`, Report-Only companion) | `MISSING (preceded by C-G1)` | Cannot be tightened until a CSP exists. Remediation order: G-1 first, then C-2. |
| 3 | Secrets-in-storage deep dive (per-key inventory, sensitivity, rotation, zeroization) | `MATCH (smaller-scope variant)` | German inventory is `uw_apiKey` and `uw_ttsApiKey` only — no `sessionStorage`/IDB mirror. Same audit shape, smaller scope. Includes the architectural decision: browser-held LLM keys vs. light token-exchange proxy. (Open Question candidate.) |
| 4 | Prompt-injection audit on LLM round-trip output | `MATCH` | German injects LLM output via `innerHTML` with `_escapeHtml` applied at every site traced (G-8 reconciliation). A line-by-line re-verification is still warranted — particularly on assessment / hint paths (L19887, L19907, L20018, L24567, L24660). |
| 5 | PWA update semantics under split-stale states | `PARTIAL (audio-manifest variant N/A)` | The Spanish concern about a stale `index.html` cached against a fresh `audio/manifest.json` is `N/A` — German has no audio manifest. The general concern (SW `SKIP_WAITING` flow + iOS Safari update-detection edge cases) does apply. |
| 6 | Cold-start performance on mid-range Android | `MATCH (German-bundle variant)` | German bundle is ~1.95 MB vs. Spanish's ~3.2 MB. Same audit (TTI on 4G, 3–4-year-old device); Auditor proposes adding iOS Safari to the test matrix alongside Android. |
| 7 | Accessibility full audit (Axe + Lighthouse, focus order, screen-reader walk, contrast across the POS palette) | `MATCH` | Same scope. Confirm `lang="de"` lands per G-10 before the screen-reader walk. |
| 8 | Content integrity audit (per-exercise cross-join of `TEXTS` × audio manifest) | `N/A today; deferred until German audio pipeline lands` | No audio pipeline to cross-join against. TM-Content owns the equivalent corpus-completeness audit. |

### German-only follow-up audits (new)

| # | Audit | Why German-specific | Estimated scope |
|---|---|---|---|
| C-G1 | **Establish a meta CSP from zero.** Author the first German `<meta http-equiv="Content-Security-Policy">` against the live call inventory in §7.3.1. Validate that meta-CSP fires in iOS Safari and desktop Chrome/Safari/Firefox before merge. Publish under `Content-Security-Policy-Report-Only` for one deploy cycle, then promote. | Spanish has a CSP to tighten; German has nothing to tighten. Different starting point. | Single deploy cycle + on-device verification. |
| C-G2 | **Sync-import payload audit.** Trace every field the import path consumes (`importProgress` at L20774–20861, `doImport` at L20873–20913) and decide trust. At minimum: drop `data.apiKey` from import (G-4); decide whether merged `data.vocabulary` should be allowed to overwrite first-party `DICT` entries (currently it does at L20891); add per-import warning UI for unrecognized fields. | Spanish import path is structurally different. | Half-day source review + a one-line UI addition. |
| C-G3 | **SW cache exemption for provider hosts.** Implement the exemption noted in G-5: `caches.put` should be skipped for `api.anthropic.com`, `api.openai.com/v1/chat/completions`, and `generativelanguage.googleapis.com`. TTS blob caching for `api.openai.com/v1/audio/speech` should be retained. Validate by inspecting CacheStorage in DevTools after a chat round-trip. | Spanish §10 #7 has the same shape but the audit's risk model is dominated by the Spanish audio corpus; in German the risk model is dominated by sensitive LLM bodies. | Source change + DevTools verification on iOS Safari and desktop. |
| C-G4 | **Precache pruning + duplicate-asset cleanup + filename reconciliation (G-15).** Confirm and remove duplicate icon JPEGs; reconcile precache filenames to tracked filenames (or vice versa) before live-fetch verification. **Couples with B-3 / G-15 P0 candidate.** | German-specific (G-15 has no Spanish parallel; G-6 has a different framing than Spanish FE-1). | One-off cleanup PR; sequence with the live verification. |
| C-G5 | **Provider-key transport hardening.** Switch Gemini auth from `?key=` query string to `x-goog-api-key` header (G-3); decide whether to keep Anthropic on `dangerous-direct-browser-access: true` or front it with a token-exchange proxy. | Same as Spanish but the absent CSP context (G-1) makes the Anthropic-key risk strictly worse in German until G-1 lands. | Half-day source change + on-device call verification. |

---

## Verification notes

- Every line reference in this document is anchored against `gh-pages-deploy/index.html` at HEAD `f79e45c` (2026-04-19), or against the German `sw.js` / `manifest.json` at the same HEAD. Spanish line references (when present, in `[SP]` form) are copied from `plans/spanish-spec-reference.md` and not re-verified.
- `[UNVERIFIED]` markers cluster on: LLM-provider header defaults (Anthropic, OpenAI defaults), per-selector 44×44 touch-target enumeration, FSRS weights-vector semantics (German is 19-element; Spanish 17), `evaluateHeuristic` exact algorithm, GitHub Pages source-of-truth + custom-domain confirmation (Appendix B #B-1, #B-2), the precache filename hazard (Appendix B #B-3 / §10 G-15), and translator provenance for the three German texts (Appendix B #B-6).
- Direct grep verifications performed during integration: `_convGetCheapestModel` (L23864), `_convGetHint` (L24245), `_convEndConversation` (L24278) all present — Frontend's `[UNVERIFIED]` markers on these were resolved to `MATCH`. Absences confirmed: `_renderGlossedPassage`, `_thematicSession*`, `_injectReviewBanner`, `_vocabTierFailures`, `_checkExportReminder` (zero hits); `sessionStorage`, `indexedDB`, `IndexedDB`, `IDB`, `idb\.`, `TallerIDB`, `WerkstattIDB`, `UwIDB` (zero hits); `elevenlabs` (zero hits); `Content-Security-Policy`, `http-equiv`, `connect-src`, `default-src`, `script-src` (zero hits outside base64 image payloads at L4035, L4040, L20646).
- The §10 G-15 / B-3 P0 candidate was raised by DevOps as A9 / Open Question #3 and escalated by Senior Dev to a top-of-list issue based on `git ls-files` confirming the tracked filenames are space-separated while the precache list is hyphenated. Live verification has not been performed in this pass; the severity claim is conditional on that verification.
- The §10 #4 / FE-G-3 / B-5 cross-reference deserves attention: §11.2 row 3 (Frontend) scores the IDB mirror itself as `MISSING` (factual capability absence); §10 row 4 (Auditor) scores Spanish's "triple-persisted-keys" security-debt applicability as `DIVERGENT` (German made a different storage trade-off, has smaller exposure, but also has no iOS recovery). Both readings stand; the resolution is a Principal-level architectural decision routed via B-5.
- The §10 #5 reconciliation (Spanish's unescaped `innerHTML` interpolation of `ex.label`/`grp` does not apply because German escapes those fields) was confirmed line-by-line at L19295, L19323, L19339. The German implementation is *safer* than Spanish at the same code locations and that divergence should be preserved when integrating Spanish-side fixes.
- TM-Content's `[UNVERIFIED]` on translator provenance is preserved verbatim; the question is routed to Principal via Appendix B #B-6.
- DevOps's local `git fsck` corruption notice (§8.2) is informational only — the corruption is in unreachable regions of the local object store and does not affect the deploy surface; origin carries the full history.
- Per Dispatch direction (2026-04-19), copyright is OUT OF SCOPE for both apps — no row in §10 or Appendix C touches literary content or embedded translations.

---

**End of specification.**
