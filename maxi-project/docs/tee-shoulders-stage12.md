# Tee shoulders — stage 12

The stage-11 image was visually unacceptable despite passing aggregate QC.
This correction targets the crumpled shoulder/cap shape on the MakeHuman tee.
It does not promote MakeHuman to the default or establish accurate fabric physics.

## Diagnosis and implementation

1. Stage snapshots showed collapsed sleeves already in solver output, before
   shoulder rounding and sleeve finishing. Finishing alone could not fix this.
2. Axis-only collision exits from front/back columns created incompatible contact
   directions on the curved shoulder. Upper-body contact now uses a numeric BVH
   of the actual posed body triangles above 0.60H, queried above 0.63H. Closest
   face contact uses oriented face signs; ambiguous edge/vertex contact uses ray
   parity. Repeated projection resolves nearby concave features. Lower-body
   collision retains the prior column implementation.
3. A fixed twenty-sample sleeve ring rounded several armhole vertices onto the
   same sample. MakeHuman tee caps now match the actual triangulated front/back
   boundary one to one, including diagonal staircase vertices at the axilla.
   Cap angular sampling and sleeve UV interpolation follow that correspondence.
4. The front of a sleeve could move behind the arm during sewing. The tee now
   uses the solver's existing sector constraints to retain front/back orientation.
   Displayed tee contact also carries those orientation labels into triangle
   shell queries around the upper arm. This is a stabilization constraint, not
   a general-purpose continuous cloth collision algorithm.
5. Safe vertices still allowed stretched triangles to cross an arm. Tee rendering
   adds one extra surface subdivision, then projects those samples too. Playback
   updates every added sample with the same interpolation. They are render samples,
   not extra physical degrees of freedom. Source photographs and garment dimensions
   were not enlarged. Rest links are regenerated for the corrected cap topology.

`CLOTH_VER` is `c61-mh-shoulder-surface`. The new collider is included explicitly
in the generated worker code and its numeric data survives structured cloning.
The test exporter can save a static `POINT_STAGE=solver|round|cap|relax|seams`
snapshot for diagnosis; that mode is intentionally incompatible with animation.

## Verification

38 tests and the production build pass, including worker serialization, sloped
and curved contact, front/back shell orientation, one-to-one cap topology, actual
panel-edge adjacency, and updating refined surface samples during playback.

Captured garment size and photos are unchanged. The layered male figure uses
jeans first, then tee, as in the application.

| Figure | Tee QC | Jeans QC | Settling frames |
| --- | --- | --- | --- |
| Male 186 cm / 82 kg / 110-82-98 cm | 100, all current criteria pass | 100 | 37 per item |
| Female 173 cm / 56 kg / 82-62-92 cm | 100, all current criteria pass | Not tested this iteration | 37 |

All 111 recorded solver frames are finite, recorded seam-pair gaps after finishing
are zero, and final/static solver positions match exactly. On the male tee, 2.6%
of structural links exceed 25% extension, 0.4% of vertices are flagged by the body
check, and the silhouette difference is 9%. Passing the current thresholds does
not mean these quantities are zero or that fit is physically accurate.

Front, side and back offline geometry/texture renders were inspected. The broad
crumpling at the shoulders is substantially reduced and the sleeves have a more
continuous shape. A small notch/pinhole remains near the right front armhole;
the neckline and fine finishing also need work. Those remain open even at QC 100.

## Limits and next gate

- The two reference figures do not establish quality for every body or garment.
  Other construction families have not received the matched-cap topology.
- This is fixed-pose contact, without cloth self-collision or continuous collision
  detection. Fabric presets and unmeasured garment dimensions remain estimates.
- The male exported scene contains 50,524 vertices / 97,940 triangles including
  body, jeans, tee and edge geometry. Exact contact and extra surface samples cost
  more than stage 11. CPU-only diagnostic exports including recorded frame finishing
  took about 59.5 s for the male outfit and 39.5 s for the female tee under parallel
  load. These are not browser or device benchmarks. Performance optimization and
  a Samsung A54 measurement are required before considering default adoption.
- Browser shaders, live UI, actual playback and phone performance remain unverified
  because the available Chromium launcher previously crashed. Offline renders are
  not screenshots of the live stand; the live stand is unchanged.

The next acceptance work is the remaining armhole surface defect, independent
surface intersection checks across playback, and browser/device performance.
