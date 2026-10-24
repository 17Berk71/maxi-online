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
