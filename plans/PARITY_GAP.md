# Parity Gap — Übersetzungswerkstatt vs. Taller de Traducción

**Author:** Senior Dev Oversight Engineer (Übersetzungswerkstatt), integrating returns from TM-Frontend, TM-Content & Audio Pipeline, DevOps / Deploy Manager, and Security & Performance Auditor (all 2026-04-19).
**Date:** 2026-04-19.
**Companion documents:** `SPEC.md` (German current state, descriptive), `plans/spanish-spec-reference.md` (Spanish baseline, 2026-04-19), `plans/spanish-architecture-reference.md`, `plans/parity-scope-plan.md` (routing).
**Structural backbone:** Spanish SPEC §11 reproduced verbatim as the row set; each row scored against German current state with evidence anchored to `gh-pages-deploy/index.html` (24,703 lines) at HEAD `f79e45c`.
**Scoring legend:** `MATCH` (German does this the way Spanish does) / `MISSING` (Spanish has it, German does not) / `PARTIAL` (German has part but not all) / `DIVERGENT` (German intentionally does it differently — requires "intentional because…" justification) / `N/A` (row does not apply to German).
**Status of this document:** **DRAFT — pending QA Lead scoring verification.** Disputes raised by QA Lead block promotion to authoritative.

---

## Score summary

Counts across all §11 sections. Detailed per-row evidence in the §§11.1–11.9 tables below.

| Section | MATCH | PARTIAL | MISSING | DIVERGENT | N/A | Total |
|---|---:|---:|---:|---:|---:|---:|
| §11.1 Architecture | 5 | 3 | 2 | 0 | 0 | 10 |
| §11.2 Data Model | 1 | 3 | 5 | 1 | 0 | 10 |
| §11.3 Features | 4 | 7 | 2 | 1 | 0 | 14 |
| §11.4 Content | 3 | 6 | 8 | 4 | 1 | 22 |
| §11.5 UI/UX | 1 | 4 | 1 | 0 | 0 | 6 |
| §11.6 Dependencies | 1 | 1 | 1 | 0 | 0 | 3 |
| §11.7 Deployment | 4 | 0 | 3 | 0 | 0 | 7 |
| §11.8 Configuration | 0 | 1 | 2 | 0 | 0 | 3 |
| **Totals** | **19** | **25** | **24** | **6** | **1** | **75** |

**Headline read.** German is at full parity on ~25% of scored rows, partially aligned on ~33%, missing capabilities on ~32%, and intentionally divergent on ~8%. The largest single concentration of `MISSING` is §11.4 Content (the entire pre-generated audio pipeline accounts for 8 of 24 MISSINGs across all sections).

---

