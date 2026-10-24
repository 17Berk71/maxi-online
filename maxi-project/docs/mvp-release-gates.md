# MVP release gates — evidence snapshot, 24 October 2026

Product source: the owner's MAXI Online PRD v1.0. Development remains on draft PR #18, based on `codex/stage-18-recovery`. This is a readiness audit, not permission to merge or deploy.

| Gate | Current evidence | Status / remaining work |
|---|---|---|
| RG-01: real stores across categories | Bundled index has 3 demo catalogues / 125 demo products | **Blocked**: no authorized real pilot or actual partnership evidence |
| RG-02: originals and source provenance | Source/preview separation, original-image priority, verification/import dates, unknown-stock handling; synthetic browser checks | **Partial**: real image identity, permissions and source correctness need review |
| RG-03: desktop/mobile journey | 390px/1280px Chromium product/save/reload/outbound flow; keyboard and touch-joystick store navigation | **Browser checks pass locally**; physical phones, more browsers and measured performance remain unverified |
| RG-04: cross-store named looks | Two-store composition, ordered save, reload, restore, independent favorites and failure recovery | **Implemented and regression-tested**; persistence is browser-local |
| RG-05: reproducible import/update | Stable importer grouping, synthetic importer invocation, optional prices and offline audit | **Partial**: staging, atomic publication/rollback and operator bulk hide are still missing |
| RG-06: valid source destinations | HTTP(S) validation, demo-link suppression, safe new-tab handling and synthetic merchant navigation | **Partial**: real merchant links have not been network/content-verified |
| RG-07: WebGL/AI independence | Quick route never loads app.js; explicit WebGL-unavailable and asynchronous startup-failure cases pass | **Implemented for the checked failure modes**; later context loss and every renderer failure are not certified |
| RG-08: content rights and affiliation | Offline gate rejects absent/malformed review metadata and unreviewed hosts | **Blocked**: record validation does not authenticate contracts or photo rights |
| RG-09: demo rehearsal and limitations | Repeatable automated paths, synthetic screenshots, progress and continuation documents | **Partial**: a human investor-demo rehearsal is not recorded |

## Checks and their limits

The combined branch passed 29 Node tests, 2 Python pricing tests, build/syntax checks, isolated photo-board checks, six quick-catalogue cases, two application/store/product journeys and four selected-store walking/touch routes locally. The elapsed-time door-guard correction was separately rechecked with the navigation suite. CI results must be read for the tested code commit; a pending run is not a pass.

The selected stores are Gloria Jeans (first floor) and Синема Парк (second floor) for navigation, plus synthetic two-store feeds for the outfit journey. Automated tests neither establish merchant participation nor certify the inherited experimental 3D-fitting quality, the older exhaustive cinema/movie/cart script, real inventory or screen-reader behavior.

[Detailed evidence and synthetic screenshots](review-2026-10-24/README.md) · [Progress and CI checkpoints](mvp-progress.md) · [Next technical work](mvp-next.md) · [Publication metadata contract](catalog-publication.md)

**Real-pilot readiness remains blocked.** Current data must continue to be labelled demonstration data. No real sources, permissions, availability or numerical freshness SLA may be invented to pass these gates.
