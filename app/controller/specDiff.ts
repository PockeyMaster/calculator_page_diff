import { Controller } from 'egg';

export default class SpecDiffController extends Controller {
  public async run() {
    const { ctx, app } = this;
    const bodyService = (ctx.request.body as { service?: string } | undefined)?.service;
    const q = ctx.query.service;
    const queryService = Array.isArray(q) ? q[0] : q;
    const service = (bodyService || queryService || 'ecs') as string;
    const triggerType = 'manual' as const;

    const result = await app.dddContainer.runSpecDiffService.runOnce({ service, triggerType });

    ctx.body = {
      ok: true,
      runs: result.runs,
    };
  }
}
