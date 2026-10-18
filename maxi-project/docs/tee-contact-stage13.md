# Tee contact — stage 13

The remaining armhole defect is a surface problem: safe solver/display vertices
can surround a triangle whose centre is inside the arm. Closing seams and the
old QC score of 100 were insufficient acceptance evidence.

## Changes

- Retain front/back contact hints closer to the axilla (0.08H lateral boundary).
- Derive the z=0 section from the same posed body triangles. For oriented tee
  seams without a front/back label, try contact against that section instead of
  allowing adjacent samples to escape to opposite depth sides of an arm.
- Compare the ordinary and candidate displayed meshes once at fitting time.
  Keep the candidate only if both worst sampled depth and flagged-triangle area
  do not increase. Restore geometry and lighting attributes otherwise. Playback
  reuses the selected policy. This is fixed-pose display stabilization, not an
  extra physical constraint or general continuous cloth collision.
- Add an explicit shoulder-surface QC criterion, tolerance 0.5 mm. A failure
  deducts 20 points and sets `ok=false`, regardless of the aggregate old score.
- Warm BVH queries use a prior closest point on the immutable body as a safe
  distance upper bound. Searches still examine every potentially nearer node;
  this does not approximate the body. Cache entries are weakly keyed by arrays.
- `SURFACE_ANIMATION_QA=1 ANIMATION=1` in the private geometry exporter audits
  actual `clothUpdate` output, not only solver nodes. Static mesh attributes are
  restored after the audit. `CLOTH_VER=c62-mh-contact-quality` invalidates old fits.

No extra subdivision or solver topology changes are retained in this stage.
Source photographs, texture coordinates and captured garment dimensions remain
unchanged. Private garment assets and diagnostic exports are excluded from git.

## Verification

42 tests and the production build pass. Tests cover warm/cold BVH equivalence,
exact box-section clearance, unsafe triangle centres despite safe vertices, and
restoring geometry/normals when a candidate makes contact worse. Existing worker
serialization and playback tests also pass.

Static reference measurements, re-audited with the same criterion:

| Figure / tee | Stage 12 flagged / tested | Stage 13 flagged / tested | Maximum depth before → after | Flagged-triangle area before → after |
| --- | --- | --- | --- | --- |
| Male 186 cm, 82 kg, 110–82–98, jeans then tee | 60 / 14,428 | 39 / 14,414 | 24.09 → 8.63 mm | 115.07 → 59.26 cm² |
| Female 173 cm, 56 kg, 82–62–92, tee | 49 / 12,693 | 46 / 12,736 | 24.98 → 24.98 mm | 225.39 → 213.52 cm² |

The midplane candidate is accepted on the male figure and rejected on the female.
Both tees now correctly fail the stricter criterion (QC 80); male jeans remain
QC 100. This scoring change exposes an existing defect, not a claim of worse
physical fit. The female armhole remains a major unresolved defect.

All 111 recorded solver frames are finite, finished seam-pair gaps are zero and
final solver positions match static output. Actual displayed triangle centres
were additionally audited for all 74 tee frames: every frame has residual
failures, with worst sampled depths 8.83 mm male and 24.98 mm female.

These are triangle-centre samples in y=[0.63H,0.84H], |x|≥0.09H. The area is the
sum of whole triangles whose centre fails; it is NOT an exact intersection area.
Sampling and the same body collider are not independent full-surface validation.
Offline geometry/photo renders were inspected; they omit browser shaders and
normal-map detail. Chromium, live playback, Samsung A54 performance and the full
mall UI remain unverified. The live stand is unchanged; this stage is a draft PR.

A cache-only export was coordinate/index identical to stage 12. Single CPU
exports were about 15.9 s baseline and 15.0 s cached, but this is not a repeated
benchmark and does not establish a speedup, particularly with the new audits.
Next acceptance work is construction/contact continuity at the female axilla,
continuous surface checks, and browser/device performance.
