# Clothing recovery work — 20 October 2026

This branch is a new reconstruction from `42aeb8b`, not the previously
reported `fed884b` patch. That local checkout and patch were no longer present
when the workspace resumed. The saved private review and QA assets survive,
but cannot reconstruct the missing source. Do not attribute their 19-garment
results to this branch. No private photographs, recipes or generated garment
assets are included in the public source change.

The recovered work implements constrained material-space panel triangulation,
explicit sewing corners, flat sleeve rest metrics independent of cap placement,
arc-length sleeve samples, bending links and long-range extension limits.
MakeHuman upper garments start around the torso instead of two distant planes.
Extension is projected on the sewn graph without rewriting rest lengths.

Quality checks include diagonal extension and both solver and displayed base
vertices. Sleeve centres use perimeter weighting. Duplicate source hashes and
partial/material-only back views cannot count as complete independent backs.
The existing strict quality policy and its thresholds remain unchanged.

The next recovery step removes forced front/back projection from empty body
gaps. Mixed front/back sewn junctions use a neutral midplane; interpolation
keeps their neighbouring surface directions. A real browser polo comparison
has zero body crossings and zero seam gaps after this change, while remaining
strain failures are retained. This is not full garment acceptance.

Trouser panels now use exact material boundaries and sew only their actual
rise segments. Sparse leg profiles are expanded before modifying the tail.
Collar stands reuse the complete neckline rather than rounding it onto 24
separate samples. MakeHuman collision data includes lower legs and feet, and
bottoms receive displayed triangle contact correction. Pleated-grid surfaces
still need their own audited representation and are not certified by these
changes. Optional QA diagnostics contain private geometry and belong only in
the private output directory.

This remains experimental. Reconstructed physical patterns and material
properties are estimates. Full outfit, animation, size and source-fidelity
acceptance are unresolved. Do not merge or deploy this draft based on unit
tests alone. The first new browser experiment had five body intersections on
polo versus zero on the published base; later candidates require fresh tests.

Validation commands:

```
node --test tools/lab/material-mesh.test.mjs tools/lab/sewn-relax.test.mjs tools/lab/displayed-strain.test.mjs tools/lab/garment-junctions.test.mjs tools/lab/quality-audit.test.mjs tools/lab/quality-gate.test.mjs
node tools/lab/lint.mjs
npm run build
npm run quality:render
```

Run `family-review.mjs` with private `PACK_DIR` and `QA_OUT` paths to inspect
real fitting-room output. Use `QA_STRICT=1` for acceptance. A report-only run
finishing successfully does not mean that the garment passed.
