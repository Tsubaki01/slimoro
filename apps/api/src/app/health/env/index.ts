import { Hono } from 'hono';
import type { Env } from '@/types';
import { EnvValidator } from '@/utils/env-validator';

const app = new Hono<Env>();

/**
 * 環境変数の設定状況を確認するエンドポイント
 *
 * GET /api/health/env
 *
 * Google Cloud認証に必要な環境変数の設定状況を確認します。
 * 開発時のデバッグ用途で使用してください。
 *
 * レスポンス:
 * - 200: 環境変数の検証結果
 * - 500: サーバーエラー
 */
app.get('/', (c) => {
  try {
    console.log('[ENV] 環境変数検証開始');

    // 環境変数の存在確認
    const envExistence = EnvValidator.checkEnvVarsExistence(c.env);
    console.log('[ENV] 環境変数存在確認:', envExistence);

    // 環境変数の値確認（マスク表示）
    const maskedValues = EnvValidator.getMaskedEnvValues(c.env);
    console.log('[ENV] 環境変数値（マスク表示）:', maskedValues);

    // Google Cloud認証情報の詳細検証
    const validationResult = EnvValidator.validateGoogleCloudEnv(c.env);
    console.log('[ENV] Google Cloud認証情報検証結果:', {
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
    });

    // レスポンス作成
    const response = {
      timestamp: new Date().toISOString(),
      environment: 'development',
      googleCloud: {
        validation: validationResult,
        existence: envExistence,
        maskedValues: maskedValues,
      },
      summary: {
        status: validationResult.isValid ? 'OK' : 'ERROR',
        message: validationResult.isValid
          ? 'Google Cloud認証情報が正しく設定されています'
          : `設定エラーが${validationResult.errors.length}件あります`,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      },
    };

    console.log('[ENV] 環境変数検証完了:', response.summary);

    return c.json(response, validationResult.isValid ? 200 : 422);
  } catch (error) {
    console.error('[ENV] 環境変数検証エラー:', error);

    return c.json({
      timestamp: new Date().toISOString(),
      environment: 'development',
      summary: {
        status: 'ERROR',
        message: '環境変数検証中にエラーが発生しました',
        errors: [error instanceof Error ? error.message : '不明なエラー'],
        warnings: [],
      },
    }, 500);
  }
});

export default app;