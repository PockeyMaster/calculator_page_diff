import assert from 'assert';
import {
  filterRdsCalcSpecs,
  filterRdsPurchaseSpecs,
  buildRdsCalcSpecFilter,
  buildRdsPurchaseSpecFilter,
} from '../../../../ddd/Infrastructure/purchase/rds/rdsFilter';
import type { CalcSpecMap, PurchaseSpecMap } from '../../../../ddd/Domain/comparison/filters';

describe('RdsFilter', () => {
  describe('filterRdsCalcSpecs', () => {
    it('should return the same map reference (pass-through)', () => {
      const map: CalcSpecMap = new Map();
      map.set('k', { resourceSpecCode: 'k', raw: {} });
      assert.strictEqual(filterRdsCalcSpecs(map), map);
    });

    it('should return empty map unchanged', () => {
      const map: CalcSpecMap = new Map();
      assert.strictEqual(filterRdsCalcSpecs(map).size, 0);
    });
  });

  describe('filterRdsPurchaseSpecs', () => {
    it('should return the same map reference (pass-through)', () => {
      const map: PurchaseSpecMap = new Map();
      map.set('k', { key: 'k', raw: {} });
      assert.strictEqual(filterRdsPurchaseSpecs(map), map);
    });
  });

  describe('buildRdsCalcSpecFilter', () => {
    it('should return a function', () => {
      assert.strictEqual(typeof buildRdsCalcSpecFilter(), 'function');
    });
  });

  describe('buildRdsPurchaseSpecFilter', () => {
    it('should return a function', () => {
      assert.strictEqual(typeof buildRdsPurchaseSpecFilter(), 'function');
    });
  });
});
