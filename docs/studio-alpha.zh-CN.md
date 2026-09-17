# Studio MVP 稳定化与外部试用

[English](./studio-alpha.md) | 简体中文

## 当前阶段与审查基线

这是依据 2026-09-16 两仓库审查制定的当前产品计划，审查基线为 Studio `5138afc`、引擎 `c41fcfb`。审查没有重新构建两个仓库，其远端 CI 和分支规则观察只描述当时快照，不代表重新核实后的当前设置。本次规划调整的本地 Studio 基线与 `5138afc` 一致。

Player M5 与 STUDIO-01 至 STUDIO-05 已实现并集成。[MVP 验收](./evidence/studio-qualification/README.zh-CN.md)覆盖记录的 macOS 环境、七个 1K 用例和 28 个通道；[M5 验收](./browser-qualification.zh-CN.md)保留自己的矩阵。运行时仍为未发布的 `@openmixture/runtime@0.1.0-alpha.0` vendor 归档。历史验收及该归档的绿色 CI 都不能证明新构建运行时、普通浏览器配置或公共交付已经通过。

下一阶段为 **Studio MVP 稳定化与外部试用**。[MVP 计划](./studio-mvp.zh-CN.md)保留为实施与架构记录，不重新开启已完成批次。本次仅落实仓库责任认领和验收门槛。原规划调整未执行这些事项。2026-09-17 后续工作已强制启用主分支保护，并针对历史归档通过普通配置流程，见 [P1 证据](./evidence/alpha-p1/README.zh-CN.md)。候选升级及其完整比较仍待完成。

## 责任与交接

| 负责人范围 | 认领内容 | 交接要求或边界 |
|---|---|---|
| Studio 仓库 | 主分支保护、产品状态文档、普通浏览器流程、运行时升级消费、小范围入口／模块整理、试用部署和用户反馈 | 保留确切产品／运行时身份及消费者证据；通过真实 PR 集成 |
| 引擎仓库 | 当前提交候选 tarball → 独立消费者 → 浏览器契约／材质 CI；生产者状态文档、包内容／类型／构建身份、npm Alpha 发布及必需检查 | 提供已审查 `.tgz`、版本、生产者修订／干净状态、build ID、SHA-256、变更说明和候选测试证据；本仓库不代为实现生产者 CI |
| 引擎 → Studio | 保存文件的原生参考／比较；候选包及后续 registry 精确版本消费 | 交换分离的保存字节／参考包／结果。原生准备和比较由引擎负责；产品不导入生产者源码、不依赖 Rust |
| 两仓库联合发行决策 | 目标桌面环境、候选身份、支持限制及发布／试用范围 | 引擎负责 npm 发布，Studio 负责产品部署。范围确定后分别执行交付动作 |

候选包浏览器 CI 是引擎侧 P1 依赖。可以保留固定消费者，但必须安装候选包，并将实际 `getBuildInfo()` 与候选身份进行断言。Studio 负责消费者侧适配和后续升级 PR；不能靠反复测试历史 vendor 归档关闭此依赖。保留冻结的材质标准和来源，不能重建基线掩盖候选失败。

## 产品认领批次

以下标识是规划 ID，不是 GitHub issue 或 PR 编号。“已认领”指仓库责任归属，不表示实现完成，也不代表已分配给具体个人。

| ID／优先级 | 状态／依赖 | 工作及完成门槛 |
|---|---|---|
| ALPHA-01／P1 | 保护已生效；后续记录 PR 集成证据 | 重新读取实时 `main` 保护／rulesets 和检查名称。要求 PR、`Typecheck and production build` 与 `Chromium WebGPU product contract` 通过，禁止 force push 和删除主分支。保留实际生效规则及后续 PR／检查证据。若权限或仓库策略阻止强制执行，记录阻塞；人工检查纪律不等于分支保护。 |
| ALPHA-02／P1 | 历史归档普通流程已通过；最终候选需重测 | 选择一个普通桌面环境；初始建议目标为 Windows 与稳定版 Chrome，确切 OS／浏览器／GPU 版本待实测。使用正常生产入口，不加 unsafe-WebGPU、绕过 blocklist 或强制软件适配器参数。完成初始化、打开／新建／编辑、修复无效草稿、撤销／重做、保存、独立 Player 重开、通道预览、PNG 下载及释放。GPU 不可用时仍可查看图／编辑并获得明确诊断。失败目标记录为不支持，不能算渲染通过；Alpha 至少需要一个实测成功的普通配置。 |
| ALPHA-03／P1 | 已认领；可先制定流程，执行依赖引擎候选包 | 建立升级回执，并在独立运行时升级 PR 中执行：核对候选 SHA-256 和实际构建身份，更新精确依赖／锁文件及归档来源，再运行公开类型、干净安装、生产构建、浏览器、部署、隔离及保存文件／导出比较。引擎发布后针对 registry 精确版本重做；仅版本文本相同不能证明包内容相同。 |
| ALPHA-04／P2 | 已认领；下次触及入口／编辑器编排时执行 | 分离 Player 与 Studio 启动，使 Player 不再静态导入编辑器／文档／图实现。共享内部 runtime-client、preview、controls、files/export 和 latest-request 模块。仅按需提取明确的编辑器职责。检查构建后 Player 依赖图和两个使用流程，保留字节传输、显式 GPU 生命周期与有界新鲜度。不新增仓库、UI 包、框架、command bus 或插件平台。 |
| ALPHA-05／P2 | 已认领；依赖合格候选及单独确定的试用范围 | 部署合格的生产候选用于小规模试用，记录 URL、产品／运行时身份和支持限制。观察用户能否独立完成新建、连线、修复错误、撤销、保存和重开。记录参与人数、任务结果、帮助情况与阻塞，不将 Agent 截图当成人类验证。依据真实反馈排列下一批工作。 |

