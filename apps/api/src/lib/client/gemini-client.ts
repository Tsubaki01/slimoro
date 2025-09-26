import { GoogleGenAI } from '@google/genai';

import { Env } from '@/types';

/**
 * 入力画像をもとに Gemini による画像生成を行う際の入力パラメータ。
 */
export type GeminiImageGenerationOptions = {
  /** プロンプト本文。画像編集・変換の指示を含める。 */
  prompt: string;
  /** 入力画像の Base64 文字列 (プレフィックス無し)。 */
  imageBase64: string;
  /** 入力画像の MIME タイプ (例: 'image/png', 'image/jpeg')。 */
  mimeType: string;
  /** 生成設定 (例: seed)。 */
  generationConfig?: {
    /** 再現性を高めるためのシード値。 */
    seed?: number;
  };
}

/**
 * 画像生成 API の戻り値。
 */
export type GeminiImageGenerationResult = {
  /** 成否フラグ。true の場合のみ `imageBase64` が設定される。 */
  success: boolean;
  /** 生成された画像の Base64 文字列。 */
  imageBase64?: string;
  /** 失敗時のエラーメッセージ。 */
  error?: string;
}

/**
 * `GeminiClient` の構成オプション。
 */
export type GeminiClientOptions = {
  /** 使用するモデル名。 */
  model?: string;
  /** 最大リトライ回数。 */
  maxRetries?: number;
  /** ベースのリトライ待機時間 (ms)。指数バックオフの基底となる。 */
  baseRetryDelayMs?: number;
}

// 最低限必要なレスポンス形状。SDK の詳細型に依存しないため安全。
type GenerateContentResponseLike = {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string } }> };
  }>;
};

/**
 * Gemini 画像生成用の薄いクライアント。
 * - コンストラクタで API キーとオプションを受け取る
 * - 429 等のレート制限に対して指数バックオフで再試行
 * - レスポンスから最初の画像を抽出
 */
export class GeminiClient {
  private readonly genAI: GoogleGenAI;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;

  /**
   * @param apiKey Google Gemini の API キー
   * @param options 任意設定。未指定時は安全なデフォルトを使用
   */
  constructor(apiKey: string, options: GeminiClientOptions = {}) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenAI({ apiKey });
    this.model = options.model ?? 'gemini-2.5-flash-image-preview';
    this.maxRetries = options.maxRetries ?? 2;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 1000; // 1s
  }

  /**
   * 指定されたプロンプトと入力画像を用いて画像を生成する。
   * 内部で指数バックオフ付きの再試行を実施する。
   *
   * @param options 画像生成に必要なパラメータ
   * @returns 生成結果。成功時は `imageBase64` を返す
   */
  async generateImage(
    options: GeminiImageGenerationOptions
  ): Promise<GeminiImageGenerationResult> {
    const { prompt, imageBase64, mimeType } = options;

    // 簡易入力バリデーション
    if (!prompt || !imageBase64 || !mimeType) {
      return { success: false, error: 'Invalid arguments: prompt/image/mimeType are required' };
    }

    for (let attempt = 0; ; attempt++) {
      try {
        // NOTE: @google/genai の generateContent へ直接渡すリクエスト。
        // parts にはテキストと画像の両方を順に与える。
        const requestPayload = {
          model: this.model,
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
          ...(options.generationConfig && Object.keys(options.generationConfig).length > 0
            ? { generationConfig: options.generationConfig }
            : {}),
        };

        const response = await this.genAI.models.generateContent(requestPayload);

        const image = this.extractFirstInlineImage(response);
        if (image) {
          return { success: true, imageBase64: image };
        }

        throw new Error('No image generated in response');
      } catch (error) {
        const isLastAttempt = attempt >= this.maxRetries;
        if (!isLastAttempt && this.isRetryableError(error)) {
          const delay = this.computeBackoffDelayMs(attempt);
          await this.sleep(delay);
          continue;
        }

        return {
          success: false,
          error: this.formatErrorMessage(error),
        };
      }
    }
  }

  /**
   * レスポンスから最初の inline 画像 (Base64) を抽出する。
   */
  private extractFirstInlineImage(response: GenerateContentResponseLike): string | undefined {
    const candidates = response?.candidates ?? [];
    if (!Array.isArray(candidates) || candidates.length === 0) return undefined;

    // 先頭候補の parts を走査し、inlineData を持つ最初のパートを返す
    const parts = candidates[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return part.inlineData.data as string;
      }
    }
    return undefined;
  }

  /**
   * 再試行すべきかどうかをエラー内容から推定する。
   * 主に 429 / レート制限 / 一時的障害を対象とする。
   */
  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /(429|rate limit|quota|unavailable|timeout|ETIMEDOUT)/i.test(message);
  }

  /**
   * 指数バックオフ + 低ジッタで待機時間を算出する。
   */
  private computeBackoffDelayMs(attempt: number): number {
    const expo = this.baseRetryDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * (this.baseRetryDelayMs / 2));
    return expo + jitter;
  }

  /**
   * エラーメッセージをユーザー向けに整形する。
   */
  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error occurred during image generation';
    }
  }

  /** 指定ミリ秒だけ待機するユーティリティ。 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * `Env` から API キーを読み取り、既定設定で `GeminiClient` を生成する。
 */
export function createGeminiClient(env: Env['Bindings']): GeminiClient {
  return new GeminiClient(env.GEMINI_API_KEY);
}