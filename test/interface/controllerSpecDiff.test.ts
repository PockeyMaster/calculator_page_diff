import assert from 'assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mock from 'egg-mock';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('POST /api/spec-diff/run', () => {
  const app = mock.app({
    baseDir: projectRoot,
  });

  before(() => app.ready());
  after(() => app.close());

  it('should return ok', async () => {
    // stub container to avoid real network/playwright/mongo in controller test
    (app as any).__dddContainer = {
      runSpecDiffService: {
        async runOnce() {
          return {
            runs: [
              {
                region: 'cn-north-4',
                runId: 'id1',
                summary: { onlyInCalc: 0, onlyInPurchase: 0, differ: 0, match: 0 },
              },
            ],
          };
        },
      },
    };

    const res = await app.httpRequest().post('/api/spec-diff/run').send({ service: 'ecs' }).expect(200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.runs?.length, 1);
    assert.strictEqual(res.body.runs[0].runId, 'id1');
  });
});
