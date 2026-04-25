import assert from 'assert';
import {
  filterEvsCalcSpecs,
  filterEvsPurchaseSpecs,
  buildEvsCalcSpecFilter,
  buildEvsPurchaseSpecFilter,
} from '../../../../ddd/Infrastructure/purchase/evs/evsFilter';
import type { CalcSpecMap, PurchaseSpecMap } from '../../../../ddd/Domain/comparison/filters';

describe('EvsFilter', () => {
  describe('filterEvsCalcSpecs', () => {
    it('should filter out GPSSD2.throught', () => {
      const map: CalcSpecMap = new Map();
      map.set('GPSSD2.throught', { resourceSpecCode: 'GPSSD2.throught', raw: {} });

      const result = filterEvsCalcSpecs(map);
      assert.strictEqual(result.size, 0);
    });

    it('should filter out General_Purpose_SSD_V2', () => {
      const map: CalcSpecMap = new Map();
      map.set('General_Purpose_SSD_V2', { resourceSpecCode: 'General_Purpose_SSD_V2', raw: {} });

      const result = filterEvsCalcSpecs(map);
      assert.strictEqual(result.size, 0);
    });

    it('should keep other codes', () => {
      const map: CalcSpecMap = new Map();
      map.set('GPSSD', { resourceSpecCode: 'GPSSD', raw: {} });
      map.set('General_Purpose_SSD', { resourceSpecCode: 'General_Purpose_SSD', raw: {} });
      map.set('ESSD', { resourceSpecCode: 'ESSD', raw: {} });

      const result = filterEvsCalcSpecs(map);
      assert.strictEqual(result.size, 3);
    });

    it('should filter only the excluded codes and keep the rest', () => {
      const map: CalcSpecMap = new Map();
      map.set('GPSSD2.throught', { resourceSpecCode: 'GPSSD2.throught', raw: {} });
      map.set('GPSSD', { resourceSpecCode: 'GPSSD', raw: {} });
      map.set('General_Purpose_SSD_V2', { resourceSpecCode: 'General_Purpose_SSD_V2', raw: {} });

      const result = filterEvsCalcSpecs(map);
      assert.strictEqual(result.size, 1);
      assert.ok(result.has('GPSSD'));
    });

    it('should return empty map unchanged', () => {
      const map: CalcSpecMap = new Map();
      assert.strictEqual(filterEvsCalcSpecs(map).size, 0);
    });
  });

  describe('filterEvsPurchaseSpecs', () => {
    it('should return the same map reference (pass-through)', () => {
      const map: PurchaseSpecMap = new Map();
      map.set('k', { key: 'k', raw: {} });
      assert.strictEqual(filterEvsPurchaseSpecs(map), map);
    });
  });

  describe('buildEvsCalcSpecFilter', () => {
    it('should return a function', () => {
      assert.strictEqual(typeof buildEvsCalcSpecFilter(), 'function');
    });
  });

  describe('buildEvsPurchaseSpecFilter', () => {
    it('should return a function', () => {
      assert.strictEqual(typeof buildEvsPurchaseSpecFilter(), 'function');
    });
  });
});
