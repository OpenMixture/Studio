# Studio read-only source graph

English | [简体中文](./studio-graph.zh-CN.md)

**Current extension:** This guide retains read-only workflows and their original acceptance scope. [Basic editing](./studio-editing.md) is now implemented; its guide describes layout-file restrictions during authored drafts and the new transport contract. STUDIO-01 pending work and test counts below describe the earlier read-only checkpoint.

## Open and inspect

Run the existing product:

```bash
npm ci
npm run dev
```

Open `/player/studio.html`, or choose **Studio graph** from the Player navigation. The production build contains both `/player/` and `/player/studio.html`; the same static host and package-relative WASM serve both. No new dependency or runtime archive is required.

Choose checker, glazed ceramic, leather, wood or a user `.mix` using the Source panel. The graph shows authored nodes (including disconnected valid nodes), IDs, type/version and catalog ports. Select a node to inspect authored/default parameter values, input connections/defaults, output types and public bindings. The graph is taken from validated source, not optimized execution passes. Graph inspection does not acquire a GPU.

Drag a node to move it; drag the background to pan. Use **Fit graph**, **Center selected** and the zoom buttons to navigate. The Selected node list provides access to every node, including off-screen nodes. Tab to a node and use arrows to move it; focus the canvas and use arrows to pan. Shift increases the movement step; `+`/`−` zoom and Home fits the graph. These operations only change layout.

The existing preview controls remain available below the graph: explicitly initialize WebGPU, choose dimensions/channels, change public preview overrides, render and download PNGs. Inspector values remain authored values; preview overrides never change the graph document or original download. The existing one-active/one-latest scheduler, stale-result rules and explicit disposal apply to both entries. GPU failure leaves source inspection available.

## Source and layout contract

`src/source-graph.ts` first passes the exact incoming bytes to the installed Rust validator. Only accepted input is decoded and projected for display. The native JSON reviver source context preserves numeric lexemes, including fractional digits that JavaScript numbers would round. Catalog defaults and port/parameter contracts come from `getNodeCatalog()`. This is a display projection, not a graph validator or edited-document serializer. Browsers without numeric source context receive a projection error; this feature is qualified only on the recorded Chromium environment.

`Download original .mix` returns the retained incoming bytes unchanged, even after moving nodes, loading layout, changing preview overrides or disposing the GPU. Invalid input clears the graph and disables its download controls; duplicate keys and invalid UTF-8 cannot be normalized into accepted material. The original Player continues to pass the same bytes to Rust. No material-editing or rewritten `.mix` save is included.

**Save layout** downloads a version 1 `.mix.layout.json` sidecar containing the exact source SHA-256, node positions and viewport. Node identities and the digest bind layout to one source; selection is session-only. Loading the same source again starts from default layout until the sidecar is explicitly loaded. Missing layout is harmless; malformed, oversized (over 4 MiB), wrong-version or mismatched layout falls back to default positions with a message. Coordinate and zoom limits apply only to product layout. Layout is never passed to the renderer.

Moving/panning/zooming/resetting marks layout unsaved. A layout download or successful load clears that marker; a download means the browser received the file, not proof of disk persistence. Opening a different material or leaving the page prompts for unsaved layout. Late source/layout reads cannot replace newer input or more recent layout changes. Temporary download URLs are revoked; only the current graph, layout and original bytes are retained, without an undo history.

## Milestone boundary

This slice delivers STUDIO-02 and the read-only subset of STUDIO-01: a separate entry, byte-first validation, exact original download, source projection, layout ownership and shared Player preview. It resolves the projection requirement without changing the engine package. STUDIO-01's authored serialization, editing history limits and new-document workflow remain prerequisites for STUDIO-03/04; they are not needed for display-only transport and are not claimed complete. The [MVP plan](./studio-mvp.md) records this explicit sequencing refinement.

## Verification

```bash
npm run check
npm run test:browser
npm run test:deployment
```

The checks cover 12 Node tests and 35 real Chromium browser cases. Seven Studio cases cover all four source graphs without GPU acquisition, catalog details, disconnected nodes, exact numeric text, raw-byte downloads/rejection, keyboard/drag layout, sidecar round trips/failure, replacement races and three materials × four 128 × 128 channel PNG comparisons against independent installed-runtime calls. The normal production deployment check verifies both entries, real checker rendering/download, exact original source, WASM MIME and absence of the test harness.

[2026-09-16 evidence](./evidence/studio-graph/README.md) records the actual tested revision, browser/OS/adapter/flags, isolated consumer and CI status. Type/build checks, browser execution, isolated acceptance and remote CI are separate results. M5's retained native/browser 1K qualification is unchanged; this slice does not claim new 1K native acceptance or wider browser/hardware support.
