# Architecture — Übersetzungswerkstatt

**Owner:** Senior Dev Oversight Engineer.
**Authority:** Load-bearing. This document, together with `SPEC.md` and `plans/PARITY_GAP.md`, governs architectural review for the German app. Team Managers escalate design choices that diverge from what is recorded here.
**First issued:** 2026-04-19.
**Companion documents:**
- `SPEC.md` (German current state, descriptive baseline) — what the app does today.
- `plans/PARITY_GAP.md` (delta vs. Spanish, scored) — where the German app sits relative to its parity target.
- `plans/spanish-architecture-reference.md` — the Spanish ARCHITECTURE.md, used here as the template and the inheritance source for invariants the German app deliberately adopts.

---

## 0. How to use this document

`SPEC.md` answers "what does the app do right now?"
`plans/PARITY_GAP.md` answers "how does what the app does compare to the Spanish parity target?"
`ARCHITECTURE.md` (this document) answers "what are the invariants, the standards, and the escalation rules for changing them?"

If any two of the three disagree, the right resolution is one of:
1. The spec captures the current state accurately and the architecture should be updated to match. Senior Dev Oversight makes that call and records it in §6 Change log.
2. The spec describes drift from the architecture. The work package is to bring the code back in line — not to loosen the architecture.
3. The parity-gap document records a delta the architecture has not yet committed to (because the German app's architecture is younger than the Spanish app's). The right path is to decide whether the row's invariant should be inherited; if yes, record it in §1 with the inheritance pointer.

Team Managers should read §§1–3 before any non-trivial change. §§4–5 are for review-time and escalation-time. §6 is the change log.

**Status note (2026-04-19).** This document is issued alongside the first descriptive `SPEC.md` for the German app. Several invariants are **adopted from Spanish but not yet enforced in German code** — they appear in §1 with an explicit "**adopt-and-enforce**" status, distinguishing them from invariants the German app already honors. As implementation work lands, these statuses transition from "adopt-and-enforce" to "enforced". §6 records each transition.

---

## 1. Invariants (non-negotiable without Senior Dev Oversight sign-off)

These are the architectural commitments the German app rests on or has committed to. Breaking one is a ruling-worthy change, not a judgment call at the TM level. Each invariant carries one of three status labels:

- **enforced** — the German code already honors this invariant; review obligations apply.
- **adopt-and-enforce** — Senior Dev Oversight has committed German to this invariant; implementation work is required to bring the code into line, and review obligations apply going forward.
- **provisional** — Senior Dev Oversight is leaning toward this invariant but is awaiting a Principal decision (Appendix B of `SPEC.md`) before promoting it to `enforced` or `adopt-and-enforce`.

### 1.1 Single-file client-only PWA — **enforced**

- `index.html` is the entire client application (24,703 lines, ~1.95 MB at HEAD `f79e45c`). No bundler, no transpiler, no build step, no dev-time tool.
- Support code lives as inline `<script>` blocks, not as `<script src=...>` references. Two `<script>` blocks: the main application (L4192–24671) and the SW-registration IIFE (L24678–24702).
- No CDN imports. No `import` / `export` statements. No ES-module semantics at the top level.
- Rationale: (a) any editor can ship a change, (b) deploy has no build-failure mode, (c) the app's target user (Principal) trusts visible text.

**Inheritance status.** Inherited verbatim from Spanish §1.1.

**Change conditions.** Moving any module out of `index.html` requires a recorded design ruling (§5) that names the benefit (parse/compile cost, auditability, CSP tightening) and the mitigating plan for the three properties above.

### 1.2 Static-asset deployment, no runtime backend — **enforced**

- Serving is GitHub Pages from `main` branch root. No `gh-pages` branch on origin or locally; this is a unified source+deploy repo. No server, no proxy, no Lambda, no middle layer.
- External services (LLM providers, OpenAI TTS) are called directly from the browser with user-supplied keys.
- User data never leaves the user's browser unless the user explicitly exports it.

**Inheritance status.** Inherited from Spanish §1.2 with a German-specific *improvement*: German is already on the unified single-branch posture Spanish is migrating toward (Spanish §10.3 "Two-branch hand-commit ritual"). German has no migration debt on this dimension and `PARITY_GAP.md §11.7 row 2` records this as parity-exceeding.

**Change conditions.** Introducing a backend — even a thin proxy — is a Senior Dev Oversight decision. It changes the threat model (§2.4), the offline story (§2.5), the deploy ritual (§2.6), and the relationship to the Spanish parity target. It is not ruled out; it is ruled-by-escalation. The Anthropic-direct-browser-access mitigation (`SPEC.md §10 G-2`) and the static-host LLM-key threat surface in general are the strongest current arguments for revisiting this.

### 1.3 Persistence: `localStorage` primary; IDB mirror **adopt-and-enforce**

