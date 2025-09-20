import { Hono } from 'hono';
import { Env } from '@/types';

const app = new Hono<Env>();

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'slimoro-api',
    version: '1.0.0'
  });
});

export default app;