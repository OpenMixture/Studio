# 首条浏览器链路 — 2026-09-12

[English](./README.md) | 简体中文

**已通过：从干净的独立产品检出运行的 6 项真实 Chromium 浏览器测试。** 本记录覆盖 M5-01／M5-02／M5-03 的首条链路，不代表完整 M5 验收。消费者只安装已提交的 npm 归档；安装、构建和测试命令不需要 Rust 或引擎检出。

受测产品提交为 [`6139c9141e67db1c9d01396e477a5b604791ec56`](https://github.com/OpenMixture/Studio/commit/6139c9141e67db1c9d01396e477a5b604791ec56)。之后保存本记录的提交并非受测提交。归档来自干净的引擎提交 [`4b914feb9f3365d292b27ea60c5e0b6004f745e8`](https://github.com/OpenMixture/OpenMixture/commit/4b914feb9f3365d292b27ea60c5e0b6004f745e8)。[构建来源](../../../vendor/runtime-build.json)和 [summary.json](./summary.json)绑定归档 SHA-256、源码／锁文件身份、夹具、环境及保留文件。归档本体保存在 `vendor/`，尚未发布到 npm。

## 已记录检查

在 macOS 26.5.1（25F80）、Darwin 25.5.0、arm64、Node 24.20.0、npm 11.19.0 和 Chromium 153.0.8010.12 上，干净消费者于 2026-09-12 的 08:30:44–08:31:02 UTC 运行以下命令。全部命令退出码为零；浏览器测试 6 项通过、0 项失败、0 项跳过。

```bash
npm ci
npm run check
npm run test:browser
```

浏览器使用 `channel: chromium`、无头执行，以及显式参数 `--enable-unsafe-webgpu` 和 `--ignore-gpu-blocklist`。资源从 `/player/` 加载。参见[命令记录](./checks.json)、[逐项测试结果](./browser-results.json)和[实际运行时上下文](./runtime-context.json)。

| 门槛 | 观测结果 |
|---|---|
| 导入与 CPU 边界 | 导入不获取 WASM；禁止 GPU 访问时仍可验证、读取目录及检查计划。原始重复键、数字 token、非法 UTF-8 和请求检查均遵守公开契约。 |
| 包加载 | 默认包内相对 URL、显式 WASM URL 和调用者提供的字节均可在 `/player/` 下加载；缺失 WASM 返回结构化错误。 |
| 像素与所有权 | 原样 65 × 3 baseColor 棋盘格的全部 780 个 RGBA8 输出字节均与独立预期字节一致，后续渲染及销毁后仍一致。带填充的映射数据为 2,304 字节；调用后的跟踪存活字节为零。 |
| 原生语义 | 浏览器与[原生 CLI 计划](./native-plan.json)哈希完全一致：`sha256:9995360fbeec3cc3cb4d78b7a660eef4ed0e630f1816161454dc80c9b58c0585`。[原生来源记录](./native-plan-provenance.json)保存其独立的干净源码及命令。 |
| 生命周期 | 并发渲染以 busy 拒绝；执行中销毁可收敛；销毁后的调用失败，自有输出仍有效。 |
| 产品交互 | 用户文件字节可验证并渲染为真实画布像素；显式销毁保留预览。合成的 persisted `pagehide` 回归验证真实 `GPUDevice.destroy`、恢复初始化控件及再次成功渲染，不代表实际进入 bfcache。 |

## 预览与证据边界

不含契约测试页面的正常生产包在 256 × 256 下渲染了棋盘格。[截图记录](./screenshot.json)绑定源码／构建、时间、参数和计划。代理已检查图中的棋盘格、控件及布局；不声明用户材质验收或视觉验收。

![首个 Player 的真实棋盘格预览](./player-preview.png)

浏览器报告 `BrowserWebGpu`，但隐藏了适配器名称、厂商／设备及驱动信息，因此不推断硬件型号。获取上下文中的 `unverified` 保留为原始获取报告；之后的成功渲染单独记录。这是带显式参数的单一主机／浏览器配置，不是浏览器支持矩阵或生产支持承诺。

三材质／浏览器设备丢失验证、完整 Player 控件／导出／调度和 Studio 编辑仍未完成。本站点托管与 npm 发布不属于本检查点。截图、包、夹具、精简结果和必要上下文保存在 Git；完整标准输出／错误及 Playwright 完整报告属于被忽略的本地运行输出，不承诺每一份原始日志均永久可用。复现会产生新的运行。
