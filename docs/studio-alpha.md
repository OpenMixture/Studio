# Studio MVP stabilization and external trial

English | [简体中文](./studio-alpha.zh-CN.md)

## Current phase and review baseline

This is the active product plan following the 2026-09-16 two-repository review, based on Studio `5138afc` and engine `c41fcfb`. The review did not rebuild either repository. Its remote CI and branch-rule observations describe that snapshot, not a fresh verification of current settings. The local Studio baseline for this planning update matches `5138afc`.

Player M5 and STUDIO-01 through STUDIO-05 are implemented and integrated. [MVP acceptance](./evidence/studio-qualification/README.md) covers the recorded macOS environment, seven 1K cases and 28 channels; [M5 qualification](./browser-qualification.md) retains its own matrix. The runtime remains the unpublished `@openmixture/runtime@0.1.0-alpha.0` vendor archive. Neither historical acceptance nor green CI for that archive establishes qualification of a newly built runtime, ordinary browser configurations or public delivery.

The next phase is **Studio MVP stabilization and external trial**. The [MVP plan](./studio-mvp.md) remains the implementation and architecture record; its completed batches are not reopened. This update assigns repository responsibilities and acceptance gates only. The original planning update did not execute these items. The 2026-09-17 follow-up has enforced main protection and passed the ordinary workflow against the historical archive; see the [P1 evidence](./evidence/alpha-p1/README.md). The 2026-09-17 [failed candidate](./evidence/alpha-candidate/README.md) remains historical evidence. The 2026-09-20 [exact candidate upgrade](./evidence/runtime-alpha04/README.md) passes seven cases / 28 channels each on Windows and isolated Linux plus ordinary Chrome workflows; candidate-archive gates are closed, while registry consumption awaits publication.

## Ownership and handoff

| Owner | Assigned scope | Required handoff or boundary |
|---|---|---|
| Studio repository | Main-branch protection, product status docs, ordinary-browser workflows, runtime upgrade consumption, small entry/module cleanup, trial deployment and user feedback | Retain exact product/runtime identity and consumer evidence; use real PRs for integration |
| Engine repository | Current-commit candidate tarball → independent consumer → browser contract/material CI; producer status docs, package contents/types/build identity, npm Alpha release and its required checks | Supply reviewed `.tgz`, version, producer revision/clean status, build ID, SHA-256, change notes and candidate test evidence; Studio does not implement producer CI here |
| Engine → Studio | Native references/comparison for saved files; candidate and later exact registry version consumption | Exchange detached saved bytes/reference bundles/results. Native preparation/comparison stays engine-owned; no producer source imports or Rust dependency in the product |
| Joint release decision | Target desktop environment, candidate identity, support limits and publication/trial scope | Engine owns npm publication; Studio owns product deployment. Execute those delivery actions separately after scope is settled |

Candidate browser CI is the engine's P1 dependency. A pinned consumer may remain, but it must install the candidate package and assert actual `getBuildInfo()` against that candidate. Studio owns the consumer-side adaptation and its subsequent upgrade PR; it cannot close this dependency by repeating tests against the historical vendor archive. Preserve frozen material criteria and provenance; never regenerate baselines to hide a candidate failure.

## Assigned product batches

IDs below are planning IDs, not GitHub issue or PR numbers. “Assigned” means repository ownership, not implementation completion or assignment to a named person.

| ID / priority | Status / dependency | Work and completion gate |
|---|---|---|
| ALPHA-01 / P1 | Complete; enforced rules and merged PR #11 | Re-read live `main` protection/rulesets and check contexts. Require PRs, `Typecheck and production build` and `Chromium WebGPU product contract`; prohibit force pushes and branch deletion. Retain the actual applied rule and subsequent PR/check evidence. If permissions or repository policy block enforcement, record the blocker; manual check discipline is not protection. |
| ALPHA-02 / P1 | Exact candidate ordinary Windows Chrome workflow passed; separate 1K comparisons passed | Select one ordinary desktop environment; initial proposed target is Windows with stable Chrome, exact OS/browser/GPU version to be measured. Use the normal production entries without unsafe-WebGPU, blocklist-bypass or forced software-adapter flags. Complete initialization, open/new/edit, invalid-draft repair, undo/redo, save, independent Player reopen, channel preview, PNG download and disposal. With GPU unavailable, graph inspection/editing and clear diagnostics must remain usable. A failed target is recorded as unsupported, not a passed rendering target; Alpha needs at least one measured successful ordinary configuration. |
| ALPHA-03 / P1 | All exact candidate-archive upgrade gates passed; exact registry-version consumption awaits publication | Establish the upgrade receipt and apply it in a separate runtime upgrade PR: verify candidate SHA-256 and actual build identity, update exact dependency/lockfile and archive provenance, then run public types, clean installation, production, browser, deployment, isolation and saved-file/export comparisons. Repeat against the exact registry version after engine publication; same version text alone does not prove identical package contents. |
| ALPHA-04 / P2 | Complete; PR #14 merged, emitted dependency gate and both workflows pass | Split Player and Studio startup so Player no longer statically imports the editor/document/graph implementation. Share internal runtime-client, preview, controls, files/export and latest-request modules. Extract focused editor responsibilities only as needed. Verify the built Player dependency graph and both workflows, preserving byte transport, explicit GPU lifecycle and bounded freshness. No new repository, UI package, framework, command bus or plugin platform. |
| ALPHA-05 / P2 | Exploratory trial deployed and ordinary workflow passed; 0 human results, owner collects feedback; new candidate deployment and registry consumption pending | Deploy the qualified production candidate for a small trial; record URL, product/runtime identity and support limits. Observe whether users independently create, connect, repair errors, undo, save and reopen. Record participant count, task outcomes, assistance and blockers without treating agent screenshots as human validation. Prioritize the next batch from actual feedback. |

