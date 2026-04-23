import assert from 'assert';
import { SpecComparator } from '../../ddd/Domain/comparison/specComparator';

describe('SpecComparator', () => {
  it('should diff keys and fields', () => {
    const comparator = new SpecComparator();

    const calc = new Map([
      ['a', { resourceSpecCode: 'a', raw: { x: 1 } }],
      ['b', { resourceSpecCode: 'b', raw: { x: 2 } }],
    ]);
    const purchase = new Map([
      ['b', { key: 'b', raw: { x: 3 } }],
      ['c', { key: 'c', raw: { x: 4 } }],
    ]);

    const res = comparator.compare(calc as any, purchase as any);

    assert.strictEqual(res.summary.onlyInCalc, 1);
    assert.strictEqual(res.summary.onlyInPurchase, 1);
    assert.strictEqual(res.summary.differ, 1);
    assert.strictEqual(res.summary.match, 0);
    assert.strictEqual(res.byKey.a.status, 'only_in_calc');
    assert.strictEqual(res.byKey.c.status, 'only_in_purchase');
    assert.strictEqual(res.byKey.b.status, 'differ');
    assert.ok(Array.isArray(res.byKey.b.fieldDiffs));
  });
});
