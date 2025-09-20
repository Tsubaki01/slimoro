import { Hono } from 'hono';
import { poweredBy } from 'hono/powered-by';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import health from './app/health';
import demo from './app/demo';
import api from './app/api';
import { Env } from './types';

const app = new Hono<Env>();

app.use('*', logger());
app.use('*', poweredBy());
app.use('*', cors());

// デモページ
app.route('/demo', demo);
// APIの健康チェック
app.route('/health', health);
// API実装のマウント
app.route('/api', api);

export default app;
