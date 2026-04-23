import type { CalcSpecMap, PurchaseSpecMap } from './filters';
import type { FieldDiff, SpecDiffResult } from './specDiff';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function diffUnknown(left: unknown, right: unknown, basePath: string, out: FieldDiff[]) {
  if (left === right) {
    return;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i++) {
      diffUnknown(left[i], right[i], `${basePath}[${i}]`, out);
    }
    return;
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const k of keys) {
      const p = basePath ? `${basePath}.${k}` : k;
      diffUnknown(left[k], right[k], p, out);
    }
    return;
  }

  out.push({ path: basePath, left, right });
}

export class SpecComparator {
  compare(calcSpecs: CalcSpecMap, purchaseSpecs: PurchaseSpecMap): SpecDiffResult {
    const keys = new Set<string>([...calcSpecs.keys(), ...purchaseSpecs.keys()]);

    const byKey: Record<string, any> = {};
    const onlyInCalcKeys: string[] = [];
    const onlyInPurchaseKeys: string[] = [];

    let onlyInCalc = 0;
    let onlyInPurchase = 0;
    let differ = 0;
    let match = 0;

    for (const key of keys) {
      const c = calcSpecs.get(key);
      const p = purchaseSpecs.get(key);
      if (c && !p) {
        byKey[key] = { status: 'only_in_calc' };
        onlyInCalc++;
        onlyInCalcKeys.push(key);
        continue;
      }
      if (!c && p) {
        byKey[key] = { status: 'only_in_purchase' };
        onlyInPurchase++;
        onlyInPurchaseKeys.push(key);
        continue;
      }

      const diffs: FieldDiff[] = [];
      diffUnknown(c!.raw, p!.raw, '', diffs);
      if (diffs.length === 0) {
        byKey[key] = { status: 'matched' };
        match++;
      } else {
        byKey[key] = { status: 'differ', fieldDiffs: diffs };
        differ++;
      }
    }

    return {
      byKey,
      summary: { onlyInCalc, onlyInPurchase, differ, match },
      onlyInCalcKeys,
      onlyInPurchaseKeys,
    };
  }
}

