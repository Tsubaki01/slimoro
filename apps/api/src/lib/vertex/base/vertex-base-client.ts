import { createVertex, type GoogleVertexProvider } from '@ai-sdk/google-vertex/edge';
import { LocationResolver } from '@/utils/location';
import type { Env } from '@/types';

/**
 * Vertex AI基盤クライアント
 *
 * Cloudflare Workers環境で動作するVertex AIの汎用基盤クライアント
 * 認証、環境設定、リトライ処理などの共通機能を提供
 */
export class VertexBaseClient {
  protected env: Env['Bindings'];
  protected location: string;

  /**
   * コンストラクタ
   * @param env - 環境変数
   * @param request - オプショナルなリクエストオブジェクト（地理情報の自動検出用）
   */
  constructor(env: Env['Bindings'], request?: Request) {
    console.log('[VertexBaseClient] 初期化中:', {
      hasClientEmail: !!env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!env.GOOGLE_PRIVATE_KEY,
      hasPrivateKeyId: !!env.GOOGLE_PRIVATE_KEY_ID,
      explicitLocation: env.GOOGLE_LOCATION,
      hasRequest: !!request,
    });

    // 認証情報の検証
    if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Cloud Service Account credentials are required');
    }

    // ロケーションの設定と検証（地理情報ベースの自動選択を含む）
    const locationResult = LocationResolver.resolveOptimalLocation({
      explicitLocation: env.GOOGLE_LOCATION,
      request,
      debug: true,
    });

    this.location = locationResult.location;
    this.env = env;

    console.log('[VertexBaseClient] 初期化完了:', {
      resolvedLocation: this.location,
      resolutionMethod: locationResult.resolutionMethod,
      geographicInfo: locationResult.geographicInfo,
    });
  }





  /**
   * Vertex AIクライアントを作成する
   * @returns Vertex AIクライアント関数
   */
  createVertex(): GoogleVertexProvider {
    return createVertex({
      location: "global",
      project: this.env.GOOGLE_PROJECT_ID,
      googleCredentials: {
        clientEmail: this.env.GOOGLE_CLIENT_EMAIL,
        privateKey: this.env.GOOGLE_PRIVATE_KEY,
        privateKeyId: this.env.GOOGLE_PRIVATE_KEY_ID,
      },
    });
  }

  /**
   * 現在設定されているロケーションを取得
   * @returns 現在のロケーション
   */
  getLocation(): string {
    return this.location;
  }

  /**
   * スリープ関数
   * @param ms - 待機時間（ミリ秒）
   */
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * リトライ処理を実行する
   * @param fn - 実行する関数
   * @param maxRetries - 最大リトライ回数
   * @param baseDelay - 基本待機時間（ミリ秒）
   * @returns 関数の実行結果
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    baseDelay = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        console.error(`[VertexBaseClient] 試行 ${attempt + 1} 失敗:`, error);

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`[VertexBaseClient] ${delay}ms待機...`);
          await this.sleep(delay);
        } else {
          throw error;
        }
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * エラーメッセージを標準化する
   * @param error - エラーオブジェクト
   * @returns 標準化されたエラーメッセージ
   */
  protected standardizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}

/**
 * VertexBaseClientのファクトリ関数
 * @param env - 環境変数
 * @param request - オプショナルなリクエストオブジェクト（地理情報の自動検出用）
 * @returns VertexBaseClientインスタンス
 */
export function createVertexBaseClient(env: Env['Bindings'], request?: Request): VertexBaseClient {
  return new VertexBaseClient(env, request);
}