import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VertexBaseClient } from './vertex-base-client';
import type { Env } from '@/types';

// @ai-sdk/google-vertex/edge モジュールのモック
vi.mock('@ai-sdk/google-vertex/edge', () => ({
  createVertex: vi.fn(),
}));

describe('VertexBaseClient', () => {
  let client: VertexBaseClient;
  let mockEnv: Env['Bindings'];

  beforeEach(() => {
    vi.clearAllMocks();

    // 環境変数のモック
    mockEnv = {
      GOOGLE_CLIENT_EMAIL: 'test@example.com',
      GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
      GOOGLE_PRIVATE_KEY_ID: 'test-key-id',
      GOOGLE_PROJECT_ID: 'test-project-id',
      GOOGLE_LOCATION: 'us-central1',
    };

    // 環境変数を設定
    process.env.GOOGLE_CLIENT_EMAIL = mockEnv.GOOGLE_CLIENT_EMAIL;
    process.env.GOOGLE_PRIVATE_KEY = mockEnv.GOOGLE_PRIVATE_KEY;
    process.env.GOOGLE_PRIVATE_KEY_ID = mockEnv.GOOGLE_PRIVATE_KEY_ID;
    process.env.GOOGLE_PROJECT_ID = mockEnv.GOOGLE_PROJECT_ID;
  });

  afterEach(() => {
    // 環境変数をクリア
    delete process.env.GOOGLE_CLIENT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_PRIVATE_KEY_ID;
    delete process.env.GOOGLE_PROJECT_ID;
  });

  describe('constructor', () => {
    it('環境変数が正しく設定される', () => {
      expect(() => new VertexBaseClient(mockEnv)).not.toThrow();
    });

    it('GOOGLE_CLIENT_EMAILが提供されていない場合エラーをスロー', () => {
      const invalidEnv = { ...mockEnv, GOOGLE_CLIENT_EMAIL: '' };
      expect(() => new VertexBaseClient(invalidEnv)).toThrow(
        'Google Cloud Service Account credentials are required'
      );
    });

    it('GOOGLE_PRIVATE_KEYが提供されていない場合エラーをスロー', () => {
      const invalidEnv = { ...mockEnv, GOOGLE_PRIVATE_KEY: '' };
      expect(() => new VertexBaseClient(invalidEnv)).toThrow(
        'Google Cloud Service Account credentials are required'
      );
    });

    it('GOOGLE_PRIVATE_KEY_IDがオプショナルである', () => {
      const envWithoutKeyId = { ...mockEnv };
      delete envWithoutKeyId.GOOGLE_PRIVATE_KEY_ID;
      expect(() => new VertexBaseClient(envWithoutKeyId)).not.toThrow();
    });
  });


  describe('createVertex', () => {
    beforeEach(() => {
      client = new VertexBaseClient(mockEnv);
    });

    it('vertex インスタンスを作成する（ロケーション指定あり）', async () => {
      const createVertex = (await import('@ai-sdk/google-vertex/edge')).createVertex as ReturnType<typeof vi.fn>;
      createVertex.mockReturnValue({ mockVertex: true });

      const result = client.createVertex();

      expect(createVertex).toHaveBeenCalledWith({
        location: 'us-central1',
        project: 'test-project-id',
        googleCredentials: {
          clientEmail: 'test@example.com',
          privateKey: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
          privateKeyId: 'test-key-id',
        },
      });
      expect(result).toEqual({ mockVertex: true });
    });

    it('vertex インスタンスを作成する（ロケーション未指定時はデフォルト）', async () => {
      const createVertex = (await import('@ai-sdk/google-vertex/edge')).createVertex as ReturnType<typeof vi.fn>;
      createVertex.mockReturnValue({ mockVertex: true });

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithoutLocation = new VertexBaseClient(envWithoutLocation);

      const result = clientWithoutLocation.createVertex();

      expect(createVertex).toHaveBeenCalledWith({
        location: 'us-central1', // デフォルト値
        project: 'test-project-id',
        googleCredentials: {
          clientEmail: 'test@example.com',
          privateKey: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
          privateKeyId: 'test-key-id',
        },
      });
      expect(result).toEqual({ mockVertex: true });
    });

    it('無効なロケーションの場合エラーをスロー', () => {
      const invalidEnv = { ...mockEnv, GOOGLE_LOCATION: 'invalid-location' };
      expect(() => new VertexBaseClient(invalidEnv)).toThrow(
        'Invalid Google Cloud location: invalid-location'
      );
    });

    it('getLocation メソッドが正しいロケーションを返す', () => {
      expect(client.getLocation()).toBe('us-central1');
    });

    it('空のロケーションの場合デフォルト値を使用', () => {
      const emptyLocationEnv = { ...mockEnv, GOOGLE_LOCATION: '' };
      expect(() => new VertexBaseClient(emptyLocationEnv)).not.toThrow();
    });
  });

  describe('地理情報ベースの動的ロケーション選択', () => {
    it('Cloudflare Coloコードから最適なロケーションを選択（日本）', () => {
      const mockRequest = {
        cf: {
          country: 'JP',
          colo: 'NRT',
          continent: 'AS',
        }
      } as any;

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithGeo = new VertexBaseClient(envWithoutLocation, mockRequest);

      expect(clientWithGeo.getLocation()).toBe('asia-northeast1');
    });

    it('Cloudflare Coloコードから最適なロケーションを選択（米国）', () => {
      const mockRequest = {
        cf: {
          country: 'US',
          colo: 'DFW',
          continent: 'NA',
        }
      } as any;

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithGeo = new VertexBaseClient(envWithoutLocation, mockRequest);

      expect(clientWithGeo.getLocation()).toBe('us-central1');
    });

    it('Cloudflare Coloコードから最適なロケーションを選択（ヨーロッパ）', () => {
      const mockRequest = {
        cf: {
          country: 'GB',
          colo: 'LHR',
          continent: 'EU',
        }
      } as any;

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithGeo = new VertexBaseClient(envWithoutLocation, mockRequest);

      expect(clientWithGeo.getLocation()).toBe('europe-west2');
    });

    it('国コードからロケーションを選択（Coloがない場合）', () => {
      const mockRequest = {
        cf: {
          country: 'SG',
          continent: 'AS',
        }
      } as any;

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithGeo = new VertexBaseClient(envWithoutLocation, mockRequest);

      expect(clientWithGeo.getLocation()).toBe('asia-southeast1');
    });

    it('大陸コードからロケーションを選択（国とColoがない場合）', () => {
      const mockRequest = {
        cf: {
          continent: 'EU',
        }
      } as any;

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithGeo = new VertexBaseClient(envWithoutLocation, mockRequest);

      expect(clientWithGeo.getLocation()).toBe('europe-west4');
    });

    it('地理情報がない場合はデフォルト値を使用', () => {
      const mockRequest = {
        cf: {}
      } as any;

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithGeo = new VertexBaseClient(envWithoutLocation, mockRequest);

      expect(clientWithGeo.getLocation()).toBe('us-central1');
    });

    it('Requestオブジェクトがない場合はデフォルト値を使用', () => {
      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithoutRequest = new VertexBaseClient(envWithoutLocation);

      expect(clientWithoutRequest.getLocation()).toBe('us-central1');
    });

    it('明示的な設定は地理情報より優先される', () => {
      const mockRequest = {
        cf: {
          country: 'JP',
          colo: 'NRT',
          continent: 'AS',
        }
      } as any;

      // 明示的にヨーロッパのロケーションを設定
      const envWithExplicitLocation = { ...mockEnv, GOOGLE_LOCATION: 'europe-west1' };
      const clientWithExplicit = new VertexBaseClient(envWithExplicitLocation, mockRequest);

      expect(clientWithExplicit.getLocation()).toBe('europe-west1');
    });

    it('未知の国コードの場合は大陸マッピングにフォールバック', () => {
      const mockRequest = {
        cf: {
          country: 'XX', // 未知の国コード
          continent: 'AS',
        }
      } as any;

      const envWithoutLocation = { ...mockEnv };
      delete envWithoutLocation.GOOGLE_LOCATION;
      const clientWithGeo = new VertexBaseClient(envWithoutLocation, mockRequest);

      expect(clientWithGeo.getLocation()).toBe('asia-northeast1');
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      client = new VertexBaseClient(mockEnv);
    });

    it('指定した時間待機する', async () => {
      const start = Date.now();
      await client.sleep(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90);
    });
  });

  describe('retry', () => {
    beforeEach(() => {
      client = new VertexBaseClient(mockEnv);
    });

    it('成功時は結果を返す', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await client.retry(mockFn, 3, 100);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('失敗時はリトライする', async () => {
      let callCount = 0;
      const mockFn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary error');
        }
        return Promise.resolve('success');
      });

      vi.spyOn(client, 'sleep').mockResolvedValue(undefined);

      const result = await client.retry(mockFn, 3, 100);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(client.sleep).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ回数後にエラーをスロー', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
      vi.spyOn(client, 'sleep').mockResolvedValue(undefined);

      await expect(client.retry(mockFn, 3, 100)).rejects.toThrow('Persistent error');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('exponential backoffを使用する', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Error'));
      const sleepSpy = vi.spyOn(client, 'sleep').mockResolvedValue(undefined);

      await expect(client.retry(mockFn, 3, 100)).rejects.toThrow();

      expect(sleepSpy).toHaveBeenCalledWith(100); // 1回目の待機
      expect(sleepSpy).toHaveBeenCalledWith(200); // 2回目の待機（2倍）
    });
  });

  describe('createVertexBaseClient', () => {
    it('ファクトリ関数が正しくクライアントを作成する', async () => {
      const { createVertexBaseClient } = await import('./vertex-base-client');
      const client = createVertexBaseClient(mockEnv);
      expect(client).toBeInstanceOf(VertexBaseClient);
    });
  });
});