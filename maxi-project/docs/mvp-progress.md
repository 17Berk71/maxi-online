# MAXI Online — MVP development progress

Updated: 2026-10-24. Scope: experimental branch `codex/mvp-prd-architecture`, draft PR #18 (base: `codex/stage-18-recovery`). **Do not merge or deploy.**

## Latest verified change

- `1067217` — restored photo-board entries are normalized before display: persisted merchant URLs are accepted only as HTTP(S), and protocol-relative-looking local paths with backslashes are rejected. `photoLookItems()` now returns independent item copies so callers cannot mutate internal board state.
- `19b10b0` — desktop/mobile Playwright smoke now checks malicious saved links, invalid image paths and mutation isolation across a fresh page load.
- GitHub Actions **MVP architecture checks #30** on `19b10b0`: **passed** (module/importer syntax, evidence policy tests, production build, Chromium photo-board smoke at 390px and 1280px). Workflow: https://github.com/17Berk71/maxi-online/actions/runs/40075162621
- `6f597e7` — Playwright simulates localStorage quota errors and verifies that failed changes neither delete a product nor silently fail; the dialog announces the storage error.
- `5efdb7b` — demo product entries no longer include unverified/fabricated merchant URLs, even when a demo record contains a URL.
- `8b80780` — Playwright verifies the demo-link policy alongside storage hardening.
- GitHub Actions **MVP architecture checks #32** on `6f597e7` and **#34** on `8b80780`: **both passed**, including desktop/mobile Chromium smoke. Latest: https://github.com/17Berk71/maxi-online/actions/runs/40075337733
- The checks use synthetic fixture images and URLs. No real catalogue, licence or store-stock claims were added.

## Boundaries / outstanding release blockers

- Browser smoke uses an isolated photo-board fixture, **not** an end-to-end journey through the actual 3D mall.
- No verified, rights-cleared live multi-category catalogue or current local-store stock evidence is available for a real-data pilot. Do not label feed previews as original photographs or infer photo usage rights from a URL.
- Saved named look collections, versioned storage/migration, and full screen-reader/device testing are still incomplete.
- The inherited stage-18 3D fitting remains experimental and is **not** accepted for investor-facing realism claims.
- No deployment, PR merge, or change to `main` has been performed.

Next safe steps: strengthen storage validation and error-state tests, add independent saved-look versioning, then run full integrated mall-to-product-to-photo-board browser journeys before any release decision.

## Continuation — 24 October 2026 (Work)

Recovery started from actual branch HEAD `ad6076f`, preserving all ten commits after the supplied `4e4c1ee` checkpoint.

Implemented against FR-LOOK-001/002, FR-SAVE-002 and NFR-001/003/006:
- Separate versioned persistence module `photo-looks/storage.js`, with independent named snapshots (IDs, ordered product references, capture time), load and deletion. Limits: 24 products per draft, 30 saved looks; exceeding limits never silently evicts earlier work.
- Legacy v1 drafts migrate on first successful v2 write. The legacy key remains untouched as a backup. Corrupt or unsupported versions block writes; quota/read failures and stale-tab writes cannot overwrite the loaded data.
- Public access from the mall toolbar. Product add failures now have a visible status message. Modal background is inert; board keyboard events cannot trigger mall shortcuts; movement inputs are suppressed while it is open.
- Saved entries are catalogue snapshots, not proof of current availability. Images failing later have a text fallback; demo merchant links remain suppressed.
- Actual application-entry browser journey added: two store scenes/catalogues -> product -> source-image board -> named save -> page reload -> restore -> new merchant tab. Debug API positions the visitor; UI performs catalogue/product/save actions. Feeds and merchant responses are intercepted synthetic fixtures, **not live stores or verified partnerships**. This does not validate physical walking, all store categories, full WebGL fallback, all devices or actual feed rights.

Verification results and screenshot notes are recorded in `docs/review-2026-10-24/README.md`.
