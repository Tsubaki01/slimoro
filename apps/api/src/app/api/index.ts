import { Hono } from 'hono';
import generateImage from './generate-image';

const app = new Hono();

app.route('/generate-image', generateImage);

export default app;