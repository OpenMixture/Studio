# OpenMixture Studio

English | [简体中文](./README.zh-CN.md)

An independent product repository for OpenMixture. The **Player** opens `.mix` source, builds public parameter controls from Rust metadata, explicitly initializes WebGPU, and previews requested material channels. Studio graph authoring comes later.

The engine and `@openmixture/runtime` are built in [OpenMixture/OpenMixture](https://github.com/OpenMixture/OpenMixture). This repository consumes the real packaged runtime from `vendor/`; it does not compile Rust or import producer source. The package is an unpublished local Alpha archive, not an npm registry release.

## Run

Use **Node 24.20.0** and **npm 11.19.0**. `.nvmrc`, `packageManager`, exact dependency versions and `package-lock.json` record the consumer toolchain: TypeScript 5.9.3, Vite 8.3.0 and Playwright 1.63.0.

```bash
npm ci
npm run dev
```

Open the local `/player/` URL printed by Vite. Choose checker, glazed ceramic, leather, wood or a `.mix` file; select dimensions, click **Initialize WebGPU**, then **Render**. Parameter and channel changes then preview automatically; **Reset parameters** restores source/default values. **Dispose GPU** releases the renderer while retaining the displayed preview. Validation loads WASM but does not acquire a GPU. File bytes are passed directly to Rust; the source display is never parsed and reserialized for rendering.

A secure browser context with working WebGPU is required for rendering. The page reports initialization/render failures; there is no alternate pixel executor. Module import itself does not fetch WASM or request a GPU. Explicit disposal is the tested lifecycle path; page termination cannot wait for asynchronous cleanup.

## Production and checks

```bash
npm run check
npm run preview
```

Open [http://127.0.0.1:4173/player/](http://127.0.0.1:4173/player/). Production assets are intentionally built for the non-root `/player/` base, including package-relative WASM. A static host must serve the `dist/` contents at that base with JavaScript and `application/wasm` MIME types. `vite preview` is a local verification server, not the production hosting service. No hosting deployment is performed by this repository bootstrap.

The `Product checks` workflow runs a clean npm install, public type checks, six scheduler/request-snapshot tests and the production build. It does **not** certify browser GPU execution.

For actual browser verification:

```bash
npx playwright install chromium
npm run test:browser
```

The test command builds a production bundle with an additional isolated contract page and serves it at `/player/`. That harness is excluded from the normal production build. Tests use Playwright's pinned full Chromium (`channel: chromium`), `--enable-unsafe-webgpu` and `--ignore-gpu-blocklist`. Use `npm run test:browser:headed` for visible execution. Additional environment-specific flags can be supplied as a JSON string array in `MIXTURE_BROWSER_ARGS`; record them with any result. Unavailable WebGPU, failed acquisition and missing browser binaries fail the run; they are never skipped as a successful render.

The suite checks:

- Import without loading side effects; CPU-only catalog, validation and inspection with GPU access prohibited; raw duplicate keys, numeric tokens, invalid UTF-8 and invalid requests.
- Real packaged WASM loading under `/player/`, explicit URL and byte loading, and structured missing-asset errors.
- Real checker pixels at 65 × 3, tightly packed readback, retained owned output after later renders/destruction, busy rejection and in-flight disposal.
- User-file input, visible validation failures, actual canvas pixels and retained preview after disposal.

Reports, browser context/build evidence and failure traces go to ignored `test-results/`. A test command being present does not imply it has passed on a particular environment. Retain the exact browser/OS/adapter/build record when publishing results. Wider browser compatibility, device-loss coverage and full M5 acceptance remain separate engine/product gates.

The [2026-09-12 browser checkpoint](./docs/evidence/browser-start/README.md) records six passing real-browser tests, the clean producer/consumer revisions, archive digest and actual context.

## Runtime archive and fixture

See [vendor/README.md](./vendor/README.md) for the artifact boundary and update procedure. The committed archive plus lockfile allows installation from this product checkout without the engine checkout or Rust. The public package is the only engine import in product and test code.

The [checker fixture](./public/samples/checker.mix) is copied unchanged from the engine example; [source and digest](./public/samples/README.md) are recorded alongside it. It remains ordinary `.mix` input rather than a TypeScript implementation of a node. Tests use exact black/white checker sentinels.

## Current boundary

The [M5-04 parameter/preview slice](./docs/player-parameters.md) adds metadata-driven controls, channel selection, explicit stale previews and one active render plus one replaceable latest pending request. Edits remain usable while rendering. PNG export, full M5-04 workflow acceptance, M5-05 material/CI qualification, registry publication and Studio editing remain open.

Contributors should follow the paired [agent guide](./AGENTS.md) and the engine's [M5 plan](https://github.com/OpenMixture/OpenMixture/blob/main/M5_PRS.md). Keep product behavior and consumer documentation together; keep render semantics in Rust.

The extended lifecycle and isolated-consumer recipe is documented in [M5-02/M5-03 verification](./docs/m5-02-03.md).

[2026-09-14 M5-02/M5-03 local acceptance](./docs/evidence/m5-02-03/README.md) records 13 passing Chromium checks, controlled real-device loss, cleanup and an isolated package consumer. M5-04/M5-05 remain open.
