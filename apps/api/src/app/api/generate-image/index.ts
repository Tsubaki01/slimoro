import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { createGeminiClient } from '@/lib';
import { Env } from '@/types';
import { fileToBase64, ImageConversionError } from '@/utils';

const app = new Hono<Env>();

/**
 * ファイルサイズの上限（10MB）
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 許可される画像ファイルのMIMEタイプ
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * 画像生成API用のバリデーションスキーマ
 *
 * @description プロンプトとアップロードファイルの検証を行う
 */
const generateImageSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(1000, 'Prompt must be less than 1000 characters'),
  image: z
    .instanceof(File, { message: 'Image file is required' })
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    })
    .refine((file) => ALLOWED_MIME_TYPES.includes(file.type), {
      message: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
});

/**
 * バリデーション処理
 *
 * @param result - Zodバリデーション結果
 * @param c - Honoコンテキスト
 * @returns バリデーションエラーレスポンス
 */
const validator = zValidator('form', generateImageSchema, 
  (
    result,
    c
  ) => {
    if (!result.success) {
      // 最初のエラーメッセージを取得
      const firstError = result.error.issues[0];
      let message = firstError.message;
  
      // 特殊なケース：promptやimageが未定義の場合
      if (firstError.code === 'invalid_type') {
        const path = firstError.path[0];
        if (path === 'prompt') {
          message = 'Prompt is required';
        } else if (path === 'image') {
          message = 'Image file is required';
        }
      }
  
      return c.json(
        {
          success: false,
          message,
        },
        400
      );
    }
    return;
  }
);

/**
 * 画像生成エンドポイント
 *
 * @route POST /
 * @description Gemini APIを使用してアップロードされた画像を元に新しい画像を生成する
 */
app.post(
  '/',
  // バリデーション処理
  validator,
  // メインハンドラー
  async (c) => {
    try {
      // 1. バリデーション済みデータの取得
      const validatedData = c.req.valid('form');
      const { prompt, image } = validatedData;

      // 2. ファイルをBase64に変換（Cloudflare Workers対応）
      let base64: string;
      try {
        base64 = await fileToBase64(image);
      } catch (error) {
        const errorMessage = error instanceof ImageConversionError
          ? error.message
          : 'ファイルの変換に失敗しました';

        return c.json(
          {
            success: false,
            error: errorMessage,
          },
          500
        );
      }

      // 3. Gemini APIクライアントの作成
      const client = createGeminiClient(c.env);

      // 4. 画像生成の実行
      const result = await client.generateImage({
        prompt,
        imageBase64: base64,
        mimeType: image.type,
      });

      // 5. API呼び出し結果の検証
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.error || 'Failed to generate image',
          },
          500
        );
      }

      // 6. 成功レスポンスの返却
      return c.json({
        success: true,
        imageBase64: result.imageBase64,
        mimeType: 'image/png',
      });
    } catch (error) {
      // 7. エラーハンドリング
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        500
      );
    }
  }
);

export default app;