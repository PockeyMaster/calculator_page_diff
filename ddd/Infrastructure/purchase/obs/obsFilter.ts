import type { CalcSpecMap, CalcSpecFilter, PurchaseSpecMap, PurchaseSpecFilter } from '../../../Domain/comparison/filters';

/** 计算器：OBS 规格不需要特殊过滤（预留扩展点） */
export function filterObsCalcSpecs(specs: CalcSpecMap): CalcSpecMap {
  return specs;
}

/** 购买页：OBS 规格不需要特殊过滤（预留扩展点） */
export function filterObsPurchaseSpecs(specs: PurchaseSpecMap): PurchaseSpecMap {
  return specs;
}

export function buildObsCalcSpecFilter(): CalcSpecFilter {
  return filterObsCalcSpecs;
}

export function buildObsPurchaseSpecFilter(): PurchaseSpecFilter {
  return filterObsPurchaseSpecs;
}
