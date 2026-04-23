import type { Application } from 'egg';

export default (app: Application) => {
  const { router, controller } = app;
  router.get('/health', controller.health.index);
  router.post('/api/spec-diff/run', controller.specDiff.run);
  // 便于本地用浏览器 GET 调试（如 ?service=obs）；生产仍以 POST + JSON body 为准
  router.get('/api/spec-diff/run', controller.specDiff.run);
};

