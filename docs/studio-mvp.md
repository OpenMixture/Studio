# Studio MVP implementation plan

English | [简体中文](./studio-mvp.zh-CN.md)

## Status and baseline

Planning baseline: 2026-09-15. This document defines the next product milestone; Studio editing is not implemented or accepted by this documentation change. `STUDIO-01` through `STUDIO-05` are work items, not GitHub PR numbers. Implementation proceeds in order, with actual PRs and tested revisions recorded when they exist.

M5 is accepted within the recorded macOS/Linux Chromium matrix. The [product receipt](./evidence/m5-05/README.md) covers installed-runtime execution, isolation and static deployment; the [engine acceptance](https://github.com/OpenMixture/OpenMixture/blob/c03c7b4/docs/evidence/m5-05/README.md) records frozen native/browser quality comparisons and limits. The existing Player opens source, edits public overrides, previews channels and downloads PNGs. The installed `@openmixture/runtime@0.1.0-alpha.0` archive remains unpublished. Historical evidence retains its original scope and dates.

## Goal and scope

A user can open a standard `.mix`, inspect and edit its graph, configure node parameters and public bindings, undo/redo, save a standard `.mix`, then open that saved file in the independent Player and native CLI. Reuse the Player's runtime client, bounded scheduling, channel preview and PNG encoding where their contracts fit.

The MVP covers the existing node catalog and material channels, a desktop graph workspace with keyboard-accessible editing controls, selection, pan/zoom, node movement, diagnostics and unsaved-change feedback. It preserves the existing Player entry and workflow. The Studio entry URL and static base handling are decided in STUDIO-01 before implementation; a new route is not assumed to exist today.

Excluded: new nodes or shader semantics, 3D/intermediate-node previews, accounts, cloud storage, collaboration, project containers, automatic GPU recovery, embedded Player distribution, npm publication and public hosting. Engine M6 remains the separate resource/portable-packaging milestone. None is needed to complete this MVP.

## Architecture and document rules

- The product imports engine behavior only through the installed public package. Rust owns catalog contracts, validation, compilation and rendering; TypeScript owns editing commands, document transport and UI state. No copied semantic validator or renderer.
- Read and retain incoming bytes, then call Rust validation on those exact bytes before constructing an editable view. Invalid input must expose diagnostics without normalizing away duplicate keys, invalid UTF-8 or numeric tokens. A failed/late import cannot replace newer work.
- The current public package exposes `getNodeCatalog()`, `validate()`, `inspect()`, `createGpu()` and `getBuildInfo()`. Inspection exposes a compiled plan and public bindings, not a lossless editable source graph; no editing or serialization API is assumed.
- STUDIO-01 must resolve a safe document projection/serialization contract. Any product parser is transport only, after Rust validation, and must preserve supported source values and fields without numeric precision loss. If the installed API cannot support this safely, deliver the minimal Rust-owned public projection/serialization capability in an engine PR, package it, then verify the new archive in a separate product PR before dependent editing work. Do not use compiled passes as the source graph or silently narrow accepted input.
- Keep original bytes for an unchanged document save. An authored edit may produce new source bytes; Rust must validate those exact bytes before valid-material save and rendering. Unsupported round-trip cases must remain visibly read-only with original-byte download until the contract supports them. Invalid drafts remain editable/undoable but cannot be exported as a valid material or replace a current render result.
- Node parameter edits change authored values; Player-style request overrides remain transient. Public bindings reference standard node/parameter identities. Preview overrides must not silently become saved defaults.
- Keep positions, viewport and selection outside `.mix`. An optional `.mix.layout.json` sidecar is product-owned, versioned and associated with document identity and node IDs. Missing, malformed or mismatched layout uses a safe default and cannot block material validation/rendering. Moving nodes changes layout dirtiness, not material bytes.
- One active render and one replaceable latest pending request remain the limit. Every request captures source, overrides, dimensions and channels. Invalid drafts, undo/redo, source replacement and shutdown invalidate older completions; this is freshness invalidation, not GPU cancellation. Stale previews cannot be exported as current results.
- GPU acquisition/disposal stays explicit; editing and validation need no GPU. Bound undo history and retained images, revoke download URLs, and clean up on navigation/shutdown. Missing WebGPU and device loss remain visible errors.

## Implementation batches

### STUDIO-01 — document contract and editor foundation

**Depends on:** the M5 baseline above.

Inventory public types against existing fixtures and authoring needs; document field/numeric preservation, edited serialization and unsupported cases. Decide entry/base routing, module ownership, layout association and explicit undo-history limits. Extract only shared Player modules needed by the editor. Add an editor shell with file opening, raw-byte validation, diagnostics and dirty-state handling. Pin any new direct dependency and retain the lockfile; choose graph UI tooling against these requirements in this batch.

**Acceptance:** checker, ceramic, leather and wood validate before projection; malformed UTF-8, duplicate keys, numeric boundaries and unsupported round trips are covered. Unchanged save preserves exact bytes. Opening another file respects unsaved work and rejects late reads. A required engine API/archive change passes its own producer checks and isolated public-package consumption before this batch closes. Existing Player behavior remains verified.

### STUDIO-02 — read-only graph and preview

**Depends on:** STUDIO-01 and its resolved document contract.

Display source node IDs/types, ports, edges and parameter values using public catalog metadata. Add selection, pan/zoom, movement and optional sidecar layout; connect the existing channel preview and explicit GPU controls. Keep layout changes outside source.

**Acceptance:** all four samples show their source graphs, including disconnected authored nodes where valid, without reconstructing them from optimized render passes. Graph inspection works without WebGPU. Selection and navigation have keyboard controls. Layout reset/reload leaves source bytes unchanged. Real packaged-runtime previews match the existing material/channel cases; the Player still works under its existing static base.

### STUDIO-03 — graph and parameter editing

**Depends on:** STUDIO-02.

Add/remove nodes, connect/disconnect ports and edit node parameters using the catalog. Define atomic removal of incident edges and affected public bindings. Show Rust diagnostics against the relevant node/port/parameter; UI hints do not replace Rust validation. Refresh preview only from validated current snapshots.

**Acceptance:** build a checker-to-material-output graph, edit all existing parameter kinds, and edit the three material samples. Exercise cycles, incompatible ports, missing endpoints, duplicate identities and invalid values through authoritative validation. Rapid edits remain responsive with bounded requests; invalid drafts and older completions never become a current preview/export. Real GPU failures remain errors.

### STUDIO-04 — undo/redo, bindings and save

**Depends on:** STUDIO-03.

Add bounded command history, transactional gestures, undo/redo, public binding creation/removal and separate material/layout save actions. Dirty state tracks the last saved material and layout independently. Source replacement starts a new history after resolving unsaved work. Provide a way to discard a draft and return to the saved document.

**Acceptance:** undo/redo restores node IDs, edges, values and bindings, including node deletion, without silently saving preview overrides. Invalid drafts can be repaired or undone. Save validates the final bytes, reopen restores the authored graph, and sidecar failure cannot change material semantics. An unchanged source downloads byte-for-byte; an edited source round-trips without unsupported field/value loss. Save/new/open failures retain recoverable work.

### STUDIO-05 — cross-consumer qualification

**Depends on:** STUDIO-04.

Retain Studio-authored checker and edited ceramic/leather/wood fixtures with provenance. Pass the saved bytes unchanged to independent Player and native CLI verification. Product acceptance consumes only the installed archive; native verification is a separate engine-owned step, exchanging detached fixtures/reference bundles rather than making the engine checkout a product dependency.

**Acceptance:** bind product revision, runtime archive/build identity, source digests, overrides, dimensions and channels. Compare normalized plan semantics and 1K baseColor/normal/roughness/height output using applicable frozen M5 criteria; any new comparison case needs criteria fixed before acceptance, with no relaxed native goldens. Verify source editing, undo/redo, bindings, save/reopen, PNG download, lifecycle/freshness failures, isolated installation and normal static deployment of both entries. Record actual browser/OS/adapter/flags and inspected screenshots. Accept only the tested matrix and retain unresolved limits.

## Verification and delivery

Run the existing product checks for every batch:

```bash
npm run check
```

For package loading, pixels, input boundaries, lifecycle or deployment changes, run the relevant real-browser and normal-production checks:

```bash
npx playwright install chromium
npm run test:browser
npm run test:deployment
```

Extend the existing suites for the batch's acceptance cases. Use focused unit tests for document commands, byte/value preservation and history boundaries; use real installed-runtime browser tests for validation/rendering/download paths. Mocked scheduling checks do not certify pixels. [Qualification commands](./browser-qualification.md) describe detached material references and the current macOS isolation recipe; update that recipe for Studio before claiming editor isolation. Do not invent unimplemented test commands.

Each batch uses paired English/Chinese docs, reviewable commits and an actual PR. Record implemented, locally verified, remote-CI-passed and accepted states separately against exact revisions; inspect real required checks before integration. A documentation plan does not claim a remote push, CI run or implementation acceptance. Archive changes require build identity/digest documentation and renewed public type/build/browser and isolated-consumer checks. Keep transient output in ignored directories and add dated evidence without rewriting M5 records.

## Completion and separate decisions

Studio MVP is complete when all five batch gates pass and the saved `.mix` → independent Player → native CLI path has retained evidence. Publish the tested support limits with the final assessment. Registry release, public hosting, broader browser/hardware qualification, 3D preview and engine M6 require their own scope decisions.
