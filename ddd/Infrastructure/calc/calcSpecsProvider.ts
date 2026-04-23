import type { CalcSpecsProvider } from '../../Application/ports/calcSpecsProvider';
import type { CalcSpecMap } from '../../Domain/comparison/filters';
import { MenuInfoClient } from './menuInfoClient';
import { ProductInfoClient } from './productInfoClient';
import { CalcNormalizer } from './calcNormalizer';

export class CalcSpecsProviderImpl implements CalcSpecsProvider {
  constructor(
    private readonly deps: {
      menuInfoClient: MenuInfoClient;
      productInfoClient: ProductInfoClient;
      normalizer: CalcNormalizer;
      maxTargets?: number;
    },
  ) {}

  private filterTargetsByService(targets: { urlPath: string; regions: string[] }[], service: string) {
    if (service === 'ecs') {
      return targets.filter((t) => t.urlPath === 'ecs');
    }
    if (service === 'obs') {
      return targets.filter((t) => t.urlPath === 'obs');
    }
    if (service === 'evs') {
      return targets.filter((t) => t.urlPath === 'evs');
    }
    if (service === 'rds') {
      return targets.filter((t) => t.urlPath === 'rds');
    }
    return targets;
  }

  async fetchRegions(params: { service: string }): Promise<string[]> {
    const targets = await this.deps.menuInfoClient.fetchTargets();
    const filteredTargets = this.filterTargetsByService(targets, params.service);

    const limited = this.deps.maxTargets
      ? filteredTargets.slice(0, this.deps.maxTargets)
      : filteredTargets;

    const set = new Set<string>();
    for (const t of limited) {
      for (const r of t.regions) {
        if (r) {
          set.add(r);
        }
      }
    }
    return Array.from(set);
  }

  async fetchCalcSpecs(params: { service: string; region: string }): Promise<CalcSpecMap> {
    const targets = await this.deps.menuInfoClient.fetchTargets();
    const filteredTargets = this.filterTargetsByService(targets, params.service);

    const limited = this.deps.maxTargets
      ? filteredTargets.slice(0, this.deps.maxTargets)
      : filteredTargets;

    const merged: CalcSpecMap = new Map();
    for (const t of limited) {
      if (!t.regions.includes(params.region)) {
        continue;
      }
      const productInfo = await this.deps.productInfoClient.fetchProductInfo({
        urlPath: t.urlPath,
        region: params.region,
      });
      const map = this.deps.normalizer.normalizeProductInfoToMap(productInfo);
      for (const [k, v] of map.entries()) {
        merged.set(k, v);
      }
    }
    return merged;
  }
}

