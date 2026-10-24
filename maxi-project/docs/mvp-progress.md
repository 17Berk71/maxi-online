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
