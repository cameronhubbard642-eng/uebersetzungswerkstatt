# Implementation Plan — Übersetzungswerkstatt parity work

**Author:** Senior Dev Oversight Engineer.
**Date:** 2026-04-19.
**Companion documents:**
- `SPEC.md` — German current state (descriptive baseline).
- `plans/PARITY_GAP.md` — delta vs. Spanish, scored row-by-row.
- `plans/ARCHITECTURE.md` — invariants tagged `enforced` / `adopt-and-enforce` / `provisional`; the destination state for §1 invariants this plan executes against.
- `plans/spanish-spec-reference.md` — Spanish baseline; the parity target.

**Status:** **DRAFT — pending Principal sign-off.** Phase 1 is shippable in its current form; Phase 2 contains an explicit Principal-decision blocker (audio scope) before its largest WP set runs. Phases 3 and 4 are sequenced for execution after Phase 1 lands and Phase 2's blocker resolves.

**Amendments since initial draft:**
- **2026-04-19 — B-12 resolved.** Principal confirmed `<html lang="en">` is intentional for both apps (chrome-led convention). WPs that previously depended on this decision are re-scoped: per-region `lang="de"` overrides proceed (WP-FE-G-11 acceptance criteria adjusted); manifest `lang` field value set to `"en"` (WP-FE-G-14); SW update banner copy translates to English (folded into WP-FE-G-11).
- **2026-04-19 — B-13 resolved.** Principal confirmed replication of Spanish's per-icon-theme PWA manifest system in German, with icons in repo as images. WP-FE-G-15 promoted from Phase 4 Low to Phase 2 Wave A Medium. WP-FE-G-6 scope expands to rewrite `<link rel="manifest">` href across the five per-icon manifests.
- **2026-04-24 — WP-FE-G-19 LANDED.** Grammar data-model restructure: `GRAMMAR_PROFILES` (48) + `GRAMMAR_UNITS` (34) consolidated into a single Spanish-shape `GRAMMAR_LESSONS` array with lessons distributed across units. Legacy `GRAMMAR_PROFILES` preserved as a shim (retirement deferred to WP-FE-G-24). `uw_grammarProgress` v1→v2 storage migration shim with pre-migration JSON export modal ships alongside. `CACHE_NAME` v62→v63. Per Principal ruling #4 (2026-04-23), `lessonContent.keyPoints`/`comparison`/`historicalNote` and `thematicSentences[]` land empty for Wave E content work. Serial prereq for WP-FE-G-20..24.
- **2026-04-24 — WP-FE-G-21 LANDED.** Port `renderGrammarUnitOverview(unitCat)` from Spanish: status-badged lesson cards (Abgeschlossen/In Bearbeitung/Noch nicht begonnen), prereq-hint block with German copy, prev-unit lookup via `catOrder.indexOf()`. CSS `.lesson-status` (+ `.new`/`.started`/`.mastered`). `CACHE_NAME` v45→v46. LANDED: commit `b83197e` at `werkstatt-v46`.
- **2026-04-24 — WP-FE-G-20 LANDED.** Port `renderGrammarWelcome()` + `getNextRecommendedLesson()` + `getGrammarLessonStatus()` from Spanish. Gesamtfortschritt header, 10-unit path roadmap, Weiter CTA. Old `_renderGrammarWelcome()` shim retired (body replaced with thin wrapper). `CACHE_NAME` v43→v44. `renderGrammarUnitOverview()` stubbed (WP-FE-G-21). LANDED: commit `dac3d24` at `werkstatt-v44`.
- **2026-04-24 — WP-FE-G-23 LANDED.** Port `_renderGlossedPassage(text, skipToken)` render plumbing from Spanish. Tokenizes passage text and wraps unmastered vocab with gloss tooltips, skipping the target token. `_isVocabMastered(seenKey)` implemented as read-only check of `glossSeen.words` (lean-toward-reuse per Senior Dev guidance; no write path added). German adaptations: `_escapeHtml` naming, punctuation regex verbatim (German `tokenize` already normalizes punct into separate tokens). No call site wired — plumbing only; call sites pending Phase B thematic-sentence content. `CACHE_NAME` v45→v46. LANDED: commit `werkstatt-v46`.
- **2026-04-24 — WP-FE-G-24 LANDED.** `renderGrammarStats(container, append)` German copy landed: heading "Fortschrittsübersicht", columns "Lektion" / "Wiederholung" / "Lückentext" / "Produktion". Iteration migrated from `GRAMMAR_PROFILES` shim to `GRAMMAR_LESSONS` directly. `GRAMMAR_PROFILES` shim **not retired** — remaining callers at `_getOverdueGrammarProfile` and two other render sites; `GRAMMAR_UNITS` not retired — grammar unit-system render functions still depend on it. Both shims flagged for follow-up cleanup once callers are migrated. `CACHE_NAME` v46→v47. LANDED: commit `c17cf69` at `werkstatt-v47`.
- **B-14 still pending** (audio precache strategy if WP-CON-G-1 picks option 1 or 2).

**WP-ID convention** (per Dispatch direction):
- `WP-FE-G-N` — Frontend / PWA work packages.
- `WP-CON-G-N` — Content & Audio Pipeline.
- `WP-DEP-G-N` — DevOps / Deploy.
- `WP-AUD-G-N` — Security & Performance Auditor.
- `WP-ARCH-G-N` — Cross-cutting architectural commitments owned by Senior Dev Oversight (typically with a TM as implementation lead).

**Standing constraints:**
- Copyright is OUT OF SCOPE for both apps (Principal direction 2026-04-19). No WP touches literary content or embedded translations.
- Every WP that touches `PRECACHE_URLS` or any file in it carries the `git ls-files` filename-integrity check per `ARCHITECTURE.md §3.7` — assumed in every Phase-1+ WP unless explicitly noted.
- Every WP that adds an external host MUST land in the same change as the corresponding `connect-src` allow-list update — once `WP-FE-G-2` (meta-CSP) lands. Until then, route any new host through Senior Dev for explicit review.

---

## 0. WP index

Quick-scan table. Detailed cards in §§1–4.

