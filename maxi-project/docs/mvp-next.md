# Autonomous continuation checkpoint — 24 October 2026

Repository `17Berk71/maxi-online`, branch `codex/mvp-prd-architecture`, draft PR #18; base remains `codex/stage-18-recovery`. Read the actual remote HEAD first. Do not reset to the original `4e4c1ee` checkpoint, merge into main, deploy or publish private clothing photographs.

## Implemented and checked

- Evidence-based stock scopes, demo-link suppression, original/processed-image separation.
- Independent photo board with named save/load/delete, legacy migration, validation, focus handling, error states and conservative storage-conflict handling.
- Separate persisted favorite-product snapshots, including records with missing source photos.
- Quick catalogue (`?catalog=1`) that loads without app.js, WebGL fallback and asynchronous 3D-startup fallback. Network retry paths are tested.
- Unknown-price preservation, decimal importer prices, distinct import and verification dates, source-photo priority and offline catalogue evidence audit.
- Public search and pedestrian entry/exit on both floors, using W on desktop and actual browser touch dispatch for the mobile joystick; native keyboard search results, Enter/Escape shortcuts, explicit Escape pointer unlock and capture-delta reset to prevent camera warps.
- Tests and evidence: `docs/mvp-progress.md`, `docs/review-2026-10-24/README.md`. Exact CI outcomes must be read from GitHub for the current HEAD.

## Remaining technical work, in priority order

1. Audit modal live announcements with a real screen reader and test touch/browser behavior on physical phones; check keyboard interactions across all legacy overlays.
2. Expand pedestrian navigation beyond the checked Gloria Jeans / Синема Парк routes on both viewports. Search -> door -> W/touch joystick -> entry/exit now passes without position writes. Revisit the older exhaustive cinema/movie/cart script separately; its full behavior remains uncertified.
3. Profile real mobile memory/load behavior. Quick mode avoids the heavy graph, but the 3D path still has large bundles. Paginate/virtualize large real catalogues after establishing a measured baseline.
4. The local candidate/revision CLI now provides review, diff, guarded activation, bulk hide and rollback (see catalog-workspace.md). Next: authenticated operator UI, partner-source pilot and live-source verification. No deployment is authorized by the CLI.
5. Add privacy-minimal demo events with testable deduplication and rehearse a full presentation route. Do not describe fixture tests as live-merchant integration.

## External evidence still missing

The bundled 3 store catalogues / 125 products are **demo data**. No actual store connection, content rights, live assortment freshness or local stock is established. `node tools/feeds/audit-catalog.mjs --require-real` must fail for this baseline. Actual permitted feeds, source terms, image permissions and reviewed store categories are required before a real investor-pilot readiness claim. Do not fabricate manifest approvals or silently turn demo flags off. Contract verification and live URL/image verification are outside the offline gate.

Optional 3D clothing/AI remains experimental and does not gate the photo-first flow. Cross-device cloud sync is not implemented; all saved data remains in the same browser and can be lost if its local data is cleared.
