# 准确运行时候选升级 — 2026-09-20

[English](./README.md) | 简体中文

**候选归档升级门槛通过。** 此次关闭引擎 ALPHA-04 对 Studio ALPHA-03 候选消费的依赖；两个 ID 分属不同仓库计划。准确 registry 版本消费、发布、重新部署及真人试用结果仍待完成，现有 Pages 试用仍使用记录中的历史运行时。

干净 Studio 执行修订 `6b2d53e3de16b21725b2a4359a2263f98671a6f9` 安装干净引擎 `82b74707b2a8a998190e2f28b16f91fb9614486a` 归档。版本仍为未发布的 `0.1.0-alpha.0`，构建 ID 为 `sha256:94f9cc455fcd5f805942b0196b39a276782ce0e504772c3a140ea8ad85814a28`，SHA-256 为 `a9bcfe8d849f9fb9982a750dd99d026807fdf6453b5be491deeda90e99a2c6ae`。[生产者](./producer.json)与[实际构建探针](./build-probe.json)绑定交付字节，混入历史 WASM 会被拒绝。仅 vendor 归档、构建回执与 runtime 锁完整性改变。后续文档提交不是执行修订。

引擎材质 CI 已在[运行 35489430243](https://github.com/OpenMixture/OpenMixture/actions/runs/35489430243)认证这份准确字节。产品随后重新执行 `npm ci`、`npm run check`（20 单元测试、公开类型及生产构建）、52 项受控浏览器测试、正常部署、真实 Studio 下载捕获、原生准备及独立 Player PNG 导出。Windows 和文件系统隔离 Linux／WSL 均通过冻结 v2 规则下全部七个 1K 用例／28 通道。各有 12 个通道精确，其余 16 个最大分量差异为 1，最大局部偏差为 0.0078125。精确棋盘、plan、材质结构、因果及高度／法线关系均通过。升级中未修改阈值、运行时源码、fixture 或原生 golden。

- Windows：Chromium 153.0.8010.12，记录的测试参数，Windows 11 build 26100。[52 项契约](./windows-browser-summary.json)、[部署](./windows-deployment.json)、[Player 身份](./windows-player.json)、[完整比较](./windows-comparison.json)。
- 普通 Chrome 153.0.8010.48：[回执](./ordinary.json)验证仅 profile／CDP／空白页启动参数，新建／编辑／修复／撤销／重做／保存／重开，Studio 与独立 Player 四通道 PNG 字节及编码，释放，以及独立注入 GPU 不可用的 CPU 编辑探针。
- Linux／WSL2：[隔离](./isolation.json)禁止访问两个源码检出，不暴露 Rust 工具，npm 安装仍可联网。Chromium 153.0.8010.12 使用显式 SwiftShader 测试参数。[52 项契约](./linux-browser-summary.json)、[部署](./linux-deployment.json)、[Player 身份](./linux-player.json)、[完整比较](./linux-comparison.json)。这不是普通 Linux 浏览器支持声明。

两环境均使用 Node 24.20.0、npm 11.19.0、Playwright 1.63.0。原生比较使用匹配干净引擎的 debug CLI、显式 DX12／NVIDIA GeForce GT 1030；浏览器隐藏的适配器身份保持不可用。Windows／Linux 原始锁摘要因换行符不同而不同，完整解析依赖图与归档完整性一致。

生产者保留[完整长期交付证据](https://github.com/OpenMixture/OpenMixture/blob/9521ca307af0a405059806fc1c0177ba4e8ade5b/docs/evidence/alpha-04/README.zh-CN.md)，包括归档、所有保存字节／原生参考／Windows／Linux PNG、联系图、哈希、恢复校验器、复现命令及首次本地环境失败。产品保留精简回执与有意提交的 vendor 归档，完整例行日志和编译产物为临时文件。[此前失败候选](../alpha-candidate/README.zh-CN.md)保留原始结果，由新候选替代交付，不将其改写为通过。未引入引擎源码导入、Rust 安装依赖、新渲染器或 M6 范围。
