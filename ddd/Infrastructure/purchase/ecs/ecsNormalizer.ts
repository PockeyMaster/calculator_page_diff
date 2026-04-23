import type { PurchaseSpec } from '../../../Domain/purchase/purchaseSpec';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';

export class EcsPurchaseNormalizer {
  normalizeFlavorsToMap(flavors: any[]): PurchaseSpecMap {
    const map: PurchaseSpecMap = new Map();
    for (const f of flavors) {
      const id = String(f?.id || f?.name || '').trim();
      if (!id) {
        continue;
      }
      const spec: PurchaseSpec = { key: id, raw: f };
      map.set(id, spec);
    }
    return map;
  }
}
