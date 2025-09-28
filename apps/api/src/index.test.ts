/* eslint-disable @typescript-eslint/no-empty-function */
import { afterAll,beforeAll, describe, expect, it } from 'vitest';

import app from '.';

describe('Health Check Endpoint', () => {
  beforeAll(() => {});
  afterAll(() => {});

  describe('GET /health', () => {
    it('should return 200 status', async () => {
      const res = await app.request('http://localhost/health');
      expect(res.status).toBe(200);
    });

    it('should return health status in JSON format', async () => {
      const res = await app.request('http://localhost/health');
      const body = await res.json();

      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('status', 'ok');
      expect(body.data).toHaveProperty('service', 'slimoro-api');
      expect(body.data).toHaveProperty('version');
      expect(body).toHaveProperty('metadata');
      expect(body.metadata).toHaveProperty('timestamp');
    });

    it('should return correct content-type header', async () => {
      const res = await app.request('http://localhost/health');
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
    });

    it('should include timestamp in ISO format', async () => {
      const res = await app.request('http://localhost/health');
      const body = await res.json();

      expect(body.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  it('Should return 200 response for root endpoint', async () => {
    const res = await app.request('http://localhost/');
    expect(res.status).toBe(200);
  });
});
