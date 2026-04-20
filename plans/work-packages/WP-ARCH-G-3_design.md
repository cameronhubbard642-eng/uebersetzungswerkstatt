# WP-ARCH-G-3 — Design Recommendation

**Owner (this artifact):** Senior Dev Oversight (opus).
**Date:** 2026-04-19.
**Routing brief:** `plans/work-packages/WP-ARCH-G-3_routing.md`.
**Next handoff:** DevOps Manager — engineer brief.
**Format:** Recommendation + reasoning + behavior matrix + concrete edits in pseudo-diff form. The Coordinator brief asks for B-4 disposition under the chosen option and explicit treatment of the four reverted WP-DEP-G-2 changes; both are at §7 below.

---

## 1. Recommendation

**Option A — Spanish-aligned reactive revert.** Remove `self.skipWaiting()` from `sw.js:21`. Banner-click is the sole activation gate. Fold the four WP-DEP-G-2 hardening changes back in **unchanged** — Option A is precisely the missing precondition that lets those changes do what they were meant to do.

ARCHITECTURE.md §1.6 install-time-skipWaiting clause promotes `provisional` → `enforced` aligned with Spanish §1.6.

PARITY_GAP.md §11.7 supplementary A1 rescores `DIVERGENT (pending Principal confirmation)` → **`MATCH`**.

SPEC.md Appendix B #B-4 closes by design rather than requiring a separate Principal answer.

## 2. Reasoning

### Why not Option C (the null option)

Recorded for completeness. Install-time `self.skipWaiting()` (`sw.js:21`) combined with `clients.claim()` in the `activate` handler (`sw.js:29`) means the new SW activates as soon as it finishes installing. `controllerchange` fires; the listener at `index.html:24692–24694` sets `refreshing = true` and calls `location.reload()`. The page reloads before the banner has a chance to surface as anything other than a half-second flash. When the user later clicks "Aktualisieren," the action is no-op because there is no `reg.waiting` (the new SW already activated). This is the failure mode WP-DEP-G-2's revert exposed — Option C reproduces it. Rejected.

### Why not Option B (Cam's hybrid)

Option B is **structurally workable** but not warranted given the audience and the cost.

To make Option B work, the design has to:
1. Keep install-time `self.skipWaiting()` so the new SW activates without user accept.
2. Suppress the auto-reload on `controllerchange` (or gate it on a check), or the page reloads before the user sees the banner.
3. Establish a way for the page to learn the active SW's `CACHE_NAME` so it can compare against `uw_lastSeenCacheName` — most cleanly via the SW posting `{type: 'CACHE_NAME', value: CACHE_NAME}` to clients on activation, plus a client listener that compares and surfaces the banner.
4. On banner-click, reload the page (no `SKIP_WAITING` postMessage needed because the SW is already the latest). On reload, set `uw_lastSeenCacheName` to the live `CACHE_NAME`.
5. Initialize `uw_lastSeenCacheName` on first install so a fresh visitor doesn't see a "new version available" banner against the version they just installed.

The user-facing outcome on iOS Safari standalone PWA is functionally indistinguishable from Option A: a banner appears, user clicks, page reloads to the new version. The "force update on every release" intent of commit `f79e45c` is preserved in Option B in the sense that the new SW is active for any post-load fetches even before the user reloads — but for the German app today (no `audio/` tree, LLM/TTS calls go network-first regardless of which SW is active), there are essentially no post-load fetches whose handler version matters. The "force" is a property without a payoff.

The cost: a new `uw_lastSeenCacheName` localStorage key (per ARCHITECTURE.md §3.2 means an entry in the §1.3 IDB-restore manifest once that lands), a SW-to-client message protocol, a `controllerchange`-handler change, and a divergence from Spanish §1.6 that becomes a recorded ruling. None of those individually are large; in aggregate they buy nothing the principal-only audience needs.

The "force update" concern that prompted commit `f79e45c` is properly addressed by the four WP-DEP-G-2 hardening changes — particularly `{ updateViaCache: 'none' }`, which fixes the iOS Safari sw.js HTTP-cache that was making v9→v10 invisible in the first place. The original problem doesn't recur under Option A + hardening.

### Why Option A

1. **Solves the actual failure.** Banner-click reliably activates the waiting SW because there *is* a waiting SW (no install-time skipWaiting collapsing the activation onto the install). `reg.waiting.postMessage({type: 'SKIP_WAITING'})` at `index.html:24698` finds its target. The four hardening changes ensure the banner surfaces correctly across cold-load, warm-load, and standalone-PWA paths.
2. **Inheritance-clean.** ARCHITECTURE.md §1.6 currently calls install-time `skipWaiting` `provisional`; Option A promotes the entire §1.6 to `enforced` aligned with Spanish §1.6. One fewer German-specific divergence to maintain.
3. **Smaller diff.** One line removed in `sw.js`, four lines added/changed in `index.html` registration block. No new localStorage key, no SW message protocol, no IDB-restore manifest entry deferred until §1.3 lands.
4. **WP-DEP-G-2 hardening applies unchanged.** The four changes were specified against the original (pre-skipWaiting) flow and only failed because they layered on top of an unresolved install-time policy. Option A makes them load-bearing rather than redundant.

## 3. Behavior matrix (Option A + WP-DEP-G-2 hardening)

