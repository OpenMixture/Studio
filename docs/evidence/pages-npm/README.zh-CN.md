# GitHub Pages npm Alpha 部署 — 2026-09-20

[English](./README.md) | 简体中文

**已验收的 npm 运行时现已上线。** [Studio](https://openmixture.github.io/Studio/studio.html)、[Player](https://openmixture.github.io/Studio/) 和[任务卡](https://openmixture.github.io/Studio/trial.html)沿用原地址。本次替换 [P2](../alpha-p2/README.zh-CN.md) 记录的历史运行时部署。真人试用结果仍待回收。

## 身份与集成

- 产品：`c0b0e104f520f946a7e7fa3c02f1de8674c9adc6`，经 [PR #18](https://github.com/OpenMixture/Studio/pull/18) 合并。必需的 [PR 检查](https://github.com/OpenMixture/Studio/actions/runs/35498895159)与[主分支检查](https://github.com/OpenMixture/Studio/actions/runs/35499025888)通过。
- [部署运行 35499173820](https://github.com/OpenMixture/Studio/actions/runs/35499173820)通过。构建时间：`2026-09-20T08:18:39.534Z`。[deployment.json](./deployment.json)保留全部 15 个资产摘要、产品／锁文件身份、实际运行时构建及 registry 版本／URL／完整性。线上 [trial.json](https://openmixture.github.io/Studio/trial.json)标识部署快照；后续仅文档更新不会重部署。
- 精确 npm `@openmixture/runtime@0.1.0-alpha.0`，引擎 `82b74707b2a8a998190e2f28b16f91fb9614486a`，build ID `sha256:94f9cc455fcd5f805942b0196b39a276782ce0e504772c3a140ea8ad85814a28`，归档 SHA-256 `a9bcfe8d849f9fb9982a750dd99d026807fdf6453b5be491deeda90e99a2c6ae`。

部署门槛核对精确 npm 依赖及锁文件来源／完整性、对照[注册表验收](../npm-alpha/README.zh-CN.md)的全部 12 个已安装包文件摘要、实际公开 `getBuildInfo()` 及构建出的 WASM 摘要。本地负向探针确认修改构建 WASM 后会被拒绝，随后已恢复原字节。vendor 归档仅用于身份对照，不作为安装回退。

## 验证与限制

干净 `npm ci`、`npm run check`（类型、20 项测试、生产构建）、`npm run build:trial` 及 `/Studio/` 生产部署流程通过。必需 CI 通过 52 项浏览器测试及生产部署检查；发布工作流上传前再次验证精确托管前缀。本次部署未修改运行时依赖、渲染器、材质保存或夹具。保留已完成的 Windows／隔离 Linux 七用例／28 通道[注册表验收](../npm-alpha/README.zh-CN.md)，不将其描述为本次新执行的原生矩阵。

[ordinary-hosted.json](./ordinary-hosted.json)记录成功的线上会话，结束时间为 `2026-09-20T08:20:16.801Z`：干净检出部署提交；Windows 11 build 26100；普通 Chrome 153.0.8010.48。浏览器／进程启动命令行仅含 profile／CDP／about:blank 参数，无 GPU 覆盖参数。完整适配器及驱动信息保留在回执中。全部 15 个托管资产摘要及产品／运行时身份一致。

新建／编辑／无效草稿修复／撤销／重做／断开／重连、128 × 128 checker 精确像素、四种 PNG 编码、未修改源字节保留、保存重开、独立 Player 通道相等及显式 GPU 释放均通过，无页面错误。单独注入的 GPU 不可用探针保留 CPU 编辑和保存；不代表自然不支持环境或渲染成功。

从部署提交复现，设置 `MIXTURE_ORDINARY_URL=https://openmixture.github.io/Studio/` 后运行：

```bash
node scripts/verify-ordinary.mjs chrome /absolute/new-output
```

本次是记录环境内的预发布试用，不代表广泛浏览器支持或真人可用性验收。目前仍有 **0 名已记录外部参与者、0 份真人反馈**。用户按[试用流程](../../external-trial.zh-CN.md)负责招募和回收。
