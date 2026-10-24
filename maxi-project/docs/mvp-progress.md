# MAXI Online — MVP development progress

Updated: 2026-10-24. Scope: experimental branch `codex/mvp-prd-architecture`, draft PR #18 (base: `codex/stage-18-recovery`). **Do not merge or deploy.**

## Recovery baseline history

- `1067217` — restored photo-board entries are normalized before display: persisted merchant URLs are accepted only as HTTP(S), and protocol-relative-looking local paths with backslashes are rejected. `photoLookItems()` now returns independent item copies so callers cannot mutate internal board state.
- `19b10b0` — desktop/mobile Playwright smoke now checks malicious saved links, invalid image paths and mutation isolation across a fresh page load.
- GitHub Actions **MVP architecture checks #30** on `19b10b0`: **passed** (module/importer syntax, evidence policy tests, production build, Chromium photo-board smoke at 390px and 1280px). Workflow: https://github.com/17Berk71/maxi-online/actions/runs/40075162621
- `6f597e7` — Playwright simulates localStorage quota errors and verifies that failed changes neither delete a product nor silently fail; the dialog announces the storage error.
- `5efdb7b` — demo product entries no longer include unverified/fabricated merchant URLs, even when a demo record contains a URL.
- `8b80780` — Playwright verifies the demo-link policy alongside storage hardening.
- GitHub Actions **MVP architecture checks #32** on `6f597e7` and **#34** on `8b80780`: **both passed**, including desktop/mobile Chromium smoke. Latest: https://github.com/17Berk71/maxi-online/actions/runs/40075337733
- The checks use synthetic fixture images and URLs. No real catalogue, licence or store-stock claims were added.

## Boundaries / outstanding release blockers

- The original smoke fixture remains isolated; additional integrated application and pedestrian-navigation suites now cover selected mall paths. They are not a certification of every store or device.
- No verified, rights-cleared live multi-category catalogue or current local-store stock evidence is available for a real-data pilot. Do not label feed previews as original photographs or infer photo usage rights from a URL.
- Named collections, favorites and versioned storage/migration are implemented and regression-tested. Full screen-reader and physical-device testing remain incomplete.
- The inherited stage-18 3D fitting remains experimental and is **not** accepted for investor-facing realism claims.
- No deployment, PR merge, or change to `main` has been performed.

Current continuation priorities and boundaries: `docs/mvp-next.md`. Read the detailed evidence below; the early baseline bullets are historical.

## Continuation — 24 October 2026 (Work)

Recovery started from actual branch HEAD `ad6076f`, preserving all ten commits after the supplied `4e4c1ee` checkpoint.

Implemented against FR-LOOK-001/002, FR-SAVE-002 and NFR-001/003/006:
- Separate versioned persistence module `photo-looks/storage.js`, with independent named snapshots (IDs, ordered product references, capture time), load and deletion. Limits: 24 products per draft, 30 saved looks; exceeding limits never silently evicts earlier work.
- Legacy v1 drafts migrate on first successful v2 write. The legacy key remains untouched as a backup. Corrupt or unsupported versions block writes; quota/read failures and stale-tab writes cannot overwrite the loaded data.
- Public access from the mall toolbar. Product add failures now have a visible status message. Modal background is inert; board keyboard events cannot trigger mall shortcuts; movement inputs are suppressed while it is open.
- Saved entries are catalogue snapshots, not proof of current availability. Images failing later have a text fallback; demo merchant links remain suppressed.
- Actual application-entry browser journey added: two store scenes/catalogues -> product -> source-image board -> named save -> page reload -> restore -> new merchant tab. Debug API positions the visitor; UI performs catalogue/product/save actions. Feeds and merchant responses are intercepted synthetic fixtures, **not live stores or verified partnerships**. This does not validate physical walking, all store categories, full WebGL fallback, all devices or actual feed rights.

Verification results and screenshot notes are recorded in `docs/review-2026-10-24/README.md`.

### WebGL-independent catalogue

- Named-look batch published as `3a1ab08`; GitHub Actions #36 **passed**, including integrated desktop/mobile journeys: https://github.com/17Berk71/maxi-online/actions/runs/40076888917
- `?catalog=1` opens a lightweight feed-based catalogue without importing `app.js`. The same catalogue opens automatically when WebGL is unavailable or asynchronous 3D initialization fails. Existing 3D launch remains the default.
- Catalogue fetch failures expose retry and store-back controls. Unknown prices stay unknown; demo URLs stay suppressed; processed previews cannot become real original photos. Bad feed paths and hidden/duplicate products are rejected.
- Found and fixed an inherited integration error: importer preview paths such as `feeds/img/example.webp` were rejected by the photo board. Safe relative paths now work without weakening scheme/backslash/traversal rejection.
- Local checks: 17 Node tests passed; quick catalogue six browser cases passed (390px/1280px × direct/WebGL unavailable/async 3D failure); production build passed. Full integrated mall regression also passed at 390px and 1280px after the lazy-launch changes.

