import { Hono } from 'hono';
import { poweredBy } from 'hono/powered-by';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', poweredBy());
app.use('*', cors());

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'slimoro-api',
    version: '1.0.0'
  });
});

export default app;
