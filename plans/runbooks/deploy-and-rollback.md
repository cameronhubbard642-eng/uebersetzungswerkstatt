# Deploy and Rollback Runbook — Philosophische Übersetzungswerkstatt

**Repo:** `cameronhubbard642-eng/uebersetzungswerkstatt`
**Live URL:** `https://uebersetzungswerkstatt.glossolalia.dev/` (Cloudflare Pages, post-WP-DEP-G-8 cutover 2026-04-24).
**Legacy URL (dual-serve, 3 days):** `https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/` — GH Pages origin, frozen at pre-cutover state, torn down 2026-04-27.
**Deploy model:** Cloudflare Pages, Git-integrated against `main`. Prior model was GitHub Pages "Deploy from a branch"; sections below that still reference that flow are preserved for dual-serve-window context and §5 edge-case precedent.
**Authored:** 2026-04-24 (WP-DEP-G-6). **Amended:** 2026-04-24 (WP-DEP-G-8 cutover). **Owner:** DevOps / Senior Dev Oversight (Cam).

---

## §1 Normal Deploy Flow — Cloudflare Pages (post-cutover)

Every commit pushed to `main` triggers an automatic Cloudflare Pages deploy. Git integration replaces the prior GH Pages flow; no build step (static source).

**Steps:**

1. Developer pushes to `main` (direct push or merge from a worktree branch).
2. CF Pages picks up within ~30 s and starts a deployment. Build time is zero (static source). Production alias `uebersetzungswerkstatt.glossolalia.dev` updates in **60–90 seconds** typical.
3. **Pre-deploy smoke test** (WP-DEP-G-4, `.github/workflows/pre-deploy-smoke.yml`) runs on the PR before merge. Merge is blocked on red.
4. **Post-deploy parity probe** (WP-DEP-G-5, `.github/workflows/post-deploy-verify.yml`) runs after each push to main. ⚠️ Probe currently polls the GH Pages URL and expects pattern `werkstatt-v{N}` — during the 3-day dual-serve window AND until the probe is migrated to the CF Pages URL + `werkstatt-(cf-)?v{N}` pattern, probe failures on post-cutover pushes are **expected and non-blocking** (follow-up WP required). See §6.1.
5. Verify live: `curl -s https://uebersetzungswerkstatt.glossolalia.dev/sw.js | grep CACHE_NAME`

**CF Pages dashboard verify.** Pages → `uebersetzungswerkstatt` → Deployments. Latest deployment is green within 60–90 s typical; build log clean.

**Post-deploy curl verification for CSP + cache headers:**

```bash
curl -s https://uebersetzungswerkstatt.glossolalia.dev/sw.js | sed -n '4p'
curl -sI https://uebersetzungswerkstatt.glossolalia.dev/index.html | grep -i '^content-security-policy\|^report-to'
curl -sI https://uebersetzungswerkstatt.glossolalia.dev/sw.js | grep -i '^cache-control'
```

Expected: `CACHE_NAME = 'werkstatt-cf-vN';` matching the committed value; `Content-Security-Policy-Report-Only` + `Report-To` header lines on `index.html`; `Cache-Control: no-cache` on `sw.js` (per `_headers` rule).

**What "deployed" means for users:**

- New page loads (no cached SW) get the new code immediately.
- Users with a controlling SW see the update banner ("Neue Version verfügbar") once the new SW installs and waits. They must click "Aktualisieren" to activate. The `SKIP_WAITING` handshake fires and the page reloads.
- Users who never click the banner keep the old SW until they close all tabs and reopen, at which point the waiting SW activates automatically.

**CACHE_NAME bump rule** (ARCHITECTURE.md §3.7 / §2.6):

Every commit that touches `index.html` or any file in `sw.js` `PRECACHE_URLS` **must** bump `CACHE_NAME` to the next monotone integer slot. Post-cutover convention uses the `-cf-` infix: `werkstatt-cf-v1` → `werkstatt-cf-v2` → … The pre-cutover sequence `werkstatt-v{1..63}` is frozen; `werkstatt-cf-v1` is a **migration boundary cache** and the SW's old-cache cleanup (`caches.keys()` → `caches.delete()`) will evict all `werkstatt-v*` entries on activation. Parallel sessions consume slots; re-slot at push time if a collision is detected during rebase.

**Same-commit rule.** Any SW-touching change must bump `CACHE_NAME` in the same commit. Any new external host added to a call site must update `_headers` `connect-src` in the same commit (per `plans/ARCHITECTURE.md §3.4`).

---

## §1b Rollback — CF Pages native (preferred, post-cutover)

