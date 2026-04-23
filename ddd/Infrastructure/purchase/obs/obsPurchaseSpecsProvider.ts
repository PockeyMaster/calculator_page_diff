import type { PurchaseSpecsProvider } from '../../../Application/ports/purchaseSpecsProvider';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';
import type { AppLogger } from '../../../Application/ports/logger';
import { PlaywrightClient } from '../../auth/playwrightClient';
import { EcsUserInfoClient } from '../ecs/ecsUserInfoClient';
import { ObsOfferingClient } from './obsOfferingClient';
import { ObsPurchaseNormalizer } from './obsNormalizer';
import type { ConsoleIamProjectsClient } from '../shared/iamProjectsClient';
import { filterRequestedRegionsByConsoleEnabled } from '../shared/regionMgrAllowedRegions';

export class ObsPurchaseSpecsProvider implements PurchaseSpecsProvider {
  constructor(
    private readonly deps: {
      playwright: PlaywrightClient;
      meClient: EcsUserInfoClient;
      offeringClient: ObsOfferingClient;
      normalizer: ObsPurchaseNormalizer;
      iamProjectsClient: ConsoleIamProjectsClient;
      logger: AppLogger;
      consoleBaseUrl: string;
      defaultRegion: string;
    },
  ) {}

  async createSession(params: { service: string; requestedRegions: string[] }) {
    if (params.service !== 'obs') {
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

    const regionToProjectId = await deps.iamProjectsClient.fetchRegionToProjectId(
      auth,
      firstMe,
      regionForHeaders,
    );
    if (regionToProjectId.size === 0) {
      deps.logger.warn('obs iam projects map empty; offering query will fallback to /ecm/rest/me projectId only');
    }

    const allowedRegions = await filterRequestedRegionsByConsoleEnabled({
      auth,
      consoleBaseUrl: deps.consoleBaseUrl,
      domainId: firstMe.domainId,
      firstMe,
      requestedRegions,
      logger: deps.logger,
      logPrefix: 'obs',
    });

    const meByRegion = new Map<string, typeof firstMe>();
    meByRegion.set(firstMe.region, firstMe);

    return {
      allowedRegions,
      async fetchPurchaseSpecs(p: { service: string; region: string }): Promise<PurchaseSpecMap> {
        if (p.service !== 'obs') {
          return new Map();
        }
        if (!allowedRegions.includes(p.region)) {
          deps.logger.warn('obs purchase skip by region permission', { region: p.region });
          return new Map();
        }

        let me = meByRegion.get(p.region);
        if (!me) {
          me = await deps.meClient.fetchMe(auth, { region: p.region });
          meByRegion.set(p.region, me);
        }
        const projectIdForBody = regionToProjectId.get(p.region) || me.projectId;
        if (!regionToProjectId.has(p.region)) {
          deps.logger.warn('obs purchase no iam project for region, fallback me.projectId', {
            region: p.region,
            fallbackProjectId: me.projectId,
          });
        }
        deps.logger.debug('obs purchase using me for region', {
          region: p.region,
          projectIdForBody,
          meProjectId: me.projectId,
          hasAgencyId: Boolean(me.agencyId),
          hasCftk: Boolean(me.cftk),
        });

        const data = await deps.offeringClient.fetchOfferingQueryResponse(auth, me, {
          region: p.region,
          projectId: projectIdForBody,
        });
        return deps.normalizer.normalizeOfferingResponseToMap(data);
      },
      async close(): Promise<void> {
        await auth.context.close().catch(() => undefined);
        await auth.browser.close().catch(() => undefined);
      },
    };
  }
}
