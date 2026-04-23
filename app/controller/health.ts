import { Controller } from 'egg';

export default class HealthController extends Controller {
  public async index() {
    this.ctx.body = { ok: true, ts: Date.now() };
  }
}

