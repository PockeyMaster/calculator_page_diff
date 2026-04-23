import type { PurchaseSpecsProvider, PurchaseSpecsSession } from '../../Application/ports/purchaseSpecsProvider';
import { EcsPurchaseSpecsProvider } from './ecs/ecsPurchaseSpecsProvider';
import { ObsPurchaseSpecsProvider } from './obs/obsPurchaseSpecsProvider';
import { EvsPurchaseSpecsProvider } from './evs/evsPurchaseSpecsProvider';
import { RdsPurchaseSpecsProvider } from './rds/rdsPurchaseSpecsProvider';

const emptySession: PurchaseSpecsSession = {
  allowedRegions: [],
  async fetchPurchaseSpecs() {
    return new Map();
  },
  async close() {
    return;
  },
};

export class RoutingPurchaseSpecsProvider implements PurchaseSpecsProvider {
  constructor(
    private readonly ecs: EcsPurchaseSpecsProvider,
    private readonly obs: ObsPurchaseSpecsProvider,
    private readonly evs: EvsPurchaseSpecsProvider,
    private readonly rds: RdsPurchaseSpecsProvider,
  ) {}

  async createSession(params: { service: string; requestedRegions: string[] }): Promise<PurchaseSpecsSession> {
    if (params.service === 'ecs') {
      return this.ecs.createSession(params);
    }
    if (params.service === 'obs') {
      return this.obs.createSession(params);
    }
    if (params.service === 'evs') {
      return this.evs.createSession(params);
    }
    if (params.service === 'rds') {
      return this.rds.createSession(params);
    }
    return emptySession;
  }
}