## 验证分层与候选回执

保留现有轻重分层。每次修改执行：

```bash
npm run check
```

包加载、像素、输入边界或生命周期变化必须运行真实浏览器检查；入口或部署变化还需正常生产部署验证：

```bash
npx playwright install chromium
npm run test:browser
npm run test:deployment
```

当前 `Product checks` 工作流执行 check/browser/deployment 门槛，不包含完整七用例 1K Studio 对照。现有浏览器／部署工具使用受控启动参数。清空 `MIXTURE_BROWSER_ARGS` 不能移除 Playwright 中硬编码的 unsafe/blocklist 参数；这些命令不是 ALPHA-02 的证据。需单独记录普通浏览器会话，或先实现并验证专用配置后再作此声明。

**运行时升级、材质文档序列化／保存逻辑变化、Alpha 发行候选验收前**必须执行完整保存文件验收。日常文档或仅 CSS 修改不触发该重型对照。遵循既有 [Studio 验收流程](./studio-qualification.zh-CN.md)：

```bash
npm run capture:studio -- /absolute/studio-downloads
npm run test:studio -- /absolute/native-reference /absolute/new-player-output
```

在捕获和 Player 执行之间，由引擎准备分离的原生参考；执行后，由引擎完成冻结标准比较。仅 `test:studio` 通过不能证明原生比较通过。保留七个 1K 用例／28 个通道和原有容差。隔离验收在提交产品工作区后使用现有仅适用于 macOS 的步骤：

```bash
node scripts/verify-isolated.mjs /absolute/path/to/OpenMixture /absolute/native-reference
```

其中引擎路径用于标识对子进程禁止访问的检出，不是产品导入依赖。该步骤不是 Windows 隔离实现；Windows 隔离声明需要自己的已验证流程。

每份候选回执必须关联：产品修订及干净状态；运行时版本、生产者修订／干净状态、build ID、tarball SHA-256、锁文件身份及实测 `getBuildInfo()`；样例与保存字节摘要；尺寸、覆盖、通道、计划／PNG／比较结果；实际浏览器／版本、OS、适配器、全部参数；确切检查、失败、未解决限制及证据位置。临时输出保持忽略，保留历史回执。本地检查、远端 CI、普通浏览器验收和发布状态分别记录。

[vendor 更新流程](../vendor/README.md)是归档更新入口。npm 发布后，干净消费者必须安装精确发布版本，并记录 registry 完整性／构建身份、重新通过这些门槛，才能将其作为已交付候选。

## 执行顺序与退出条件

1. 完成 ALPHA-01，保持中英文当前状态一致，同时由引擎闭合候选包 CI。并行准备 ALPHA-03 回执，并先针对现有归档开展 ALPHA-02。
2. 通过 ALPHA-03 消费具有明确身份的引擎候选，对该候选完成 ALPHA-02。若本次发行包含 ALPHA-04，必须先完成修改再作最终验收。
3. 冻结产品／运行时组合、已验收默认环境、已知限制与变更说明。必需 PR 检查及完整跨消费者门槛通过后，才能声明 Alpha 候选就绪。
4. 独立执行 npm 发布后，Studio 验证 registry 精确版本。单独确定托管后部署已验收产品并执行 ALPHA-05；记录反馈后再选择新能力。

不默认启动 M6 或高级 Studio 工作。新节点、子图、资源容器、第二像素后端、零拷贝 GPU 互操作、通用优化器、完整 3D 预览、市场及协作继续暂缓。发布 Rust crate、原生安装器或可嵌入 Player 包不是本轮浏览器 Alpha 的前提。

本阶段仅在集成规则强制生效、候选可追踪且完整验收、至少一个普通桌面环境成功、精确发布版本消费及外部试用均有记录后关闭。发布／试用范围确定前单独报告候选就绪状态，不能将交付标为完成。