## Verification tiers and candidate receipt

Keep the existing lightweight/heavy split. Every change runs:

```bash
npm run check
```

Package loading, pixels, input boundaries or lifecycle changes require real browser checks; entry or deployment changes also require normal production deployment verification:

```bash
npx playwright install chromium
npm run test:browser
npm run test:deployment
```

The current `Product checks` workflow runs check/browser/deployment gates, not the full seven-case 1K Studio comparison. Current browser/deployment harnesses use controlled launch flags. Clearing `MIXTURE_BROWSER_ARGS` does not remove Playwright's hardcoded unsafe/blocklist flags; these commands are not ALPHA-02 evidence. Use a separately recorded ordinary-browser session or implement and verify a dedicated configuration before making that claim.

Full saved-file qualification is mandatory for **runtime upgrades, material document serialization/saving changes and before an Alpha release candidate is accepted**. Routine documentation or CSS-only changes do not trigger that heavy comparison. Follow the existing [Studio qualification procedure](./studio-qualification.md):

```bash
npm run capture:studio -- /absolute/studio-downloads
npm run test:studio -- /absolute/native-reference /absolute/new-player-output
```

Between capture and Player execution, the engine prepares detached native references; after execution, it performs the frozen comparison. Passing `test:studio` alone does not prove native comparison passed. Retain seven 1K cases / 28 channels and unchanged tolerances. For isolated acceptance, use the existing macOS-only recipe after committing the product tree:

```bash
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture /absolute/native-reference
```

That engine path identifies the checkout denied to child processes, not an imported product dependency. The recipe is not a Windows isolation implementation; a Windows isolation claim requires its own verified procedure.

Each candidate receipt must bind: product revision and clean state; runtime version, producer revision/clean state, build ID, tarball SHA-256, lockfile identity and measured `getBuildInfo()`; fixture and saved-byte digests; dimensions, overrides, channels, plan/PNG/comparison results; actual browser/version, OS, adapter, all flags; exact checks, failures, unresolved limits and evidence locations. Keep transient outputs ignored and preserve historical receipts. Local checks, remote CI, ordinary-browser qualification and release status remain separate fields.

The [vendor update procedure](../vendor/README.md) is the entry point for archive changes. After npm publication, a clean consumer must install the exact published version and repeat these gates with recorded registry integrity/build identity before treating it as the delivered candidate.

## Sequence and exit criteria

1. Complete ALPHA-01 and keep current status consistent in both languages while the engine closes candidate-package CI. Prepare ALPHA-03 receipts and begin ALPHA-02 on the existing archive in parallel.
2. Consume the identified engine candidate through ALPHA-03; complete ALPHA-02 against that candidate. Any ALPHA-04 change included in the release must precede its final qualification.
3. Freeze the product/runtime pair, qualified default environment, known limits and change notes. Close required PR checks and the full cross-consumer gate before declaring an Alpha candidate ready.
4. After the separate npm release action, verify the exact registry version in Studio. After the separate hosting decision, deploy that qualified product and execute ALPHA-05; record feedback before choosing new capabilities.

Do not start M6 or advanced Studio work by default. New nodes, subgraphs, resource containers, a second pixel backend, zero-copy GPU interoperability, a general optimizer, full 3D previews, marketplace and collaboration remain deferred. Publishing Rust crates, native installers or an embedded Player package is not a prerequisite for this browser Alpha.

This phase closes only with enforced integration rules, a traceable and fully qualified candidate, at least one successful ordinary desktop environment, exact published-version consumption and a recorded external trial. Until publication/trial scope is decided, report candidate readiness separately rather than marking delivery complete.

The explicitly agreed [historical-runtime exploratory trial](./external-trial.md) is now live on GitHub Pages; the [P2 receipt](./evidence/alpha-p2/README.md) records entry separation and a passing hosted ordinary workflow. The owner handles recruitment and feedback. This scoped trial does not waive ALPHA-03, registry consumption or human-result gates.