- All domain data persists through the `App.save(key, val)` (L19027) / `App.load(key)` (L19042) pair. Every persisted value is JSON-serializable.
- The `uw_` prefix is load-bearing — it is the namespace boundary with any other app that might coexist on `github.io`.
- **`sessionStorage` is unused** (zero-hit grep). German does not carry API keys through `sessionStorage`. (See §1.3a for the divergence call.)
- **IndexedDB mirror is currently absent.** Spanish `TallerIDB` exists to survive iOS standalone-PWA `localStorage` eviction; German has no equivalent (`SPEC.md §4.1 #3`). The German app has no iOS storage-pressure recovery path today.

**Adopt-and-enforce decision.** The IDB-mirror tier is adopted as a German invariant pending Principal confirmation in Appendix B #B-5 of `SPEC.md`. The mirror is not "optional polish" — without it, an iOS user under storage pressure loses every `uw_*` key, including conversation counters, FSRS state, completed-exercise marks, and `customTexts`. The data-loss surface is large enough that the architectural commitment is worth making before the implementation work-package is scheduled.

Implementation pointer: `FE-G-3` in `SPEC.md` Appendix A.

**Change conditions.** Any addition of a new `uw_*` key must, once the IDB mirror lands, be added to a `_restoreFromIDB()` manifest in the same change. Until the mirror lands, new keys must be reviewed by Senior Dev because they are accumulating recovery-debt.

#### 1.3a `sessionStorage` API-key carry-through — **provisional (decline)**

