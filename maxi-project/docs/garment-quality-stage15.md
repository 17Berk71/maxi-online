# Garment construction after the cross-family visual review

The stage-14 review exposed unusable long sleeves and an open jacket whose front
panels slipped down the body. The tee's fixes did not apply to other top families.
Passing the old particle/strain score did not establish acceptable appearance.

## Resulting construction

- Match the triangulated armhole boundary to the sleeve cap on every supported
  MakeHuman top. Open fronts use their own left/right panel, rather than always
  using the first front half. Remove shoulder stitching that intrudes into the
  armhole and makes an edge belong to four faces.
- Remove coincident front/back triangles at a sewn, zero-volume fin. Complete
  only tiny multi-panel hood junction gaps; the face opening, neck, cuffs and hem
  remain open.
- Use visible body triangles down the forearm, rather than switching to coarse
  raster columns halfway down a sleeve. Display-surface correction covers that
  region too. Front/back contact orientation survives solver, worker and display.
- Start long sleeves on the posed shoulder axis. The old centre-of-armhole
  origin added length towards the hand. The unmeasured default ends near the
  wrist; explicit sleeve measurements remain unchanged and can be longer/shorter.
- Retain asset revision, light preprocessing and material metadata on wardrobe
  import. Changes to the material tile scale invalidate the garment cache.
- Extend transparent texture borders from nearby fabric, preserving local colour
  and prints rather than filling a whole border with a single median colour.

`CLOTH_VER = c79-mh-garment-construction` invalidates the previous simulations.
The default silhouette fallback also accepts measurement-only input without NaNs.

Curved dress hems retain their contour label even where the raised side hem is
well above the centre hem. Those vertices previously entered the side seam and
pinched front and back together. Stretched display edges also receive dense
contact samples, matching acceptance coverage instead of inspecting centres only.

## Photo processing

`tools/wardrobe/material_atlas.py` builds a repeatable swatch from an opaque,
low-illumination-variation region of the actual garment photograph. It removes
broad lighting from that crop and records the crop and **estimated** physical
tile scale. It is enabled only for sleeves reviewed as plain. It cannot preserve
an unobserved sleeve graphic, identify a textile composition, or measure stretch.

On a copied, private processed pack:

```sh
python3 tools/wardrobe/material_atlas.py PRIVATE_PACK_DIR \
  knit-polo ami-zip blazer rib-long --clean-border-chroma
```

The optional mask cleanup is for reviewed single-colour garments. It removes
outlier background components connected to a cut edge, including the crop frame,
and protects interior prints. It rejects large ambiguous changes. Do not enable
it across an unreviewed multicolour catalogue. Keep the original pack as input;
this command writes the prepared copy. Private photos are never committed here.

The new `materialTexture` field carries `file`, `widthM`, `heightM`, the source crop,
scale provenance and `sleeveDesign: reviewed-plain`. Sleeve UVs use this metric
tile instead of a narrow, stretched strip of the torso photograph. Source prints
and fastenings on the front/back remain in their original photographs.

## Verification

- 60 Node tests: the existing suite plus manifold armholes on knitwear, hoodies
  and open/closed jackets, forearm contact against an independent box surface,
  sleeve-origin/length behaviour, sewn-fin cleanup and wardrobe metadata retention.
- 3 Python tests: crop-frame background rejection while preserving an interior
  graphic; seamless tile edges; rejecting an unknown/transparent fabric sample.
- Source lint: 146 files, no findings. Production build succeeds.
- `family-review.mjs` renders the actual fitting room with its materials and worker,
  and audits displayed triangles against the full posed body. Its outputs are
  private; it records seam gaps, boundary topology and intersections separately
  from the old aggregate QC score. `QA_STRICT=1` exits with a failure when a
case has body intersections, a seam gap, irregular/nonmanifold topology, or an
unexpected opening. It also checks every captured animation frame and rejects
an empty render. Expected openings come from the actual construction, including
open fronts and sleeveless tops.

```sh
QA_OUT=PRIVATE_RESULT_DIR PACK_DIR=PRIVATE_PACK_DIR \
PW_CHROMIUM=CHROMIUM_PATH node tools/lab/family-review.mjs
```

The six default cases use male 176/74, chest/waist/hips 96/78/98 and female
173/56, 82/62/92. The same figures and camera settings are used in the visual
before/after sheet. No image generation or retouching is used.

## Remaining limits

This is a repaired prototype, not a commercial-quality acceptance of every item.
The jacket still uses an approximate body pattern and photographed lapels rather
than a measured tailored pattern, facing and structured lapel pieces. Pleats and
lining remain simplified. Most selected garments have no confirmed complete
measurements or tested fabric mechanics. Swatches improve the material image;
they are not a textile scan. These changes do not recover unseen construction.

Full-arm contact and denser top meshes cost CPU and memory. Cloud software-renderer
timings are not phone benchmarks. Size/pose coverage, animation and layered outfits
need their own acceptance; static renders must not be used as evidence for those.

## Browser results and limits of acceptance

The review covers Glo tee, knit polo, AMI zip hoodie, open blazer, ribbed long
sleeve with pleated skirt, and the marsala dress. The hoodie and blazer were
rechecked after the construction corrections. The measured-width Zolla tee
was also checked on 186/82, 110/82/98 as a regression case.

The dress remains **rejected**: the corrected curved hem is regular, but the
latest independent audit still finds 12 intersecting displayed triangles and
six boundary loops instead of four (extra collar attachment gaps). The old QC
score is 88 despite these defects, demonstrating why it cannot establish visual
acceptance. The remaining collar and puff-sleeve construction require further
work. The folded hoodie also retains visible upper-back artifacts.

The knit-polo settling animation was rendered at frames 10, 25 and 35: no detected
body intersections in these displayed frames. This is one animation case, not
an acceptance of every garment or every frame.

The overall mall browser scenario passed navigation between floors, lift and
escalator, door reachability, cart size selection and fitting-room open/controls/
close, then timed out entering another store after the large map. The complete
mall end-to-end suite therefore has **not** passed. This is recorded separately
from the isolated fitting-room visual and geometry checks.

The original and prepared private photographs are not included in this pull
request. A separate private material patch contains the four reviewed swatches,
two corrected cutout images, their metadata and the pack index.
