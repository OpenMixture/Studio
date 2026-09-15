# M5-04 Player 导出验收——2026-09-15

[English](./README.md) | 简体中文

**通过：有界 M5-04 Player 流程，28 项 Chromium 检查和九项 Node 测试。** 干净已测产品提交为 `c4fba3f3ca77d465ee1039768d404af063c1f71b`；后续证据提交不是已测源码。[摘要](./summary.json)绑定源码／输入摘要、未变更运行时归档身份及保留内容。M5-05 仍开放。

[隔离运行](./isolation.json)使用 macOS arm64、Node 24.20.0/npm 11.19.0、Chromium 153.0.8010.12，服务于 `/player/`，带 `--enable-unsafe-webgpu` 和 `--ignore-gpu-blocklist` 参数。macOS 沙箱禁止读取两个原始检出，子进程 PATH 中无 Rust。安装、`npm run check` 和 `npm run test:browser` 均退出零。[上下文](./runtime-context.json)记录实际浏览器／设备信息；被隐去的适配器字段不能证明硬件身份。

| 门槛 | 观测结果 |
|---|---|
| 三材质流程 | 上传陶瓷、皮革和木材；修改公开参数；在 128 × 128 下预览并下载 baseColor、normal、roughness 和 height。全部 12 份 PNG 解码后与独立调用公开运行时的字节完全一致。 |
| 编码 | 在浏览器外检查 PNG CRC、zlib 流、尺寸和原始 RGBA 样本。颜色文件含 sRGB intent 0/gAMA 45455；数据文件含 gAMA 100000，无 sRGB/profile。每次下载前清空画布，结果仍匹配运行时像素。九项 Node 测试包含全部字节／alpha 值及压缩期间的输入修改。 |
| 新鲜度与失败 | 快速修改、无效输入／覆盖及真实设备丢失保留过期预览，但禁用下载。延迟压缩在编辑或页面退出后不能触发下载。压缩失败显示错误并允许重试。 |
| 通道及生命周期 | 全部八通道在 65 × 3 下下载。显式释放 GPU 后，当前像素仍可下载。迟到文件／设备完成及有界渲染调度继续通过。 |
| 界面 | 代理检查了保留的桌面材质截图及 390px 导出截图，下载控件可见。长源文件名经过清理／截断，导出消息在窄屏换行。 |

保留全部 [28 项浏览器结果](./browser-results.json)。逐材质测量包含每份 PNG 摘要、原始像素摘要和元数据：[陶瓷](./glazed-ceramic-preview.json)、[皮革](./leather-preview.json)、[木材](./wood-preview.json)。12 份下载文件与测量一起保留，命名为 `<material>-<channel>.png`；[摘要](./summary.json)列出哈希及字节数。这些是产品导出证据，不替换引擎 golden。

![木材流程](./wood-preview.png)

[皮革](./leather-preview.png) · [陶瓷](./glazed-ceramic-preview.png) · [窄屏导出](./export-mobile.png)

通过[导出指南](../../player-export.zh-CN.md)及[隔离步骤](../../m5-02-03.zh-CN.md)复现。本验收覆盖所记录浏览器上的产品字节／元数据及有界流程，不建立原生／浏览器 1K 质量容差、正式浏览器 CI 矩阵、广泛硬件／浏览器兼容性、自发设备故障处理、部署或发布结论。这些仍属于 M5-05 或后续门槛。完整临时命令日志和 Playwright trace 不保留在 Git；上述选定内容与身份保留。PR／main CI 与这份本地干净源码回执分开记录。
