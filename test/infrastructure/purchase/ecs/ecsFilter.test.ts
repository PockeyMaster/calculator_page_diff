import assert from 'assert';
import {
  filterEcsCalcSpecs,
  filterEcsPurchaseSpecsByAz,
  filterEcsPurchaseSpecsByOperationStatus,
  buildEcsCalcSpecFilter,
  buildEcsPurchaseSpecFilter,
} from '../../../../ddd/Infrastructure/purchase/ecs/ecsFilter';
import type { CalcSpecMap, PurchaseSpecMap } from '../../../../ddd/Domain/comparison/filters';

describe('filterEcsCalcSpecs', () => {
  function makeCalcSpecs(...items: Array<{ resourceSpecCode: string; productData?: any }>): CalcSpecMap {
    const map: CalcSpecMap = new Map();
    for (const item of items) {
      map.set(item.resourceSpecCode, {
        resourceSpecCode: item.resourceSpecCode,
        raw: { productData: item.productData ?? {} },
      });
    }
    return map;
  }

  it('should keep specs with .linux suffix and all required keys', () => {
    const specs = makeCalcSpecs({
      resourceSpecCode: 'c6.large.2.linux',
      productData: {
        arch: 'x86',
        vmType: 'KVM',
        generation: 'c6',
        cpu: 2,
        memshow: '4GB',
      },
    });

    const result = filterEcsCalcSpecs(specs);
    assert.strictEqual(result.size, 1);
  });

  it('should filter out specs not ending with .linux', () => {
    const specs = makeCalcSpecs(
      {
        resourceSpecCode: 'c6.large.2.windows',
        productData: { arch: 'x86', vmType: 'KVM', generation: 'c6', cpu: 2, memshow: '4GB' },
      },
      {
        resourceSpecCode: 'c6.large.2.linux',
        productData: { arch: 'x86', vmType: 'KVM', generation: 'c6', cpu: 2, memshow: '4GB' },
      },
    );

    const result = filterEcsCalcSpecs(specs);
    assert.strictEqual(result.size, 1);
    assert.ok(result.has('c6.large.2.linux'));
  });

  it('should filter out specs missing one of the required keys', () => {
    const requiredKeys = ['arch', 'vmType', 'generation', 'cpu', 'memshow'];
    for (const missing of requiredKeys) {
      const pd: any = { arch: 'x86', vmType: 'KVM', generation: 'c6', cpu: 2, memshow: '4GB' };
      delete pd[missing];
      const specs = makeCalcSpecs({ resourceSpecCode: `spec.linux`, productData: pd });
      const result = filterEcsCalcSpecs(specs);
      assert.strictEqual(result.size, 0, `should filter when missing ${missing}`);
    }
  });

  it('should filter out specs with RI billing plan', () => {
    const specs = makeCalcSpecs(
      {
        resourceSpecCode: 'with-ri.linux',
        productData: {
          arch: 'x86', vmType: 'KVM', generation: 'c6', cpu: 2, memshow: '4GB',
          planList: [{ billingMode: 'RI' }],
        },
      },
      {
        resourceSpecCode: 'no-ri.linux',
        productData: {
          arch: 'x86', vmType: 'KVM', generation: 'c6', cpu: 2, memshow: '4GB',
          planList: [{ billingMode: 'PAYG' }],
        },
      },
    );

    const result = filterEcsCalcSpecs(specs);
    assert.strictEqual(result.size, 1);
    assert.ok(result.has('no-ri.linux'));
  });

  it('should handle empty planList', () => {
    const specs = makeCalcSpecs({
      resourceSpecCode: 'spec.linux',
      productData: { arch: 'x86', vmType: 'KVM', generation: 'c6', cpu: 2, memshow: '4GB', planList: [] },
    });

    const result = filterEcsCalcSpecs(specs);
    assert.strictEqual(result.size, 1);
  });

  it('should handle missing productData', () => {
    const map: CalcSpecMap = new Map();
    map.set('spec.linux', { resourceSpecCode: 'spec.linux', raw: {} });

    const result = filterEcsCalcSpecs(map);
    assert.strictEqual(result.size, 0);
  });

  it('should return empty map when all specs are filtered', () => {
    const specs = makeCalcSpecs(
      { resourceSpecCode: 'spec.windows', productData: { arch: 'x86' } },
      { resourceSpecCode: 'spec.linux', productData: { arch: 'x86' } },
    );

    const result = filterEcsCalcSpecs(specs);
    assert.strictEqual(result.size, 0);
  });
});

