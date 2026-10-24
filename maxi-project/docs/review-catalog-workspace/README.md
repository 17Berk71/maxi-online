# Local catalogue revision review

Real Chromium screenshots of the generated local catalogue, using synthetic fixture imagery only. No private clothing photos or real partner claims appear here.

| Browser viewport | Before withdrawal | After withdrawal | After rollback |
|---|---|---|---|
| 390 × 844 | [Before](before-withdrawal-390.png) | [Withdrawn](after-withdrawal-390.png) | [Restored](after-rollback-390.png) |
| 1280 × 844 | [Before](before-withdrawal-1280.png) | [Withdrawn](after-withdrawal-1280.png) | [Restored](after-rollback-1280.png) |

Reproduce with Vite running: `MAXI_SCREENSHOTS=1 node tools/test/catalog-workspace.browser.mjs`. Set `CHROME_PATH` if needed. Tests create and remove temporary directories; no project public feed is replaced.

The screenshots show actual changes of a catalogue revision through the new local CLI functions, not visual mockups. The browser checks also assert that image URLs refer to the immutable release and load successfully. A separate `catalog-visibility.browser.mjs` test verifies hidden and all-withdrawn imports in the actual 3D store scene and quick catalogue at both widths.

41 Node tests, 2 Python pricing tests, build and relevant browser checks passed locally. Full device performance, real catalogues and content permissions remain outside these fixtures. [Operator workflow](../catalog-workspace.md).
