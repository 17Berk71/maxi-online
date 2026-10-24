# Saved-photo-look verification — 24 October 2026

Baseline: `ad6076f`. Requirements: FR-LOOK-001/002, FR-SAVE-002, NFR-001/003/006.
All screenshot assets are synthetic geometric fixtures; no private clothing photos are captured here.

| Viewport | Before | After |
|---|---|---|
| 390 × 900 | [Before](before-390.png) | [After](after-390.png) |
| 1280 × 900 | [Before](before-1280.png) | [After](after-1280.png) |

Reproduce with a running Vite server: `git show ad6076f:maxi-project/src/shop/photo-looks.js > src/shop/photo-looks-baseline.js`, then `node tools/test/photo-looks.review.mjs`; delete only the temporary baseline module afterwards. `CHROME_PATH` can select a local Chromium.

Checks performed locally:
- Node evidence/persistence tests: passing (migration, independent snapshots, quota failures, corrupt/future versions, untrusted links, stale tabs, limits and reorder API).
- Production build: passing.
- Isolated browser suite: passing at 390px and 1280px (focus trap, reorder/delete focus, image errors, storage quota failures, named save/reload/load/delete, overflow, tampered storage and demo-link policy).
- Integrated journey: passing at 390px (touch/mobile emulation) and 1280px, including actual store scenes/catalogues, named save/reload/restore and an intercepted merchant popup.

Local Chromium: 153.0.8010.0, headless; 3D integration uses SwiftShader. These are browser checks, not a physical-device or performance certification. CI status is reported separately after publishing the branch commit.

## Catalogue fallback

[390px screenshot](catalog-390.png) · [1280px screenshot](catalog-1280.png)

Synthetic browser fixture with WebGL explicitly unavailable. The normal route, quick route and asynchronous startup rejection are tested separately. Index and store feed requests each fail once, then recover through the visible retry controls. A demo item is added and named-saved without 3D; unknown prices and stock are labelled, fabricated merchant links are absent. No app module is requested on direct quick/WebGL-unavailable paths.

## Data integrity regression

23 Node tests and 2 Python price tests passed; importer syntax and production build passed. The actual importer was additionally exercised with a synthetic no-image feed (missing price, 1250.50, zero), writing only to a temporary directory. Source-image priority and “unknown price / verification date” are asserted through the actual product UI in the integrated desktop/mobile journey. No real source permissions were added. [Real-pilot baseline rejection](catalogue-real-gate.json) is an expected blocked result, not a broken demo fixture audit.

## Individual favorites

[390px screenshot](favorites-390.png) · [1280px screenshot](favorites-1280.png)

Favorites use an independent key and are not a named look or a cart. They preserve missing-image records and label them. Browser regression checks reload actual catalogue pages, reopen favorites, add an item to a look, simulate quota errors and verify deletion preserves the current composition. The local named-save test also removes `crypto.randomUUID` before saving.


## Pedestrian mall navigation

`node tools/test/mall-navigation.browser.mjs`: four locally passing routes. Each uses visible search, the store card and the door action, followed by W-key movement on desktop or browser touch dispatch on the mobile joystick. Both Gloria Jeans (first floor) and Синема Парк (second floor) pass entry and exit. Debug data is read only; player positions and store state are never injected. No mall screenshots are captured by this test, so inherited clothing assets do not enter new review evidence. Chromium/SwiftShader and touch emulation remain distinct from a real device certification.

Follow-up navigation verification includes Escape on a search result (closing with opener focus), Enter from the search field and native result activation. Repeated movement testing exposed a first pointer-lock mouse-delta warp that could direct W movement toward another store; queued look deltas are now cleared on capture/navigation and the first nonzero capture delta is discarded. All four selected-store entry/exit routes passed after this correction. This is a tested control fix; it is not a claim about every possible mall route.
