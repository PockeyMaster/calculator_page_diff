import type { CalcSpecMap } from '../../Domain/comparison/filters';

export interface CalcSpecsProvider {
  fetchRegions(params: { service: string }): Promise<string[]>;
  fetchCalcSpecs(params: { service: string; region: string }): Promise<CalcSpecMap>;
}

