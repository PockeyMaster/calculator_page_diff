import type { CalcSpecMap, CalcSpecFilter, PurchaseSpecMap, PurchaseSpecFilter } from '../../../Domain/comparison/filters';

/** 计算器：EVS 规格过滤 - 排除 GPSSD2.throught 和 General_Purpose_SSD_V2 */
export function filterEvsCalcSpecs(specs: CalcSpecMap): CalcSpecMap {
  const excludedCodes = ['GPSSD2.throught', 'General_Purpose_SSD_V2'];
  const next = new Map(specs);
  for (const [key, spec] of specs.entries()) {
    if (excludedCodes.includes(spec.resourceSpecCode)) {
      next.delete(key);
    }
  }
  return next;
}

/** 购买页：EVS 规格不需要特殊过滤（预留扩展点） */
export function filterEvsPurchaseSpecs(specs: PurchaseSpecMap): PurchaseSpecMap {
  return specs;
}

export function buildEvsCalcSpecFilter(): CalcSpecFilter {
  return filterEvsCalcSpecs;
}

export function buildEvsPurchaseSpecFilter(): PurchaseSpecFilter {
  return filterEvsPurchaseSpecs;
}
