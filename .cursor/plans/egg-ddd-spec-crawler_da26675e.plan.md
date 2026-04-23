---
name: egg-ddd-spec-crawler
overview: 基于 Egg.js 按 DDD 分层实现“价格计算器 vs 购买页规格对比”服务，支持 Playwright 登录、按服务适配对比（首期 ECS）、定时任务与 HTTP 触发，部署在 Docker 环境。
todos:
  - id: egg-bootstrap
    content: 初始化 Egg.js+TS+Docker 项目骨架并配置基础插件/配置项
    status: completed
  - id: ddd-structure
    content: 搭建 Domain/Application/Infrastructure/Interface 分层结构与核心接口
    status: completed
  - id: calc-infra
    content: 实现 menuInfo/productInfo 调用与规格归一化（计算器侧）
    status: completed
  - id: playwright-ecs-infra
    content: 接入 Playwright 登录与 ECS 购买页规格抓取和归一化适配器
    status: completed
  - id: app-usecases-schedule
    content: 实现 RunSpecDiffService 用例、HTTP controller 与 schedule 定时任务
    status: completed
  - id: tests-and-ci
    content: 编写 Domain/Application/Infrastructure/接口层测试与 Docker 构建说明，确保覆盖率和可部署性
    status: completed
isProject: false
---

## 总体目标

- 使用 **Egg.js** 构建一个长期运行的服务，按 **DDD 分层**组织代码：Domain / Application / Infrastructure / Interface。
- 完成“价格计算器 vs 购买页规格接口”对比：
  - 先调用 `menuInfo` 获取产品及区域 → 再按 `urlPath+region` 调用 `productInfo` 获取规格（计算器侧）。
  - 使用 **Playwright** 浏览器登录，复用登录态请求各服务购买页的规格接口（首期只做 ECS）。
  - 以计算器侧 `resourceSpecCode` 为主键，与购买页侧适配出的 key 对比。
- 提供：
  - **HTTP 接口**（如 `/api/spec-diff/run`）可手动触发一次对比。
  - **定时任务**（Egg schedule）在 Docker 环境中按 cron 规则周期执行（每日固定时间），与 HTTP 触发复用同一应用服务逻辑。
- 配套 **完整测试用例**：Domain 层单测、Application 层服务测试、关键 Infrastructure 适配器的集成/契约测试。

## DDD 分层设计（DDD 独立目录 + Egg.js 入口目录）

你要求的落盘方式是：**DDD 四层集中放在根目录 `ddd/` 下**，Egg.js 仍保持其标准目录结构（`app/controller`、`app/router.ts`、`app/schedule` 等），Egg 只做“入口适配”，业务规则与用例编排都在 `ddd/`。

### 目录约定（推荐）

- **Egg.js 目录（保持一致）**
  - `app/controller`：HTTP 入口（薄控制器，只做参数校验与调用用例）
  - `app/router.ts`：路由
  - `app/schedule`：定时任务入口（只负责触发用例）
  - 可选：`app/extend/context.ts` 或 `app/extend/application.ts` 用于把 DDD 用例服务挂到 `ctx`/`app`（便于 controller/schedule 复用）
- **DDD 目录（新增）**
  - `ddd/Domain`：纯业务模型与规则，不依赖 Egg/axios/Mongo/Playwright
    - `ddd/Domain/calculator`：菜单与计算器规格领域对象（`CalcTarget(urlPath, region)`、`CalcSpec` 等）
    - `ddd/Domain/purchase`：购买页规格领域对象（`PurchaseSpec`、主键抽取策略等）
    - `ddd/Domain/comparison`：对比领域（`SpecDiff`、`DiffSummary`、`SpecComparator`）
  - `ddd/Application`：用例编排（不关心具体技术细节，通过接口依赖 `Infrastructure`）
    - `ddd/Application/services/RunSpecDiffService`：统一入口用例：menu → productInfo → normalize(calc) → playwrightLogin → fetchPurchase(ecs) → normalize(purchase) → compare → persist
    - 对外方法：`runOnce({ triggerType: 'manual'|'schedule' })`，供 HTTP 与 schedule 共用
  - `ddd/Infrastructure`：外部系统交互实现（HTTP、Playwright、Mongo、各服务购买页适配）
    - `ddd/Infrastructure/http`：axios client
    - `ddd/Infrastructure/calc`：menuInfo/productInfo client + normalizer
    - `ddd/Infrastructure/auth`：playwright 登录 client（产出可复用鉴权态）
    - `ddd/Infrastructure/purchase`：ECS 购买页 spec client + normalizer（首期仅 ECS）
    - `ddd/Infrastructure/persistence`：Mongo repository
  - `ddd/Interface`：DDD 视角的“接口适配层”（可选；用于 DTO/assembler/参数转换）
    - 说明：Egg 的 controller/schedule 仍放在 `app/`；`ddd/Interface` 主要放 DTO、输入输出装配器、错误映射等，让 controller 更薄