## §11.1 Platform and architecture (against Spanish §2)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | Single-file client-only PWA, no build step, no framework | **MATCH** | `index.html` 24,703 lines hand-authored; no `package.json` / bundler / lockfile in tree (DevOps §7.2). |
| 2 | Hand-authored `index.html` as the canonical source + deploy artifact | **MATCH** | Same tree is both source and deploy artifact (DevOps §8.1; single-branch). |
| 3 | Service worker at the repo root (`sw.js`) with precache + runtime caching | **MATCH** | `sw.js:4` `CACHE_NAME='werkstatt-v10'`; precache list at `sw.js:6–14`; fetch handler `sw.js:34+`. **Note:** §11.7 row 5 captures iOS-update-detection hardening separately; §11.4 row 9 captures the precache-filename hazard (G-15 / B-3). |
| 4 | Alternate PWA manifests for runtime-swappable app icons (N icon sets) | **MISSING (port to German)** | Single `manifest.json` at repo root. No `manifest-N.json`. German currently uses inline base64 data URIs to swap favicon/apple-touch-icon at L20650; no manifest swap. **Principal confirmed 2026-04-19 (Appendix B #B-13 resolution): replicate Spanish's per-icon-theme manifest system in German; icons land in repo as images.** See `IMPLEMENTATION_PLAN.md` WP-FE-G-15 (promoted to Phase 2 Wave A). |
| 5 | Root-level inline head script reading `<app>_appIcon` localStorage to rewrite favicon/touch-icon/manifest href pre-paint | **MISSING** | No head `<script>` before `</head>` at L3889. `_applyAppIcon` runs only from `App.constructor` at L18939. **Scope expands post-B-13:** the head script must also rewrite `<link rel="manifest">` href across the five per-icon manifests. See `IMPLEMENTATION_PLAN.md` WP-FE-G-6. |
| 6 | `class App` singleton instantiated on `DOMContentLoaded`, assigned to `window.app` | **MATCH** | L24670 `window.app = new App()` inside `DOMContentLoaded` listener. |
| 7 | Support singletons: `FSRS`, `ReviewScheduler`, `AudioCache`, `IDB mirror` | **PARTIAL** | `FSRS` present (L18651 IIFE). `ReviewScheduler` **absent** — German calls `FSRS.review(key, rating)` directly. `AudioCache` **absent** (no `audio/`). IDB mirror **absent** (§4.1 #3). |
| 8 | Mode switching via `display:none` toggle on four content panels, no router, no virtual DOM | **MATCH** | `switchMode` at L20916 toggles `.style.display` on the four `#*-content` panels. No router, no `history` API use, no `startViewTransition`. |
| 9 | LLM provider abstraction (`llmComplete` dispatching to Anthropic / OpenAI / Gemini) | **MATCH** | Three call sites at L19775 (Anthropic), L19807 (OpenAI), L19839 (Gemini); dispatch keyed on `this.apiProvider`. |
| 10 | TTS abstraction across neural (OpenAI, ElevenLabs) and `speechSynthesis` | **PARTIAL** | OpenAI neural TTS at L20054 / L20148 + browser `speechSynthesis` at L20200 (entry `_speakGerman` L20187). Two tiers; ElevenLabs and pre-generated MP3 tier both absent. |

---

## §11.2 Data Model (against Spanish §4)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | Primary persistence in `localStorage` with a consistent namespace prefix (`uw_` analogue of `taller_`) | **MATCH** | `App.save/load` at L19027/L19042 prefixes `uw_`. |
| 2 | `sessionStorage` carry-through for API-key fields | **MISSING** | No `sessionStorage.*` call sites in `index.html` (zero-hit grep). |
| 3 | IndexedDB mirror (one database, one object store, same key namespace) for iOS storage-pressure recovery | **MISSING** | No `indexedDB.*` call sites (zero-hit grep). See FE-G-3. **Cross-reference:** SPEC §10 row 4 scores this as `DIVERGENT` from a security-debt-applicability lens; the capability itself is `MISSING`. Resolution routed to Principal via Appendix B #B-5. |
| 4 | `_restoreFromIDB()`-equivalent boot rehydration | **MISSING** | Method does not exist (zero-hit grep on `_restoreFromIDB`). |
| 5 | Export to JSON with versioned envelope `{ _format, _version, exportedAt, … }` | **PARTIAL** | Envelope present at L20750–20759 (`_format: "uebersetzungswerkstatt-sync"`, `_version: 1`, `exportedAt`). Four Spanish v2 fields missing: `translationHistory`, `fsrsState`, `activeTime`, `statsAssessment` (plus `vocabMastery` is `N/A` per shape divergence, `glossSeen` is `N/A` until FE-G-2). See FE-G-6. |
| 6 | Import with per-section merge rules (union, dedupe, per-key precedence) | **PARTIAL** | `importProgress` (L20774) does union merge on five keys. Dedupe-by-composite-key (Spanish's `translationHistory` pattern) and recency-based merge (Spanish's `fsrsState` pattern) are absent — symmetric to row 5. |
| 7 | Custom text import merging into the in-memory dictionary | **MATCH** | `doImport` at L20873 merges `vocabulary` into `DICT` at L20890–20893 (same plain-overwrite semantics as Spanish). |
| 8 | Reset flow that preserves API keys and preferences | **PARTIAL** | `resetProgress` (L20724) preserves API keys and preferences, but uses native `confirm()` not a styled modal. Also does not clear FSRS state (Spanish `_doReset` nulls `fsrsState`). See FE-G-10. |
| 9 | FSRS card shape: `{ difficulty, stability, lastReview, reps, lapses, scheduledDays, state }` | **DIVERGENT** *Intentional because:* German FSRS IIFE at L18651 uses a 19-element weights vector (Spanish 17). Field set itself appears identical at `_newCard` (L18674) but algorithm-version semantics `[UNVERIFIED]`. Senior Dev owns algo parity; recommend treating as DIVERGENT pending an explicit FSRS-version reconciliation pass. |
| 10 | `audio/manifest.json` shape: flat `{ path: true }` index | **MISSING** | No `audio/` tree at all (Content §4.2.2). See §11.4 for full audio-pipeline scoring. |

---

## §11.3 Features (against Spanish §3)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | Four-mode switcher: Translation / Vocabulary / Grammar / Conversation | **MATCH** | `.mode-btn` × 4 at L3896–3899; `switchMode` dispatcher L20916. |
| 2 | Dual rendering (desktop sidebar + mobile bottom bar) | **MISSING** | Only the sidebar rendering exists. No `#mobile-tab-bar` DOM (zero-hit grep). |
| 3 | Sidebar footer: Sync / Import / Settings / Statistics | **MATCH** | L3917–3920 — content matches; order in German is Sync / Import / Statistics / Settings (Spanish: Sync / Import / Settings / Statistics). Order divergence is cosmetic; row scores MATCH. |
| 4 | SW update banner with explicit `SKIP_WAITING` handshake | **MATCH** | `#update-banner` at L24673–24676; registration IIFE at L24678–24702 wires `updatefound` → banner → `SKIP_WAITING` → `controllerchange` → reload. Banner copy is German ("Neue Version verfügbar"/"Aktualisieren") — see FE-G-12 for the localization decision. |
| 5 | Export reminder banner (7-day / ≥5-completion threshold) | **MISSING** | No `_checkExportReminder`, no `lastExportDate`, no banner DOM (zero-hit grep). |
| 6 | Translation mode surface: tokenized display, POS tooltips + coloring, inline glossing with `glossSeen` suppression, TTS fallback chain, LLM-or-heuristic Evaluate, LLM Hint, Show Reference, Next | **PARTIAL** | Tokenized display + POS tooltips + POS coloring: MATCH (L19605–19624, L3946–3960, `togglePOS` L19656). Inline glossing suppression: function-scoped `seen` (L19558, L19614–19620), not persisted; SPEC §11.4 row 5 captures the persistence delta. TTS fallback chain: PARTIAL (two tiers, missing pre-gen and ElevenLabs). Evaluate / Hint / Show Reference / Next: MATCH (`#action-row` L3967–3972). Evaluate heuristic at `evaluateHeuristic` L19964. |
| 7 | Vocabulary mode: batch picker, three-tier exercise (Flashcard / MC / Typed), FSRS-driven tiering with session demotions, examples-on-demand via LLM, review mode | **PARTIAL** | Batch picker (`buildVocabBatches` L20980) + three exercise types + examples (L20030) + review (`startVocabReview` L21520): MATCH at the surface. **Session demotions absent**: no `_vocabTierFailures` (zero-hit grep). Tier is selected by the user via dropdown (L20948), not by FSRS card state. |
| 8 | Grammar mode: welcome + path roadmap, unit overview, lesson view with paradigm table, three exercise phases (Repetition / Cloze / Production), inline glossed thematic passages, due-review banner, review session | **PARTIAL** | Unit tree + lesson + exercise: MATCH (`renderGrammarSidebar_new` L22509, `renderGrammarLesson` L22716, `renderGrammarExercise` L22867). Inline glossed thematic passages: **MISSING** (zero-hit grep on `_renderGlossedPassage` / `glossedPassage` / `thematicPassage`). Due-review banner: **MISSING** (zero-hit grep on `_injectReviewBanner`). Review session is a stub: `startGrammarReview()` at L21543 displays an alert with overdue count; comment at L21548 reads `"full review queue will be built by UX Implementer (Feature 3/4)"`. |
| 9 | Conversation mode: scenario picker, streaming-free chat view, Hint, End-conversation summary, cheapest-model routing | **MATCH** | Scenarios `_getConversationScenarios()` L23878 (21 scenarios across A2/B1/B2/C1); `renderConversationChat` L24106; Hint `_convGetHint()` L24245 (bound L24167); End `_convEndConversation()` L24278 (bound L24168); cheapest-model `_convGetCheapestModel()` L23864 (consumed L23874, L24124). [Integrator note: TM-Frontend marked as `[UNVERIFIED]`; Senior Dev direct grep resolved to MATCH with anchors above.] |
| 10 | Settings modal: provider + key (LLM), provider + key + voice (TTS), browser voice pickers, app icon picker, reset glossing, reset progress | **PARTIAL** | LLM provider+key: MATCH. TTS: PARTIAL (OpenAI key field at L4009 only; no provider selector, no ElevenLabs voice ID). Voice pickers: MATCH (L4011–4024). Icon picker: MATCH (5 options, different storage mechanism — see §11.5 row 9). Reset glossing: N/A (no persisted gloss state). Reset progress: PARTIAL (functional but native `confirm()` rather than styled overlay; FSRS state not cleared). [Integrator note: Frontend's "TTS DIVERGENT" and "Reset progress DIVERGENT" rescored to PARTIAL — DIVERGENT requires "intentional because…" justification per `parity-scope-plan.md §3 ¶3`; provider absence and reset-flow simplification are not stated as intentional.] |
| 11 | Sync modal: export + import JSON | **MATCH** | L4162–4190; see SPEC §4.3. |
| 12 | Import Text modal with inline schema hint | **MATCH** | L4066–4094 with pre-formatted schema at L4071–4086. |
| 13 | Statistics modal: Active Time, Performance Metrics, LLM Proficiency Assessment, CEFR badge | **MATCH** | L4096–4160: CEFR badge L4100; four sections Active Time / Performance Overview / LLM Assessment with subgrid; cached output `uw_llmAssessment`. |
| 14 | Reset confirmation overlay and per-mode due-review entries | **MISSING** | No `#reset-confirm-overlay` DOM (`resetProgress` uses native `confirm()` at L20725); no per-mode review banner (zero-hit grep on `_injectReviewBanner`). See FE-G-4 and FE-G-10. |

---

## §11.4 Content (against Spanish §5)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | Embedded passage corpus with per-exercise shape `{ id, label, spanish\|german, reference, english_source }` | **PARTIAL** | `TEXTS` at L9655; exercise shape `{id, label, german, reference}` for tractatus/unheimliche; `+source` for nietzsche. Missing universal `english_source: "adjusted_reviewed"` marker; `source` is a German-only additive field on nietzsche rows. |
| 2 | Passage count comparable to Spanish 935 (Borges 674 + Neruda 200 + Minke 61) | **PARTIAL** | 733 German passages: Tractatus 526 + Das Unheimliche 155 + Genealogie Vorrede 52. Quantitatively 78% of Spanish; qualitatively three authors (Wittgenstein / Freud / Nietzsche) rather than three (Borges / Neruda / Minke). Nietzsche is partial (Vorrede only). |
| 3 | Lemma dictionary with `{ pos, gloss, lemma? }` shape | **DIVERGENT** *Intentional because:* German nouns require grammatical gender. `DICT` at L4196 uses `{pos, gloss, lemma?, gender?}` — superset of Spanish shape. 5,408 entries (vs. Spanish 9,792, 56%). |
| 4 | Lemma-chain walk used by glossing suppression and vocab-retrievability | **MISSING** | `seen` dict keys on surface form (L19613); no `_vocabLemmaToFSRS` map. Suppression over-glosses inflected forms (`"ist"` and `"sein"` treated independently). |
| 5 | `glossSeen` persisted across sessions and flushed on Evaluate | **MISSING** | No `glossSeen` localStorage key; no import/export carry; no "Reset automatic glossing" Settings action. SPEC §3.2. |
| 6 | Vocabulary array with `{ section, num, spanish\|german, english, extra, state }` shape | **PARTIAL** | `VOCAB` at L10731; shape `{section, num, german, english, extra}`; 3,148 rows across 9 sections. Missing universal `state: "adjusted"` field. Row count 81% of Spanish (3,148 vs 3,905). |
| 7 | Author-specific vocabulary sections | **DIVERGENT** *Intentional because:* authors differ. German: Wittgenstein 317, Freud 320, Nietzsche 462. Section naming convention matches Spanish (bare author surname). |
| 8 | Paradigmatic vocabulary sections (Noun / Verb / Adj-Adv / Prep / Conj-Pron-Particle / Idiom) | **PARTIAL** | German sections align name-for-name except Spanish has `Cob Building` (505 rows) where German has `Nietzsche` (462 rows). Per-section deltas: Noun 999/1000; Verb 500/502; Adj/Adv 250/500; Prep 100/79; Conj/Pron/Part 100/74; Idiom 100/202. Section name `Conjunction/Pronoun/Particle` matches verbatim across apps. |
| 9 | Grammar lessons with `lessonContent: {introduction, keyPoints, comparison, historicalNote}` subtree | **DIVERGENT** *Intentional because:* German follows Jannach's textbook progression and separates reference-lesson content from exercise-pattern generators. Two structures: `GRAMMAR_PROFILES` (48 patterns at L13884) + `GRAMMAR_UNITS` (34 units at L14830). |
| 10 | Grammar lesson count comparable to Spanish 70 | **PARTIAL** | German: 48 `GRAMMAR_PROFILES` + 34 `GRAMMAR_UNITS` (different semantics). Profile count 48 is ~69% of Spanish's 70 lessons; unit count is reference-only. Row-by-row comparison not meaningful given the architecture divergence. |
| 11 | `paradigm`, `paradigmLabels`, `stems`, `generateForms` on each grammar entry | **MATCH** | `GRAMMAR_PROFILES` rows at L13892+ carry all four; `generateForms` is a function-valued field (matches Spanish convention). |
| 12 | Translation audio override map (`TRANSLATION_AUDIO_MAP`) | **MISSING** | No such const in German. |
| 13 | Grammar audio lookup map (`GRAMMAR_AUDIO_MAP`) | **MISSING** | No such const in German. |
| 14 | Pre-generated audio directory tree (`audio/grammar/`, `audio/vocab/`, `audio/translation/`) | **MISSING** | No `audio/` at all. **Single largest content-side gap.** |
| 15 | `audio/manifest.json` as flat `{ "<path>": true }` index | **MISSING** | No manifest; no consumer code; no `AudioCache` module (zero-hit grep). |
| 16 | Filename-sanitize helper (`AudioCache.sanitize`) preserving Latin accents (`\u00c0-\u024f`) | **MISSING** | No `sanitize()` function; no `AudioCache`. If/when the pipeline is built, the same regex should be used to keep `ä/ö/ü` verbatim — but `ß` is **not** in `\u00c0-\u024f`; explicit decision needed (Appendix B #B-9). |
| 17 | Two-tier translation audio resolution (override → manifest fallback → live TTS) | **MISSING** | Only live TTS exists (`_speakGerman` at L20187). |
| 18 | ElevenLabs import pipeline (source → prompts → mp3 → manifest → `CACHE_NAME` bump → deploy) | **MISSING** | No scripts, no tooling, no generator, no output tree, no `api.elevenlabs.io` call site. |
| 19 | Conversation scenario set + system-prompt structure | **DIVERGENT** *Intentional because:* language-appropriate scenarios and correction format differ. 21 German scenarios across A2/B1/B2/C1; every `sysPrompt` ends with `[Korrektur: «X» → «Y»]` directive. |
| 20 | Per-author audio subdirectory structure (`translation/borges/`, `translation/neruda/`) on disk | **N/A** | No audio tree exists; row reopens if pipeline is built. |
| 21 | POS coloring (translation): MATCH carry-through | **MATCH** | `posActive` flag at L19555; `togglePOS` L19656; `pos-legend` toggles visibility. |
| 22 | Custom-text import with `vocabulary` merge into `DICT` | **MATCH** | `doImport` L20873; `vocabulary` merged at L20890–20893; same plain-overwrite semantics as Spanish. |

---

## §11.5 UI/UX (against Spanish §6)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | Two layouts (desktop ≥768px, mobile <768px) with single CSS breakpoint | **PARTIAL** | Two layouts present in intent; **four overlapping breakpoints** (768 / 767 / 600 / 380). See FE-G-7. |
| 2 | Design tokens on `:root` (surface / text / brand / semantic / POS color scale) | **MATCH** | L17–39. (Cleaner than Spanish — no stray `.pos-*` literal-hex classes outside `:root`.) |
| 3 | Dark mode via `@media (prefers-color-scheme: dark)` | **PARTIAL** | Present at L3841 for `:root` tokens; no component-scoped dark overrides. |
| 4 | Touch target minimums (44×44 px) on mobile | **PARTIAL** | `touch-action: manipulation` globally applied (L42–46); 44×44 px minimums per selector `[UNVERIFIED]`. |
| 5 | Safe-area inset handling (`env(safe-area-inset-bottom)`) | **PARTIAL** | `@supports` block at L1248–1267; no `#mobile-tab-bar` means the bottom-inset pattern Spanish uses is N/A. |
| 6 | `role="dialog"` + focus-trap + Escape-closes for modals | **MISSING** | Zero `role=`, zero `aria-modal`, zero global `keydown`+Escape handler (zero-hit grep). See FE-G-4. |
| 7 | `aria-live="polite"` regions for mode content and evaluation results | **MATCH** | L3973, L3989–3991. |
| 8 | `focus-visible` outline pattern and `aria-pressed` on toggle buttons | **PARTIAL** | Global `:focus-visible` at L3600–3608: MATCH. `aria-pressed` on `#pos-toggle` / `#gloss-toggle` / `#gloss-hide-toggle`: **MISSING** (zero-hit grep on toggle buttons). |

---

## §11.6 Dependencies (against Spanish §7)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | No CDN scripts, no bundler, browser-native APIs only | **MATCH** | No `<script src=…>` outside the two inline blocks; no `package.json` or lockfile (DevOps §7.2). |
| 2 | Provider list: Anthropic (`claude-sonnet-4-6` default), OpenAI (`gpt-4o-mini` default + `tts-1` voice `nova`), Gemini (`gemini-2.0-flash`), ElevenLabs (`eleven_multilingual_v2`, `stability: 0.5`, `similarity_boost: 0.75`) | **PARTIAL** | Anthropic / OpenAI (chat + TTS) / Gemini: MATCH at the call-site level (L19775, L19807, L19839, L20054, L20148). **ElevenLabs: MISSING.** Default models `[UNVERIFIED]` for German (default Anthropic model, OpenAI TTS voice defaults). When German ports ElevenLabs, voice ID, model, and `stability`/`similarity_boost` defaults from Spanish (`P5dwwehjO7NwEIcN2F2N`, `eleven_multilingual_v2`, `0.5`/`0.75`) carry over by parity. |
| 3 | CSP meta with `connect-src` listing every provider (including a German-side ElevenLabs host if used) | **MISSING** | **Architectural gap, not inherited.** No `<meta http-equiv="Content-Security-Policy">` in `index.html` (verified by Senior Dev 2026-04-19; Auditor §7.3.2). To be established as a Phase-1 German invariant per `plans/ARCHITECTURE.md` (forthcoming). See FE-G-1 + Auditor C-G1. |

---

## §11.7 Deployment (against Spanish §8)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | GitHub Pages static hosting | **MATCH** | German served by GH Pages from `main` (single-branch); confirmed via `git ls-remote --heads origin`. |
| 2 | Unified source+deploy repository (avoid the two-branch hand-commit ritual in Spanish) | **MATCH (parity exceeds Spanish baseline in the direction Spanish is trying to move)** | German has only `main`. No `gh-pages` branch on origin or locally. German does not inherit the Spanish two-branch ritual and has no migration debt. |
| 3 | SW registered with `{ updateViaCache: 'none' }` and explicit `reg.update()` | **MATCH** | `{ updateViaCache: 'none' }` is present. Explicit `reg.update()` restored by WP-ARCH-G-3 Amendment 4 inside `window.addEventListener('load', …)` IIFE — deferred past register resolution to avoid the Chrome double-install race. Divergence from Spanish §1.6 closed. |
| 4 | `CACHE_NAME` as the de facto version stamp, bumped per content/code deploy | **MATCH** | `sw.js:4` `const CACHE_NAME = 'werkstatt-v10';`. Ten bumps across the traversable history; every content-bearing commit carries a bump. Discipline informal but currently functional. |
| 5 | iOS Safari update-detection hardening (`reg.waiting` check at registration, `reg.active` instead of `controller`, `updatefound` handler) | **MATCH** | `reg.waiting` cold-load check and `reg.active`-guarded statechange handler restored by WP-ARCH-G-3 Amendment 4 (Spanish IIFE pattern ported verbatim). `GET_CACHE_NAME` / `uw_lastSeenCacheName` / `uw_diag_controllerchange_timeout` machinery removed. Divergence from Spanish §1.6 closed. |
| 6 | `{ type: 'SKIP_WAITING' }` client→SW handshake with in-app update banner | **MATCH** | `waitingSW.postMessage({ type: 'SKIP_WAITING' })` in reload-button handler. `sw.js` listens and calls `self.skipWaiting()`. `#update-banner` with German copy and dismiss button (`✕`) added by Amendment 4. Parity with Spanish. |
| 7 | `.nojekyll` present on the deploy branch (Spanish baseline lacks this — parity here may exceed baseline by design) | **MISSING (parity-shared with Spanish)** | No `.nojekyll` at repo root on `main`. GitHub Pages runs default Jekyll. Latent trap if any future path starts with `_`. |

### §11.7 supplementary rows (DevOps-flagged for §11.9 / IMPLEMENTATION_PLAN consideration)

These do not have explicit Spanish §11.7 checkboxes but map to Spanish §8.3 hazards or Spanish §10.3 tech-debt entries. Recorded here so the IMPLEMENTATION_PLAN can pick them up.

| # | Item | Score | Justification |
|---|---|---|---|
| A1 | Install-time `self.skipWaiting()` (bypasses user consent for update) | **MATCH** | `sw.js:21` `self.skipWaiting()` removed by WP-ARCH-G-3 selecting Option A (Spanish-aligned). Install-time `skipWaiting` was reactive to the v9→v10 deploy-detection problem; the proper fix is the WP-DEP-G-2 hardening (folded in via WP-ARCH-G-3). `sw.js:69–73` remains the sole `skipWaiting` call site, gated on user accept. `SPEC.md` Appendix B #B-4 closed by design. |
| A2 | Runtime-swappable alternate PWA manifests (Spanish has 5) | **MISSING** | Single `manifest.json`; no boot-script swap. Duplicate of §11.1 row 4. |
| A3 | Maskable icon variants for iOS A2HS | **MISSING** | `manifest.json` icons reference only `icon-192.png` / `icon-512.png`. |
| A4 | Manifest `lang` and `orientation` fields | **MISSING** | German `manifest.json` has neither. **Principal confirmed 2026-04-19 (Appendix B #B-12 resolution): `lang: "en"` matches the intentional `<html lang="en">` chrome-led convention for both apps.** Add `lang: "en"` and `orientation: "any"` per WP-FE-G-14. |
| A5 | Pre-deploy smoke test (headless browser, SW register, manifest parse) | **MISSING (parity-shared)** | No `.github/workflows/` at all in German repo. |
| A6 | Post-deploy verification (fetch `/sw.js`, assert served `CACHE_NAME` matches committed value) | **MISSING (parity-shared)** | No automation. |
| A7 | Rollback runbook | **MISSING (parity-shared)** | Undocumented. |
| A8 | Precache filename integrity (`PRECACHE_URLS` entries resolve against deployed file names) | **PARTIAL — `[UNVERIFIED]` — P0 candidate pending live verification** | `sw.js:6–14` lists hyphenated `German-Icon-I.jpeg`. Tracked-on-`main` filenames per `git ls-files`: space-separated `German Icon I.jpeg`. Hyphenated copies are untracked working-copy duplicates only. If GH Pages does not silently alias these, `cache.addAll` rejects atomically and SW v10 has not been installing for new visitors since `f79e45c`. **Routes to Principal/Auditor as Appendix B #B-3 / SPEC §10 G-15.** |

---

## §11.8 Configuration (against Spanish §9)

| # | Row | Score | Evidence / justification |
|---|---|---|---|
| 1 | Settings-modal surface for LLM provider/key, TTS provider/keys/voice, browser voice pickers, app icon picker, reset glossing, reset progress | **PARTIAL** | LLM provider+key: MATCH. TTS provider selector: MISSING. ElevenLabs voice: MISSING. Voice pickers: MATCH. Icon picker: MATCH-shape (DIVERGENT-storage — base64 inline rather than disk PNGs + per-icon manifests). Reset glossing: N/A. Reset progress: PARTIAL (native `confirm()`). |
| 2 | Pre-paint icon apply via inline head script | **MISSING** | No head `<script>` before `</head>`. `_applyAppIcon` runs only from `App.constructor` at L18939. See FE-G-8. |
| 3 | `_checkExportReminder` thresholds: 7 days since export OR ≥5 completions with no export | **MISSING** | No reminder mechanism (zero-hit grep). See §11.3 row 5. |

---

## §11.9 Known parity exceptions and divergences

Populated from `DIVERGENT` rows above. Each requires the "intentional because…" justification stated in-row.

1. **§11.2 row 9 — FSRS card shape (DIVERGENT, pending verification).** German FSRS IIFE uses a 19-element weights vector vs. Spanish's 17. Field set itself appears to match. Whether this reflects a different FSRS-algorithm version or a different tuning of v4.5 has not been line-verified in this pass. Treating as DIVERGENT pending Senior Dev's algorithm-parity review.
2. **§11.3 row 9 — installation-time `skipWaiting` (DIVERGENT, pending Principal confirmation).** Captured in §11.7 supplementary row A1 and Appendix B #B-4. *Intentional because:* commit `f79e45c` claims this was added "to force update". If confirmed intentional, this becomes a German-specific architectural invariant divergent from Spanish (Spanish gates activation on user-accept).
3. **§11.4 row 3 — `DICT` gender field.** *Intentional because:* German morphology requires grammatical gender. Spanish shape `{pos, gloss, lemma?}`; German shape `{pos, gloss, lemma?, gender?}`. German is a superset of Spanish.
4. **§11.4 row 7 — author-specific vocabulary sections.** *Intentional because:* authors differ. Section-naming convention matches Spanish (bare author surname).
5. **§11.4 row 9 — grammar two-structure architecture.** *Intentional because:* German follows Jannach's textbook progression, decoupling reference-lesson content from exercise-pattern generators. `GRAMMAR_PROFILES` (48 patterns) + `GRAMMAR_UNITS` (34 units) vs. Spanish's single `GRAMMAR_LESSONS` (70 entries with bundled `lessonContent` subtree).
6. **§11.4 row 19 — conversation scenario set + system-prompt convention.** *Intentional because:* language-appropriate scenarios and German-specific correction format. 21 German scenarios across A2/B1/B2/C1 with `[Korrektur: «X» → «Y»]` directive.

### Divergences not scored DIVERGENT but worth recording

The following are absences that look like divergences but fail the "intentional because…" test in this pass — they are scored `MISSING` or `PARTIAL` until and unless Principal confirms intent:

- **§11.3 row 10 / §11.8 row 1 — TTS-provider absence + native-confirm reset.** Frontend's first-pass classification was `DIVERGENT`; rescored to `PARTIAL` per `parity-scope-plan.md §3 ¶3` (DIVERGENT requires stated intent). If Principal intends the simpler TTS surface and the simpler reset flow, these flip to `DIVERGENT` and the FE-G-6/FE-G-10 work packages are dropped. Otherwise they remain in the implementation backlog as parity work.
- **§11.2 row 3 / SPEC §10 row 4 — IDB mirror.** Capability is `MISSING` (this document's row); Spanish security debt does not transfer (SPEC §10.2 row 4 is `DIVERGENT`). The architectural call (inherit the IDB mirror or accept iOS eviction risk) is Appendix B #B-5; until decided, the row stands as `MISSING`.

---

## First three things to fix to close the gap (ranked)

Ranking criteria: severity × leverage. Severity from `SPEC.md §10` and `parity-scope-plan.md` priorities. Leverage = how many parity rows the fix closes. Ranked by Senior Dev with cross-check from Auditor.

### 1. Resolve precache-filename hazard (G-15 / B-3) — P0 candidate

**Why first.** This is the only candidate-Critical issue surfaced by the spec pass. If live verification confirms 404s, SW v10 has been silently failing to install for any new visitor since `f79e45c`. Operationally this is a hot-fix deploy: rename the precache list to match the tracked filenames (or rename the tracked files to match the precache list) and bump `CACHE_NAME` to `werkstatt-v11` in the same commit. **The verification itself is one `curl -I` call against the live URL** — Principal or DevOps to run before scheduling any other parity work. **Closes:** §11.7 supplementary A8; gates §10 G-15.

### 2. Establish a meta Content-Security-Policy (G-1 / FE-G-1 / C-G1)

**Why second.** Single highest-leverage hardening for German. Closes §11.6 row 3 directly; gates the security mitigations in §10 G-2 (Anthropic dangerous header), G-3 (Gemini key in URL), G-4 (sync-import key injection). Also a precondition for any future ElevenLabs work (the ElevenLabs host must land in the same change as a CSP allow-list entry, never split). Spanish ARCHITECTURE.md §1.7 names CSP as an invariant; German does not yet have that invariant in force. The forthcoming `plans/ARCHITECTURE.md` will record meta-CSP as a Phase-1 German architectural commitment per Dispatch direction (2026-04-19). **Closes:** §11.6 row 3; reduces severity of §10 G-2/G-3/G-4.

### 3. Build the audio pipeline end-to-end (or formally defer)

**Why third.** Single coherent piece of work that resolves ~10 §11.4 `MISSING` rows (audio tree, manifest, `AudioCache`, sanitize helper, two-tier resolution, `TRANSLATION_AUDIO_MAP`, `GRAMMAR_AUDIO_MAP`, ElevenLabs import tooling, pre-generated audio, override map). Scope is large and depends on Appendix B #B-9 (sanitize convention for `ä/ö/ü/ß`) being decided first. **Alternative:** if Principal decides the German app should remain at the two-tier TTS posture, formally defer this entire row set as `DIVERGENT (intentional simplification)` and close the §11.4 audio-pipeline rows accordingly. **Closes (if built):** §11.4 rows 12–18, 20; §11.1 row 7 (`AudioCache` support singleton); §11.2 row 10. **Closes (if formally deferred):** the same rows flip from `MISSING` to `DIVERGENT` with stated intent.

---

## Verification status

- **Awaiting QA Lead scoring verification** per `parity-scope-plan.md §2.5`. QA Lead is requested to confirm or dispute each `MATCH` and `PARTIAL` row above by exercising the German app against the Spanish-baseline behavior. Disputes return as a `plans/parity-qa-verification.md` artifact and block promotion of this document to authoritative.
- **Watch-list for QA disputes likely to surface:** §11.3 row 9 (cheapest-model routing — Senior Dev resolved `[UNVERIFIED]` to MATCH via direct grep, but behavior verification on real conversation traffic is unconfirmed); §11.5 row 4 (44×44 px touch-target enumeration was `[UNVERIFIED]` in Frontend's pass); §11.7 row 6 (banner dismiss control was characterized as "minor UX divergence, not a parity failure" — QA may push back); §11.7 supplementary A8 (the P0-candidate live-verification gate).
- **Inter-TM dispute resolutions captured at integration:** see `SPEC.md` Verification notes for the `_convGetCheapestModel` / IDB-mirror / §10 #5 reconciliations.
- **Three-watch rule applications:** (a) contradictions resolved as above; (b) `[UNVERIFIED]` markers preserved verbatim with QA call-out; (c) DIVERGENT-without-justification rows rescored to `PARTIAL`/`MISSING` per `parity-scope-plan.md §3 ¶3`.

---

**End of parity-gap document. Pending QA Lead verification before promotion to authoritative.**
