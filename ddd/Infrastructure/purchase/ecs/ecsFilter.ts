import type { CalcSpecMap, CalcSpecFilter, PurchaseSpecMap, PurchaseSpecFilter } from '../../../Domain/comparison/filters';
import type { AzInfo } from './ecsAzClient';

/** 购买页：按 cond:operation:status 排除的取值 */
const ECS_PURCHASE_EXCLUDE_OPERATION_STATUS = new Set<string>(['abandon']);

/** 计算器：过滤 ECS 规格 */
export function filterEcsCalcSpecs(specs: CalcSpecMap): CalcSpecMap {
  const next = new Map(specs);
  for (const [key, spec] of specs.entries()) {
    // 1. 仅保留 resourceSpecCode 以 `.linux` 结尾的规格
    if (!spec.resourceSpecCode.endsWith('.linux')) {
      next.delete(key);
      continue;
    }

    const raw: any = spec.raw as any;
    const productData: any = raw?.productData ?? {};

    // 2. 过滤出同时存在 arch, vmType, generation, cpu, memshow 这几个 key 的产品
    const requiredKeys = ['arch', 'vmType', 'generation', 'cpu', 'memshow'];
    const hasAllRequiredKeys = requiredKeys.every((k) => k in productData);
    if (!hasAllRequiredKeys) {
      next.delete(key);
      continue;
    }

    // 3. 如果 product.planList.some(plan => plan.billingMode === 'RI')，则过滤这个产品
    const planList: any[] = Array.isArray(productData?.planList) ? productData.planList : [];
    const hasRiBilling = planList.some((plan) => plan?.billingMode === 'RI');
    if (hasRiBilling) {
      next.delete(key);
    }
  }
  return next;
}

/** 购买页：过滤 ECS 规格 - 基于 AZ 信息 */
export function filterEcsPurchaseSpecsByAz(
  specs: PurchaseSpecMap,
  azList: AzInfo[],
): PurchaseSpecMap {
  if (azList.length === 0) {
    return specs;
  }

  const availableAzIds = new Set(azList.map((az) => az.id));

  const next = new Map(specs);
  for (const [key, spec] of specs.entries()) {
    const raw: any = spec.raw as any;

    const specAzId = raw?.availability_zone?.id
      || raw?.availability_zone
      || raw?.azId
      || raw?.os_extra_specs?.['availability_zone']
      || raw?.cond_az_id;

    if (specAzId) {
      if (!availableAzIds.has(specAzId)) {
        next.delete(key);
        continue;
      }
    }
  }
  return next;
}

/** 购买页：排除 os_extra_specs 中标记为 abandon 等的规格 */
export function filterEcsPurchaseSpecsByOperationStatus(specs: PurchaseSpecMap): PurchaseSpecMap {
  const next = new Map(specs);
  for (const [key, spec] of specs.entries()) {
    const raw: any = spec.raw as any;
    const status = raw?.os_extra_specs?.['cond:operation:status'];
    if (status && ECS_PURCHASE_EXCLUDE_OPERATION_STATUS.has(String(status))) {
      next.delete(key);
    }
  }
  return next;
}

export function buildEcsCalcSpecFilter(): CalcSpecFilter {
  return filterEcsCalcSpecs;
}

export function buildEcsPurchaseSpecFilter(azList?: AzInfo[]): PurchaseSpecFilter {
  return (specs: PurchaseSpecMap): PurchaseSpecMap => {
    let result = specs;

    if (azList && azList.length > 0) {
      result = filterEcsPurchaseSpecsByAz(result, azList);
    }

    result = filterEcsPurchaseSpecsByOperationStatus(result);

    return result;
  };
}
