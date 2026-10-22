# MAXI Online — MVP architecture migration (2026-10-22)

Status: IMPLEMENTATION IN PROGRESS; do not merge or deploy on documentation alone.
Product authority: `MAXI_ONLINE_PRD_v1.0.md` (maintained externally until reviewed for commit).
Development base: `codex/stage-18-recovery` @ `018bd8af5a5134e3fe95c4c638937f674b52becf`.
This branch inherits EXPERIMENTAL 3D-fitting changes. It is NOT a release branch.

## Decisions (PRD-first)

1. Preserve existing 3D mall, shop interiors, navigation, and 3D fitting as optional legacy capabilities.
2. Real-photo catalogue and independent original-photo outfit board become the MVP's primary product flow.
3. AI try-on and physics simulation never block showing source photos, save-to-look, or outbound merchant links.
4. No internal payments, booking, or local-stock promises. Historic demo cart is not a validated purchase path.
5. A feed importing successfully does NOT confirm affiliation, image-use rights, store stock, or fresh inventory.
6. Unknown/expired stock evidence is displayed as unknown, and online-store inventory is never presented as stock at the Tula physical location.

## Proposed module boundaries

- `shop/catalog-evidence.js` — PURE: source attribution, temporal proof, stock scope, safe outbound URL; initially integrated into `shop/feeds.js`.
- `shop/feeds.js` — ADAPTER: existing YML-derived feed loader; remains compatible with demo fallback. Future: versioned per-store adapters and staging manifest.
- `shop/catalog.js` — LEGACY demo catalogue; keep behind explicit demo mode, not silently presented as verified products.
- `shop/product.js` — PRESENTATION: distinguish original photos and generated 3D models; display source, freshness, stock scope.
- `shop/fitting/*` — EXPERIMENTAL 3D engine, preserved; not the implementation of the MVP photo board.
- `shop/photo-looks/*` — NEW MVP UI domain (planned): image-first outfit board, deterministic sizing, reorder/remove, local persistence, original-photo provenance.
- `shop/saved/*` — NEW MVP persistence domain (planned): versioned localStorage with migration and removal of broken source links.
- `tools/feeds/*` — IMPORT: provenance records, source licensing review, per-store feed freshness and failure alerts before publish.
- `tools/test/*` — E2E and mobile acceptance. Existing cinema timeout remains unresolved in stage 18.

## Evidenced reality versus PRD

| Requirement | Evidence | Gap |
|---|---|---|
| FR-CAT-001 | existing `shop/catalog.js`, `shop/product.js` | no verified real multi-category pilot |
| FR-CAT-002, FR-DATA-004 | `shop/feeds.js`, `tools/feeds/import_feed.py`; new evidence contract | validation/publish gate and rights metadata missing |
| FR-CAT-003 | original feed photo path in `shop/product.js` | source image links/permissions need validation |
| FR-CAT-004 | new stock evidence function | UI must consume evidence; expiry and local vs online copy need visual verification |
| FR-LOOK-001/003 | legacy 3D fitting `shop/fitting/` | independent photo-first board missing |
| FR-LOOK save | `room-panel.js` writes looks in localStorage | saved IDs can depend on wardrobe items; migration/failure UX missing |
| FR-CAT-006 | item URL outbound in `shop/product.js` | validate links and never imply internal checkout |
| FR-DEMO-001 | `tools/test/check.mjs` | full mall check reportedly stops at cinema entry |

## Strict data contract (first pass)

A public claim of `confirmed_in_stock` or `confirmed_out_of_stock` needs:
- `availability_source`: http(s) evidence URI;
- `availability_checked_at`: parsable timestamp, not in future;
- `availability_expires_at`: future timestamp later than checked_at;
- `availability_scope`: `physical_store_tula` or `online_store`.

Absent any field → `unknown`. The field `pickup` is NOT evidence of physical location inventory.
`demo: true` overrides any purported evidence to unknown.
This is intentionally more conservative than legacy imported size labels.

## Implementation batches / acceptance

### M0 foundation (IN PROGRESS)
- [x] Create isolated branch, without changing main or pre-existing PRs.
- [x] Introduce pure `catalog-evidence` module and unit tests.
- [x] Attach evidence to imported products.
- [x] GitHub Actions syntax checks, Node tests, production build, and isolated Playwright desktop/mobile smoke pass (run #11, 22 Oct 2026). This does not certify the full mall.
- [x] Product cards avoid unverified local stock, pickup, and demo purchase claims.\n- [ ] Full keyboard/screen-reader audit and integrated mall browser E2E remain open.

### M1 real-data pilot (P0)
- [ ] Choose real permitted product feeds across at least two categories; record rights and source terms.
- [ ] Create importer validation report and signed-off publication manifest; reject malformed/missing provenance.
- [ ] Add feed age/TTL, diff and rollback; suppress unsupported location stock claims.
- [ ] Preserve original image immutably; remove generated imagery from source-image fields.

### M2 photo-first outfit board (P0)
- [ ] New standalone route reachable from product card and quick catalogue.
- [x] Isolated outfit board adds, removes, reorders and browser-saves images across stores without 3D/AI; independently smoke-tested.\n- [ ] Add independent named look collections and storage migration.
- [ ] Side-by-side unmodified images with consistent frames and clear “not fit simulation” disclaimer.
- [ ] Accessible mobile flow, image loading/empty states and storage version migration.

### M3 investment demo quality gate (P0)
- [ ] E2E: open mall -> distinct categories -> product -> original-photo board -> save -> merchant link.
- [ ] Strict mobile viewport/browser/WebGL fallback testing; capture reproducible screenshots.
- [ ] Verify consent/licensing/source correctness and no unsupported stock/promotional claims.
- [ ] Capture performance budget and failing devices rather than asserting an unmeasured FPS.

### M4 optional research (P2)
- [ ] Leave stage 18 garment simulation quarantined until independent QC for all claimed garment families and animation.
- [ ] AI visualization behind opt-in, clearly labeled and never modifying original product identity.

## Risks and non-claims

This branch has not passed independent browser, lint or production-build checks.
The reports in PR #17 are self-reported test outcomes for stage18, not acceptance of this branch.
Never merge PR #17 and this branch directly to main before reconciliation of the entire PR chain.
