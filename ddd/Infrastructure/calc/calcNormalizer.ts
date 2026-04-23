import type { CalcSpec } from '../../Domain/calculator/calcSpec';
import type { CalcSpecMap } from '../../Domain/comparison/filters';

export class CalcNormalizer {
  normalizeProductInfoToMap(productInfo: unknown): CalcSpecMap {
    const data: any = productInfo as any;
    const product: any = data?.product ?? {};
    const map: CalcSpecMap = new Map();

    for (const groupName of Object.keys(product)) {
      const items: any[] = Array.isArray(product[groupName]) ? product[groupName] : [];
      for (const it of items) {
        const code = String(it?.resourceSpecCode || '').trim();
        if (!code) {
          continue;
        }
        const spec: CalcSpec = {
          resourceSpecCode: code,
          cloudServiceType: it?.cloudServiceType ? String(it.cloudServiceType) : undefined,
          resourceType: it?.resourceType ? String(it.resourceType) : undefined,
          raw: it,
        };
        map.set(code, spec);
      }
    }

    return map;
  }
}

