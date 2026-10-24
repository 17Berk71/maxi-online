# Large catalogue rendering review

Chromium screenshots use the same 1,000 synthetic products, viewport and fixture image. The before module is the actual `quick-catalog.js` from `75573e2`; the after module is the paginated implementation. No private clothing photos are used.

| Viewport | Before: 1,000 product cards | After: 40 product cards | Full-catalogue search for item 0999 |
|---|---|---|---|
| 390 × 844 | [Before](before-390.png) | [After](after-390.png) | [Search](search-390.png) |
| 1280 × 844 | [Before](before-1280.png) | [After](after-1280.png) | [Search](search-1280.png) |

The test asserts card counts in the DOM, not just a cropped screenshot. Product order is unchanged; all products remain accessible by page or search. Search covers existing names, department titles and supplied colour names; it does not generate missing attributes or prices. Page buttons retain focus, including the last-page boundary, and search preserves input focus.

`catalog-page.browser.mjs` traverses all 25 pages at both widths, searches for item 0999, saves it to favorites and a look, excludes hidden records and resets an empty search. Unit tests check 1,000-item reachability, duplicate-free ordered page slices, query matching and invalid paging inputs.

Reproduce screenshots with Vite running: `git show 75573e2:maxi-project/src/shop/quick-catalog.js > src/shop/quick-catalog-baseline.js`, then `node tools/test/catalog-page.review.mjs`; remove only the temporary baseline module afterwards. `CHROME_PATH` can select Chromium.

This is bounded rendering evidence, not a physical-device speed/FPS or memory benchmark. Input JSON is still loaded as one feed; server-side pagination and source adapters remain separate future work.
