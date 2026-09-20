# Exact npm Alpha consumption — 2026-09-20

English | [简体中文](./README.zh-CN.md)

Studio `87ded9351e1c426e03aa7fb2b4c641f32399b85b` installs exact public registry version `@openmixture/runtime@0.1.0-alpha.0`. Only `package.json` and the runtime lock entry changed. The archive SHA-256 remains `a9bcfe8d849f9fb9982a750dd99d026807fdf6453b5be491deeda90e99a2c6ae`; build ID remains `sha256:94f9cc455fcd5f805942b0196b39a276782ce0e504772c3a140ea8ad85814a28`. The retained vendor fixture is not an install fallback.

[Registry readback](./registry-readback.json), [Windows installed file hashes](./windows-install.json) and [isolated Linux installation](./linux-install.json) bind the actual package. Full [engine-owned publication and consumer evidence](https://github.com/OpenMixture/OpenMixture/tree/main/docs/evidence/npm-alpha) retains browser/deployment reports, seven-case/28-channel comparisons, normal Chrome editing/save/Player/export evidence and reproducible pixel reuse from ALPHA-04.

Both Windows and isolated Linux passed clean installation, public types, 20 unit tests, production build, 52 browser tests, production deployment and seven saved-file cases / 28 native comparisons. Ordinary Windows Chrome additionally passed the full editing/export workflow. The new runs reuse ALPHA-04 authored inputs and native references; Player execution is fresh against the registry install. Pixels are unchanged. Source checkouts and Rust are unavailable inside the Linux sandbox. Node `24.20.0`, npm `11.19.0` and controlled Chromium `153.0.8010.12` are pinned; exact ordinary browser/adapter details remain in the linked receipt.

For normal installation use `npm ci`; verification uses `npm run check`, `npm run test:browser`, `npm run test:deployment`, and the full saved-file comparison procedure in [the product plan](../../studio-alpha.md). Registry `alpha` and `latest` currently both point to this prerelease: npm rejected authenticated removal of `latest` with HTTP 400. Exact dependency pinning avoids tag ambiguity. No stable release, broader support, product publication or hosted trial redeployment is claimed. The existing GitHub Pages trial remains on its recorded historical runtime.