| Surface | Behavior |
|---|---|
| **Cold-load fresh visitor (browser tab)** — no SW installed yet | Browser fetches `sw.js` (with `updateViaCache: 'none'` no caching even applies). SW `install` runs (`cache.addAll`). No `skipWaiting`. With no existing controller, the new SW transitions installed → activating → activated automatically. `clients.claim()` runs. **No banner shown** because `reg.waiting` is empty at the registration-time check, and the `updatefound` `statechange` handler's `&& reg.active` guard distinguishes "first install" (where `reg.active` is the SW that just activated) from "update" (where `reg.active` is the old SW being replaced). [Edit-precision note: the strictest cross-browser idiom for "is this an update or a first install?" is `&& navigator.serviceWorker.controller` at the `updatefound` callsite — see §5 edit #4 for the call.] |
| **Warm-load returning visitor (browser tab)** — old SW active | Browser fetches `sw.js` fresh per `updateViaCache: 'none'`. New `sw.js` differs from cached, new SW `install` runs, transitions to `installed`, enters `waiting` (old SW still controls). `updatefound` fires; `statechange` to `installed` triggers; banner shows. User clicks "Aktualisieren" → `reg.waiting.postMessage({type: 'SKIP_WAITING'})` → `sw.js:69–73` handler → `self.skipWaiting()` → activate → `controllerchange` → `location.reload()` → user sees new version. ✓ |
| **Warm-load with already-waiting SW from prior session** (returning visitor where the previous session installed the new SW but never activated it) | Registration-time `if (reg.waiting && reg.active)` check at the top of the `register().then()` callback finds the waiting SW and surfaces the banner immediately — no need for a fresh `updatefound` to fire. Subsequent click flow same as warm-load. ✓ This is the key path WP-DEP-G-2 change #3 was meant to cover; it lights up correctly under Option A because there's actually a waiting SW for `reg.waiting` to match. |
| **iOS Safari standalone PWA cold-launch** | App opens. `navigator.serviceWorker.controller` may be momentarily null during first launch of the standalone session (Spanish commit `42e18fa` lesson). `register()` resolves; `reg.update()` is called explicitly (WP-DEP-G-2 change #2) so update detection isn't left to the browser's discretion. `{ updateViaCache: 'none' }` (change #1) ensures `sw.js` is fetched fresh from network rather than served from the iOS HTTP cache that was masking v9→v10 deploys. If a `reg.waiting` exists, the registration-time check (change #3) surfaces the banner without depending on an `updatefound` event firing during this session. The `&& reg.active` guard in the `updatefound` handler (change #4) replaces `&& navigator.serviceWorker.controller` to avoid the iOS first-launch null-controller race. User clicks → SKIP_WAITING → activates → reload. ✓ |
| **iOS Safari standalone PWA mid-session deploy** | `updatefound` fires on whatever schedule the browser chooses; `reg.active`-guarded handler surfaces banner. User clicks → activates → reload. ✓ |

The matrix above asserts no banner for first-installs, banner for genuine updates, banner survives cold-launch on a waiting SW from a prior session, and the click flow reliably activates+reloads in all cases. There is no path where the banner appears against an absent `reg.waiting` and no path where the banner is suppressed against a genuine waiting SW.

## 4. Treatment of the four WP-DEP-G-2 changes

All four apply unchanged. Option A is the precondition that makes them work as specified rather than fighting the install-time `skipWaiting`.

| WP-DEP-G-2 change | Status under Option A | Reason |
|---|---|---|
| #1: Pass `{ updateViaCache: 'none' }` to `register()` | **Apply unchanged.** | Forces fresh sw.js fetch on every page load; addresses the iOS Safari HTTP-cache-masking issue that was the actual root cause of the v9→v10 force-update problem. |
| #2: Call `reg.update()` explicitly after registration resolves | **Apply unchanged.** | Triggers update detection without relying on the browser's polling schedule (which is unreliable in iOS standalone PWA). |
| #3: Check `reg.waiting` at registration time and surface banner | **Apply unchanged.** | Surfaces banner on cold-load against a SW already-waiting from a prior session. Under Option A this check actually finds something to act on; under Option C it would still find a waiting SW occasionally but the click would fail. |
| #4: Use `reg.active` instead of `navigator.serviceWorker.controller` in the `updatefound` `statechange` guard | **Apply unchanged.** | Avoids the iOS Safari first-launch null-controller race. |

No re-specification. No new edge cases. The four changes were correctly scoped against a non-`skipWaiting` install handler from the start.

## 5. Concrete edits (pseudo-diff)

### `sw.js`

```diff
@@ -16,7 +16,8 @@
 // Install: precache core assets and immediately take control
 self.addEventListener('install', event => {
   event.waitUntil(
     caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
   );
-  self.skipWaiting();
 });
```

Single line removed. The install handler now lets the SW transition to `waiting` (when there's an existing controller) rather than activating immediately. The `SKIP_WAITING` message handler at L69–73 stays in place — it's the only path that triggers activation, gated on user accept.

`CACHE_NAME` at `sw.js:4` bumps from `werkstatt-v13` to `werkstatt-v14`.

### `index.html` — registration block (L24678–24702 inclusive)

```diff
@@ -24678,24 +24678,38 @@
 <script>
 if ('serviceWorker' in navigator) {
-  navigator.serviceWorker.register('sw.js').then(reg => {
+  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
+    // (WP-DEP-G-2 #2) Trigger explicit update check; iOS standalone PWAs do not
+    // reliably auto-poll. Safe to call even on first install.
+    reg.update();
+
+    // (WP-DEP-G-2 #3) Surface the update banner against a SW already in `waiting`
+    // from a previous session — this can happen when the prior session ended
+    // before the user accepted the update.
+    if (reg.waiting && reg.active) {
+      document.getElementById('update-banner').classList.add('visible');
+    }
+
     reg.addEventListener('updatefound', () => {
       const newWorker = reg.installing;
       newWorker.addEventListener('statechange', () => {
-        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
+        // (WP-DEP-G-2 #4) Use `reg.active` instead of `navigator.serviceWorker.controller`.
+        // `controller` can be momentarily null during first launch of an iOS standalone
+        // PWA session (Spanish commit 42e18fa). `reg.active` is the stable signal that
+        // distinguishes "this is an update to an existing SW" from "this is a first install."
+        if (newWorker.state === 'installed' && reg.active) {
           document.getElementById('update-banner').classList.add('visible');
         }
       });
     });
   });

   let refreshing = false;
   navigator.serviceWorker.addEventListener('controllerchange', () => {
     if (!refreshing) { refreshing = true; location.reload(); }
   });

   document.getElementById('update-reload-btn').addEventListener('click', () => {
     navigator.serviceWorker.ready.then(reg => {
       if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
     });
   });
 }
 </script>
```

Four hardening edits, all matching the WP-DEP-G-2 spec verbatim. No new localStorage keys. No new SW message types. No changes to the `controllerchange` handler or the click handler — both already work correctly under the activation model Option A re-establishes.

### `CACHE_NAME` slot

This WP owns slot `werkstatt-v14`. The two parallel WPs in Phase 1 (WP-FE-G-1 Report-Only, WP-AUD-G-1) and the WP-FE-G-1 enforcing follow-up should pick later slots — DevOps Manager coordinates with Frontend TM and Auditor on the slot map (suggest WP-FE-G-1 Report-Only at v15, WP-AUD-G-1 at v16, WP-FE-G-1 enforcing at v17, but ordering is at the engineer-brief level since the three WPs touch disjoint files and the bumps don't substantively interact).

### Standing constraints honored

- Single committer (per WP boundary).
- Same-commit `CACHE_NAME` bump.
- Does not touch `PRECACHE_URLS` — ARCHITECTURE.md §3.7 filename-integrity check not triggered.
- No new external hosts — `connect-src` coordination N/A.

## 6. Doc updates that ride the same commit

(Engineer brief should specify the diff for each.)

- **`ARCHITECTURE.md §1.6`** — promote install-time-skipWaiting clause from `provisional` to `enforced`. Rewrite the "two activation paths today" paragraph to "user-accept is the sole activation gate" matching Spanish §1.6. Promote the "Hardening pending" subsection (WP-DEP-G-2 hardening) from `adopt-and-enforce` to `enforced` since the four changes land in the same commit.
- **`ARCHITECTURE.md §6` change log** — append: `2026-04-19 | §1.6 promoted from provisional/adopt-and-enforce to enforced; install-time skipWaiting removed and four iOS-hardening changes folded in via WP-ARCH-G-3 (which absorbed the reverted WP-DEP-G-2 scope). | Senior Dev Oversight Engineer`.
- **`PARITY_GAP.md §11.7 supplementary A1`** — rescore `DIVERGENT (pending Principal confirmation)` → `MATCH`. Update justification to reference the resolution.
- **`PARITY_GAP.md §11.7 row 3`** — rescore `MISSING` → `MATCH`. WP-DEP-G-2 changes #1, #2 land via this WP.
- **`PARITY_GAP.md §11.7 row 5`** — rescore `PARTIAL` → `MATCH`. WP-DEP-G-2 changes #3, #4 land via this WP.
- **`PARITY_GAP.md` score summary table** — recompute (3 rows shift). Likely net: §11.7 MATCH 2→4, MISSING 4→3, PARTIAL 1→0. (Engineer brief should compute the totals and update.)
- **`SPEC.md §8.3.1`** — update to describe Option A's single-activation-path flow, the four hardening changes, and remove the "two activation paths today" framing.
- **`SPEC.md` Appendix B #B-4** — mark resolved with: `RESOLVED 2026-04-19 — design closed by WP-ARCH-G-3 selecting Option A. Install-time skipWaiting was reactive to the v9→v10 deploy detection problem; the proper fix is the WP-DEP-G-2 hardening (now folded in via this WP), and the install-time skipWaiting is removed accordingly. ARCHITECTURE.md §1.6 aligned with Spanish §1.6.`
- **`IMPLEMENTATION_PLAN.md`** — supersede the WP-DEP-G-2 card's "independence" note (line 160 in the original); update WP-ARCH-G-3 card to record the absorption of WP-DEP-G-2 scope; mark WP-DEP-G-2 closed-by-absorption in the WP index.

## 7. B-4 disposition

**Closed by design.** No separate Principal call required.

The original B-4 framing asked "intentional or reactive?" The design pass answers it as **reactive** based on:

- The commit message at `f79e45c` ("with skipWaiting on install to force update") names a specific operational problem — v9→v10 not propagating to users.
- The proper fix for that operational problem is `{ updateViaCache: 'none' }` (WP-DEP-G-2 #1), which addresses the iOS Safari sw.js HTTP-cache that was masking the deploy. Install-time `skipWaiting` was a workaround that bypassed the user-accept gate as a side effect, not a deliberate divergence from Spanish §1.6.
- With WP-DEP-G-2's hardening landing in the same commit, the original problem cannot recur, so the workaround is no longer needed.

Engineer brief should note that B-4 is closed by this WP and does not require a follow-up routing to Dispatch.

## 8. Notes for DevOps Manager (engineer brief drafter)

- **Verification sequence required.** iOS Safari in-browser, iOS Safari standalone PWA (cold-launch + warm reload + mid-session-deploy paths), and one desktop browser. The standalone PWA path is the load-bearing one — it's where the four hardening changes earn their keep, and it's the surface where the WP-DEP-G-2 revert was triggered.
- **Same-commit bundle.** `sw.js` edit + `index.html` registration block edit + four doc edits + `CACHE_NAME` bump in one commit. Splitting risks an interim state where `sw.js` no longer skipWaitings but `index.html` registration is unhardened (banner shows but cold-launch waiting-SW path doesn't surface). One committer, one commit.
- **Post-merge verification.** After deploy, do a fresh-incognito install on iOS Safari to confirm v14 SW activates without forcing the user through the banner on first install (regression test for the matrix entry that says "no banner for first installs"). Then in a separate session that already has v14 installed, deploy a v15 (any trivial bump — e.g., a comment in `sw.js`) and confirm the banner appears, click activates+reloads.
- **No interaction with parallel WPs at the file level.** WP-FE-G-1 touches `index.html` head (insertion at L7); WP-AUD-G-1 touches `sw.js:38–51` and unrelated `index.html` lines (L19838, L20803). Coordinate `CACHE_NAME` slot only.
- **No CSP coordination.** WP-FE-G-1 hasn't enforced CSP yet; this WP doesn't add any external hosts. ARCHITECTURE.md §3.4 inseparability rule not triggered.

---

**Standing by for DevOps Manager engineer brief.**

---

# Amendment 1 — 2026-04-19

**Trigger:** Verification regression at §9.5 (Desktop Scenario A) on commit `b1b1ebf` / `b3be197`, branch `feat/wp-arch-g-3-skipwaiting-fix`. Verification log at `plans/work-packages/WP-ARCH-G-3_verification.log`.
**Author:** Senior Dev Oversight (opus).
**Reopens:** Design §5 `index.html` registration block edit (specifically change #2, `reg.update()`).
**Does NOT reopen:** Option A itself, §1.6 promotion, the other three WP-DEP-G-2 hardening changes, or B-4's closed-by-design disposition.

## A.1 Engineer finding

On desktop Chrome, post-deploy `v14` cold install (origin scrubbed, registrations unregistered, caches deleted, fresh navigate, 5s settle) reliably leaves:

- Two SW instances: one `active` (SW-1), one `waiting` (SW-2).
- `navigator.serviceWorker.controller === null` at 5s settle.
- `bannerHasVisible: true`.
- `caches.keys() === []` (no `werkstatt-v14` cache populated).

Root cause identified in log §9.5: `reg.update()` double-install race. `register().then()` fires before the browser has populated `reg.installing`. All three worker slots are null at that moment. `reg.update()` treats this as "no established worker" and kicks off a second install. SW-1 (from `register()`) wins the activation race; SW-2 (from `reg.update()`) transitions to `installed` with `reg.active` non-null (= SW-1) → the guard in change #4 passes → banner shown.

The engineer's mechanism analysis is correct. Reproducible across two runs. The `caches.keys() === []` anomaly is a likely side effect of the race (either two SWs racing for the same cache name caused one to clobber the other, or the test's pre-navigate `caches.delete()` ordering interacted with in-flight install). Secondary concern — not blocking; expected to resolve once the primary race is eliminated.

## A.2 Verdict — Option 1 (engineer's enumeration)

**Guard `reg.update()` on `reg.active` presence.** Change design §5 change #2 from unconditional `reg.update()` to:

```js
if (reg.active) reg.update();
```

No other code change. No platform-conditional. The three other hardening changes stand unchanged.

## A.3 Why not Option 2 (`navigator.serviceWorker.ready.then(reg => reg.update())`)

Option 2 is also correct and also eliminates the race. It's more robust against future SW-lifecycle-timing assumptions (deferring to the standard `ready` promise is semantically cleaner than asserting on `reg.active`). The reason I'm not picking it:

- Diff size is essentially the same.
- The `if (reg.active)` guard reads at-a-glance as "only check for updates if there's something to update from" — which is precisely the behavioral intent.
- Option 2's `ready` semantics bring in a small but real correctness question: on a subsequent visit where a new SW is already in `waiting` from a prior session, `ready` resolves with the old active SW; calling `reg.update()` on that registration then fetches sw.js fresh and may trigger a third-install race if bytes changed during the brief window between `ready` resolution and `reg.update()` — unlikely but not impossible. Option 1 has no such window.
- If a future Amendment 2 surfaces a case Option 1 misses, switching to Option 2 is a mechanical one-line change. Starting with Option 1 preserves optionality.

Option 2 is **acceptable as a substitute** if the engineer or DevOps Manager prefers it for readability reasons. Both produce the same behavior-matrix outcomes. If Option 2 is chosen, the patch is:

```js
navigator.serviceWorker.ready.then(r => r.update());
```

(inside the `.then(reg => {…})` body, at the same position as the current `reg.update();`).

## A.4 Why not Option 3 (`navigator.serviceWorker.controller` in the guard)

Reintroduces the iOS standalone first-launch null-`controller` race that motivated the switch to `reg.active` in the first place. Spanish commit `42e18fa` specifically moved off `controller` for this reason. Accepting Option 3 would be a silent regression on the load-bearing Cam-acceptance surface.

**Rejected.**

## A.5 Why no Option 4 (composite guard, platform-conditional, etc.)

Composite guard like `&& reg.active && navigator.serviceWorker.controller` combines a true-positive predicate with a false-negative predicate — `AND` of them keeps the false negative. On iOS standalone first launch with a prior waiting SW (banner SHOULD show), `controller` may be null → composite guard fails → banner suppressed. Worse than Option 1.

Platform-conditional (sniff UA, different paths for iOS standalone vs. desktop) adds complexity without new correctness. The same `reg.active` guard works on both platforms once the race is eliminated. Rejected.

No other option emerged on re-analysis. Option 1 is the recommendation; Option 2 is acceptable if preferred.

## A.6 Addressing the engineer's stated tradeoff

The engineer flagged Option 1's tradeoff as: "`reg.update()` was added specifically to force detection on iOS standalone first launch (where `reg.active` would also be null on truly first install)."

That framing conflates two scenarios:

1. **iOS standalone "first launch" = user just added to home screen moments ago, no prior SW state.** `reg.active` is null here. `reg.update()` is also useless here — there's no prior SW state to compare against. Skipping it loses nothing. ✓
2. **iOS standalone "first launch of the session" = user opens the PWA that was installed days ago, a prior SW exists.** `reg.active` is non-null (the prior-session SW). `reg.update()` runs and force-checks for new sw.js bytes. This is the load-bearing case `reg.update()` was added for. Guard correctly enables it here. ✓

The engineer's concern is valid for interpretation (1) but in that interpretation `reg.update()` provides no benefit anyway. Interpretation (2) is the one that motivated change #2, and Option 1 preserves it correctly.

No platform-conditional needed. No behavior-matrix row changes for iOS standalone.

## A.7 Updated patch (delta against commit `b1b1ebf`)

Single line change on top of the landed commit. Against `index.html` at the line corresponding to the current `reg.update();` call (L24683 per the verification log §7.1 grep):

```diff
-    reg.update();
+    if (reg.active) reg.update();
```

Everything else — `{ updateViaCache: 'none' }` at L24680, `reg.waiting && reg.active` check at L24688, `reg.active`-guard in the `statechange` handler at L24699 — stays as currently landed.

`CACHE_NAME` bumps once for the fix: `werkstatt-v14` → `werkstatt-v15`.

**Slot-map impact.** The original slot plan had `v15` reserved for WP-FE-G-1 Report-Only. Since `v14` consumed but the WP did not pass verification, the fix-forward takes `v15` and shifts WP-FE-G-1 Report-Only → `v16`, WP-AUD-G-1 → `v17`, WP-FE-G-1 enforcing → `v18`. Engineer brief confirms the new slot map with the three parallel WP owners.

## A.8 Behavior-matrix row correction

The original §3 matrix Row 1 ("Cold-load fresh visitor") asserted:

> `updatefound` fires but the `if (… && reg.active)` guard means banner only shows if there's an old controller (i.e., it's an *update*, not first install).

This assertion held only in the absence of the `reg.update()` double-install race. Under the race, the second install's `statechange === 'installed'` fires with `reg.active` non-null, falsifying the guard's intent.

With Amendment 1's patch, Row 1 reads correctly:

> On first install, `reg.active` is null at the moment `register().then()` fires, so the `if (reg.active) reg.update()` guard skips the second install. SW-1 installs alone, transitions to `installed` (guard sees `reg.active = null` → banner suppressed), then activates. No banner. ✓

Other matrix rows unchanged. The `updatefound`-path guard (`&& reg.active` at change #4) is still correct because in any subsequent-visit scenario `reg.active` is the prior-session SW (or the mid-session old SW), which is exactly the "is this an update" signal we want.

## A.9 Doc-update implications

**No re-opening of any §1.6 promotion or §11.7 scoring.** Option A itself (remove install-time `skipWaiting`) is unchanged. The four hardening changes are unchanged except for one of them gaining a one-line guard. PARITY_GAP rows scored in §6 of the original design hold:

- §11.7 row 3 (`reg.update()` exists): still `MATCH`. The row is satisfied by `reg.update()` being called; the guard is a correctness detail, not a presence question.
- §11.7 row 5 (iOS hardening set): still `MATCH`. All four changes present; one is more correctly specified.
- §11.7 supplementary A1: still `MATCH`.
- ARCHITECTURE.md §1.6: still promotes `provisional` + `adopt-and-enforce` → `enforced`. The "Hardening pending" sub-bullets describe the four changes; change #2's description gains "guarded on `reg.active` to avoid first-install double-install race" — trivial doc edit, rides the same commit.
- SPEC.md §8.3.1 rewrite: same as original design §6 doc-updates list, with one sentence added noting the `reg.active` guard rationale.
- ARCHITECTURE.md §6 change log: one entry for the amendment, citing the verification regression and the guard fix. Separate entry from the original §1.6 promotion (or a single combined entry — engineer brief decides, stylistic).
- B-4 disposition: **still closed by design.** The amendment doesn't re-open the intentional-vs-reactive question; it refines a mechanism choice within the reactive path.

The engineer's score recompute at §6 holds. Net changes to the score summary table hold.

## A.10 Instruction to the engineer

**Fix-forward commit on top of `b1b1ebf` / `b3be197`, same branch `feat/wp-arch-g-3-skipwaiting-fix`:**

1. One-line change to `index.html`: `reg.update();` → `if (reg.active) reg.update();` (current location per verification log §7.1: L24683).
2. Bump `CACHE_NAME` at `sw.js:4` from `werkstatt-v14` to `werkstatt-v15`.
3. Add one sentence to the SPEC.md §8.3.1 rewrite noting the guard.
4. Append one change-log entry to ARCHITECTURE.md §6 referencing Amendment 1 and the verification regression it responded to.
5. Re-run §7.1 curl probes (verify `v15` bytes, four hardening patterns present, plus the guarded `if (reg.active) reg.update()` string).
6. Re-run §7.2 Desktop Scenario A on the deployed `v15`. Expected: no banner, one SW in `activated`, no SW in `waiting`, `werkstatt-v15` cache populated with 7 entries.
7. If Scenario A passes on `v15`, proceed to Scenario B (update-detection) and iOS Safari verification per the original engineer brief §7.2–§7.4.
8. If Scenario A still fails on `v15`, stop and raise — we'd be in genuinely new territory and the design would need a third pass.

**Alternative.** If DevOps Manager or the engineer prefers Option 2 (`navigator.serviceWorker.ready.then(r => r.update())`) for readability, either is acceptable — same verification sequence applies to both. Pick one, commit, verify. Don't commit both variants.

## A.11 Side-question for post-fix verification (not blocking)

The `caches.keys() === []` observation at 5s settle on the current `v14` verification is expected to resolve once the double-install race is eliminated — either SW-1 or SW-2 was clobbering the cache during the race, which can't happen if only one install runs. If `v15` verification reproduces `caches.keys() === []` after a successful-looking install, raise — that would indicate a separate issue unrelated to the banner race.

## A.12 ETA to verdict (for Dispatch)

Delivered in this turn.

---

**End of Amendment 1. Standing by for DevOps Manager engineer brief revision.**

---

# Amendment 2 — 2026-04-19

**Trigger:** Verification regression at §9.6 (Desktop Scenario A re-run on v15) on commit `8a21979`, branch `feat/wp-arch-g-3-skipwaiting-fix` (FF-merged to main). Verification log update at commit `6852603`. Banner persists on what the test methodology presents as a fresh first install. v14 cache anomaly resolved (precacheCount: 7 ✓).
**Author:** Senior Dev Oversight (opus).
**Reopens:** Amendment 1's specific patch (the `if (reg.active) reg.update()` guard). The underlying decision tree (Option A vs. B vs. C from the original design) is reopened only insofar as Amendment 1's premise turned out to be wrong about Chrome's `register()` Promise timing.
**Does NOT reopen:** Option A itself (remove install-time `skipWaiting`); §1.6 promotion direction; the other three WP-DEP-G-2 hardening changes (`updateViaCache: 'none'`, `reg.waiting && reg.active` registration-time check, `reg.active`-over-`controller` in the statechange guard); B-4's closed-by-design disposition.

## A2.1 Why Amendment 1 didn't work

Amendment 1's premise: `reg.active === null` at `.then()` time on a genuine first install, so `if (reg.active) reg.update()` correctly skips the second-install trigger on first install while preserving it on subsequent visits.

The v15 evidence falsifies the premise. The engineer's instrumented probe shows `reg.active = "activated"` at `t=1ms` after `.then()` resolves. The engineer correctly noted the probe was on a re-registration, not a true first-install IIFE — but the more careful reading is that this **does** transfer: Chrome's `register()` Promise resolves after SW-1 has completed its install→activate transition, regardless of whether the registration is fresh or pre-existing. On a genuine first install, `reg.active` is the just-activated SW-1 at `.then()` time.

So Amendment 1's guard fires true on first install, `reg.update()` runs, triggers a second install, SW-2 enters waiting, both banner-trigger paths (L24688 registration-time check, L24699 statechange handler) light up. Banner shown.

## A2.2 The right diagnosis

The mechanism the engineer's probe surfaced is that **Chrome's `register()` and `reg.update()` interact poorly when called in immediate succession** — `register()` resolves with an active SW, `reg.update()` then sees a registration that the spec's "newest worker" selection treats as ripe for a fresh install (because no `installing` worker is present and the active worker may be considered "not in flight"), and a second install kicks off concurrent with the first.

This is browser-implementation behavior, not a spec violation as far as I can tell. Different browsers may handle this differently. iOS Safari may also have its own quirks.

The cleanest fix is to **eliminate the `reg.update()` call** rather than try to time-guard it.

## A2.3 Verdict — Engineer Option B (remove `reg.update()` entirely)

Replace Amendment 1's `if (reg.active) reg.update();` line with a comment explaining the removal. The other three hardening changes stand unchanged.

### Why Option B over A

**Engineer Option A (defer `reg.update()` to `navigator.serviceWorker.ready.then(r => r.update())`):**

Option A defers `r.update()` until after `ready` resolves, which is supposed to happen once the SW activates and claims the page. In the v15 settle-state evidence, `controller: null` at 5s — meaning `clients.claim()` either didn't run successfully or didn't claim this page (Chrome MCP environment quirk; or possibly a real Chrome behavior). If `controller` is null, `ready` may not have resolved either, and `r.update()` may never fire — which would actually fix the issue but only by accident (relying on `clients.claim()` not working).

In a healthier environment where `clients.claim()` does claim the page, `ready` resolves promptly, `r.update()` fires, and we're back to the same scenario Amendment 1 hit: `r.update()` against a freshly-installed SW that may still trigger a redundant second install via Chrome's "no installing worker, run install" behavior.

So Option A is **environment-dependent**. It might work; it might not. Not a robust fix.

**Engineer Option C (replace `reg.active` with `controller` in both banner guards):**

Reintroduces the iOS standalone first-launch null-`controller` race. Spanish commit `42e18fa` was specifically authored to move OFF `controller` for that reason. We named the race in Amendment 1's analysis as a hard rejection criterion. Option C still rejected.

**Engineer Option B (remove `reg.update()` entirely):**

`updateViaCache: 'none'` already provides per-page-load update detection — the browser fetches `sw.js` fresh on every navigation within scope; if bytes differ, install fires automatically. `reg.update()` is **redundant for per-launch detection** when `updateViaCache: 'none'` is set.

The only behavioral capability `reg.update()` provides over what `updateViaCache: 'none'` already provides is **mid-session update detection** — forcing a re-check during an open page session without requiring a navigation. For the principal-only audience, mid-session detection isn't needed. Cam relaunches the PWA when she wants to use it; banner appears at relaunch if there's a new version.

Option B is the simplest possible fix: one line removed. No conditional logic. Eliminates the race window unconditionally because the trigger doesn't fire at all. Independent of browser-specific `clients.claim()` timing and independent of test environment quirks.

### What about the L24688 registration-time check?

**Leave it as-is. No adjustment needed.**

L24688 fires when `reg.waiting && reg.active` are both non-null at `.then()` time. With `reg.update()` removed:

- **True first install:** `register()` returns. SW-1 installs and activates (no competing controller). `.then()` fires. `reg.active = SW-1`, `reg.waiting = null`. Guard fails on the `reg.waiting` half. Banner not shown. ✓
- **Subsequent visit with prior session waiting SW** (the use case L24688 was added for): `register()` returns existing registration. Prior session left `reg.active = old SW`, `reg.waiting = new SW`. `.then()` fires with both non-null. Guard fires. Banner shown. ✓
- **Subsequent visit, deploy mid-session:** `register()` returns existing. `reg.active` = current. Browser detects new sw.js (per `updateViaCache: 'none'`); install fires; SW-new enters waiting. `updatefound` listener catches it; statechange handler at L24699 surfaces banner. ✓

All three matrix rows hold under Option B with the L24688 and L24699 guards unchanged.

The candidate-#3 framing ("L24688 is the real fire source") was correct as a description of the proximate trigger but missed that the upstream condition for it to fire spuriously is the existence of a `reg.waiting` populated by something other than a real prior-session SW. With `reg.update()` removed, on first install `reg.waiting` stays null. L24688 has nothing to fire on. The L24699 statechange path likewise has no `installed`-state event to fire on for SW-2 because SW-2 doesn't exist.

### Concrete patch (delta against commit `8a21979`)

`index.html` registration block — single change, replacing the Amendment 1 guard:

```diff
-    // (WP-DEP-G-2 #2) Trigger explicit update check; iOS standalone PWAs do not
-    // reliably auto-poll. Safe to call even on first install.
-    if (reg.active) reg.update();
+    // (WP-DEP-G-2 #2 — removed in Amendment 2) Explicit reg.update() was originally
+    // intended to force update detection on iOS standalone PWA where the browser's
+    // auto-poll is unreliable. Verification (v14 §9.5, v15 §9.6) established that
+    // the call triggered a double-install race on Chrome: register() resolved with
+    // SW-1 already activated, the immediate reg.update() saw a registration with
+    // no installing worker and kicked off a second install, the second install
+    // entered waiting, and the L24688/L24699 banner-trigger paths fired spuriously.
+    // Per-page-load update detection is now provided solely by updateViaCache: 'none'
+    // (WP-DEP-G-2 #1, line above) — the browser fetches sw.js fresh on every
+    // navigation within scope and auto-installs on byte change. Mid-session update
+    // detection is acceptably lost for the principal-only audience. German diverges
+    // from Spanish §1.6 here; see ARCHITECTURE.md §1.6 (Amendment 2 note) for the
+    // recorded divergence rationale. See plans/work-packages/WP-ARCH-G-3_design.md
+    // Amendment 2.
```

(The comment is long because the WHY is non-obvious and a future reader trying to "fix" the missing `reg.update()` would re-introduce the race. Inline comments are the right place for this guard against regression.)

`sw.js` `CACHE_NAME` bumps from `werkstatt-v15` to `werkstatt-v16`.

No other code changes. The L24688 guard, L24699 guard, and `controllerchange` reload handler all stay as currently landed.

### Slot-map shift

Amendment 2 takes `v16`. WP-FE-G-1 Report-Only shifts to `v17`, WP-AUD-G-1 to `v18`, WP-FE-G-1 enforcing to `v19`. Engineer brief confirms with the three parallel WP owners.

(Justification: v15 consumed Amendment 1's substantive code change. Even though Amendment 1 was inert from a behavior perspective, it was a real code edit and a real deploy. Reusing v15 for Amendment 2 would risk caching-state ambiguity — clients that fetched the v15 sw.js with the Amendment 1 guard would not necessarily re-fetch when v15 is republished with a different sw.js body. Fresh slot is the safe choice.)

## A2.4 Updated behavior matrix

The original §3 matrix and Amendment 1's Row 1 correction are both superseded for first-install. Updated matrix:

| Surface | Behavior under Amendment 2 |
|---|---|
| **Cold-load fresh visitor (browser tab)** — no SW installed yet | `register()` runs, SW-1 installs, activates (no competing controller). `.then()` fires with `reg.active = SW-1`, `reg.waiting = null`. No `reg.update()` call. L24688 check fails (`reg.waiting` is null). `updatefound` listener attaches but no further `installing` event occurs. **No banner.** ✓ |
| **Warm-load returning visitor (browser tab)** — old SW active | `register()` returns existing registration. Browser fetches `sw.js` fresh per `updateViaCache: 'none'`. New bytes detected; new SW (SW-N) installs, transitions to `installed`, enters `waiting`. `updatefound` fires; statechange listener fires with `reg.active = old SW` non-null → banner shown. User clicks → SKIP_WAITING → activates → reload → user on new version. ✓ |
| **Warm-load with already-waiting SW from prior session** | `register()` returns existing registration. At `.then()` time: `reg.active = old SW`, `reg.waiting = new SW from prior session that wasn't accepted`. L24688 check fires immediately. **Banner shown.** ✓ |
| **iOS Safari standalone PWA cold-launch with prior SW** | Same as warm-load returning visitor. `updateViaCache: 'none'` ensures `sw.js` is fetched fresh from network even if iOS HTTP cache holds an old copy. Browser auto-detects new bytes on the navigation, installs new SW, statechange handler with `reg.active`-guard fires. Banner shown. ✓ |
| **iOS Safari standalone PWA mid-session** | `updateViaCache: 'none'` is per-fetch behavior; no `sw.js` re-fetch happens during a continuous standalone session unless the user causes a navigation. **Mid-session deploy detection is lost.** Acceptable for principal-only audience — Cam will see the new version on her next launch. (Spanish retains `reg.update()` for this case; German diverges; recorded in §1.6.) |

Three of five rows unchanged from Amendment 1's matrix. Row "cold-load fresh visitor" now correct under Amendment 2 (was nominally correct under Amendment 1 but actually broken due to the Chrome timing). Row "iOS Safari standalone PWA mid-session" loses its detection capability but remains user-recoverable via relaunch.

## A2.5 Doc / scoring implications — RE-OPENED: §11.7 row 3

This amendment **does** re-open one PARITY_GAP scoring decision. Other sections hold.

### `PARITY_GAP.md §11.7 row 3` ("SW registered with `{ updateViaCache: 'none' }` and explicit `reg.update()`")

Originally rescored to `MATCH` in the WP-DEP-G-2 / WP-ARCH-G-3 doc updates list. Under Amendment 2, this rescores to **`DIVERGENT (intentional, recorded)`** because:

- `{ updateViaCache: 'none' }` is present (the row's first half — MATCH on that half).
- Explicit `reg.update()` is **removed** (the row's second half — diverges from Spanish).

Justification line: *"Intentional because: explicit `reg.update()` triggered a double-install race on Chrome that surfaced spurious update banners on first install (verification §9.5 v14 / §9.6 v15). Per-page-load update detection is preserved by `updateViaCache: 'none'`; mid-session update detection is acceptably lost for the principal-only audience. Spanish ARCHITECTURE.md §1.6 retains `reg.update()`; German removes it via WP-ARCH-G-3 Amendment 2."*

Score-summary table recomputation: §11.7 row 3 shifts MATCH → DIVERGENT. §11.7 totals: MATCH was 4 under WP-DEP-G-2/WP-ARCH-G-3 closure, becomes 3; DIVERGENT was 0, becomes 1. (The score-summary at the top of `PARITY_GAP.md` should be updated by the engineer brief author as part of the doc-edit pass.)

### `ARCHITECTURE.md §1.6` — divergence record added

§1.6 still promotes `provisional` + `adopt-and-enforce` → `enforced`, but with a recorded German-specific divergence:

> **German-specific divergence from Spanish §1.6 (recorded 2026-04-19, WP-ARCH-G-3 Amendment 2).** German omits the explicit `reg.update()` call from the registration block. Per-page-load update detection is provided solely by `updateViaCache: 'none'`. Mid-session update detection is intentionally not provided. Rationale: the explicit `reg.update()` triggered a double-install race on Chrome (verification §9.5 / §9.6); the principal-only audience's relaunch cadence makes per-page-load detection sufficient; preserving the call would re-introduce the regression. The divergence is recorded here as load-bearing — a future Spanish-parity-aligned change that adds `reg.update()` back must address the race first (e.g., via Cam's last-seen-cache-name approach noted in §A2.7 below).

### `SPEC.md §8.3.1`

Update the SW registration description to reflect Amendment 2: three of the four hardening changes apply (not four); explicit `reg.update()` was removed; the rationale for removal (race + redundancy) is documented inline.

### `ARCHITECTURE.md §6` change log

Append:

| 2026-04-19 | §1.6 enforced with recorded German-specific divergence: explicit `reg.update()` removed per WP-ARCH-G-3 Amendment 2 (verification §9.5 / §9.6). Per-page-load detection retained via `updateViaCache: 'none'`. | Senior Dev Oversight Engineer |

### Other rows / B-4

- `PARITY_GAP.md §11.7 row 5` ("iOS Safari update-detection hardening (`reg.waiting` check at registration, `reg.active` instead of `controller`, `updatefound` handler)"): **still MATCH.** Three of three sub-checks present.
- `PARITY_GAP.md §11.7 supplementary A1` (install-time skipWaiting): **still MATCH.** Install-time `skipWaiting()` removal is unchanged across both amendments.
- `SPEC.md` Appendix B #B-4: **still closed by design.** The intentional-vs-reactive question is unaffected; Amendment 2 refines a mechanism choice within the reactive path.
- `IMPLEMENTATION_PLAN.md`: WP-DEP-G-2 absorption note unchanged; WP-ARCH-G-3 closure note now references Amendment 2.

## A2.6 Instruction to the engineer

**Fix-forward commit on top of `8a21979`, new branch off main:**

1. One-line change to `index.html`: replace `if (reg.active) reg.update();` with the multi-line comment from §A2.3 (verbatim — the comment carries the regression-prevention guidance).
2. Bump `CACHE_NAME` at `sw.js:4` from `werkstatt-v15` to `werkstatt-v16`.
3. Update `SPEC.md §8.3.1` to reflect the three-of-four hardening pattern.
4. Append the change-log entry to `ARCHITECTURE.md §6` from §A2.5.
5. Add the "German-specific divergence" paragraph to `ARCHITECTURE.md §1.6` from §A2.5.
6. Update `PARITY_GAP.md §11.7 row 3` score and justification per §A2.5.
7. Recompute and update the score-summary table at the top of `PARITY_GAP.md` (§11.7: MATCH 4→3, DIVERGENT 0→1; totals shift accordingly).
8. Re-run §7.1 curl probes (verify `v16` bytes, `if (reg.active) reg.update()` ABSENT, three remaining hardening patterns present).
9. Re-run §7.2 Desktop Scenario A on the deployed `v16`. Expected: no banner, ONE SW in `activated`, NO SW in `waiting`, `werkstatt-v16` cache populated with 7 entries.
10. If Scenario A passes on `v16`, proceed to Scenario B (update-detection on a true update — deploy a trivial v17 bump and confirm banner appears, click activates+reloads). Then iOS Safari verification per the original engineer brief §7.2–§7.4.
11. **If Scenario A still fails on `v16`** — i.e., banner still shown on what test methodology presents as fresh first install — that is genuinely new territory and **the design needs Amendment 3**, which would explore Cam's original last-seen-cache-name approach (see §A2.7 below) as the only signal-source robust to all SW-lifecycle quirks across all environments.

## A2.7 If Amendment 2 still doesn't fix it — pre-staged Amendment 3 direction

Recording for traceability. If the engineer reports v16 verification failure with the same banner-on-first-install symptom and the unregister-and-cache-clear methodology is the same, the conclusion is that some path other than `reg.update()` is producing the second install (or that the test environment is producing a state genuinely indistinguishable from "real prior-session waiting SW"). In either case, SW-lifecycle-state sniffing is fundamentally insufficient as a banner-trigger signal source.

The robust alternative is the approach Cam originally floated as Option B in the design pass: **client-side last-seen-CACHE_NAME tracking** as the truth source. Outline:

- New `localStorage` key: `uw_lastSeenCacheName`.
- SW posts `{type: 'CACHE_NAME', value: CACHE_NAME}` to clients on `install` (or via an explicit message handler).
- Client compares against stored last-seen. Show banner only if differ AND stored value is set (first-ever install: store the live name without showing a banner).
- On banner click, store the new name and post SKIP_WAITING.
- L24688 and L24699 SW-lifecycle-based banner triggers are **removed** in this approach; the `controllerchange`-then-reload path stays.

This approach is unambiguous across all browsers, all platforms, all SW lifecycle quirks, and all test environments. Cost: new localStorage key (must be added to `_restoreFromIDB()` manifest once §1.3 IDB mirror lands), new SW message-type, new client-side message listener. The cost was the reason we declined Option B in the original design pass; if the simpler approach genuinely cannot be made to work, the cost becomes warranted.

**Do not pre-implement Amendment 3 in the same commit as Amendment 2.** Amendment 2 is a single-line removal that should be tested in isolation. If Amendment 2 fixes the issue, Amendment 3 is unneeded. If Amendment 2 doesn't fix it, Amendment 3 lands as a fresh design pass with its own engineer brief and verification cycle.

## A2.8 ETA to verdict (for Dispatch)

Delivered in this turn.

---

**End of Amendment 2. Standing by for DevOps Manager engineer brief revision (or, if v16 fails Scenario A, escalation for Amendment 3 design).**

---

# Amendment 3 — 2026-04-19 — pre-staged

**Status:** Pre-staged, not yet issued. Written in parallel with Principal's narrowing clarification of the iOS symptom. Promotes to issued Amendment 3 once Principal confirms the symptom shape and/or the engineer's diagnostic instrumentation returns. Until then, this section is scaffolding for the next engineer task and is available for partial lift if Dispatch wants to ship diagnostic instrumentation ahead of a full Amendment 3.
**Trigger:** Post-Amendment 2 Chrome desktop verification passed both Scenario A (fresh install, no banner) and Scenario B (v17 update detection + click + reload + v17 active). Principal reports iOS banner persistence. Symptom shape not yet narrowed.
**Author:** Senior Dev Oversight (opus).
**Reopens:** If issued, would reopen the SW-lifecycle-based banner-trigger mechanism in favor of client-side version tracking.
**Does NOT reopen:** Option A itself; §1.6 promotion with the recorded `reg.update()` divergence from Amendment 2; the other three hardening changes; B-4.

## A3.1 Reassessment of §A2.7 in the iOS-specific context

§A2.7 proposed client-side last-seen-CACHE_NAME tracking as the fundamental alternative if SW-lifecycle-state sniffing proves insufficient. The iOS evidence **partially** supports that framing — but only partially, and the distinction matters.

iOS Safari's SW implementation diverges from Chrome in several known ways:

- Pre-iOS 16.4 standalone PWAs lacked SW support entirely; 16.4+ added it but with open-book quirks.
- `clients.claim()` does not reliably claim standalone PWA clients across launch sessions — a SW that activated via SKIP_WAITING may fail to claim the existing document, leaving `controllerchange` unfired.
- `reg.waiting` / `reg.active` slot timing can lag the spec (slots populate later than on Chrome, or persist longer across session boundaries).
- `{ updateViaCache: 'none' }` may or may not be fully honored on a given iOS version.
- `reg.waiting.postMessage()` delivery to a waiting SW may be delayed or dropped under memory pressure.
- Standalone PWA (A2HS) may share or partition the SW registration with the Safari tab that added it, depending on iOS version.

The reason these matter for our banner decision:

The last-seen-CACHE_NAME approach (§A2.7) is robust against **hypotheses where `reg.waiting` is populated for iOS-specific reasons that don't reflect a real user-actionable update** — e.g., stale-waiting-SW across session boundaries, iOS auto-poll producing a spurious concurrent install, or byte-comparison quirks making the browser repeatedly "detect" an update that's actually the same version. In all those cases, the stored last-seen matches the live CACHE_NAME → banner correctly suppressed.

But the approach is **not** robust against hypotheses where the *click path* itself is broken — SKIP_WAITING not delivering, `controllerchange` not firing, `clients.claim()` not claiming. In those cases, the banner may be correctly shown (there IS a real waiting SW), the user clicks, the update *logically* completes but the page never reloads, and the waiting SW persists. Next page load: banner shown again. Amendment 3 doesn't fix this class — it's a banner-visibility mechanism, not an activation mechanism.

**Conclusion: §A2.7 is correct as a banner-visibility fix, but if the iOS failure mode is in the activation/reload path, Amendment 3 alone is insufficient.** Need to diagnose before committing.

## A3.2 Amendment-2-adjacent tweaks — evaluated and mostly rejected

Candidates Dispatch named plus a sweep for others:

| Tweak | Description | Verdict |
|---|---|---|
| Wait for `controllerchange` before "truly installed" | Don't fire banner on `statechange === 'installed'`; wait for `controllerchange` | **Rejected.** `controllerchange` fires AFTER the user clicks SKIP_WAITING and the new SW activates. Waiting for it means banner is never shown. Conflates "new SW is ready to activate" with "new SW has activated" — opposite semantics. |
| `navigator.serviceWorker.controller.state` as additional guard | Read `controller.state`; treat unusual values as banner-suppress signal | **Rejected.** When `controller` is non-null, its state is `'activated'` by definition. Additional information is nil. |
| `if (reg.waiting && reg.waiting !== reg.active)` defensive check | Guard against spurious "waiting = active" states iOS might produce | **Marginal.** Would defend against a specific iOS bug pattern if that bug actually exists. Spec says `waiting !== active` always; if iOS violates this, the check helps. Low-cost addition to L24688. |
| Debounce banner-show (e.g., 300ms delay after `.then()`) | Let SW lifecycle settle before checking state | **Rejected on reliability grounds.** Arbitrary delay; symptom-masking not root-cause fixing; may or may not align with iOS timing. |
| MessageChannel-acked `SKIP_WAITING` | Use a MessageChannel so the SW can acknowledge receipt of SKIP_WAITING; time out if no ack | **Marginal as a diagnostic, low value as a fix.** If SKIP_WAITING is dropped on iOS, the ack would also be dropped. But a timeout→fallback path could add a user-visible error message rather than silent failure. Useful as diagnostic instrumentation. |
| Audit `clients.claim()` effectiveness | Check whether the page becomes controlled after SW activation | **Diagnostic only; not a fix.** Answers whether Hypothesis D is the issue. |
| Platform-conditional UA sniff for iOS | Different banner-show logic on iOS | **Rejected.** Platform-sniffing is a code smell and doesn't address why the underlying SW lifecycle diverges. |

Net: none of the Amendment-2-adjacent tweaks are obvious wins without knowing which failure mode is actually at play. The `reg.waiting !== reg.active` defensive check and the MessageChannel-ack pattern are the only ones worth considering as small additions, and even those are targeted at specific hypothesized failure modes rather than being general fixes.

**The shape of the iOS failure matters more than the choice of fix.** Whether Amendment 3 is warranted, or a smaller tweak suffices, depends on which hypothesis is correct.

## A3.3 Recommended sequence — diagnose, then fix

**Diagnose first.** Strongly recommended. Amendment 3 is a real commitment (new localStorage key, new SW message-type protocol, doc updates, §1.3 IDB-manifest implications once that lands); shipping it blind and discovering it doesn't work on iOS either puts us in Amendment 4 territory with a bigger code debt and bigger rollback cost.

Two-phase path:

**Phase D (diagnose) — ship instrumentation on a v18 bump.** Inline, deliberately temporary (to be removed in the next commit after iOS evidence lands). Four instrumentation points, all minimally invasive:

1. **SW registration state at `.then()` time** — write to `localStorage.setItem('uw_diag_reg_state', JSON.stringify({t: Date.now(), active: reg.active?.state, waiting: reg.waiting?.state, installing: reg.installing?.state, controller: !!navigator.serviceWorker.controller, cacheName_hint: 'v18'}))`.
2. **SW install and activate hooks in sw.js** — `self.addEventListener('install', …)` and `self.addEventListener('activate', …)` write to a client log (via `clients.matchAll` + postMessage) with `{type: 'sw_lifecycle', event: 'install|activate', cacheName: CACHE_NAME, t: Date.now()}`. Client-side listener stores to `uw_diag_sw_log` (appending, capped at 20 entries).
3. **Banner-click instrumentation** — on click, capture `reg.waiting?.state`, `reg.waiting?.scriptURL` (to confirm SW identity), then send SKIP_WAITING via MessageChannel with an ack handler that writes to `uw_diag_click_log`. Include a 2-second timeout that records "no ack received" if applicable.
4. **`controllerchange` hook** — write `{t, newController: !!navigator.serviceWorker.controller}` to `uw_diag_controllerchange_log`.

Cam runs the failing iOS scenario. Engineer (or Cam via Settings-modal dev view) retrieves the four `uw_diag_*` localStorage keys and pastes their contents into the WP verification log. Evidence pattern determines which hypothesis matches.

**Phase F (fix) — ship the right fix based on diagnosis.**

Decision tree based on diagnosis evidence:

- **If `uw_diag_reg_state` shows `waiting` populated at `.then()` on what's supposed to be a fresh install** → iOS has spurious waiting SW → Amendment 3 (last-seen-CACHE_NAME) is the right fix.
- **If `uw_diag_sw_log` shows install fires but activate never fires** → SKIP_WAITING not delivering, OR activate handler blocked → investigate SW message delivery; may need MessageChannel-acked SKIP_WAITING; may be iOS version-specific limitation to document.
- **If `uw_diag_click_log` shows SKIP_WAITING sent with no ack** → postMessage delivery broken; need a MessageChannel-with-timeout + user-facing "please close and reopen the app" fallback. Amendment 3's last-seen tracking would suppress the banner after click (if we update last-seen optimistically) but leave the user on the old SW — potentially worse UX than current.
- **If `uw_diag_controllerchange_log` never records** after activate fired → `clients.claim()` not claiming on iOS → reload doesn't happen automatically. Need a fallback reload path: after SKIP_WAITING, if no controllerchange within N seconds, show a secondary "Reload required" prompt.
- **If `uw_diag_sw_log` shows a new install firing on every page load with the same CACHE_NAME** → iOS auto-update loop → Amendment 3 last-seen tracking suppresses the banner for identical versions.

Each path in the decision tree has a targeted fix. Amendment 3 is one of several possible destinations, not the only one.

## A3.4 Amendment 3 detailed design (for the last-seen-CACHE_NAME path specifically)

Deferred until Phase F decision-tree confirms this is the right path. Spelling out the design here so it's ready to lift if diagnosis points to it.

### A3.4.1 New state

One new `localStorage` key:

| Key | Shape | Written by | Read by | Notes |
|---|---|---|---|---|
| `uw_lastSeenCacheName` | `string` (e.g., `"werkstatt-v16"`) | SW-install message handler (client-side, first-ever install); banner-click handler (on confirmed `controllerchange`) | Banner-show decision logic | New key per ARCHITECTURE.md §3.2. Must be added to `_restoreFromIDB()` manifest in the same change as WP-ARCH-G-1 (IDB mirror). Until IDB lands, iOS storage-pressure eviction will reset this key to null, which manifests as a one-time banner suppression on next launch — acceptable degraded behavior. |

No new `sessionStorage` or IDB-specific state.

### A3.4.2 SW message protocol

Two message types, both from SW to client:

- `{type: 'SW_INSTALLED', cacheName: CACHE_NAME}` — posted from the `install` event handler after `cache.addAll` completes. Broadcasts to all windows matched by `clients.matchAll({type: 'window', includeUncontrolled: true})`.

Client-to-SW messages stay unchanged: `{type: 'SKIP_WAITING'}`.

(`SW_ACTIVATED` optional if we want a second signal; probably unnecessary because `controllerchange` is the stronger signal for that. Keeping protocol minimal.)

### A3.4.3 Client logic

Registration block (replaces Amendment 2's current L24681–L24700 logic):

```js
navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
  // Amendment 3: no registration-time banner check. Banner visibility is driven
  // by SW_INSTALLED message + last-seen comparison. This path is unaffected by
  // iOS standalone null-controller races, spurious waiting SWs, or auto-update
  // cycles — the decision is based on user-visible version tracking, not SW
  // lifecycle state.
});

// Listen for SW_INSTALLED messages.
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data?.type !== 'SW_INSTALLED') return;
  const liveCacheName = event.data.cacheName;
  const lastSeen = localStorage.getItem('uw_lastSeenCacheName');
  if (!lastSeen) {
    // First-ever install (or lastSeen was evicted). Record without showing banner.
    localStorage.setItem('uw_lastSeenCacheName', liveCacheName);
    return;
  }
  if (lastSeen !== liveCacheName) {
    // Genuine new version the user hasn't seen yet. Show banner.
    document.getElementById('update-banner').classList.add('visible');
  }
  // Same cacheName: no-op. Covers spurious-install cases where iOS re-installs
  // the same bytes for its own reasons.
});

// controllerchange → reload (unchanged from current).
let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!refreshing) { refreshing = true; location.reload(); }
});

// Banner click: capture the waiting SW's CACHE_NAME, persist, then SKIP_WAITING.
document.getElementById('update-reload-btn').addEventListener('click', () => {
  navigator.serviceWorker.ready.then(reg => {
    if (!reg.waiting) return;  // Nothing to activate.
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => {
      if (e.data?.cacheName) {
        localStorage.setItem('uw_lastSeenCacheName', e.data.cacheName);
      }
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    };
    reg.waiting.postMessage({ type: 'GET_CACHE_NAME' }, [channel.port2]);
  });
});
```

SW changes (`sw.js`):

```js
// Install: precache, then broadcast CACHE_NAME to clients.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'SW_INSTALLED', cacheName: CACHE_NAME });
    }
  })());
});

// Message handler: SKIP_WAITING + GET_CACHE_NAME.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_CACHE_NAME' && event.ports[0]) {
    event.ports[0].postMessage({ cacheName: CACHE_NAME });
  }
});
```

The `activate` handler stays unchanged (cache cleanup + `clients.claim()`).

### A3.4.4 Concrete patches

Replace Amendment 2's registration block (L24681–L24700, not counting `<script>` wrapper) with the Amendment 3 client logic above. Replace `sw.js` install and message handlers with the Amendment 3 SW logic. Keep everything else.

`CACHE_NAME` bumps to `werkstatt-v18` (or next available slot — see §A3.6).

### A3.4.5 Behavior matrix under Amendment 3

| Surface | Behavior |
|---|---|
| **Fresh first install, any platform** | `SW_INSTALLED` message arrives; `lastSeen` is null; store CACHE_NAME, no banner. ✓ |
| **Returning visitor, no new version** | No `SW_INSTALLED` message fires (SW didn't re-install). No banner. ✓ |
| **Returning visitor, genuine new version** | New SW installs; `SW_INSTALLED` message arrives with new CACHE_NAME; differs from `lastSeen`; banner shown. Click → ready → GET_CACHE_NAME → ack updates `lastSeen` to new version → SKIP_WAITING → activate → controllerchange → reload. ✓ |
| **Returning visitor with stale waiting SW from prior session** | Current Amendment 2 behavior uses registration-time `reg.waiting && reg.active` check to surface banner. Amendment 3 removes this path. Instead: if the waiting SW is genuinely newer, the user sees the banner on the next page load when the SW's `install` event fires. But wait — if the SW already installed in a prior session, `install` doesn't re-fire; no `SW_INSTALLED` message arrives. **Gap:** banner never shown for a truly-waiting SW from a prior session under Amendment 3's SW_INSTALLED-only trigger. **Mitigation:** also trigger banner-show on page load if `reg.waiting` exists AND the waiting SW's CACHE_NAME (via GET_CACHE_NAME) differs from `lastSeen`. Costs one additional `GET_CACHE_NAME` message round-trip per page load but preserves the prior-session-waiting-SW behavior. Add to registration block. |
| **iOS auto-update loop (same bytes repeatedly)** | Each install posts SW_INSTALLED with same CACHE_NAME. Same as `lastSeen`. No banner. ✓ |
| **iOS SKIP_WAITING not delivering (Hypothesis C)** | Banner shown (new version exists). Click → GET_CACHE_NAME → ack updates `lastSeen` → SKIP_WAITING sent. If SKIP_WAITING is dropped: SW never activates; `controllerchange` never fires; page doesn't reload. But `lastSeen` was just updated to the new CACHE_NAME, so on next page load, no banner. **User is silently stuck on old SW.** Worse UX than current — this is why Amendment 3 alone is insufficient for Hypothesis C. **Fix:** only update `lastSeen` on `controllerchange`, not on banner click. Now: banner shown → click → nothing happens (iOS drop) → banner shown again on next load. Same as Current. At least the user knows something is broken. |
| **iOS controllerchange not firing (Hypothesis D)** | Similar to C. Click activates SW but page doesn't reload. Same mitigation: update `lastSeen` only on controllerchange. |

### A3.4.6 Refinement from A3.4.5 — `lastSeen` updates only on `controllerchange`

Move the `localStorage.setItem('uw_lastSeenCacheName', ...)` call from the GET_CACHE_NAME ack (inside banner click) to the `controllerchange` handler:

```js
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  // On genuine activation, capture the new controller's CACHE_NAME and persist
  // before reloading — last-seen tracking lives only if activation actually happened.
  if (navigator.serviceWorker.controller) {
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => {
      if (e.data?.cacheName) {
        localStorage.setItem('uw_lastSeenCacheName', e.data.cacheName);
      }
      location.reload();
    };
    navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_NAME' }, [channel.port2]);
  } else {
    location.reload();
  }
});
```

This makes `lastSeen` reflect only versions the user has actually reached the controllerchange stage with — not optimistically-assumed-activated versions. Banner-on-next-load correctly fires if activation silently failed.

Trade-off: adds one ready-controller-postMessage round-trip on every reload. Negligible.

### A3.4.7 First-install bootstrap

Special case for `lastSeen = null` on the FIRST EVER install where `SW_INSTALLED` may fire before the client message listener is attached. Mitigation: on `controllerchange` with `lastSeen = null`, capture the controller's CACHE_NAME and store it — this path runs on every first-install activation and catches the listener-attachment race.

Cleaner alternative: on page load, IF `lastSeen` is null AND `navigator.serviceWorker.controller` exists, capture the controller's CACHE_NAME and store. Same defensive pattern, runs outside activation sequences.

Engineer brief chooses implementation detail; design pins the requirement: `lastSeen` must transition from `null` → `CACHE_NAME` on first-install completion, without user-visible banner.

## A3.5 WP scoping — keep under WP-ARCH-G-3

Arguments for a new WP:
- Amendment 3 introduces a new `uw_*` key (crosses §3.2 naming-standards boundary).
- New SW message protocol is a new capability.
- Audit-trail cleanliness: "WP-ARCH-G-3 closed at Amendment 2; new WP-ARCH-G-3.5 or WP-FE-G-16 for the larger-scope fix."

Arguments for staying under WP-ARCH-G-3 (my recommendation):
- Functional scope is unchanged: make the SW update banner work correctly across all platforms.
- Three amendments have already been through this WP; a fourth doesn't dilute.
- Splitting adds coordination overhead (routing brief, engineer brief, etc.) without clear benefit.
- The new `uw_lastSeenCacheName` key is load-bearing to the fix, not a feature-scope expansion.
- Audit trail is already clean via the amendment sequence; splitting to a new WP just means "Amendment 3 is now WP-X-1."

**Recommendation: keep under WP-ARCH-G-3.** Escalate to a new WP only if Amendment 3's scope grows substantially (e.g., if diagnosis reveals we also need a fallback reload prompt, error-handling UI, or an IDB-backed version history — each of those would be a feature, not a mechanism fix).

## A3.6 Slot-map shift

Current state: v16 (Amendment 2 code), v17 (Scenario B test bump). WP-FE-G-1 Report-Only slot was shifted to v18 after Amendment 2; under Amendment 3, that shifts again:

- Phase D (diagnostic instrumentation, if shipped separately): v18
- Phase F (Amendment 3 fix, if diagnosis confirms last-seen path): v19
- WP-FE-G-1 Report-Only: v20
- WP-AUD-G-1: v21
- WP-FE-G-1 Enforcing: v22

**If Phase D and Phase F are combined into a single commit** (diagnostic instrumentation + Amendment 3 fix shipped together): single slot, v18. WP-FE-G-1 Report-Only → v19, etc.

**If diagnosis reveals a targeted tweak rather than Amendment 3** (e.g., just adding MessageChannel-ack to SKIP_WAITING): single slot, v19 (after Phase D's v18). WP-FE-G-1 Report-Only → v20.

Engineer brief should specify the exact slot sequence based on the chosen path. The slot-map is at this point a running ledger — fix-forward cost is one slot per substantive code change.

## A3.7 Doc / scoring implications if Amendment 3 ships

Re-opens nothing beyond what Amendment 2 already opened, but adds new entries:

- **`ARCHITECTURE.md §1.3`** — add `uw_lastSeenCacheName` to the list of `uw_*` keys. Note inclusion in the future `_restoreFromIDB()` manifest per §3.2. No status change (`adopt-and-enforce` remains).
- **`ARCHITECTURE.md §1.6`** — under Amendment 3, the "Hardening" sub-bullets change shape. Instead of the four WP-DEP-G-2 hardening changes, §1.6 records the hybrid architecture: `updateViaCache: 'none'` retained (WP-DEP-G-2 #1); `reg.active`-guarded `statechange` and the `reg.waiting && reg.active` registration-time check removed (WP-DEP-G-2 #3 and #4 superseded by SW_INSTALLED message path); `reg.update()` removed (Amendment 2); last-seen-CACHE_NAME client-side tracking added (Amendment 3). The paragraph gets restructured to describe the signal architecture: "banner visibility is driven by client-side version tracking against SW-broadcast CACHE_NAME, not SW lifecycle state."
- **`ARCHITECTURE.md §3`** — §3.2 gets a new entry for `uw_lastSeenCacheName`. §3.6 PWA update discipline describes the SW_INSTALLED + GET_CACHE_NAME message protocol as load-bearing.
- **`ARCHITECTURE.md §6` change log** — Amendment 3 entry.
- **`PARITY_GAP.md §11.7 row 5`** ("iOS Safari update-detection hardening") — RE-OPENS. Was MATCH under Amendment 2. Under Amendment 3, the `reg.waiting` check at registration and the `reg.active`-over-`controller` guard are both removed. Spanish likely retains them. Rescore to `DIVERGENT (intentional, recorded — client-side version tracking replaces SW-lifecycle-state sniffing)`. This is a deeper architectural divergence from Spanish than Amendment 2's `reg.update()` removal.
- **`PARITY_GAP.md §11.2`** — new row implied: `uw_lastSeenCacheName` is a German-only localStorage key. If Spanish adds an equivalent later (lifting the German lesson), this flips to `MATCH`.
- **`SPEC.md §4.2.1`** — new row for `uw_lastSeenCacheName`.
- **`SPEC.md §8.3.1`** — substantive rewrite of SW-update-UX section describing the message-protocol-based approach.
- **`SPEC.md §10 G-13`** — trivially unaffected (the doubled-prefix migration isn't the concern here).
- **Score summary recompute:** §11.7 row 5 MATCH→DIVERGENT adds one DIVERGENT to §11.7 column; row 3 already shifted under Amendment 2.

## A3.8 Engineer task-sizing recommendation

Three viable task shapes:

**Task shape (i) — diagnose-first (small, isolated).** One commit: add the four instrumentation points from §A3.3. Bump `CACHE_NAME`. Cam runs the iOS scenario. Retrieve logs. Decision per the Phase F decision tree.
Pros: minimal commitment; confirms hypothesis before writing significant code; preserves optionality.
Cons: two deploy cycles before fix lands (instrumentation, then fix).
Effort: ≤1 day.

**Task shape (ii) — Amendment 3 with instrumentation baked in.** One commit: Amendment 3 fix + instrumentation riding along. If fix works, instrument tells us it worked; if fix doesn't work, instrument tells us which hypothesis. Remove instrumentation in a follow-up cleanup commit once confirmed.
Pros: faster to resolution if Amendment 3 is right; inline diagnostic if it's not.
Cons: bigger commit; if fix doesn't work AND diagnostic doesn't help (possible if Hypothesis C/D), we're in Amendment 4 with more code debt.
Effort: 2 days.

**Task shape (iii) — broad instrumentation + minimal Amendment 2-adjacent tweaks.** Add MessageChannel-ack to SKIP_WAITING, add the `reg.waiting !== reg.active` defensive check at L24688, add diagnostic instrumentation. If iOS issue was in the click path (Hypothesis C), MessageChannel-ack fixes or diagnoses it. If spurious-waiting (Hypothesis B), defensive check helps. Diagnostic instrumentation catches the rest.
Pros: covers several hypotheses with one commit; no new localStorage key; smaller architectural commitment.
Cons: if Hypothesis A/E/G/H (Amendment 3 territory), this shape doesn't fix them — we're back to Amendment 3 after one more cycle.
Effort: 1–1.5 days.

**Recommendation: task shape (i) — diagnose first.** Reasons:

1. Amendment 3 is the largest commitment in the WP-ARCH-G-3 amendment sequence. Worth confirming the hypothesis before paying its cost.
2. iOS testing cycles are naturally slower than Chrome desktop (depends on Cam's availability), so compressing the resolution time via a larger commit doesn't save much wall-clock time.
3. The diagnostic instrumentation is small, clean, removable, and pays dividends beyond this WP — the same instrumentation could diagnose future SW-related issues on iOS.
4. The Phase F decision tree gives clear paths; the diagnosis isn't open-ended.

If Dispatch or Principal prefer faster resolution over certainty, shape (ii) is the fallback. Do not pick shape (iii) — it's the least-best combination (doesn't fix Amendment-3-territory hypotheses, isn't minimal enough to be fast).

## A3.9 ETA to verdict (for Dispatch)

Delivered in this turn as pre-staged Amendment 3 — scaffolding for the next engineer task. Finalization waits on Principal's narrowing clarification or on Phase D diagnostic evidence, whichever arrives first.

---

**End of Amendment 3 (pre-staged). Standing by for Principal narrowing, Phase D diagnostic evidence, or Dispatch routing decision on task shape.**

---

## A3.10 Update — symptom (a) confirmed by Principal — promoted to recommended

**Trigger:** Dispatch reports Principal answered (a): banner shows on first load and persists across reloads on iOS. Same symptom as v15. Chrome desktop verified clean across three consecutive Scenario A runs and Scenario B on v16/v17. Browser-vs-PWA-standalone disambiguation still pending but (a) is load-bearing.

### A3.10.1 Hypothesis discrimination given (a)

Mapping (a) against the hypothesis set in §A2.7 / §A3.1:

| Hypothesis | Matches symptom (a) on iOS? |
|---|---|
| A — spurious waiting SW from iOS auto-update on first load | ✓ banner on first load; if waiting SW persists across reloads without activating, L24688 fires on each reload |
| B — stale waiting SW from prior session | ✗ doesn't apply on first load |
| C — SKIP_WAITING doesn't reach SW | ✗ wouldn't manifest on first load (no SKIP_WAITING sent yet) |
| D — controllerchange doesn't fire | ✗ same as C |
| E — iOS re-installs on every reload (auto-update loop) | ✓ each reload triggers install → enters waiting → banner |
| F — pre-iOS 16.4 (no SW) | ✗ ruled out — banner can't show without SW |
| G — iOS auto-poll race | ✓ same as A but driven by browser polling rather than reload-triggered re-install |
| H — separate standalone registration | partially relevant pending PWA-vs-browser disambiguation, but doesn't change the fix |

**A, E, G all converge** on the same root cause shape: iOS Safari produces a `reg.waiting` state that Chrome doesn't, on first load and on every reload. C and D would manifest only when the user *clicks* the banner (and Principal's report is silent on click behavior — could be additional issues but not the primary one).

### A3.10.2 Updated verdict

**Promote Amendment 3 from pre-staged to recommended.** Skip Phase D diagnostic. The symptom shape maps unambiguously to the hypothesis set Amendment 3 fixes; running the diagnostic before the fix would consume a deploy cycle for evidence we're already highly confident about.

Specifically, Amendment 3 with the §A3.4.5 mitigation (page-load `reg.waiting` + GET_CACHE_NAME + last-seen check) handles all three load-bearing hypotheses:

- **Hypothesis A:** SW_INSTALLED message fires (or doesn't) for the spurious waiting SW. With same CACHE_NAME bytes, last-seen comparison shows match → no banner. The mitigation also handles the case where install doesn't re-fire on reload but reg.waiting persists.
- **Hypothesis E:** Each reload's re-install posts SW_INSTALLED with the same CACHE_NAME → last-seen matches → no banner.
- **Hypothesis G:** Same as A.

### A3.10.3 What this changes from the pre-staged Amendment 3

Promotes §A3.4 detailed design from "deferred until Phase F decision-tree confirms" to **"engineer brief target for the next Code task."**

Engineer task shape changes from §A3.8 recommendation (i) → recommendation (ii)-stripped: ship Amendment 3 directly, no inline diagnostic instrumentation needed for the primary fix.

**Optional rider — minimal click-path verification.** Because Hypotheses C/D could exist as additional iOS issues that wouldn't manifest in symptom (a), the engineer brief should include one piece of safety-net instrumentation in the Amendment 3 commit: the `controllerchange` handler from §A3.4.6 already does a `controller.postMessage(GET_CACHE_NAME)` round-trip; if the ack never arrives within 3 seconds, log to `localStorage.uw_diag_controllerchange_timeout = Date.now()`. Cam can check this key after running the iOS scenario; presence indicates Hypothesis D is also at play and Amendment 4 design pass would be needed. No user-visible change; pure diagnostic safety net.

### A3.10.4 Slot-map firmed

Amendment 3 takes **v18** (single commit, no separate Phase D). Downstream slots:
- WP-FE-G-1 Report-Only → v19
- WP-AUD-G-1 → v20
- WP-FE-G-1 Enforcing → v21

If Amendment 3 fails iOS verification despite (a) prediction, Amendment 4 design pass would consume v22.

### A3.10.5 Doc / scoring implications firmed

Per §A3.7. Concretely:

- `ARCHITECTURE.md §1.3` — add `uw_lastSeenCacheName` to `uw_*` key list. Note IDB-restore-manifest inclusion when WP-ARCH-G-1 lands.
- `ARCHITECTURE.md §1.6` — restructure to describe the SW_INSTALLED + GET_CACHE_NAME message-protocol architecture; record that `reg.waiting && reg.active` registration check (WP-DEP-G-2 #3) and `reg.active`-guarded `statechange` (WP-DEP-G-2 #4) are removed in favor of the message-protocol approach. The WP-DEP-G-2 #1 (`updateViaCache: 'none'`) retained. Amendment 2's `reg.update()` removal retained. The §1.6 invariant becomes: "SW update-detection is signaled via a SW-broadcast CACHE_NAME message and client-side last-seen tracking; banner visibility is driven by user-visible version comparison, not SW lifecycle state. Activation remains gated on user accept (banner click → SKIP_WAITING)."
- `ARCHITECTURE.md §3.2` — add `uw_lastSeenCacheName` row.
- `ARCHITECTURE.md §3.6` — describe SW_INSTALLED + GET_CACHE_NAME protocol as load-bearing.
- `ARCHITECTURE.md §6` change log — Amendment 3 entry.
- `PARITY_GAP.md §11.7 row 5` — RE-OPENS. Was MATCH after Amendment 2. Becomes DIVERGENT (intentional, recorded). Justification: "iOS-specific SW lifecycle behavior (verification §9.6 v15 / Principal report on v16+v17 with symptom (a)) made the Spanish-aligned `reg.waiting && reg.active` and `reg.active`-over-`controller` guards inoperable on iOS. German replaces SW-lifecycle-state sniffing with client-side last-seen-CACHE_NAME tracking via SW message protocol. Spanish retains the SW-lifecycle-state approach; German diverges as a load-bearing fix."
- `PARITY_GAP.md §11.2` — new implied row: `uw_lastSeenCacheName` is a German-only key.
- `SPEC.md §4.2.1` — add `uw_lastSeenCacheName` row.
- `SPEC.md §8.3.1` — substantive rewrite of the SW-update-UX section.
- `SPEC.md §10` — no new G-row needed (the symptom is closed by the fix).
- Score summary recompute: §11.7 row 5 MATCH→DIVERGENT, +1 DIVERGENT in §11.7 column. Combined with Amendment 2's row 3 shift, §11.7 totals: MATCH 4→2, DIVERGENT 0→2.

### A3.10.6 What still depends on Principal's PWA-vs-browser clarification

Whether the iOS failure is in standalone PWA (A2HS), in-browser Safari, both, or one but not the other, **does not change the Amendment 3 fix.** Last-seen-CACHE_NAME tracking is platform-agnostic; the localStorage key is per-origin and persists across browser-vs-standalone if iOS treats them as the same origin (which it does in current iOS versions).

The clarification matters only for verification scope: the engineer brief should specify which iOS surfaces to verify against (just standalone, just in-browser, or both). Standing recommendation: verify both, since they're both reachable surfaces and the cost of verifying both is one Cam-iOS-test-cycle.

### A3.10.7 Engineer task — firm

- **Single commit**, branch off main.
- Implement §A3.4 client logic + SW message protocol. Apply §A3.4.5 page-load `reg.waiting` + GET_CACHE_NAME + last-seen mitigation. Apply §A3.4.6 `lastSeen` updates only on `controllerchange`. Apply §A3.4.7 first-install bootstrap.
- Add §A3.10.3 optional safety-net diagnostic: `localStorage.uw_diag_controllerchange_timeout` written if GET_CACHE_NAME ack doesn't arrive within 3 seconds of `controllerchange`.
- Bump `CACHE_NAME` to `werkstatt-v18`.
- Doc updates per §A3.10.5.
- Re-run Chrome desktop Scenarios A and B (regression check — Amendment 3 must not break what Amendment 2 fixed).
- iOS verification: Cam runs symptom (a) scenario on iOS Safari standalone PWA AND iOS in-browser Safari. Expected: no banner on first load; no banner on reload; on a true update (e.g., a deployed v19 trivial bump), banner appears on next iOS launch.
- If `uw_diag_controllerchange_timeout` is present after Cam's iOS click test, raise — Hypothesis D is at play and Amendment 4 needed.

### A3.10.8 ETA

Verdict delivered in this turn.

---

**End of Amendment 3 (issued, recommended). Standing by for engineer brief revision.**

---

## Amendment 3 — landed 2026-04-19

**Branch:** `feat/wp-arch-g-3-amendment-3` (FF-merge to `main` pending Chrome regression verification).
**Commit message:** `fix(WP-ARCH-G-3): Amendment 3 — client-side last-seen tracking (v17→v18)`

**Changes landed:**
- `sw.js`: `CACHE_NAME` → `werkstatt-v18`; `GET_CACHE_NAME` message handler added.
- `index.html`: SW-lifecycle-state banner guards (`reg.waiting && reg.active`; `installed && reg.active`) replaced by `GET_CACHE_NAME` + `uw_lastSeenCacheName` comparison. `controllerchange` handler updates `lastSeen` before reload, with `uw_diag_controllerchange_timeout` safety-net (3-second timeout). Banner click unchanged.
- `plans/ARCHITECTURE.md`: §1.6 restructured; §3.2 key table added; §6 changelog entry.
- `plans/PARITY_GAP.md`: §11.7 row 5 `MATCH` → `DIVERGENT (intentional, recorded)`; score table updated (§11.7: MATCH 3→2, DIVERGENT 1→2; Totals: MATCH 18→17, DIVERGENT 7→8).
- `SPEC.md`: §4.2.1 rows added for `uw_lastSeenCacheName` and `uw_diag_controllerchange_timeout`; §8.3.1 rewritten.

**WP status:** Ready for closure pending Chrome desktop regression (Scenarios A + B) and Principal iOS verification. Verification results appended to `plans/work-packages/WP-ARCH-G-3_verification.log §9.9` after Chrome pass.

**Slot map:** v18 = Amendment 3; WP-FE-G-1 Report-Only → v19; WP-AUD-G-1 → v20; WP-FE-G-1 Enforce → v21.

---

**Amendment 2 landed 2026-04-19.** Branch `feat/wp-arch-g-3-amendment-2`. Changes: `index.html` `reg.update()` removed (replaced with regression-prevention comment); `sw.js` CACHE_NAME v15→v16; `ARCHITECTURE.md §1.6` (three invariants, divergence paragraph, §6 entry); `SPEC.md §8.3.1` (three-of-four hardening, Amendment 2 rationale); `PARITY_GAP.md §11.7` row 3 MATCH→DIVERGENT (intentional, recorded), score table updated (§11.7: MATCH 4→3, DIVERGENT 0→1; totals MATCH 19→18, DIVERGENT 6→7). Status: pending v16 Scenario A verification before FF-merge to main.
