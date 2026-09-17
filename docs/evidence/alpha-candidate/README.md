# Runtime candidate qualification — blocked, 2026-09-17

English | [简体中文](./README.zh-CN.md)

**The candidate is not accepted.** Studio workflow and contract checks pass, but the required seven-case native pixel comparison fails. [Upgrade PR #12](https://github.com/OpenMixture/Studio/pull/12) stays draft; main retains the previously qualified vendor archive. No tolerance, golden, material source or rendered pixel is changed to obtain a pass. This measurement does not establish whether the candidate introduced the discrepancy.

## Bound identities and passing checks

- Product capture, ordinary workflow and controlled saved-file execution: `a7e2ba8b20bd72748488883aa30a50414b4578c4` on the upgrade branch; authoring and Player revisions are recorded separately in the receipts.
- Clean runtime/native producer: `7b1cec4ad1d42d6269ef6a9912c2e8ba3a2dfdd9`; build ID `sha256:3a038bcb699327652e56ee3797dbfdc4cbe507125101e06ae3584f41fdebd014`; archive SHA-256 `88f22ac295c3a1cc6bee2e995ed1e4683ca6669026167e4731ee10564f30d48c`. The unpublished package version remains `0.1.0-alpha.0`.
- [Producer receipt](./producer-candidate.json) comes from [engine CI 35112153338](https://github.com/OpenMixture/OpenMixture/actions/runs/35112153338), artifact `chromium-material-matrix`. The candidate's installed metadata, lock integrity and actual browser `getBuildInfo()` match. This closes the old-package ambiguity for this attempt.
- Clean `npm ci`, `npm run check` (20 tests, types, production build), [52 controlled browser tests](./browser-summary.json) and [normal production deployment](./deployment.json) passed using Node 24.20.0/npm 11.19.0. Controlled Windows Chromium is 153.0.8010.12, with `--enable-unsafe-webgpu` and `--ignore-gpu-blocklist`, plus Playwright defaults.
- [Ordinary Chrome 153.0.8010.48 receipt](./ordinary.json) passes the full Studio → saved `.mix` → independent Player workflow on Windows 11 build 26100. Launch arguments are only profile/CDP/blank-page transport. It checks 128 × 128 authored checker pixels and four PNG encodings, history, repair, saving/reopening and disposal. The separate injected unavailable-GPU probe passes; it is not natural unsupported-host evidence. This workflow result does not override the 1K quality failure below.

## Frozen seven-case comparison

Actual UI [downloads](./authored.json) were consumed unchanged by the engine's independent native preparation and the Player. The [native manifest](./native-manifest.json), [Player receipt](./player-windows.json) and [complete comparison](./comparison-windows.json) bind source digests, plans, requests and output digests. Native preparation ran in a separate clean engine worktree at the candidate revision, using DX12/NVIDIA GeForce GT 1030, driver 32.0.15.8266. Product npm installation and acceptance never import or compile engine source.

All seven all-channel plans and all 28 channel plans/structure checks pass; **21/28 pixel comparisons pass, 12 byte-exact**. The following seven channels fail frozen thresholds, each with maximum absolute difference 1:

| Case | Channel | Changed pixels / 1,048,576 | Allowed changed ratio |
|---|---|---:|---:|
| leather / default | normal | 21 | 0.00002 |
| leather / authored | normal | 28 | 0.00002 |
| wood / default | baseColor | 740 | 0.00001 |
| wood / default | height | 18 | 0.00001 |
| wood / default | normal | 30 | 0.00002 |
| wood / authored | baseColor | 654 | 0.00001 |
| wood / authored | height | 14 | 0.00001 |

Mean-error limits also apply; the full comparison records every measurement. Frozen criteria digest is `sha256:3a896e4239014097d6e5353b1571a90c2ce4f0cec2ab9c7a4dc561785ce127b9`, tolerance digest `sha256:f01533c2311e32319c37338126a20f8089957e770e221424c46b10263c40b627`. [Native wood](./wood-default/native-baseColor.png) and [Player wood](./wood-default/player-baseColor.png) are retained and visually inspected, but visual similarity does not authorize passing a failed numeric gate.

The engine has a related [ordinary-browser failure record in PR #12](https://github.com/OpenMixture/OpenMixture/pull/12). The product result is independently measured; that reference is context, not a substitute for this comparison or a proven root cause. Engine-owned numerical investigation and a newly qualified candidate are needed before this upgrade can close. Do not compensate by rewriting product pixels or relaxing criteria.

## Isolated consumer execution

The [isolation receipt](./isolation-linux.json), [execution summary](./isolation-execution.json), [exact local launch recipe](./isolation-recipe.sh) and [in-sandbox commands](./isolation-checks.sh) record a fresh independent clone inside a Bubblewrap filesystem on Ubuntu 26.04.1 LTS / WSL2 `6.18.33.2-microsoft-standard-WSL2`. The sandbox mounts the consumer, detached native data, Node and OS libraries, but neither source checkout nor host home/Windows mounts. Direct reads of both checkout paths fail, and `cargo`/`rustc` are absent. Network access remains enabled for package installation; this is filesystem isolation, not network isolation.

The verified Node 24.20.0 Linux archive SHA-256 is `2f2c0da162318f0de47665410c7c8c2ed3d36c8f3105de4bbc61176c70a7cbf2`. After installing missing Chromium OS libraries outside the sandbox, the fresh run passed `npm ci`, `npm run check` (20 tests), all 52 real browser tests, normal deployment and seven-case Player execution. [Isolated Player receipt](./player-isolated-linux.json) records Chromium 153.0.8010.12, explicit SwiftShader flags and a CPU-type BrowserWebGpu adapter with redacted name/vendor/device. This is controlled Linux/WSL qualification, not native Windows or ordinary-browser evidence.

The subsequent [isolated-output comparison](./comparison-isolated-linux.json) against the same frozen Windows DX12 reference passes 12/28 pixel channels; all plans and structure checks pass. This additional cross-environment measurement also fails and does not replace the primary Windows comparison. The isolated execution gate is complete; the full quality gate is not. The retained recipe uses the exact local paths and browser cache of this run; reproduction needs fresh paths, the detached reference, the pinned Node archive and Chromium OS dependencies.

## Reproduction and retention

Check out the tested product candidate and use fresh output directories:

```bash
npm ci
npm run check
npm run test:ordinary -- chrome work/ordinary-new
npm run capture:studio -- work/studio-downloads-new
```

In the separate engine checkout at the candidate revision, set `MIXTURE_GPU_BACKEND` to `dx12` for this Windows reference:

```bash
node scripts/browser-runtime/prepare-studio.mjs /absolute/native-new 7b1cec4ad1d42d6269ef6a9912c2e8ba3a2dfdd9 /absolute/studio-downloads-new
```

Then in the product, followed by the engine comparison:

```bash
npm run test:studio -- /absolute/native-new /absolute/player-new
cargo xtask studio-material-check /absolute/native-new /absolute/player-new
```

The last command must run in the engine checkout and returns nonzero for this measured failure. `MIXTURE_TEST_PORT` may choose a free server port without changing rendering. Full temporary native/Player PNGs and logs remain in ignored local output; retained receipts, source bytes in the native manifest, complete comparison and representative PNGs support review. They are not a claim that every temporary output is durably archived. Registry consumption remains conditional on a future engine publication; no publication or public hosting occurred.
