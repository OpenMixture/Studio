# GitHub Pages npm Alpha deployment — 2026-09-20

English | [简体中文](./README.zh-CN.md)

**The accepted npm runtime is now deployed.** [Studio](https://openmixture.github.io/Studio/studio.html), [Player](https://openmixture.github.io/Studio/) and the [task card](https://openmixture.github.io/Studio/trial.html) retain their URLs. This replaces the historical-runtime deployment recorded in [P2](../alpha-p2/README.md). Human trial outcomes remain pending.

## Identity and integration

- Product: `c0b0e104f520f946a7e7fa3c02f1de8674c9adc6`, merged through [PR #18](https://github.com/OpenMixture/Studio/pull/18). Required [PR checks](https://github.com/OpenMixture/Studio/actions/runs/35498895159) and [main checks](https://github.com/OpenMixture/Studio/actions/runs/35499025888) passed.
- [Deployment run 35499173820](https://github.com/OpenMixture/Studio/actions/runs/35499173820) passed. Build time: `2026-09-20T08:18:39.534Z`. [deployment.json](./deployment.json) retains all 15 asset hashes, product/lock identity, actual runtime build and registry version/URL/integrity. The live [trial.json](https://openmixture.github.io/Studio/trial.json) identifies the deployed snapshot; documentation-only follow-ups do not redeploy it.
- Exact npm `@openmixture/runtime@0.1.0-alpha.0`, engine `82b74707b2a8a998190e2f28b16f91fb9614486a`, build ID `sha256:94f9cc455fcd5f805942b0196b39a276782ce0e504772c3a140ea8ad85814a28`, archive SHA-256 `a9bcfe8d849f9fb9982a750dd99d026807fdf6453b5be491deeda90e99a2c6ae`.

The deployment guard verifies the exact npm dependency and lock source/integrity, all 12 installed package file hashes against [registry acceptance](../npm-alpha/README.md), actual public `getBuildInfo()` and the emitted WASM hash. A local negative probe confirmed modified built WASM is rejected; the original bytes were restored afterward. The vendor archive is an identity fixture, not an installation fallback.

## Validation and limits

Clean `npm ci`, `npm run check` (types, 20 tests, production build), `npm run build:trial` and the `/Studio/` production deployment workflow passed. Required CI passed 52 browser tests and production deployment checks; the publishing workflow repeated the exact hosting-prefix check before upload. Runtime dependencies, renderer, material saving and fixtures did not change in this deployment. The completed seven-case/28-channel Windows and isolated Linux [registry acceptance](../npm-alpha/README.md) is retained, not relabelled as a newly executed native matrix.

[ordinary-hosted.json](./ordinary-hosted.json) records the successful live session ending `2026-09-20T08:20:16.801Z`: clean checkout of the deployed commit; Windows 11 build 26100; ordinary Chrome 153.0.8010.48. Browser/process launch lines contain only profile/CDP/about:blank arguments, with no GPU overrides. The full adapter and driver details remain in the receipt. All 15 hosted asset digests and product/runtime identity matched.

New/edit/invalid-draft repair/undo/redo/disconnect/reconnect, exact 128 × 128 checker pixels, four PNG encodings, unchanged-source preservation, save/reopen, independent Player channel equality and explicit GPU disposal passed without page errors. A separate injected GPU-unavailable probe retained CPU editing and saving; it is not a naturally unsupported host or a successful render.

Reproduce from the deployed commit by setting `MIXTURE_ORDINARY_URL=https://openmixture.github.io/Studio/` and running:

```bash
node scripts/verify-ordinary.mjs chrome /absolute/new-output
```

This is a prerelease trial within the recorded environments, not broad browser support or human usability acceptance. There are still **0 recorded external participants and 0 human feedback results**. Recruitment and collection remain with the user under the [trial protocol](../../external-trial.md).
