# P2 入口拆分与探索性部署

[English](./README.md) | 简体中文

**ALPHA-04 已完成。探索性试用已部署，普通浏览器流程通过；真人反馈待回收。** 用户选择 GitHub Pages，并负责招募／回收反馈。这不关闭 ALPHA-03，也不宣称 Alpha 候选通过验收。

## 已交付版本

- [试用任务卡](https://openmixture.github.io/Studio/trial.html)、[Studio](https://openmixture.github.io/Studio/studio.html)、[Player](https://openmixture.github.io/Studio/) 与[反馈表](https://github.com/OpenMixture/Studio/issues/new?template=trial-feedback.yml)。
- 产品 `b7d91fee0c45abc6c11c4967e2bc27e9874f514d`，经 [PR #14](https://github.com/OpenMixture/Studio/pull/14) 集成。[PR 检查](https://github.com/OpenMixture/Studio/actions/runs/35183001766)及[主分支精确提交检查](https://github.com/OpenMixture/Studio/actions/runs/35183220067)的两项必需检查均通过。主分支保护保持生效。
- [GitHub Pages 部署](https://github.com/OpenMixture/Studio/actions/runs/35183401419)成功。构建时间：`2026-09-17T04:50:33.803Z`。[deployment.json](./deployment.json)保留运行时身份、Git／原始锁文件摘要及全部 15 个部署资产的摘要。公开 [trial.json](https://openmixture.github.io/Studio/trial.json)标识线上版本；后续文档提交不会自动重部署。
- 历史 `@openmixture/runtime@0.1.0-alpha.0`，引擎 `4b914feb9f3365d292b27ea60c5e0b6004f745e8`，生产者干净，build `sha256:759549793271c7fdd257b0289dab11b2fa9524dbc500b5033cb717179f5d1243`，归档 SHA-256 `9e245578de160cee1050259ef34358c3fcd3353a21bbb1672d29701bc1ac8084`。归档、依赖及材质序列化实现均未修改。

## 验证

| 检查 | 实际结果 |
|---|---|
| `npm run check` | 公开类型、20 项单元测试及生产构建通过。 |
| 构建入口依赖图 | [entry-bundles.json](./entry-bundles.json)记录本地试用构建的产物传递／动态依赖图。Player 排除 Studio 入口／编辑器、文档、源图、图视图及历史模块。每次构建强制检查该边界。预览／运行时／控件／文件／PNG／最新请求模块继续内部共享。 |
| `npm run test:browser` | 本地和必需 CI 的 52 项真实 Chromium 检查通过。本地 Chromium 153.0.8010.12 使用现有受控 unsafe-WebGPU／blocklist 参数；CI 另加 SwiftShader。这些不属于普通浏览器结论。 |
| 生产托管路径 | `/player/` 与 `/Studio/` 均通过 Player／Studio 生产渲染、PNG、编辑、保存重开及布局检查；契约测试页不存在。部署工作流上传前重做 `/Studio/` 验证。 |
| 线上普通浏览器 | [ordinary-hosted.json](./ordinary-hosted.json)：干净检出部署提交；Windows 11 build 26100、Chrome 153.0.8010.48、NVIDIA GeForce GT 1030、驱动 32.0.15.8266。完成于 `2026-09-17T05:12:40.224Z`。实际启动只有新配置目录、CDP 和 about:blank 参数，已对照进程及浏览器命令行核实。 |
| 线上流程 | 核对全部 15 个资产摘要及产品／运行时／锁文件身份。新建／编辑／无效草稿修复／撤销／重做／断开／重连通过。128 × 128 checker 精确像素、四种 PNG 编码、未修改／保存重开字节相等、独立 Player 通道相等及显式释放通过。无页面错误。 |
| GPU 不可用 | 单独注入 `navigator.gpu` 不可用，获得错误诊断且保留图／编辑／保存能力。这不是自然不支持环境，也不是渲染通过。 |
| 试用任务卡 | 检查七项双语任务、相对入口链接及 390px 下无横向溢出。[trial.png](./trial.png)是本地任务卡证据；[studio.png](./studio.png)及[player.png](./player.png)来自线上普通浏览器会话。 |

首次线上尝试因验证器将服务器原始 LF 示例与 Windows CRLF 副本比较而失败，未发生产品保存损坏。成功运行使用单独干净 clone，设置 `core.autocrlf=false` 并运行 `npm ci`，保留部署示例的精确字节。另一次尝试在 TLS 建连阶段、流程开始前失败，重试后通过。验证器后续修正为对照实际托管示例及其部署摘要，继续要求精确字节相等，不规范化用户数据。一次停滞的可选 artifact 下载已停止；部署／CI 链接和线上回执保留为证据。

按[试用命令](../../external-trial.zh-CN.md#已同意的交付范围与命令)复现。线上回执由部署提交中的验证器生成。后续仅修改远端示例比较和文档，不修改已部署产品。

## 试用交接与限制

实际外部参与者：**0**。实际真人反馈记录：**0**。用户使用[任务卡和结果标准](../../external-trial.zh-CN.md)负责邀请及回收。建议 3–5 人及退出条件仍是目标。Agent／浏览器自动化不计为真人验证，不宣称已有基于反馈的功能排序。

本次是明确限定范围的历史运行时探索性试用。不宣称新的七个 1K 原生验收或 registry 发布。[候选升级 PR #12](https://github.com/OpenMixture/Studio/pull/12)在冻结像素失败后继续保持草稿。合格 Alpha 交付及 ALPHA-05 关闭仍需要候选门槛和真实参与者结果。
