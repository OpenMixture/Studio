# Player parameters and channel preview — M5-04 first slice

English | [简体中文](./player-parameters.zh-CN.md)

The Player opens standard `.mix` files and the included checker, glazed ceramic, leather and wood samples. It builds controls from the installed Rust runtime's validated `exposedParameters` metadata: integer/float bounds, exact enum choices, and four numeric RGBA components for colors. Source defaults and effective values come from the runtime. Invalid source never displays the previous material's bindings. User file bytes remain unchanged.

## Use

1. Choose a material sample or open a `.mix` file. WASM loads for metadata and validation; no GPU is acquired by those operations.
2. Choose dimensions, then click **Initialize WebGPU** and **Render**.
3. Edit a public parameter or select a **Preview channel**. Valid changes render automatically while the GPU is initialized. **Reset parameters** removes all overrides and restores source/default values.
4. The effective-value label confirms the last validated requested value. While rendering, the previous image is visibly marked stale; only the latest successful request clears that mark.
5. **Dispose GPU** discards queued work, waits for active work or an outstanding acquisition to settle, and releases the device. The existing preview remains available. A new device requires explicit initialization.

Channel choices come from Rust material metadata, including documented defaults. The canvas displays a copy of returned RGBA8 bytes. Color has already received the engine's sRGB transfer; scalar and normal bytes are shown directly as a data preview. The Player does not apply another transfer or normalize normals. Canvas display is not PNG export or proof of lossless handling of every alpha value.

## Request ownership

`src/latest.ts` owns one active render and at most one replaceable pending job. Jobs capture source bytes, dimensions, channels and nested override values. Rapid edits replace the pending job; they do not cancel accepted GPU work. Stale successes/errors and duplicate promise completions cannot update the current UI. An invalid edit clears pending work and makes any active result stale. A latest failure preserves the previous image with a stale label and structured diagnostics.

Source reads and GPU acquisitions have independent generations. A slow old file cannot replace a newer source. Shutdown invalidates render delivery immediately, waits for late acquisition cleanup, and cannot publish a GPU that arrived after disposal. Browser termination itself cannot await asynchronous work; synthetic `pagehide` tests exercise delivered lifecycle events, not guaranteed bfcache admission.

The other product modules are `runtime-client.ts` (explicit load and immutable request capture), `controls.ts` (metadata-driven DOM), `files.ts` (raw bytes), and `preview.ts` (display copies). They do not implement a node catalog, graph validator, compiler or pixel renderer. The runtime tarball remains unchanged and unpublished.

## Verification

```bash
npm run check
npm run test:browser
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture
```

`check` includes 12 Node scheduler/snapshot/PNG/source-transport/layout tests, public TypeScript checking and production build. The browser suite includes real 128 × 128 parameter changes and baseColor/normal/roughness/height previews for all three materials, compared against independently invoked public runtime results in the same browser. It also covers color/enum controls, invalid overrides/source, queued latest requests, retained stale previews after actual device loss, late file reads, acquisition-time pagehide, and a 390-pixel layout. Test-only map-promise barriers control completion timing while keeping real GPU operations/pixels.

The macOS isolation recipe requires a clean committed product tree and denies reads of both original checkouts; see [M5-02/M5-03 verification](./m5-02-03.md). Retain exact source/package identity and inspected screenshots with the accepted run. These consumer pixel checks do not replace M5-05 native/browser quality comparisons or frozen 1K tolerances.

## Remaining scope

The [PNG export workflow](./player-export.md) extends this parameter/preview slice to complete M5-04 product implementation. M5-05 quality/stress/CI acceptance is recorded in [browser qualification](./browser-qualification.md). Publishing and engine M6 remain separate decisions; Studio editing follows the [MVP plan](./studio-mvp.md).
