import assert from 'assert';
import { CalcNormalizer } from '../../../ddd/Infrastructure/calc/calcNormalizer';

describe('CalcNormalizer', () => {
  const normalizer = new CalcNormalizer();

  it('should normalize product info with multiple groups', () => {
    const productInfo = {
      product: {
        group1: [
          { resourceSpecCode: 'code-a', cloudServiceType: 'hws.service.ecs', resourceType: 'VM' },
          { resourceSpecCode: 'code-b' },
        ],
        group2: [
          { resourceSpecCode: 'code-c' },
        ],
      },
    };

    const map = normalizer.normalizeProductInfoToMap(productInfo);

    assert.strictEqual(map.size, 3);
    assert.strictEqual(map.get('code-a')?.resourceSpecCode, 'code-a');
    assert.strictEqual(map.get('code-a')?.cloudServiceType, 'hws.service.ecs');
    assert.strictEqual(map.get('code-a')?.resourceType, 'VM');
    assert.strictEqual(map.get('code-b')?.resourceSpecCode, 'code-b');
    assert.strictEqual(map.get('code-c')?.resourceSpecCode, 'code-c');
  });

  it('should skip items with empty resourceSpecCode', () => {
    const productInfo = {
      product: {
        g: [
          { resourceSpecCode: '' },
          { resourceSpecCode: '  ' },
          { resourceSpecCode: 'valid' },
        ],
      },
    };

    const map = normalizer.normalizeProductInfoToMap(productInfo);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('valid'));
  });

  it('should skip items without resourceSpecCode', () => {
    const productInfo = {
      product: {
        g: [
          { other: 'x' },
          { resourceSpecCode: 'keep' },
        ],
      },
    };

    const map = normalizer.normalizeProductInfoToMap(productInfo);
    assert.strictEqual(map.size, 1);
    assert.ok(map.has('keep'));
  });

  it('should handle null/undefined product info', () => {
    assert.strictEqual(normalizer.normalizeProductInfoToMap(null).size, 0);
    assert.strictEqual(normalizer.normalizeProductInfoToMap(undefined).size, 0);
    assert.strictEqual(normalizer.normalizeProductInfoToMap({}).size, 0);
  });

  it('should handle non-array group values', () => {
    const productInfo = {
      product: {
        g: 'not-an-array',
      },
    };

    const map = normalizer.normalizeProductInfoToMap(productInfo);
    assert.strictEqual(map.size, 0);
  });

  it('should coerce resourceSpecCode to string', () => {
    const productInfo = {
      product: {
        g: [{ resourceSpecCode: 123 }],
      },
    };

    const map = normalizer.normalizeProductInfoToMap(productInfo);
    assert.strictEqual(map.get('123')?.resourceSpecCode, '123');
  });

  it('should deduplicate by resourceSpecCode (last wins)', () => {
    const productInfo = {
      product: {
        g1: [{ resourceSpecCode: 'dup', raw: { x: 1 } }],
        g2: [{ resourceSpecCode: 'dup', raw: { x: 2 } }],
      },
    };

    const map = normalizer.normalizeProductInfoToMap(productInfo);
    assert.strictEqual(map.size, 1);
    assert.strictEqual(map.get('dup')?.raw.x, 2);
  });
});
