import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from '../ecs/ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

/**
 * 控制台 IAM：列出账号可访问的项目，用于按 region 解析对应的 projectId（URL 路径中的租户标识）。
 * 与浏览器一致：GET /console/rest/iam/v3/projects
 */
export class ConsoleIamProjectsClient {
  constructor(
    private readonly deps: {
      consoleBaseUrl: string;
      logger: AppLogger;
    },
  ) {}

  /**
   * 返回 regionId -> projectId（同一 region 多条时保留第一条 enabled 的，否则第一条）
   */
  async fetchRegionToProjectId(
    auth: AuthContext,
    me: EcsUserInfo,
    headerRegion: string,
  ): Promise<Map<string, string>> {
    const url = `${this.deps.consoleBaseUrl}/console/rest/iam/v3/projects`;
    const res = await auth.page.request.get(url, {
      headers: {
        accept: 'application/json, text/plain, */*',
        region: headerRegion,
        projectname: headerRegion,
        agencyid: me.agencyId || '',
        cftk: me.cftk || '',
        'content-type': 'application/json; charset=UTF-8',
        'x-language': 'zh-cn',
        'x-request-from': 'Framework',
        'x-requested-with': 'XMLHttpRequest',
        'x-target-services': 'iam_v5',
        'x-cf2-passthrough': 'false',
        'x-cf2-target-url': 'iam=/v3/auth/projects',
      },
    });

    const status = res.status();
    const bodyText = await res.text().catch(() => '');
    if (status < 200 || status >= 300) {
      this.deps.logger.error('iam projects request non-2xx', {
        url,
        status,
        bodyPreview: bodyText.slice(0, 400),
      });
      return new Map();
    }
    if (!bodyText) {
      this.deps.logger.error('iam projects empty response body', { url });
      return new Map();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      this.deps.logger.error('iam projects response not json', {
        url,
        bodyPreview: bodyText.slice(0, 400),
      });
      return new Map();
    }

    const projects: any[] = extractProjectsArray(parsed);
    if (projects.length === 0) {
      this.deps.logger.warn('iam projects parsed empty list', {
        url,
        topKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
      });
      return new Map();
    }

    const map = new Map<string, string>();
    const best = new Map<string, { id: string; enabled: boolean }>();
    for (const p of projects) {
      if (!p || typeof p !== 'object') {
        continue;
      }
      const projectId = p.id ?? p.project_id ?? p.projectId;
      if (!projectId) {
        continue;
      }
      const regionKey = resolveProjectRegionId(p);
      if (!regionKey) {
        continue;
      }
      const enabled = p.enabled !== false;
      const id = String(projectId);
      const prev = best.get(regionKey);
      if (!prev) {
        best.set(regionKey, { id, enabled });
        continue;
      }
      if (enabled && !prev.enabled) {
        best.set(regionKey, { id, enabled });
      }
    }
    for (const [r, v] of best) {
      map.set(r, v.id);
    }

    this.deps.logger.info('iam projects region map built', {
      projectRows: projects.length,
      mappedRegionCount: map.size,
    });
    return map;
  }
}

function extractProjectsArray(parsed: unknown): any[] {
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }
  const o = parsed as Record<string, unknown>;
  if (Array.isArray(o.projects)) {
    return o.projects as any[];
  }
  if (Array.isArray(o.project)) {
    return o.project as any[];
  }
  if (Array.isArray(parsed)) {
    return parsed as any[];
  }
  // 部分网关包一层 data
  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.projects)) {
      return d.projects as any[];
    }
  }
  return [];
}

/**
 * 从项目对象上解析所属 region。
 * 控制台 IAM list projects 常见形态：region 写在 `name` 上（如 "cn-south-1"），无单独 region_id 字段。
 */
function resolveProjectRegionId(p: Record<string, unknown>): string | undefined {
  const rawName = p.name != null ? String(p.name).trim() : '';
  if (rawName && isHuaweiRegionIdShape(rawName)) {
    return rawName.toLowerCase();
  }

  const direct =
    p.region_id ??
    p.regionId ??
    p.region ??
    (p.metadata as Record<string, unknown> | undefined)?.region_id ??
    (p.metadata as Record<string, unknown> | undefined)?.regionId;
  if (direct) {
    const s = String(direct).trim();
    return s ? s.toLowerCase() : undefined;
  }

  return undefined;
}

/** 与 menuInfo regionList 一致的 region id 形态：cn-south-1、ap-southeast-1、eu-west-101 等 */
function isHuaweiRegionIdShape(s: string): boolean {
  return /^[a-z]{2}-[a-z0-9]+(-[a-z0-9]+)*-\d+$/i.test(s);
}
