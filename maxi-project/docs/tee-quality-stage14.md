# Tee surface and playback — stage 14

The previous prototype left visible armhole holes and crumpling, particularly on
an oversized female fit. Stage 13's triangle-centre QC exposed the problem but
did not repair it. The reference tee now has continuous shoulder/armhole surfaces
on four body references, with a rounder bound neckline and consistent seam light.
This is an accepted improvement to this pilot, not validation of every garment
family or calibrated textile physics.

## Implementation

- Use a 12 mm physical panel grid and about 15 mm sleeve rows for MakeHuman tees.
  Cap samples still correspond one to one with the real panel boundary. The
  physical mesh now resolves the armhole rather than relying on a coarse sheet
  plus visual subdivisions. Remove the old extra display subdivision: the final
  render sample spacing remains about 6 mm and the scene is smaller.
- Preserve the same front/back contact labels in the solver, seam finishing,
  worker message and display mesh. At a joined seam, a neutral copy no longer
  erases the unique front/back label. Truly mixed front/back seams remain neutral.
  Sleeve sectors also retain the inner/outer side of the tilted arm axis.
- Remove seam-collapsed zero-area faces and impossible springs between copies of
  one sewn point. The two original real-tee pilots require zero such removals;
  the synthetic construction test found two and now verifies a valid quotient
  mesh. Only neck, hem and two cuffs remain as open boundary loops.
- Add local surface constraints at triangle centres, edge midpoints and three
  interior points, with a 4 mm target clearance. Proposals are combined across
  topological seam copies, including render subdivisions. Each iteration is
  capped at 2 mm displacement; physical rest lengths and UVs are not rewritten.
- Skip repeated contact queries only when previous signed clearance minus sample
  travel proves separation on the immutable posed body. Large jumps fall back
  to the full triangle query. The reported clearance describes the input point,
  not the position after projection.
- Share display normals at every welded subdivision, not just solver nodes.
  Bound neckline chords have a dedicated stiffer bending constraint; this keeps
  the round opening from collapsing into a sharp V. Neck dimensions remain
  estimates, not new tape measurements.
- Prepare exact corrected display frames once for supported plain tees. Playback
  copies positions, normals, colour and wrinkle attributes and refreshes the edge
  geometry. It does not repeat expensive contact finishing. Static attributes
  are restored after preparation, and unsupported collars/linings/decor use the
  existing path. The additional CPU memory belongs to the current garment mesh.
- `FIT.ready()` now waits for a stable build chain. Loading a fitting pack can
  schedule another build; the old promise could resolve with no actual garment
  and null QC. Browser QA now rejects that false-ready state.

`CLOTH_VER=c63-mh-continuous-tee`. Existing garment dimensions, selected captured
size, opaque photo pixels and texture coordinates are retained. Private source
photos, fit caches, reports and screenshots are excluded from this public tree.

## Verification

47 tests and the Vite production build pass. New tests cover independent body
crossings missed by centre sampling, topological seam normal sharing without
joining nearby unrelated folds, surface correction with unchanged UV/rest data,
safe cached clearance after small motion and large jumps, exact prepared frame
replay and restoration, and four valid garment boundary loops. Existing worker
serialization, construction, measurement, camera and playback tests pass.

An independent segment/triangle intersection routine checks both cloth edges
against body faces and body edges against cloth faces. It uses the posed body
geometry, not the collision projector's answer. Coplanar contacts and numerical
boundary touches are excluded; zero crossings is not a calibrated fit guarantee.

| Reference | Tee QC | Full-body static crossings | Displayed settling frames with shoulder crossings |
| --- | --- | --- | --- |
| Male 186 cm, 82 kg, 110–82–98; jeans then tee | 86; strain criterion remains flagged | 0 | 0 / 37 |
| Female 173 cm, 56 kg, 82–62–92; tee | 100 | 0 | 0 / 37 |
| Male 176 cm, 74 kg, 96–78–98; tee | 100 | 0 | Not recorded in this iteration |
| Female 168 cm, 70 kg, 96–78–104; tee | 100 | 0 | Not recorded in this iteration |

All 111 solver frames (male jeans and both tees) are finite. Finished solver seam
pair gaps, displayed seam-copy gaps and endpoint/static differences are zero.
All 74 displayed tee frames also have zero failed centre samples. Their exact
crossing audit covers y=[0.63H,0.84H], |x|≥0.09H; the separate static audit above
covers the entire body and garment. Full-body dynamic crossings outside that
shoulder region and cloth self-intersections have not been certified.

The captured tee is 108 cm around the chest; the first male body is 110 cm. About
3.4% of structural links exceed the existing extension threshold, so its strain
criterion remains flagged even though aggregate QC passes. No threshold or
measured garment width was relaxed to produce the result.

## Actual browser and performance

The local Chromium binary and graphics libraries were truncated. Re-extracting
the complete existing archives restored Chromium 153 and WebGL/SwiftShader.
Actual fitting-room front, side and back views were inspected on both reference
bodies. Prepared playback contains 37 frames per tee; frames 10, 25 and 35 and
switching animation off were verified. Both browser runs reported zero page
errors and non-null QC for the completed outfits.

The male full outfit has 48,038 vertices; the female body/tee has 34,455. These
are scene totals, not physical solver node counts. Prepared attribute buffers
use 34,474,528 bytes male and 32,122,068 bytes female (about 32.9 / 30.6 MiB per
active tee). This is a memory/time tradeoff, not free acceleration.

Under parallel CPU/software-renderer load, initial browser fitting plus frame
preparation took about 90 s male and 71 s female. These are diagnostic environment
measurements, not Samsung A54 timings or a shipping latency target. Repeated
playback uses the prepared arrays, but device frame rate remains unmeasured.
The live stand and default mannequin have not been changed.

The shoulder/armhole visual defect on these pilots is closed by the above gates.
Remaining production work includes startup latency/device profiling, validated
material parameters, broader garment-family coverage and better source neckband
and construction measurements. Browser screenshots and offline geometry/photo
renders are distinct evidence; the comparison deliverable uses offline renders
with the same camera and lighting, without retouching.
