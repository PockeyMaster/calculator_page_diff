# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

规格接口对比爬虫服务 (Spec Diff Crawler) - A service that compares Huawei Cloud pricing calculator specs against purchase page specs. Built with Egg.js framework following Domain-Driven Design (DDD) architecture.

## Commands

```bash
npm run dev          # Start development server
npm start            # Production start (eggctl start --daemon)
npm stop             # Production stop (eggctl stop)
npm test             # Run tests
npm run cov          # Run tests with coverage
npm run lint         # Run ESLint
npm run tsc          # TypeScript type check (no emit)
```

## Architecture

### DDD Layer Structure (ddd/)

The business logic is organized in `ddd/` directory following DDD principles:

```
ddd/
├── Domain/           # Pure business models, no external dependencies
│   ├── calculator/   # CalcSpec domain objects
│   ├── purchase/     # PurchaseSpec domain objects
│   └── comparison/   # SpecComparator, filters, diff types
├── Application/      # Use case orchestration
│   ├── services/     # RunSpecDiffService (main entry point)
│   └── ports/        # Interface definitions (repositories, providers)
├── Infrastructure/   # External system implementations
│   ├── http/         # Axios client
│   ├── calc/         # Calculator API clients + normalizer
│   ├── auth/         # Playwright login client
│   ├── purchase/     # ecs/ obs/ evs/ rds/ 各服务独立实现
│   │   ├── ecs/      # ECS 服务：flavorsClient, normalizer, purchaseSpecsProvider, ecsFilter
│   │   ├── obs/      # OBS 服务：offeringClient, normalizer, purchaseSpecsProvider, obsFilter
│   │   ├── evs/      # EVS 服务：volumeTypesClient, normalizer, purchaseSpecsProvider, evsFilter
│   │   ├── rds/      # RDS 服务：enginesClient, flavorsClient, normalizer, purchaseSpecsProvider, rdsFilter
│   │   └── shared/   # 共享工具：iamProjectsClient, regionMgrAllowedRegions
│   └── persistence/  # MongoDB repository
└── Interface/        # DDD entry point
    └── container.ts  # buildDddContainer() - DI container
```

### Egg.js Layer (app/)

Egg.js handles HTTP/routing/scheduling only - thin adapters:

- `app/controller/` - HTTP controllers, call `app.dddContainer.runSpecDiffService`
- `app/router.ts` - Route definitions
- `app/schedule/` - Cron jobs, call same DDD service
- `app/extend/application.ts` - Extends Egg Application with `dddContainer` getter

### Dependency Direction

```
app/ → ddd/Application → ddd/Domain
              ↓
        ddd/Infrastructure (implements ports defined in Application)
```

- Domain layer has NO dependencies on other layers or external libs
- Application depends on Domain and port interfaces
- Infrastructure implements port interfaces
- Egg app layer only calls Application services via `app.dddContainer`

## Key Patterns

### Container Pattern

`app.dddContainer` is lazily initialized via `app/extend/application.ts`. All controllers and schedules access DDD services through this container:

```typescript
await app.dddContainer.runSpecDiffService.runOnce({ service: 'ecs', triggerType: 'manual' });
```

### Port/Adapter Pattern

Application layer defines interfaces (ports) in `ddd/Application/ports/`:
- `CalcSpecsProvider` - fetch calculator specs
- `PurchaseSpecsProvider` - fetch purchase page specs
- `SpecDiffRunRepository` - persist results

Infrastructure provides concrete implementations.

### Filter Pattern

每个购买页服务（ecs, obs, evs, rds）都有独立的过滤器模块：
- `ddd/Infrastructure/purchase/ecs/ecsFilter.ts` - ECS 计算器过滤 Linux 规格、购买页过滤 abandon 状态
- `ddd/Infrastructure/purchase/obs/obsFilter.ts` - OBS 过滤器（预留扩展点）
- `ddd/Infrastructure/purchase/evs/evsFilter.ts` - EVS 过滤器（预留扩展点）
- `ddd/Infrastructure/purchase/rds/rdsFilter.ts` - RDS 过滤器（预留扩展点）

过滤器在 `ddd/Interface/container.ts` 中按 service 名称路由。

## Configuration

Main config: `config/config.default.ts`

Key sections under `config` (flattened, previously under `config.ddd`):
- `calculator` - Calculator API settings (baseUrl, sign, language, tag, tab)
- `purchase` - Purchase page settings (consoleBaseUrl, defaultRegion)
- `schedule` - Cron settings (enable, cron expression)
- `mongo` - MongoDB connection (uri, dbName, collection)
- `playwright` - Browser automation (headless, loginUrl, credentials)
- `filters` - Per-service filter rules

Environment variables: `MONGO_URI`, `MONGO_DB`, `MONGO_COLLECTION`, `HWC_USERNAME`, `HWC_PASSWORD`

## API Endpoints

- `GET /health` - Health check
- `POST /api/spec-diff/run` - Trigger spec diff run (body: `{ service?: 'ecs' | 'obs' }`)；`service` 也可放在 query（`GET` 同样注册，便于本地调试）

## Scheduled Tasks

`app/schedule/specDiffRunner.ts` runs daily at 1:00 AM by default (`0 0 1 * * *`).

## Testing

Tests are organized by DDD layer:
- `test/domain/` - Domain layer unit tests
- `test/application/` - Application service tests with stubs
- `test/interface/` - Controller and schedule tests

Uses `egg-bin test` with mocha and `assert` module. Run single test file:
```bash
npx egg-bin test test/domain/specComparator.test.ts
```

## TypeScript Path Aliases

`@ddd/*` maps to `ddd/*` (configured in tsconfig.json).