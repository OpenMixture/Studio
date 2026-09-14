# M5-02 / M5-03 local acceptance — 2026-09-14

English | [简体中文](./README.zh-CN.md)

**Passed: initial browser execution and isolated packaged consumption.** Thirteen Chromium tests passed with zero failures/skips from clean product commit `d38bf68ddc470a33c608592363e3554f05887fe1`. This later evidence commit is not the tested source. The runtime archive is unchanged: engine `4b914feb9f3365d292b27ea60c5e0b6004f745e8`, version `0.1.0-alpha.0`, SHA-256 `9e245578de160cee1050259ef34358c3fcd3353a21bbb1672d29701bc1ac8084`. The [summary](./summary.json) binds source, lock, fixture, archive and retained attachments.

The isolated run took place on 2026-09-14 at 04:33 UTC, macOS 26.5.1 arm64, Node 24.20.0, npm 11.19.0, Chromium 153.0.8010.12. It used the existing explicit `--enable-unsafe-webgpu` and `--ignore-gpu-blocklist` flags at `/player/`. [Runtime context](./runtime-context.json) records the actual browser, requested policy, limits and redacted `BrowserWebGpu` adapter fields. No hardware identity is inferred from the browser.

| Gate | Retained evidence |
|---|---|
| Package isolation | [Receipt](./isolation.json) and [negative probe](./isolation-probe.txt): original engine and product checkouts were denied by macOS sandbox; cargo/rustc absent from child PATH. Fresh `npm ci`, type/production checks and browser execution all exited zero. |
| Public API/package identity | [Test outcomes](./browser-results.json): exact build info matches vendor provenance; integer projections match declarations; CPU methods require no GPU; package WASM works at non-root base via default URL, explicit URL and bytes. Missing assets remain structured failures. |
| Actual pixels and ownership | Exact 65 × 3 checker bytes, subsequent render and destruction, request capture, busy rejection and visible Player consumption remain covered. |
| Device loss | [Between renders](./loss-between-renders.json) and [during mapping](./loss-during-map.json): real device destruction delivers loss; first readback failure remains `MIX_READBACK_FAILED`; later calls report `MIX_GPU_DEVICE_LOST`; tracked live allocation bytes are zero; retained pixels survive and a newly explicitly created device renders. |
| Failure cleanup | [Mapping validation failure](./map-failure.json): real misaligned mapping rejected; readback unmaps and error scopes balanced; subsequent render and destruction during a rejected render settle; no uncaptured GPU error or unhandled page failure. |
| Repetition | [Eight modules/devices and 32 renders](./repeated-lifecycle.json): per-call tracked live bytes zero, allocated bytes released, one checker pipeline per device, eight explicit destructions, original output retained. |
| Acquisition classification | Unavailable API, null adapter and rejected device acquisition are explicitly injected classification cases, distinct from real GPU execution. |

Reproduce with [the checked-in recipe](../../m5-02-03.md). The complete vendor archive, source tests, compact results and attachments remain in Git; original temporary checkouts, full logs and raw Playwright reports are not promised permanent retention. Reproduction creates a new run. No screenshot is added because product visuals and pixels are unchanged; the [initial preview](../browser-start/README.md) remains historical evidence.

This accepts the bounded M5-02/M5-03 checkpoint on this environment. `GPUDevice.destroy()` is a controlled real-device loss, not spontaneous hardware/driver failure, automatic recovery or tab-termination coverage. Allocation descriptors are not measured physical GPU memory. Three-material 1K regression, wider stress/compatibility, the accepted browser CI matrix and full Player controls/export/scheduling remain M5-04/M5-05. npm publication, website deployment and Studio editing are not included. GitHub integration/check results are recorded separately from this local run.
