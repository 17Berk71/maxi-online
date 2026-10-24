# MAXI Online — MVP development progress

Updated: 2026-10-24. Scope: experimental branch `codex/mvp-prd-architecture`, draft PR #18 (base: `codex/stage-18-recovery`). **Do not merge or deploy.**

## Latest verified change

- `6bed685` — the photo-first outfit board retains keyboard focus on the edited product after reordering or removal, disables impossible boundary moves, announces successful edits through a live status region, and displays a storage-failure message rather than silently ignoring an unsuccessful save.
- `e4c3592` — Playwright desktop/mobile smoke now asserts focus restoration, reorder result, disabled boundary action, and accessible status text.
- GitHub Actions **MVP architecture checks #27** on `e4c3592`: **passed** (syntax, importer syntax, evidence policy tests, production build, Chromium photo-board smoke at 390px and 1280px). Workflow run: https://github.com/17Berk71/maxi-online/actions/runs/40071377205

## Boundaries / outstanding release blockers

- Browser smoke uses an isolated photo-board fixture, **not** an end-to-end journey through the actual 3D mall.
- No verified, rights-cleared live multi-category catalogue or current local-store stock evidence is available for a real-data pilot. Do not label feed previews as original photographs or infer photo usage rights from a URL.
- Saved named look collections, versioned storage/migration, and full screen-reader/device testing are still incomplete.
- The inherited stage-18 3D fitting remains experimental and is **not** accepted for investor-facing realism claims.
- No deployment, PR merge, or change to `main` has been performed.

Next safe steps: strengthen storage validation and error-state tests, add independent saved-look versioning, then run full integrated mall-to-product-to-photo-board browser journeys before any release decision.
