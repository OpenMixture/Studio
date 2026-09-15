# M5-05 product verification — 2026-09-15

English | [简体中文](./README.zh-CN.md)

The clean product source `56c510ab57daa1b68ef660525a648a582730a37e` passed isolated installation/check (nine Node tests), [28 browser checks](./browser-results.json), the [normal production deployment](./deployment.json) and [material/lifecycle execution](./materials.json). [Isolation](./isolation.json) denies both original checkouts and removes Rust from PATH; the detached native manifest is copied outside them. [Summary](./summary.json) binds retained bytes. Later evidence commits are not the tested code.

The 1K run covers 11 material cases and four further lifecycle cycles over three default materials (12 renders), retaining one 4 MiB channel per cycle through later renders and device destruction. Reported live descriptor bytes are zero; pipeline entries remain at most nine. Browser material PNG comparison and final tolerance acceptance belong to the engine's M5-05 record, not this execution-only receipt.

The agent inspected the normal production screenshot below. The test-only harness returns 404 in that deployment; actual WASM loads with the correct MIME and the checker PNG downloads after real WebGPU execution. This is local static deployment, not public hosting. Runtime archive and engine pixel semantics remain unchanged.

![Production deployment](./deployment.png)

[Product CI](https://github.com/OpenMixture/Studio/actions/runs/34941131954) passed the type/build job and the real Chromium WebGPU contract/deployment job on Ubuntu 24.04 using the pinned Playwright Chromium and explicit SwiftShader flags. Exact local Chromium/OS/flags are in the receipts. Neither this environment nor descriptor counts certify broad hardware compatibility or physical VRAM reclamation. The CI's full logs expire; selected local content is retained in Git. Reproduce with the [qualification guide](../../browser-qualification.md). Registry publication, public hosting and Studio editing remain separate.
