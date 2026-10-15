# MakeHuman body pilot — stage 10

Status: **opt-in experiment, not accepted as the default clothing body**.
The existing code base and procedural mannequin remain available.

## Asset and licence

The bundled data is derived only from the CC0 graphical assets in
`makehumancommunity/makehuman` at `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`:
the hm08 body mesh, two adult reference shape targets and native skin weights.
No MakeHuman application code, UI, shaders or third-party community assets
are included. The application's AGPL licence does not cover these CC0 assets.

`src/shop/fitting/assets/makehuman/provenance.json` records original paths,
SHA-256 hashes and the derived asset checksum. `LICENSE.CC0.txt` contains the
upstream legal statement. `tools/body/build-makehuman.py` regenerates the
browser data from those downloaded files. The asset has 13,380 vertices and
26,756 triangles. Helpers and joint cubes are excluded from rendering.

## What works

- One indexed surface, including neck, shoulders, hands and feet.
- Adult male/female reference shapes with our own limited measurement adapter.
- Height and three horizontal mesh girths are calibrated to the entered values.
- Native skin weights blend the rest surface into the fitting pose. Arm spread
  follows the same value used to construct sleeves. Feet are on the floor.
- The body modelling origin is aligned to the front/back axis of garment panels.
- Front/back collision columns are rasterized from the actual posed triangles.
  The worker receives numeric fields; render positions/index are not cloned.
- Surface finishing uses that field too, rather than the procedural arm dome.
- MakeHuman data loads only when selected in the main Vite application.
- Unsupported parameter combinations fail explicitly. Input values and garment
  measurements are not expanded or silently clamped to make clothing fit.
- The existing fixed-pose cloth settling animation works; dynamic arm motion
  with this collider is deliberately rejected until the surface can be updated.

The adapter is **not** the full MakeHuman phenotype/target system or a body scan.
Three girths and weight cannot uniquely determine shoulder width, breast shape,
limb circumferences, posture or body composition. The supported ratio bounds
are provisional engineering limits, not a definition of normal human anatomy.

## Remaining acceptance gates

Clothing has visible seam/construction regressions on the new body. A higher
anatomical quality of the mesh does not imply a higher quality of garment fitting.
In the current two-pilot test on the 186 cm, 110/82/98 cm figure, both garments
fail QC. Their dimensions and source photographs have not changed. The trial
must not replace the current default until these failures are resolved.

The column collider is a fixed-pose, approximately 7 mm grid at adult height,
not an exact signed-distance field or triangle continuous collision detector.
Four-neighbour support is conservative. It can combine surfaces in projection,
has limited shoulder exit directions and cannot represent enclosed internal
voids along a column. These limits and the existing shoulder/armhole construction
need investigation before claiming accurate physical fitting.

The stand opens with a bare MakeHuman body in the first panel and legacy bodies
for clothing in the other panels. Selecting MakeHuman under "Модель для всех"
and updating the figure explicitly opts all panels into the trial. "До" uses
the frozen stage-9 engine and the **same stage-9 garment data**. Both models stay
available, and failed QC criteria are shown alongside fitting notes.

## Validation and visual evidence

- Unit tests cover six supported male/female size/height combinations, girths
  within 0.5 cm, finite mesh data, floor/height alignment and long spike edges.
- Tests cover unsupported inputs, rebuilding fields for arm spread, worker
  serialization and collision projection stability.
- The pilot exporter runs the real pattern, solver and final mesh construction;
  geometry/texture QA renders come from those exported meshes.
- `tools/body/render-qa.py` is an offline orthographic renderer, **not a browser
  screenshot**. It does not test WebGL shader wrinkles, normal maps or UI.
- Browser QA and Samsung A54 performance are not verified in this iteration.
  The environment has no supported Sites browser-control skill; the repository's
  general browser check also stops because its Chromium executable is absent.

Private garment evidence is saved in `maxi-wardrobe-private/out/baselines/stage10`.
No original garment photograph or texture was changed by this integration.

## Next iteration

### Repeat verification — 2026-10-15

The saved pilot was recovered and rechecked: all 28 unit tests and the Vite
production build pass. A fresh layered export (`zolla-tee,barrel-jeans`, male,
186 cm, 82 kg, chest/waist/hips 110/82/98 cm, no explicit size override) gives:

| Body | Tee QC | Jeans QC |
| --- | --- | --- |
| Legacy | 88, pass | 86, pass |
| MakeHuman | 61, fail | 100, pass |

This layered run is distinct from the earlier two-pilot test above. It does not
establish that the jeans pass in other layer orders or size configurations.
Both bodies exported 37 finite settling frames per garment, with zero difference
between final recorded solver positions and static positions. Measured mesh
girths on MakeHuman were 109.9763/82.0046/97.9811 cm. These checks do not establish
physical accuracy or browser/device performance. MakeHuman remains opt-in because
of the tee regression. The existing pilot commit is `0bddd01`.

GitHub publication was blocked by automatic approval review; no successful push
or new pull request is claimed by this verification.

1. Fix full-surface collision projection, especially the shoulder/axilla region,
   and separate field approximation errors from garment pattern errors.
2. Reconcile shoulder slope, armhole and sleeve cap using the same posed body;
   preserve measured widths and distinguish wrong sizes from numerical defects.
3. Re-run the same explicit sizes on both bodies, including the layered outfit
   and every settling frame. Inspect front/side/back and obtain browser/device
   performance evidence before promoting the body to the default.
