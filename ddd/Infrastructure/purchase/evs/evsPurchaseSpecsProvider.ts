import type { PurchaseSpecsProvider } from '../../../Application/ports/purchaseSpecsProvider';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';
import type { AppLogger } from '../../../Application/ports/logger';
import { PlaywrightClient } from '../../auth/playwrightClient';
import { EcsUserInfoClient } from '../ecs/ecsUserInfoClient';
import { EvsVolumeTypesClient } from './evsVolumeTypesClient';
import { EvsPurchaseNormalizer } from './evsNormalizer';
import type { ConsoleIamProjectsClient } from '../shared/iamProjectsClient';
import { filterRequestedRegionsByConsoleEnabled } from '../shared/regionMgrAllowedRegions';

export class EvsPurchaseSpecsProvider implements PurchaseSpecsProvider {
  constructor(
    private readonly deps: {
      playwright: PlaywrightClient;
      meClient: EcsUserInfoClient;
      volumeTypesClient: EvsVolumeTypesClient;
      normalizer: EvsPurchaseNormalizer;
      iamProjectsClient: ConsoleIamProjectsClient;
      logger: AppLogger;
      consoleBaseUrl: string;
      defaultRegion: string;
    },
  ) {}

  async createSession(params: { service: string; requestedRegions: string[] }) {
    if (params.service !== 'evs') {
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
    const auth = await deps.playwright.login();
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
      deps.logger.warn('evs iam projects map empty; types will fallback to /ecm/rest/me projectId only');
    }

    const allowedRegions = await filterRequestedRegionsByConsoleEnabled({
      auth,
      consoleBaseUrl: deps.consoleBaseUrl,
      domainId,
      firstMe,
      requestedRegions,
      logger: deps.logger,
      logPrefix: 'evs',
    });

    const meByRegion = new Map<string, typeof firstMe>();
    meByRegion.set(firstMe.region, firstMe);

    return {
      allowedRegions,
      async fetchPurchaseSpecs(p: { service: string; region: string }): Promise<PurchaseSpecMap> {
        if (p.service !== 'evs') {
          return new Map();
        }
        if (!allowedRegions.includes(p.region)) {
          deps.logger.warn('evs purchase skip by region permission', { region: p.region });
          return new Map();
        }

        let me = meByRegion.get(p.region);
        if (!me) {
          me = await deps.meClient.fetchMe(auth, { region: p.region });
          meByRegion.set(p.region, me);
        }
        const projectIdForUrl = regionToProjectId.get(p.region) || me.projectId;
        if (!regionToProjectId.has(p.region)) {
          deps.logger.warn('evs purchase no iam project for region, fallback me.projectId', {
            region: p.region,
            fallbackProjectId: me.projectId,
          });
        }
        deps.logger.debug('evs purchase using me for region', {
          region: p.region,
          projectIdForUrl,
          meProjectId: me.projectId,
          hasAgencyId: Boolean(me.agencyId),
          hasCftk: Boolean(me.cftk),
        });

        const volumeTypes = await deps.volumeTypesClient.fetchVolumeTypes(auth, me, {
          region: p.region,
          projectId: projectIdForUrl,
        });
        return deps.normalizer.normalizeVolumeTypesToMap(volumeTypes);
      },
      async close(): Promise<void> {
        await auth.context.close().catch(() => undefined);
        await auth.browser.close().catch(() => undefined);
      },
    };
  }
}
