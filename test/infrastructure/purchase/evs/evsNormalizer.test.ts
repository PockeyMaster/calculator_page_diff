import assert from 'assert';
import { EvsPurchaseNormalizer } from '../../../../ddd/Infrastructure/purchase/evs/evsNormalizer';

describe('EvsPurchaseNormalizer', () => {
  const normalizer = new EvsPurchaseNormalizer();

  it('should normalize volume types with name', () => {
    const volumeTypes = [
      { name: 'GPSSD', description: 'General Purpose SSD' },
      { name: 'ESSD', description: 'Extreme SSD' },
    ];

    const map = normalizer.normalizeVolumeTypesToMap(volumeTypes);
    assert.strictEqual(map.size, 2);
    assert.strictEqual(map.get('GPSSD')?.raw.description, 'General Purpose SSD');
    assert.strictEqual(map.get('ESSD')?.raw.description, 'Extreme SSD');
  });

  it('should fallback to id when name is missing', () => {
    const volumeTypes = [
      { id: 'vol-1' },
    ];

    const map = normalizer.normalizeVolumeTypesToMap(volumeTypes);
    assert.strictEqual(map.size, 1);
    assert.strictEqual(map.get('vol-1')?.raw.id, 'vol-1');
  });

  it('should prefer name over id', () => {
    const volumeTypes = [
      { name: 'name-val', id: 'id-val' },
    ];

    const map = normalizer.normalizeVolumeTypesToMap(volumeTypes);
    assert.ok(map.has('name-val'));
    assert.ok(!map.has('id-val'));
  });

  it('should skip items without name or id', () => {
    const volumeTypes = [
      { other: 'x' },
      { name: 'valid' },
    ];

    const map = normalizer.normalizeVolumeTypesToMap(volumeTypes);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('valid'));
  });

  it('should skip items with empty name and id', () => {
    const volumeTypes = [
      { name: '', id: '' },
      { name: '  ' },
    ];

    const map = normalizer.normalizeVolumeTypesToMap(volumeTypes);
    assert.strictEqual(map.size, 0);
  });

  it('should handle empty array', () => {
    assert.strictEqual(normalizer.normalizeVolumeTypesToMap([]).size, 0);
  });

  it('should handle null/undefined items', () => {
    const volumeTypes = [null, undefined, { name: 'valid' }] as any[];

    const map = normalizer.normalizeVolumeTypesToMap(volumeTypes);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('valid'));
  });
});
