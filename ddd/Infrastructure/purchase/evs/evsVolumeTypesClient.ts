import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from '../ecs/ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

export class EvsVolumeTypesClient {
  constructor(
    private readonly cfg: {
      consoleBaseUrl: string;
      region: string;
      xTargetServices: string;
      logger: AppLogger;
    },
  ) {}

  async fetchVolumeTypes(
    auth: AuthContext,
    me: EcsUserInfo,
    opts?: { region?: string; projectId?: string },
  ): Promise<any[]> {
    const region = opts?.region || this.cfg.region;
    const projectIdInUrl = opts?.projectId || me.projectId;
    const url = `${this.cfg.consoleBaseUrl}/ecm/rest/evs/v2.1/${encodeURIComponent(projectIdInUrl)}/types`;

    const res = await auth.page.request.get(url, {
      headers: {
        accept: 'application/json, text/plain, */*',
        region,
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
      this.cfg.logger.error('evs volume types request non-2xx', {
        url,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`调用 EVS types 失败，status=${status} content-type=${contentType || 'unknown'}`);
    }

    if (!bodyText) {
      this.cfg.logger.error('evs volume types empty response body', { url, status, contentType });
      return [];
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch {
      this.cfg.logger.error('evs volume types response not json', {
        url,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`EVS types 响应不是合法 JSON，content-type=${contentType || 'unknown'}`);
    }

    return Array.isArray(data?.volume_types) ? data.volume_types : [];
  }
}
