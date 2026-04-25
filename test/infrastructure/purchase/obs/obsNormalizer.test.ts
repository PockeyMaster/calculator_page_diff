import assert from 'assert';
import { ObsPurchaseNormalizer } from '../../../../ddd/Infrastructure/purchase/obs/obsNormalizer';

describe('ObsPurchaseNormalizer', () => {
  const normalizer = new ObsPurchaseNormalizer();

  it('should normalize offering response with string JSON value', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ sku_code: 'sku-001', spec: { a: 1 } }) },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 1);
    assert.strictEqual(map.get('sku-001')?.key, 'sku-001');
    assert.ok(map.get('sku-001')?.raw);
  });

  it('should handle value that is already an object', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: { sku_code: 'sku-obj' } },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 1);
    assert.strictEqual(map.get('sku-obj')?.key, 'sku-obj');
  });

  it('should skip entries with malformed JSON string', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: 'not-valid-json[[[' },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 0);
  });

  it('should skip entries without resource_spec_info param', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'other_param', value: 'x' },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 0);
  });

  it('should skip entries with empty sku_code', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ sku_code: '' }) },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 0);
  });

  it('should skip entries with missing sku_code', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ other: 'x' }) },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 0);
  });

  it('should handle null/undefined data', () => {
    assert.strictEqual(normalizer.normalizeOfferingResponseToMap(null).size, 0);
    assert.strictEqual(normalizer.normalizeOfferingResponseToMap(undefined).size, 0);
    assert.strictEqual(normalizer.normalizeOfferingResponseToMap({}).size, 0);
  });

  it('should handle missing offering_detail_infos', () => {
    const data = { other: 'x' };
    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 0);
  });

  it('should handle non-array offering_detail_infos', () => {
    const data = { offering_detail_infos: 'not-array' } as any;
    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 0);
  });

  it('should process multiple details and infos', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ sku_code: 'sku-a' }) },
              ],
            },
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ sku_code: 'sku-b' }) },
              ],
            },
          ],
        },
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ sku_code: 'sku-c' }) },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 3);
    assert.ok(map.has('sku-a'));
    assert.ok(map.has('sku-b'));
    assert.ok(map.has('sku-c'));
  });

  it('should deduplicate by sku_code (last wins)', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ sku_code: 'dup', v: 1 }) },
              ],
            },
            {
              offering_params: [
                { key: 'resource_spec_info', value: JSON.stringify({ sku_code: 'dup', v: 2 }) },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 1);
    // last wins for overwrite
  });

  it('should skip items with resource_spec_info value of null', () => {
    const data = {
      offering_detail_infos: [
        {
          offering_infos: [
            {
              offering_params: [
                { key: 'resource_spec_info', value: null },
              ],
            },
          ],
        },
      ],
    };

    const map = normalizer.normalizeOfferingResponseToMap(data);
    assert.strictEqual(map.size, 0);
  });
});
