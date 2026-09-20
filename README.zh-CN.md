# OpenMixture Studio

[English](./README.md) | 简体中文

这是 OpenMixture 的独立产品仓库。**Player** 打开 `.mix` 源文件，从 Rust 元数据生成公开参数控件，显式初始化 WebGPU，并预览请求的材质通道、下载带正确标记的 PNG。[Studio 创作](./docs/studio-save.zh-CN.md)已实现图编辑、撤销／重做、公开绑定及独立材质／布局保存；已完成批次记录于 [Studio MVP 实施计划](./docs/studio-mvp.zh-CN.md)。

**Studio MVP：** STUDIO-01 至 STUDIO-05 已通过[记录的 macOS 验收](./docs/evidence/studio-qualification/README.zh-CN.md)，包括保存 `.mix` → 独立 Player → 原生 CLI 及七个 1K 用例。实现批次已[集成到 main](./docs/studio-integration.zh-CN.md)。发布及更广平台验收仍单独处理。

**下一阶段：** [Studio MVP 稳定化与外部试用](./docs/studio-alpha.zh-CN.md)由本仓库认领分支保护、普通浏览器验收、候选运行时升级验收、小范围入口整理及用户试用。当前候选包 CI 和 npm 发布仍为引擎侧依赖。[P1 证据](./docs/evidence/alpha-p1/README.zh-CN.md)记录已强制启用的主分支保护及历史归档在普通 Windows／Chrome 配置下通过的流程。[准确候选升级](./docs/evidence/runtime-alpha04/README.zh-CN.md)现已通过 Windows 与隔离 Linux 的七用例／28 通道比较、各 52 项契约及普通 Chrome 保存／Player／导出；旧候选失败保留为历史记录。高级编辑能力和 M6 继续暂缓。

