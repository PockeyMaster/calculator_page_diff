import type { CalcSpecMap, CalcSpecFilter, PurchaseSpecMap, PurchaseSpecFilter } from '../../../Domain/comparison/filters';

/** 计算器：RDS 规格不需要特殊过滤（预留扩展点） */
export function filterRdsCalcSpecs(specs: CalcSpecMap): CalcSpecMap {
  return specs;
}

/** 购买页：RDS 规格不需要特殊过滤（预留扩展点） */
export function filterRdsPurchaseSpecs(specs: PurchaseSpecMap): PurchaseSpecMap {
  return specs;
}

export function buildRdsCalcSpecFilter(): CalcSpecFilter {
  return filterRdsCalcSpecs;
}

export function buildRdsPurchaseSpecFilter(): PurchaseSpecFilter {
  return filterRdsPurchaseSpecs;
}
