import type { Env } from '@/types';

/**
 * 環境変数検証の結果
 */
export interface EnvValidationResult {
  /** 検証が成功したかどうか */
  isValid: boolean;
  /** 検証項目ごとの結果 */
  checks: {
    /** Google Cloud Project IDの存在確認 */
    hasProjectId: boolean;
    /** Service Accountメールの存在確認 */
    hasClientEmail: boolean;
    /** 秘密鍵の存在確認 */
    hasPrivateKey: boolean;
    /** 秘密鍵フォーマットの確認 */
    privateKeyFormatValid: boolean;
    /** 秘密鍵のBase64デコード可能性確認 */
    privateKeyDecodable: boolean;
    /** 秘密鍵IDの存在確認（オプション） */
    hasPrivateKeyId: boolean;
    /** ロケーション設定の確認（オプション） */
    hasLocation: boolean;
  };
  /** エラーメッセージ */
  errors: string[];
  /** 警告メッセージ */
  warnings: string[];
}

/**
 * 環境変数の検証ユーティリティ
 */
export class EnvValidator {
  /**
   * Google Cloud認証に必要な環境変数を検証する
   * @param env - 環境変数オブジェクト
   * @returns 検証結果
   */
  static validateGoogleCloudEnv(env: Env['Bindings']): EnvValidationResult {
    const result: EnvValidationResult = {
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
      errors: [],
      warnings: [],
    };

    // Google Cloud Project IDの確認
    if (env.GOOGLE_PROJECT_ID && env.GOOGLE_PROJECT_ID.trim() !== '') {
      result.checks.hasProjectId = true;
    } else {
      result.errors.push('GOOGLE_PROJECT_IDが設定されていません');
    }

    // Service Accountメールの確認
    if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_CLIENT_EMAIL.trim() !== '') {
      result.checks.hasClientEmail = true;

      // メールフォーマットの簡易確認
      if (!env.GOOGLE_CLIENT_EMAIL.includes('@') || !env.GOOGLE_CLIENT_EMAIL.includes('.')) {
        result.warnings.push('GOOGLE_CLIENT_EMAILのフォーマットが正しくない可能性があります');
      }
    } else {
      result.errors.push('GOOGLE_CLIENT_EMAILが設定されていません');
    }

    // 秘密鍵の確認
    if (env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PRIVATE_KEY.trim() !== '') {
      result.checks.hasPrivateKey = true;

      // 秘密鍵フォーマットの確認
      if (this.validatePrivateKeyFormat(env.GOOGLE_PRIVATE_KEY)) {
        result.checks.privateKeyFormatValid = true;

        // Base64デコード可能性の確認
        if (this.validatePrivateKeyDecoding(env.GOOGLE_PRIVATE_KEY)) {
          result.checks.privateKeyDecodable = true;
        } else {
          result.errors.push('GOOGLE_PRIVATE_KEYのBase64デコードに失敗しました');
        }
      } else {
        result.errors.push('GOOGLE_PRIVATE_KEYのフォーマットが正しくありません（PEM形式である必要があります）');
      }
    } else {
      result.errors.push('GOOGLE_PRIVATE_KEYが設定されていません');
    }

    // 秘密鍵IDの確認（オプション）
    if (env.GOOGLE_PRIVATE_KEY_ID && env.GOOGLE_PRIVATE_KEY_ID.trim() !== '') {
      result.checks.hasPrivateKeyId = true;
    } else {
      result.warnings.push('GOOGLE_PRIVATE_KEY_IDが設定されていません（オプション）');
    }

    // ロケーション設定の確認（オプション）
    if (env.GOOGLE_LOCATION && env.GOOGLE_LOCATION.trim() !== '') {
      result.checks.hasLocation = true;
    } else {
      result.warnings.push('GOOGLE_LOCATIONが設定されていません（オプション、地理情報から自動選択されます）');
    }

    // 全体的な検証結果の判定
    result.isValid = result.checks.hasProjectId &&
                    result.checks.hasClientEmail &&
                    result.checks.hasPrivateKey &&
                    result.checks.privateKeyFormatValid &&
                    result.checks.privateKeyDecodable;

    return result;
  }

  /**
   * 秘密鍵のフォーマットを検証する
   * @param privateKey - 秘密鍵文字列
   * @returns フォーマットが正しいかどうか
   */
  private static validatePrivateKeyFormat(privateKey: string): boolean {
    const trimmed = privateKey.trim();
    return trimmed.includes('-----BEGIN PRIVATE KEY-----') &&
           trimmed.includes('-----END PRIVATE KEY-----');
  }

  /**
   * 秘密鍵のBase64デコードを試行する
   * @param privateKey - 秘密鍵文字列
   * @returns デコードが成功するかどうか
   */
  private static validatePrivateKeyDecoding(privateKey: string): boolean {
    try {
      // PEM形式から Base64 部分を抽出
      const lines = privateKey.split('\n');
      const base64Lines = lines.filter(line =>
        !line.includes('-----BEGIN') &&
        !line.includes('-----END') &&
        line.trim() !== ''
      );

      if (base64Lines.length === 0) {
        return false;
      }

      const base64Content = base64Lines.join('');

      // Base64デコードを試行
      atob(base64Content);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 環境変数の存在確認を行う（開発用）
   * @param env - 環境変数オブジェクト
   * @returns 環境変数の存在状況
   */
  static checkEnvVarsExistence(env: Env['Bindings']): Record<string, boolean> {
    return {
      GOOGLE_PROJECT_ID: !!env.GOOGLE_PROJECT_ID,
      GOOGLE_CLIENT_EMAIL: !!env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!env.GOOGLE_PRIVATE_KEY,
      GOOGLE_PRIVATE_KEY_ID: !!env.GOOGLE_PRIVATE_KEY_ID,
      GOOGLE_LOCATION: !!env.GOOGLE_LOCATION,
    };
  }

  /**
   * 環境変数の値のマスク表示（デバッグ用）
   * @param env - 環境変数オブジェクト
   * @returns マスクされた環境変数の値
   */
  static getMaskedEnvValues(env: Env['Bindings']): Record<string, string> {
    const maskValue = (value: string | undefined, showLength = 4): string => {
      if (!value) return '未設定';
      if (value.length <= showLength) return '*'.repeat(value.length);
      return value.substring(0, showLength) + '*'.repeat(Math.max(0, value.length - showLength));
    };

    return {
      GOOGLE_PROJECT_ID: maskValue(env.GOOGLE_PROJECT_ID, 8),
      GOOGLE_CLIENT_EMAIL: maskValue(env.GOOGLE_CLIENT_EMAIL, 10),
      GOOGLE_PRIVATE_KEY: env.GOOGLE_PRIVATE_KEY ? `${env.GOOGLE_PRIVATE_KEY.substring(0, 20)}...` : '未設定',
      GOOGLE_PRIVATE_KEY_ID: maskValue(env.GOOGLE_PRIVATE_KEY_ID, 8),
      GOOGLE_LOCATION: env.GOOGLE_LOCATION || '未設定（自動選択）',
    };
  }
}