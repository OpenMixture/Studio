# Alpha P1 产品验证 — 2026-09-17

[English](./README.md) | 简体中文

## 主分支保护与普通流程

[保护回执](./protection.json)记录已应用的 GitHub `main` 策略：必须通过 PR、两项现有 GitHub Actions 检查且严格保持最新，管理员也受约束，禁止强推／删除。不额外要求批准评审人数，采用最小 PR／检查策略。后续 PR 检查与集成另行记录。

[普通浏览器回执](./ordinary-baseline.json)针对产品 `e7c76874e2da0bd0343b8693410d7bc1e4869322`、历史运行时 `4b914feb9f3365d292b27ea60c5e0b6004f745e8`、归档 SHA-256 `9e245578de160cee1050259ef34358c3fcd3353a21bbb1672d29701bc1ac8084` 通过。使用 Node 24.20.0 与 npm 11.19.0。该结果不认证新的引擎候选。

实测环境：Windows 11 build 26100、已安装 Chrome 153.0.8010.48。系统 GPU 信息列出 NVIDIA GeForce GT 1030，驱动 32.0.15.8266；运行时适配器 name/vendor/device 字段被隐藏。保留的系统／上下文记录区分可用设备和运行时报告身份。实际 OS 和浏览器命令行仅包含新配置目录、本机 CDP 端口及 `about:blank`，无 GPU、软件适配器、headless 或安全覆盖参数。这是普通配置自动化检查，不是人类可用性测试。

正常生产入口已通过：未编辑原字节保存、新建材质、无效数值草稿与诊断、撤销／重做、修复、断开／连接、显式 GPU 初始化、128 × 128 的创作 4 × 8 棋盘格渲染、精确棋盘格像素、四通道 PNG 编码、保持字节的保存／重开、独立 Player 重开后四通道导出一致、显式释放。正常构建不包含契约测试页面，WASM MIME 类型正确。已捕获 [Studio](./studio.png) 与 [Player](./player.png) 截图。

[不支持截图](./unsupported.png)来自单独注入的 `navigator.gpu` 不可用探针。明确错误及图查看／编辑／保存继续可用的检查通过，不代表自然不支持设备已获认证。该流程回执不声明原生七用例比较或更广硬件／浏览器支持通过。

## 复现

提交产品工作区后，在 Windows 选择全新输出目录：

```bash
npm ci
npm run check
npm run test:ordinary -- chrome work/ordinary-new
```

使用 `edge` 选择已安装 Edge；其他可执行文件路径可直接传给 `node scripts/verify-ordinary.mjs`。验证器拒绝额外启动参数、将实际运行时身份与 `vendor/runtime-build.json` 对照、检查归档摘要，并在流程断言失败时写入未完成／失败回执。它使用独立临时服务端口，并将新浏览器配置保留在所选输出目录下。

受控检查仍单独执行：

```bash
npx playwright install chromium
npm run test:browser
npm run test:deployment
```

若端口 4173 被占用，将 `MIXTURE_TEST_PORT` 设置为 1024 至 65535 之间的空闲端口。所有验收脚本从自身服务器推导 URL。这只改变测试服务地址，不改变 GPU 配置。最初本地尝试遇到全局已安装 Chromium 无法启动；该启动失败不计为渲染。上述普通 Chrome 回执独立于该二进制。

候选升级、隔离及完整保存文件／原生比较仍是[当前计划](../../studio-alpha.zh-CN.md)中的独立门槛。本批不执行 registry 发布和公网托管。
