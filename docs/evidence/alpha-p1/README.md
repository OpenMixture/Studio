# Alpha P1 product verification — 2026-09-17

English | [简体中文](./README.zh-CN.md)

## Main protection and ordinary workflow

[Protection receipt](./protection.json) records the applied GitHub `main` policy: PR required, both existing GitHub Actions checks required with strict up-to-date status, enforcement including admins, and force push/deletion disabled. Zero additional approving reviews are required; this is the minimal PR/check policy. Subsequent PR checks and integration are recorded separately.

[PR #11](https://github.com/OpenMixture/Studio/pull/11) merged without bypass at `16b2934bbc4607c44645775363b93743d0b5d99c`, after both required checks passed on `2300004829e3a9f950b136abf314c55a2a708afa` in [CI 35178571892](https://github.com/OpenMixture/Studio/actions/runs/35178571892). A fresh API read confirmed `protected: true`. Local controlled Chromium 153.0.8010.12 also passed all 52 browser checks and normal deployment after replacing the unusable global installation with a fresh isolated download. See the [candidate result](../alpha-candidate/README.md) for the separately blocked upgrade.

[Ordinary-browser receipt](./ordinary-baseline.json) passes against product `e7c76874e2da0bd0343b8693410d7bc1e4869322`, historical runtime `4b914feb9f3365d292b27ea60c5e0b6004f745e8`, archive SHA-256 `9e245578de160cee1050259ef34358c3fcd3353a21bbb1672d29701bc1ac8084`. Node 24.20.0 and npm 11.19.0 were used. This result does not qualify the new engine candidate.

Measured environment: Windows 11 build 26100, installed Chrome 153.0.8010.48. System GPU information lists NVIDIA GeForce GT 1030, driver 32.0.15.8266; the runtime's adapter name/vendor/device fields are redacted. The retained system/context records distinguish available devices from runtime-reported identity. The actual OS and browser command lines contain only a fresh profile, loopback CDP port and `about:blank`, without GPU, software-adapter, headless or security overrides. This is an automated ordinary-configuration check, not human usability testing.

Passed on the normal production entries: unchanged exact-byte save, new material, invalid numeric draft and diagnostics, undo/redo, repair, disconnect/reconnect, explicit GPU initialization, authored 4 × 8 checker rendering at 128 × 128, exact checker pixels, four PNG encodings, save/reopen with byte preservation, independent Player reopen with four matching exported channels and explicit disposal. The normal build excludes the contract harness and serves WASM with its correct MIME type. [Studio](./studio.png) and [Player](./player.png) screenshots were captured.

The [unsupported screenshot](./unsupported.png) belongs to a separately injected `navigator.gpu`-unavailable probe. Its clear error and continued graph/edit/save operation passed. This does not certify a naturally unsupported device. No native seven-case comparison or broader hardware/browser support is claimed by this workflow receipt.

## Reproduce

Commit the product tree and choose a fresh output directory on Windows:

```bash
npm ci
npm run check
npm run test:ordinary -- chrome work/ordinary-new
```

`edge` selects installed Edge instead; another executable path can be passed directly to `node scripts/verify-ordinary.mjs`. The verifier rejects extra launch arguments, verifies actual runtime identity against `vendor/runtime-build.json`, checks archive digest, and writes an incomplete/failure receipt if a workflow assertion fails. It uses a separate temporary server port and retains its fresh browser profile under the chosen output directory.

Controlled checks remain separate:

```bash
npx playwright install chromium
npm run test:browser
npm run test:deployment
```

If port 4173 is occupied, set `MIXTURE_TEST_PORT` to a free port between 1024 and 65535. All qualification scripts derive URLs from their own server. This changes the test server address, not GPU configuration. Initial local attempts exposed a globally installed Chromium spawn failure; that launch failure is not counted as rendering. The ordinary Chrome receipt above is independent of that binary.

Candidate upgrade, isolation and full saved-file/native comparison remain separate gates in the [active plan](../../studio-alpha.md). Registry publication and public hosting are not performed here.
