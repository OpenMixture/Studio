# Studio 只读图视图验证——2026-09-16

[English](./README.md) | 简体中文

干净产品源码 `de4d18d` **通过本地隔离验收**：12 项 Node 测试、公开类型检查／生产构建、35 项真实 Chromium 浏览器用例，以及 Player 和 Studio 正常部署。[隔离回执](./isolation.json)记录完整源码修订和成功命令，两个原始检出均被禁止读取，PATH 中没有 Rust。后续纯证据提交不是已测实现。[摘要](./summary.json)绑定保留文件、包／锁身份及环境。

未变更的 `@openmixture/runtime@0.1.0-alpha.0` 归档在 macOS Darwin 25.5.0 arm64、Node 24.20.0、npm 11.19.0、Playwright 1.63.0、Chromium 153.0.8010.12 上运行，使用 `--enable-unsafe-webgpu` 和 `--ignore-gpu-blocklist`。[运行时上下文](./wood-context.json)记录 BrowserWebGpu limits 和适配器字段；适配器名称／驱动被隐藏，因此不推断硬件身份。不声称新增 registry／公网托管或更广硬件／浏览器验收。

## 已观察结果

- [35 项浏览器用例](./browser-results.json)通过，其中七项为 Studio 用例。四个源图无需获取 GPU 即可查看。覆盖合法未连接节点、确切数值文本、目录详情和 Rust 拒绝损坏原始输入。
- 键盘移动、拖动、平移／缩放、独立伴随文件加载／保存、不匹配／损坏布局、取消丢弃未保存布局、迟到读取及窄屏页面溢出检查通过。原文件下载保持逐字节一致。390px 视口检查不代表移动浏览器／GPU 验收。
- [陶瓷](./glazed-ceramic-measurements.json)、[皮革](./leather-measurements.json)和[木材](./wood-measurements.json)的四个 128 × 128 通道，独立运行时、画布及解码 PNG 像素摘要全部匹配。这些消费者检查不替代 M5 原生／浏览器 1K 比较。
- [正常静态部署](./deployment.json)加载两个生产入口和具有正确 MIME 的真实 WASM，渲染／下载棋盘格，下载确切原文件，并验证测试页面返回 404。这是本地静态部署，不是公网网站发布。
- 代理已检查保留的木材和窄视口截图。源编辑、创作序列化、撤销／重做、绑定编辑和 STUDIO-05 跨消费者创作验收仍属后续工作。

![木材源图与预览](./wood-studio.png)

[窄视口](./studio-narrow.png) · [正常生产入口](./deployment.png)

复现使用[图视图指南](../../studio-graph.zh-CN.md)和[隔离步骤](../../m5-02-03.zh-CN.md)。普通日志／完整 trace 保持临时状态；保留回执和测量描述此次运行。远端 PR／CI 集成单独报告，并须针对最终提交检查。
