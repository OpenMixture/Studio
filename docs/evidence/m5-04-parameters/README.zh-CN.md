# M5-04 参数与预览——2026-09-14

[English](./README.md) | 简体中文

**通过：参数／预览切片，23 项 Chromium 检查和六项 Node 调度／快照测试。** 干净的已测产品提交：`ec7a98ac6e14f9d34eaa9606e32cff6ff0fced92`。后续证据提交不是已测源码。[摘要](./summary.json)绑定未变更运行时归档、源码／夹具／锁摘要及保留内容。完整 M5-04 导出验收仍开放。

[隔离运行](./isolation.json)使用 macOS arm64、Node 24.20.0／npm 11.19.0、Chromium 153.0.8010.12，服务于 `/player/`，带 `--enable-unsafe-webgpu` 与 `--ignore-gpu-blocklist` 参数。macOS 沙箱拒绝读取两个原始检出；子进程 PATH 中无 Rust。安装、`npm run check` 与 `npm run test:browser` 均退出零。[运行时上下文](./runtime-context.json)记录实际限制和被隐去的适配器字段，不推断硬件身份。

| 门槛 | 观测结果 |
|---|---|
| 公开参数 | 整数／浮点及颜色／枚举控件使用已验证 Rust 元数据。验证后更新有效值；重置恢复源码／默认值。用户源码字节不变。 |
| 真实材质预览 | 釉面陶瓷、皮革和木材分别修改公开参数，在 128 × 128 下显示 baseColor、normal、roughness 和 height。十二张通道图像均与同一浏览器中独立调用公开运行时的结果逐字节一致。每个修改后的 baseColor 与初始图像不同；重置恢复初始图像。 |
| 最新请求 | 六项 Node 测试覆盖 1000 次替换、旧／重复完成、失效、最新失败、关闭和不可变快照。真实浏览器[新鲜度检查](./freshness.json)执行初始／被延迟／最新渲染，丢弃中间编辑，并在较新覆盖无效时保留最后显示图像。 |
| 失败与关闭 | 无效新文件清除旧绑定。真实设备丢失保留明确标为过期的预览。迟到文件读取不能替换新输入。真实设备获取被延迟时，重复 pagehide 会等待迟到设备销毁。不使用其他执行器。 |
| 布局与所有权 | 代理检查的桌面和 390px 截图显示参数值与材质预览，没有横向溢出。预览缩放仅用于显示。运行时与 shader 源码、原生 golden 和 vendor 归档未变更。 |

[测试结果](./browser-results.json)保留全部 23 项浏览器结果。逐材质测量：[陶瓷](./glazed-ceramic-preview.json)、[皮革](./leather-preview.json)、[木材](./wood-preview.json)。通过[参数指南](../../player-parameters.zh-CN.md)与[隔离步骤](../../m5-02-03.zh-CN.md)复现。

以下真实生产测试截图已由代理目视检查；这是产品界面评审，不是新的 golden 像素人工验收：

![木材参数预览](./wood-preview.png)

[釉面陶瓷](./glazed-ceramic-preview.png) · [皮革](./leather-preview.png) · [390px 木材布局](./wood-mobile.png)

PNG 导出／元数据验证、完整 M5-04 流程验收、M5-05 的 1K 原生／浏览器质量与正式浏览器 CI 仍开放。可控设备销毁和仅测试使用的 Promise 屏障不认证自发硬件故障。完整临时日志／原始 Playwright 报告不保留在 Git；关键结果、输入身份及截图保留。复现创建新的运行。本次不含发布或网站部署。PR／main CI 结果与绑定源码的本地回执分别记录。
