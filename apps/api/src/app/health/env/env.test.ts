import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '.';
import type { Env } from '@/types';

describe('Environment Validation Endpoint', () => {
  describe('GET /health/env', () => {
    const validEnv: Env['Bindings'] = {
      GOOGLE_PROJECT_ID: 'test-project-123',
      GOOGLE_CLIENT_EMAIL: 'test-service-account@test-project-123.iam.gserviceaccount.com',
      GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
      GOOGLE_PRIVATE_KEY_ID: 'key-id-123',
      GOOGLE_LOCATION: 'asia-northeast1',
    };

    beforeEach(() => {
      // コンソールログをモック化
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    it('有効な環境変数設定の場合は200とOKステータスを返す', async () => {
      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validEnv),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        environment: 'development',
        googleCloud: {
          validation: {
            isValid: true,
            checks: {
              hasProjectId: true,
              hasClientEmail: true,
              hasPrivateKey: true,
              privateKeyFormatValid: true,
              privateKeyDecodable: true,
              hasPrivateKeyId: true,
              hasLocation: true,
            },
            errors: [],
          },
          existence: {
            GOOGLE_PROJECT_ID: true,
            GOOGLE_CLIENT_EMAIL: true,
            GOOGLE_PRIVATE_KEY: true,
            GOOGLE_PRIVATE_KEY_ID: true,
            GOOGLE_LOCATION: true,
          },
        },
        summary: {
          status: 'OK',
          message: 'Google Cloud認証情報が正しく設定されています',
          errors: [],
        },
      });

      expect(data.timestamp).toBeTruthy();
      expect(data.googleCloud.maskedValues).toBeTruthy();
      expect(data.googleCloud.maskedValues.GOOGLE_PRIVATE_KEY).toContain('...');
    });

    it('必須環境変数が未設定の場合は422とERRORステータスを返す', async () => {
      const invalidEnv: Env['Bindings'] = {
        GOOGLE_PROJECT_ID: '',
        GOOGLE_CLIENT_EMAIL: '',
        GOOGLE_PRIVATE_KEY: '',
        GOOGLE_PRIVATE_KEY_ID: '',
        GOOGLE_LOCATION: '',
      };

      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidEnv),
      });
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data).toMatchObject({
        environment: 'development',
        googleCloud: {
          validation: {
            isValid: false,
            checks: {
              hasProjectId: false,
              hasClientEmail: false,
              hasPrivateKey: false,
              privateKeyFormatValid: false,
              privateKeyDecodable: false,
              hasPrivateKeyId: false,
              hasLocation: false,
            },
          },
          existence: {
            GOOGLE_PROJECT_ID: false,
            GOOGLE_CLIENT_EMAIL: false,
            GOOGLE_PRIVATE_KEY: false,
            GOOGLE_PRIVATE_KEY_ID: false,
            GOOGLE_LOCATION: false,
          },
        },
        summary: {
          status: 'ERROR',
          message: expect.stringContaining('設定エラーが'),
        },
      });

      expect(data.summary.errors).toContain('GOOGLE_PROJECT_IDが設定されていません');
      expect(data.summary.errors).toContain('GOOGLE_CLIENT_EMAILが設定されていません');
      expect(data.summary.errors).toContain('GOOGLE_PRIVATE_KEYが設定されていません');
    });

    it('秘密鍵の形式が不正な場合は422とERRORステータスを返す', async () => {
      const invalidEnv: Env['Bindings'] = {
        ...validEnv,
        GOOGLE_PRIVATE_KEY: 'invalid-private-key-format',
      };

      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidEnv),
      });
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.googleCloud.validation.isValid).toBe(false);
      expect(data.googleCloud.validation.checks.privateKeyFormatValid).toBe(false);
      expect(data.summary.status).toBe('ERROR');
      expect(data.summary.errors).toContain(
        'GOOGLE_PRIVATE_KEYのフォーマットが正しくありません（PEM形式である必要があります）'
      );
    });

    it('秘密鍵のBase64が不正な場合は422とERRORステータスを返す', async () => {
      const invalidEnv: Env['Bindings'] = {
        ...validEnv,
        GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ninvalid-base64-content!!!\n-----END PRIVATE KEY-----',
      };

      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, invalidEnv);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.googleCloud.validation.isValid).toBe(false);
      expect(data.googleCloud.validation.checks.privateKeyDecodable).toBe(false);
      expect(data.summary.status).toBe('ERROR');
      expect(data.summary.errors).toContain('GOOGLE_PRIVATE_KEYのBase64デコードに失敗しました');
    });

    it('オプション項目が未設定でも他が正常なら200を返す', async () => {
      const envWithoutOptionals: Env['Bindings'] = {
        GOOGLE_PROJECT_ID: 'test-project-123',
        GOOGLE_CLIENT_EMAIL: 'test-service-account@test-project-123.iam.gserviceaccount.com',
        GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
        GOOGLE_PRIVATE_KEY_ID: undefined,
        GOOGLE_LOCATION: undefined,
      };

      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, envWithoutOptionals);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.googleCloud.validation.isValid).toBe(true);
      expect(data.summary.status).toBe('OK');
      expect(data.summary.warnings).toContain('GOOGLE_PRIVATE_KEY_IDが設定されていません（オプション）');
      expect(data.summary.warnings).toContain(
        'GOOGLE_LOCATIONが設定されていません（オプション、地理情報から自動選択されます）'
      );
    });

    it('環境変数の値がマスクされて表示される', async () => {
      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, validEnv);
      const data = await res.json();

      expect(res.status).toBe(200);

      // マスクされた値の確認
      const maskedValues = data.googleCloud.maskedValues;
      expect(maskedValues.GOOGLE_PROJECT_ID).toMatch(/^test-pro\*+$/);
      expect(maskedValues.GOOGLE_CLIENT_EMAIL).toMatch(/^test-servi\*+$/);
      expect(maskedValues.GOOGLE_PRIVATE_KEY).toBe('-----BEGIN PRIVATE K...');
      expect(maskedValues.GOOGLE_PRIVATE_KEY_ID).toMatch(/^key-id-1\*+$/);
      expect(maskedValues.GOOGLE_LOCATION).toBe('asia-northeast1');

      // 実際の値は露出していないことを確認
      const responseString = JSON.stringify(data);
      expect(responseString).not.toContain('test-project-123');
      expect(responseString).not.toContain('test-service-account@test-project-123.iam.gserviceaccount.com');
      expect(responseString).not.toContain('key-id-123');
      expect(responseString).not.toContain('MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC');
    });

    it('予期しないエラーが発生した場合は500を返す', async () => {
      // EnvValidatorのメソッドをモック化してエラーを発生させる
      const { EnvValidator } = await import('@/utils/env-validator');
      const originalValidate = EnvValidator.validateGoogleCloudEnv;
      EnvValidator.validateGoogleCloudEnv = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected validation error');
      });

      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, validEnv);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.summary.status).toBe('ERROR');
      expect(data.summary.message).toBe('環境変数検証中にエラーが発生しました');
      expect(data.summary.errors).toContain('Unexpected validation error');

      // モックを元に戻す
      EnvValidator.validateGoogleCloudEnv = originalValidate;
    });

    it('レスポンスに必要なフィールドがすべて含まれる', async () => {
      const req = new Request('http://localhost/health/env');
      const res = await app.request(req, validEnv);
      const data = await res.json();

      expect(res.status).toBe(200);

      // 必須フィールドの存在確認
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('googleCloud');
      expect(data).toHaveProperty('summary');

      expect(data.googleCloud).toHaveProperty('validation');
      expect(data.googleCloud).toHaveProperty('existence');
      expect(data.googleCloud).toHaveProperty('maskedValues');

      expect(data.summary).toHaveProperty('status');
      expect(data.summary).toHaveProperty('message');
      expect(data.summary).toHaveProperty('errors');
      expect(data.summary).toHaveProperty('warnings');

      // データ型の確認
      expect(typeof data.timestamp).toBe('string');
      expect(typeof data.environment).toBe('string');
      expect(typeof data.googleCloud.validation.isValid).toBe('boolean');
      expect(Array.isArray(data.summary.errors)).toBe(true);
      expect(Array.isArray(data.summary.warnings)).toBe(true);
    });
  });
});