**Use when:** the live CF Pages deployment is broken and you want the fastest non-destructive path to a known-good state. Preferred over §3 / §4 for any CF-Pages-hosted commit.

1. CF dashboard → Pages → `uebersetzungswerkstatt` → Deployments.
2. Select the last known-good deployment (each has an immutable SHA-tagged URL).
3. Click "Rollback to this deployment" → confirm.
4. Production alias repoints in seconds; old build is back live.
5. **Align source of truth:** `git revert <bad-sha>` on `main` + `git push origin main`. The revert-push triggers another CF build; it should produce the same bytes as the rolled-back deployment. Without this step, the next forward push re-introduces the bad commit on top of the rollback.

**Emergency disable.** If CF Pages must be pulled entirely (e.g., a CSP regression exfiltrating data):

1. CF dashboard → Pages → `uebersetzungswerkstatt` → Settings → Pause production deployments.
2. Alternatively: remove the custom domain binding — DNS survives but TLS + serve fails over to the `.pages.dev` fallback URL.
3. **Last resort:** CF dashboard → DNS → delete the `uebersetzungswerkstatt` CNAME for `glossolalia.dev`. User gets DNS NXDOMAIN; A2HS icon breaks; fix as urgently as the situation demands. Requires Principal sign-off (§7).

---

## §2 Pre-Deploy Smoke Check Expectations

*(Describes WP-DEP-G-4 — CI smoke test, shipped at `.github/workflows/pre-deploy-smoke.yml`.)*

**What the smoke test validates (once live):**

- `manifest.json` and `manifest-{1..5}.json` are valid JSON with required PWA fields (`name`, `start_url`, `display`, `icons`).
- `sw.js` `CACHE_NAME` value differs from the parent commit's value if any precached file changed (catches forgotten bumps).
- **§3.7 filename integrity:** every entry in `PRECACHE_URLS` matches a file tracked by `git ls-files`. A mismatch means `cache.addAll()` will reject atomically on install — users get no update ever. This was the G-15 / B-3 P0 hazard confirmed live on 2026-04-19 (`f79e45c` → hot-fix `b7e671c`).
- Headless Playwright registers the SW and confirms `install` succeeds within 10 seconds.

**What a failed smoke looks like:**

```
✗ CACHE_NAME not bumped: precached file index.html changed but CACHE_NAME unchanged
✗ Precache integrity: sw.js references 'German Icon I.jpeg' but git ls-files has 'German%20Icon%20I.jpeg'
✗ SW install: sw.js registration timed out after 10s
```

**How to debug a failed smoke:**

1. Check the Actions run log for the specific assertion that failed.
2. For CACHE_NAME failures: bump `sw.js` `CACHE_NAME`, amend or add a new commit, repush.
3. For filename integrity: run `git ls-files | grep -i german` and compare to `PRECACHE_URLS` in `sw.js`. Correct the mismatch in `sw.js` (not by renaming the file).
4. For SW install failures: open Chrome DevTools → Application → Service Workers in a clean profile to replicate; check the console for install errors.

---

## §3 Emergency Rollback — `git revert`

**Use when:** a single identifiable commit broke the live app and `git revert` produces a clean inverse patch (no intertwined changes).

**Steps:**

```bash
# 1. Identify the offending commit
git log --oneline -10
# Example output:
# 6a0f743 fix(dark-mode): action-btn dark baseline + ...
# d08206b fix(accent): dark-mode --accent → var(--accent-aged) ...

# 2. Fetch to make sure your view of main is current
git fetch origin main

# 3. Revert the commit (creates a new commit, non-destructive)
git revert 6a0f743
# If conflicts: resolve manually, then `git revert --continue`

# 4. Bump CACHE_NAME in sw.js (the revert changes index.html / sw.js)
# Edit sw.js: werkstatt-vN → werkstatt-v(N+1)
git add sw.js
git commit --amend --no-edit   # fold into the revert commit

# 5. Push to main
git push origin HEAD:main

# 6. Monitor Pages deploy (60–90s)
sleep 90
curl -s https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/sw.js | grep CACHE_NAME

# 7. Smoke verify
# *(Once WP-DEP-G-4 deployed)* Wait for post-deploy probe to report green.
# Manual equivalent: open a clean incognito window, confirm the app loads.
```

**Expected outcome:** the live `CACHE_NAME` advances by one slot; users with the broken SW see the update banner and can re-activate.

---

## §4 Emergency Rollback — Force-Push to Known-Good Tip

**Use when:** `git revert` is not viable — e.g., multiple intertwined commits that cannot be individually reverted, or the revert itself breaks the app.

