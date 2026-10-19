# Strict garment quality acceptance

The old aggregate score could approve a garment with a misplaced sleeve or a
small but severe local defect. Geometry-only acceptance also missed texture
coverage, local deformation and unsupported assumptions about source material.
The score remains a legacy diagnostic. It cannot compensate for failed checks.

## Decisions

`quality-policy.js` defines version `garment-quality-v2`:

- `rejected`: at least one check fails;
- `review`: no definite failure, but evidence or a supported test is missing;
- `passed`: every required check passes with no pending review.

The fitting-room message uses this status instead of a high score as approval.
Audit exceptions produce rejection rather than hiding the message. Version
`c80-quality-audit` invalidates cached garments lacking the new audit context.
The quick runtime screen cannot grant full approval without the independent
full-body and three-view audit; it remains pending review even when local
checks pass. Full acceptance is issued by the case runner. This change does
not repair garment geometry.

## Screening thresholds

These are initial engineering limits, not calibrated commercial acceptance or
measured textile properties. Tune them against independently reviewed garments;
do not relax them solely to make current prototypes pass.

| Check | Rule |
| --- | --- |
| Body intersections | Zero in an independent displayed triangle/body audit over the full body |
| Seam gap | At most 0.5 mm between displayed copies of a sewn point |
| Topology | No collapsed/nonmanifold faces, irregular boundary or unexpected opening |
| Missing source coverage | At most 0.5% of interior projected area per view |
| Largest missing source patch | At most 0.1% of interior projected area |
| Local missing coverage | At most 2% within each of six spatial regions |
| Minimum visible evidence | At least 1,000 interior pixels; clipped/smaller views cannot prove a pass |
| Sleeve routing | No wrong-side/collapsed ring; at most 5% of tested rings miss the arm axis |
| Cuff axial position | Within 2 cm for measured sleeves, 4 cm for inferred sleeves |
| Hem placement | Review beyond 2.5 cm for measured length or 4 cm for inferred length |
| Silhouette | 32 sections on both sides; mean error at most 8%, worst section at most 15% |
| Gross local extension | More than 50% extension of a primary constraint rejects the garment |

Extension is evaluated separately by panel and warp/weft direction, weighted by
original constraint length. Extension beyond 25% for knit, 12% for woven, or 10%
for structured garments triggers review when affected length exceeds 1%, 0.5%,
or 0.5%, respectively. Strong compression requires review: folds and gathers
must not be universally classified as errors. These categories are construction
heuristics, not measured properties of a particular fabric.

The sleeve audit measures displayed cross sections after the shaped cap against
the arm axis in the fixed pose. A floating sleeve can fail without intersecting
the body. A long sleeve is checked against its own declared end position rather
than shortened to a wrist. Wide/asymmetric sleeves need dedicated reviewed cases.

## Source coverage and silhouette

The legacy cutout check now estimates missing surface area using seven weighted
barycentric samples per triangle. It no longer calls a triangle count an area.
This coarse grid estimate is a diagnostic, not the final visible coverage test.

`quality-view.js` renders opaque geometry and original source-alpha coverage in
two offscreen passes for each isolated garment and current camera. It detects
missing source even when colour filling makes the final material opaque. Black
and white garments work without RGB thresholds. A one-pixel silhouette rim is
excluded for rasterization differences; connected patches and six local regions
are measured separately. Raw images, masks and reports remain private.

This cannot recognize an opaque background patch, a lost logo or textile realism.
Colour, print continuity, material identity and unseen details retain review
requirements. Render target, clear state, viewport and scissor are restored;
temporary GPU resources are disposed after each audit.

Front/back profiles retain both average and worst error. Differently posed,
flat and hanging photos remain review proxies. A matched worn reference is needed
before profile disagreement becomes a definite failure. Bottom-garment silhouette
comparison is explicitly pending review.

Optional `qualityEvidence` survives pack import and affects the cache key. Only
literal `true` acknowledges `constructionReviewed`, `textureReviewed`,
`materialMeasured` and `silhouettePoseMatched`. These are retained declarations
from review, not evidence inferred by the model. No private pack is automatically
marked reviewed by this change.

## Running

```sh
node --test tools/lab/*.test.mjs
npm run quality:test
PW_CHROMIUM=CHROMIUM_PATH npm run quality:render
QA_OUT=PRIVATE_OUTPUT PACK_DIR=PRIVATE_PACKS PW_CHROMIUM=CHROMIUM_PATH \
  npm run quality:check
```

Historical generated-review tests require fresh `review-dist` and
`review-anatomy-dist` outputs. Generate them using `tools/lab/review.mjs` with
`REVIEW_STAGE=families` / `anatomy` and an explicit `BEFORE_SOURCE` checkout.
Keep their pack copies in ignored private output directories.

`npm run quality:check` always enables strict mode, even if the environment
requested report-only behaviour. The runner records three views, geometry acceptance, quality decisions and review
reasons. Strict mode exits nonzero for rejected or unresolved cases. Empty cases,
invalid numbers, incomplete views, missing geometry and unavailable requested
sizes/frames cannot approve a garment.

`CASES` supports `variants` with distinct `label`, `body`, `sizes` and `states`
overrides. Sizes are validated instead of silently falling back to the first row.
For settling, `auditFrames` selects frames; `QA_ALL_FRAMES=1` inspects every recorded
frame, including the final one. This does not test dynamic body posing.

## Validation checkpoint

- 73 Node tests pass, covering displaced/long sleeves, defects hidden by averages,
  missing evidence, NaNs, views/frames, source-area weighting and cache metadata.
- A separate real WebGL test passes for black/white fabric, a connected source
  hole, missing source and renderer-state restoration.
- Source lint: 151 files, no findings. Production build passes.
- All six baseline outfits fail expanded acceptance, although five pass the old
  geometry-only gate. A regression figure and two size/body variants also remain
  rejected. Private source images and reports are not committed.
- All 37 recorded frames of one knit settling animation were audited, with zero
  detected body intersections. Local deformation/cuff checks still reject it.
- Fitting-room browser runs complete without page errors. Expected strict-mode
  rejection exits are distinct from execution failures or failed code tests.

The general mall run passed the initial second-floor navigation checks, then
exceeded the 90-second validation budget while capturing a screenshot and was
stopped. This is not a full mall E2E pass. Nothing is merged or deployed by these
audit tools.