### Catalogue correctness and readiness evidence

- WebGL-independent catalogue batch published as `9ce1a20`; GitHub Actions #37 **passed**: https://github.com/17Berk71/maxi-online/actions/runs/40077245973
- Fixed legacy price corruption: absent prices no longer import as zero or display as free; decimal prices retain cents. Shared price formatter tests cover null, strings, nonfinite/negative values and real numeric zero.
- Import and catalogue verification dates are separate. Future verification timestamps are rejected. Importer records `imported_at` and `source_type`, without inventing a manual verification timestamp.
- Main product viewer prefers explicit original-image URLs; source photos and processed previews have different captions. Integrated browser checks assert the original URL, missing price and unknown catalogue-check date.
- Added an offline catalogue audit and documented review manifest contract (`docs/catalog-publication.md`). The bundled baseline is 3 **demo** catalogues / 125 demo products. Real multicategory gate fails as intended; no contracts, licences, live sources or store affiliations were fabricated.
- Local verification: **23 Node tests + 2 Python tests passed**, importer compiled, build passed, focused photo-board suite passed at both widths, all six quick-catalogue cases passed, integrated mall journey passed at 390px and 1280px. An actual importer invocation against a synthetic no-image YML confirmed null / 1250.50 / 0 prices and import/check-date separation; output stayed outside public feeds.

### Independent favorite products

- Data-correctness batch published as `96ffbc3`; GitHub Actions #38 **passed**: https://github.com/17Berk71/maxi-online/actions/runs/40077665968
- FR-SAVE-001: feed products can be saved independently from outfits in the actual product viewer and the quick catalogue. Favorites appear in “Мои фотообразы”, survive page reload, can be removed or added to a composition. Missing-photo entries remain visible with a disabled add-to-look action; they are never replaced with fake clothing imagery.
- Favorites use a separate storage key and shared validation/transaction logic; editing them cannot replace named looks or the current draft. Limit: 200 favorite snapshots, with explicit refusal rather than silent eviction. Quota errors and stale tabs preserve prior state; demo URLs remain suppressed.
- `product-snapshot.js` centralizes product identity, demo status and safe source URLs. Missing product-viewer photos have a textual fallback without disabling saving.
- Fixed named-save behavior in environments lacking `crypto.randomUUID` (such as some HTTP LAN previews). Local identifiers have a non-security fallback; Chromium smoke explicitly removes randomUUID before saving/reloading a look.
- Local Node suite: **27 tests passed**; Python pricing: **2 tests passed**. Focused browser checks passed, including the HTTP API fallback. Quick-catalogue checks cover favorite restore, missing photos, add-to-look and quota-failure deletion. Integrated mall journeys also passed at 390px and 1280px, including product-viewer image failure and favorite restoration from both stores.

### Search and pedestrian navigation

- Favorite-product batch published as `c0bae38`; GitHub Actions #39 **passed**: https://github.com/17Berk71/maxi-online/actions/runs/40078161288
- Store search results are native keyboard-operable buttons, with store/floor labels, shortcut isolation and focus passed to the chosen store action. The mobile selection retains the store card and its entry control.
- Escape explicitly releases pointer lock when the keyboard event reaches the app, allowing the visible store exit controls to be used. The previous click attempt while pointer lock was active was blocked by the canvas; the test now follows Escape -> exit as a user would.
- New `mall-navigation.browser.mjs` uses public search and door controls followed by real W-key movement (1280px) or Chromium-dispatched touch-joystick input (390px). Debug state is read for assertions, but coordinates are never written and enterShop is never called by the test.
- Local results: **all four entry/exit routes passed** — Gloria Jeans (floor 1) and Синема Парк (floor 2), each at 1280px and 390px. The historical cinema-entry timeout did not reproduce in this focused path. The older exhaustive cinema/movie/cart script is not thereby certified.
- Module syntax, production build and diff whitespace checks passed. Navigation suite is included in the next CI run; current run state must be checked on GitHub.


### Storage recovery and publication-review validation — 24 October 2026