Spanish §1.3 includes `sessionStorage` as a tab-scoped fallback for API-key visibility. German has zero `sessionStorage` use. The decision: do not adopt `sessionStorage` carry-through into German. Rationale: it adds a third copy of the API key (Spanish `SPEC.md §10 #4`'s "triple-persisted keys" debt) without addressing the underlying issue, which is browser-held LLM keys (Open Question #1 in Spanish ARCHITECTURE.md §5). If German is going to make a key-storage change, it should be the IDB mirror (§1.3) for data-loss recovery and/or a token-exchange proxy (§5 Q1) for key safety, not `sessionStorage` for tab-life key persistence.

**Status: provisional (decline).** Will be promoted to a recorded ruling in §5 once the IDB mirror lands.

### 1.4 FSRS as the only scheduler — **enforced (canonical v4.5)**

- Spaced repetition uses the embedded `FSRS` IIFE at L18651. The implementation owns its own storage key (`uw_fsrsState` at L18665).
- FSRS keys share a flat namespace across vocab and grammar, with prefix conventions: `vocab_<section>_<num>` (L21496) and `grammar_<pattern>_<paradigmKey>` (L22418).
- There is **no** `ReviewScheduler` wrapper class in German. `class App` calls into `FSRS` directly via `FSRS.review(key, rating)` and `FSRS.getOverdueKeys()`. This is a deliberate simplification of Spanish §1.4.

**Full FSRS v4.5 implementation (as of 2026-04-23).** Reconciled in WP-ARCH-G-2 (docs) and completed in WP-ARCH-G-2 follow-up (code, `werkstatt-v29`):

1. **Algorithm version.** German runs canonical FSRS v4.5: 19 weights, exp-based `initDifficulty` (W[4]–W[5]), mean-reversion `nextDifficulty` (W[7]), long-term recall stability for Review state (`_nextRecallStability`, W[8]–W[16]), and **short-term stability for Learning/Relearning states** (`_nextShortTermStability`, W[17]–W[18]: `S × e^(W[17]×(G−3+W[18]))`). Spanish runs FSRS v4 (17 weights, linear `initDifficulty`, no mean reversion, no short-term formula) — German is algorithmically ahead.

2. **Weight values.** German: calibrated v4.5 defaults `[0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589, 1.5330, 0.1482, 1.0131, 1.8558, 0.0200, 0.3400, 1.2600, 0.2900, 2.6100, 0.5100, 0.6000]`. All 19 weights are now wired and active.

3. **Card schema.** Field-for-field identical to Spanish: `{ difficulty, stability, lastReview, reps, lapses, scheduledDays, state }`. No data-model migration required. Stored cards are unaffected by the formula change — `review()` only computes new stability on explicit user-triggered calls; `_load()` is pure JSON deserialization with no formula re-application.

**Change conditions.** The FSRS implementation is Senior Dev Oversight's domain. Team Managers do not touch the algorithm or the weights vector. Changes to key-prefix conventions require a ruling because they affect the shared namespace. Adding a `ReviewScheduler` wrapper (to mirror Spanish §1.4) is also a Senior Dev decision and routes through the same escalation as removing one.

### 1.5 Audio — runtime TTS only; pipeline pending — **enforced (current); adopt-and-enforce (target)**

Current playback chain (`SPEC.md §3.2`, `§7.3.4`):

1. **Neural TTS** — OpenAI `tts-1` via `_openaiTTS` (L20130–20185), keyed by `uw_ttsApiKey` (or `uw_apiKey` if provider is OpenAI). In-memory cache `_ttsCache` capped at 25 entries (`MAX_TTS_CACHE` at L20096).
2. **Browser `speechSynthesis`** — `_browserSpeak` fallback (L20200), entry `_speakGerman` (L20187).

There is **no pre-generated MP3 tier** today. There is no `audio/` directory, no `audio/manifest.json`, no `AudioCache` module, no `TRANSLATION_AUDIO_MAP`, no `GRAMMAR_AUDIO_MAP`, no ElevenLabs integration (`SPEC.md §5.1.5`, `§5.1.6`, `§5.2.1`).

**Target invariant (adopt-and-enforce, conditional on Principal direction).** When and if the German audio pipeline is built, it adopts Spanish §1.5 verbatim:

1. Pre-generated MP3 via `AudioCache.tryPregenerated(key)`, keyed by `audio/manifest.json`. Two resolution paths — explicit override map first, then `AudioCache.translationKey()` manifest-fallback.
2. Neural TTS (OpenAI primarily; ElevenLabs if/when added).
3. Browser `speechSynthesis`, unconditional last resort.

The `AudioCache.sanitize()` rule is adopted verbatim from Spanish (`lowercase`, `[^a-z0-9\u00c0-\u024f]+ → '_'`, trim, slice 80) **with one explicit decision pending** (`SPEC.md` Appendix B #B-9): the regex preserves `ä/ö/ü` verbatim but does **not** cover `ß`. Principal must decide whether `ß` is preserved (extending the regex) or transliterated (`ß → ss`). The "doubled prefix" property of Spanish keys (`SPEC.md` Spanish §1.5) is also adopted: it is the correct, deterministic output and must not be "fixed" by path munging.

**Status:** current chain is **enforced** at the two-tier level; the three-tier target is **adopt-and-enforce** conditional on the audio-pipeline implementation phase landing. If Principal declines to build the audio pipeline (declaring "two-tier is intentional"), the §11.4 audio-pipeline rows in `PARITY_GAP.md` flip from `MISSING` to `DIVERGENT` and the target invariant is dropped. Currently the pipeline is unscheduled.

**Change conditions.** Any change to `_speakGerman`'s fallback ordering or to `_openaiTTS`'s cache eviction policy is a Senior Dev decision. Once the audio pipeline lands, any change to `sanitize()` behavior invalidates the manifest — a renaming pass plus manifest regeneration plus `CACHE_NAME` bump must travel together.

### 1.6 Service worker strategy — **enforced**

Four invariants, all matching Spanish §1.6 (Amendment 4 aligned German to Spanish parity 2026-04-19; see §6):

1. Cache-first for precached assets; network-first for manifests and cross-origin/non-GET.
2. `CACHE_NAME` as the version stamp. Currently `'werkstatt-v19'`.
3. `{ updateViaCache: 'none' }` + explicit `reg.update()` at registration.
4. User-gated activation via `{ type: 'SKIP_WAITING' }` handshake. No install-time `skipWaiting`. `reg.waiting` checked at registration time; `reg.active` used in `updatefound` statechange guard.

**B-4 closed (Amendment 4).** Install-time `self.skipWaiting()` was reactive, not intentional — it caused the banner regression. Removed. Provisional status retired.

**Change conditions.** Switching any of the cache strategies (e.g., making `index.html` network-first) is a Senior Dev Oversight decision because it interacts with offline semantics and update detection. Adding a precache asset requires the `CACHE_NAME` bump.

### 1.7 Content Security Policy as source of truth for allowed network destinations — **adopt-and-enforce**

- Spanish §1.7 names CSP as an invariant: every external host must be in `connect-src`; the meta CSP is authoritative.
- **German has no Content-Security-Policy meta tag** (verified by Senior Dev 2026-04-19; Auditor `SPEC.md §7.3.2`). No `connect-src`, no `default-src`, no `script-src`. The German app currently runs under the browser's permissive default.

**Adopt-and-enforce decision.** Per Dispatch direction (2026-04-19) and recorded throughout `SPEC.md` (§7.3.2, §10 G-1) and `PARITY_GAP.md` (§11.6 row 3): meta-CSP is established as a Phase-1 German architectural commitment. This is **not** a parity-shared bug inherited from Spanish — Spanish has a CSP to tighten; German has nothing to enforce. The work is to author the first German CSP from zero.

The current call inventory (from `SPEC.md §7.3.1`) the CSP must allow under `connect-src`:

- `https://api.anthropic.com` (LLM, L19775)
- `https://api.openai.com` (LLM at L19807; TTS at L20054, L20148)
- `https://generativelanguage.googleapis.com` (LLM, L19839)

The CSP must not (yet) allow `api.elevenlabs.io` — German does not have ElevenLabs integration. When German adds ElevenLabs in a future phase, the host **must land in the same change** as the CSP allow-list update. The Spanish lesson learned (CSP exists but omits ElevenLabs because the two changes were split) is captured here as a procedural rule: provider integration and CSP allow-list update are inseparable.

The current monolithic-bundle architecture forces `script-src 'self' 'unsafe-inline'` until §1.1 changes. This relaxation is load-bearing under the current architecture but should be tightened (nonce/hash + extracted scripts) at the first feasible opportunity.

Implementation pointer: `FE-G-1` in `SPEC.md` Appendix A; Auditor `C-G1` in `SPEC.md` Appendix C.

**Change conditions.** Once landed, any new external host reached by `fetch(...)` or `<audio src=...>` (cross-origin) or `<img src=...>` (cross-origin) must be added to the appropriate CSP directive in the same change. "Reachable today because meta-CSP is permissive" stops being an acceptable reason to skip this step the moment the CSP exists.

---

## 2. Design patterns (how the app is organized)

These are the conventions specialists should follow. Deviation is not forbidden; deviation without a stated reason is.

### 2.1 `class App` as the one stateful singleton — enforced

- `class App` (L18923–24667) owns UI state, rendering, input, and I/O orchestration. Mode state, current-text state, and per-mode ephemeral state all live on `this`. Approximately 170 methods on the prototype.
- Support singletons are sparser than Spanish: `FSRS` (L18651 IIFE) is the only standalone support module. There is no `ReviewScheduler`, no `AudioCache`, no IDB-mirror class today. (See §1.3 and §1.4 for the inheritance calls.)
- There is no IoC container, no framework-level lifecycle, no routing abstraction. Mode switching is a plain `display:none` toggle (`switchMode` at L20916).

**Implication for reviewers.** New features land as methods on `class App` unless there is a clear reason to extract. "Extract" means: a new singleton with a narrow, testable surface (like the future `WerkstattIDB` from §1.3 / `FE-G-3`), not a framework.

### 2.2 Rendering — `innerHTML` with delegation, not a virtual DOM — enforced

- Per-mode render methods set `innerHTML` directly. No React, no lit-html, no hand-rolled diff.
- Listeners attach via direct or delegated handlers on stable ancestor nodes (e.g., the content panel or `document`) when natural; via direct listeners on ephemeral nodes otherwise.
- Template strings that interpolate user-supplied or LLM-supplied data MUST pass through `_escapeHtml()` (L23840–23844). German is currently *safer* than Spanish at this discipline — German escapes `ex.label`/`grp` at L19295/L19323/L19339 where Spanish does not (`SPEC.md §10` row 5 reconciliation). This safer divergence MUST be preserved.

**Implication for reviewers.** Any `innerHTML = \`${foo}\`` where `foo` is or could be user-sourced or LLM-sourced is a blocking review issue. The `_escapeHtml` pattern at the injection sites in `SPEC.md §10 G-8` (L19898, L19901, L19907, L20018, L24567, L24660) is the model — match it on every new injection site.

**Performance follow-up.** `_escapeHtml` uses a DOM temp-node round-trip on hot render paths (`SPEC.md §10 G-9`). A pure-string escape would be ~10× faster and DOM-free. Surfaced as Low-priority follow-up; do not let the optimization regress the safety property.

### 2.3 LLM and TTS abstraction — enforced

- LLM calls go through `App.llmComplete(...)` which dispatches to `_callAnthropic` (L19775), `_callOpenAI` (L19807), or `_callGemini` (L19839) based on `this.apiProvider`. New call sites should not construct `fetch(...)` directly — they should name a provider-neutral option set and let the dispatcher pick the transport.
- TTS calls go through `_speakGerman` (L20187) → `_openaiTTS` (L20130) → `_browserSpeak` (L20200). When the audio pipeline lands per §1.5, a `_playPreGeneratedAudio` tier is inserted ahead of `_openaiTTS`.
- Retry and timeout live at the abstraction layer: shared timeout `API_TIMEOUT_MS = 30000` at L18921. Changing per-site timeouts requires a reason.

### 2.4 Security posture — user-supplied keys, browser-local — provisional (pending §1.7 + Q1)

- API keys are user-supplied. Nothing ships with keys.
- Keys are stored browser-local in **one** place (`localStorage`). Smaller exposure surface than Spanish (which uses three: `localStorage` + `sessionStorage` + IndexedDB mirror). See §1.3.
- XSS is the dominant threat because any XSS reads `localStorage["uw_apiKey"]` and `localStorage["uw_ttsApiKey"]` directly — and **no CSP currently constrains XSS** (see §1.7 adopt-and-enforce). Keeping `innerHTML` paths escaped (§2.2) is the first line of defense.
- The `anthropic-dangerous-direct-browser-access: true` header (L19782) is a known weakness; mitigation is a proxy (see §5 Q1).
- Sync-import key injection (`SPEC.md §10 G-4`) is a German-specific risk: the import path at L20803–20806 will write `data.apiKey` to `localStorage` if no local key is set. Fix planned via `FE-G-6`.

**Status: provisional.** This pattern is current state but it is materially worse than Spanish's posture under the no-CSP context (§1.7). Once §1.7 lands (CSP enforced), §2.4 can be promoted to `enforced` with the smaller-surface property as a German-specific advantage. Until then, every additional XSS-adjacent change is a magnified risk.

### 2.5 Offline semantics — enforced (degraded vs. Spanish)

- The app launches and runs offline for every non-API feature (after first install, assuming the §1.6 precache hazard does not trip — see §1.6 and `SPEC.md §10 G-15`).
- LLM-dependent features (Evaluate, Hint, examples, CEFR assessment) degrade to heuristic (`evaluateHeuristic` at L19964) or are declined with a user-visible message.
- Neural TTS falls through to `speechSynthesis` on network failure (`onEnd("fallback")` at L20183).
- **The pre-generated audio tier that Spanish offers as the offline-friendly tier does not exist in German.** Offline TTS is browser-only (lower quality, language-coverage gaps possible).
- Export JSON is the user-owned offline backup. Import JSON tolerates omitted sections (current implementation) but does **not** check `_version` (Spanish warns on mismatch); `FE-G-6` will close this gap.

### 2.6 Deploy discipline — enforced (with hardening pending)

`SPEC.md §8` describes the current state; the architectural commitments are:

- Every change that touches a file in the SW precache, or that changes `index.html`, requires a `CACHE_NAME` bump (`sw.js` L4). Currently a manual discipline. German history is cleaner than Spanish (no "amnesia" pattern in the traversable log) but the same failure mode is available; CI mechanization is the standing recommendation.
- The single-branch source+deploy posture is the architectural target Spanish is migrating toward; German is already there. Changing this (introducing a `gh-pages` branch, a build step, or any deploy automation that produces a different tree from `main`) is a Senior Dev Oversight decision.
- Rollback is "re-clone from origin" per Principal. The local working copy is not authoritative for recovery (`SPEC.md §8.2` `git fsck` notice).

**P0-candidate hazard (`SPEC.md §10 G-15` / Appendix B #B-3).** Until the precache filename mismatch is verified live or fixed, every deploy carries the risk that SW v10 is silently failing to install on new visitors. The architectural rule going forward: any commit that touches `PRECACHE_URLS` or any file referenced by it must ship with a `git ls-files | grep <basename>` check confirming the tracked filename matches the precache entry exactly. This rule is **adopt-and-enforce** and lands in §3.7 below.

---

## 3. Standards for code changes

### 3.1 Naming

- `uw_*` for every persisted `localStorage` key. No exceptions.
- `_prefix` for every private method on `class App`. No exceptions.
- `FSRS` is the named support singleton today; future singletons get a similarly-shaped name (PascalCase if class-like, all-caps if module-like). The IDB mirror, when added per §1.3, lands as `WerkstattIDB` (mirroring Spanish's `TallerIDB`).
- Audio keys, when the pipeline lands per §1.5, are `sanitize()` output. Hand-crafted paths that do not match `sanitize()` are defects.

### 3.2 Additions to the persisted-key set

When a new `uw_*` key is introduced:

1. Add the `save()`/`load()` call sites.
2. Update `SPEC.md §4.2.1` (schema table).
3. Decide whether the key belongs in the export envelope (`SPEC.md §4.3.3`). Currently API keys, TTS keys, voice preferences, icon preference, and FSRS state are excluded from export; `customTexts` and per-mode progress are included. Each new key is a case-by-case judgment.
4. **Once the IDB mirror lands per §1.3**: add the key to the `_restoreFromIDB()` manifest in the same change.

**Keys introduced outside the normal `App.save()`/`App.load()` flow** (written directly by SW-lifecycle infrastructure):

| Key | Purpose | IDB-restore obligation |
|---|---|---|
| `uw_lastSeenCacheName` | SW version-tracking for the update banner. Stores the `CACHE_NAME` of the last SW version the user's browser successfully activated (updated on `controllerchange`). Banner is shown iff the controlling SW's `CACHE_NAME` differs from this value. First-install bootstrap: seeded on the first `controllerchange` without showing a banner. | Must be added to `_restoreFromIDB()` manifest when WP-ARCH-G-1 lands. Until then, iOS storage-pressure eviction resets this key to null, which manifests as a one-time banner suppression on next launch — acceptable degraded behavior. |
| `uw_diag_controllerchange_timeout` | Safety-net diagnostic written when a `GET_CACHE_NAME` ack does not arrive within 3 seconds of `controllerchange`. Presence signals iOS `clients.claim()` failure (Hypothesis D). No user-visible effect; Cam inspects after iOS click testing. | Not included in export or IDB manifest (ephemeral diagnostic). |

### 3.3 Additions to the audio corpus — does not currently apply

When the audio pipeline is built (§1.5), this section adopts Spanish §3.3 verbatim:

1. Files land at the path `AudioCache.<kind>Key()` would compute, or are listed in an explicit override map.
2. `audio/manifest.json` is regenerated to include every new file.
3. `sw.js` `CACHE_NAME` is bumped.
4. The pre-generation toolchain (TBD; ElevenLabs is the Spanish target — `SPEC.md §5.2.1`) emits all three artifacts atomically.

A partial update — new files but stale manifest, or new manifest but old cache version — is a defect that silently breaks offline playback.

Until the pipeline is built, any PR that adds an `audio/` path must route through Senior Dev because the supporting infrastructure (`AudioCache`, manifest, sanitize helper) does not yet exist.

### 3.4 Additions to the CSP allow-list — does not currently apply (becomes mandatory once §1.7 lands)

Today the German app has no CSP, so this section has no force. Once §1.7 (`FE-G-1`) lands, any new external host reached by `fetch(...)` or cross-origin asset must be added to the appropriate CSP directive in the same change. "Reachable today because meta-CSP is absent" is not an acceptable reason to defer the work — the CSP is being built precisely to remove that excuse.

### 3.5 DOM injection paths — enforced

- `innerHTML` assignments interpolating any variable that could be user-sourced or LLM-sourced must route through `_escapeHtml()` (L23840). The German implementation is currently safer than Spanish (`SPEC.md §10` row 5 reconciliation); preserve that posture when integrating Spanish-side fixes.
- The `tmp.innerHTML = text` strip-HTML idiom (Spanish §10 #6) does not appear in German. Do not introduce it. Use `DOMParser` or `textContent` if such an idiom becomes needed.
- ARIA roles and `aria-live` are partially in place (`#vocab-content`, `#grammar-content`, `#conversation-content` carry `aria-live="polite"` at L3989–3991). New content panels should adopt the same pattern.
- Modals do **not** currently carry `role="dialog"` / `aria-modal` / focus-trap. `FE-G-4` is the work package; until it lands, every new modal is a regression. Senior Dev will block PRs that add modals without the trap.

### 3.6 PWA update discipline — adopt-and-enforce (per §1.6)

Once the §1.6 hardening lands:

- SW registration uses `{ updateViaCache: 'none' }` for per-page-load update detection. Explicit `reg.update()` was removed (WP-ARCH-G-3 Amendment 2 — it triggered a double-install race; see §1.6 divergence note).
- The update banner is the sole user-facing surface that triggers reloads. Banner-click is the only activation gate (install-time `skipWaiting` removed by WP-ARCH-G-3; Appendix B #B-4 closed by design).
- New deploy → existing user path goes through the `{ type: 'SKIP_WAITING' }` handshake (already in place at L24698 / `sw.js` L69–73).

### 3.7 Precache filename integrity — enforced

Lifted from `SPEC.md §10 G-15` / Appendix B #B-3. Every commit that touches `PRECACHE_URLS` (`sw.js` L6–14) or any file referenced by it must ship with verification that the tracked filename on `main` exactly matches the precache entry. The minimum acceptable check:

```
for each entry in PRECACHE_URLS:
  git ls-files | grep -F "<entry>"   # must return exactly one tracked path
```

Failure mode if not enforced: `cache.addAll` rejects atomically on install, the SW never activates, `CACHE_NAME` bumps stop reaching new visitors. This is the G-15 / B-3 hazard — confirmed live on 2026-04-19 (WP-DEP-G-1): SW v10 was silently failing to install for all new visitors from `f79e45c` until hot-fix `b7e671c`. Promoted from `adopt-and-enforce` to `enforced` following that verification.

### 3.8 Conversation `sysPrompt` correction directive — enforced

Every German conversation `sysPrompt` ends with the exact text `After each student message, if they made a German error, add a brief correction at the very end in this exact format: [Korrektur: «X» → «Y»].` This is German-specific (Spanish has no documented analogue) and is intentional (`PARITY_GAP.md §11.4 row 19`). New scenarios added to `_getConversationScenarios()` (L23878) must carry this directive verbatim. Removing or altering the directive on any scenario requires a ruling.

---

## 4. Review conventions

### 4.1 What Senior Dev Oversight reviews

- Any change that touches §1 invariants.
- Any new `uw_*` key (and once §1.3 lands, any change to the IDB-restore manifest).
- Any change to the `FSRS` IIFE math, weights vector, or to FSRS key-prefix conventions.
- Any change to the service worker beyond `CACHE_NAME` bumps and `PRECACHE_URLS` list updates that respect §3.7.
- Any addition of a new external service or host (which once §1.7 lands also requires a same-PR CSP allow-list update — see §3.4).
- Any architectural decision escalated by a TM.
- Any change that adds a modal before `FE-G-4` lands (because of the focus-trap regression risk in §3.5).

### 4.2 What Team Managers review (and do not need to escalate)

- Per-mode rendering changes inside `class App`.
- New settings surfaces that follow the patterns in `SPEC.md §9`.
- New vocabulary, grammar paradigms, passages, or conversation scenarios added through the established corpus shapes (`SPEC.md §5`). For conversation scenarios, the §3.8 directive is mandatory.
- Bug fixes that do not change architecture.
- Copy, UX tweaks, accessibility improvements that follow the patterns in `SPEC.md §6`.

### 4.3 Blocking issues at review time

- Unescaped `innerHTML` interpolation of user- or LLM-sourced data.
- New external host added without — once §1.7 lands — a same-PR CSP allow-list update.
- New `uw_*` key — once §1.3 lands — missing from the IDB-restore manifest.
- Precache-eligible asset added without `CACHE_NAME` bump, or without §3.7 filename-integrity verification.
- Audio file added without `audio/manifest.json` update — once §1.5 audio pipeline lands.
- Modal added without `role="dialog"`/focus-trap — until `FE-G-4` lands and provides the pattern.
- Any edit that widens — once §1.7 lands — `script-src` or drops `connect-src` entries.

---

## 5. Open architectural questions

These are standing questions whose answers will be recorded here as rulings when resolved. They are named here so that TMs know what is in motion and where to raise related concerns. The `SPEC.md` Appendix B is the source of truth for the question text; this section captures the architectural framing.

### Q1. Proxy for LLM keys?

`SPEC.md §10` G-2 (Anthropic direct-browser header), G-3 (Gemini query-string key), and G-4 (sync-import key injection) collectively point at "browser-held LLM keys" as the German app's weakest architectural point. The constraint is the same as Spanish: GitHub Pages is static, so a proxy must live elsewhere (Cloudflare Worker, small VPS). The German-specific intensifier: the no-CSP context (§1.7 adopt-and-enforce) makes the consequence of any XSS strictly worse than in Spanish until §1.7 lands.

**Status:** open. Senior Dev Oversight will not force the change; Principal to decide.

### Q2. Move corpus data out of `index.html`?

`SPEC.md §10 G-7` (monolithic 1.95 MB bundle). `DICT` (~5,459 lines), `TEXTS` (~1,076 lines), `VOCAB` (~3,153 lines), `GRAMMAR_PROFILES` (~946 lines), `GRAMMAR_UNITS` (~3,814 lines) account for most of the inline payload (the two ~15 KB base64 inline icons at L14–15 are the other notable contributors). Extracting these to fetched JSON would cut cold-start parse/compile cost and let `CACHE_NAME` bumps be asset-bucket-scoped. Trade-offs: every reader of the corpus becomes async; cuts against §1.1's "any editor can ship a change" property unless a simple build step is introduced.

**Status:** open. Would benefit from a perf measurement on iOS Safari before committing. Lower priority for German than for Spanish (German bundle is ~1.95 MB vs. Spanish's ~3.2 MB) but the same architectural shape.

### Q3. ElevenLabs as a TTS provider?

German currently has only OpenAI neural TTS + browser fallback. Adding ElevenLabs would: (a) close `PARITY_GAP.md §11.6 row 2`'s `PARTIAL`; (b) require a same-PR CSP allow-list update once §1.7 lands; (c) bring the same Spanish-side ElevenLabs-CSP lesson into German pre-emptively.

**Status:** open. Routes to Principal because the user-facing improvement (better German TTS quality, voice variety) needs Principal preference; the architectural cost is well-understood.

### Q4. Inherit Spanish's `_thematicSession*` / `_vocabTierFailures` session-demotion mechanics?

`PARITY_GAP.md §11.3 rows 7, 8` capture the absence. German lets the user pick the exercise tier explicitly via dropdown; Spanish's FSRS-driven tier-with-session-demotions is more pedagogically aggressive. Whether this is a parity gap to close or an intentional German simplification is not yet decided.

**Status:** open. Routes to Principal as a pedagogical preference question, not a pure architectural one.

### Q5. The five Open Questions in `SPEC.md` Appendix B

Numbered B-1 through B-11 in `SPEC.md`. Architecturally consequential subsets:

- **B-3 (precache filename hazard):** if confirmed P0, forces a hot-fix deploy ahead of all other parity work; gates §3.7 promotion from adopt-and-enforce to enforced.
- **B-4 (install-time `skipWaiting`):** decides whether §1.6 install-time `skipWaiting` is recorded as a German invariant or reverted.
- **B-5 (IDB mirror inheritance):** decides whether §1.3 promotes from adopt-and-enforce to a recorded ruling.
- **B-9 (sanitize convention for `ß`):** gates the §1.5 target invariant (ElevenLabs/audio pipeline) at the file-naming level.

The remaining items (B-1 hosting source, B-2 published URL, B-6/B-7/B-8 corpus translator/scope, B-10 vocab `state` field, B-11 OG tags) are operational or content questions; they affect `SPEC.md` and `PARITY_GAP.md` but not the invariants in §1.

---

## 6. Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-19 | Initial issue, derived from `SPEC.md` and `plans/PARITY_GAP.md` as of 2026-04-19 integration. §1 includes 4 invariants in `enforced` status (1.1, 1.2, 1.4-pending-reconciliation, 1.5-current-only, 1.6-current-only, 2.1, 2.2, 2.3, 2.5, 2.6, 3.5), 4 invariants in `adopt-and-enforce` status (1.3 IDB mirror, 1.5 audio pipeline target, 1.6 update-detection hardening, 1.7 meta-CSP, 3.7 precache filename integrity), 1 invariant in `provisional (decline)` status (1.3a sessionStorage), and 1 standing decline (1.4 ReviewScheduler wrapper). | Senior Dev Oversight Engineer |
| 2026-04-19 | §3.7 promoted from `adopt-and-enforce` to `enforced` following WP-DEP-G-1 live verification (confirmed P0 G-15 hazard; hot-fix commit `b7e671c`). | DevOps |
| 2026-04-19 | §1.6 promoted from provisional/adopt-and-enforce to enforced; install-time skipWaiting removed and four iOS-hardening changes folded in via WP-ARCH-G-3 (which absorbed the reverted WP-DEP-G-2 scope). | Senior Dev Oversight Engineer |
| 2026-04-19 | §1.6 Amendment 1 (WP-ARCH-G-3): `reg.update()` guarded on `reg.active` to eliminate first-install double-install race surfaced in v14 verification (Scenario A banner regression). CACHE_NAME bumped to v15. B-4 disposition unchanged. PARITY_GAP §11.7 scores unchanged. | Senior Dev Oversight Engineer |
| 2026-04-19 | §1.6 Amendment 2 (WP-ARCH-G-3): explicit `reg.update()` removed entirely — Chrome's `register()` Promise resolves after SW-1 has activated, so the `reg.active` guard from Amendment 1 still fires on first install, populating `reg.waiting` and triggering spurious banner. Per-page-load detection retained via `updateViaCache: 'none'`; mid-session detection intentionally not provided (principal-only audience). German diverges from Spanish §1.6; divergence recorded in §1.6 above. CACHE_NAME bumped to v16. PARITY_GAP §11.7 row 3 rescored MATCH→DIVERGENT (intentional, recorded). | Senior Dev Oversight Engineer |
| 2026-04-19 | §1.6 Amendment 3 (WP-ARCH-G-3): SW-lifecycle-state banner triggers (WP-DEP-G-2 #3 `reg.waiting && reg.active` and #4 `statechange`/`reg.active` guard) replaced by client-side last-seen CACHE_NAME tracking. Principal confirmed iOS symptom (a): banner on first load persists across reloads — diagnosed as iOS Safari producing spurious `reg.waiting` states. Fix: `GET_CACHE_NAME` SW message protocol + `uw_lastSeenCacheName` localStorage key. `lastSeen` updates only on `controllerchange`. §3.2 updated with key table. CACHE_NAME bumped to v18. PARITY_GAP §11.7 row 5 rescored MATCH→DIVERGENT (intentional, recorded). | Senior Dev Oversight Engineer |
| 2026-04-19 | §1.6 Amendment 4 (WP-ARCH-G-3): reverted Amendments 2 and 3; ported Spanish banner/registration IIFE pattern verbatim. `reg.update()` restored inside `window.addEventListener('load', …)` to avoid Chrome double-install race. `GET_CACHE_NAME` protocol and `uw_lastSeenCacheName`/`uw_diag_controllerchange_timeout` localStorage keys removed. `reg.waiting` cold-load check and `reg.active`-guarded statechange handler restored. Dismiss button (`✕`) added. CACHE_NAME bumped to v19. All §1.6 invariants now match Spanish §1.6. PARITY_GAP §11.7 rows 3, 5, and A1 rescored DIVERGENT→MATCH. | Senior Dev Oversight Engineer |
| 2026-04-23 | §1.4 reconciliation complete (WP-ARCH-G-2, docs-only). German FSRS confirmed as v4.5 (19 weights, exp-based `initDifficulty`, mean-reversion `nextDifficulty`); Spanish confirmed as FSRS v4 (17 weights, linear `initDifficulty`, no mean reversion — despite the Spanish comment). No convergence downgrade of German warranted. Card schema field-for-field identical; no data migration. Open item: W[17]/W[18] short-term stability formula not implemented (deferred; Cam convergence call pending). §1.4 status promoted from DIVERGENT-pending to enforced (v4.5). PARITY_GAP §11.2 row 9 DIVERGENT justification updated to verified. | Senior Dev Oversight Engineer |
| 2026-04-23 | §1.4 FSRS v4.5 complete — Cam greenlit W[17]/W[18] short-term stability formula. `_nextShortTermStability(s, rating)` added at L18777; Learning/Relearning non-Again path now uses `S × e^(W[17]×(G−3+W[18]))` instead of long-term `_nextRecallStability`. All 19 weights active. Stored card values unaffected (formula only runs on explicit `review()` call; `_load()` is pure JSON parse). CACHE_NAME bumped v28→v29. §1.4 status updated to enforced (canonical v4.5). PARITY_GAP §11.2 row 9 rescored DIVERGENT→MATCH. | Senior Dev Oversight Engineer |

---

**End of architecture document.**
