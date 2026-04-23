import type { AuthContext } from '../../auth/playwrightClient';
import type { EcsUserInfo } from '../ecs/ecsUserInfoClient';
import type { AppLogger } from '../../../Application/ports/logger';

/** 根据控制台 regionMgr 接口，将 requestedRegions 过滤为账号已开通且 ENABLED 的地域。 */
export async function filterRequestedRegionsByConsoleEnabled(opts: {
  auth: AuthContext;
  consoleBaseUrl: string;
  domainId: string;
  firstMe: EcsUserInfo;
  requestedRegions: string[];
  logger: AppLogger;
  logPrefix: string;
}): Promise<string[]> {
  const { auth, consoleBaseUrl, domainId, firstMe, requestedRegions, logger, logPrefix } = opts;
  const url = `${consoleBaseUrl}/console/rest/lcs/v1/regionMgr/domains/${encodeURIComponent(domainId)}/regions`;

  const res = await auth.page.request.get(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      region: firstMe.region,
      projectname: firstMe.region,
      'x-language': 'zh-cn',
      'x-request-from': 'Framework',
      'x-requested-with': 'XMLHttpRequest',
      cftk: firstMe.cftk || '',
    },
  });

  const status = res.status();
  const bodyText = await res.text().catch(() => '');
  if (status < 200 || status >= 300) {
    logger.error(`${logPrefix} regionMgr request non-2xx`, { url, status, bodyPreview: bodyText.slice(0, 300) });
    return [];
  }

  if (!bodyText) {
    logger.error(`${logPrefix} regionMgr empty response body`, { url });
    return [];
  }

  let parsed: any;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    logger.error(`${logPrefix} regionMgr response not json`, { url, bodyPreview: bodyText.slice(0, 300) });
    return [];
  }

  const regionItems: any[] = [];
  const pushRegionItemsFromUnknown = (v: unknown) => {
    if (!v) {
      return;
    }
    if (Array.isArray(v)) {
      regionItems.push(...v);
      return;
    }
    if (typeof v === 'object') {
      for (const vv of Object.values(v as Record<string, unknown>)) {
        if (Array.isArray(vv)) {
          regionItems.push(...vv);
        }
      }
    }
  };

  if (parsed && typeof parsed === 'object') {
    pushRegionItemsFromUnknown((parsed as any).regions);
    for (const v of Object.values(parsed)) {
      pushRegionItemsFromUnknown(v);
    }
  }

  const enabledRegionIds = regionItems
    .filter((it) => it && typeof it === 'object' && (it as any).regionId)
    .filter((it) => {
      const s = (it as any).optStatus;
      return !s || String(s).toUpperCase() === 'ENABLED';
    })
    .map((it) => String((it as any).regionId));

  logger.info(`${logPrefix} regionMgr parsed regions`, {
    requestedRegionCount: requestedRegions.length,
    enabledRegionCount: enabledRegionIds.length,
  });

  const allowedSet = new Set(enabledRegionIds);
  return requestedRegions.filter((r) => allowedSet.has(r));
}
