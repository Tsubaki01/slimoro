import { Hono } from 'hono';
import { Env } from '@/types';
import env from './env';

const app = new Hono<Env>();

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'slimoro-api',
    version: '1.0.0'
  });
});

// 環境変数検証エンドポイント
app.route('/env', env);

export default app;