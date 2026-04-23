import type { Application } from 'egg';
import { buildDddContainer } from '../../ddd/Interface/container';

export default {
  get dddContainer(): ReturnType<typeof buildDddContainer> {
    const app = this as Application & { __dddContainer?: ReturnType<typeof buildDddContainer> };
    if (!app.__dddContainer) {
      app.__dddContainer = buildDddContainer(app);
    }
    return app.__dddContainer;
  },
};

