import type { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (_appInfo: EggAppInfo): PowerPartial<EggAppConfig> => {
  const config = {} as PowerPartial<EggAppConfig>;

  // 覆盖本地 MongoDB 配置（顶层字段：config.mongo）
  config.mongo = {
    uri: 'mongodb://127.0.0.1:27017',
    dbName: 'elm',
    collection: 'spec_diff_runs',
  };

  // 覆盖本地环境 Playwright 配置（顶层字段：config.playwright）
  config.playwright = {
    headless: false,
    locale: 'zh-CN',
    loginUrl: 'https://auth.huaweicloud.com/authui/login.html#/login2',
    region: 'cn-north-4',
    username: process.env.HWC_USERNAME || 'shengzhong',
    password: process.env.HWC_PASSWORD || 'Portal_2025s',
  };

  return config;
};

