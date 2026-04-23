## page-diff-crawler（规格接口对比服务）

基于 **Egg.js + DDD** 的“价格计算器规格 vs 购买页规格”对比服务，支持：

- **手动触发**：`POST /api/spec-diff/run`
- **定时任务**：`app/schedule/specDiffRunner.ts`（默认每天 1:00）
- **持久化**：对比结果写入 **MongoDB**（集合默认 `spec_diff_runs`）
- **购买页侧**：Playwright 登录后按链路 `GET /ecm/rest/me` → `GET /cloudservers/flavors`（首期 ECS）

### 环境变量

- **MongoDB**
  - `MONGO_URI`：如 `mongodb://localhost:27017`
  - `MONGO_DB`：默认 `page_diff_crawler`
  - `MONGO_COLLECTION`：默认 `spec_diff_runs`
- **华为云控制台登录**
  - `HWC_USERNAME`
  - `HWC_PASSWORD`

### 本地开发

你本机 Node 版本需要 `>=18`（因为 Playwright + mongodb 驱动要求较新 Node 版本）。

```bash
npm i
npm run dev
```

生产环境启动/停止使用 `eggctl`（Egg 3 部署工具）：

```bash
npm start   # eggctl start --daemon
npm stop    # eggctl stop
```

### Docker 运行

```bash
docker build -t page-diff-crawler .
docker run --rm -p 7001:7001 ^
  -e MONGO_URI=mongodb://host.docker.internal:27017 ^
  -e HWC_USERNAME=xxx -e HWC_PASSWORD=xxx ^
  page-diff-crawler
```