### 依赖方向（必须遵守）

- `ddd/Domain` 不依赖任何其他层
- `ddd/Application` 依赖 `ddd/Domain`，并依赖若干“端口接口”（由 Infrastructure 提供实现）
- `ddd/Infrastructure` 依赖 `ddd/Application`（端口接口定义）与 `ddd/Domain`
- `app/`*（Egg 入口层）依赖 `ddd/Application`（调用用例），不直接依赖 `ddd/Infrastructure` 的细节实现（由应用层组装/注入）

## Egg.js 工程结构与配置

- 按标准 Egg.js + TypeScript 项目初始化（可用 `egg-init` 或手动）：
  - `app/`：controller/router/schedule（保持 Egg.js 习惯目录，不在 `app/` 下放 DDD 四层）。
  - `ddd/`：新增 DDD 代码根目录（`Domain`/`Application`/`Infrastructure`/`Interface`）。
  - `config/config.default.ts` & `config/config.prod.ts`：
    - calculator API 基础配置（host、公共 query：`sign=common`、`language=zh-cn`、`tag=general.online.portal`、`tab=calc`）。
    - Playwright 登录配置（登录 URL、账号密码、等待条件等）。
    - MongoDB 连接串、库名和集合名。
    - schedule 开关与 cron 表达式。
  - `config/plugin.ts`：如需 egg-mongo、egg-logger 扩展可在这里启用，或自行在 infra 中管理 Mongo client。

## 按服务可配置的规格过滤（对比前预处理）

在执行对比前，需要支持对“计算器规格数据”和“购买页规格数据”分别做**可配置的过滤**，且不同服务（如 ECS、后续的 HCSS 等）可以挂载不同的过滤策略。

- **领域层抽象（推荐放在 `ddd/Domain/comparison`）**
  - 定义过滤函数类型：
    - `type CalcSpecFilter = (specs: Map<string, CalcSpec>) => Map<string, CalcSpec>`
    - `type PurchaseSpecFilter = (specs: Map<string, PurchaseSpec>) => Map<string, PurchaseSpec>`
  - `SpecComparator` 仍只关心“过滤后的 Map”，不直接依赖具体过滤逻辑。
- **应用层编排（`ddd/Application/services/RunSpecDiffService`）**
  - 针对每个服务（首期 `ecs`）在用例中增加两个步骤：
    1. `filteredCalcSpecs = calcFilterRegistry.get(service).apply(rawCalcSpecs)`
    2. `filteredPurchaseSpecs = purchaseFilterRegistry.get(service).apply(rawPurchaseSpecs)`
    3. 然后调用 `SpecComparator.compare(filteredCalcSpecs, filteredPurchaseSpecs, keyStrategy)`
  - `filterRegistry` 可以基于服务名（如 `'ecs'`）从配置或代码注册表中拿到对应过滤函数。
- **基础设施 / 配置（`ddd/Infrastructure` + 配置文件）**
  - 在配置中为不同服务预留过滤策略配置项，例如：
    - 仅保留某些系列（如 ECS 的特定代次 `ac7`, `c7` 等）。
    - 排除停售、测试规格（根据字段或标签，如 `os_extra_specs.cond:operation:status=abandon` 等）。
  - 在 `ddd/Infrastructure` 中实现“从配置构造过滤函数”的工厂，并在应用层注册到 `filterRegistry`。
- **扩展方式**
  - 新增服务时，只需要：
    - 在配置中为该服务增加一组过滤规则。
    - 或在代码中为该服务实现专用的过滤函数并注册到 `filterRegistry`。
  - 对比流程（RunSpecDiffService + SpecComparator）本身无需修改。

## 测试策略

- 测试框架：
  - 使用 Egg 官方推荐的 `egg-bin` + mocha + power-assert，或直接采用 Jest（实现时统一选择一种并固定下来）。
- **Domain 层单测**（重点）：
  - 对 `SpecComparator` 做全覆盖测试：
    - only in calc / only in purchase / field-level diff / 完全一致 等场景。
- **Application 层服务测试**：
  - 使用 stub/mock 基础设施依赖（menuInfoClient、productInfoClient、ecsPurchaseClient、mongoRepository），验证 orchestrate 流程正确执行与错误处理。
