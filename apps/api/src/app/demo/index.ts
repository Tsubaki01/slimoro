import { Hono } from 'hono';
import { Env } from '@/types';

const app = new Hono<Env>();

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="refresh" content="0; url=/public/gemini-demo.html">
    </head>
    <body>
      <p>Redirecting to demo page...</p>
    </body>
    </html>
  `);
});

export default app;