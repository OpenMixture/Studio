# Studio 跨消费者验收 — STUDIO-05

[English](./studio-qualification.md) | 简体中文

验收链记录真实 Studio 界面下载，在引擎仓库准备分离的原生 CLI 数据包，将确切字节交给独立 Player 打开，再把其 1K PNG 返回引擎侧比较。产品仅导入已安装公开运行时；验收时不构建 Rust，也不读取引擎源码。运行时归档与依赖不变。

## 复跑

从干净已提交的产品工作树和全新输出目录开始。捕获使用正常生产 Studio 入口。比较运行器使用独立 Player 入口执行文件打开、切换通道和 PNG 下载。仅 CPU 的公开运行时测试页检查全通道计划；单通道 Player 计划和 PNG 来自真实 Player 界面。

```bash
npm run capture:studio -- /absolute/studio-downloads
npm run test:studio -- /absolute/native-reference /absolute/new-player-output
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture /absolute/native-reference
```

捕获与 Player 执行之间，使用引擎侧独立的[原生准备与比较流程](https://github.com/OpenMixture/OpenMixture/blob/codex/studio-qualification/docs/studio-qualification.zh-CN.md)。仓库边界只传递分离数据。隔离命令识别 Studio 参考包，在常规检查／浏览器／部署门槛后执行同样的 Player 验收，拒绝访问两个源工作区，并移除 Rust。

## 固定矩阵

七个用例覆盖新建棋盘格（4 × 8），以及默认与创作后的陶瓷（16 × 16 砖块）、皮革（细节 1）和木材（重复 16）。通过 Studio 控件设置创作参数，并保存额外公开绑定。基线保留原样例字节。所有请求的预览覆盖均为空，使用 1024 × 1024 的 baseColor/normal/roughness/height。记录源与夹具来源、计划哈希、归档／构建身份、浏览器／系统／适配器／启动参数及下载 PNG。

引擎在测量前以 `6bee22d` 冻结标准：现有 M5 逐通道容差、三组材质不变的默认／变体结构与因果规则，以及精确的棋盘格／默认通道结构。不放宽原生 golden 或容差。新材质或环境范围需独立证据。

保留绑定源码的结果前，验收仍待完成。此流程不发布包、不将应用部署公网，也不验收未测试浏览器／硬件。
