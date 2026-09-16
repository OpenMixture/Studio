# Browser qualification — M5-05

English | [简体中文](./browser-qualification.zh-CN.md)

**Recorded acceptance — 2026-09-15:** M5-05 passed within the macOS/Linux Chromium matrix. [Product evidence](./evidence/m5-05/README.md) records execution/isolation/deployment; [engine acceptance](https://github.com/OpenMixture/OpenMixture/blob/c03c7b4/docs/evidence/m5-05/README.md) records frozen 1K comparisons, CI identities and remaining limits. These are source-bound historical results, not a fresh CI run. Registry publication and public hosting remain separate. The next product work follows the [Studio MVP plan](./studio-mvp.md).

The product consumes a separately prepared native reference bundle, never an engine checkout. The engine owns preparation and quality comparison; the product owns installed-runtime browser execution. Source bytes, variants and plan hashes travel in the manifest. `test:materials` requires a fresh output directory and verifies the runtime producer revision, source digests and plan hashes before retaining PNGs. It runs all 11 existing cases at 1024 × 1024 and four further create/render/dispose cycles over the three default materials (12 renders). Each cycle retains one 4 MiB channel through later renders and disposal; descriptor live bytes must be zero and pipeline entries at most nine. This does not measure physical GPU memory.

```bash
npm run test:materials -- /absolute/native-reference /absolute/new-browser-output
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture /absolute/native-reference
```

Prepare the reference and compare the returned PNGs using the engine's documented browser material commands. The optional second isolation argument copies the reference bundle outside both denied checkouts before browser execution. A supplied reference is test data, not an engine dependency. The receipt records its manifest digest.

Both browser suites serve built `dist/` files through `scripts/static-server.mjs` under `/player/`, with explicit WASM MIME. The test-only contract page is absent from the normal production build. This is a local static deployment check, not a public website release. Missing resources or unavailable WebGPU fail. The CI job pins Ubuntu 24.04, Node/npm, Playwright and its Chromium revision, selecting Chromium's bundled SwiftShader with `--use-angle=swiftshader` and `--use-webgpu-adapter=swiftshader`, in addition to the existing unsafe-WebGPU/blocklist flags. The exact selected adapter information is retained when the browser exposes it; software selection is explicit, not a semantic fallback.

The browser CI job does not make unrun material comparisons pass. Calibration and frozen tolerance acceptance are separate engine steps. The linked acceptance record satisfies the CI and isolated comparison gates within its tested matrix; new runtime versions or environments require their own evidence. No registry publication, public hosting or Studio editing is included.

`npm run test:deployment` additionally builds the normal production entry without the test harness and verifies real rendering/download, WASM MIME and a 404 for the absent harness under static deployment. It is included in isolated acceptance and browser CI.
