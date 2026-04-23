import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from './ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

export interface AzInfo {
  id: string;
  displayName: string;
  regionId: string;
  type: string;
  status: string;
  tags?: Record<string, any>;
  publicBorderGroup?: string;
  category: number;
  azGroupIds?: string[];
  chargePolicy?: string;
}

export class EcsAzClient {
  constructor(
    private readonly cfg: {
      consoleBaseUrl: string;
      region: string;
      xTargetServices: string;
      logger: AppLogger;
    },
  ) {}

  async fetchAvailabilityZones(
    auth: AuthContext,
    me: EcsUserInfo,
    opts?: { region?: string; domainId?: string },
  ): Promise<AzInfo[]> {
    const region = opts?.region || this.cfg.region;
    const domainId = opts?.domainId || me.domainId;

    if (!domainId) {
      this.cfg.logger.warn('ecs az fetch skipped: no domainId');
      return [];
    }

    const url = `${this.cfg.consoleBaseUrl}/ecm/rest/lcs/v1/azMgr/domains/${encodeURIComponent(domainId)}/regions/${encodeURIComponent(region)}/availabilityZones`;

    const res = await auth.page.request.get(url, {
      params: {
        locale: 'zh-cn',
      },
      headers: {
        accept: 'application/json, text/plain, */*',
        region: region,
        projectname: region,
        agencyid: me.agencyId || '',
        cftk: me.cftk || '',
        'x-language': 'zh-cn',
        'x-requested-with': 'XMLHttpRequest',
        'x-target-services': this.cfg.xTargetServices,
      },
    });

    const status = res.status();
    const headers = res.headers();
    const contentType = headers['content-type'];
    const bodyText = await res.text().catch(() => '');

    if (status < 200 || status >= 300) {
      this.cfg.logger.error('ecs az request non-2xx', {
        url,
        region,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`调用 AZ 接口失败，status=${status} content-type=${contentType || 'unknown'}`);
    }

    if (!bodyText) {
      this.cfg.logger.warn('ecs az empty response body', {
        url,
        region,
        status,
        contentType,
      });
      return [];
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch {
      this.cfg.logger.error('ecs az response not json', {
        url,
        region,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`AZ 响应不是合法 JSON，content-type=${contentType || 'unknown'}`);
    }

    const azList: AzInfo[] = Array.isArray(data) ? data : [];
    this.cfg.logger.info('ecs az fetched', { region, azCount: azList.length });

    return azList;
  }
}
