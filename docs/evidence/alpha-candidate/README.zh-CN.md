# 运行时候选验收 — 阻塞，2026-09-17

[English](./README.md) | 简体中文

**候选未获验收。** Studio 流程和契约检查通过，但必需的七用例原生像素比较失败。[升级 PR #12](https://github.com/OpenMixture/Studio/pull/12)保持草稿，main 保留之前已验收的 vendor 归档。没有为取得通过而改变容差、golden、材质源码或渲染像素。本次测量不能证明差异由候选引入。

## 关联身份与通过项

- 产品捕获、普通流程及受控保存文件执行：升级分支 `a7e2ba8b20bd72748488883aa30a50414b4578c4`；回执分别记录创作与 Player 修订。
- 干净运行时／原生生产者：`7b1cec4ad1d42d6269ef6a9912c2e8ba3a2dfdd9`；build ID `sha256:3a038bcb699327652e56ee3797dbfdc4cbe507125101e06ae3584f41fdebd014`；归档 SHA-256 `88f22ac295c3a1cc6bee2e995ed1e4683ca6669026167e4731ee10564f30d48c`。未发布包版本仍为 `0.1.0-alpha.0`。
- [生产者回执](./producer-candidate.json)来自[引擎 CI 35112153338](https://github.com/OpenMixture/OpenMixture/actions/runs/35112153338)的 `chromium-material-matrix` artifact。候选已安装元数据、锁文件完整性及实际浏览器 `getBuildInfo()` 一致，本次尝试排除了误测旧包的歧义。
- 使用 Node 24.20.0/npm 11.19.0，干净 `npm ci`、`npm run check`（20 项测试、类型、生产构建）、[52 项受控浏览器测试](./browser-summary.json)及[正常生产部署](./deployment.json)通过。受控 Windows Chromium 为 153.0.8010.12，参数为 `--enable-unsafe-webgpu`、`--ignore-gpu-blocklist` 加 Playwright 默认参数。
- [普通 Chrome 153.0.8010.48 回执](./ordinary.json)在 Windows 11 build 26100 上通过完整 Studio → 保存 `.mix` → 独立 Player 流程。启动参数仅用于配置目录／CDP／空白页连接。检查了 128 × 128 创作棋盘格像素、四通道 PNG 编码、历史、修复、保存／重开和释放。单独注入的 GPU 不可用探针通过，不是自然不支持主机的证据。该流程结果不能覆盖下方 1K 质量失败。

## 冻结七用例比较

真实界面[下载](./authored.json)的字节原样交给引擎独立原生准备和 Player。[原生 manifest](./native-manifest.json)、[Player 回执](./player-windows.json)及[完整比较](./comparison-windows.json)关联源摘要、计划、请求及输出摘要。原生准备在候选修订的独立干净引擎 worktree 中运行，使用 DX12/NVIDIA GeForce GT 1030、驱动 32.0.15.8266。产品 npm 安装和验收不导入或编译引擎源码。

七个全通道计划及 28 个单通道计划／结构检查全部通过；**像素比较 21/28 通过，12 个逐字节一致**。以下七个通道超出冻结门槛，最大绝对差异均为 1：

| 用例 | 通道 | 变化像素数 / 1,048,576 | 允许变化比例 |
|---|---|---:|---:|
| leather / default | normal | 21 | 0.00002 |
| leather / authored | normal | 28 | 0.00002 |
| wood / default | baseColor | 740 | 0.00001 |
| wood / default | height | 18 | 0.00001 |
| wood / default | normal | 30 | 0.00002 |
| wood / authored | baseColor | 654 | 0.00001 |
| wood / authored | height | 14 | 0.00001 |

平均误差限制同样适用，完整比较记录了全部测量。冻结标准摘要为 `sha256:3a896e4239014097d6e5353b1571a90c2ce4f0cec2ab9c7a4dc561785ce127b9`，容差摘要为 `sha256:f01533c2311e32319c37338126a20f8089957e770e221424c46b10263c40b627`。保留并目视检查了[原生木材](./wood-default/native-baseColor.png)和 [Player 木材](./wood-default/player-baseColor.png)，但视觉相似不能授权将失败数值门槛改为通过。

引擎在 [PR #12](https://github.com/OpenMixture/OpenMixture/pull/12) 中有相关普通浏览器失败记录。产品结果是独立实测，该链接仅提供背景，不替代本次比较，也不是已证明的根因。升级关闭前需要引擎侧数值调查及重新验收的候选；不能通过重写产品像素或放宽标准补偿。

## 隔离消费者执行

[隔离回执](./isolation-linux.json)、[执行摘要](./isolation-execution.json)、[确切本地启动步骤](./isolation-recipe.sh)和[沙箱内命令](./isolation-checks.sh)记录了 Ubuntu 26.04.1 LTS / WSL2 `6.18.33.2-microsoft-standard-WSL2` 中 Bubblewrap 文件系统内的全新独立克隆。沙箱挂载消费者、分离原生数据、Node 和 OS 库，不挂载两个源码检出或主机 home／Windows 挂载。直接读取两个检出路径失败，且 `cargo`／`rustc` 不存在。网络保持可用以安装包；这是文件系统隔离，不是网络隔离。

已核对 Node 24.20.0 Linux 归档 SHA-256 为 `2f2c0da162318f0de47665410c7c8c2ed3d36c8f3105de4bbc61176c70a7cbf2`。在沙箱外安装缺失的 Chromium OS 库后，全新运行通过 `npm ci`、`npm run check`（20 项测试）、全部 52 项真实浏览器测试、正常部署及七用例 Player 执行。[隔离 Player 回执](./player-isolated-linux.json)记录 Chromium 153.0.8010.12、显式 SwiftShader 参数以及名称／vendor／device 隐藏的 CPU 类型 BrowserWebGpu 适配器。这是受控 Linux／WSL 验证，不是原生 Windows 或普通浏览器证据。

随后[隔离输出比较](./comparison-isolated-linux.json)针对同一冻结 Windows DX12 参考的像素通道通过 12/28，计划和结构检查全部通过。这个额外跨环境测量同样失败，不替代主要 Windows 比较。隔离执行门槛已完成，完整质量门槛未完成。保留的步骤使用本次确切本地路径和浏览器缓存；复现需要全新路径、分离参考、锁定 Node 归档及 Chromium OS 依赖。

## 复现与保留范围

检出已测产品候选并使用全新输出目录：

```bash
npm ci
npm run check
npm run test:ordinary -- chrome work/ordinary-new
npm run capture:studio -- work/studio-downloads-new
```

在候选修订的独立引擎检出中，将 `MIXTURE_GPU_BACKEND` 设为 `dx12` 以复现本 Windows 参考：

```bash
node scripts/browser-runtime/prepare-studio.mjs /absolute/native-new 7b1cec4ad1d42d6269ef6a9912c2e8ba3a2dfdd9 /absolute/studio-downloads-new
```

随后在产品运行，再由引擎比较：

```bash
npm run test:studio -- /absolute/native-new /absolute/player-new
cargo xtask studio-material-check /absolute/native-new /absolute/player-new
```

最后一条必须在引擎检出运行，对本次实测失败返回非零。`MIXTURE_TEST_PORT` 可选择空闲服务端口，不改变渲染。完整临时原生／Player PNG 和日志仍在忽略的本地输出目录；保留的回执、原生 manifest 内源字节、完整比较及代表 PNG 支持评审，不表示全部临时输出已持久归档。Registry 消费仍以引擎未来发布为前提；未执行发布或公网托管。
