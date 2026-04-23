export type DiffStatus = 'only_in_calc' | 'only_in_purchase' | 'matched' | 'differ';

export interface FieldDiff {
  path: string;
  left?: unknown;
  right?: unknown;
}

export interface SpecDiffItem {
  status: DiffStatus;
  fieldDiffs?: FieldDiff[];
}

export interface DiffSummary {
  onlyInCalc: number;
  onlyInPurchase: number;
  differ: number;
  match: number;
}

export interface SpecDiffResult {
  byKey: Record<string, SpecDiffItem>;
  summary: DiffSummary;
  onlyInCalcKeys: string[];
  onlyInPurchaseKeys: string[];
}

