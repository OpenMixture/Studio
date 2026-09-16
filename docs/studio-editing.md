# Studio basic editing — STUDIO-03

English | [简体中文](./studio-editing.zh-CN.md)

> Historical batch guide: the scope and counts below describe this batch when delivered. Current [STUDIO-04](./studio-save.md) adds undo/redo, binding editing, edited material and layout saving, and failed-open recovery; discard now restores the last saved material. See that guide for current behavior.

## Workflow

Open `/player/studio.html`. Load a sample or valid `.mix`, or use **New checker material** to start a validated checker-to-output document. Import validation and editing do not acquire a GPU. The Player at `/player/` retains its original byte-preserving workflow.

In **Author material**, choose a catalog node type and **Add node**. IDs are generated uniquely from the type. Select a graph node or use **Edit node** to edit its integer, float, enum or four-component color parameters. Text-based numeric fields retain decimal/exponent tokens; Rust decides whether they satisfy the parameter contract. **Use default** removes the authored override for that parameter.

Choose From node / Output port and To node / Input port, then **Connect ports**. This replaces the selected input's current connection. **Disconnect input** removes that connection. **Delete selected node** removes the node, all incident edges and its public bindings as one document command. Unrelated nodes, edges, bindings and source fields remain. Binding creation/editing is still a later batch.

Rust diagnostics appear beside the editing controls with available node, port and parameter identities. Reported nodes are highlighted and can be selected from a diagnostic. Invalid drafts remain visible and editable, including cycles, incompatible connections and missing required inputs. An incomplete numeric token remains in its field even when selecting another node; it blocks the entire draft until repaired, reset or deleted with its node. No validator or renderer is duplicated in TypeScript.

Initialize WebGPU explicitly to preview. Valid authored edits automatically preview; each authored edit clears transient Player-style preview overrides so they cannot mask the new source value. Changing a preview override never writes it into the authored document. Invalid edits immediately invalidate pending/current export eligibility. One render stays active and only the latest pending snapshot is retained. Old completions cannot repaint or enable PNG export; this is freshness invalidation, not GPU cancellation. Device loss remains an error and leaves editing available.

## Original source, drafts and layout

Edits are session-only in this batch. **Download original .mix** always returns the opened bytes; for a new checker it returns the initial template. **Discard material edits** restores those original bytes, parameter fields and validation state after confirmation. Opening a different material/new template or leaving the page prompts when material/layout changes would be lost. Undo/redo, edited `.mix` saving and cross-consumer authoring qualification remain STUDIO-04/05.

Layout is separate from source. Existing positions are retained when editing; new/recreated nodes use default positions. Structural changes mark layout dirty. Sidecar loading/saving is disabled while a material draft is changed, because this batch cannot save the matching edited material. Discard material edits to use original-source sidecars again. Moving nodes never changes authored source bytes. No editing history is retained; the state is one original checkpoint, one current document and per-field draft text.

## Document transport contract

`src/document.ts` resolves the STUDIO-01 transport prerequisite without a new engine package:

1. Validate the exact incoming bytes with the installed Rust runtime before parsing them for editing. Invalid UTF-8, duplicate keys, unsupported source and malformed numeric input cannot become accepted through JS normalization.
2. Retain original bytes. Project the complete JSON object, including fields not used by the UI. Native JSON reviver source context captures every numeric lexeme in a `NumberToken`; strings, arrays, objects, booleans and null remain JSON values. Browsers without that capability do not enable editing.
3. Product commands change only the fields they own. Serialization recursively emits JSON, preserving untouched values and numeric lexemes without passing tokens through JavaScript number conversion. Whitespace and string escaping can change only after an authored edit. An unchanged document and discard restore exact original bytes. Prototype-shaped keys are ordinary own data properties.
4. Validate the exact generated candidate bytes in Rust before rendering. The graph projection can show an invalid authored candidate but never certifies it. Numeric lexical errors are editor transport errors; range/type/graph diagnostics come from Rust. Incomplete text never falls back to rendering the previous valid document.

The catalog and material format remain owned by the installed `@openmixture/runtime@0.1.0-alpha.0`. The archive and dependencies are unchanged. The new checker is ordinary source input using catalog versions, not a replacement node implementation. Public graph mutation or engine serialization APIs are not invented. Undo/history limits and the final saved-file contract remain for STUDIO-04; this batch intentionally retains zero undo entries.

## Checks and evidence

```bash
npm run check
npm run test:browser
npm run test:deployment
```

There are 18 Node tests and 44 real Chromium browser cases. CPU tests use the actual packaged WASM validator for source admission and invalid authored graphs. Nine additional browser cases cover rebuilding checker, all parameter kinds, Rust diagnostics and repair, discard/replacement/new template, bounded rapid edits with a real GPU mapping barrier, real device loss, and three edited materials × four 128 × 128 channels. Canvas and decoded PNG pixels are compared with independent installed-runtime rendering of the exact generated source. Normal production deployment also edits checker and verifies changed output with unchanged original download.

[Acceptance evidence](./evidence/studio-editing/README.md) binds tested source, archive, commands, source/pixel digests and inspected screenshots. Local isolated acceptance and remote CI are recorded separately. These are measured Chromium environments, not general browser/hardware support or a new native 1K acceptance. The [MVP plan](./studio-mvp.md) retains the later save and cross-consumer gates.