| ID | Phase | Title | Owner | Priority | Est. effort | Blocked-by |
|---|---|---|---|---|---|---|
| WP-DEP-G-1 | 1 | G-15 precache-filename verification + hot-fix | DevOps + Auditor | **P0 (cand.)** | <½ day verify; ≤1 day fix | — |
| WP-FE-G-1 | 1 | Establish meta Content-Security-Policy from zero | Frontend + Auditor | High | 2 days | — |
| WP-DEP-G-2 | 1 | SW iOS update-detection hardening | DevOps | High | ~~1 day~~ | **CLOSED-BY-ABSORPTION** into WP-ARCH-G-3 |
| WP-AUD-G-1 | 1 | Three small security fixes (Gemini header auth, sync-import apiKey refusal, SW provider-cache exemption) | Auditor + Frontend | High | 1 day | — |
| WP-CON-G-1 | 2 | **Decision** — German audio pipeline scope | Principal (decision); Senior Dev (write-up) | Blocker | <½ day after Principal call | — |
| WP-FE-G-2 | 2 | Persist `glossSeen` + walk `DICT.lemma` chain | Frontend | High | 2 days | WP-FE-G-3 (envelope) |
| WP-FE-G-3 | 2 | Export/import envelope parity with Spanish v2 | Frontend + Auditor | High | 2 days | — |
| WP-FE-G-4 | 2 | Modal accessibility (`role="dialog"`, focus trap, Escape) | Frontend + QA | High | 2 days | — |
| WP-FE-G-5 | 2 | Reset confirmation overlay (replaces native `confirm()`) | Frontend | Medium | ½ day | WP-FE-G-4 (uses dialog/trap pattern) |
| WP-FE-G-6 | 2 | Pre-paint icon apply via head-inline script (incl. `<link rel="manifest">` rewriting per B-13) | Frontend | Medium | 1 day | WP-FE-G-15 (needs per-icon manifests to rewrite against) |
| WP-FE-G-7 | 2 | Mobile bottom tab bar + persistent mobile header | Frontend + QA | Medium | 3 days | — |
| WP-FE-G-8 | 2 | Due-review banners for vocab and grammar modes | Frontend | Medium | 1 day | WP-FE-G-3 |
| WP-FE-G-9 | 2 | Author-tab ↔ welcome-copy reconciliation | Frontend + Content | Low | ¼ day | Principal decision (Appendix B #B-7/8 in `SPEC.md`) |
| WP-FE-G-15 | 2 | Per-icon-theme PWA manifest variants (5 manifests + 5 PNG icon sets) | Frontend | Medium | 2 days | — |
| WP-CON-G-2 | 2 | Audio toolchain (generator scripts + manifest builder + sanitize helper) | Content & Audio | High *(if WP-CON-G-1 greenlights)* | 1–2 weeks | WP-CON-G-1 |
| WP-CON-G-3 | 2 | Pre-generate audio for all passages, grammar units, and vocab | Content & Audio | High *(if WP-CON-G-1 greenlights)* | 2–3 weeks (mostly batch runtime) | WP-CON-G-2; Appendix B #B-9 (`ß` decision) |
| WP-FE-G-10 | 2 | `AudioCache` + 3-tier playback wiring | Frontend | High *(if WP-CON-G-1 greenlights)* | 3 days | WP-CON-G-2 |
| WP-DEP-G-3 | 2 | SW precache + `CACHE_NAME` discipline for audio tree | DevOps | High *(if WP-CON-G-1 greenlights)* | 1 day | WP-CON-G-3 |
| WP-CON-G-4 | 2 | ElevenLabs as second neural-TTS provider (parity with Spanish) | Frontend + Auditor | Medium *(if Principal greenlights — Open Q3)* | 2 days | WP-FE-G-1 (CSP must land first) |
| WP-ARCH-G-1 | 3 | IndexedDB mirror (`WerkstattIDB`) + `_restoreFromIDB()` | Frontend (impl); Senior Dev (schema) | High | 3 days | WP-FE-G-3 (envelope shape settled first) |
| WP-ARCH-G-2 | 3 | FSRS version reconciliation (19 weights vs. 17) | Senior Dev | Medium | 1 day | **CLOSED** (2026-04-23, docs-only) |
| WP-ARCH-G-3 | 3→1 | Install-time `skipWaiting` decision + absorption of WP-DEP-G-2 scope | Senior Dev (decision); DevOps (impl) | Medium | 1 day | **CLOSED** (2026-04-19) |
| WP-AUD-G-2 | 4 | LLM-output XSS audit — line-by-line `_escapeHtml` verification | Auditor + Frontend | Medium | 1 day | WP-FE-G-1 |
| WP-FE-G-11 | 4 | Per-region `lang="de"` overrides + semantic landmarks + SW-banner English translation | Frontend | Medium | ½ day | — (B-12 resolved 2026-04-19) |
| WP-FE-G-12 | 4 | Referrer-Policy + Permissions-Policy meta tags | Frontend + Auditor | Low | ½ day | WP-FE-G-1 |
| WP-FE-G-13 | 4 | Production console-log scrub (12 sites) | Frontend | Low | ½ day | — |
| WP-FE-G-14 | 4 | Manifest `lang: "en"` and `orientation` fields | Frontend | Low | ¼ day | — (B-12 resolved 2026-04-19) |
| WP-FE-G-16 | 4 | `_escapeHtml` perf rewrite (DOM→pure-string) | Frontend | Low | ½ day | — |
| WP-FE-G-17 | 4 | Remove `uw_uw_vocabProgress` migration shim | Frontend | Low | ¼ day | Deprecation-window calendar |
| WP-DEP-G-4 | 4 | GitHub Actions pre-deploy smoke test | DevOps | Medium | 2 days | **CLOSED** (shipped commit `3fcb607`) |
| WP-DEP-G-5 | 4 | Post-deploy verification (`CACHE_NAME` parity probe) | DevOps | Medium | 1 day | **CLOSED** (shipped commit `18202fc`; probe URL migration flagged follow-up post-WP-DEP-G-8) |
| WP-DEP-G-6 | 4 | Deploy + rollback runbook | DevOps | Low | ½ day | **CLOSED** (shipped commit `cf27ce8`; amended by WP-DEP-G-8 for CF Pages sections) |
| WP-DEP-G-7 | 4 | `.DS_Store` cleanup + `.gitignore` rule | DevOps | Low | ¼ day | — |
| WP-DEP-G-8 | 4 | Hosting migration: GitHub Pages → Cloudflare Pages (CSP header delivery, CSP reporting, manifest scope/start_url, `_headers`) | DevOps | Medium | 1 day | **CLOSED** (2026-04-24, cutover commit) |
| WP-ARCH-G-4 | 4 | LLM-key proxy decision (and implementation if Principal accepts) | Senior Dev (decision); Principal | Med–High | 1 week if greenlighted | Appendix B Q1 |

Total: 31 WPs across 4 phases. Phase 1: 4 WPs, ≤1 week aggregate. Phase 2: 15 WPs (10 of which gate on `WP-CON-G-1`'s audio-scope decision; WP-FE-G-15 added 2026-04-19 per B-13). Phase 3: 3 WPs. Phase 4: 12 WPs (WP-DEP-G-8 added 2026-04-24).

---

## 1. Phase 1 — Foundational fixes

**Goal:** ship the four highest-leverage, smallest-blast-radius fixes the spec pass surfaced. Phase 1 is intentionally tight — every WP individually shippable, no inter-WP blocking dependencies, total aggregate ~1 week. Phase 2 should not begin until Phase 1 lands because the meta-CSP (WP-FE-G-1) and the iOS update detection (WP-DEP-G-2) shape downstream WPs.

### WP-DEP-G-1 — G-15 precache-filename verification + hot-fix

**Owner:** DevOps, with Auditor cross-check on the verification call.
**Source rows:** `SPEC.md §10 G-15`; `PARITY_GAP.md §11.7 supplementary A8`; `SPEC.md` Appendix B #B-3; `ARCHITECTURE.md §3.7`.
**Priority:** **P0 candidate.** If the live verification confirms the 404, this is the only Critical issue surfaced by the spec pass and forces a hot-fix deploy ahead of every other parity item.

**Step 1 — verify (≤30 min).** From a clean network, run `curl -I https://<deployed-url>/German-Icon-I.jpeg` and `curl -I https://<deployed-url>/German%20Icon%20I.jpeg`. Record HTTP status for each. (URL confirmation is `SPEC.md` Appendix B #B-2; if Principal hasn't confirmed, infer `https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/`.)

**Step 2 — branch on the result:**

- **If both forms 200:** GitHub Pages silently aliases. No hot-fix required. Document the alias behavior in `SPEC.md §10 G-15` as confirmed-not-broken; promote `ARCHITECTURE.md §3.7` from `adopt-and-enforce` to `enforced` with the "git ls-files" rule remaining in force. Close WP.
- **If hyphenated 404 / spaced 200:** SW v10 install has been failing atomically for new visitors since `f79e45c`. Hot-fix: in a single commit, normalize the precache list to match tracked filenames (rename `sw.js:6–14` entries to `'German Icon I.jpeg'` etc.; URL-encode-friendly is acceptable since SW fetch handles URL encoding) and bump `CACHE_NAME` to `werkstatt-v11`. Push to `main`. Verify post-deploy via `curl -I https://<url>/sw.js | grep CACHE_NAME` plus a fresh-incognito SW-install test on iOS Safari.
- **If hyphenated 200 / spaced 404:** the deploy is somehow serving the untracked hyphenated copies (highly unlikely on GitHub Pages, which only serves tracked files). Investigate before any other action.

**Exit criteria:**
- Verification status recorded in `SPEC.md §10 G-15` with the live HTTP-response evidence.
- If hot-fix needed: SW v11 deployed, fresh-install confirmed on iOS Safari and a desktop browser, no console errors at install time.
- `ARCHITECTURE.md §3.7` promoted to `enforced` and §6 change log updated.

**Coupling.** Pair with the dead-precache-JPEG cleanup (`SPEC.md §10 G-6`) only if the hot-fix branch lands — do not let cleanup scope-creep block the verification call. If verification is "no fix needed", G-6 cleanup runs in Phase 4 as a separate low-priority WP.

**Notes.** This is the only WP in the entire plan that could trigger a same-day deploy. Treat it accordingly: a single committer, no batched changes.

### WP-FE-G-1 — Establish meta Content-Security-Policy from zero

**Owner:** Frontend (implementation); Auditor (allow-list audit + on-device validation).
**Source rows:** `SPEC.md §10 G-1`; `SPEC.md §7.3.2`; `PARITY_GAP.md §11.6 row 3`; `ARCHITECTURE.md §1.7`; Appendix C C-G1.
**Priority:** High. Closes the single highest-leverage architectural gap.

**Scope.** Author the first German `<meta http-equiv="Content-Security-Policy" content="…">` immediately after the `<title>` at L6 of `index.html`. Allow-list (matching the call inventory in `SPEC.md §7.3.1`):

```
default-src 'self';
script-src 'self' 'unsafe-inline';                                                  /* required by §1.1 monolithic-bundle architecture */
style-src 'self' 'unsafe-inline';                                                   /* required by §6.2 inline <style> block */
img-src 'self' data: blob:;                                                          /* base64 icon data URIs at L14, L15, L4029+ */
media-src 'self' blob:;                                                              /* OpenAI TTS Blob playback */
connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com;
manifest-src 'self';
form-action 'none';
base-uri 'self';
frame-ancestors 'none';
```

**Process.**

1. Frontend ships the meta CSP under `Content-Security-Policy-Report-Only` first (Auditor recommendation per Appendix C C-G1) — landed in a single commit, `CACHE_NAME` bumped, no functional change.
2. Auditor exercises every code path on iOS Safari + desktop Chrome/Safari/Firefox; collects any browser console violations.
3. Adjust allow-list per violations (most likely candidates: a missing `data:` somewhere; possible `font-src` if a system font triggers it).
4. Promote to `Content-Security-Policy` (enforcing) in a follow-up commit + `CACHE_NAME` bump.

**Exit criteria:**
- Meta CSP present in `index.html` head (enforcing).
- Auditor sign-off: every code path exercised on iOS Safari + one desktop browser without policy violations.
- `ARCHITECTURE.md §1.7` promoted from `adopt-and-enforce` to `enforced`; §6 change log updated.
- `PARITY_GAP.md §11.6 row 3` rescored to `MATCH` (with a note: German now has parity-with-architecture; the Spanish ElevenLabs-omission lesson is preserved as a future-phase reminder).

**Cross-team note.** Spanish's ElevenLabs CSP fix landed in their Phase 1 (Dispatch heads-up 2026-04-19). German does not share that fix because German has no ElevenLabs (yet) and no CSP (until this WP). When Spanish's allow-list is finalized, cross-reference to this WP for parity-shaped consistency.

### WP-DEP-G-2 — SW iOS update-detection hardening

**Status: CLOSED-BY-ABSORPTION into WP-ARCH-G-3 (2026-04-19).**

WP-DEP-G-2 was originally planned as a standalone Phase-1 WP. It was implemented (`0b813ee`), then reverted (`ac2b6d2`) when the four hardening changes — layered on top of the unresolved install-time `skipWaiting` — broke Cam's banner-click flow (the install-time `skipWaiting` was causing the new SW to activate immediately, removing `reg.waiting` before the user could click the banner).

WP-ARCH-G-3 resolved the underlying architectural question (Appendix B #B-4, Option A: remove install-time `skipWaiting`) and absorbed the four WP-DEP-G-2 hardening changes in the same commit. All four changes land unchanged; the `&& reg.active` qualifier on the registration-time `reg.waiting` check is a refinement over the original WP-DEP-G-2 spec (the original had bare `if (reg.waiting)`).

**~~Note.~~ Superseded.** ~~This WP is independent of the install-time `skipWaiting` decision (Appendix B #B-4 / `WP-ARCH-G-3`); the four changes here are pure-additive hardening regardless of how B-4 resolves.~~ This independence claim was incorrect in retrospect: the four changes required Option A as a precondition. WP-ARCH-G-3 is the correct vehicle and the two WPs were properly merged.

### WP-AUD-G-1 — Three small security fixes

**Owner:** Auditor (specs); Frontend (implementation).
**Source rows:** `SPEC.md §10 G-3` (Gemini key in URL), `G-4` (sync-import key injection), `G-5` (SW provider-cache exemption); Appendix C C-G2, C-G3, C-G5.
**Priority:** High. Three discrete fixes that batch cleanly into one PR.

**Scope.**

1. **G-3 — Gemini header auth.** At `index.html:19838–19839`, switch from `?key=${this.apiKey}` query-string to `'x-goog-api-key': this.apiKey` request header. Remove the key from the URL. Verify the request still succeeds against a real Gemini key. (This unblocks G-3 from also being a `Referer`-leak / SW-cache-key-leak vector.)
2. **G-4 — sync-import `apiKey` refusal.** At `index.html:20803–20806`, delete the apiKey-merge branch entirely. The export already omits `apiKey`; making import refuse it closes the "hostile sync file injects a key" vector. Update `SPEC.md §4.3.4` to remove the `apiKey` line from the merge-rules list.
3. **G-5 — SW provider-cache exemption.** In `sw.js:38–51`, in the network-first branch, add a host check: if `url.hostname` is `api.anthropic.com`, `api.openai.com` (chat path only — `/v1/chat/completions`), or `generativelanguage.googleapis.com`, do `fetch(event.request)` and return the response *without* the `caches.put` write-through. Keep TTS blob caching for `api.openai.com/v1/audio/speech` (it is load-bearing for the offline-second-listen pattern noted in `_ttsCache`).

Bump `CACHE_NAME` once for the SW change. The `index.html` changes ride the same commit + bump.

**Exit criteria:**
- All three changes applied; verified by Auditor (Gemini header request succeeds; import path refuses `apiKey`; CacheStorage in DevTools shows no Anthropic/OpenAI-chat/Gemini bodies after a chat round-trip).
- `SPEC.md §10 G-3 / G-4 / G-5` marked closed (with commit reference).
- `PARITY_GAP.md` does not change here (these are German-specific tech-debt items, not parity rows), but `SPEC.md §10` table updated.

**Note.** This WP intentionally bundles three fixes that share the same review surface. Splitting them costs more in review overhead than it saves in blast-radius isolation.

---

## 2. Phase 2 — Parity feature ports

**Goal:** close the bulk of `PARITY_GAP.md`'s `MISSING` and `PARTIAL` rows. Phase 2 has one Principal-decision blocker (`WP-CON-G-1` — audio scope) before its largest WP cluster runs, but the non-audio parity work proceeds in parallel.

**Sequencing within Phase 2:**

- **Wave A (no blockers, run in parallel):** `WP-FE-G-3` (envelope parity), `WP-FE-G-4` (modal a11y), `WP-FE-G-7` (mobile bottom bar), `WP-FE-G-9` (author-tab copy reconciliation if Principal answers Appendix B #B-7/B-8), `WP-FE-G-15` (per-icon manifests — added per B-13 resolution 2026-04-19).
- **Wave B (depends on Wave A):** `WP-FE-G-2` (glossSeen — depends on `WP-FE-G-3`'s envelope work), `WP-FE-G-5` (reset overlay — uses `WP-FE-G-4`'s dialog/trap pattern), `WP-FE-G-6` (pre-paint icon — depends on WP-FE-G-15's per-icon manifests existing), `WP-FE-G-8` (review banners — depends on `WP-FE-G-3`).
- **Wave C (gated on `WP-CON-G-1` greenlight):** `WP-CON-G-2`, `WP-CON-G-3`, `WP-FE-G-10`, `WP-DEP-G-3` — the audio-pipeline cluster.
- **Wave D (gated on Principal Q3):** `WP-CON-G-4` (ElevenLabs), depends on `WP-FE-G-1`.

### WP-CON-G-1 — Decision: German audio pipeline scope (BLOCKER)

**Owner:** Principal (decision); Senior Dev Oversight (write-up + downstream WP gating).
**Source rows:** `PARITY_GAP.md §11.4 rows 12–18, 20`; `SPEC.md §5.1.5, §5.1.6, §5.2.1`; `SPEC.md` Appendix B #B-9 (sanitize convention for `ß`); `ARCHITECTURE.md §1.5`.
**Priority:** Blocker for Wave C of Phase 2. Phase 2 Waves A/B/D do not depend on this.

**Decision required.** Three options:

1. **Build the pipeline at parity with Spanish.** Adopt Spanish's three-tier audio chain (`AudioCache.tryPregenerated → neural TTS → speechSynthesis`), Spanish's `audio/manifest.json` shape, Spanish's `sanitize()` rule extended for German diacritics. Triggers `WP-CON-G-2`, `WP-CON-G-3`, `WP-FE-G-10`, `WP-DEP-G-3`. Estimated total effort: 4–6 weeks. Cost: significant; benefit: closes ~10 `MISSING` rows in §11.4 and brings German offline TTS quality to Spanish parity.
2. **Build a smaller pipeline (passages only, no per-vocab/per-grammar audio).** Same architectural shape, smaller corpus. Reduces effort to ~2–3 weeks. Closes the same `MISSING` rows for translation, leaves vocab/grammar at runtime-TTS only.
3. **Decline the pipeline.** Declare the two-tier runtime-TTS posture intentional. The §11.4 audio-pipeline rows flip from `MISSING` to `DIVERGENT (intentional simplification)` in `PARITY_GAP.md`. `ARCHITECTURE.md §1.5` "target invariant" is dropped; the current two-tier chain is the permanent invariant. Phase 2 Wave C is removed from the plan.

**Sub-decision required regardless of which option Principal picks (`SPEC.md` Appendix B #B-9):** if a pipeline is built, does `sanitize()` preserve `ß` (extend the regex to `[^a-z0-9\u00c0-\u024f\u00df]+`) or transliterate it (`ß → ss` before sanitize runs)? Recommendation: preserve, for round-trip fidelity with `DICT` keys.

**Exit criteria:**
- Principal decision recorded in `SPEC.md` Appendix B #B-9 and (if option 1 or 2) `ARCHITECTURE.md §1.5`.
- If option 3: `PARITY_GAP.md §11.4` audio-pipeline rows rescored to `DIVERGENT`; Wave C WPs removed from this plan; `WP-CON-G-1` closes.
- If option 1 or 2: Wave C WPs scoped against the chosen scope; sanitize convention recorded.

### WP-FE-G-2 — Persist `glossSeen` + walk `DICT.lemma` chain

**Owner:** Frontend.
**Source rows:** `SPEC.md §3.2`; `PARITY_GAP.md §11.4 rows 4, 5`; `SPEC.md` Appendix A FE-G-2.
**Priority:** High. Closes a user-visible behavioral regression vs. Spanish (re-reading a passage after reload re-glosses every word).
**Depends on:** `WP-FE-G-3` (envelope shape settled before adding new export-eligible key).

**Scope.**

1. Introduce `uw_glossSeen` as a new `localStorage` key (shape: `{ words: { [lowercased-word]: true } }`).
2. In the per-render `seen` map at `index.html:19558, L19614–19620`, when marking a word seen, also walk `DICT[word.toLowerCase()]?.lemma` (if present) and mark the lemma as seen too — closes `PARITY_GAP.md §11.4 row 4` (lemma-chain walk).
3. Serialize on mutation; deserialize in constructor; flush on successful Evaluate (parallel to Spanish's `_flushGlossSeen` discipline).
4. Add a "Reset automatic glossing" button to the Settings modal (next to "Reset All Progress") that clears `uw_glossSeen`.
5. Update SPEC §3.2 corpus-driven note: glossing now keys on lemma + surface form; persists across sessions.
6. Add `glossSeen` to the export envelope when `WP-FE-G-3` lands (coordinate the field-list change).

**Exit criteria:**
- `uw_glossSeen` present in `SPEC.md §4.2.1` table; key persists, restores, and resets correctly.
- `PARITY_GAP.md §11.4 rows 4, 5` rescored to `MATCH`; §11.3 row 6 inline-glossing portion rescored to `MATCH`.
- `customTexts`-imported texts share the `glossSeen` namespace.

### WP-FE-G-3 — Export/import envelope parity with Spanish v2

**Owner:** Frontend; Auditor reviews the security delta.
**Source rows:** `SPEC.md §4.3`; `PARITY_GAP.md §11.2 rows 5, 6`; `SPEC.md` Appendix A FE-G-6.
**Priority:** High. Closes a security risk (sync-file `apiKey` injection, partly addressed in WP-AUD-G-1) and a data-fidelity regression (FSRS state and history not carried across devices).

**Scope.**

1. Bump envelope `_version` from `1` to `2` (`exportProgress` at L20749 and `importProgress` at L20774).
2. Add fields to `exportProgress` payload at L20750–20759: `translationHistory`, `fsrsState`, `activeTime`, `statsAssessment`, `glossSeen` (when WP-FE-G-2 lands).
3. Add per-section merge rules to `importProgress` for the new fields. For `fsrsState`: per-card recency-based merge (newer `lastReview` wins). For `translationHistory`: append-and-dedupe-by-`(date, exerciseId)`. For `activeTime`: per-day sum (or max — pick the conservative read; Spanish does max). For `statsAssessment`: import-overrides if `timestamp` is newer.
4. Add `_version` warning path: if `data._version > 2`, surface a "this file was created by a newer app version, some fields may be ignored" message in `#sync-status`. If `data._version === 1`, accept without warning (back-compat).
5. Confirm `apiKey` is not in the export payload (already true) and not handled on import (closed by `WP-AUD-G-1`).

**Exit criteria:**
- `_version: 2` envelope round-trips lossless across export → import.
- `SPEC.md §4.3.3` and `§4.3.4` updated.
- `PARITY_GAP.md §11.2 rows 5, 6` rescored to `MATCH`.

**Cross-team dependency.** Spanish team's envelope is at `_version: 2`; cross-check that German's field shapes match Spanish's exactly for the four added fields. If shapes drift, an exported-from-German file may not import cleanly into Spanish (and vice versa) — this matters if Cam ever wants to sync between the two.

### WP-FE-G-4 — Modal accessibility (`role="dialog"`, focus trap, Escape handler)

**Owner:** Frontend; QA Lead reviews for WCAG conformance.
**Source rows:** `SPEC.md §6.4`; `PARITY_GAP.md §11.5 row 6`; `SPEC.md` Appendix A FE-G-4.
**Priority:** High. WCAG 2.1 AA affected.

**Scope.** All four modals (`#settings-modal`, `#import-modal`, `#stats-modal`, `#sync-modal`):

1. Add `role="dialog" aria-modal="true" aria-labelledby="<modal-title-id>"` to each `<div class="modal">`.
2. In `App.init()`, add a `document`-level `keydown` handler that (a) closes the visible modal on Escape, (b) traps Tab inside the visible modal (focus on first focusable when entering, wrap on first/last).
3. In `openSettings` (L20658), `openImport` (L20863), `openSync` (L20739) — and add `openStats` if not present — store `document.activeElement` as `_<name>FocusOrigin`. In each `close*` method, restore focus to `_<name>FocusOrigin`.
4. Confirm with a screen-reader walk on iOS VoiceOver and desktop NVDA/VoiceOver.

**Exit criteria:**
- All four modals: `role="dialog"`, focus trap, Escape closes, focus returns on close.
- `PARITY_GAP.md §11.5 row 6` rescored to `MATCH`.
- QA sign-off on screen-reader walk.

**Note.** Pair this with `WP-FE-G-5` so the same dialog/trap pattern is exercised once for the four existing modals plus the new reset-confirm overlay.

### WP-FE-G-5 — Reset confirmation overlay

**Owner:** Frontend.
**Source rows:** `SPEC.md §3.6, §3.8, §9.5`; `PARITY_GAP.md §11.3 rows 10, 14`; `SPEC.md` Appendix A FE-G-10.
**Priority:** Medium.
**Depends on:** `WP-FE-G-4` (uses the dialog/trap pattern).

**Scope.** Add a `#reset-confirm-overlay` modal markup at the end of `<body>`, parallel to Spanish's. Replace the native `confirm("Reset all progress?…")` at L20725 with a styled modal that uses the dialog/trap pattern from WP-FE-G-4. Two buttons: "Abbrechen" (cancel) and "Zurücksetzen" (confirm reset; destructive style). Also fix the FSRS-state-not-cleared divergence noted in `SPEC.md §4.3.6` — clear `uw_fsrsState` as part of the reset (matches Spanish `_doReset` semantics).

**Exit criteria:**
- Native `confirm()` removed from L20725; styled overlay replaces it.
- FSRS state cleared on reset.
- `PARITY_GAP.md §11.3 row 14` rescored to `MATCH`; row 10 reset-progress portion rescored to `MATCH`; §11.2 row 8 rescored to `MATCH`.

### WP-FE-G-6 — Pre-paint icon apply via head-inline script

**Owner:** Frontend.
**Source rows:** `SPEC.md §9.4`; `PARITY_GAP.md §11.1 row 5, §11.8 row 2`; `SPEC.md` Appendix A FE-G-8.
**Priority:** Medium.
**Depends on:** WP-FE-G-15 (per-icon manifests must exist for the head script to point `<link rel="manifest">` at them; B-13 resolution 2026-04-19 expanded scope to include manifest rewriting).

**Scope.** Add a ~12–15-line `<script>` block in `<head>` immediately before the manifest `<link>` at L13. Read `localStorage.getItem("uw_appIcon") || "1"`. Rewrite three `<link>` `href` attributes pre-paint:

1. `<link rel="manifest">` (L13) → `manifest-{N}.json`.
2. `<link rel="apple-touch-icon">` (L14) → `apple-touch-icon-{N}.png` (or whichever per-icon path WP-FE-G-15 chooses).
3. `<link rel="icon">` (L15) → favicon path per the chosen icon.

This matches Spanish's pre-paint script pattern. The base64 data URIs currently inlined at L14–L15 can be removed once disk PNGs land via WP-FE-G-15.

**Exit criteria:**
- Cold-load icon flash eliminated for non-default icon selections.
- All three `<link>` hrefs rewritten before first paint.
- `PARITY_GAP.md §11.1 row 5` and `§11.8 row 2` rescored to `MATCH`.

### WP-FE-G-7 — Mobile bottom tab bar + persistent mobile header

**Owner:** Frontend; QA Lead reviews for usability on iOS Safari.
**Source rows:** `SPEC.md §3.1, §6.1`; `PARITY_GAP.md §11.3 row 2, §11.5 row 5`.
**Priority:** Medium. Largest non-audio Phase-2 UX work.

**Scope.**

1. Add `#mobile-tab-bar` markup at the end of `<body>` (parallel to Spanish), shown on `max-width: 767px`. Four buttons matching `#mode-switcher`. Both dispatch through `App.switchMode(mode)` (no logic duplication).
2. Add a 48-px persistent mobile header bar with hamburger (`#mobile-menu-btn`, currently floating at L3892) + app title.
3. Adjust `#main` padding to account for the new top header and bottom tab bar (use `env(safe-area-inset-bottom)` for the bottom bar — matters on iOS notch devices).
4. Update CSS responsive breakpoints — coordinate with `WP-FE-G-?` if breakpoint consolidation is scoped (currently it is not — see §9 Deferred).

**Exit criteria:**
- Mobile experience matches Spanish at the chrome level (header + bottom bar + drawer).
- Touch targets 44×44 px (validates `PARITY_GAP.md §11.5 row 4` partial).
- `PARITY_GAP.md §11.3 row 2` rescored to `MATCH`; row 5 partial portion of §11.5 promoted to `MATCH`.

### WP-FE-G-8 — Due-review banners for vocab and grammar modes

**Owner:** Frontend.
**Source rows:** `SPEC.md §3.4`; `PARITY_GAP.md §11.3 rows 8, 14`.
**Priority:** Medium.
**Depends on:** none for the banner DOM; coordinates with `WP-FE-G-3` if the banner reads from any new export-eligible key.

**Scope.** Add `_injectReviewBanner(mode)` method and corresponding DOM element shown atop `#vocab-content` and `#grammar-content` when `FSRS.getOverdueKeys().filter(k => k.startsWith("vocab_"|"grammar_"))` returns ≥1 due item. Banner has copy ("X Wörter / Übungen zur Wiederholung fällig"), a "Jetzt wiederholen" button that triggers `startVocabReview()` / `startGrammarReview()`, and a dismiss control.

While in the area: replace the `startGrammarReview()` stub at L21543 (currently displays an alert with the count) with a complete review session that walks the overdue grammar items in the FSRS-prioritized order. Comment at L21548 (`"full review queue will be built by UX Implementer (Feature 3/4)"`) is finally retired.

**Exit criteria:**
- Banners surface in both modes when overdue items exist.
- `startGrammarReview` is no longer a stub.
- `PARITY_GAP.md §11.3 row 8` portion on review-banner rescored to `MATCH`; review-session portion rescored to `MATCH`; §11.3 row 14 review-entries portion rescored to `MATCH`.

### WP-FE-G-9 — Author-tab ↔ welcome-copy reconciliation

**Owner:** Frontend (implementation); Content (corpus decision); Principal (scope decision via Appendix B #B-7/B-8).
**Source rows:** `SPEC.md §3.2`; `SPEC.md` Appendix A FE-G-11; `SPEC.md` Appendix B #B-7, #B-8.
**Priority:** Low.

**Scope.** Welcome copy at L3940 references *Philosophische Untersuchungen*; the author tab strip at L3905–3909 ships only TLP / Freud / Nietzsche. Two paths:

- **If Principal decides to add PU corpus:** Content drafts a PU corpus shape; Frontend adds the tab. Significant content scope (out of Phase 2 unless a small selection is the target).
- **If Principal trims the copy:** one-line change at L3940. ¼ day.

**Exit criteria:**
- Welcome copy and author tab strip agree.
- `SPEC.md` Appendix B #B-7, #B-8 marked closed.

### WP-FE-G-15 — Per-icon-theme PWA manifest variants (5 manifests + 5 PNG icon sets)

**Owner:** Frontend.
**Source rows:** `PARITY_GAP.md §11.1 row 4`; `SPEC.md §6.2, §9.4`; `SPEC.md` Appendix A FE-G-9; `SPEC.md` Appendix B #B-13 (resolved 2026-04-19).
**Priority:** Medium. Promoted from Phase 4 Low per Principal direction (B-13 resolution).
**Depends on:** none. Wave A.

**Scope.**

1. Author five `manifest-1.json` … `manifest-5.json` at the repo root, parallel to Spanish. Each manifest carries `name` / `short_name` / `description` / `start_url` / `display` / `background_color` / `theme_color` (per-icon `theme_color` may differ to match the icon palette) / `icons` array referencing per-icon PNG sets. Inherit `lang: "en"` and `orientation: "any"` from WP-FE-G-14 if it lands first; otherwise set them here and remove the dup from WP-FE-G-14.
2. Generate five PNG icon sets at the standard PWA sizes: per-icon `apple-touch-icon-{N}.png` (180×180), `icon-{N}-192.png` (192×192), `icon-{N}-512.png` (512×512), and (recommended) `icon-{N}-favicon.png` (32×32). Spanish's set also includes maskable variants — adopt the same coverage. Source artwork is in the repo as `German Icon I.jpeg`…`German Icon V.jpeg` (the tracked space-separated copies — see `SPEC.md §10 G-15` for the filename hazard now scheduled to close in WP-DEP-G-1).
3. Promote `_applyAppIcon` (L20650) to also rewrite `<link rel="manifest">` href to `manifest-{N}.json`, in addition to its current `apple-touch-icon` / `icon` rewrites. Coordinate with WP-FE-G-6 so the pre-paint script and the post-load `_applyAppIcon` agree on the rewriting target.
4. Decide whether to retire the inline base64 icon data at L14–L15 (recommend: yes — once disk PNGs land, the inline data is dead weight; coordinate with WP-FE-G-6's pre-paint script which will rewrite href to disk paths). Coupled cleanup with `SPEC.md §10 G-7` (monolithic-bundle perf) at the margin.
5. Bump `CACHE_NAME` for the deploy. Add the five new manifests + per-icon PNG sets to `sw.js` `PRECACHE_URLS` per `ARCHITECTURE.md §3.7` (verify each tracked filename via `git ls-files`).

**Exit criteria:**
- Five `manifest-{N}.json` present at repo root; each references its own per-icon PNG set.
- Five per-icon PNG sets present at the standard PWA sizes (+ maskable variants per Spanish).
- `_applyAppIcon` rewrites all three `<link>` hrefs (manifest + apple-touch-icon + icon).
- Switching app-icon in Settings changes the PWA install icon, splash screen background, and `theme_color` per the chosen theme.
- `PARITY_GAP.md §11.1 row 4` rescored to `MATCH`.
- `SPEC.md §3.6, §6.2, §9.4` updated to describe the per-icon manifest system; the "Spanish ships per-icon manifests; German ships one" framing rewritten.

**Cross-team note.** Spanish has the per-icon manifest system today; German is porting. If Spanish makes any manifest-shape changes during this WP's implementation window, coordinate so the German manifests adopt the same shape — minimizes future divergence.

### WP-CON-G-2 — Audio toolchain (gated on WP-CON-G-1 greenlight)

**Owner:** Content & Audio Pipeline.
**Source rows:** `PARITY_GAP.md §11.4 rows 12–18`; `SPEC.md §5.2.1`.
**Priority:** High *(if WP-CON-G-1 greenlights options 1 or 2)*. Skip entirely if option 3.
**Depends on:** WP-CON-G-1.

**Scope.** Author the German equivalent of Spanish's pre-generation toolchain:

1. Generator scripts that take `TEXTS` / `VOCAB` / `GRAMMAR_PROFILES` / `GRAMMAR_UNITS` and emit per-sentence/per-word/per-cell prompt lists.
2. ElevenLabs (or whichever neural TTS Cam picks for pre-generation — same provider as the runtime fallback or a different one) integration that batches the prompts and writes mp3s to `audio/translation/`, `audio/vocab/`, `audio/grammar/` per Spanish's directory layout.
3. `sanitize()` helper in JS that matches the chosen convention from `WP-CON-G-1`'s sub-decision (extends Spanish's regex to preserve or transliterate `ß`).
4. `audio/manifest.json` builder that walks the audio tree and emits the flat `{ "<path>": true }` index.
5. Integrity check: every `TEXTS[textId].exercises[i]` entry has a corresponding manifest entry; every grammar unit / vocab batch has audio coverage as scoped.

**Exit criteria:**
- Toolchain runs end-to-end against the current `TEXTS` / `VOCAB` / `GRAMMAR_PROFILES` and produces a deterministic audio tree + manifest.
- `sanitize()` round-trips `ä/ö/ü` (and `ß` per Principal's decision) verbatim.
- `SPEC.md §5.2.1` updated; `ARCHITECTURE.md §1.5` "target invariant" notes the chosen sanitize regex.

### WP-CON-G-3 — Pre-generate audio for all passages, grammar units, and vocab (gated)

**Owner:** Content & Audio Pipeline.
**Source rows:** `PARITY_GAP.md §11.4 row 14`.
**Priority:** High *(conditional)*. Skip if WP-CON-G-1 picks option 3.
**Depends on:** WP-CON-G-2.

**Scope.** Run the toolchain. Estimated mp3 count if option 1 (full Spanish parity): ~5,500 (Spanish's count) plus or minus per-corpus-shape differences. If option 2 (passages only): ~733 mp3s. Output lands in `audio/`. Cost-monitor the ElevenLabs (or chosen) API spend — Spanish's pre-generation cost is the comparable baseline.

**Exit criteria:**
- `audio/` tree complete; `audio/manifest.json` lists every file; integrity check passes.
- `PARITY_GAP.md §11.4 row 14` rescored to `MATCH` (option 1) or `PARTIAL` with explicit-scope note (option 2).

### WP-FE-G-10 — `AudioCache` + 3-tier playback wiring (gated)

**Owner:** Frontend.
**Source rows:** `PARITY_GAP.md §11.1 row 7, §11.2 row 10, §11.4 rows 12, 13, 15, 17`; `ARCHITECTURE.md §1.5`.
**Priority:** High *(conditional)*. Skip if WP-CON-G-1 picks option 3.
**Depends on:** WP-CON-G-2 (manifest) and WP-CON-G-3 (audio tree on disk).

**Scope.** Port Spanish's `AudioCache` IIFE into German `index.html`: loads `audio/manifest.json`; offers `vocabKey`, `translationKey`, `grammarKey` sanitized path helpers and `tryPregenerated(key)` playback with promise-based fallback signal. Insert the `tryPregenerated` tier ahead of `_openaiTTS` in `_speakGerman` at L20187. Also add `TRANSLATION_AUDIO_MAP` and `GRAMMAR_AUDIO_MAP` consts (initially empty; populate as override needs surface).

**Exit criteria:**
- 3-tier playback chain wired; `tryPregenerated` is the first call; `_openaiTTS` is the second; `_browserSpeak` is the third.
- `PARITY_GAP.md §11.1 row 7` `AudioCache` portion rescored to `MATCH` (with `ReviewScheduler` portion still PARTIAL — that's a separate decision per `ARCHITECTURE.md §1.4`).
- `PARITY_GAP.md §11.2 row 10` rescored to `MATCH`.
- `PARITY_GAP.md §11.4 rows 12, 13, 15, 17` rescored to `MATCH`.
- `ARCHITECTURE.md §1.5` "target invariant" promoted from `adopt-and-enforce` to `enforced`.

### WP-DEP-G-3 — SW precache + `CACHE_NAME` discipline for audio tree (gated)

**Owner:** DevOps.
**Source rows:** `PARITY_GAP.md §11.4 row 14` and audio rows generally.
**Priority:** High *(conditional)*. Skip if WP-CON-G-1 picks option 3.
**Depends on:** WP-CON-G-3.

**Scope.** Decide and implement the audio-precache strategy. Three options:

1. Precache the full `audio/` tree at install (offline-first; large install cost — possibly hundreds of MB).
2. Cache-on-demand with a separate runtime cache name (smaller install cost; first-listen is online).
3. Hybrid: precache passages only (small offline-essential set); cache-on-demand for vocab/grammar.

Senior Dev recommends option 3 unless Principal wants strict offline-first. Couple the change with the `CACHE_NAME` bump and the new precache filename-integrity rule in `ARCHITECTURE.md §3.7`.

**Exit criteria:**
- Audio precache strategy implemented; `CACHE_NAME` bumped; install tested on iOS Safari + desktop.
- Documented in `SPEC.md §8.3`.

### WP-CON-G-4 — ElevenLabs as second neural-TTS provider (gated on Principal Q3)

**Owner:** Frontend (provider integration); Auditor (CSP allow-list update).
**Source rows:** `PARITY_GAP.md §11.6 row 2`; `SPEC.md §7.3.1` (ElevenLabs absent); `ARCHITECTURE.md §1.7` (procedural rule on simultaneous landing).
**Priority:** Medium *(if Principal greenlights — Open Q3 in ARCHITECTURE.md §5)*.
**Depends on:** **WP-FE-G-1 must land first** (CSP must exist before ElevenLabs host is added).

**Scope.** Add ElevenLabs as a second neural TTS option in the Settings modal: provider selector (`#tts-provider-select` with OpenAI / ElevenLabs options), ElevenLabs API key field, voice-ID field. Implement `_elevenlabsTTS(text)` parallel to `_openaiTTS`. Wire into `_speakGerman` between `_openaiTTS` and `_browserSpeak` (or as a sibling-of-OpenAI choice keyed on the new provider selector). Update CSP `connect-src` to include `https://api.elevenlabs.io` in the same commit (not a separate PR — `ARCHITECTURE.md §1.7` procedural rule).

**Exit criteria:**
- ElevenLabs reachable; CSP allows it; provider selector works.
- `PARITY_GAP.md §11.6 row 2` rescored to `MATCH`.
- Inherit Spanish's defaults (`eleven_multilingual_v2`, `stability: 0.5`, `similarity_boost: 0.75`) unless Principal specifies otherwise.

---

## 3. Phase 3 — Architectural commitment closure

**Goal:** convert each remaining `adopt-and-enforce` invariant in `ARCHITECTURE.md §1` into a closed work package. Several Phase-3 commitments close automatically when Phase 1 / Phase 2 WPs land:

- §1.5 audio target invariant → closes when `WP-FE-G-10` lands (or is dropped to `enforced (current two-tier)` if WP-CON-G-1 picks option 3).
- §1.6 SW iOS hardening → closes when `WP-DEP-G-2` lands.
- §1.7 meta-CSP → closes when `WP-FE-G-1` lands.
- §3.7 precache filename integrity → promoted to enforced when `WP-DEP-G-1` lands.

The remaining `adopt-and-enforce` items are the genuine Phase-3 work.

### WP-ARCH-G-1 — IndexedDB mirror (`WerkstattIDB`) + `_restoreFromIDB()`

**Owner:** Frontend (implementation); Senior Dev Oversight (schema design + sign-off).
**Source rows:** `ARCHITECTURE.md §1.3`; `SPEC.md §4.1 #3, §4.3.2`; `PARITY_GAP.md §11.2 rows 3, 4`; `SPEC.md` Appendix A FE-G-3; Appendix B #B-5.
**Priority:** High. Without this, an iOS user under storage pressure loses everything in `uw_*`.
**Depends on:** `WP-FE-G-3` (envelope shape settled, so the IDB mirror knows what to mirror); Principal call on `SPEC.md` Appendix B #B-5 (architectural confirmation that the inheritance is wanted — recommend defaulting to "yes" given the data-loss surface, but Principal may override).

**Scope.** Port Spanish's `TallerIDB` as `WerkstattIDB`: database `uw-backup`, single object store `progress`, keyed by the full `uw_*` prefix. In `App.save(key, val)` (L19027), after the `localStorage.setItem` write, also write to IDB. In `App.constructor`, after the legacy-key migration at L18983–18986, run `_restoreFromIDB()` which reads every `uw_*` key from IDB and rehydrates `localStorage` for any key that is currently missing. Apply the rehydrated value to in-memory fields per a hand-maintained restore-list (until `WP-ARCH-G-?` schema-derivation lands — see Spanish FE-4 cross-team note below).

**Exit criteria:**
- IDB mirror writes on every `App.save`.
- `_restoreFromIDB()` at boot rehydrates `localStorage` from IDB for any wiped key.
- `SPEC.md §4.1 #3` and `§4.3.2` updated.
- `PARITY_GAP.md §11.2 rows 3, 4` rescored to `MATCH`.
- `ARCHITECTURE.md §1.3` IDB-mirror clause promoted from `adopt-and-enforce` to `enforced`; §6 change log updated.
- `ARCHITECTURE.md §1.3a` (sessionStorage decline) promoted from `provisional (decline)` to a recorded ruling in §5.

**Cross-team dependency.** Spanish has a standing follow-up `Spanish FE-4` ("schema-derivation pattern" replacing the hand-maintained `_restoreFromIDB()` manifest). If Spanish lands `FE-4` before German lands this WP, German should adopt the same pattern (avoids the drift risk Spanish's FE-4 was created to address). If Spanish lands `FE-4` after German, German bumps to a follow-up WP `WP-ARCH-G-1b` that adopts the schema-derivation pattern post-hoc.

### WP-ARCH-G-2 — FSRS version reconciliation (19 weights vs. 17)

**Status: CLOSED (2026-04-23, docs-only).**

**Owner:** Senior Dev Oversight.
**Source rows:** `SPEC.md §9.6`; `PARITY_GAP.md §11.2 row 9`; `ARCHITECTURE.md §1.4`.
**Priority:** Medium. Algorithmic correctness, not user-blocking.

**Scope.** Line-verify the German `FSRS` IIFE at L18651 against the Spanish version. Specifically: (a) confirm whether the 19-element weights vector reflects FSRS v4.5 with a different tuning, FSRS v5 (which has more weights), or something else; (b) whether the field set on a card is identical between Spanish and German; (c) whether `getOverdueKeys()` and the retrievability/difficulty/stability math are identical at the formula level. Decide: align German on Spanish (or vice versa), or document the divergence as intentional with a stated reason.

**Outcome (WP-ARCH-G-2, 2026-04-23).** DIVERGENT (intentional). German runs FSRS v4.5 (19 weights, exp-based `initDifficulty`, mean-reversion `nextDifficulty`); Spanish runs FSRS v4 (17 weights, linear `initDifficulty`, no mean reversion) — the Spanish comment mislabels this "FSRS-4.5 defaults". German is algorithmically ahead; no downgrade warranted. Card schema field-for-field identical; no data migration required. Open item deferred to follow-up WP: W[17]/W[18] (short-term stability formula for Learning/Relearning states) are defined but unused — see `ARCHITECTURE.md §1.4`.

**Exit criteria:**
- [x] Reconciliation outcome recorded in `ARCHITECTURE.md §1.4` change log.
- [x] `PARITY_GAP.md §11.2 row 9` rescored to `DIVERGENT` with explicit "intentional because…" justification.

### WP-ARCH-G-3 — Install-time `skipWaiting` decision and action (+ absorption of WP-DEP-G-2 scope)

**Status: CLOSED (2026-04-19).**

**Owner:** Senior Dev Oversight (decision); DevOps (implementation).
**Source rows:** `SPEC.md §8.3.1`; `PARITY_GAP.md §11.7 supplementary A1`; `SPEC.md` Appendix B #B-4; `ARCHITECTURE.md §1.6`.
**Priority:** Medium (promoted to Phase 1 by absorption of WP-DEP-G-2).

**Decision taken:** Option A — Spanish-aligned reactive revert. Install-time `self.skipWaiting()` at `sw.js:21` removed. `SPEC.md` Appendix B #B-4 closed by design (install-time `skipWaiting` was reactive to the v9→v10 HTTP-cache problem; the proper fix is `{ updateViaCache: 'none' }` + `reg.update()` hardening).

**Absorption.** WP-ARCH-G-3 absorbed WP-DEP-G-2's four iOS-hardening changes in the same commit (Option A is the precondition that makes those changes work as specified). All four WP-DEP-G-2 changes landed unchanged, with one refinement: `if (reg.waiting && reg.active)` at registration time (the `&& reg.active` guard distinguishes a genuine waiting SW from a first-install false positive — refinement over the original WP-DEP-G-2 bare `if (reg.waiting)` spec).

**What landed (single commit, `werkstatt-v14`):**
- `sw.js`: removed `self.skipWaiting()` from install handler; bumped `CACHE_NAME` v13→v14.
- `index.html:24680ff`: `{ updateViaCache: 'none' }`, `reg.update()`, `if (reg.waiting && reg.active)` banner check, `reg.active` in `statechange` guard.
- `ARCHITECTURE.md §1.6`: promoted provisional/adopt-and-enforce → enforced; aligned with Spanish §1.6. §6 change log appended.
- `PARITY_GAP.md §11.7` rows 3 and 5 and supplementary A1 rescored to MATCH; score summary recomputed.
- `SPEC.md §8.3.1` rewritten for single-activation-path flow. Appendix B #B-4 marked RESOLVED.
- `IMPLEMENTATION_PLAN.md` WP-DEP-G-2 marked closed-by-absorption; this card updated.

---

## 4. Phase 4 — Tech-debt cleanup

**Goal:** close the German app's own §10 tech-debt items and the small-scope cosmetic / hygiene items deferred from earlier phases. Phase 4 WPs are individually small and can be batched freely. None block Phase 1–3.

### WP-AUD-G-2 — LLM-output XSS audit (line-by-line `_escapeHtml` verification)

**Owner:** Auditor + Frontend.
**Source rows:** `SPEC.md §10 G-8`; Appendix C item 4.
**Priority:** Medium.
**Depends on:** `WP-FE-G-1` (CSP in place provides defense-in-depth so the audit can confirm both the escape discipline and the policy backstop).

**Scope.** Visit every `innerHTML` site that takes LLM-derived text. The known sites from `SPEC.md §10 G-8`: L19898, L19901, L19907, L20018, L24567, L24660. Confirm `_escapeHtml` is applied. Add coverage of any Phase-2 / Phase-3 sites (banners, new modals, etc.).

**Exit criteria:**
- All LLM-injection sites verified escaped.
- Audit report appended to `SPEC.md §10` or filed as a separate `plans/xss-audit-2026-04.md`.

### WP-FE-G-11 — Per-region `lang="de"` overrides + semantic landmarks + SW-banner English translation

**Owner:** Frontend.
**Source rows:** `SPEC.md §10 G-10`; `SPEC.md §6.4`; `SPEC.md` Appendix A FE-G-5; `SPEC.md` Appendix A FE-G-12 (banner localization); `SPEC.md` Appendix B #B-12 (resolved 2026-04-19).
**Priority:** Medium.
**Depends on:** none. B-12 resolved: `<html lang="en">` is intentional per Principal.

**Scope.** Three coordinated chrome/accessibility changes:

1. **Per-region `lang="de"` overrides.** Add `lang="de"` to `#german-display` and to each `.word-text` token wrapper construction at L19590–L19625. Mode panels at L3946–L3990 carrying German content likewise get `lang="de"`. `<html lang="en">` at L2 stays untouched (intentional per B-12).
2. **Semantic landmarks.** Promote `<div id="sidebar">` → `<nav id="sidebar" aria-label="Übungsnavigation">` and `<div id="main">` → `<main id="main">`. (Closes the `<nav>`/`<main>` half of `SPEC.md §10 G-10`.)
3. **SW update banner translation.** Translate the two German strings at L24674–L24675 to English: `"Neue Version verfügbar"` → `"New version available"`, `"Aktualisieren"` → `"Reload"`. Keeps the banner aligned with the English chrome per B-12 and closes `SPEC.md` Appendix A FE-G-12.

**Exit criteria:**
- `<html lang="en">` unchanged (intentional).
- Per-region `lang="de"` overrides present on `#german-display` and every `.word-text`.
- `<nav>` and `<main>` landmarks present.
- SW update banner copy English ("New version available" / "Reload").
- `SPEC.md §10 G-10` closed; `SPEC.md` Appendix A FE-G-5 and FE-G-12 closed.

### WP-FE-G-12 — Referrer-Policy + Permissions-Policy meta tags

**Owner:** Frontend + Auditor.
**Source rows:** `SPEC.md §10 G-11`.
**Priority:** Low.
**Depends on:** `WP-FE-G-1` (lands as a coordinated head-meta cleanup pass).

**Scope.** Add `<meta name="referrer" content="strict-origin-when-cross-origin">` and a Permissions-Policy meta tag (default-deny most features). Reduces Gemini-key-in-Referer leakage (still a concern even after WP-AUD-G-1's header-auth fix).

**Exit criteria:** meta tags present; Auditor sign-off on policy strictness.

### WP-FE-G-13 — Production console-log scrub (12 sites)

**Owner:** Frontend.
**Source rows:** `SPEC.md §10 G-12`.
**Priority:** Low.

**Scope.** 12 sites at L18882, L18892, L18988, L19030, L19719, L20179, L20181, L22280, L24197, L24238, L24271, L24319. Decide: gate each behind an `if (DEBUG)` flag (with `DEBUG = false` shipped), or silently drop. Recommend keeping API-failure and audio-fallback `console.warn`s (they aid Cam in debugging) and dropping the rest.

**Exit criteria:** production console clean by default; `SPEC.md §10 G-12` closed.

### WP-FE-G-14 — Manifest `lang: "en"` and `orientation` fields

**Owner:** Frontend.
**Source rows:** `PARITY_GAP.md §11.7 supplementary A4`; `SPEC.md` Appendix B #B-12 (resolved 2026-04-19).
**Priority:** Low.

**Scope.** Add `"lang": "en"` (per B-12 resolution — matches intentional `<html lang="en">` chrome convention) and `"orientation": "any"` to `manifest.json`. Once WP-FE-G-15 ships, apply the same two fields to each `manifest-{N}.json` variant — coordinate with WP-FE-G-15 so the fields land in one unified manifest-shape edit. Bump `CACHE_NAME` with the change.

*[WP-FE-G-15 promoted to Phase 2 Wave A on 2026-04-19 per B-13 resolution. See full card in §2.]*

### WP-FE-G-16 — `_escapeHtml` perf rewrite (DOM→pure-string)

**Owner:** Frontend.
**Source rows:** `SPEC.md §10 G-9`.
**Priority:** Low.

**Scope.** Replace the DOM temp-node round-trip at L23840–23844 with `str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))`. Verify behavior parity (escape every character `_escapeHtml` currently escapes). Microbenchmark the hot path to confirm the ~10× speedup.

**Exit criteria:** function rewritten; behavior parity verified; perf delta noted in commit message.

### WP-FE-G-17 — Remove `uw_uw_vocabProgress` migration shim

**Owner:** Frontend.
**Source rows:** `SPEC.md §10 G-13`; `PARITY_GAP.md §11.2` (no row directly).
**Priority:** Low.
**Depends on:** deprecation-window calendar — recommend keeping the shim until at least 2026-09-01 to absorb any returning user with a stale `uw_uw_*` key.

**Scope.** Remove L18981–18988 once the deprecation window closes. Document the removal in the commit message.

### WP-DEP-G-4 — GitHub Actions pre-deploy smoke test

**Owner:** DevOps.
**Source rows:** `PARITY_GAP.md §11.7 supplementary A5`; `SPEC.md §7.2`.
**Priority:** Medium.

**Scope.** Add `.github/workflows/smoke-test.yml` that runs on every PR to `main`: lint `manifest.json`, parse `sw.js` for `CACHE_NAME` and verify the value differs from the parent commit's value if any precached file changed, run a headless-browser pass that registers the SW and confirms install succeeds (catches G-15-class regressions automatically). Use Playwright on `ubuntu-latest` for the headless browser.

**Exit criteria:** CI runs on every PR; smoke test green required for merge.

### WP-DEP-G-5 — Post-deploy verification (`CACHE_NAME` parity probe)

**Owner:** DevOps.
**Source rows:** `PARITY_GAP.md §11.7 supplementary A6`.
**Priority:** Medium.
**Depends on:** WP-DEP-G-4 (uses the same Actions infrastructure).

**Scope.** Add `.github/workflows/post-deploy-verify.yml` that runs on every push to `main`: wait 90 seconds for GitHub Pages to publish; `curl https://<deploy-url>/sw.js` and assert the served `CACHE_NAME` matches the committed value. Failure posts to a GitHub Issues / a Slack hook.

**Exit criteria:** post-deploy verify runs on every push; failure surfaces are wired.

### WP-DEP-G-6 — Deploy + rollback runbook

**Owner:** DevOps.
**Source rows:** `PARITY_GAP.md §11.7 supplementary A7`; `SPEC.md §8.2`.
**Priority:** Low.

**Scope.** Author `plans/runbooks/DEPLOY.md` documenting the standard deploy ritual (steps in `SPEC.md §8.2`), the `CACHE_NAME` bump rule, the §3.7 filename-integrity check, and rollback procedures (`git revert <sha> && git push` for non-destructive; `git push --force-with-lease origin <prior-sha>:main` for destructive — last-resort, requires Senior Dev approval).

### WP-DEP-G-7 — `.DS_Store` cleanup + `.gitignore` rule

**Owner:** DevOps.
**Source rows:** `SPEC.md §10 G-14`.
**Priority:** Low.

**Scope.** Add `.DS_Store` to `.gitignore`. Remove the tracked `.DS_Store` from the working tree and from history if convenient (tradeoff: history rewrite vs. one-time leak; recommend the simpler removal-without-history-rewrite — the metadata it leaks is low-sensitivity).

### WP-DEP-G-8 — Hosting migration: GitHub Pages → Cloudflare Pages — CLOSED (2026-04-24)

**Owner:** DevOps.
**Source:** Gate-2 Principal routing 2026-04-24 (hybrid sprint sequencing; 2–3 day dual-serve window; 7-day Report-Only observation).
**Priority:** Medium.
**Closed:** 2026-04-24 (cutover commit on rebase after origin/main advanced past the original worktree base).

**Motivation.** CSP enforcement and CSP violation reporting require HTTP response headers (`Content-Security-Policy-Report-Only`, `Report-To`, `report-uri`) that GitHub Pages cannot deliver at the edge. The `_headers` file mechanism on Cloudflare Pages is the simplest path to spec-conformant CSP delivery while keeping the static-hosting posture of §1.1 / §1.2 invariants.

**Scope (delivered in the cutover commit — 13-file atomic bundle):**

- `_headers` (NEW at repo root) — CF Pages edge-delivered response headers: `Content-Security-Policy-Report-Only`, `Report-To`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` on `/*`; `Cache-Control: no-cache` on `/sw.js`.
- `sw.js` — `CACHE_NAME` migrated `werkstatt-v63` → `werkstatt-cf-v1` (migration-boundary cache; old `werkstatt-v*` family evicted on activation).
- `index.html` — meta-tag `Content-Security-Policy-Report-Only` removed from line 7 (spec-invalid for `frame-ancestors` / `base-uri` / `report-uri` / `report-to`). Meta-tag `Referrer-Policy` and `Permissions-Policy` preserved (WP-FE-G-12, redundant belt-and-suspenders).
- `manifest.json` + `manifest-{1..5}.json` — `start_url` relative `./index.html` → absolute `/index.html`; explicit `scope: "/"` added. All 6 manifests validated.
- `plans/runbooks/deploy-and-rollback.md` — WP-DEP-G-6 runbook amended: §1 rewritten for CF Pages deploy flow, §1b added (CF native rollback + emergency disable), §6.1 rewritten for CF Pages deploy stuck, Appendix URLs updated. §§2–5, §6.2, §6.3, §7 preserved (platform-neutral cache-invalidation and escalation content).
- `SPEC.md` — §8.1 rewritten for CF Pages hosting; §8.2 rewritten for CF Pages deploy ritual; §8.3 manifest paragraph updated for `scope`/`start_url`; §8.3 SW paragraph amended with HTTP-cache pairing; §8.4 CACHE_NAME convention updated with `-cf-` infix; NEW §8.5 CSP delivery and violation reporting.
- `plans/ARCHITECTURE.md` — §1.6 invariant #2 updated with `werkstatt-cf-v1`; §1.6 amended with HTTP-cache pairing paragraph; NEW §3.9 "CSP delivery via HTTP header — enforced"; §6 change log entry dated 2026-04-24.
- `plans/PARITY_GAP.md` — §11.7 row 1 DIVERGENT-intentional (platform migration), row 7 N/A (Jekyll not applicable), new row 8 MATCH (CSP delivery mechanism); supplementary A5/A6/A7 MISSING→MATCH (housekeeping reconciliation for shipped sibling WPs); score summary recomputed to `6 | 0 | 0 | 1 | 1 | 8` / totals `34 | 21 | 14 | 5 | 2 | 76`.
- `plans/IMPLEMENTATION_PLAN.md` — WP-DEP-G-4/G-5/G-6 marked CLOSED in index (they shipped on their own, not absorbed by this WP); WP-DEP-G-8 row added; this card.

**Observation windows.**

- **3-day dual-serve** (2026-04-24 → 2026-04-27): legacy GH Pages origin `https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/` stays live at frozen pre-cutover state to catch A2HS icons and bookmarks, then Pages source disabled in repo Settings.
- **7-day Report-Only observation** (2026-04-24 → 2026-05-01): CSP is `Report-Only`; violations log but do not block. Enforce flip (`Content-Security-Policy` header name) after observation window + Senior Dev Oversight sign-off.

**Known follow-ups (out of this WP's scope, flagged here for routing):**

1. **WP-DEP-G-5 probe URL migration.** `post-deploy-verify.yml` still polls the GH Pages URL with pattern `werkstatt-v{N}`; post-cutover it fails on every push. Needs migration to the CF Pages URL and pattern `werkstatt-(cf-)?v{N}`.
2. **CSP violation reporting endpoint.** `https://api.glossolalia.dev/csp-report` does not resolve at cutover time; Worker deployment is scheduled post-sprint (`plans/sync-architecture-proposal.md`, shared Taller/Werkstatt). Interim `report-uri` POSTs 404 silently under Report-Only; manual DevTools-console observation is the interim gate.
3. **Enforce flip.** At cutover + 7 days, rename `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in `_headers` if no unexpected violations surface.

**Verification.** V1–V20 matrix executed post-deploy; log at `plans/migration/cutover-verification.log`.

### WP-ARCH-G-4 — LLM-key proxy decision (and implementation if Principal accepts)

**Owner:** Senior Dev Oversight (decision framing); Principal (decision).
**Source rows:** `SPEC.md §10 G-2, G-3, G-4`; `ARCHITECTURE.md §5 Q1`; Appendix C C-G5.
**Priority:** Medium–High (depending on Principal's risk appetite).
**Depends on:** Appendix B Q1 (existing) routed to Principal.

**Scope.** If Principal accepts a proxy: stand up a Cloudflare Worker (or equivalent) that holds the LLM keys, accepts authenticated requests from the German app, and forwards to Anthropic / OpenAI / Gemini. The browser holds a smaller-scope token (or no key at all). Closes G-2's Anthropic-direct-browser-access risk fully and reduces G-3's Gemini-query-string-key risk to zero.

If Principal declines: record the decline in `ARCHITECTURE.md §5 Q1`; `SPEC.md §10 G-2 / G-3` remain `High` with the no-CSP intensifier reduced once `WP-FE-G-1` lands.

**Exit criteria:** decision recorded; if implementing, proxy stood up + integrated + tested.

---

## §4 Open Questions raised by this plan (route to Dispatch → Principal)

These are new questions surfaced by the implementation-plan exercise that did not appear in `SPEC.md` Appendix B. Tracking resolution here.

- **B-12 — `<html lang>` decision. RESOLVED 2026-04-19.** Principal: `<html lang="en">` is intentional for both apps (chrome-led convention). Per-region `lang="de"` overrides remain recommended (folded into WP-FE-G-11). SW update banner copy translates to English (also folded into WP-FE-G-11). Manifest `lang: "en"` per WP-FE-G-14.
- **B-13 — Per-icon-theme PWA manifest scope. RESOLVED 2026-04-19.** Principal: replicate Spanish's per-icon-theme manifest system in German. Icons land in repo as images. WP-FE-G-15 promoted from Phase 4 Low to Phase 2 Wave A Medium. WP-FE-G-6 scope expanded to rewrite `<link rel="manifest">` href.
- **B-14 — Audio precache strategy if WP-CON-G-1 picks option 1 or 2.** Three options listed in `WP-DEP-G-3`. Recommendation: hybrid (passages precached, vocab/grammar cache-on-demand). Routes through `WP-DEP-G-3`. **Still pending Principal answer.**

---

## §5 Cross-team dependencies on Spanish work

Calling out where German depends on or coordinates with Spanish work, per Dispatch direction.

| German WP | Spanish dependency | Coordination |
|---|---|---|
| WP-FE-G-3 (envelope parity v2) | Spanish v2 envelope shape | Cross-check field shapes are byte-compatible if Cam ever syncs between apps. If Spanish v2 changes after German lands, German bumps to v3. |
| WP-ARCH-G-1 (IDB mirror) | Spanish `FE-4` (schema-derivation pattern replacing hand-maintained `_restoreFromIDB()` list) | If Spanish ships `FE-4` before German lands, adopt the schema-derivation pattern in this WP. If Spanish ships after, German files follow-up `WP-ARCH-G-1b` to adopt post-hoc. |
| WP-CON-G-4 (ElevenLabs) | Spanish ElevenLabs CSP fix (Spanish Phase 1) | Spanish's allow-list is the parity reference for `connect-src 'https://api.elevenlabs.io'`. The procedural rule "provider integration and CSP allow-list update must land in the same change" (`ARCHITECTURE.md §1.7`) is the German enforcement of the Spanish lesson. |
| WP-CON-G-2 / WP-CON-G-3 / WP-FE-G-10 (audio pipeline) | Spanish `AudioCache.sanitize()` rule + `audio/manifest.json` shape | German adopts both verbatim (with the `ß` extension per Appendix B #B-9). |
| WP-ARCH-G-4 (LLM-key proxy) | Spanish ARCHITECTURE.md §5 Q1 (same proxy question, open on both sides) | If Spanish stands up a proxy, German uses it. If German stands up first, Spanish can adopt the same proxy. Preferred: a single proxy serves both apps (one Cloudflare Worker, two app-origin CORS entries). |
| WP-DEP-G-4 / WP-DEP-G-5 (CI workflows) | Spanish ARCHITECTURE.md §5 Q3 (unified deploy workflow target) | German is already on the unified-branch posture Spanish is targeting. CI workflow design can be authored cross-app — same Playwright smoke test, same `CACHE_NAME` parity probe, parameterized on the two repos. |
| WP-DEP-G-4 / WP-DEP-G-5 / WP-DEP-G-6 (deploy automation) | Spanish WP-DEP-1 (Pattern A: `actions/deploy-pages@v4` + retire `gh-pages` + flip Pages source to "GitHub Actions") | **Cross-team note 2026-04-19:** German Pages source is currently "Deploy from a branch" (per Cam). Spanish is locking in Pattern A; Cam confirmed willingness to switch on the German side. When German deploy-automation work is routed, mirror the Spanish architecture verbatim — Pattern A, auto-stamped `CACHE_NAME`, whitelist publish set, three rollback paths. Lift the finalized Spanish design proposal as a starting template; design tradeoffs are essentially identical between the two apps. **Holding for Phase 2/3 routing per Dispatch direction; ahead of this work in the queue: WP-FE-G-1, WP-AUD-G-1, WP-ARCH-G-3 (post-WP-DEP-G-2-revert).** |

---

## §6 Definition-of-done — phase-level

Each phase has a closure condition that lets Dispatch / Principal know it is settled:

- **Phase 1 closes when:** all four WPs (WP-DEP-G-1, WP-FE-G-1, WP-DEP-G-2, WP-AUD-G-1) merged to `main`; `ARCHITECTURE.md §1.6` and `§1.7` promoted to `enforced`; `§3.7` promoted to `enforced` (after WP-DEP-G-1 verification); `SPEC.md §10` G-3 / G-4 / G-5 / G-15 closed.
- **Phase 2 closes when:** WP-CON-G-1 decision recorded; Wave A (5 WPs) and Wave B (3 WPs) merged; Wave C (4 WPs) either complete or formally dropped per WP-CON-G-1's outcome; Wave D (1 WP) complete or formally declined per Q3.
- **Phase 3 closes when:** WP-ARCH-G-1, WP-ARCH-G-2, WP-ARCH-G-3 merged; `ARCHITECTURE.md §1.3, §1.4, §1.6` install-time clauses all in `enforced` status (or `enforced (German-specific divergence)` for the install-time `skipWaiting` if intentional); `PARITY_GAP.md §11.2 rows 3, 4, 9` and `§11.7 supplementary A1` closed.
- **Phase 4 closes when:** all Phase-4 WPs merged or formally deferred via `§9` deferred items.

---

## §7 Risk register (top items only)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WP-DEP-G-1 verification confirms G-15 P0 | Medium | High | Hot-fix is defined; ≤1-day turnaround. The risk is *not knowing* — running the verification removes the risk regardless of outcome. |
| Audio pipeline scope (WP-CON-G-1) blocks Phase 2 indefinitely | Medium | Medium | Phase 2 Waves A/B do not depend on the decision; only Wave C does. Decision can be deferred without freezing the rest. |
| Schema-derivation drift between Spanish and German IDB mirrors | Low | Medium | Cross-team coordination flagged in §5. Worst case is `WP-ARCH-G-1b` post-hoc adoption. |
| ElevenLabs cost spend during pre-generation (WP-CON-G-3) | Medium | Low–Medium | Cost-monitor flag in WP-CON-G-3. Spanish's pre-generation cost is the comparable baseline. |
| iOS Safari behavior delta in WP-DEP-G-2 hardening (the four changes interact) | Low | High | Each of the four changes has been independently verified as safe in Spanish; combined they should work together. Test plan: cold install + warm reload + standalone-PWA install. |

---

## §9 Deferred items

Items in `PARITY_GAP.md` that are intentionally NOT in this plan (or are conditionally in it). For each, the table records why it's deferred and what would trigger pulling it in.

| Item | Source row | Deferral reason | Trigger to pull in |
|---|---|---|---|
| §1.3a `sessionStorage` carry-through | `ARCHITECTURE.md §1.3a` | Standing decline. Adds a third copy of API keys without addressing the underlying browser-held-key threat. The proxy direction (`WP-ARCH-G-4`) is the right answer instead. | Principal overrides the decline. |
| `ReviewScheduler` wrapper class | `PARITY_GAP.md §11.1 row 7` partial | Standing decline. German calls into `FSRS` directly; the wrapper is a Spanish architectural choice, not an invariant German has committed to. | Principal or Senior Dev decides the wrapper's review-prioritization logic is needed (currently `_shuffleArray` suffices). |
| §3 corpus-shape DIVERGENT items: `DICT.gender`, two-structure grammar, author-specific vocab sections, scenario-set + correction directive | `PARITY_GAP.md §11.4 rows 3, 7, 9, 19` | Intentional divergences (each has stated "intentional because…" justification). No convergence target. | Principal explicitly retracts the rationale. |
| FSRS-driven vocab tier with session demotions (`_vocabTierFailures`) | `PARITY_GAP.md §11.3 row 7` partial | Pedagogical preference open question (`ARCHITECTURE.md §5 Q4`). German's user-picks-tier is simpler; whether to inherit Spanish's harsher tiering is a Principal call. | Principal answers Q4 toward inheritance. |
| `_thematicSession*` grammar session demotions | `PARITY_GAP.md §11.3 row 8` partial | Same as above (Q4). | Same as above. |
| Spanish §10 #4 triple-persisted-keys debt as a German item | `SPEC.md §10` row 4 (DIVERGENT) | German's smaller-surface posture is the better trade-off in isolation; the IDB mirror (WP-ARCH-G-1) closes the data-loss half without adding the security debt half. | The proxy WP (WP-ARCH-G-4) lands and Principal wants additional defensive layers. |
| Single responsive breakpoint consolidation | `SPEC.md` Appendix A FE-G-7 | Low priority; no functional cliff. Audit-first, then consolidate, but neither is parity-blocking. | A wider CSS cleanup pass is scheduled. |
| Icon-picker base64 vs. precached JPEGs (`SPEC.md` Appendix A FE-G-13) | Spanish FE-1 analogue | **Absorbed into WP-FE-G-15 as of 2026-04-19 per B-13:** once per-icon disk PNGs land, the inline base64 data at L14–L15 is retired in the same commit. No separate WP. | — (closes with WP-FE-G-15). |
| Spanish §10 #2 (Anthropic dangerous header) full mitigation | `SPEC.md §10 G-2` | Mitigation arc is `WP-FE-G-1` (CSP) → `WP-ARCH-G-4` (proxy). G-2 doesn't fully close until WP-ARCH-G-4 is decided and (if accepted) implemented. | WP-ARCH-G-4 lands. |
| Spanish §10 #8 (monolithic bundle) reduction | `SPEC.md §10 G-7` | `ARCHITECTURE.md §5 Q2` open. Would benefit from a perf measurement first. | Perf measurement on iOS Safari indicates a meaningful TTI improvement. |
| Custom-domain CNAME | `SPEC.md` Appendix B #B-2 | Conditional on Principal's URL decision. | Principal answers B-2 with a custom domain. |
| Open Graph / Twitter share-card meta tags | `SPEC.md` Appendix B #B-11 | Conditional on B-2 (URL needed for the og:url). | B-2 resolves with a confirmed served URL. |

---

## §10 Verification

- This plan was integrated against `SPEC.md`, `PARITY_GAP.md`, and `ARCHITECTURE.md` as of 2026-04-19; line references and parity-row counts in the WP cards are anchored to those documents at that date.
- The "first three things to fix" call-out in `PARITY_GAP.md` (G-15 hot-fix → meta-CSP → audio-pipeline decision) drives Phase 1 and the WP-CON-G-1 placement at the top of Phase 2 verbatim.
- `ARCHITECTURE.md §1` `adopt-and-enforce` items map one-for-one to either Phase 1 WPs (closure-by-implementation) or Phase 3 WPs (closure-by-explicit-action). The mapping is recorded in the `Definition-of-done` and §3 phase intro.
- QA Lead's verification of `PARITY_GAP.md` scoring (currently in flight per Ping #1) may shift WP priorities at the margins; if a `MATCH`/`PARTIAL` row flips to `MISSING` post-QA, the affected WP gains scope; if a `MISSING` row flips to `MATCH` (e.g., a behavior turns out to exist that the spec pass missed), the affected WP closes early or is removed from this plan. Both outcomes get recorded in `ARCHITECTURE.md §6` and surface to Dispatch as plan amendments.

---

**End of implementation plan. Pending Principal sign-off.**
