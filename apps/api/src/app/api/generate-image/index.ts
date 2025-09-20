import { Hono } from 'hono';
import { Env } from '@/types';

const app = new Hono<Env>();

app.get('/', (c) => {
  return c.json({
    message: 'generate-image',
  });
});

export default app;