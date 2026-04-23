import type { PurchaseSpecsProvider } from '../../Application/ports/purchaseSpecsProvider';
import type { PurchaseSpecMap } from '../../Domain/comparison/filters';

export class StubPurchaseSpecsProvider implements PurchaseSpecsProvider {
  async createSession(_params: { service: string; requestedRegions: string[] }) {
    return {
      allowedRegions: [],
      async fetchPurchaseSpecs(_params: { service: string; region: string }): Promise<PurchaseSpecMap> {
        return new Map();
      },
      async close(): Promise<void> {
        return;
      },
    };
  }
}

