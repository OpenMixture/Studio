# Studio MVP 集成记录

[English](./studio-integration.md) | 简体中文

## 已合并批次 — 2026-09-16

STUDIO-01 至 STUDIO-05 已集成到产品 main 分支。Studio PR 按依赖顺序合并：#6（基础／只读图）、#7（基础编辑）、#8（历史／绑定／保存），最后 #9（保存文件验收）。每个后续 PR 都在前置批次合并后将基线改为 main。使用合并提交保留原始审查及实测源码身份。

| PR | Head | Merge | CI |
|---|---|---|---|
| [Studio #6](https://github.com/OpenMixture/Studio/pull/6) | `986a0e99e9c4ed67c8bcca8fc12e04e03ee1675f` | `b7e0ec19202aaac5aee09a7268e731389b98f0f6` | [35053091886](https://github.com/OpenMixture/Studio/actions/runs/35053091886) |
| [Studio #7](https://github.com/OpenMixture/Studio/pull/7) | `8977dff9726bbeff6b713a476ed7b1fec26d0167` | `e7fa79d12c10e629af15ad84b2367a18e1c00823` | [35054712064](https://github.com/OpenMixture/Studio/actions/runs/35054712064) |
| [Studio #8](https://github.com/OpenMixture/Studio/pull/8) | `59ab2dfd7954a26de2baf09e482bb23165112dce` | `48ef619afc7aa4a2a9f41e3e4f09d274cca63bdf` | [35058441595](https://github.com/OpenMixture/Studio/actions/runs/35058441595) |
| [Studio #9](https://github.com/OpenMixture/Studio/pull/9) | `b48f06c6b7bd7eac87029fd90e0c8019105e1fe2` | `e6adb7b0e28e8ae1080088a95c15cb0cf5707cab` | [35077365903](https://github.com/OpenMixture/Studio/actions/runs/35077365903) |

表中所有 PR head 的产品检查均在合并前通过。每次合并后的 main 文件树均与该批次已审查 head 一致；没有通过冲突处理修改实现。中间的 push 检查可能被仓库并发策略取消，不计为成功运行。最终实现 main 的检查为 [35079191767](https://github.com/OpenMixture/Studio/actions/runs/35079191767)，绑定 `e6adb7b0e28e8ae1080088a95c15cb0cf5707cab`。后续文档提交有各自的检查。

[引擎 PR #9](https://github.com/OpenMixture/OpenMixture/pull/9) 在产品 #9 之前合并：head 为 `036d6be42491f5430bd4e7a80b40ec7fcc17bd27`，合并提交为 `c41fcfbd47915669859a09cfd4adbe6c76b7df4a`。其 main 文件树也与已审查 head 一致。实时分支规则要求 Linux／macOS／Windows 检查及固定 SwiftShader 材质／包检查；合并前均已通过，未绕过规则。运行时包和浏览器材质检查也已通过。产品 main 没有生效的分支规则，但每次合并前仍核对了现有两项检查。

引擎集成检查入口：[三平台检查](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039568)、[GPU 回归](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039571)、[浏览器包](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039647)、[浏览器材质](https://github.com/OpenMixture/OpenMixture/actions/runs/35079039662)。这些运行绑定上述引擎合并提交；其记录结论与合并前检查分别查阅。

## 审查与验收边界

审查覆盖投影前的原始字节准入、数字 token 传输、Rust 权威验证、图与布局分离、有界历史及渲染调度、无效／过期结果抑制、保存／打开失败恢复，以及分离的原生／Player 来源记录和冻结门槛。未留下阻塞集成的实现问题。README 中将历史、绑定和编辑后保存描述为未来工作的过期说法已在两种语言中修正。

[保存文件证据](./evidence/studio-qualification/README.zh-CN.md)仍绑定原始可执行修订：七个 1K 用例、28 个通道通过，26 个逐字节一致，两个木材粗糙度通道在预先冻结的容差内。新增 Studio 保存文件矩阵仅覆盖 macOS；多平台回归 CI 不扩大该验收范围。历史证据保持不变。Registry 发布、公网托管、更广验收和 M6 仍需单独决策。
