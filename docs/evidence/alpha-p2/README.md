# P2 entry separation and exploratory deployment

English | [简体中文](./README.zh-CN.md)

**ALPHA-04 is complete. The exploratory trial is deployed and its ordinary-browser workflow passes; human feedback is pending.** The owner selected GitHub Pages and owns recruitment/feedback collection. This does not close ALPHA-03 or declare an Alpha candidate accepted.

## Delivered version

- [Trial task card](https://openmixture.github.io/Studio/trial.html), [Studio](https://openmixture.github.io/Studio/studio.html), [Player](https://openmixture.github.io/Studio/) and [feedback form](https://github.com/OpenMixture/Studio/issues/new?template=trial-feedback.yml).
- Product `b7d91fee0c45abc6c11c4967e2bc27e9874f514d`, integrated through [PR #14](https://github.com/OpenMixture/Studio/pull/14). [PR checks](https://github.com/OpenMixture/Studio/actions/runs/35183001766) and [exact main-commit checks](https://github.com/OpenMixture/Studio/actions/runs/35183220067) passed both required contexts. Main protection remained enforced.
- [GitHub Pages deployment](https://github.com/OpenMixture/Studio/actions/runs/35183401419) succeeded. Build time: `2026-09-17T04:50:33.803Z`. [deployment.json](./deployment.json) retains the runtime identity, committed/raw lock digests and hashes of all 15 deployed assets. The public [trial.json](https://openmixture.github.io/Studio/trial.json) identifies the live version; later documentation commits do not automatically redeploy it.
- Historical `@openmixture/runtime@0.1.0-alpha.0`, engine `4b914feb9f3365d292b27ea60c5e0b6004f745e8`, clean producer, build `sha256:759549793271c7fdd257b0289dab11b2fa9524dbc500b5033cb717179f5d1243`, archive SHA-256 `9e245578de160cee1050259ef34358c3fcd3353a21bbb1672d29701bc1ac8084`. Archive, dependencies and material serialization implementation were not changed.

## Verification

| Check | Recorded outcome |
|---|---|
| `npm run check` | Public types, 20 unit tests and production build passed. |
| Built entry graph | [entry-bundles.json](./entry-bundles.json) records the emitted transitive/dynamic dependency graph from the local trial build. Player excludes Studio entry/editor, document, source graph, graph view and history. Every build now enforces this boundary. Shared preview/runtime/controls/files/PNG/latest-request modules remain internal. |
| `npm run test:browser` | 52 actual Chromium checks passed locally and in required CI. Local Chromium 153.0.8010.12 uses the existing controlled unsafe-WebGPU/blocklist flags; CI additionally uses SwiftShader. These are not ordinary-browser claims. |
| Production hosting paths | Both `/player/` and `/Studio/` passed Player/Studio production render, PNG, edit, save/reopen and layout checks; the contract harness was absent. The deployment workflow repeats `/Studio/` verification before upload. |
| Live ordinary browser | [ordinary-hosted.json](./ordinary-hosted.json): clean checkout of the deployed commit; Windows 11 build 26100, Chrome 153.0.8010.48, NVIDIA GeForce GT 1030, driver 32.0.15.8266. Completed `2026-09-17T05:12:40.224Z`. Actual launch contains only fresh-profile, CDP and about:blank arguments, verified against the process and browser command lines. |
| Live workflow | All 15 asset digests and product/runtime/lock identity checked. New/edit/invalid-draft repair/undo/redo/disconnect/reconnect passed. Checker at 128 × 128 produced exact pixels; four PNG encodings, unchanged/save/reopen byte equality, independent Player channel equality and explicit disposal passed. No page errors. |
| GPU unavailable | A separate synthetic `navigator.gpu` probe reported an error while retaining graph/edit/save usability. It is not a naturally unsupported host or successful render. |
| Trial card | Seven bilingual tasks, relative entry links and 390px layout without horizontal overflow checked. [trial.png](./trial.png) is local task-card evidence; [studio.png](./studio.png) and [player.png](./player.png) are from the live ordinary session. |

The first hosted attempt failed because its validator compared the server's original LF sample with a Windows CRLF checkout. No product save corruption occurred. The successful run used a separate clean clone with `core.autocrlf=false` and `npm ci`, preserving exact deployed sample bytes. A second attempt failed during TLS establishment before the workflow; its retry passed. The verifier follow-up compares downloads to the actual served sample and its deployment digest, retaining exact byte equality without normalizing user data. A stalled optional artifact download was stopped; deployment/CI links and the live receipt remain the evidence.

Reproduce using the [trial commands](../../external-trial.md#agreed-delivery-scope-and-commands). The hosted receipt was produced by the verifier at the deployed commit. The follow-up changes only its remote sample comparison and documentation; it does not change the deployed product.

## Trial handoff and limits

Actual external participants: **0**. Actual human feedback records: **0**. The owner handles invitation and collection using the [task card and outcome rubric](../../external-trial.md). Proposed 3–5 participants and exit targets remain targets. Agent/browser automation is not counted as human validation, and no feedback-derived feature ranking is claimed.

This is an expressly scoped exploratory trial of the historical runtime. No new seven-case 1K native qualification or registry publication is claimed. [Candidate upgrade PR #12](https://github.com/OpenMixture/Studio/pull/12) remains draft after frozen pixel failures. Qualified Alpha delivery and ALPHA-05 closure still require their candidate gates and real participant outcomes.