- **Infrastructure 层契约测试**：
  - 对 `calcNormalizer`、`ecsNormalizer` 用真实样例 JSON 做解析测试，保证字段映射稳定。
  - 对 `playwrightClient` 采用最小集成测试（视环境是否允许 e2e），或通过接口抽象让 Playwright 部分可被 mock。
- **接口与调度测试**：
  - HTTP：使用 supertest 调用 `POST /api/spec-diff/run`，验证 200 响应与服务调用。
  - schedule：通过 Egg 的 `app.runSchedule`（测试能力）触发 `spec_diff_runner`，断言 `RunSpecDiffService.runOnce` 被调用。

## MongoDB 持久化（必须）

对比结果必须落库到 **MongoDB**，用于审计、回溯与离线分析。实现上以仓储模式落在 `ddd/Infrastructure/persistence`，由 `ddd/Application` 用例调用。

- **仓储接口（Application 依赖的端口）**
  - `ISpecDiffRunRepository.save(run: SpecDiffRun): Promise<void>`
  - 可选：`findLatest(service: string, region?: string)`（若要提供 `/latest` 查询接口）
- **Mongo 实现（Infrastructure）**
  - 文件建议：`ddd/Infrastructure/persistence/mongo_spec_diff_run_repository.ts`
  - 集合建议：`spec_diff_runs`
  - 建议索引：
    - `{ runAt: -1 }`
    - `{ service: 1, runAt: -1 }`
    - 可选：`{ 'calcTargets.region': 1, service: 1, runAt: -1 }`
- **文档结构建议（示例字段）**
  - `runAt`: Date
  - `triggerType`: `'manual'|'schedule'`
  - `service`: `'ecs' | ...`
  - `calcTargets`: `{ urlPath: string, region: string }[]`
  - `keyStrategy`: `{ calc: 'resourceSpecCode', purchase: 'flavor.id'|'autoDetect'|string }`
  - `summary`: `{ onlyInCalc: number, onlyInPurchase: number, differ: number, match: number }`
  - `onlyInCalcKeys`: string[]（可选：数量大时可仅存前 N 条 + count）
  - `onlyInPurchaseKeys`: string[]
  - `byKey`: `{ [key: string]: { status: string, fieldDiffs?: any, calc?: any, purchase?: any } }`
  - `unmatchedPurchaseSamples`: any[]（截断存储，避免文档过大）
- **大小控制（避免单文档过大）**
  - `byKey` 可能很大：实现时应支持“仅存 diff/摘要”或按配置截断/拆分到 `spec_diff_run_items` 子集合（可选扩展，不作为首期阻塞项）。

## 定时任务与 Docker 部署设计

- **定时任务实现**：
  - 使用 Egg schedule：`type: 'worker'`（单实例运行），`cron` 根据你需求（默认每天 1 点）配置。
  - schedule 与 HTTP 触发共用 Application 层服务，避免重复逻辑。
- **Docker 部署**：
  - Dockerfile 设计要点：
    - 基于 `node:18-alpine` 或类似镜像。
    - 安装 Playwright 所需依赖（可考虑 `mcr.microsoft.com/playwright` 基础镜像）。
    - 拷贝项目代码与 `package.json`，`npm ci` 或 `pnpm install --prod`。
    - 暴露 HTTP 端口（如 7001）。
    - `CMD` 使用 `egg-scripts start` 或 `npm run start` 启动；schedule 任务在 Egg 进程内部按 cron 运行。
  - 通过环境变量传入 Mongo 连接串、账号密码等敏感信息。

## 实施步骤（在现有 plan 基础上的增量）

1. **创建 Egg.js + TS 项目骨架**：集成基础配置与 Dockerfile，确保服务能通过 HTTP 返回健康检查。
2. **搭 Domain & Application 层骨架**：定义领域实体、值对象、对比服务与 `RunSpecDiffService` 用例。
3. **实现 Calc 侧基础设施（menuInfo + productInfo + normalize）**：先用静态配置 urlPath 列表验证流程，再接入真正 menuInfo 枚举。
4. **接入 Playwright 登录与 ECS 购买页适配器**：实现登录流程、ECS 规格抓取与归一化，并通过测试样本验证 key 提取。
5. **打通对比与持久化链路**：实现 Mongo repository，打通“手动 HTTP 触发一次对比并落库”。
6. **添加 schedule 任务**：实现 `spec_diff_runner`，配置 cron，编写测试，确保在 Docker 容器中也能按时执行。
7. **补齐与完善测试**：达到对 Domain 与关键 Application/Infrastructure 的高覆盖率，并在 README 中说明如何运行测试与构建 Docker 镜像。

