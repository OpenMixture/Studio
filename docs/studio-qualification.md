# Studio cross-consumer qualification — STUDIO-05

English | [简体中文](./studio-qualification.zh-CN.md)

The acceptance chain captures actual Studio UI downloads, prepares a detached native CLI bundle in the engine repository, opens those exact bytes in the independent Player, and returns its 1K PNGs to engine-owned comparison. The product imports only the public installed runtime; it does not build Rust or read engine sources during acceptance. Runtime archive and dependencies are unchanged.

## Reproduce

Start from a clean committed product tree and fresh output directories. The capture uses the normal production Studio entry. The comparison runner uses the independent Player entry for file opening, channel switching and PNG download. A CPU-only public-runtime harness checks the all-channel plan; individual Player plans and PNGs come from the actual Player UI.

```bash
npm run capture:studio -- /absolute/studio-downloads
npm run test:studio -- /absolute/native-reference /absolute/new-player-output
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture /absolute/native-reference
```

Between capture and Player execution, use the engine's separate [native preparation and comparison procedure](https://github.com/OpenMixture/OpenMixture/blob/codex/studio-qualification/docs/studio-qualification.md). Only detached data crosses the repository boundary. The isolation command detects a Studio reference bundle and runs the same Player qualification after normal check/browser/deployment gates, with both source checkouts denied and Rust absent.

## Fixed matrix

Seven cases cover the new checker (4 × 8), default and authored ceramic (16 × 16 tiles), leather (detail 1), and wood (repeat 16). Authored material values are set through Studio controls; an additional public binding is saved. Baselines preserve original sample bytes. All requests have empty preview overrides and use 1024 × 1024 baseColor/normal/roughness/height. Source and fixture provenance, plan hashes, archive/build identities, browser/OS/adapter/flags and downloaded PNGs are recorded.

The engine froze these criteria in `6bee22d` before measurements: existing M5 per-channel tolerances, unchanged default/variant structural and causal rules for the three material pairs, and exact checker/default-channel structure. No native golden or tolerance is relaxed. New material or environment coverage needs its own evidence.

Acceptance is pending until source-bound results are retained. This workflow does not publish packages, host the app publicly or qualify untested browsers/hardware.
