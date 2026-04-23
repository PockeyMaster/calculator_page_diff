import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from '../ecs/ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

export interface RdsEngineGroup {
  groupType?: string;
  engines?: RdsEngineItem[];
}

export interface RdsEngineAz {
  code?: string;
  favored?: boolean;
  /** 若 engines 返回可用区状态，可与 flavors 里 azStatus=normal 对齐 */
  status?: string;
  azStatus?: string;
}

export interface RdsEngineItem {
  id?: string;
  name?: string;
  version?: string;
  supportHaModes?: string[];
  supportAzs?: RdsEngineAz[];
}

export class RdsEnginesClient {
  constructor(
    private readonly cfg: {
      consoleBaseUrl: string;
      region: string;
      payMode: number;
      xTargetServices: string;
      logger: AppLogger;
    },
  ) {}

  async fetchEngineGroups(
    auth: AuthContext,
    me: EcsUserInfo,
    opts?: { region?: string; projectId?: string },
  ): Promise<RdsEngineGroup[]> {
    const region = opts?.region || this.cfg.region;
    const projectIdInUrl = opts?.projectId || me.projectId;
    const url = new URL(
      `${this.cfg.consoleBaseUrl}/rds/rest/rds/v2.1/${encodeURIComponent(projectIdInUrl)}/engines`,
    );
    url.searchParams.set('payMode', String(this.cfg.payMode));

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
      this.cfg.logger.error('rds engines request non-2xx', {
        url: url.toString(),
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`调用 RDS engines 失败，status=${status} content-type=${contentType || 'unknown'}`);
    }

    if (!bodyText) {
      this.cfg.logger.warn('rds engines empty response body', { url: url.toString(), status });
      return [];
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch {
      this.cfg.logger.error('rds engines response not json', {
        url: url.toString(),
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`RDS engines 响应不是合法 JSON，content-type=${contentType || 'unknown'}`);
    }

    return Array.isArray(data?.engineGroups) ? data.engineGroups : [];
  }
}
