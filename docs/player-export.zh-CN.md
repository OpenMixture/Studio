# Player PNG 导出——M5-04

[English](./player-export.md) | 简体中文

打开 `.mix` 文件或材质样例，初始化 WebGPU、渲染、修改公开参数并选择预览通道。点击 **Download channel PNG**，按实际渲染尺寸保存该通道。文件名包含经过清理的源文件名、通道和尺寸，例如 `wood-normal-128x128.png`。其他通道逐个选择并下载。

只有最新成功且仍对应当前设置的预览可以下载。修改参数／尺寸、更换源、无效输入、最新请求失败或页面退出后，需重新渲染成功才能导出。PNG 压缩期间请求发生变化，会丢弃待下载结果。成功显式释放 GPU 后，当前消费者像素仍可下载。编码错误显示在下载按钮旁并允许重试。“Download started”表示文件已交给浏览器，最终保存由浏览器控制。

## 像素与元数据契约

`src/png.ts` 直接编码返回的通道字节，不读取画布。输出非隔行 8 位 RGBA PNG，使用 filter 0 行、浏览器 `CompressionStream('deflate')` 和带 CRC 的数据块。不新增依赖或语义渲染器。Alpha 保持非预乘和线性，包括透明像素的 RGB 值。显示缩放不改变导出尺寸或样本。

| 运行时编码 | PNG 元数据 | 像素处理 |
|---|---|---|
| `rgba8-srgb`——baseColor、emissive | `sRGB` intent 0 和 `gAMA` 45455 | 保留已编码的 sRGB RGB，不再次应用传递函数。 |
| `rgba8-linear`——标量及法线通道 | `gAMA` 100000，无 `sRGB`／ICC profile | 保留数值字节，不做 gamma 转换或法线重新归一化。 |

这些数据块遵循 [W3C PNG 规范](https://www.w3.org/TR/png-3/)。目标应用仍需将数据纹理作为线性数据导入；元数据不能控制所有导入器的设置。PNG 保存运行时 RGBA8 输出，不是内部浮点纹理或保存后的 `.mix` 文档。产品保留一个当前通道和一个正在进行的导出；过期画布不可下载。临时对象 URL 在下载启动后或页面退出时撤销。

## 验证

```bash
npm run check
npm run test:browser
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture
```

九项 Node 测试包含独立 PNG 数据块／CRC／zlib 解码，覆盖所有字节及 alpha 值、无效输出和文件命名。浏览器测试以 128 × 128 验证三个上传的材质：修改公开参数、选择 baseColor／normal／roughness／height、预览并下载。每份解码 PNG 都必须与独立调用已安装运行时的结果一致。下载前清空画布以证明导出独立于画布。另在 65 × 3 下下载全部八个通道编码。受控压缩延迟／失败验证过期下载抑制、页面退出及重试入口。已有测试覆盖不支持 GPU、无效源／覆盖、真实设备丢失和快速编辑。

macOS 隔离步骤禁止访问两个原始仓库，并从 PATH 移除 Rust。保留干净已测修订、未变更归档摘要、运行时上下文、解码测量及选定 PNG／截图。这些检查验证有界 Player 流程；M5-05 原生／浏览器 1K 比较、压力与浏览器 CI 已在[浏览器验收](./browser-qualification.zh-CN.md)记录的矩阵内通过。更广兼容性仍未获验证。不包含包发布、网站部署或 Studio 编辑。
