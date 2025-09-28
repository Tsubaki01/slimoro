import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from 'vitest';

import { createGeminiClient } from '@/lib/client/gemini-client';
import type { ApiResponse as StandardApiResponse } from '@/types/response';
import app from './index.js';

type GenerateImageSuccessData = {
  imageBase64: string;
  mimeType: string;
};

type ApiResponse = StandardApiResponse<GenerateImageSuccessData>;

// モックの設定
vi.mock('@/lib/client/gemini-client', () => ({
  createGeminiClient: vi.fn().mockReturnValue({
    generateImage: vi.fn(),
  }),
}));

describe('Generate Image Endpoint', () => {
  let mockGenerateImage: MockedFunction<
    (
      args: unknown
    ) => Promise<{ success: boolean; imageBase64?: string; error?: string }>
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateImage = vi.fn();
    const mockedCreateGeminiClient =
      createGeminiClient as unknown as MockedFunction<
        typeof createGeminiClient
      >;
    mockedCreateGeminiClient.mockReturnValue({
      generateImage: mockGenerateImage,
    } as unknown as ReturnType<typeof createGeminiClient>);
  });

  describe('POST /', () => {
    it('prompt が未指定なら 400 (VAL001)', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as {
        success: false;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      };
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('VAL001');
      expect(data.error?.details?.fieldErrors?.prompt?.[0]).toContain(
        'Prompt is required'
      );
    });

    it('image が未指定なら 400 (VAL001)', async () => {
      const formData = new FormData();
      formData.append('prompt', 'Test prompt');

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as {
        success: false;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      };
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('VAL001');
      expect(data.error?.details?.fieldErrors?.image?.[0]).toContain(
        'Image file is required'
      );
    });

    it('ファイルサイズ超過なら 400', async () => {
      const formData = new FormData();
      formData.append('prompt', 'Test prompt');

      // 11MB のファイル
      const largeBuffer = new Uint8Array(11 * 1024 * 1024);
      const file = new File([largeBuffer], 'large.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as {
        success: false;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      };
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('VAL001');
      expect(data.error?.details?.fieldErrors?.image).toBeDefined();
    });

    it('サポート外MIMEなら 400', async () => {
      const formData = new FormData();
      formData.append('prompt', 'Test prompt');
      const file = new File(['test'], 'test.gif', { type: 'image/gif' });
      formData.append('image', file);

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as {
        success: false;
        error?: {
          code?: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
      };
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('VAL001');
      expect(data.error?.details?.fieldErrors?.image).toBeDefined();
    });

    it('1000文字ちょうどの prompt は通過する', async () => {
      mockGenerateImage.mockResolvedValue({
        success: true,
        imageBase64: 'generatedImageBase64',
      });

      const formData = new FormData();
      formData.append('prompt', 'a'.repeat(1000));
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request(
        '/',
        {
          method: 'POST',
          body: formData,
        },
        { GEMINI_API_KEY: 'test-api-key' }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(true);
    });

    it('生成成功で 200 と imageBase64/mimeType を返す', async () => {
      mockGenerateImage.mockResolvedValue({
        success: true,
        imageBase64: 'generatedImageBase64',
      });

      const formData = new FormData();
      formData.append('prompt', 'Test prompt');
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request(
        '/',
        {
          method: 'POST',
          body: formData,
        },
        { GEMINI_API_KEY: 'test-api-key' }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(true);
      if (data.success) {
        expect(data.data?.imageBase64).toBe('generatedImageBase64');
        expect(data.data?.mimeType).toBe('image/png');
      }
    });

    it('Gemini API エラーで 500/GEN001', async () => {
      mockGenerateImage.mockResolvedValue({
        success: false,
        error: 'API error occurred',
      });

      const formData = new FormData();
      formData.append('prompt', 'Test prompt');
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request(
        '/',
        {
          method: 'POST',
          body: formData,
        },
        { GEMINI_API_KEY: 'test-api-key' }
      );

      expect(response.status).toBe(500);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      if (!data.success) {
        expect(data.error?.code).toBe('GEN001');
        expect(data.error?.message).toBe('API error occurred');
      }
    });

    it('予期せぬ例外で 500/SYS001', async () => {
      mockGenerateImage.mockRejectedValue(new Error('Unexpected error'));

      const formData = new FormData();
      formData.append('prompt', 'Test prompt');
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request(
        '/',
        {
          method: 'POST',
          body: formData,
        },
        { GEMINI_API_KEY: 'test-api-key' }
      );

      expect(response.status).toBe(500);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      if (!data.success) {
        expect(data.error?.code).toBe('SYS001');
        expect(data.error?.message).toBe('Unexpected error');
      }
    });

    it('MIME タイプごとに mimeType が渡される', async () => {
      mockGenerateImage.mockResolvedValue({
        success: true,
        imageBase64: 'generatedImageBase64',
      });

      const imageTypes = [
        { type: 'image/jpeg', ext: 'jpg' },
        { type: 'image/png', ext: 'png' },
        { type: 'image/webp', ext: 'webp' },
      ];

      for (const imageType of imageTypes) {
        const formData = new FormData();
        formData.append('prompt', 'Test prompt');
        const file = new File(['test'], `test.${imageType.ext}`, {
          type: imageType.type,
        });
        formData.append('image', file);

        const response = await app.request(
          '/',
          {
            method: 'POST',
            body: formData,
          },
          { GEMINI_API_KEY: 'test-api-key' }
        );

        expect(response.status).toBe(200);
        const data = (await response.json()) as ApiResponse;
        expect(data.success).toBe(true);
        expect(mockGenerateImage).toHaveBeenCalledWith(
          expect.objectContaining({
            mimeType: imageType.type,
          })
        );
      }
    });
  });
});
