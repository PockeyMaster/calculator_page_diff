import assert from 'assert';
import { RdsPurchaseNormalizer } from '../../../../ddd/Infrastructure/purchase/rds/rdsNormalizer';
import type { PurchaseSpecMap } from '../../../../ddd/Domain/comparison/filters';

describe('RdsPurchaseNormalizer', () => {
  const normalizer = new RdsPurchaseNormalizer();

  const baseMeta = {
    groupType: 'compute',
    engineName: 'MySQL',
    engineVersion: '8.0',
    engineId: 'eng-1',
    haMode: 'replication',
    productEdition: 'enterprise',
    computeFlavorCategoryType: 'general-purpose',
    azCode: 'az1',
  };

  function buildResponse(overrides: any): unknown {
    return {
      flavorCategory: {
        computeFlavorGroups: [],
        volumeFlavors: [],
        licenseFlavors: [],
        decServiceFlavors: [],
        ...overrides,
      },
    };
  }

  it('should normalize compute flavor groups', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { code: 'flavor-1', cpu: 2 },
            { code: 'flavor-2', cpu: 4 },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 2);
    assert.strictEqual(map.get('flavor-1')?.raw.flavor.cpu, 2);
    assert.strictEqual(map.get('flavor-2')?.raw.flavor.cpu, 4);
  });

  it('should normalize volume flavors with prefix', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      volumeFlavors: [
        { code: 'vol-1', size: 100 },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('volume:vol-1'));
  });

  it('should normalize license flavors with prefix', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      licenseFlavors: [
        { code: 'lic-1' },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('license:lic-1'));
  });

  it('should normalize dec service flavors with prefix', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      decServiceFlavors: [
        { code: 'dec-1' },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('dec:dec-1'));
  });

  it('should skip rows without code/iaasCode/id', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { cpu: 2 },
            { code: 'valid' },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('valid'));
  });

  it('should use iaasCode as key when code is missing', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { iaasCode: 'iaas-1' },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('iaas-1'));
  });

  it('should use id as key fallback', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { id: 'id-1' },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('id-1'));
  });

  it('should handle duplicate keys with id suffix', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { code: 'dup', id: 'suffix1', cpu: 2 },
            { code: 'dup', id: 'suffix2', cpu: 4 },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 2);
    assert.ok(map.has('dup'));
    assert.ok(map.has('dup#suffix2'));
  });

  it('should handle duplicate keys without id by using map size as suffix', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { code: 'dup', cpu: 2 },
            { code: 'dup', cpu: 4 },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 2);
    // first entry: 'dup', second: 'dup#1' (map.size at insertion time was 1)
  });

  it('should embed meta into raw', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { code: 'f1' },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    const spec = map.get('f1');
    assert.strictEqual(spec?.raw.engineName, 'MySQL');
    assert.strictEqual(spec?.raw.engineVersion, '8.0');
    assert.strictEqual(spec?.raw.haMode, 'replication');
    assert.strictEqual(spec?.raw.flavor.code, 'f1');
  });

  it('should handle missing flavorCategory', () => {
    const map: PurchaseSpecMap = new Map();
    normalizer.appendConsoleFlavorsToMap(map, baseMeta, {});
    assert.strictEqual(map.size, 0);
  });

  it('should handle null/undefined response', () => {
    const map: PurchaseSpecMap = new Map();
    normalizer.appendConsoleFlavorsToMap(map, baseMeta, null);
    assert.strictEqual(map.size, 0);
  });

  it('should append to existing map (not clear it)', () => {
    const map: PurchaseSpecMap = new Map();
    map.set('existing', { key: 'existing', raw: {} });

    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [
            { code: 'new' },
          ],
        },
      ],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 2);
    assert.ok(map.has('existing'));
    assert.ok(map.has('new'));
  });

  it('should handle all flavor types together', () => {
    const map: PurchaseSpecMap = new Map();
    const response = buildResponse({
      computeFlavorGroups: [
        {
          computeFlavors: [{ code: 'c1' }, { code: 'c2' }],
        },
      ],
      volumeFlavors: [{ code: 'v1' }],
    });

    normalizer.appendConsoleFlavorsToMap(map, baseMeta, response);
    assert.strictEqual(map.size, 3);
    assert.ok(map.has('c1'));
    assert.ok(map.has('c2'));
    assert.ok(map.has('volume:v1'));
  });
});
