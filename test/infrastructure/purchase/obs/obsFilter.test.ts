import assert from 'assert';
import {
  filterObsCalcSpecs,
  filterObsPurchaseSpecs,
  buildObsCalcSpecFilter,
  buildObsPurchaseSpecFilter,
} from '../../../../ddd/Infrastructure/purchase/obs/obsFilter';
import type { CalcSpecMap, PurchaseSpecMap } from '../../../../ddd/Domain/comparison/filters';

describe('ObsFilter', () => {
  describe('filterObsCalcSpecs', () => {
    it('should return the same map reference (pass-through)', () => {
      const map: CalcSpecMap = new Map();
      map.set('k', { resourceSpecCode: 'k', raw: {} });
      assert.strictEqual(filterObsCalcSpecs(map), map);
    });

    it('should return empty map unchanged', () => {
      const map: CalcSpecMap = new Map();
      assert.strictEqual(filterObsCalcSpecs(map).size, 0);
    });
  });

  describe('filterObsPurchaseSpecs', () => {
    it('should return the same map reference (pass-through)', () => {
      const map: PurchaseSpecMap = new Map();
      map.set('k', { key: 'k', raw: {} });
      assert.strictEqual(filterObsPurchaseSpecs(map), map);
    });
  });

  describe('buildObsCalcSpecFilter', () => {
    it('should return a function', () => {
      assert.strictEqual(typeof buildObsCalcSpecFilter(), 'function');
    });
  });

  describe('buildObsPurchaseSpecFilter', () => {
    it('should return a function', () => {
      assert.strictEqual(typeof buildObsPurchaseSpecFilter(), 'function');
    });
  });
});