- Recovery started from actual remote HEAD `d0cdac5`; no previous commits were reset or overwritten.
- `photo-looks/storage.js` now refuses to write if restoring a v2 collection would silently discard draft products, saved looks, duplicate entries or entries beyond the configured limit. Valid recoverable entries remain visible, the original raw browser data stays intact, and the modal announces that editing is disabled.
- Added Node regressions for malformed product images, invalid look timestamps, duplicate saved IDs and over-limit drafts. Added Chromium desktop/mobile coverage for the read-only warning and refusal to overwrite a damaged local snapshot.
- Strengthened the **offline** catalogue publication audit: a real store category must be a nonempty string, and rights-review/expiry dates must be ISO timestamps with explicit timezones. Empty or malformed supplied expiry dates fail the gate. These checks do **not** authenticate rights, source URLs or inventory.
- Code commits: `c46f81d`, `d3575f0`, `3ee6008`, `c5ed37f`, `f2c297b`, `f707c02`, `fa37ad3`. Documentation: `5658196`.
- Verification: [GitHub Actions #47](https://github.com/17Berk71/maxi-online/actions/runs/40079054857) checks the latest code; record its final status before claiming this batch is fully validated. Previous #40 was still running when this work began.
- Boundaries unchanged: no authorized real feed, rights-cleared photo collection, local-stock proof, full screen-reader certification or physical-device benchmark. No merge, deployment or main-branch edit.

### Search shortcut and pointer-lock follow-up

- Navigation batch published as `d0cdac5`; GitHub Actions #40 **passed**: https://github.com/17Berk71/maxi-online/actions/runs/40078622436
- Extended keyboard coverage caught two remaining native-button integration gaps: Enter in the search input still targeted the old list item, and Escape on a result was swallowed. Enter now activates the first native result and cancels its default action; Escape closes search and returns focus to its opener.
- A repeated real-movement test caught a pointer-lock cursor warp: the first delta could turn the camera enough to walk into a different store. Pointer-lock transitions and public navigation now clear queued look deltas; the first nonzero delta after capture is discarded. Normal movement events after that are retained.
- Browser navigation tests wait for the pointer-lock transition before holding W, avoiding a browser blur clearing the key during acquisition. No position or orientation is injected by the test.
- After the corrections, all four routes passed again, including input-Enter for cinema, result-Enter for Gloria Jeans, search-Escape focus restoration, W-key movement and touch-joystick movement. Module checks, 27 Node tests and production build passed. The following CI run covers this final follow-up.


### CI navigation flake investigated and fixed

- [GitHub Actions #47](https://github.com/17Berk71/maxi-online/actions/runs/40079054857) **passed** all checks, including both viewport browser journeys and navigation.
- Earlier [Actions #44](https://github.com/17Berk71/maxi-online/actions/runs/40079002894) **failed** in the desktop Cinema Park pedestrian-entry route after the first store exit. Logs show a 45-second timeout while the visitor was already at the cinema door. Do not conceal this intermittent failure behind the later passing run.
- Root-cause hypothesis from code inspection: `doorCooldown` used the simulation frame delta capped at 50 ms. With software WebGL rendering slowly, an intended 0.8-second exit guard could last many seconds of real time, delaying the next store entry.
- Changed the guard to decrement using elapsed wall-clock frame time (`rawDt`) while retaining capped `dt` for visual door interpolation. The existing browser navigation suite exercises consecutive store visits on both viewports; this fix is being verified in [Actions #52](https://github.com/17Berk71/maxi-online/actions/runs/40079521980).
- Updated workflow path filters and syntax checks to include `shop/enter-exit.js`. Code commits: `4cbb820`, `dbcc014`, `cd9f4cb`.
- No claim of a stable physical-device FPS or full mall coverage is made.

### Local catalogue revision workflow — continuation from 3eee0e6

- Fixed inconsistent visibility: 3D imported departments now omit `hidden: true` products just as the quick catalogue does. An explicitly empty imported catalogue remains empty instead of falling back to generated demo goods; the catalogue panel displays an accessible empty state.
- Feed-level demo status inherits the index demo flag, preventing unlabelled/fabricated seller links when an individual demo feed omits its own flag. The synthetic merchant-flow fixture now explicitly uses a non-demo contract rather than bypassing that index evidence.
- Added `tools/feeds/catalog-workspace.mjs`: separate candidate preparation, audit and content fingerprint, product/media diff, immutable local releases, expected-index guard, expected-candidate guard, cooperative writer lock, atomic index replacement, bulk withdrawal and verified rollback. Stored approval reports are never accepted in place of recomputation with current review metadata.
- Complete withdrawal is represented explicitly and does not count toward the real-pilot store minimum. Window previews are suppressed on withdrawal because legacy records lack product references.
- All activation/rollback tests wrote **temporary synthetic directories only**. The active project feed files, published site and main branch were not changed. Rights are not authenticated by this offline tool, and historical assets are retained rather than privately erased.
- Local verification: 41 Node tests and 2 Python pricing tests passed; generated versioned-media -> withdrawal -> rollback browser tests passed at 390px/1280px. Actual 3D/quick hidden-product and all-hidden-shop checks passed at both widths. Build and existing two-store product/save/reload/outbound browser regression passed at both widths. CI is checked separately after publication.

### Calendar-valid evidence timestamps

- Added shared calendar validation for catalogue verification, stock checks/expiry and permission reviews. Nonexistent dates such as 30 February, invalid leap days, missing timezones and invalid time components cannot become confirmation evidence through Date.parse normalization.
- Legacy import-only YYYY-MM-DD dates remain supported, but they are separately calendar-validated and never become a verification timestamp. An invalid reference clock also makes inventory unknown.
- Activation regression now verifies that a formerly passing candidate is rejected if approval is withdrawn before activation; stored reports are not authorization.
- Local verification: 44 Node tests, 2 Python pricing tests, production build and bundled demo audit passed. No real stock, permission or source date was invented.

### Bounded large-catalogue presentation

- `catalog-page.js` provides a pure, ordered 40-product page and source-attribute search. Quick catalogue renders the selected page rather than every product in the feed. All source items remain searchable; hidden records remain excluded and missing prices remain unknown.
- Search input and pagination controls survive card re-renders; the last-page control transfers focus to an enabled neighbor. General data information uses a disclosure while per-store demo and per-product stock labels remain visible.
- Local browser tests at 390px/1280px traverse all 25 pages of a 1,000-product fixture, locate and save the last item, preserve keyboard focus, exclude hidden matches and reset search. The existing six WebGL/fetch/favorites browser cases and generated-revision withdrawal/rollback checks also passed.
- Real synthetic-only screenshots compare the actual pre-pagination module at `75573e2` (1,000 DOM product cards) against 40 cards; see `docs/review-catalog-pages/README.md`. This does not certify mobile FPS or server-side pagination.
- Local verification: 47 Node tests and build passed. Calendar evidence batch was published as `301b8db`; CI status is checked separately.

### Expiry in an already-open catalogue/product

- Found a remaining freshness error: an open view could retain its initial stock label after evidence expired. Added shared `inventory-watch.js` with expiry scheduling, visibility/focus revalidation and explicit cleanup on product close, catalogue navigation and page changes.
- Quick catalogue recomputes evidence from raw fields instead of trusting a cached evidence snapshot. Status text updates in place, preserving card nodes and focus; expired online proof still never becomes local stock.
- Actual product viewer updates its live stock text and hides the physical-pickup action when its proof expires. If that action had focus, focus moves to the ordinary merchant link. Returning to the catalogue also stops the prior product viewer and stock observer.
- Local verification: 50 Node tests and build passed. New 390px/1280px browser checks cover natural timer expiry for in/out stock, background-tab clock advance, online/local separation, source-image preservation, pickup removal, focus preservation and saving after expiry. All proof URLs and timestamps in this test are synthetic fixtures; no live inventory is asserted.

### Data-loss prevention and URL hygiene — 24 October 2026

- Continued from the actual remote PR #18 HEAD; changes remain isolated to `codex/mvp-prd-architecture`.
- `4098296` and `20bb624`: draft writes now refuse duplicate, invalid or over-limit entries instead of returning success after silently dropping products. Node regression checks unchanged persisted bytes and an intact draft after failed writes.
- `1cf0139` and `78a15d5`: saving a named look now rejects generated ID collisions and invalid timestamps rather than persisting a collection that becomes read-only on reload. Node regressions check atomic refusal and valid retry.
- `7b0107c` and `f5e2553`: shared HTTP(S) URL validation rejects embedded usernames/passwords in merchant links, source-image URLs and stock-evidence links. Tests ensure credential-bearing stock sources cannot confirm availability.
- Verification: CI for the final code checkpoint `f5e2553` must finish before this batch is marked passed. Earlier successful CI does not certify these new commits.
- No real merchant feed, image licence, local inventory confirmation, deployment or merge has been added.

### Snapshot-date integrity and truthful missing-image copy — 24 October 2026

- Baseline verified: GitHub Actions #65 on `0ae7709` completed successfully before this batch.
- `58179b7` / `49c4fa9`: named-look storage now uses the shared calendar-valid, timezone-aware timestamp validator on both write and recovery. Previously `Date.parse` could silently normalize a nonexistent date (e.g. 30 February) or accept a timezone-less timestamp. Invalid stored snapshots remain read-only with original bytes preserved; leap-day ISO timestamps remain valid. Node regressions cover failed writes, valid retry and read-only recovery.
- `2f425ff` / `462a3f2`: missing-image fallback no longer directs users to a nonexistent merchant page. When the saved product lacks a verified HTTP(S) destination, the UI explicitly says that no product link is confirmed. Desktop/mobile Chromium smoke checks both link-present and link-absent cases.
- GitHub Actions [#69](https://github.com/17Berk71/maxi-online/actions/runs/40086559503) is the verification run for the final code checkpoint `462a3f2`; record its actual conclusion before claiming full CI success.
- Only synthetic fixture records were used; no actual store, rights, availability, main-branch merge or deployment is implied.
