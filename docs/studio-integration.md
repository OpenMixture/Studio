# Studio MVP integration

English | [简体中文](./studio-integration.zh-CN.md)

## Merged batches — 2026-09-16

STUDIO-01 through STUDIO-05 are integrated into the product main branch. Studio PRs merged in dependency order: #6 (foundation/read-only graph), #7 (basic editing), #8 (history/bindings/save), then #9 (saved-file qualification). Each dependent PR was retargeted to main after its predecessor merged. Merge commits preserve the original reviewed and measured source identities.

| PR | Head | Merge | CI |
|---|---|---|---|
| [Studio #6](https://github.com/OpenMixture/Studio/pull/6) | `986a0e99e9c4ed67c8bcca8fc12e04e03ee1675f` | `b7e0ec19202aaac5aee09a7268e731389b98f0f6` | [35053091886](https://github.com/OpenMixture/Studio/actions/runs/35053091886) |
| [Studio #7](https://github.com/OpenMixture/Studio/pull/7) | `8977dff9726bbeff6b713a476ed7b1fec26d0167` | `e7fa79d12c10e629af15ad84b2367a18e1c00823` | [35054712064](https://github.com/OpenMixture/Studio/actions/runs/35054712064) |
| [Studio #8](https://github.com/OpenMixture/Studio/pull/8) | `59ab2dfd7954a26de2baf09e482bb23165112dce` | `48ef619afc7aa4a2a9f41e3e4f09d274cca63bdf` | [35058441595](https://github.com/OpenMixture/Studio/actions/runs/35058441595) |
| [Studio #9](https://github.com/OpenMixture/Studio/pull/9) | `b48f06c6b7bd7eac87029fd90e0c8019105e1fe2` | `e6adb7b0e28e8ae1080088a95c15cb0cf5707cab` | [35077365903](https://github.com/OpenMixture/Studio/actions/runs/35077365903) |

All listed PR-head product checks passed before merging. Each resulting main file tree equals that batch's reviewed head tree; no conflict resolution changed the implementation. Intermediate push checks may be cancelled by the repository concurrency policy; they are not counted as successful runs. The final implementation main check is [35079191767](https://github.com/OpenMixture/Studio/actions/runs/35079191767), bound to `e6adb7b0e28e8ae1080088a95c15cb0cf5707cab`. Later documentation commits have their own checks.

[Engine PR #9](https://github.com/OpenMixture/OpenMixture/pull/9) merged before product #9: head `036d6be42491f5430bd4e7a80b40ec7fcc17bd27`, merge `c41fcfbd47915669859a09cfd4adbe6c76b7df4a`. Its main file tree also matches the reviewed head. Live branch rules required Linux/macOS/Windows checks and pinned SwiftShader material/package checks; all passed before merging without bypass. Runtime-package and browser-material checks also passed. Product main had no active branch rules; its two existing checks were nevertheless verified before each merge.

Engine integration check entries: [three-platform checks](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039568), [GPU regression](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039571), [browser package](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039647), [browser materials](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039662). These runs are bound to the engine merge above; consult their recorded conclusions separately from pre-merge checks.

## Review and acceptance boundary

Review covered exact input-byte admission before projection, numeric-token transport, Rust-owned validation, graph/layout separation, bounded history and render scheduling, invalid/late-result suppression, save/open failure recovery, and detached native/Player provenance and frozen gates. No blocking implementation finding remained. The stale README statement that history, bindings and authored saving were future work is corrected in both languages.

The [saved-file evidence](./evidence/studio-qualification/README.md) remains tied to its original executable revisions: seven 1K cases and 28 channels pass, 26 byte-exact and two wood roughness channels within pre-frozen tolerances. The new Studio saved-file matrix is macOS-only; multi-platform regression CI does not expand that acceptance. Historical evidence is preserved. Registry publication, public hosting, broader qualification and M6 remain separate decisions.
