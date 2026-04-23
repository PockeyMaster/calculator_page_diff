import assert from 'assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mock from 'egg-mock';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('specDiffRunner schedule', () => {
  const app = mock.app({
    baseDir: projectRoot,
  });

  before(() => app.ready());
  after(() => app.close());

  it('should trigger runOnce', async () => {
    let called = 0;
    (app as any).__dddContainer = {
      runSpecDiffService: {
        async runOnce() {
          called++;
          return { runId: 'id1', summary: { onlyInCalc: 0, onlyInPurchase: 0, differ: 0, match: 0 } };
        },
      },
    };

    await (app as any).runSchedule('specDiffRunner');
    assert.strictEqual(called, 1);
  });
});
