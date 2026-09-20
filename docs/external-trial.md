# Small external trial

English | [简体中文](./external-trial.zh-CN.md)

**Status: accepted npm Alpha deployed; human feedback pending.** [Studio](https://openmixture.github.io/Studio/studio.html), [Player](https://openmixture.github.io/Studio/) and the [task card](https://openmixture.github.io/Studio/trial.html) now use the accepted npm `0.1.0-alpha.0`. The [current deployment receipt](./evidence/pages-npm/README.md) binds the exact version and passing live ordinary-browser workflow. The [original P2 receipt](./evidence/alpha-p2/README.md) is historical. No human task result is recorded yet; ALPHA-05 remains open.

## Before inviting participants

The product owner selects the hosting destination and recruits **3–5 external desktop users** who did not implement the editor. This is a proposed sample size, not a participant count. Do not send invitations or publish participant information without authorization. A maintainer records the qualified product commit, runtime receipt, public HTTPS URL, deployed asset digests, deployment check and ordinary-browser result before starting. ALPHA-03 and exact registry consumption have passed; the user has authorized deployment of that accepted npm version. Retain the recorded support limits and collect real participant outcomes before closing the trial.

Use a normal desktop browser without unsafe-WebGPU, blocklist bypass or forced software-adapter flags. Historical evidence includes Windows 11 build 26100, Chrome 153.0.8010.48 and NVIDIA GT 1030; it does not establish broad browser support. The accepted runtime has separate recorded seven-case/1K native comparison evidence. Record each participant's actual OS, browser version and adapter. GPU failures are outcomes, not successful rendering. Start at 128 × 128; a larger resolution is optional and recorded separately.

The host must serve both production entries and package-relative WASM over HTTPS with the correct MIME type. The normal build uses `/player/`; serve `dist/` at that prefix. Do not deploy the `browser-test` build. A different host prefix must be built and verified explicitly. Local `vite preview` and green controlled-browser CI are not an external deployment.

## Participant task card (about 20 minutes)

Open the supplied **Studio** link. Try the tasks independently first; record any help, confusion or failure. Use a sample or non-confidential material. Feedback submitted on GitHub is public. The product adds no feedback telemetry; share only the observations and files you choose to disclose.

| Task | Intended outcome |
|---|---|
| T1 · Create | Create a new material, find the node controls and add a checker node. |
| T2 · Connect | Connect the checker output to the material base-color input; obtain a valid graph. |
| T3 · Edit and repair | Change a checker parameter. Enter an incomplete/invalid value, find the diagnostic, then repair it. |
| T4 · Undo/redo | Undo the last valid change and redo it; describe whether the graph and values match expectations. |
| T5 · Preview/export | Explicitly initialize WebGPU, render at 128 × 128, switch channels and download a PNG. If GPU initialization fails, record its diagnostic and continue with saving. |
| T6 · Save | Save the material as a `.mix` file. Save layout separately if desired; record where the browser put the downloads. |
| T7 · Independent reopen | Open the supplied **Player** link in a new tab, load that downloaded `.mix`, initialize and render. Compare the chosen channel with Studio, then dispose the GPU in both tabs. Reopen the `.mix` in Studio and check the graph. |

Report each task as **independent / assisted / failed / not attempted**, with approximate duration and the exact point of difficulty. Visual matching is user feedback, not a substitute for the native pixel gate. Stop if you would need to expose private material. Report diagnostics without uploading the material itself.

## Feedback and observation

Use the [trial feedback form](https://github.com/OpenMixture/Studio/issues/new?template=trial-feedback.yml). It becomes available after the template is integrated into main. A participant may instead send the same fields directly to the person who invited them; an observer can transcribe the response only with permission. Do not count CI runs, agent sessions or maintainer demonstrations as external participants.

The observer assigns anonymous IDs (P01, P02, …), records task outcomes before providing assistance, and notes the precise help supplied. Keep names/contact details out of the repository. Link only consented, anonymized evidence. Record unsuccessful participants as well as successful ones.

| Receipt field | Required value before claiming completion |
|---|---|
| Deployment | HTTPS Studio and Player URLs, deployment time, product commit and asset digests |
| Runtime | Exact version, archive/registry integrity, engine revision, build ID and qualification link |
| Scope | Exploratory or qualified Alpha; measured environments and remaining limits |
| Participants | Invited / started / completed counts and anonymous observation records |
| Outcomes | Per-task independent / assisted / failed / not attempted counts; denominators include all starters |
| Follow-up | Ranked issues with reproduction, frequency, severity and evidence; owner and next action |

Proposed exit criteria: at least three external users attempt the task card; at least two complete creation through saving and reopening independently; every blocker has a reproducible report and an owner. These are trial targets, not measured success rates. If a target is missed, record it and prioritize the observed blocker before expanding capabilities. Never infer feedback from screenshots or invent rankings before responses arrive.

## Current result

Actual participants: **0**. Actual external task observations: **0**. Deployment and its ordinary workflow are verified; recruitment and feedback remain pending; candidate and registry consumption gates have passed. No feedback-derived feature priority has been selected. The next product batch will be chosen from recorded observations; the previous candidate failures remain historical evidence.

## Agreed delivery scope and commands

The owner selected GitHub Pages and will invite participants and collect feedback. The user subsequently requested the **accepted npm Alpha version** on the same host; it remains a prerelease user trial. The deployed root is `https://openmixture.github.io/Studio/`; Studio is `studio.html`, and the bilingual task card is `trial.html`. The current deployment evidence confirms availability and the live ordinary workflow. The manual `Exploratory trial deployment` workflow runs only on main, requires both product checks on that exact commit, verifies the accepted npm lock identity, installed file hashes, actual build identity and emitted WASM, verifies the production `/Studio/` build, and emits `trial.json` with product/runtime identity and asset digests. It does not deploy automatically after unrelated changes.

```bash
npm run build:trial
```

For local deployment checks, set `MIXTURE_TEST_BASE=/Studio/` and run `node scripts/verify-deployment.mjs`. For live ordinary Windows qualification, set `MIXTURE_ORDINARY_URL=https://openmixture.github.io/Studio/`, check out the deployed commit cleanly, and run `node scripts/verify-ordinary.mjs chrome /absolute/new-output`. The verifier checks the deployment identity and every declared asset digest before exercising both workflows.
