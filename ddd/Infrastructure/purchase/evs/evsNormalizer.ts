import type { PurchaseSpec } from '../../../Domain/purchase/purchaseSpec';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';

export class EvsPurchaseNormalizer {
  normalizeVolumeTypesToMap(volumeTypes: any[]): PurchaseSpecMap {
    const map: PurchaseSpecMap = new Map();
    for (const vt of volumeTypes) {
      const id = String(vt?.name || vt?.id || '').trim();
      if (!id) {
        continue;
      }
      const spec: PurchaseSpec = { key: id, raw: vt };
      map.set(id, spec);
    }
    return map;
  }
}
