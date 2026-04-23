import type { AuthContext } from '../../auth/playwrightClient';
import type { AppLogger } from '../../../Application/ports/logger';

export interface EcsUserInfo {
  domainId?: string;
  projectId: string;
  agencyId?: string;
  region: string;
  cftk?: string;
}

export class EcsUserInfoClient {
  constructor(
    private readonly cfg: {
      consoleBaseUrl: string;
      region: string;
      logger: AppLogger;
    },
  ) {}

  async fetchMe(auth: AuthContext, opts?: { region?: string }): Promise<EcsUserInfo> {
    const region = opts?.region || this.cfg.region;
    const url = `${this.cfg.consoleBaseUrl}/ecm/rest/me`;
    const res = await auth.page.request.get(url, {
      headers: {
        accept: 'application/json, text/plain, */*',
        region,
        projectname: region,
        'x-language': 'zh-cn',
        'x-request-from': 'Framework',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    const status = res.status();
    const headers = res.headers();
    const contentType = headers['content-type'];

    if (status < 200 || status >= 300) {
      const body = await res.text().catch(() => '');
      this.cfg.logger.error('ecs me request non-2xx', {
        url,
        status,
        contentType,
        bodyPreview: body.slice(0, 500),
      });
      throw new Error(`调用 /ecm/rest/me 失败，status=${status} content-type=${contentType || 'unknown'}`);
    }

    const bodyText = await res.text().catch(() => '');
    if (!bodyText) {
      this.cfg.logger.error('ecs me empty response body', { url, status, contentType });
      throw new Error('调用 /ecm/rest/me 返回空响应体，疑似未登录或被重定向');
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      this.cfg.logger.error('ecs me response not json', {
        url,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`/ecm/rest/me 响应不是合法 JSON，content-type=${contentType || 'unknown'}`);
    }

    const projectId =
      data?.projectId ||
      data?.project_id ||
      data?.user?.projectId ||
      data?.user?.project_id;

    if (!projectId) {
      throw new Error('无法从 /ecm/rest/me 响应解析 projectId');
    }

    // domainId 经常用于 region 权限管理接口的查询域
    const domainId =
      data?.domainId ||
      data?.domain_id ||
      data?.user?.domainId ||
      data?.user?.domain_id ||
      data?.domain?.id ||
      data?.domain?.domainId;

    // agencyId 在请求示例中是 header `agencyid`，通常能从 me 返回中找到（字段名可能不同）
    const agencyId =
      data?.agencyId ||
      data?.agency_id ||
      data?.agency?.id ||
      data?.agency?.agencyId;

    // cftk 常见于 cookie 或 localStorage；这里从 cookie 里 best-effort 获取
    const cookies = await auth.context.cookies();
    const cftk = cookies.find((c) => c.name === 'cftk')?.value;

    return {
      domainId: domainId ? String(domainId) : undefined,
      projectId: String(projectId),
      agencyId: agencyId ? String(agencyId) : undefined,
      region,
      cftk,
    };
  }
}
