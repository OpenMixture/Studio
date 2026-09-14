# OpenMixture Studio

[English](./README.md) | 简体中文

这是 OpenMixture 的独立产品仓库。**Player** 打开 `.mix` 源文件，从 Rust 元数据生成公开参数控件，显式初始化 WebGPU，并预览请求的材质通道。Studio 节点编辑功能后续再做。

引擎与 `@openmixture/runtime` 由 [OpenMixture/OpenMixture](https://github.com/OpenMixture/OpenMixture) 构建。本仓库消费 `vendor/` 中的真实运行时包，不编译 Rust，也不导入生产者源码。该包是尚未发布的本地 Alpha 归档，并非 npm registry 发行版。

## 运行

使用 **Node 24.20.0** 和 **npm 11.19.0**。`.nvmrc`、`packageManager`、精确依赖版本以及 `package-lock.json` 记录消费者工具链：TypeScript 5.9.3、Vite 8.3.0、Playwright 1.63.0。

```bash
npm ci
npm run dev
```

打开 Vite 输出的本地 `/player/` 地址。选择棋盘格、釉面陶瓷、皮革、木材或 `.mix` 文件，设置尺寸后点击 **Initialize WebGPU**，再点击 **Render**。之后参数和通道变更自动预览；**Reset parameters** 恢复源码／默认值。**Dispose GPU** 释放渲染器，同时保留已显示的预览。验证会加载 WASM，但不会获取 GPU。文件原始字节直接交给 Rust，源码显示内容不会经过解析和重新序列化后用于渲染。

渲染需要安全浏览器上下文与可用的 WebGPU。页面会报告初始化和渲染失败，没有其他像素执行器。仅导入模块不会获取 WASM 或请求 GPU。显式释放是已定义的生命周期测试路径；页面终止无法等待异步清理。

## 生产构建与检查

```bash
npm run check
npm run preview
```

打开 [http://127.0.0.1:4173/player/](http://127.0.0.1:4173/player/)。生产资源刻意使用非根路径 `/player/`，包括相对包路径解析的 WASM。静态主机需将 `dist/` 内容挂载到该路径，并提供正确的 JavaScript 与 `application/wasm` MIME 类型。`vite preview` 用于本地验证，不是生产托管服务。此次仓库引导不执行线上网站部署。

`Product checks` 工作流执行干净 npm 安装、公开类型检查、六项调度／请求快照测试和生产构建；它**不代表**浏览器 GPU 执行通过。

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

报告、浏览器上下文和构建证据、失败 trace 写入被忽略的 `test-results/`。存在测试命令不代表其已在某个环境通过。发布结果时保留准确的浏览器、操作系统、适配器与构建记录。更广泛的浏览器兼容、设备丢失覆盖和完整 M5 验收仍是独立的引擎及产品门槛。

[2026-09-12 浏览器检查点](./docs/evidence/browser-start/README.zh-CN.md)保存 6 项真实浏览器测试通过结果、干净生产者／消费者修订、归档摘要及实际上下文。

## 运行时归档与样例

归档边界与更新流程见 [vendor/README.md](./vendor/README.md)。提交的归档和锁文件允许仅凭本产品检出安装，无需引擎检出或 Rust。产品和测试代码仅从公开运行时包导入引擎。

[棋盘格样例](./public/samples/checker.mix) 从引擎示例原样复制；[来源与摘要](./public/samples/README.md) 随文件记录。它是普通 `.mix` 输入，不是 TypeScript 节点实现。测试使用精确的黑白棋盘格哨兵值。

## 当前边界

[M5-04 参数／预览切片](./docs/player-parameters.zh-CN.md)增加元数据驱动控件、通道选择、明确的过期预览，以及一个活动渲染加一个可替换最新待处理请求。渲染期间仍可编辑。PNG 导出、完整 M5-04 流程验收、M5-05 材质／CI 验证、Registry 发布与 Studio 编辑仍开放。

贡献者应遵守成对的 [代理指南](./AGENTS.zh-CN.md) 和引擎的 [M5 计划](https://github.com/OpenMixture/OpenMixture/blob/main/M5_PRS.zh-CN.md)。同步维护产品行为与消费者文档，渲染语义由 Rust 持有。

扩展生命周期与隔离消费者步骤见 [M5-02／M5-03 验证](./docs/m5-02-03.zh-CN.md)。

[2026-09-14 M5-02／M5-03 本地验收](./docs/evidence/m5-02-03/README.zh-CN.md)记录 13 项 Chromium 检查通过、可控真实设备丢失、清理及隔离软件包消费。M5-04／M5-05 仍开放。