引擎与 `@openmixture/runtime` 由 [OpenMixture/OpenMixture](https://github.com/OpenMixture/OpenMixture) 构建。本仓库消费 `vendor/` 中的真实运行时包，不编译 Rust，也不导入生产者源码。该包是尚未发布的本地 Alpha 归档，并非 npm registry 发行版。

**P2：** Player 与 Studio 已拆分启动模块；每次构建检查 Player 无法访问编辑器实现。[外部试用任务卡](./docs/external-trial.zh-CN.md)记录已同意的探索性范围：GitHub Pages 托管历史运行时版本，用户负责招募并回收真实反馈。此次仓库候选升级不会自动重新部署该试用；registry 消费与真人结果仍待完成。

## 运行

使用 **Node 24.20.0** 和 **npm 11.19.0**。`.nvmrc`、`packageManager`、精确依赖版本以及 `package-lock.json` 记录消费者工具链：TypeScript 5.9.3、Vite 8.3.0、Playwright 1.63.0。

```bash
npm ci
npm run dev
```

打开 Vite 输出的本地 `/player/` 地址。选择棋盘格、釉面陶瓷、皮革、木材或 `.mix` 文件，设置尺寸后点击 **Initialize WebGPU**，再点击 **Render**。之后参数和通道变更自动预览；**Reset parameters** 恢复源码／默认值。**Dispose GPU** 释放渲染器，同时保留已显示的预览。验证会加载 WASM，但不会获取 GPU。文件原始字节直接交给 Rust，源码显示内容不会经过解析和重新序列化后用于渲染。

渲染需要安全浏览器上下文与可用的 WebGPU。页面会报告初始化和渲染失败，没有其他像素执行器。仅导入模块不会获取 WASM 或请求 GPU。显式释放是已定义的生命周期测试路径；页面终止无法等待异步清理。

Studio 入口为 `/player/studio.html`，支持节点增删、连接／断开、参数编辑、诊断和共享预览。支持独立保存编辑后的材质与布局、撤销／重做及公开绑定创作。原文件下载不变。恢复与检查点边界见 [Studio 保存](./docs/studio-save.zh-CN.md)。

## 生产构建与检查

```bash
npm run check
npm run preview
```

打开 [http://127.0.0.1:4173/player/](http://127.0.0.1:4173/player/)。生产资源刻意使用非根路径 `/player/`，包括相对包路径解析的 WASM。静态主机需将 `dist/` 内容挂载到该路径，并提供正确的 JavaScript 与 `application/wasm` MIME 类型。`vite preview` 用于本地验证，不是生产托管服务。单独限定范围的[GitHub Pages 探索性试用](https://openmixture.github.io/Studio/trial.html)使用 `/Studio/`；其身份及普通浏览器结果记录于 [P2 证据](./docs/evidence/alpha-p2/README.zh-CN.md)。

`Product checks` 工作流包含类型／构建任务，覆盖干净 npm 安装、公开类型、20 项调度／请求快照／PNG／源图传输／布局／编辑命令测试及生产构建，另有独立 Chromium WebGPU 契约／部署任务。仅类型／构建成功**不代表** GPU 执行通过；浏览器任务不替代引擎材质比较。

运行真实浏览器验证：

```bash
npx playwright install chromium
npm run test:browser
```

测试命令构建额外包含独立契约页面的生产包，并从 `/player/` 提供服务。正常生产构建不包含该测试页面。测试使用 Playwright 锁定的完整 Chromium（`channel: chromium`），并传入 `--enable-unsafe-webgpu` 与 `--ignore-gpu-blocklist`。使用 `npm run test:browser:headed` 可显示浏览器。特定环境所需的附加启动参数可通过 JSON 字符串数组环境变量 `MIXTURE_BROWSER_ARGS` 传入；记录结果时需同时记录这些参数。WebGPU 不可用、获取失败或浏览器二进制缺失都会导致失败，绝不通过跳过渲染计为成功。

测试覆盖：

- 导入无加载副作用；禁止 GPU 访问时的目录、验证和执行计划检查；原始重复键、数值 token、无效 UTF-8 与无效请求。
- `/player/` 下真实包内 WASM 加载、显式 URL 和字节加载，以及缺失资源的结构化错误。
- 65 × 3 的真实棋盘格像素、紧密排列的回读、后续渲染和销毁后独立像素仍可用、忙状态拒绝以及渲染中释放。
- 用户文件输入、可见验证错误、实际画布像素及释放后保留预览。

报告、浏览器上下文和构建证据、失败 trace 写入被忽略的 `test-results/`。存在测试命令不代表其已在某个环境通过。发布结果时保留准确的浏览器、操作系统、适配器与构建记录。包含可控真实设备丢失的 M5 验收已按实测矩阵记录在[浏览器验收](./docs/browser-qualification.zh-CN.md)；更广兼容性和自发硬件故障仍未获验证。

[2026-09-12 浏览器检查点](./docs/evidence/browser-start/README.zh-CN.md)保存 6 项真实浏览器测试通过结果、干净生产者／消费者修订、归档摘要及实际上下文。

## 运行时归档与样例

归档边界与更新流程见 [vendor/README.md](./vendor/README.md)。提交的归档和锁文件允许仅凭本产品检出安装，无需引擎检出或 Rust。产品和测试代码仅从公开运行时包导入引擎。

[棋盘格样例](./public/samples/checker.mix) 从引擎示例原样复制；[来源与摘要](./public/samples/README.md) 随文件记录。它是普通 `.mix` 输入，不是 TypeScript 节点实现。测试使用精确的黑白棋盘格哨兵值。

## 当前边界

[M5-04 参数／预览切片](./docs/player-parameters.zh-CN.md)增加元数据驱动控件、通道选择、明确的过期预览，以及一个活动渲染加一个可替换最新待处理请求。渲染期间仍可编辑。[PNG 导出流程](./docs/player-export.zh-CN.md)补齐 M5-04 产品实现。M5-05 已在记录矩阵内验收，见[浏览器验收](./docs/browser-qualification.zh-CN.md)。Registry 发布和公网托管分别决策。[Studio MVP](./docs/studio-mvp.zh-CN.md) 已交付图编辑、撤销／重做、公开绑定编辑和经过验证的材质保存。

贡献者应遵守成对的 [代理指南](./AGENTS.zh-CN.md) 和引擎的 [M5 计划](https://github.com/OpenMixture/OpenMixture/blob/main/M5_PRS.zh-CN.md)。同步维护产品行为与消费者文档，渲染语义由 Rust 持有。

扩展生命周期与隔离消费者步骤见 [M5-02／M5-03 验证](./docs/m5-02-03.zh-CN.md)。

[2026-09-14 M5-02／M5-03 本地验收](./docs/evidence/m5-02-03/README.zh-CN.md)记录 13 项 Chromium 检查通过、可控真实设备丢失、清理及隔离软件包消费。该检查点当时 M5-04／M5-05 仍开放；下方后续记录说明其在实测范围内的完成情况。

[2026-09-14 参数／预览证据](./docs/evidence/m5-04-parameters/README.zh-CN.md)记录干净隔离消费者、23 项浏览器检查、六项 Node 测试及已检查截图。

[2026-09-15 M5-04 导出验收](./docs/evidence/m5-04-export/README.zh-CN.md)记录 28 项浏览器检查、九项 Node 测试及 12 份独立解码的材质 PNG。

M5-05 工具、已记录验收及剩余兼容性限制见[浏览器验收](./docs/browser-qualification.zh-CN.md)。

[M5-05 产品证据](./docs/evidence/m5-05/README.zh-CN.md)记录隔离执行、正常静态部署及通过的浏览器 CI；引擎材质比较单独记录。
