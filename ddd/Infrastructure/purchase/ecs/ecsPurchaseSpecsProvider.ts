import type { PurchaseSpecsProvider } from '../../../Application/ports/purchaseSpecsProvider';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';
import type { AppLogger } from '../../../Application/ports/logger';
import { PlaywrightClient } from '../../auth/playwrightClient';
import { EcsUserInfoClient } from './ecsUserInfoClient';
import { EcsFlavorsClient } from './ecsFlavorsClient';
import { EcsAzClient } from './ecsAzClient';
import { EcsPurchaseNormalizer } from './ecsNormalizer';
import { filterEcsPurchaseSpecsByAz, filterEcsPurchaseSpecsByOperationStatus } from './ecsFilter';
import type { ConsoleIamProjectsClient } from '../shared/iamProjectsClient';
import { filterRequestedRegionsByConsoleEnabled } from '../shared/regionMgrAllowedRegions';

export class EcsPurchaseSpecsProvider implements PurchaseSpecsProvider {
  constructor(
    private readonly deps: {
      playwright: PlaywrightClient;
      meClient: EcsUserInfoClient;
      flavorsClient: EcsFlavorsClient;
      azClient: EcsAzClient;
      normalizer: EcsPurchaseNormalizer;
      iamProjectsClient: ConsoleIamProjectsClient;
      logger: AppLogger;
      consoleBaseUrl: string;
      defaultRegion: string;
    },
  ) {}

  async createSession(params: { service: string; requestedRegions: string[] }) {
    if (params.service !== 'ecs') {
      return {
        allowedRegions: [],
        async fetchPurchaseSpecs() {
          return new Map();
        },
        async close() {
          return;
        },
      };
    }

    const deps = this.deps;
    const auth = await this.deps.playwright.login();
    const requestedRegions = params.requestedRegions;
    const regionForHeaders = requestedRegions[0] || deps.defaultRegion;

    const firstMe = await deps.meClient.fetchMe(auth, { region: regionForHeaders });
    if (!firstMe.domainId) {
      throw new Error('无法从 /ecm/rest/me 响应解析 domainId，无法获取 region 权限');
    }
    const domainId = firstMe.domainId;

    const regionToProjectId = await deps.iamProjectsClient.fetchRegionToProjectId(
      auth,
      firstMe,
      regionForHeaders,
    );
    if (regionToProjectId.size === 0) {
      deps.logger.warn('iam projects map empty; flavors will fallback to /ecm/rest/me projectId only');
    }

    const allowedRegions = await filterRequestedRegionsByConsoleEnabled({
      auth,
      consoleBaseUrl: deps.consoleBaseUrl,
      domainId,
      firstMe,
      requestedRegions,
      logger: deps.logger,
      logPrefix: 'ecs',
    });

    // 注意：projectId / agencyId / cftk 可能因 region 不同而不同，所以必须按 region 缓存 me。
    const meByRegion = new Map<string, typeof firstMe>();
    meByRegion.set(firstMe.region, firstMe);

    return {
      allowedRegions,
      async fetchPurchaseSpecs(p: { service: string; region: string }): Promise<PurchaseSpecMap> {
        if (p.service !== 'ecs') {
          return new Map();
        }
        if (!allowedRegions.includes(p.region)) {
          deps.logger.warn('ecs purchase skip by region permission', { region: p.region });
          return new Map();
        }

        let me = meByRegion.get(p.region);
        if (!me) {
          me = await deps.meClient.fetchMe(auth, { region: p.region });
          meByRegion.set(p.region, me);
        }
        const projectIdForUrl = regionToProjectId.get(p.region) || me.projectId;
        if (!regionToProjectId.has(p.region)) {
          deps.logger.warn('ecs purchase no iam project for region, fallback me.projectId', {
            region: p.region,
            fallbackProjectId: me.projectId,
          });
        }
        deps.logger.debug('ecs purchase using me for region', {
          region: p.region,
          projectIdForUrl,
          meProjectId: me.projectId,
          hasAgencyId: Boolean(me.agencyId),
          hasCftk: Boolean(me.cftk),
        });

        // 获取 AZ 列表（与 flavors 请求并行）
        const azList = await deps.azClient.fetchAvailabilityZones(auth, me, {
          region: p.region,
          domainId,
        });

        const flavors = await deps.flavorsClient.fetchFlavors(auth, me, {
          region: p.region,
          projectId: projectIdForUrl,
        });

        // 先应用 abandon 状态过滤
        let specsMap = deps.normalizer.normalizeFlavorsToMap(flavors);
        specsMap = filterEcsPurchaseSpecsByOperationStatus(specsMap);

        // 再应用 AZ 过滤
        if (azList.length > 0) {
          specsMap = filterEcsPurchaseSpecsByAz(specsMap, azList);
        }

        return specsMap;
      },
      async close(): Promise<void> {
        await auth.context.close().catch(() => undefined);
        await auth.browser.close().catch(() => undefined);
      },
    };
  }
}
