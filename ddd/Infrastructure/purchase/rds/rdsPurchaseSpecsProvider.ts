import type { PurchaseSpecsProvider } from '../../../Application/ports/purchaseSpecsProvider';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';
import type { AppLogger } from '../../../Application/ports/logger';
import { PlaywrightClient } from '../../auth/playwrightClient';
import { EcsUserInfoClient } from '../ecs/ecsUserInfoClient';
import { RdsEnginesClient, type RdsEngineItem } from './rdsEnginesClient';
import { RdsConsoleFlavorsClient } from './rdsConsoleFlavorsClient';
import { RdsPurchaseNormalizer } from './rdsNormalizer';
import type { ConsoleIamProjectsClient } from '../shared/iamProjectsClient';
import { filterRequestedRegionsByConsoleEnabled } from '../shared/regionMgrAllowedRegions';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 主备购买页 flavors 请求只传单个 azCode：优先第一个 status/azStatus 为 normal 的可用区；
 * engines 未带状态时回退为 supportAzs 第一项（与控制台常见顺序一致）。
 */
function pickSingleAzCode(engine: RdsEngineItem): string {
  const azs = (engine.supportAzs || []).map((z) => ({
    code: String(z?.code || '').trim(),
    status: String(z?.status ?? z?.azStatus ?? '').trim().toLowerCase(),
  })).filter((z) => z.code);

  if (azs.length === 0) {
    return '';
  }

  const hasStatus = azs.some((z) => z.status.length > 0);
  if (hasStatus) {
    const normal = azs.find((z) => z.status === 'normal');
    return normal?.code ?? '';
  }

  return azs[0]!.code;
}

export class RdsPurchaseSpecsProvider implements PurchaseSpecsProvider {
  constructor(
    private readonly deps: {
      playwright: PlaywrightClient;
      meClient: EcsUserInfoClient;
      enginesClient: RdsEnginesClient;
      flavorsClient: RdsConsoleFlavorsClient;
      normalizer: RdsPurchaseNormalizer;
      iamProjectsClient: ConsoleIamProjectsClient;
      logger: AppLogger;
      consoleBaseUrl: string;
      defaultRegion: string;
      flavorsProductEdition: string;
      flavorsIsServerless: boolean;
      flavorsComputeCategoryTypes: string[];
      flavorsRequestDelayMs: number;
    },
  ) {}

  async createSession(params: { service: string; requestedRegions: string[] }) {
    if (params.service !== 'rds') {
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
      deps.logger.warn('rds iam projects map empty; flavors will fallback to /ecm/rest/me projectId only');
    }

    const allowedRegions = await filterRequestedRegionsByConsoleEnabled({
      auth,
      consoleBaseUrl: deps.consoleBaseUrl,
      domainId,
      firstMe,
      requestedRegions,
      logger: deps.logger,
      logPrefix: 'rds',
    });

    const meByRegion = new Map<string, typeof firstMe>();
    meByRegion.set(firstMe.region, firstMe);

    return {
      allowedRegions,
      async fetchPurchaseSpecs(p: { service: string; region: string }): Promise<PurchaseSpecMap> {
        if (p.service !== 'rds') {
          return new Map();
        }
        if (!allowedRegions.includes(p.region)) {
          deps.logger.warn('rds purchase skip by region permission', { region: p.region });
          return new Map();
        }

        let me = meByRegion.get(p.region);
        if (!me) {
          me = await deps.meClient.fetchMe(auth, { region: p.region });
          meByRegion.set(p.region, me);
        }
        const projectIdForUrl = regionToProjectId.get(p.region) || me.projectId;
        if (!regionToProjectId.has(p.region)) {
          deps.logger.warn('rds purchase no iam project for region, fallback me.projectId', {
            region: p.region,
            fallbackProjectId: me.projectId,
          });
        }

        const engineGroups = await deps.enginesClient.fetchEngineGroups(auth, me, {
          region: p.region,
          projectId: projectIdForUrl,
        });

        const enginesFlat: Array<{ groupType: string; engine: RdsEngineItem }> = [];
        for (const g of engineGroups) {
          const groupType = String(g?.groupType || '').trim() || 'unknown';
          const engines: RdsEngineItem[] = Array.isArray(g?.engines) ? g.engines : [];
          for (const engine of engines) {
            enginesFlat.push({ groupType, engine });
          }
        }

        const map: PurchaseSpecMap = new Map();
        for (const { groupType, engine } of enginesFlat) {
          const engineId = String(engine?.id || '').trim();
          const engineType = String(engine?.name || '').trim();
          const engineVersion = String(engine?.version || '').trim();
          if (!engineId || !engineType) {
            deps.logger.warn('rds skip engine missing id or name', { groupType, engine });
            continue;
          }

          const azCode = pickSingleAzCode(engine);
          if (!azCode) {
            deps.logger.warn('rds skip engine no azCode (no supportAzs or no normal when status present)', {
              groupType,
              engineId,
              engineType,
            });
            continue;
          }

          const haModes =
            Array.isArray(engine.supportHaModes) && engine.supportHaModes.length > 0
              ? engine.supportHaModes.map((m) => String(m).trim()).filter(Boolean)
              : ['ha'];

          for (const haMode of haModes) {
            for (const computeFlavorCategoryType of deps.flavorsComputeCategoryTypes) {
              try {
                const json = await deps.flavorsClient.fetchFlavorsJson(auth, me, {
                  region: p.region,
                  projectId: projectIdForUrl,
                  query: {
                    engineId,
                    haMode,
                    azCode,
                    productEdition: deps.flavorsProductEdition,
                    isServerless: deps.flavorsIsServerless,
                    computeFlavorCategoryType,
                  },
                });
                deps.normalizer.appendConsoleFlavorsToMap(
                  map,
                  {
                    groupType,
                    engineName: engineType,
                    engineVersion,
                    engineId,
                    haMode,
                    productEdition: deps.flavorsProductEdition,
                    computeFlavorCategoryType,
                    azCode,
                  },
                  json,
                );
              } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                deps.logger.error('rds console flavors skip after error', {
                  region: p.region,
                  groupType,
                  engineType,
                  engineVersion,
                  engineId,
                  haMode,
                  computeFlavorCategoryType,
                  message,
                });
              }

              if (deps.flavorsRequestDelayMs > 0) {
                await sleep(deps.flavorsRequestDelayMs);
              }
            }
          }
        }

        return map;
      },
      async close(): Promise<void> {
        await auth.context.close().catch(() => undefined);
        await auth.browser.close().catch(() => undefined);
      },
    };
  }
}
