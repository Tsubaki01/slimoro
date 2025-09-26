import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { createGeminiClient } from '@/lib';
import { Env } from '@/types';
import { fileToBase64, ImageConversionError } from '@/utils';

const app = new Hono<Env>();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const subjectSchema = z.object({
  heightCm: z
    .number()
    .min(120, 'Height must be between 120 and 220 cm')
    .max(220, 'Height must be between 120 and 220 cm'),
  currentWeightKg: z
    .number()
    .min(20, 'Weight must be between 20 and 300 kg')
    .max(300, 'Weight must be between 20 and 300 kg'),
});

const targetWeightSchema = z.object({
  weightKg: z
    .number()
    .min(20, 'Target weight must be between 20 and 300 kg')
    .max(300, 'Target weight must be between 20 and 300 kg'),
  label: z.string().optional(),
});

const optionsSchema = z.object({
  strength: z
    .number()
    .min(0.0, 'Strength must be between 0.0 and 1.0')
    .max(1.0, 'Strength must be between 0.0 and 1.0')
    .optional(),
  returnMimeType: z
    .enum(['image/png', 'image/jpeg'])
    .optional(),
  preserveBackground: z.boolean().optional(),
  seed: z.number().optional(),
});

const bodyShapeSchema = z.object({
  image: z
    .instanceof(File, { message: 'Image file is required' })
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    })
    .refine((file) => ALLOWED_MIME_TYPES.includes(file.type), {
      message: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .transform((str, ctx) => {
      try {
        const parsed = JSON.parse(str);
        return subjectSchema.parse(parsed);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subject must be valid JSON with heightCm and currentWeightKg',
        });
        return z.NEVER;
      }
    }),
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
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Targets must be valid JSON array',
        });
        return z.NEVER;
      }
    }),
  options: z
    .string()
    .optional()
    .transform((str, ctx) => {
      if (!str) return undefined;
      try {
        const parsed = JSON.parse(str);
        return optionsSchema.parse(parsed);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Options must be valid JSON',
        });
        return z.NEVER;
      }
    }),
});

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
          fieldErrors: result.error.flatten().fieldErrors,
        },
      },
      400
    );
  }
});

app.post('/', validator, async (c) => {
  try {
    const validatedData = c.req.valid('form');
    const { image, subject, targets, options } = validatedData;

    let base64: string;
    try {
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

    const client = createGeminiClient(c.env);

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