# Studio basic editing verification — 2026-09-16

English | [简体中文](./README.zh-CN.md)

**Local isolated acceptance passed** for clean source `01326af3dbdb71536130182671b4a9db2001ce78`: installation, public types/build, 18 Node tests, 44 real Chromium cases and normal production deployment. [Isolation](./isolation.json) denies both original checkouts and removes Rust from PATH. Later evidence-only commits are not the tested implementation. [Summary](./summary.json) binds source/package/lock identities and retained files.

The unchanged `@openmixture/runtime@0.1.0-alpha.0` ran on macOS Darwin 25.5.0 arm64, Node 24.20.0, npm 11.19.0, Playwright 1.63.0 and Chromium 153.0.8010.12, with `--enable-unsafe-webgpu` and `--ignore-gpu-blocklist`. Runtime contexts in the measurements report BrowserWebGpu; adapter name/driver are redacted, and no hardware identity is inferred.

## Results

- [44 browser cases](./browser-results.json) passed. Nine new editing cases cover delete/rebuild/connect/disconnect, atomic binding cleanup, integer/float/enum/color editing, incomplete field preservation, Rust cycle/type diagnostics and repair, discard/replacement/new-template behavior, real device loss and material previews. CPU tests additionally use the actual packaged Rust validator for missing endpoints, duplicate identities, invalid values and raw-input rejection.
- [Freshness](./authored-freshness.json) records four real GPU mappings: the intermediate pending edit was dropped, and an incomplete draft prevented the older in-flight render from replacing the latest image or enabling PNG export. The test delays a real mapping promise; it does not fabricate pixels or claim GPU cancellation.
- [Ceramic](./glazed-ceramic-editing.json), [leather](./leather-editing.json) and [wood](./wood-editing.json) each have four matching independent-runtime/canvas/decoded-PNG pixel digests at 128 × 128. Exact generated [ceramic](./glazed-ceramic-edited.mix), [leather](./leather-edited.mix) and [wood](./wood-edited.mix) bytes are retained. These are test-created derivatives of the product samples, not new native goldens or STUDIO-05 cross-consumer acceptance.
- [Normal deployment](./deployment.json) verifies both static production entries, real WASM MIME, absent test harness, edited checker output and unchanged original download. This is local static deployment, not public hosting.
- The agent inspected the retained wood editor screenshot. Original-file downloads remain byte-identical after edits. Edited material download, undo/redo, binding authoring and new native 1K comparisons are not part of this slice.

![Wood authored parameter and preview](./wood-editing.png)

The [editing guide](../../studio-editing.md) documents the source transport contract, session-only drafts, layout restrictions and reproduction commands. Ordinary logs/full traces remain temporary. Remote PR/CI checks and integration are reported separately against the final commit; this record establishes local isolated acceptance only.
