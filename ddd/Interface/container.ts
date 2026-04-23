import type { Application } from 'egg';
import { RunSpecDiffService } from '../Application/services/runSpecDiffService';
import type { CalcSpecFilter, PurchaseSpecFilter } from '../Domain/comparison/filters';
import { SpecComparator } from '../Domain/comparison/specComparator';
import { MongoSpecDiffRunRepository } from '../Infrastructure/persistence/mongoSpecDiffRunRepository';
import { buildAxiosClient } from '../Infrastructure/http/axiosClient';
import { buildEcsCalcSpecFilter, buildEcsPurchaseSpecFilter } from '../Infrastructure/purchase/ecs/ecsFilter';
import { buildObsCalcSpecFilter, buildObsPurchaseSpecFilter } from '../Infrastructure/purchase/obs/obsFilter';
import { buildEvsCalcSpecFilter, buildEvsPurchaseSpecFilter } from '../Infrastructure/purchase/evs/evsFilter';
import { buildRdsCalcSpecFilter, buildRdsPurchaseSpecFilter } from '../Infrastructure/purchase/rds/rdsFilter';
import { MenuInfoClient } from '../Infrastructure/calc/menuInfoClient';
import { ProductInfoClient } from '../Infrastructure/calc/productInfoClient';
import { CalcNormalizer } from '../Infrastructure/calc/calcNormalizer';
import { CalcSpecsProviderImpl } from '../Infrastructure/calc/calcSpecsProvider';
import { PlaywrightClient } from '../Infrastructure/auth/playwrightClient';
import { EcsUserInfoClient } from '../Infrastructure/purchase/ecs/ecsUserInfoClient';
import { EcsFlavorsClient } from '../Infrastructure/purchase/ecs/ecsFlavorsClient';
import { EcsAzClient } from '../Infrastructure/purchase/ecs/ecsAzClient';
import { EcsPurchaseNormalizer } from '../Infrastructure/purchase/ecs/ecsNormalizer';
import { EcsPurchaseSpecsProvider } from '../Infrastructure/purchase/ecs/ecsPurchaseSpecsProvider';
import { ObsOfferingClient } from '../Infrastructure/purchase/obs/obsOfferingClient';
import { ObsPurchaseNormalizer } from '../Infrastructure/purchase/obs/obsNormalizer';
import { ObsPurchaseSpecsProvider } from '../Infrastructure/purchase/obs/obsPurchaseSpecsProvider';
import { EvsVolumeTypesClient } from '../Infrastructure/purchase/evs/evsVolumeTypesClient';
import { EvsPurchaseNormalizer } from '../Infrastructure/purchase/evs/evsNormalizer';
import { EvsPurchaseSpecsProvider } from '../Infrastructure/purchase/evs/evsPurchaseSpecsProvider';
import { RdsEnginesClient } from '../Infrastructure/purchase/rds/rdsEnginesClient';
import { RdsConsoleFlavorsClient } from '../Infrastructure/purchase/rds/rdsConsoleFlavorsClient';
import { RdsPurchaseNormalizer } from '../Infrastructure/purchase/rds/rdsNormalizer';
import { RdsPurchaseSpecsProvider } from '../Infrastructure/purchase/rds/rdsPurchaseSpecsProvider';
import { RoutingPurchaseSpecsProvider } from '../Infrastructure/purchase/routingPurchaseSpecsProvider';
import { ConsoleIamProjectsClient } from '../Infrastructure/purchase/shared/iamProjectsClient';

export interface DddContainer {
  runSpecDiffService: RunSpecDiffService;
}

