import { Subscription } from 'egg';

export default class SpecDiffRunner extends Subscription {
  static get schedule() {
    return {
      type: 'worker',
      cron: '0 0 1 * * *',
      disable: false,
    };
  }

  async subscribe() {
    const { app } = this;
    const cfg = (app.config as any)?.schedule;
    if (cfg?.enable === false) {
      return;
    }

    await app.dddContainer.runSpecDiffService.runOnce({ service: 'ecs', triggerType: 'schedule' });
  }
}
