import { describe, it, expect } from 'vitest';
import { EnvValidator } from './env-validator';
import type { Env } from '@/types';

describe('EnvValidator - 基本機能確認', () => {
  describe('validateGoogleCloudEnv', () => {
    it('検証結果の構造が正しいことを確認', () => {
      const env: Env['Bindings'] = {
        GOOGLE_PROJECT_ID: 'test-project',
        GOOGLE_CLIENT_EMAIL: 'test@example.com',
        GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        GOOGLE_PRIVATE_KEY_ID: 'key-id',
        GOOGLE_LOCATION: 'us-central1',
      };

      const result = EnvValidator.validateGoogleCloudEnv(env);

      // 基本構造の確認
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.checks).toBe('object');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);

      // チェック項目の存在確認
      expect(result.checks).toHaveProperty('hasProjectId');
      expect(result.checks).toHaveProperty('hasClientEmail');
      expect(result.checks).toHaveProperty('hasPrivateKey');
      expect(result.checks).toHaveProperty('privateKeyFormatValid');
      expect(result.checks).toHaveProperty('privateKeyDecodable');
      expect(result.checks).toHaveProperty('hasPrivateKeyId');
      expect(result.checks).toHaveProperty('hasLocation');
    });

    it('環境変数が未設定の場合にエラーが報告される', () => {
      const env: Env['Bindings'] = {
        GOOGLE_PROJECT_ID: undefined,
        GOOGLE_CLIENT_EMAIL: undefined,
        GOOGLE_PRIVATE_KEY: undefined,
        GOOGLE_PRIVATE_KEY_ID: undefined,
        GOOGLE_LOCATION: undefined,
      };

      const result = EnvValidator.validateGoogleCloudEnv(env);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('GOOGLE_PROJECT_IDが設定されていません');
      expect(result.errors).toContain('GOOGLE_CLIENT_EMAILが設定されていません');
      expect(result.errors).toContain('GOOGLE_PRIVATE_KEYが設定されていません');
    });
  });

  describe('checkEnvVarsExistence', () => {
    it('環境変数の存在状況を正しく報告する', () => {
      const env: Env['Bindings'] = {
        GOOGLE_PROJECT_ID: 'test',
        GOOGLE_CLIENT_EMAIL: undefined,
        GOOGLE_PRIVATE_KEY: 'test',
        GOOGLE_PRIVATE_KEY_ID: undefined,
        GOOGLE_LOCATION: 'test',
      };

      const result = EnvValidator.checkEnvVarsExistence(env);

      expect(result).toHaveProperty('GOOGLE_PROJECT_ID');
      expect(result).toHaveProperty('GOOGLE_CLIENT_EMAIL');
      expect(result).toHaveProperty('GOOGLE_PRIVATE_KEY');
      expect(result).toHaveProperty('GOOGLE_PRIVATE_KEY_ID');
      expect(result).toHaveProperty('GOOGLE_LOCATION');

      expect(result.GOOGLE_PROJECT_ID).toBe(true);
      expect(result.GOOGLE_CLIENT_EMAIL).toBe(false);
      expect(result.GOOGLE_PRIVATE_KEY).toBe(true);
      expect(result.GOOGLE_PRIVATE_KEY_ID).toBe(false);
      expect(result.GOOGLE_LOCATION).toBe(true);
    });
  });

  describe('getMaskedEnvValues', () => {
    it('環境変数の値がマスクされて返される', () => {
      const env: Env['Bindings'] = {
        GOOGLE_PROJECT_ID: 'test-project',
        GOOGLE_CLIENT_EMAIL: 'test@example.com',
        GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
        GOOGLE_PRIVATE_KEY_ID: 'key-id',
        GOOGLE_LOCATION: 'us-central1',
      };

      const result = EnvValidator.getMaskedEnvValues(env);

      expect(result).toHaveProperty('GOOGLE_PROJECT_ID');
      expect(result).toHaveProperty('GOOGLE_CLIENT_EMAIL');
      expect(result).toHaveProperty('GOOGLE_PRIVATE_KEY');
      expect(result).toHaveProperty('GOOGLE_PRIVATE_KEY_ID');
      expect(result).toHaveProperty('GOOGLE_LOCATION');

      // マスクされた値には元の値が含まれていないことを確認
      expect(result.GOOGLE_PROJECT_ID).not.toBe('test-project');
      expect(result.GOOGLE_CLIENT_EMAIL).not.toBe('test@example.com');
      expect(result.GOOGLE_PRIVATE_KEY_ID).not.toBe('key-id');

      // 実際の値がマスクされているか確認
      expect(result.GOOGLE_PROJECT_ID).toContain('*');
      expect(result.GOOGLE_CLIENT_EMAIL).toContain('*');
      expect(result.GOOGLE_PRIVATE_KEY).toContain('...');
    });

    it('未設定の環境変数に対して適切なメッセージを返す', () => {
      const env: Env['Bindings'] = {
        GOOGLE_PROJECT_ID: undefined,
        GOOGLE_CLIENT_EMAIL: undefined,
        GOOGLE_PRIVATE_KEY: undefined,
        GOOGLE_PRIVATE_KEY_ID: undefined,
        GOOGLE_LOCATION: undefined,
      };

      const result = EnvValidator.getMaskedEnvValues(env);

      expect(result.GOOGLE_PROJECT_ID).toBe('未設定');
      expect(result.GOOGLE_CLIENT_EMAIL).toBe('未設定');
      expect(result.GOOGLE_PRIVATE_KEY).toBe('未設定');
      expect(result.GOOGLE_PRIVATE_KEY_ID).toBe('未設定');
      expect(result.GOOGLE_LOCATION).toBe('未設定（自動選択）');
    });
  });
});