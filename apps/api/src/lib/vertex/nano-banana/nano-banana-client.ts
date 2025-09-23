import { generateText, type ModelMessage } from 'ai';
import {  VertexBaseClient } from '../base';
import type { Env } from '@/types';

/**
 * サポートされている画像MIMEタイプ
 */
export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageMimeType = typeof SUPPORTED_MIME_TYPES[number];

/**
 * 画像生成オプション
 */
export interface NanoBananaImageGenerationOptions {
  /** 生成する画像の説明プロンプト */
  prompt: string;
  /** 入力画像（オプション） */
  inputImage?: {
    /** Base64エンコードされた画像データ */
    base64: string;
    /** 画像のMIMEタイプ */
    mimeType: ImageMimeType;
  };
}

/**
 * 画像編集オプション
 */
export interface NanoBananaImageEditOptions {
  /** 編集指示のプロンプト */
  prompt: string;
  /** 編集対象の画像 */
  baseImage: {
    /** Base64エンコードされた画像データ */
    base64: string;
    /** 画像のMIMEタイプ */
    mimeType: ImageMimeType;
  };
}

/**
 * 画像生成/編集結果
 */
export interface NanoBananaResult {
  /** 成功フラグ */
  success: boolean;
  /** Base64エンコードされた生成画像 */
  imageBase64?: string;
  /** エラーメッセージ */
  error?: string;
}

/**
 * Nano Banana画像生成クライアント
 *
 * gemini-2.5-flash-image-preview（Nano Banana）専用の画像生成・編集クライアント
 * VertexBaseClientを継承し、汎用的なVertex AI機能を利用
 */
export class NanoBananaClient extends VertexBaseClient {
  private readonly MODEL_ID = 'gemini-2.5-flash-image-preview';

  /**
   * コンストラクタ
   * @param env - 環境変数
   * @param request - オプショナルなリクエストオブジェクト（地理情報の自動検出用）
   */
  constructor(env: Env['Bindings'], request?: Request) {
    super(env, request);
    console.log('[NanoBananaClient] Nano Banana (gemini-2.5-flash-image-preview) クライアント初期化完了');
  }

  /**
   * 画像を生成する
   * @param options - 生成オプション
   * @returns 生成結果
   */
  async generateImage(
    options: NanoBananaImageGenerationOptions
  ): Promise<NanoBananaResult> {
    const { prompt, inputImage } = options;

    console.log('[NanoBananaClient] 画像生成開始:', {
      promptLength: prompt.length,
      hasInputImage: !!inputImage,
      model: this.MODEL_ID,
    });

    // バリデーション
    const validationResult = this.validateGenerationOptions(options);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    // Nano Bananaを使用して画像生成
    return this.retry(async () => {
      console.log(`[NanoBananaClient] Nano Banana API呼び出し開始...`);

      // プロンプトの構築
      const finalPrompt: ModelMessage[] = [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Create an image: ${prompt}`
          },
        ]
      }];

      // Vertex AIクライアントの作成
      const vertexClient = this.createVertex();
      const model = vertexClient(this.MODEL_ID);

      // テキスト生成APIで画像生成を実行
      const response = await generateText({
        model,
        prompt: finalPrompt,
      });

      console.log('[NanoBananaClient] Nano Banana API呼び出し完了');

      // レスポンスの処理
      return this.processNanoBananaResponse(response.text);
    });
  }

  /**
   * 画像を編集する
   * @param options - 編集オプション
   * @returns 編集結果
   */
  async editImage(
    options: NanoBananaImageEditOptions
  ): Promise<NanoBananaResult> {
    const { prompt, baseImage } = options;

    console.log('[NanoBananaClient] 画像編集開始:', {
      promptLength: prompt.length,
      hasBaseImage: !!baseImage,
      model: this.MODEL_ID,
    });

    // バリデーション
    const validationResult = this.validateEditOptions(options);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    // Nano Bananaを使用して画像編集
    return this.retry(async () => {
      console.log(`[NanoBananaClient] Nano Banana API呼び出し開始...`);

      // 編集プロンプトの構築
      const finalPrompt: ModelMessage[] = [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Edit this image: ${prompt}.`
          },
          {
            type: 'image',
            image: baseImage.base64,
            mediaType: baseImage.mimeType,
          },
        ]
      }];

      // Vertex AIクライアントの作成
      const vertexClient = this.createVertex();
      const model = vertexClient(this.MODEL_ID);

      // テキスト生成APIで画像編集を実行
      const response = await generateText({
        model,
        prompt: finalPrompt,
      });

      console.log('[NanoBananaClient] Nano Banana API呼び出し完了');

      // レスポンスの処理
      return this.processNanoBananaResponse(response.text);
    });
  }

  /**
   * 生成オプションのバリデーション
   */
  private validateGenerationOptions(
    options: NanoBananaImageGenerationOptions
  ): { isValid: boolean; error?: string } {
    const { prompt, inputImage } = options;

    if (!prompt) {
      return { isValid: false, error: 'Prompt is required' };
    }

    if (prompt.length > 1000) {
      return { isValid: false, error: 'Prompt must be less than 1000 characters' };
    }

    if (inputImage && !SUPPORTED_MIME_TYPES.includes(inputImage.mimeType)) {
      return {
        isValid: false,
        error: `Invalid image mime type. Supported: ${SUPPORTED_MIME_TYPES.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  /**
   * 編集オプションのバリデーション
   */
  private validateEditOptions(
    options: NanoBananaImageEditOptions
  ): { isValid: boolean; error?: string } {
    const { prompt, baseImage } = options;

    if (!prompt) {
      return { isValid: false, error: 'Prompt is required' };
    }

    if (prompt.length > 1000) {
      return { isValid: false, error: 'Prompt must be less than 1000 characters' };
    }

    if (!baseImage) {
      return { isValid: false, error: 'Base image is required for editing' };
    }

    if (!SUPPORTED_MIME_TYPES.includes(baseImage.mimeType)) {
      return {
        isValid: false,
        error: `Invalid image mime type. Supported: ${SUPPORTED_MIME_TYPES.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Nano Bananaのレスポンスを処理する
   */
  private processNanoBananaResponse(responseText: string): NanoBananaResult {
    if (!responseText) {
      return {
        success: false,
        error: 'No image generated by Nano Banana',
      };
    }

    // Data URLの形式をチェック
    const dataUrlMatch = responseText.match(/data:image\/[^;]+;base64,(.+)/);
    if (dataUrlMatch && dataUrlMatch[1]) {
      return {
        success: true,
        imageBase64: dataUrlMatch[1],
      };
    }

    return {
      success: false,
      error: 'Invalid response format from Nano Banana',
    };
  }

  /**
   * エラーを処理してリトライするか判断する
   */
  override async retry<T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    baseDelay = 1000
  ): Promise<T> {
    try {
      return await super.retry(fn, maxRetries, baseDelay);
    } catch (error) {
      return {
        success: false,
        error: this.standardizeError(error),
      } as T;
    }
  }
}

/**
 * NanoBananaClientのファクトリ関数
 * @param env - 環境変数
 * @param request - オプショナルなリクエストオブジェクト（地理情報の自動検出用）
 * @returns NanoBananaClientインスタンス
 */
export function createNanoBananaClient(env: Env['Bindings'], request?: Request): NanoBananaClient {
  return new NanoBananaClient(env, request);
}