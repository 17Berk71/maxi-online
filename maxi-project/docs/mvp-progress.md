# MAXI Online — MVP development progress

Updated: 2026-10-24. Scope: experimental branch `codex/mvp-prd-architecture`, draft PR #18 (base: `codex/stage-18-recovery`). **Do not merge or deploy.**

## Latest verified change

- `1067217` — restored photo-board entries are normalized before display: persisted merchant URLs are accepted only as HTTP(S), and protocol-relative-looking local paths with backslashes are rejected. `photoLookItems()` now returns independent item copies so callers cannot mutate internal board state.
- `19b10b0` — desktop/mobile Playwright smoke now checks malicious saved links, invalid image paths and mutation isolation across a fresh page load.
- GitHub Actions **MVP architecture checks #30** on `19b10b0`: **passed** (module/importer syntax, evidence policy tests, production build, Chromium photo-board smoke at 390px and 1280px). Workflow: https://github.com/17Berk71/maxi-online/actions/runs/40075162621
- The checks use synthetic fixture images and URLs. No real catalogue, licence or store-stock claims were added.

## Boundaries / outstanding release blockers

- Browser smoke uses an isolated photo-board fixture, **not** an end-to-end journey through the actual 3D mall.
- No verified, rights-cleared live multi-category catalogue or current local-store stock evidence is available for a real-data pilot. Do not label feed previews as original photographs or infer photo usage rights from a URL.
- Saved named look collections, versioned storage/migration, and full screen-reader/device testing are still incomplete.
- The inherited stage-18 3D fitting remains experimental and is **not** accepted for investor-facing realism claims.
- No deployment, PR merge, or change to `main` has been performed.

Next safe steps: strengthen storage validation and error-state tests, add independent saved-look versioning, then run full integrated mall-to-product-to-photo-board browser journeys before any release decision.