describe('filterEcsPurchaseSpecsByAz', () => {
  function makeSpec(key: string, raw: any): PurchaseSpecMap {
    const map: PurchaseSpecMap = new Map();
    map.set(key, { key, raw });
    return map;
  }

  const azList = [{ id: 'az1' }, { id: 'az2' }];

  it('should return all specs when azList is empty', () => {
    const specs = makeSpec('s1', {});
    const result = filterEcsPurchaseSpecsByAz(specs, []);
    assert.strictEqual(result.size, 1);
  });

  it('should keep spec with matching availability_zone.id', () => {
    const specs = makeSpec('s1', { availability_zone: { id: 'az1' } });
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 1);
  });

  it('should filter spec with non-matching availability_zone.id', () => {
    const specs = makeSpec('s1', { availability_zone: { id: 'az9' } });
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 0);
  });

  it('should match azId field', () => {
    const specs = makeSpec('s1', { azId: 'az2' });
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 1);
  });

  it('should match availability_zone as scalar', () => {
    const specs = makeSpec('s1', { availability_zone: 'az1' });
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 1);
  });

  it('should match os_extra_specs availability_zone', () => {
    const specs = makeSpec('s1', { os_extra_specs: { availability_zone: 'az2' } });
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 1);
  });

  it('should match cond_az_id field', () => {
    const specs = makeSpec('s1', { cond_az_id: 'az1' });
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 1);
  });

  it('should keep specs without any AZ field', () => {
    const specs = makeSpec('s1', { name: 'x' });
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 1);
  });

  it('should filter only non-matching specs and keep the rest', () => {
    const specs = new Map([
      ['k1', { key: 'k1', raw: { availability_zone: { id: 'az1' } } }],
      ['k2', { key: 'k2', raw: { availability_zone: { id: 'az9' } } }],
      ['k3', { key: 'k3', raw: { name: 'no-az' } }],
    ]) as PurchaseSpecMap;
    const result = filterEcsPurchaseSpecsByAz(specs, azList);
    assert.strictEqual(result.size, 2);
    assert.ok(result.has('k1'));
    assert.ok(result.has('k3'));
  });
});

describe('filterEcsPurchaseSpecsByOperationStatus', () => {
  function makeSpec(key: string, status?: string): PurchaseSpecMap {
    const map: PurchaseSpecMap = new Map();
    map.set(key, {
      key,
      raw: status != null ? { os_extra_specs: { 'cond:operation:status': status } } : {},
    });
    return map;
  }

  it('should filter specs with abandon status', () => {
    const specs = makeSpec('s1', 'abandon');
    const result = filterEcsPurchaseSpecsByOperationStatus(specs);
    assert.strictEqual(result.size, 0);
  });

  it('should keep specs with non-abandon status', () => {
    const specs = makeSpec('s1', 'normal');
    const result = filterEcsPurchaseSpecsByOperationStatus(specs);
    assert.strictEqual(result.size, 1);
  });

  it('should keep specs without operation status', () => {
    const specs = makeSpec('s1');
    const result = filterEcsPurchaseSpecsByOperationStatus(specs);
    assert.strictEqual(result.size, 1);
  });

  it('should keep specs without os_extra_specs', () => {
    const map: PurchaseSpecMap = new Map();
    map.set('k', { key: 'k', raw: { other: 1 } });
    const result = filterEcsPurchaseSpecsByOperationStatus(map);
    assert.strictEqual(result.size, 1);
  });

  it('should filter multiple specs correctly', () => {
    const specs = new Map([
      ['k1', { key: 'k1', raw: { os_extra_specs: { 'cond:operation:status': 'abandon' } } }],
      ['k2', { key: 'k2', raw: { os_extra_specs: { 'cond:operation:status': 'normal' } } }],
      ['k3', { key: 'k3', raw: {} }],
    ]) as PurchaseSpecMap;
    const result = filterEcsPurchaseSpecsByOperationStatus(specs);
    assert.strictEqual(result.size, 2);
    assert.ok(result.has('k2'));
    assert.ok(result.has('k3'));
  });
});

describe('buildEcsCalcSpecFilter', () => {
  it('should return a function', () => {
    const fn = buildEcsCalcSpecFilter();
    assert.strictEqual(typeof fn, 'function');
  });
});

describe('buildEcsPurchaseSpecFilter', () => {
  it('should compose AZ and operation status filters', () => {
    const fn = buildEcsPurchaseSpecFilter([{ id: 'az1' }]);
    const map: PurchaseSpecMap = new Map([
      ['k1', { key: 'k1', raw: { availability_zone: { id: 'az1' } } }],
      ['k2', { key: 'k2', raw: { availability_zone: { id: 'az1' }, os_extra_specs: { 'cond:operation:status': 'abandon' } } }],
      ['k3', { key: 'k3', raw: { availability_zone: { id: 'az9' } } }],
    ]);

    const result = fn(map);
    // k1: passes AZ filter, no abandon status -> kept
    // k2: passes AZ filter, abandon -> filtered
    // k3: fails AZ filter -> filtered
    assert.strictEqual(result.size, 1);
    assert.ok(result.has('k1'));
  });

  it('should skip AZ filter when no azList', () => {
    const fn = buildEcsPurchaseSpecFilter();
    const map: PurchaseSpecMap = new Map([
      ['k1', { key: 'k1', raw: {} }],
      ['k2', { key: 'k2', raw: { os_extra_specs: { 'cond:operation:status': 'abandon' } } }],
    ]);

    const result = fn(map);
    assert.strictEqual(result.size, 1);
    assert.ok(result.has('k1'));
  });

  it('should skip AZ filter when azList is empty', () => {
    const fn = buildEcsPurchaseSpecFilter([]);
    const map: PurchaseSpecMap = new Map([
      ['k1', { key: 'k1', raw: {} }],
    ]);

    const result = fn(map);
    assert.strictEqual(result.size, 1);
  });
});
