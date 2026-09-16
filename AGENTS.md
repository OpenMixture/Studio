# Contributor and agent guide

English | [简体中文](./AGENTS.zh-CN.md)

This is the independent OpenMixture product repository. Read [README.md](./README.md) before extending scope. The Player completes M5-04, including parameters, channel previews and PNG export. M5-05 is accepted within the [recorded matrix](./docs/browser-qualification.md). Follow the [Studio MVP plan](./docs/studio-mvp.md) for subsequent product batches; [Studio MVP acceptance](./docs/evidence/studio-qualification/README.md) completes STUDIO-01 through STUDIO-05 within its recorded environment; publication and wider qualification remain separate.

- Import engine behavior only from the public `@openmixture/runtime` package. Do not import producer paths, link to the engine checkout for acceptance, compile Rust during npm installation, or copy a renderer/catalog/validator into TypeScript.
- Preserve incoming `.mix` bytes. Do not parse and reserialize user source before Rust validation. Keep editor layout and product state outside the material format.
- GPU acquisition and disposal are explicit. Unsupported GPU and failed execution must remain errors, with no alternate renderer. Do not describe mocks, unavailable or skipped WebGPU tests as successful rendering.
- Keep one active render and one replaceable latest pending request. Edits remain usable while rendering; invalid requests, source replacement and shutdown invalidate older completions. Never add an unbounded queue or describe freshness invalidation as GPU cancellation.
- Returned pixels belong to the consumer. Retain only necessary previews/results, preserve channel encoding, and keep product canvas/export responsibilities outside the engine.
- Update English and Simplified Chinese documentation together, with identical commands, versions and API examples. Preserve fixture provenance and archive identity.
- Pin direct dependencies, retain `package-lock.json`, and use the real vendor tarball. Updating the artifact requires documenting its build identity/digest and rerunning public type/build/browser checks.
- Run `npm run check` for changes. Run `npm run test:browser` when package loading, pixels, input boundaries or lifecycle change. Record the actual browser, OS, adapter, flags and unresolved limits; do not imply broad browser support.
- Keep generated build output, test reports and transient evidence under ignored directories. The intentional runtime archive in `vendor/` is the bootstrap distribution artifact.
- Use reviewable commits and actual pull requests for integration. Do not bypass required checks or claim a remote push when only local work was completed.
