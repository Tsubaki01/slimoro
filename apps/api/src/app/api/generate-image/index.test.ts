import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import app from './index.js';
import { createGeminiClient } from '@/lib/client/gemini-client';

type ApiResponse = {
  success: boolean;
  message?: string;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
};

// モックの設定
vi.mock('@/lib/client/gemini-client', () => ({
  createGeminiClient: vi.fn().mockReturnValue({
    generateImage: vi.fn(),
  }),
}));

describe('Generate Image Endpoint', () => {
  let mockGenerateImage: MockedFunction<(args: unknown) => Promise<{ success: boolean; imageBase64?: string; error?: string }>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateImage = vi.fn();
    const mockedCreateGeminiClient = createGeminiClient as unknown as MockedFunction<typeof createGeminiClient>;
    mockedCreateGeminiClient.mockReturnValue({
      generateImage: mockGenerateImage,
    } as unknown as ReturnType<typeof createGeminiClient>);
  });

  describe('POST /', () => {
    it('should return 400 if prompt is missing', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.message).toContain('Prompt is required');
    });

    it('should return 400 if image is missing', async () => {
      const formData = new FormData();
      formData.append('prompt', 'Test prompt');

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.message).toContain('Image file is required');
    });

    it('should return 400 if file size exceeds limit', async () => {
      const formData = new FormData();
      formData.append('prompt', 'Test prompt');

      // 11MB のファイルを作成
      const largeBuffer = new Uint8Array(11 * 1024 * 1024);
      const file = new File([largeBuffer], 'large.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.message).toContain('File size must be less than 10MB');
    });

    it('should return 400 if file type is not allowed', async () => {
      const formData = new FormData();
      formData.append('prompt', 'Test prompt');
      const file = new File(['test'], 'test.gif', { type: 'image/gif' });
      formData.append('image', file);

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.message).toContain('File type must be one of: image/jpeg, image/png, image/webp');
    });

    it('should return 400 if prompt is too long', async () => {
      const formData = new FormData();
      formData.append('prompt', 'a'.repeat(1001)); // 1001文字のプロンプト
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request('/', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.message).toContain('Prompt must be less than 1000 characters');
    });

    it('should generate image successfully', async () => {
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
        {
          GEMINI_API_KEY: 'test-api-key',
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(true);
      expect(data.imageBase64).toBe('generatedImageBase64');
      expect(data.mimeType).toBe('image/png');
    });

    it('should handle Gemini API errors', async () => {
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
        {
          GEMINI_API_KEY: 'test-api-key',
        }
      );

      expect(response.status).toBe(500);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('API error occurred');
    });

    it('should handle unexpected errors', async () => {
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
        {
          GEMINI_API_KEY: 'test-api-key',
        }
      );

      expect(response.status).toBe(500);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unexpected error');
    });

    it('should handle different image types', async () => {
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
          {
            GEMINI_API_KEY: 'test-api-key',
          }
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

    it('should validate prompt length at maximum allowed', async () => {
      mockGenerateImage.mockResolvedValue({
        success: true,
        imageBase64: 'generatedImageBase64',
      });

      const formData = new FormData();
      // ちょうど1000文字のプロンプト
      formData.append('prompt', 'a'.repeat(1000));
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request(
        '/',
        {
          method: 'POST',
          body: formData,
        },
        {
          GEMINI_API_KEY: 'test-api-key',
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(true);
    });

    it('should validate file size at maximum allowed', async () => {
      mockGenerateImage.mockResolvedValue({
        success: true,
        imageBase64: 'generatedImageBase64',
      });

      const formData = new FormData();
      formData.append('prompt', 'Test prompt');
      // ちょうど10MBのファイル
      const maxBuffer = new Uint8Array(10 * 1024 * 1024);
      const file = new File([maxBuffer], 'max.png', { type: 'image/png' });
      formData.append('image', file);

      const response = await app.request(
        '/',
        {
          method: 'POST',
          body: formData,
        },
        {
          GEMINI_API_KEY: 'test-api-key',
        }
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(true);
    });
  });
});