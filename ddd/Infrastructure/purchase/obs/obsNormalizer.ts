import type { PurchaseSpec } from '../../../Domain/purchase/purchaseSpec';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';

export class ObsPurchaseNormalizer {
  normalizeOfferingResponseToMap(data: unknown): PurchaseSpecMap {
    const map: PurchaseSpecMap = new Map();
    const root: any = data as any;
    const details = Array.isArray(root?.offering_detail_infos) ? root.offering_detail_infos : [];

    for (const detail of details) {
      const infos = Array.isArray(detail?.offering_infos) ? detail.offering_infos : [];
      for (const info of infos) {
        const params = Array.isArray(info?.offering_params) ? info.offering_params : [];
        const resourceSpec = params.find((p: any) => p?.key === 'resource_spec_info');
        if (!resourceSpec?.value) {
          continue;
        }
        let parsed: any;
        try {
          parsed = typeof resourceSpec.value === 'string' ? JSON.parse(resourceSpec.value) : resourceSpec.value;
        } catch {
          continue;
        }
        const sku = String(parsed?.sku_code || '').trim();
        if (!sku) {
          continue;
        }
        const spec: PurchaseSpec = { key: sku, raw: info };
        map.set(sku, spec);
      }
    }

    return map;
  }
}
