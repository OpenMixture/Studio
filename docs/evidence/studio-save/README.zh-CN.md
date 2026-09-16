# STUDIO-04 历史与保存证据 — 2026-09-16

[English](./README.md) | 简体中文

## 已测源码与结果

干净实现修订：`72565bd2abbff0c0aed6cef0d406e36b95ab2931`。后续仅证据提交不改变可执行源码。[PR #8](https://github.com/OpenMixture/Studio/pull/8)叠加在尚未合并的 STUDIO-03 PR #7 上；本地验收不代表合并或发布。远端检查针对确切 PR head 单独追踪，不与此已测源码混淆。

干净归档消费者通过隔离、安装、20 项 Node 测试、类型检查／构建、52 项 Chromium 用例及正常生产部署检查。沙箱拒绝访问原 Studio 和引擎工作区；PATH 中不存在 `cargo` 和 `rustc`。[隔离回执](./isolation.json)记录命令、源码归档、锁文件与运行时归档身份。运行时及依赖未更新。

```bash
npm run check
npm run test:browser
npm run test:deployment
node scripts/verify-isolated.mjs /Users/krapnik/Documents/OpenMixture
```

环境：Darwin 25.5.0 arm64、Node 24.20.0、npm 11.19.0、Playwright 1.63.0、Chromium 153.0.8010.12。启动参数：`--enable-unsafe-webgpu`、`--ignore-gpu-blocklist`。运行时报告 `BrowserWebGpu`，适配器名称／驱动被隐藏，不推断物理 GPU 身份。初始化上下文本身不作为执行证据：测试进行了真实渲染／读回、像素比较、设备丢失及读回暂停期间撤销。渲染不可用不会通过跳过计为成功。

## 保留的产物

- [摘要与摘要值](./summary.json)、[全部 52 项用例结果](./browser-results.json)和[生产回执](./deployment.json)。
- [棋盘格保存文件](./saved.mix)将 `checker.cellsX` 创作为 `4`，新增指向 `checker.cellsY` 的 `rows`。预览覆盖值 `12` 未写入。[匹配布局](./saved.mix.layout.json)记录位置、视口和确切保存字节摘要。
- [陶瓷](./saved-glazed-ceramic.mix)、[皮革](./saved-leather.mix)、[木材](./saved-wood.mix)：源于仓库原样例，分别新增指向 `tiles.colorA`、`grain.octaves`、`grain.scale` 的 `savedParameter`。木材先将源数值文本 `0.018` 替换为 `0.0180000000000000001`，保存／重开后保持不变。所有其他 JSON 值均与源比较；重开后下载与首次保存文件逐字节相同。原样例来源仍见[样例说明](../../../public/samples/README.zh-CN.md)。
- [撤销新鲜度](./undo-freshness.json)：三次真实读回（初始、暂停的编辑后渲染、恢复源码渲染）；撤销期间阻止导出，恢复后的像素与初始一致。
- 已检查[保存流程截图](./studio-save.png)与[生产截图](./deployment.png)。前者在不获取 GPU 的情况下编辑；后者展示保存／重开的 65 × 3 棋盘格，经过真实渲染与显式释放。

恢复用例覆盖未完成文本、重复绑定、原子节点删除／撤销、材质／布局下载失败、模板创建与导入失败、取消新建／打开、无效布局保留及过期读取。指针拖动与参数输入合并为事务；Node 测试用缩小上限验证 100 命令机制。仅撤销布局会保留预览覆盖；材质编辑即使位置未变也会使附属布局身份过期。

## 限制

仅在记录环境内验收 STUDIO-04。成功启动下载是保存检查点，不代表磁盘写入已验证。历史仅在会话内保留。这不构成新的原生 1K 比较、广泛浏览器支持、npm 发布或公网部署。STUDIO-05 保存文件经独立 Player 与原生 CLI 的验收仍待完成；历史 M5 与 STUDIO-02/03 证据未改变。
