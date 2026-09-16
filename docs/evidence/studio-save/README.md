# STUDIO-04 history and save evidence — 2026-09-16

English | [简体中文](./README.zh-CN.md)

## Tested source and result

Clean implementation revision: `72565bd2abbff0c0aed6cef0d406e36b95ab2931`. The following evidence-only commit does not change executable sources. [PR #8](https://github.com/OpenMixture/Studio/pull/8) is stacked on the still-unmerged STUDIO-03 PR #7; local acceptance is not merge or publication. Remote checks are tracked on the exact PR head, separately from this tested source.

The clean archived consumer passed isolation, installation, 20 Node tests, typecheck/build, 52 Chromium cases and normal production deployment. The sandbox denied both original Studio and engine checkouts; `cargo` and `rustc` were absent from PATH. [Isolation receipt](./isolation.json) records commands, source archive, lock and runtime archive identities. No runtime/dependency update occurred.

```bash
npm run check
npm run test:browser
npm run test:deployment
node scripts/verify-isolated.mjs /Users/krapnik/Documents/OpenMixture
```

Environment: Darwin 25.5.0 arm64, Node 24.20.0, npm 11.19.0, Playwright 1.63.0 and Chromium 153.0.8010.12. Flags: `--enable-unsafe-webgpu`, `--ignore-gpu-blocklist`. The runtime reports `BrowserWebGpu` with redacted adapter name/driver; no physical GPU identity is inferred. Initialization context alone is not execution evidence: the suite performs real render/readback, pixel comparisons, device loss and undo during held readback. Tests do not skip unavailable rendering as success.

## Retained artifacts

- [Summary and digests](./summary.json), [all 52 case results](./browser-results.json) and [production receipt](./deployment.json).
- [Checker save](./saved.mix) authors `checker.cellsX` as `4` and adds `rows` targeting `checker.cellsY`. A preview override of `12` was excluded. [Matching sidecar](./saved.mix.layout.json) records positions, viewport and the exact saved-byte digest.
- [Ceramic](./saved-glazed-ceramic.mix), [leather](./saved-leather.mix), [wood](./saved-wood.mix): derived from unchanged repository samples by adding `savedParameter` targeting `tiles.colorA`, `grain.octaves`, and `grain.scale` respectively. Wood first replaces the source token `0.018` with `0.0180000000000000001`; it survives save/reopen unchanged. All other JSON values are compared to source, and reopened downloads are byte-identical to the first saved files. Original sample provenance remains in [samples](../../../public/samples/README.md).
- [Undo freshness](./undo-freshness.json): three actual readbacks (initial, held edited render, restored-source render); export blocked during undo and restored pixels equal the initial pixels.
- [Save workflow screenshot](./studio-save.png) and [production screenshot](./deployment.png) were inspected. The first exercises editing without GPU acquisition; the second shows the saved/reopened 65 × 3 checker after real rendering and explicit disposal.

Recovery cases cover incomplete text, duplicate bindings, atomic node removal/undo, failed material/layout download, failed template creation and import, cancelled new/open, invalid sidecar retention and superseded reads. Pointer drag and parameter typing coalesce into transactions; a Node test checks the 100-command mechanism with a reduced bound. Layout-only undo preserves preview overrides; material edits invalidate sidecar identity even if positions stay unchanged.

## Limits

This accepts STUDIO-04 only in the recorded environment. A successful download start is the saved checkpoint, not verified disk completion. History is session-only. This is not a new native 1K comparison, general browser support, npm release or public deployment. STUDIO-05 qualification of saved files through independent Player and native CLI remains pending; historical M5 and STUDIO-02/03 evidence is unchanged.
