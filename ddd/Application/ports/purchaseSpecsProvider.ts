import type { PurchaseSpecMap } from '../../Domain/comparison/filters';

export interface PurchaseSpecsSession {
  allowedRegions: string[];
  fetchPurchaseSpecs(params: { service: string; region: string }): Promise<PurchaseSpecMap>;
  close(): Promise<void>;
}

export interface PurchaseSpecsProvider {
  createSession(params: { service: string; requestedRegions: string[] }): Promise<PurchaseSpecsSession>;
}

