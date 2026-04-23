import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from '../ecs/ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

export interface ObsOfferingQueryBody {
  customer_info: { project_id: string };
  offering_query_info_list: Array<{
    index: number;
    limit: number;
    resource_type_code: string;
    service_type_code: string;
    region_code: string;
    site_code: string;
    purchase_model: string;
  }>;
}

export class ObsOfferingClient {
  constructor(
    private readonly cfg: {
      consoleBaseUrl: string;
      region: string;
      xTargetServices: string;
      resourceTypeCode: string;
      serviceTypeCode: string;
      siteCode: string;
      purchaseModel: string;
      offeringLimit: number;
      logger: AppLogger;
    },
  ) {}

  async fetchOfferingQueryResponse(
    auth: AuthContext,
    me: EcsUserInfo,
    opts?: { region?: string; projectId?: string },
  ): Promise<unknown> {
    const region = opts?.region || this.cfg.region;
    const projectId = opts?.projectId || me.projectId;
    const url = `${this.cfg.consoleBaseUrl}/obs/rest/bss/v1/offerings/offering-infos/query`;
    const agencyQ = me.agencyId ? `&agencyId=${encodeURIComponent(me.agencyId)}` : '';
    const referer = `${this.cfg.consoleBaseUrl}/obs/?locale=zh-cn${agencyQ}&region=${encodeURIComponent(region)}`;

    const body: ObsOfferingQueryBody = {
      customer_info: { project_id: projectId },
      offering_query_info_list: [
        {
          index: 1,
          limit: this.cfg.offeringLimit,
          resource_type_code: this.cfg.resourceTypeCode,
          service_type_code: this.cfg.serviceTypeCode,
          region_code: region,
          site_code: this.cfg.siteCode,
          purchase_model: this.cfg.purchaseModel,
        },
      ],
    };

    const res = await auth.page.request.post(url, {
      data: body,
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        region,
        projectname: region,
        agencyid: me.agencyId || '',
        cftk: me.cftk || '',
        'x-language': 'zh-cn',
        'x-requested-with': 'XMLHttpRequest',
        'x-target-services': this.cfg.xTargetServices,
        referer,
        origin: this.cfg.consoleBaseUrl,
      },
    });

    const status = res.status();
    const headers = res.headers();
    const contentType = headers['content-type'];
    const bodyText = await res.text().catch(() => '');

    if (status < 200 || status >= 300) {
      this.cfg.logger.error('obs offering query non-2xx', {
        url,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`OBS offering-infos/query 失败，status=${status} content-type=${contentType || 'unknown'}`);
    }

    if (!bodyText) {
      this.cfg.logger.error('obs offering query empty response body', { url, status, contentType });
      return {};
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch {
      this.cfg.logger.error('obs offering query response not json', {
        url,
        status,
        contentType,
        bodyPreview: bodyText.slice(0, 500),
      });
      throw new Error(`OBS offering 响应不是合法 JSON，content-type=${contentType || 'unknown'}`);
    }

    const code = data?.error_code != null ? String(data.error_code) : '';
    if (code && code !== 'CBC.0000') {
      this.cfg.logger.error('obs offering query business error', {
        url,
        error_code: data?.error_code,
        error_msg: data?.error_msg,
      });
      throw new Error(`OBS offering 接口错误: ${data?.error_code} ${data?.error_msg || ''}`);
    }

    return data;
  }
}
