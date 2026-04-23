import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from '../ecs/ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

export interface RdsConsoleFlavorsQuery {
  engineId: string;
  haMode: string;
  /** 逗号分隔的可用区 code，如 cn-north-4a,cn-north-4b */
  azCode: string;
  productEdition: string;
  isServerless: boolean;
  computeFlavorCategoryType: string;
}

export class RdsConsoleFlavorsClient {
  constructor(
    private readonly cfg: {
      consoleBaseUrl: string;
      region: string;
      xTargetServices: string;
      logger: AppLogger;
    },
  ) {}

  async fetchFlavorsJson(
    auth: AuthContext,
    me: EcsUserInfo,
    params: {
      region: string;
      projectId: string;
      query: RdsConsoleFlavorsQuery;
    },
  ): Promise<unknown> {
    const region = params.region || this.cfg.region;
    const url = new URL(
      `${this.cfg.consoleBaseUrl}/rds/rest/rds/v2.1/${encodeURIComponent(params.projectId)}/flavors`,
    );
    const q = params.query;
    url.searchParams.set('engineId', q.engineId);
    url.searchParams.set('haMode', q.haMode);
    url.searchParams.set('azCode', q.azCode);
    url.searchParams.set('productEdition', q.productEdition);
    url.searchParams.set('is_serverless', q.isServerless ? 'true' : 'false');
    url.searchParams.set('computeFlavorCategoryType', q.computeFlavorCategoryType);

    const res = await auth.page.request.get(url.toString(), {
      headers: {
        accept: 'application/json, text/plain, */*',
        region,
        projectname: region,
        agencyid: me.agencyId || '',
        cftk: me.cftk || '',
        'content-type': 'application/json; charset=UTF-8',
        'x-language': 'zh-cn',
        'x-requested-with': 'XMLHttpRequest',
        'x-source-service': 'rds',
        'x-target-services': this.cfg.xTargetServices,
      },
    });

    const status = res.status();
    const headers = res.headers();
    const contentType = headers['content-type'];
    const bodyText = await res.text().catch(() => '');

    if (status < 200 || status >= 300) {
      this.cfg.logger.error('rds console flavors request non-2xx', {
        url: url.toString(),
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(
        `调用 RDS flavors 失败 engineId=${q.engineId} haMode=${q.haMode} status=${status} content-type=${contentType || 'unknown'}`,
      );
    }

    if (!bodyText) {
      this.cfg.logger.warn('rds console flavors empty body', { url: url.toString(), status });
      return {};
    }

    try {
      return JSON.parse(bodyText) as unknown;
    } catch {
      this.cfg.logger.error('rds console flavors response not json', {
        url: url.toString(),
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`RDS flavors 响应不是合法 JSON，content-type=${contentType || 'unknown'}`);
    }
  }
}
