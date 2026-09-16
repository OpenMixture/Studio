# Studio MVP 验收 — 2026-09-16

[English](./README.md) | 简体中文

**STUDIO-01 至 STUDIO-05 在记录的 macOS 环境内通过。** 实现与本地工程验收至此完成；叠加的产品 PR 仍需独立集成。这不代表包发布或公网部署。

干净产品源码 `160d6d0f16d26193296b6e3f8798989d46bd7022` 捕获真实 Studio 下载并通过隔离验收。引擎原生准备／比较使用 `4764c3bf7099c49f8d3acca903af3db444467084`，在标准冻结 `6bee22d` 后执行。后续文档／证据提交不替代这些已测源码身份。运行时归档不变。

## 结果与来源

- [创作回执](./authored.json)绑定界面操作、样例摘要、保存字节摘要及产品修订。[保存源码](./sources/)保留棋盘格及默认／创作后的陶瓷、皮革、木材。三份默认文件与原样例逐字节相同；创作值和新增公开绑定以普通材质源码传递，不含预览覆盖。
- [隔离执行](./isolation.json)：拒绝访问源工作区、Rust 不可用，真实包安装、20 项 Node 测试／类型／构建、52 项浏览器测试、正常静态部署及七个独立 Player 用例均通过。
- [Player 回执](./player.json)：七个用例 × 四个 1024 × 1024 通道，确切保存输入、全通道公开检查及实际单通道 Player 计划／下载。引擎工作区不是产品依赖。
- [比较结果](./comparison.json)：规范化计划、结构／接缝、因果、非退化、高度／法线关系及冻结的 M5 容差全部通过。26/28 个解码通道逐字节一致；只有两项木材粗糙度存在最大 1 的差异，处于冻结门槛内。
- [部署](./deployment.json)验证正常生产 Player 与 Studio、编辑后保存／重开、真实 GPU 像素、WASM MIME 及测试页缺失。
- [摘要](./summary.json)记录实际源码／构建／浏览器／系统／适配器策略。原生为 Apple M5 / Metal；浏览器为 Darwin 25.5.0 arm64 上的 Chromium 153.0.8010.12，使用 unsafe-WebGPU/blocklist 参数且适配器身份被隐藏。不据此推断浏览器硬件身份或更广支持。

[引擎验收](https://github.com/OpenMixture/OpenMixture/blob/codex/studio-qualification/docs/evidence/studio-qualification/README.zh-CN.md)保留原生／Player 数据包全部 88 个逻辑文件、56 张全分辨率通道 PNG、七张比较图及损坏拒绝探针。既有 M5 资源直接引用，不作修改。代理检查了全部比较图及实际 [Player 截图](./player.png)。普通重复日志／构建树仍为临时内容；验收内容保留在 Git。复跑见[验收指南](../../studio-qualification.zh-CN.md)。

## 范围与剩余决策

本次验收覆盖记录的 macOS 保存文件矩阵及保留的生命周期／编辑／历史／保存／部署测试。标准回归 CI 按实际 PR head 单独报告，不证明未执行的 Linux／Windows／Safari／Firefox／移动端 Studio 1K 矩阵。下载检查点表示启动下载，撤销历史仅在会话内保留。运行时发布、公网部署、额外支持矩阵及引擎 M6 仍需独立决策。历史证据和原生 golden 未改写。
