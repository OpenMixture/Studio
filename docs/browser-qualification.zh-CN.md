# 浏览器验收——M5-05

[English](./browser-qualification.md) | 简体中文

**已记录验收——2026-09-15：** M5-05 已在 macOS／Linux Chromium 矩阵内通过。[产品证据](./evidence/m5-05/README.zh-CN.md)记录执行／隔离／部署；[引擎验收](https://github.com/OpenMixture/OpenMixture/blob/c03c7b4/docs/evidence/m5-05/README.zh-CN.md)记录冻结后的 1K 比较、CI 身份及剩余限制。这些是绑定源码的历史结果，不是新运行的 CI。Registry 发布和公网托管分别决策。后续产品工作遵循 [Studio MVP 计划](./studio-mvp.zh-CN.md)。

产品消费单独生成的原生参考数据包，不读取引擎检出。引擎负责准备及质量比较，产品负责通过已安装运行时执行浏览器渲染。清单携带源码字节、变体及计划哈希。`test:materials` 要求新的输出目录，并在保留 PNG 前检查运行时生产者修订、源码摘要和计划哈希。全部 11 个既有用例以 1024 × 1024 运行，另外对三种默认材质执行四轮创建／渲染／销毁（12 次渲染）。每轮保留一个 4 MiB 通道直到后续渲染及销毁完成；描述符存活字节必须为零，流水线条目不超过九个。这不测量物理 GPU 内存。

```bash
npm run test:materials -- /absolute/native-reference /absolute/new-browser-output
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture /absolute/native-reference
```

使用引擎文档化的浏览器材质命令准备参考包、比较返回的 PNG。隔离脚本可选的第二个参数会在浏览器执行前，将参考包复制到两个被禁止读取的检出之外。参考包是测试数据，不是引擎依赖；回执记录其清单摘要。

两套浏览器测试均通过 `scripts/static-server.mjs` 在 `/player/` 下提供构建后的 `dist/` 文件，明确提供 WASM MIME。普通生产构建不含测试契约页面。这是本地静态部署检查，不是公开网站发布。缺失资源或不可用 WebGPU 均失败。CI 锁定 Ubuntu 24.04、Node/npm、Playwright 及对应 Chromium 修订；在已有 unsafe-WebGPU／blocklist 参数之外，通过 `--use-angle=swiftshader` 和 `--use-webgpu-adapter=swiftshader` 选择 Chromium 自带 SwiftShader。浏览器提供适配器信息时保留确切值；软件设备是显式选择，不是语义回退。

浏览器 CI 任务不会把未执行的材质比较视为通过。校准和冻结容差后的验收是独立引擎步骤。链接的验收记录已在实测矩阵内满足 CI 与隔离比较门槛；新运行时版本或环境需要各自证据。不包含 registry 发布、公开托管或 Studio 编辑。

`npm run test:deployment` 另构建不含测试页面的正常生产入口，在静态部署下验证真实渲染／下载、WASM MIME 及测试页面返回 404。该步骤纳入隔离验收和浏览器 CI。
