import type { PurchaseSpec } from '../../../Domain/purchase/purchaseSpec';
import type { PurchaseSpecMap } from '../../../Domain/comparison/filters';

export interface RdsFlavorSourceMeta {
  groupType: string;
  engineName: string;
  engineVersion: string;
  engineId: string;
  haMode: string;
  productEdition: string;
  computeFlavorCategoryType: string;
  azCode: string;
}

function putFlavorRow(
  map: PurchaseSpecMap,
  meta: RdsFlavorSourceMeta,
  row: any,
  keyPrefix: string,
): void {
  const baseKey = String(row?.code || row?.iaasCode || row?.id || '').trim();
  if (!baseKey) {
    return;
  }
  const prefixed = keyPrefix ? `${keyPrefix}${baseKey}` : baseKey;
  let key = prefixed;
  if (map.has(key)) {
    const suffix = String(row?.id || '').trim();
    key = suffix ? `${prefixed}#${suffix}` : `${prefixed}#${map.size}`;
  }
  const spec: PurchaseSpec = {
    key,
    raw: {
      ...meta,
      flavor: row,
    },
  };
  map.set(key, spec);
}

/** 解析控制台 GET .../rds/v2.1/{pid}/flavors 返回的 flavorCategory */
export class RdsPurchaseNormalizer {
  appendConsoleFlavorsToMap(map: PurchaseSpecMap, meta: RdsFlavorSourceMeta, response: unknown): void {
    const data: any = response as any;
    const fc = data?.flavorCategory;
    if (!fc) {
      return;
    }

    const groups: any[] = Array.isArray(fc.computeFlavorGroups) ? fc.computeFlavorGroups : [];
    for (const g of groups) {
      const rows: any[] = Array.isArray(g?.computeFlavors) ? g.computeFlavors : [];
      for (const row of rows) {
        putFlavorRow(map, meta, row, '');
      }
    }

    const volumes: any[] = Array.isArray(fc.volumeFlavors) ? fc.volumeFlavors : [];
    for (const row of volumes) {
      putFlavorRow(map, meta, row, 'volume:');
    }

    const licenses: any[] = Array.isArray(fc.licenseFlavors) ? fc.licenseFlavors : [];
    for (const row of licenses) {
      putFlavorRow(map, meta, row, 'license:');
    }

    const dec: any[] = Array.isArray(fc.decServiceFlavors) ? fc.decServiceFlavors : [];
    for (const row of dec) {
      putFlavorRow(map, meta, row, 'dec:');
    }
  }
}