> **Destructive operation.** Requires explicit approval from Principal (Cam) before execution. Do not proceed if the operation is ambiguous.

**Steps:**

```bash
# 1. Identify the known-good commit SHA
git log --oneline -20
# or
git reflog | head -20    # shows local HEAD movements — useful if you need to
                          # recover from choosing the wrong tip (see §4b below)

# 2. Confirm the known-good SHA boots cleanly
#    (open index.html from that SHA locally if possible, or recall from context)

# 3. Force-push — use --force-with-lease to avoid overwriting concurrent pushes
git push --force-with-lease origin <known-good-sha>:main

# 4. Bump CACHE_NAME: the tip being force-pushed may already have a lower slot
#    than what's live. Users with a higher SW version will not see an update banner
#    because their CACHE_NAME is newer. Safest path:
#      a. Cherry-pick a one-line sw.js bump onto the known-good tip before pushing, OR
#      b. After force-push, immediately push a follow-up commit that only bumps CACHE_NAME.

# 5. Monitor Pages deploy (60–90s)
sleep 90
curl -s https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/sw.js | grep CACHE_NAME
```

### §4b Rescue if wrong tip chosen

If `git push --force-with-lease` landed the wrong SHA:

```bash
# Your local reflog still knows the prior tip
git reflog | head -10
# Example:
# abc1234 HEAD@{0}: push (forced): HEAD -> main
# def5678 HEAD@{1}: rebase: ...   ← probably the one you want

git push --force-with-lease origin def5678:main
```

If the wrong tip was already serving long enough that active users cached it: bump `CACHE_NAME` again in the new push so their SW activates the corrected version.

---

## §5 Cache-Invalidation Edge Cases

### §5.1 Content changed but CACHE_NAME not bumped

**What happens:** the SW's `cache.addAll(PRECACHE_URLS)` on install will fetch new assets but store them under the old `CACHE_NAME`. Because the `CACHE_NAME` key hasn't changed, existing users' SWs are not replaced — they keep serving the stale cached assets indefinitely. New installs get fresh assets but then serve them from the old-named cache, which will not be cleaned up until a future `CACHE_NAME` advance.

**Recovery path:**

1. Push a commit that only bumps `CACHE_NAME`. This forces all active SWs to install a new worker, which re-fetches all precached assets fresh.
2. Verify via the update banner appearing for active users.

### §5.2 CACHE_NAME collision between parallel worktree sessions

**What happens:** two sessions both target e.g. `werkstatt-v65`. The second push is rejected as non-fast-forward. After rebase, both commits carry `werkstatt-v65`, causing a merge conflict in `sw.js`.

**Resolution (per 2026-04-23 precedent):**

1. `git fetch origin main && git rebase origin/main`
2. On conflict in `sw.js`: keep your own target slot (e.g., bump to `werkstatt-v66` — next available after the merged tip).
3. Use the Python conflict-resolution pattern from the session history:

   ```python
   import re, pathlib
   sw = pathlib.Path('sw.js').read_text()
   sw = re.sub(
       r'<<<<<<< HEAD.*?>>>>>>> [^\n]+\n',
       "const CACHE_NAME = 'werkstatt-v66';\n",
       sw, flags=re.DOTALL
   )
   pathlib.Path('sw.js').write_text(sw)
   ```

4. `git add sw.js && git rebase --continue && git push origin HEAD:main`

### §5.3 Precache filename mismatch (§3.7 hazard)

**What happens:** `cache.addAll()` in the SW `install` handler rejects **atomically** if any URL in the list returns a non-2xx. The SW never activates. All subsequent pushes (with `CACHE_NAME` bumps) fail silently for all new visitors — the installing SW is discarded. Existing users with a prior activated SW continue uninterrupted; new visitors get no offline capability.

**Detection:** new-visitor test in incognito → DevTools Application → Service Workers → check for install errors.

**Recovery:** correct the `PRECACHE_URLS` entry (not the filename) to match the git-tracked filename exactly, bump `CACHE_NAME`, push.

---

## §6 Common Failure Modes

### §6.1 CF Pages deploy stuck

**Symptom:** push lands on `main` but the live site `https://uebersetzungswerkstatt.glossolalia.dev/` still returns the old `CACHE_NAME` after 3+ minutes.

**Recovery:**
1. CF dashboard → Pages → `uebersetzungswerkstatt` → Deployments. Look for a failed or queued deployment.
2. If the deploy job failed: inspect build log. Free tier quota (500 builds/month) is a common gotcha but unlikely at current cadence. Manual retrigger via dashboard "Retry deployment" button.
3. If CF Pages dashboard shows a platform incident: check `https://www.cloudflarestatus.com`. If incident confirmed, escalate to Cam and wait.
4. If all deploys look green but the edge still serves stale bytes: purge CF cache via dashboard → Caching → Configuration → Purge Everything. This is rarely needed (CF Pages invalidates on deploy) but available as an escalation.

