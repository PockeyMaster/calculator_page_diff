import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from './ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

/** flavors 接口分页大小，与控制台约定一致 */
const FLAVORS_PAGE_LIMIT = 1000;
/** 防止异常分页死循环 */
const MAX_FLAVOR_PAGES = 500;

export class EcsFlavorsClient {
  constructor(
    private readonly cfg: {
      consoleBaseUrl: string;
      region: string;
      xTargetServices: string;
      logger: AppLogger;
    },
  ) {}

  async fetchFlavors(
    auth: AuthContext,
    me: EcsUserInfo,
    opts?: { region?: string; projectId?: string },
  ): Promise<any[]> {
    const region = opts?.region || this.cfg.region;
    const projectIdInUrl = opts?.projectId || me.projectId;
    const url = `${this.cfg.consoleBaseUrl}/ecm/rest/v1/${encodeURIComponent(projectIdInUrl)}/cloudservers/flavors`;

    const all: any[] = [];
    let marker: string | undefined;
    let pages = 0;

    while (pages < MAX_FLAVOR_PAGES) {
      pages += 1;
      const { flavors, nextMarker } = await this.fetchFlavorsPage(auth, {
        url,
        region,
        me,
        marker,
      });
      all.push(...flavors);
      if (!nextMarker) {
        break;
      }
      marker = nextMarker;
    }

    if (pages >= MAX_FLAVOR_PAGES && marker) {
      this.cfg.logger.warn('ecs flavors pagination stopped at max pages', {
        pages,
        count: all.length,
        lastMarker: marker,
      });
    }

    return all;
  }

  private async fetchFlavorsPage(
    auth: AuthContext,
    args: {
      url: string;
      region: string;
      me: EcsUserInfo;
      marker?: string;
    },
  ): Promise<{ flavors: any[]; nextMarker?: string }> {
    const params: Record<string, string | number> = { limit: FLAVORS_PAGE_LIMIT };
    if (args.marker) {
      params.marker = args.marker;
    }

    const res = await auth.page.request.get(args.url, {
      params,
      headers: {
        accept: 'application/json, text/plain, */*',
        region: args.region,
        projectname: args.region,
        agencyid: args.me.agencyId || '',
        cftk: args.me.cftk || '',
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
      this.cfg.logger.error('ecs flavors request non-2xx', {
        url: args.url,
        marker: args.marker,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`调用 flavors 失败，status=${status} content-type=${contentType || 'unknown'}`);
    }

    if (!bodyText) {
      this.cfg.logger.error('ecs flavors empty response body', {
        url: args.url,
        marker: args.marker,
        status,
        contentType,
      });
      return { flavors: [] };
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch {
      this.cfg.logger.error('ecs flavors response not json', {
        url: args.url,
        marker: args.marker,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`flavors 响应不是合法 JSON，content-type=${contentType || 'unknown'}`);
    }

    const flavors = Array.isArray(data?.flavors) ? data.flavors : [];
    const next = data?.page_info?.next_marker;
    const nextMarker = typeof next === 'string' && next.length > 0 ? next : undefined;

    return { flavors, nextMarker };
  }
}
