import { Hono } from 'hono';
import { poweredBy } from 'hono/powered-by';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import health from './app/health';
import api from './app/api';
import { Env } from './types';

const app = new Hono<Env>();

app.use('*', logger());
app.use('*', poweredBy());
app.use(
  '*',
  cors({
    origin: '*', // 開発環境ではすべてのオリジンを許可
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// ルートエンドポイント
app.get('/', (c) => {
  return c.json({
    message: 'Slimoro API Server',
    version: '1.0.0',
  });
});

// APIの健康チェック
app.route('/health', health);
// API実装のマウント
app.route('/api', api);

export default app;
