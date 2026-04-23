import type { CalcSpecsProvider } from '../../Application/ports/calcSpecsProvider';
import type { CalcSpecMap } from '../../Domain/comparison/filters';

export class StubCalcSpecsProvider implements CalcSpecsProvider {
  async fetchRegions(_params: { service: string }): Promise<string[]> {
    return [];
  }

  async fetchCalcSpecs(_params: { service: string; region: string }): Promise<CalcSpecMap> {
    return new Map();
  }
}

