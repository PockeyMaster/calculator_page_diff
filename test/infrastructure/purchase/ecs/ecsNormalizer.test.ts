import assert from 'assert';
import { EcsPurchaseNormalizer } from '../../../../ddd/Infrastructure/purchase/ecs/ecsNormalizer';

describe('EcsPurchaseNormalizer', () => {
  const normalizer = new EcsPurchaseNormalizer();

  it('should normalize flavors with id', () => {
    const flavors = [
      { id: 'flavor-1', name: 'f1', cpu: 2 },
      { id: 'flavor-2', name: 'f2', cpu: 4 },
    ];

    const map = normalizer.normalizeFlavorsToMap(flavors);
    assert.strictEqual(map.size, 2);
    assert.strictEqual(map.get('flavor-1')?.raw.cpu, 2);
    assert.strictEqual(map.get('flavor-2')?.raw.cpu, 4);
  });

  it('should fallback to name when id is missing', () => {
    const flavors = [
      { name: 'flavor-name' },
    ];

    const map = normalizer.normalizeFlavorsToMap(flavors);
    assert.strictEqual(map.size, 1);
    assert.strictEqual(map.get('flavor-name')?.raw.name, 'flavor-name');
  });

  it('should skip items without id or name', () => {
    const flavors = [
      { cpu: 2 },
      { id: 'valid' },
      { other: 'x' },
    ];

    const map = normalizer.normalizeFlavorsToMap(flavors);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('valid'));
  });

  it('should skip items with empty id and name', () => {
    const flavors = [
      { id: '', name: '' },
      { id: '  ' },
    ];

    const map = normalizer.normalizeFlavorsToMap(flavors);
    assert.strictEqual(map.size, 0);
  });

  it('should handle empty array', () => {
    assert.strictEqual(normalizer.normalizeFlavorsToMap([]).size, 0);
  });

  it('should handle null/undefined items in array', () => {
    const flavors = [null, undefined, { id: 'valid' }] as any[];

    const map = normalizer.normalizeFlavorsToMap(flavors);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('valid'));
  });

  it('should use id over name when both present', () => {
    const flavors = [{ id: 'id-val', name: 'name-val' }];

    const map = normalizer.normalizeFlavorsToMap(flavors);
    assert.ok(map.has('id-val'));
    assert.ok(!map.has('name-val'));
  });
});
