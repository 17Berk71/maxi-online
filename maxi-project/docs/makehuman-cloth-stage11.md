# MakeHuman clothing correction — stage 11

The MakeHuman body remains opt-in. This iteration fixes reproducible collision,
seam and shading defects; it does not establish physically accurate fitting.

## Causes and changes

- The column collider could move a torso side-seam vertex only forward/back.
  Front and back copies escaped to opposite depth surfaces and split the seam.
  Lateral escape is now available throughout the body. Upward escape remains
  restricted to the shoulder; these are approximate axis projections, not SDF.
- A sleeve/body junction used different arm exclusions on its two copies. The
  final seam component receives one collision decision, using the full surface
  when any member belongs to a sleeve. Rendered sewn edges use that same full
  surface. Pattern edge rest lengths and input garment measurements are unchanged.
- Pairwise normal summation double-counted multi-way seam vertices and depended
  on seam order. Normal sums and AO now share connected seam components once.
- Collision correction moved displayed triangles after their normals were set.
  Their lighting normals are rebuilt from the corrected surface in static output
  and playback, with seam normals reconciled across panels.
- Pre-corrected photographs bypassed background-colour padding. Their transparent
  background could become dark edge RGB in the opaque cloth material. A separate
  multi-source grid fill now extends nearby opaque colour only into transparent
  background. Every opaque source pixel, including prints, is preserved exactly.
  Original image files and UV coordinates are unchanged. This is edge padding,
  not a reconstruction of missing garment details or a material calibration.
- The offline exporter used requested item order instead of the application's
  bottom/dress/top/outer ordering. It now uses the same classification and records
  both requested and actual order. Previous exports with tee before jeans are
  not representative of the application's layered outfit.

## Repeatable comparison

Same MakeHuman figure: male, 186 cm, 82 kg, chest/waist/hips 110/82/98 cm.
Same source packs and captured measurements, no size override; jeans first,
then tee. Before is local commit `d2a3547`; no acceptance threshold was changed.

| Check | Before | After |
| --- | --- | --- |
| Tee total QC | 66, fail | 80, pass |
| Jeans total QC | 63, fail | 100, pass |
| Tee seam pairs separated over 1 cm | 8.2% | 0% |
| Jeans seam pairs separated over 1 cm | 14.9% | 0% |

The tee still fails individual checks: 3.2% of structural links exceed 25%
extension, and 2.4% of vertices fail the full-body collision check. This last
check includes arms even where torso simulation excludes them. Visible shoulder
and axilla defects remain, and this metric is not an independent penetration
oracle because it uses the same approximate collider. A passing total QC does
not close these issues.

## Broader checks

The same captured garments are deliberately kept at the same size throughout:

| Figure, height / weight / chest-waist-hips | Tee QC | Jeans QC |
| --- | --- | --- |
| Male, 186 / 82 / 110-82-98 | 80, pass | 100, pass |
| Female, 173 / 56 / 82-62-92 | 85, pass | 100, pass |
| Male, 150 / 48 / 78-65-82 | 85, pass | 100, pass |
| Male, 205 / 130 / 140-120-130 | 23, fail | 69, fail |

The large figure is not an accepted fit. These small captured garments were
not enlarged to obtain a passing score. Even on the female reference, the tee
has 5.1% flagged vertices despite a passing total QC.

All four figures export 37 finite settling frames per garment: 296 frames total,
zero recorded seam-pair gaps after finishing, and zero final/static difference.
Those checks do not prove realistic motion or absence of surface intersections
between vertices. 33 tests and the Vite production build pass.

Browser baseline was attempted with the available Chromium and SwiftShader; the
browser process crashed with SIGSEGV at launch. No browser rendering, WebGL cloth
shader, whole-mall regression or Samsung A54 performance pass is claimed.
Offline renders only show geometry and source RGB, not the new browser texture
padding, AO shader, or physically calibrated fabric. The live stand is unchanged.

## Remaining work

1. Resolve shoulder/axilla surface projection and sleeve-cap construction; inspect
   geometry and texture independently instead of relying on aggregate QC.
2. Obtain working browser/device evidence for the lighting and padded texture
   path, including a loaded worker and actual animation playback.
3. Extend to the remaining construction families. Fabric properties and unknown
   garment measurements stay estimates until independently supplied or measured.
