# Studio history, bindings and saving — STUDIO-04

English | [简体中文](./studio-save.zh-CN.md)

## Workflow

Open `/player/studio.html`. **Undo** / **Redo** restore material commands, incomplete numeric text and layout changes. History retains at most 100 commands; typing in one parameter until focus leaves is one command, and a pointer drag is one command. Keyboard layout steps are separate commands. A new edit after undo discards the redo branch. Outside text/select fields, Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z redoes; fields retain native text shortcuts. History is session-only and resets when another material is successfully opened.

Select a node, enter a **Public ID**, choose its parameter and **Add public binding**. **Remove** deletes a binding. Rust validates IDs, duplicate bindings and targets. Invalid drafts remain editable and undoable but cannot be saved or rendered. Deleting a node removes its incident edges and bindings atomically; undo restores them and their layout positions.

**Save material .mix** validates the exact authored bytes with Rust and starts a download. Unchanged material retains the exact opened bytes; edited serialization preserves complete JSON values and numeric lexemes. Preview overrides never become authored defaults. The download checkpoint is independent of layout. **Discard material edits** returns to the last material checkpoint (the initial template for an unsaved new document); this action is undoable. **Download original .mix** always returns the bytes opened at the start of this session.

**Save layout** downloads positions and viewport separately, with the SHA-256 of the exact current valid material bytes and its node IDs. Save the matching material as well. A material edit changes sidecar identity, so re-save the layout even when positions have not changed. Reopen that material, then **Load layout**. Both saves work on edited material. Layout movement never changes material dirtiness. Undoing back to either saved checkpoint clears its respective dirty state. Missing layout uses default positions; malformed or mismatched sidecars retain current positions and cannot change material semantics. Stale sidecar reads/saves are rejected when the document or layout changes.

## Recovery and boundaries

Opening a file or creating a template stages byte admission, lossless transport and graph preparation before replacing the session. Failed admission retains current source, fields, positions and history. Unsaved work requires confirmation before successful replacement. An authored edit during a pending file read supersedes that read. New templates start unsaved; opening an existing file starts a clean checkpoint. New/open operations invalidate older render completions without GPU cancellation.

Material and layout download failures retain the draft and saved checkpoints. A checkpoint means the browser accepted the download start; this page cannot verify disk completion or detect cancellation in the browser's download UI. Save again if necessary. No automatic persistent recovery is provided after closing the page; unsaved work triggers the browser's unload warning.

The installed archive, dependencies and material schema are unchanged. Product history contains transport snapshots, not renderer or validator implementations. GPU initialization/disposal remains explicit; valid undo/redo schedules only the newest preview, and invalid drafts suppress old completions and PNG export.

## Verification

```bash
npm run check
npm run test:browser
npm run test:deployment
```

The suite contains 20 Node tests and 52 browser cases. New cases exercise bounded/coalesced history, atomic deletion recovery, invalid buffers and duplicate bindings, independent checkpoints, byte-identical unchanged save, edited save/reopen for checker/ceramic/leather/wood, numeric-token preservation, matching sidecars, failed downloads/imports, cancelled new/open and superseded reads. A real GPU readback barrier verifies undo freshness; existing GPU, Player and lifecycle tests remain included. Normal production deployment saves/reopens edited checker and compares its pixels.

[Evidence](./evidence/studio-save/README.md) records the tested revision and environment separately from remote integration. STUDIO-01 through STUDIO-05 are complete within the [recorded saved-file matrix](./evidence/studio-qualification/README.md); integration and wider qualification remain separate. This does not publish the runtime, host the product publicly, or establish broader browser support.
