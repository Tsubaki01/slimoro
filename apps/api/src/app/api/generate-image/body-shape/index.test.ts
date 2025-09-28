import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';

import { createBodyShapeClient } from '@/lib';
import type {
  BodyShapeGenerationOptions,
  BodyShapeGenerationResult,
} from '@/types';

import app from './index.js';

// lib のモック（体型変化クライアント）
vi.mock('@/lib', () => ({
  createBodyShapeClient: vi.fn(),
}));

describe('Body Shape Endpoint', () => {
  let mockedCreateBodyShapeClient: MockedFunction<typeof createBodyShapeClient>;
  let mockedGenerateBodyShapeImages: MockedFunction<
    (options: BodyShapeGenerationOptions) => Promise<BodyShapeGenerationResult>
  >;

  async function parseJson<T>(res: Response): Promise<T> {
    return (await res.json()) as T;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateBodyShapeClient =
      createBodyShapeClient as unknown as MockedFunction<
        typeof createBodyShapeClient
      >;

    mockedGenerateBodyShapeImages =
      vi.fn<
        (
          options: BodyShapeGenerationOptions
        ) => Promise<BodyShapeGenerationResult>
      >();

    const client = {
      generateBodyShapeImages: mockedGenerateBodyShapeImages,
      generateBodyShapePrompt: vi.fn(),
    } as unknown as ReturnType<typeof createBodyShapeClient>;

    mockedCreateBodyShapeClient.mockReturnValue(client);
  });

  describe('POST /', () => {
    it('image が未指定なら 400 を返す', async () => {
      const form = new FormData();
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append('targets', JSON.stringify([{ weightKg: 65, label: 't1' }]));

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      }>(res);

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('VAL001');
      expect(json.error?.details?.fieldErrors?.image).toBeDefined();
    });

    it('subject が未指定なら 400 を返す', async () => {
      const form = new FormData();
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      form.append('image', file);
      form.append('targets', JSON.stringify([{ weightKg: 65, label: 't1' }]));

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      }>(res);

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('VAL001');
      expect(json.error?.details?.fieldErrors?.subject).toBeDefined();
    });

    it('targets が未指定なら 400 を返す', async () => {
      const form = new FormData();
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      }>(res);

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('VAL001');
      expect(json.error?.details?.fieldErrors?.targets).toBeDefined();
    });

    it('subject が不正JSONなら 400 を返す', async () => {
      const form = new FormData();
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      form.append('image', file);
      form.append('subject', 'not-json');
      form.append('targets', JSON.stringify([{ weightKg: 65, label: 't1' }]));

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      }>(res);

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('VAL001');
      expect(json.error?.details?.fieldErrors?.subject).toBeDefined();
    });

    it('targets が配列でない場合は 400 を返す', async () => {
      const form = new FormData();
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append('targets', JSON.stringify({ weightKg: 65 }));

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      }>(res);

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('VAL001');
      expect(json.error?.details?.fieldErrors?.targets).toBeDefined();
    });

    it('targets が 1〜2 要素の範囲外なら 400 を返す', async () => {
      const form = new FormData();
      const file = new File([new Uint8Array(10)], 'a.png', {
        type: 'image/png',
      });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append(
        'targets',
        JSON.stringify([
          { weightKg: 65, label: 't1' },
          { weightKg: 60, label: 't2' },
          { weightKg: 55, label: 't3' },
        ])
      );

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      }>(res);

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('VAL001');
      expect(json.error?.details?.fieldErrors?.targets).toBeDefined();
    });

    it('変更なし（パススルーのみ）の場合は元画像のBase64とMIMEで返す', async () => {
      const form = new FormData();
      const file = new File(['payload'], 'original.png', { type: 'image/png' });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append('targets', JSON.stringify([{ weightKg: 70, label: 'same' }]));

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        data: {
          images: Array<{
            label?: string;
            mimeType: string;
            base64: string;
            width: number;
            height: number;
          }>;
        };
        metadata?: { model?: string };
      }>(res);

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.images)).toBe(true);
      expect(json.data.images).toHaveLength(1);
      expect(json.data.images[0].label).toBe('same');
      // パススルーは options 未指定時は元ファイルの MIME
      expect(json.data.images[0].mimeType).toBe('image/png');
      expect(json.metadata?.model).toBe('original-image');
    });

    it('パススルー時に options.returnMimeType を優先する', async () => {
      const form = new FormData();
      const file = new File(['payload'], 'original.png', { type: 'image/png' });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append('targets', JSON.stringify([{ weightKg: 70, label: 'same' }]));
      form.append('options', JSON.stringify({ returnMimeType: 'image/jpeg' }));

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        data: { images: Array<{ mimeType: string }> };
      }>(res);

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.images[0].mimeType).toBe('image/jpeg');
    });

    it('変更ありとパススルーが混在する場合、順序を保ってマージする', async () => {
      mockedGenerateBodyShapeImages.mockResolvedValue({
        success: true,
        images: [
          {
            label: 'B',
            base64: 'generated',
            mimeType: 'image/png',
            width: 1024,
            height: 1024,
          },
        ],
        metadata: {
          processingTimeMs: 123,
          confidence: 0.99,
          model: 'gemini-image-edit',
        },
      } satisfies BodyShapeGenerationResult);

      const form = new FormData();
      const file = new File(['payload'], 'original.webp', {
        type: 'image/webp',
      });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append(
        'targets',
        JSON.stringify([
          { weightKg: 70, label: 'A' }, // パススルー
          { weightKg: 65, label: 'B' }, // 生成
        ])
      );
      form.append('options', JSON.stringify({ returnMimeType: 'image/jpeg' }));

      const res = await app.request(
        '/',
        { method: 'POST', body: form },
        { GEMINI_API_KEY: 'test' }
      );
      const json = await parseJson<{
        success: boolean;
        data: { images: Array<{ label?: string; mimeType: string }> };
      }>(res);

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      // 順序: A(パススルー), B(生成)
      expect(json.data.images.map((i) => i.label)).toEqual(['A', 'B']);
      expect(json.data.images[0].mimeType).toBe('image/jpeg'); // オプション優先
      expect(json.data.images[1].mimeType).toBe('image/png');

      // 生成呼び出し時、変更ターゲットのみが渡される
      expect(mockedGenerateBodyShapeImages).toHaveBeenCalledTimes(1);
      const callArg = mockedGenerateBodyShapeImages.mock
        .calls[0][0] as BodyShapeGenerationOptions;
      expect(callArg.targets).toHaveLength(1);
      expect(callArg.targets[0].label).toBe('B');
    });

    it('生成が失敗した場合は GEN002 で 500 を返す', async () => {
      mockedGenerateBodyShapeImages.mockResolvedValue({
        success: false,
        error: 'failed',
      } as BodyShapeGenerationResult);

      const form = new FormData();
      const file = new File(['payload'], 'original.png', { type: 'image/png' });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append('targets', JSON.stringify([{ weightKg: 65, label: 'g' }]));

      const res = await app.request(
        '/',
        { method: 'POST', body: form },
        { GEMINI_API_KEY: 'test' }
      );
      const json = await parseJson<{
        success: boolean;
        error?: { code?: string; message?: string };
      }>(res);

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('GEN002');
      expect(json.error?.message).toBe('failed');
    });

    it('ファイル変換に失敗した場合は FILE001 で 422 を返す', async () => {
      // utils の部分モックで fileToBase64 だけ失敗させる
      const mod = await import('@/utils');
      const spy = vi
        .spyOn(mod, 'fileToBase64')
        .mockRejectedValue(new mod.ImageConversionError('Read error'));

      const form = new FormData();
      const file = new File(['payload'], 'original.png', { type: 'image/png' });
      form.append('image', file);
      form.append(
        'subject',
        JSON.stringify({ heightCm: 170, currentWeightKg: 70 })
      );
      form.append('targets', JSON.stringify([{ weightKg: 65, label: 'g' }]));

      const res = await app.request('/', { method: 'POST', body: form });
      const json = await parseJson<{
        success: boolean;
        error?: { code?: string; message?: string };
      }>(res);

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('FILE001');
      expect(json.error?.message).toBe('Read error');

      spy.mockRestore();
    });
  });
});
