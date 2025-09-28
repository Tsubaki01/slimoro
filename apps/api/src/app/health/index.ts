import { Hono } from 'hono';

import { Env } from '@/types';
import { successResponse } from '@/utils';

const app = new Hono<Env>();

app.get('/', (c) => {
  return successResponse(c, {
    status: 'ok',
    service: 'slimoro-api',
    version: '1.0.0'
  }, {
    metadata: {
      timestamp: new Date().toISOString(),
    }
  });
});

export default app;