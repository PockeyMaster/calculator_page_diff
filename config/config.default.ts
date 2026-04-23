import type { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo): PowerPartial<EggAppConfig> => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = appInfo.name + '_CHANGE_ME';

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.bodyParser = {
    jsonLimit: '5mb',
    formLimit: '5mb',
    textLimit: '5mb',
  };

  config.middleware = [];

  // DDD 配置拍平到 config 顶层，减少嵌套层级
  config.calculator = {
    baseUrl: 'https://portal.huaweicloud.com',
    sign: 'common',
    language: 'zh-cn',
    tag: 'general.online.portal',
    tab: 'calc',
    /** RDS 等产品 productInfo 体积大时适当加长 */
    requestTimeoutMs: 120_000,
  };
  config.purchase = {
    consoleBaseUrl: 'https://console.huaweicloud.com',
    purchasePageUrl: '/ecm/?region=cn-north-4&locale=zh-cn',
    defaultRegion: 'cn-north-4',
    ecs: {
      xTargetServices: 'ecs-iam5',
    },
    obs: {
      xTargetServices: 'cbc-iam5',
      offeringLimit: 5000,
      resourceTypeCode: 'hws.resource.type.obs',
      serviceTypeCode: 'hws.service.type.obs',
      siteCode: 'HWC',
      purchaseModel: 'ON_DEMAND_PKG',
    },
    evs: {
      xTargetServices: 'evs-iam5',
    },
    rds: {
      enginesPayMode: 1,
      enginesXTargetServices: 'rds-iam5',
      /** 第二步 GET .../rds/v2.1/{pid}/flavors 的网关头 */
      flavorsXTargetServices: 'rds-iam5',
      flavorsProductEdition: 'standard',
      flavorsIsServerless: false,
      /** 与控制台「规格分类」一致，可按需追加如 general 等 */
      flavorsComputeCategoryTypes: ['simple'],
      flavorsRequestDelayMs: 50,
    },
  };
  config.schedule = {
    enable: true,
    cron: '0 0 1 * * *',
  };
  config.mongo = {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGO_DB || 'page_diff_crawler',
    collection: process.env.MONGO_COLLECTION || 'spec_diff_runs',
  };
  config.playwright = {
    headless: false,
    locale: 'zh-CN',
    executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    loginUrl: 'https://auth.huaweicloud.com/authui/login.html#/login2',
    region: 'cn-north-4',
    username: process.env.HWC_USERNAME || '',
    password: process.env.HWC_PASSWORD || '',
  };

  const userConfig = {} as PowerPartial<EggAppConfig>;
  return {
    ...config,
    ...userConfig,
  };
};

