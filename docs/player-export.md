# Player PNG export — M5-04

English | [简体中文](./player-export.zh-CN.md)

Open a `.mix` file or material sample, initialize WebGPU, render, change a public parameter and choose a preview channel. Click **Download channel PNG** to save that channel at its rendered dimensions. Names use a sanitized source basename, channel and dimensions, for example `wood-normal-128x128.png`. Choose and download other channels individually.

Only the latest successful current preview can be downloaded. Editing parameters/dimensions, replacing source, invalid input, a latest failure or page exit disables export until a fresh render succeeds. If a request changes during PNG compression, the pending download is discarded. A successful explicit GPU disposal retains current owned pixels for download. Encoding errors appear beside the download button and allow retry. “Download started” means the browser received the file; the browser controls final saving.

## Pixel and metadata contract

`src/png.ts` encodes the returned channel bytes directly, without reading the canvas. It emits non-interlaced 8-bit RGBA PNG, filter 0 rows, browser `CompressionStream('deflate')`, and CRC-protected chunks. No new dependency or semantic renderer is introduced. Alpha remains unassociated and linear, including transparent RGB values. Display scaling never changes export dimensions or samples.

| Runtime encoding | PNG metadata | Pixel handling |
|---|---|---|
| `rgba8-srgb` — baseColor, emissive | `sRGB` intent 0 and `gAMA` 45455 | Preserve already encoded sRGB RGB; do not apply another transfer. |
| `rgba8-linear` — scalar and normal channels | `gAMA` 100000, no `sRGB`/ICC profile | Preserve numeric bytes; do not gamma-correct or renormalize normals. |

These chunks follow the [W3C PNG specification](https://www.w3.org/TR/png-3/). Data textures must still be imported as linear data by the destination application; metadata does not control every importer's settings. PNG contains the runtime's RGBA8 output, not internal floating-point textures or a saved `.mix` document. The product retains one current channel and one in-flight export; stale display canvases are not downloadable. Temporary object URLs are revoked after download initiation or on page exit.

## Verification

```bash
npm run check
npm run test:browser
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture
```

Nine Node tests include independent PNG chunk/CRC/zlib decoding with all byte and alpha values, invalid outputs and filename handling. The browser suite checks three uploaded materials at 128 × 128: change a public parameter, choose baseColor/normal/roughness/height, preview and download. Each decoded PNG must match an independent invocation of the installed runtime. The test clears the canvas before download to prove canvas independence. All eight channel encodings are also downloaded at 65 × 3. Controlled compression delay/failure verifies stale download suppression, page exit and retry availability. Existing tests cover unsupported GPU, invalid source/overrides, real device loss and rapid edits.

The isolated macOS recipe denies access to both original repositories and removes Rust from PATH. Retain the clean tested revision, unchanged tarball digest, runtime context, decoded measurements and selected PNGs/screenshots. These checks establish the bounded Player workflow; M5-05 native/browser 1K comparison, stress and browser CI are accepted within the matrix recorded in [browser qualification](./browser-qualification.md). Broader compatibility remains unqualified. No package publication, website deployment or Studio editing is included.
