import type { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (_appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;
  config.logger = {
    level: 'INFO',
    consoleLevel: 'INFO',
  };
  return config;
};

