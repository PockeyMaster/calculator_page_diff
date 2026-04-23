import assert from 'assert';
import { RunSpecDiffService } from '../../ddd/Application/services/runSpecDiffService';
import { SpecComparator } from '../../ddd/Domain/comparison/specComparator';

describe('RunSpecDiffService', () => {
  it('should fetch, filter, compare and persist', async () => {
    const saved: any[] = [];

    const svc = new RunSpecDiffService({
      calcSpecsProvider: {
        async fetchRegions() {
          return ['cn-north-4'];
        },
        async fetchCalcSpecs() {
          return new Map([['k1', { resourceSpecCode: 'k1', raw: { a: 1 } }]]) as any;
        },
      },
      purchaseSpecsProvider: {
        async createSession(_params: { service: string; requestedRegions: string[] }) {
          return {
            allowedRegions: ['cn-north-4'],
            async fetchPurchaseSpecs() {
              return new Map([['k1', { key: 'k1', raw: { a: 2 } }]]) as any;
            },
            async close() {
              return;
            },
          };
        },
      },
      calcSpecFilter: () => (m) => m,
      purchaseSpecFilter: () => (m) => m,
      repository: {
        async save(run: Record<string, unknown>) {
          saved.push(run);
          return 'id1';
        },
      },
      comparator: new SpecComparator(),
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    const res = await svc.runOnce({ service: 'ecs', triggerType: 'manual' });
    assert.strictEqual(res.runs.length, 1);
    assert.strictEqual(res.runs[0].runId, 'id1');
    assert.strictEqual(res.runs[0].region, 'cn-north-4');
    assert.strictEqual(res.runs[0].summary.differ, 1);
    assert.strictEqual(saved.length, 1);
    assert.strictEqual(saved[0].region, 'cn-north-4');
  });
});
