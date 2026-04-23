import type { CalcSpec } from '../calculator/calcSpec';
import type { PurchaseSpec } from '../purchase/purchaseSpec';

export type CalcSpecMap = Map<string, CalcSpec>;
export type PurchaseSpecMap = Map<string, PurchaseSpec>;

export type CalcSpecFilter = (specs: CalcSpecMap) => CalcSpecMap;
export type PurchaseSpecFilter = (specs: PurchaseSpecMap) => PurchaseSpecMap;