**Related: WP-DEP-G-5 parity-probe false-positive failures.** Post-cutover, the probe (`.github/workflows/post-deploy-verify.yml`) will fail on every push until it is migrated to poll the CF Pages URL and accept the `werkstatt-cf-v{N}` pattern. Do NOT treat these failures as deploy stalls — verify manually per §1 step 5 and continue. The probe migration is a flagged follow-up WP.

### §6.1b Legacy: GitHub Pages deploy stuck (pre-cutover reference)

*Retained for dual-serve-window context through 2026-04-27 and for §5 edge-case precedent.*

If the legacy GH Pages origin (`https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/`) is stuck during the dual-serve window: the frozen pre-cutover state is intentional; no action required. If it must be manually advanced, navigate to the repo's Actions tab and inspect the `pages-build-deployment` run.

### §6.2 CACHE_NAME monotone-bump violation

**Rule:** slots are always incremental. Never recycle, skip backward, or reuse a slot. The 2026-04-23 session history (v21 → v25 → v28 → v32 → ... → v62+) documents the precedent.

**If a slot is accidentally recycled:** push a corrective commit that bumps to the next slot above the current live maximum. The SW's old-cache cleanup (`caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))`) uses exact string equality — a recycled slot that matches a previous cache name will delete the wrong entries.

### §6.3 Stale worktree base

**Symptom:** a session starts, makes edits, then discovers origin/main is N commits ahead. Push is rejected. Edits may target wrong line numbers; CACHE_NAME slot may already be consumed.

**Prevention:** every session must run `git fetch origin main && git rebase origin/main` as its first operation before touching any file. This is the lesson from the 2026-04-19 WP-AUD-G-1 fiasco (worktree was 10 commits behind; edits discarded and session respawned).

**Recovery if already edited:**
1. `git stash` (if edits not yet committed) or note the commit SHAs.
2. `git fetch origin main && git rebase origin/main`.
3. Re-apply edits (stash pop or cherry-pick). Re-anchor any line-number references to the rebased file.
4. Re-slot `CACHE_NAME` to the next available above the current live tip.

---

## §7 Escalation

**Principal sign-off is required before executing any destructive operation** — specifically: force-push to `main`, revert of a commit that touches security-critical paths (CSP, SW caching strategy, API key handling), and any operation that modifies or removes data from the live cache outside the normal `CACHE_NAME` bump cycle.

For non-destructive operations (standard `git revert`, CACHE_NAME bumps, doc updates), no pre-approval is needed. Manual curl-verification per §1 step 5 is the gate post-cutover; the WP-DEP-G-5 parity probe returns to gate duty once migrated to the CF Pages URL.

For Cloudflare Pages outages not caused by a code change, check `https://www.cloudflarestatus.com` first. For legacy GH Pages outages during the dual-serve window, check `https://www.githubstatus.com`. Rule out platform incidents before escalating.

---

## Appendix — Quick Reference Commands

```bash
# Recent commit history
git log --oneline -10

# Live CACHE_NAME check (CF Pages, post-cutover)
curl -s https://uebersetzungswerkstatt.glossolalia.dev/sw.js | grep CACHE_NAME

# Live CSP + Report-To header check
curl -sI https://uebersetzungswerkstatt.glossolalia.dev/index.html | grep -iE '^content-security-policy|^report-to|^referrer-policy'

# Live sw.js cache-control header (should be no-cache per _headers)
curl -sI https://uebersetzungswerkstatt.glossolalia.dev/sw.js | grep -i '^cache-control'

# Dual-serve legacy GH Pages check (through 2026-04-27)
curl -s https://cameronhubbard642-eng.github.io/uebersetzungswerkstatt/sw.js | grep CACHE_NAME

# Precache filename integrity check (run before any PRECACHE_URLS edit)
git ls-files | grep -E '\.(html|json|jpeg|JPEG|png|PNG)$'

# Manual pre-deploy smoke trigger (WP-DEP-G-4)
gh workflow run pre-deploy-smoke.yml

# Recent post-deploy probe results (WP-DEP-G-5 — expect failures until probe is migrated to CF Pages URL)
gh run list --workflow=post-deploy-verify.yml | head -5

# Local worktree status — confirm clean base before editing
git fetch origin main && git status && git log --oneline origin/main..HEAD
```
