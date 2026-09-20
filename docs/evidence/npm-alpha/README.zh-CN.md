# 准确 npm Alpha 消费 — 2026-09-20

[English](./README.md) | 简体中文

Studio `87ded9351e1c426e03aa7fb2b4c641f32399b85b` 安装公开注册表准确版本 `@openmixture/runtime@0.1.0-alpha.0`。仅修改 `package.json` 及运行时锁文件条目。归档 SHA-256 仍为 `a9bcfe8d849f9fb9982a750dd99d026807fdf6453b5be491deeda90e99a2c6ae`；构建 ID 仍为 `sha256:94f9cc455fcd5f805942b0196b39a276782ce0e504772c3a140ea8ad85814a28`。保留的 vendor 夹具不是安装回退路径。

[注册表回读](./registry-readback.json)、[Windows 安装文件哈希](./windows-install.json)及[隔离 Linux 安装](./linux-install.json)绑定实际软件包。完整[引擎负责的发布及消费证据](https://github.com/OpenMixture/OpenMixture/tree/main/docs/evidence/npm-alpha)保留浏览器／部署报告、七用例／28 通道比较、普通 Chrome 编辑／保存／Player／导出证据，以及复用 ALPHA-04 像素的复现方法。

Windows 和隔离 Linux 均通过干净安装、公开类型、20 项单元测试、生产构建、52 项浏览器测试、生产部署及七个保存文件用例／28 个原生比较。普通 Windows Chrome 另通过完整编辑／导出流程。新运行复用 ALPHA-04 创作输入及原生参考；Player 针对注册表安装重新执行。像素不变。Linux 沙箱无法访问源码检出或 Rust。固定 Node `24.20.0`、npm `11.19.0` 及受控 Chromium `153.0.8010.12`；普通浏览器／适配器细节见链接回执。

正常安装使用 `npm ci`；验证运行 `npm run check`、`npm run test:browser`、`npm run test:deployment` 及[产品计划](../../studio-alpha.zh-CN.md)中的完整保存文件比较流程。注册表 `alpha` 和 `latest` 当前均指向此预发布版：npm 在认证后以 HTTP 400 拒绝移除 `latest`。准确依赖锁定避免标签歧义。不声称稳定版、更广支持、产品发布或托管试用重新部署。既有 GitHub Pages 试用仍使用记录中的历史运行时。