export function buildDddContainer(app: Application): DddContainer {
  const cfg = app.config as any;
  const repo = new MongoSpecDiffRunRepository({
    mongoUri: cfg.mongo.uri,
    dbName: cfg.mongo.dbName,
    collection: cfg.mongo.collection,
  });

  const calcHttp = buildAxiosClient({
    baseURL: cfg.calculator.baseUrl,
    timeoutMs: cfg.calculator.requestTimeoutMs,
  });
  const menuInfoClient = new MenuInfoClient({
    http: calcHttp,
    sign: cfg.calculator.sign,
    language: cfg.calculator.language,
  });
  const productInfoClient = new ProductInfoClient({
    http: calcHttp,
    sign: cfg.calculator.sign,
    tag: cfg.calculator.tag,
    tab: cfg.calculator.tab,
  });
  const normalizer = new CalcNormalizer();
  const calcSpecsProvider = new CalcSpecsProviderImpl({
    menuInfoClient,
    productInfoClient,
    normalizer,
  });
  const playwright = new PlaywrightClient({
    ...cfg.playwright,
    logger: app.logger,
  });
  const meClient = new EcsUserInfoClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    region: cfg.purchase.defaultRegion,
    logger: app.logger,
  });
  const flavorsClient = new EcsFlavorsClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    region: cfg.purchase.defaultRegion,
    xTargetServices: cfg.purchase.ecs.xTargetServices,
    logger: app.logger,
  });
  const azClient = new EcsAzClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    region: cfg.purchase.defaultRegion,
    xTargetServices: cfg.purchase.ecs.xTargetServices,
    logger: app.logger,
  });
  const ecsNormalizer = new EcsPurchaseNormalizer();
  const iamProjectsClient = new ConsoleIamProjectsClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    logger: app.logger,
  });
  const ecsPurchaseSpecsProvider = new EcsPurchaseSpecsProvider({
    playwright,
    meClient,
    flavorsClient,
    azClient,
    normalizer: ecsNormalizer,
    iamProjectsClient,
    logger: app.logger,
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    defaultRegion: cfg.purchase.defaultRegion,
  });
  const obsOfferingClient = new ObsOfferingClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    region: cfg.purchase.defaultRegion,
    xTargetServices: cfg.purchase.obs.xTargetServices,
    resourceTypeCode: cfg.purchase.obs.resourceTypeCode,
    serviceTypeCode: cfg.purchase.obs.serviceTypeCode,
    siteCode: cfg.purchase.obs.siteCode,
    purchaseModel: cfg.purchase.obs.purchaseModel,
    offeringLimit: cfg.purchase.obs.offeringLimit,
    logger: app.logger,
  });
  const obsNormalizer = new ObsPurchaseNormalizer();
  const obsPurchaseSpecsProvider = new ObsPurchaseSpecsProvider({
    playwright,
    meClient,
    offeringClient: obsOfferingClient,
    normalizer: obsNormalizer,
    iamProjectsClient,
    logger: app.logger,
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    defaultRegion: cfg.purchase.defaultRegion,
  });
  const evsVolumeTypesClient = new EvsVolumeTypesClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    region: cfg.purchase.defaultRegion,
    xTargetServices: cfg.purchase.evs.xTargetServices,
    logger: app.logger,
  });
  const evsNormalizer = new EvsPurchaseNormalizer();
  const evsPurchaseSpecsProvider = new EvsPurchaseSpecsProvider({
    playwright,
    meClient,
    volumeTypesClient: evsVolumeTypesClient,
    normalizer: evsNormalizer,
    iamProjectsClient,
    logger: app.logger,
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    defaultRegion: cfg.purchase.defaultRegion,
  });
  const rdsEnginesClient = new RdsEnginesClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    region: cfg.purchase.defaultRegion,
    payMode: cfg.purchase.rds.enginesPayMode,
    xTargetServices: cfg.purchase.rds.enginesXTargetServices,
    logger: app.logger,
  });
  const rdsConsoleFlavorsClient = new RdsConsoleFlavorsClient({
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    region: cfg.purchase.defaultRegion,
    xTargetServices: cfg.purchase.rds.flavorsXTargetServices,
    logger: app.logger,
  });
  const rdsNormalizer = new RdsPurchaseNormalizer();
  const rdsPurchaseSpecsProvider = new RdsPurchaseSpecsProvider({
    playwright,
    meClient,
    enginesClient: rdsEnginesClient,
    flavorsClient: rdsConsoleFlavorsClient,
    normalizer: rdsNormalizer,
    iamProjectsClient,
    logger: app.logger,
    consoleBaseUrl: cfg.purchase.consoleBaseUrl,
    defaultRegion: cfg.purchase.defaultRegion,
    flavorsProductEdition: cfg.purchase.rds.flavorsProductEdition,
    flavorsIsServerless: cfg.purchase.rds.flavorsIsServerless,
    flavorsComputeCategoryTypes: cfg.purchase.rds.flavorsComputeCategoryTypes,
    flavorsRequestDelayMs: cfg.purchase.rds.flavorsRequestDelayMs,
  });
  const purchaseSpecsProvider = new RoutingPurchaseSpecsProvider(
    ecsPurchaseSpecsProvider,
    obsPurchaseSpecsProvider,
    evsPurchaseSpecsProvider,
    rdsPurchaseSpecsProvider,
  );
  const comparator = new SpecComparator();

  const calcSpecFilter = (service: string): CalcSpecFilter => {
    switch (service) {
      case 'ecs':
        return buildEcsCalcSpecFilter();
      case 'obs':
        return buildObsCalcSpecFilter();
      case 'evs':
        return buildEvsCalcSpecFilter();
      case 'rds':
        return buildRdsCalcSpecFilter();
      default:
        return (specs) => specs;
    }
  };

  const purchaseSpecFilter = (service: string): PurchaseSpecFilter => {
    switch (service) {
      case 'ecs':
        return buildEcsPurchaseSpecFilter();
      case 'obs':
        return buildObsPurchaseSpecFilter();
      case 'evs':
        return buildEvsPurchaseSpecFilter();
      case 'rds':
        return buildRdsPurchaseSpecFilter();
      default:
        return (specs) => specs;
    }
  };

  const runSpecDiffService = new RunSpecDiffService({
    calcSpecsProvider,
    purchaseSpecsProvider,
    calcSpecFilter,
    purchaseSpecFilter,
    repository: repo,
    comparator,
    logger: app.logger,
  });

  return { runSpecDiffService };
}

