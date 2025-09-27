import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { createBodyShapeClient } from '@/lib';
import { Env } from '@/types';
import { fileToBase64, ImageConversionError } from '@/utils';

import demo from './demo';

/**
 * 体型変化の画像編集 API モジュール
 *
 * このモジュールは、人物画像と現在の体格情報（身長・体重）を入力し、
 * 目標体重に変化した場合の体型イメージを生成するエンドポイントを提供します。
 */

const app = new Hono<Env>();

/**
 * デモ用のサブルート。
 * 実運用の生成処理の振る舞いを検証するためのエンドポイント群を公開します。
 */
app.route('/demo', demo);

/** アップロード画像の最大サイズ（10MB）。 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** 受け付け可能な画像の MIME タイプ。 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * 被写体（現在の体格）入力のスキーマ。
 */
const subjectSchema = z.object({
  /** 身長[cm]（120〜220） */
  heightCm: z
    .number()
    .min(120, 'Height must be between 120 and 220 cm')
    .max(220, 'Height must be between 120 and 220 cm'),
  /** 現在体重[kg]（20〜300） */
  currentWeightKg: z
    .number()
    .min(20, 'Weight must be between 20 and 300 kg')
    .max(300, 'Weight must be between 20 and 300 kg'),
});

/**
 * 目標体重のスキーマ。
 */
const targetWeightSchema = z.object({
  /** 目標体重[kg]（20〜300） */
  weightKg: z
    .number()
    .min(20, 'Target weight must be between 20 and 300 kg')
    .max(300, 'Target weight must be between 20 and 300 kg'),
  /** レスポンス画像に付与する任意ラベル */
  label: z.string().optional(),
});

/**
 * 追加オプションのスキーマ。
 */
const optionsSchema = z.object({
  /** 出力画像の MIME（既定 `image/png`） */
  returnMimeType: z
    .enum(['image/png', 'image/jpeg'])
    .optional(),
  /** 生成のシード値 */
  seed: z.number().optional(),
});

/**
 * multipart/form-data で受け取るフォーム全体のスキーマ。
 * 文字列として送られる `subject` / `targets` / `options` は JSON としてパースして検証します。
 */
const bodyShapeSchema = z.object({
  /** 入力画像 */
  image: z
    .instanceof(File, { message: 'Image file is required' })
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    })
    .refine((file) => ALLOWED_MIME_TYPES.includes(file.type), {
      message: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
  /** 被写体（現在の体格） */
  subject: z
    .string()
    .min(1, 'Subject is required')
    .transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        return subjectSchema.parse(parsed);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subject must be valid JSON with heightCm and currentWeightKg',
        });
        return z.NEVER;
      }
    }),
  /** 目標体重 */
  targets: z
    .string()
    .min(1, 'Targets is required')
    .transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        if (!Array.isArray(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Targets must be an array',
          });
          return z.NEVER;
        }
        if (parsed.length < 1 || parsed.length > 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Targets array must have 1 to 2 elements',
          });
          return z.NEVER;
        }
        return z.array(targetWeightSchema).parse(parsed);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Targets must be valid JSON array',
        });
        return z.NEVER;
      }
    }),
  /** 追加オプション */
  options: z
    .string()
    .optional()
    .transform((str, ctx) => {
      if (!str) return undefined;
      try {
        const parsed = JSON.parse(str);
        return optionsSchema.parse(parsed);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Options must be valid JSON',
        });
        return z.NEVER;
      }
    }),
});

/**
 * 入力バリデータ。
 *
 * 失敗時は 400 を返し、`code: VALIDATION_ERROR` と共に最初のエラー要約と
 * `details.fieldErrors` を返却します。`invalid_type` の場合はフィールド別の
 * 分かりやすいメッセージに差し替えます。
 */
const validator = zValidator('form', bodyShapeSchema, (result, c) => {
  if (!result.success) {
    const firstError = result.error.issues[0];
    let message = firstError.message;

    if (firstError.code === 'invalid_type') {
      const path = firstError.path[0];
      if (path === 'image') {
        message = 'Image file is required';
      } else if (path === 'subject') {
        message = 'Subject is required';
      } else if (path === 'targets') {
        message = 'Targets is required';
      }
    }

    return c.json(
      {
        success: false,
        code: 'VALIDATION_ERROR',
        message,
        details: {
          fieldErrors: (result.error as import('zod').ZodError).flatten().fieldErrors,
        },
      },
      400
    );
  }
  return undefined;
});

/**
 * POST `/api/generate-image/body-shape`
 *
 * 体型変化イメージを生成します。入力画像を base64 に変換し、Gemini クライアントへ
 * リクエストします。生成に成功すると、1〜2 枚の処理済み画像とメタデータを返します。
 *
 * リクエスト: multipart/form-data（`image`, `subject`, `targets`, `options`）
 * レスポンス:
 * - 200: `{ success: true, images, metadata }`
 * - 400: `{ success: false, code: 'VALIDATION_ERROR', ... }`
 * - 500: `{ success: false, code: 'FILE_CONVERSION_ERROR' | 'GENERATION_ERROR' | 'INTERNAL_ERROR', ... }`
 */
app.post('/', validator, async (c) => {
  try {
    const validatedData = c.req.valid('form');
    const { image, subject, targets, options } = validatedData;

    let base64: string;
    try {
      // 画像を Base64 へ変換
      base64 = await fileToBase64(image);
    } catch (error) {
      const errorMessage =
        error instanceof ImageConversionError
          ? error.message
          : 'ファイルの変換に失敗しました';

      return c.json(
        {
          success: false,
          code: 'FILE_CONVERSION_ERROR',
          message: errorMessage,
        },
        500
      );
    }

    // 体重変化なしのターゲットをチェック
    const noChangeTargets = targets.filter(target => target.weightKg === subject.currentWeightKg);
    if (noChangeTargets.length > 0) {
      // 体重変化なしの場合、元の画像をそのまま返す
      const outputMimeType = options?.returnMimeType || 'image/png';
      const originalImages = noChangeTargets.map(target => ({
        label: target.label,
        base64: base64,
        mimeType: outputMimeType,
        width: 1024,
        height: 1024,
      }));

      return c.json({
        success: true,
        images: originalImages,
        metadata: {
          processingTimeMs: 0,
          confidence: 1.0,
          model: 'original-image',
          note: 'No body shape change needed - returning original image',
        },
      });
    }

    // 体型変化専用クライアントを用いて画像を生成
    const client = createBodyShapeClient(c.env);

    const result = await client.generateBodyShapeImages({
      imageBase64: base64,
      mimeType: image.type,
      subject,
      targets,
      options: options || {},
    });

    if (!result.success) {
      return c.json(
        {
          success: false,
          code: 'GENERATION_ERROR',
          message: result.error || 'Failed to generate body shape images',
        },
        500
      );
    }

    return c.json({
      success: true,
      images: result.images,
      metadata: result.metadata,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

export default app;