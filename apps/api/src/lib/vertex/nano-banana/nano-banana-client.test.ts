import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NanoBananaClient } from './nano-banana-client';
import type { Env } from '@/types';

// ai モジュールのモック
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// @ai-sdk/google-vertex/edge モジュールのモック
vi.mock('@ai-sdk/google-vertex/edge', () => ({
  createVertex: vi.fn(),
}));

describe('NanoBananaClient', () => {
  let client: NanoBananaClient;
  let mockEnv: Env['Bindings'];

  beforeEach(() => {
    vi.clearAllMocks();

    // 環境変数のモック
    mockEnv = {
      GOOGLE_CLIENT_EMAIL: 'test@example.com',
      GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----',
      GOOGLE_PRIVATE_KEY_ID: 'test-key-id',
      GOOGLE_PROJECT_ID: 'test-project-id',
      GOOGLE_LOCATION: 'us-central1',
    };

    // 環境変数を設定
    process.env.GOOGLE_CLIENT_EMAIL = mockEnv.GOOGLE_CLIENT_EMAIL;
    process.env.GOOGLE_PRIVATE_KEY = mockEnv.GOOGLE_PRIVATE_KEY;
    process.env.GOOGLE_PRIVATE_KEY_ID = mockEnv.GOOGLE_PRIVATE_KEY_ID;
    process.env.GOOGLE_PROJECT_ID = mockEnv.GOOGLE_PROJECT_ID;
  });

  afterEach(() => {
    // 環境変数をクリア
    delete process.env.GOOGLE_CLIENT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_PRIVATE_KEY_ID;
    delete process.env.GOOGLE_PROJECT_ID;
  });

  describe('constructor', () => {
    it('環境変数が正しく設定される', () => {
      expect(() => new NanoBananaClient(mockEnv)).not.toThrow();
    });

    it('GOOGLE_CLIENT_EMAILが提供されていない場合エラーをスロー', () => {
      const invalidEnv = { ...mockEnv, GOOGLE_CLIENT_EMAIL: '' };
      expect(() => new NanoBananaClient(invalidEnv)).toThrow(
        'Google Cloud Service Account credentials are required'
      );
    });

    it('GOOGLE_PRIVATE_KEYが提供されていない場合エラーをスロー', () => {
      const invalidEnv = { ...mockEnv, GOOGLE_PRIVATE_KEY: '' };
      expect(() => new NanoBananaClient(invalidEnv)).toThrow(
        'Google Cloud Service Account credentials are required'
      );
    });
  });

  describe('generateImage', () => {
    beforeEach(() => {
      client = new NanoBananaClient(mockEnv);
    });

    it('画像が正常に生成される（テキストプロンプトのみ）', async () => {
      const mockResponse = {
        text: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      };
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      generateText.mockResolvedValueOnce(mockResponse);
      vertex.mockReturnValueOnce({ modelId: 'gemini-2.5-flash-image-preview' });

      const result = await client.generateImage({
        prompt: 'A beautiful sunset over mountains',
      });

      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
      expect(result.error).toBeUndefined();
      expect(generateText).toHaveBeenCalledWith({
        model: expect.any(Object),
        prompt: 'Create an image: A beautiful sunset over mountains',
      });
    });

    it('画像が正常に生成される（画像付きプロンプト）', async () => {
      const mockResponse = {
        text: 'data:image/png;base64,generatedImageData',
      };
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      generateText.mockResolvedValueOnce(mockResponse);
      vertex.mockReturnValueOnce({ modelId: 'gemini-2.5-flash-image-preview' });

      const result = await client.generateImage({
        prompt: 'Transform this image to a painting style',
        inputImage: {
          base64: 'input-base64-image',
          mimeType: 'image/jpeg',
        },
      });

      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('generatedImageData');
      expect(result.error).toBeUndefined();
      expect(generateText).toHaveBeenCalledWith({
        model: expect.any(Object),
        prompt: 'Create an image: Transform this image to a painting style. Based on this image: data:image/jpeg;base64,input-base64-image',
      });
    });

    it('画像編集が正常に動作する', async () => {
      const mockResponse = {
        text: 'data:image/png;base64,editedImageData',
      };
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      generateText.mockResolvedValueOnce(mockResponse);
      vertex.mockReturnValueOnce({ modelId: 'gemini-2.5-flash-image-preview' });

      const result = await client.editImage({
        prompt: 'Add a rainbow to this landscape',
        baseImage: {
          base64: 'original-base64-image',
          mimeType: 'image/png',
        },
      });

      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('editedImageData');
      expect(result.error).toBeUndefined();
      expect(generateText).toHaveBeenCalledWith({
        model: expect.any(Object),
        prompt: 'Edit this image: Add a rainbow to this landscape. Original image: data:image/png;base64,original-base64-image',
      });
    });

    it('画像生成エラーを処理する', async () => {
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      generateText.mockRejectedValue(new Error('API rate limit exceeded'));
      vertex.mockReturnValue({ modelId: 'gemini-2.5-flash-image-preview' });

      const result = await client.generateImage({
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(result.imageBase64).toBeUndefined();
    });

    it('無効なレスポンス形式を処理する', async () => {
      const mockResponse = {
        text: 'Invalid response without data URL',
      };
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      generateText.mockResolvedValueOnce(mockResponse);
      vertex.mockReturnValueOnce({ modelId: 'gemini-2.5-flash-image-preview' });

      const result = await client.generateImage({
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid response format from Nano Banana');
      expect(result.imageBase64).toBeUndefined();
    });

    it('空のレスポンスを処理する', async () => {
      const mockResponse = {
        text: '',
      };
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      generateText.mockResolvedValueOnce(mockResponse);
      vertex.mockReturnValueOnce({ modelId: 'gemini-2.5-flash-image-preview' });

      const result = await client.generateImage({
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No image generated by Nano Banana');
      expect(result.imageBase64).toBeUndefined();
    });

    it('不明なエラーの処理', async () => {
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      generateText.mockRejectedValue('Non-error object');
      vertex.mockReturnValue({ modelId: 'gemini-2.5-flash-image-preview' });

      const result = await client.generateImage({
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('promptが空の場合エラーを返す', async () => {
      const result = await client.generateImage({
        prompt: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Prompt is required');
    });

    it('promptが1000文字を超える場合エラーを返す', async () => {
      const longPrompt = 'a'.repeat(1001);
      const result = await client.generateImage({
        prompt: longPrompt,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Prompt must be less than 1000 characters');
    });

    it('無効なMIMEタイプの場合エラーを返す', async () => {
      const result = await client.generateImage({
        prompt: 'Test prompt',
        inputImage: {
          base64: 'test-base64',
          mimeType: 'image/gif' as any,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid image mime type. Supported: image/jpeg, image/png, image/webp');
    });

    it('再試行ロジックが動作する', async () => {
      const generateText = (await import('ai')).generateText as ReturnType<typeof vi.fn>;
      const vertex = (await import('@ai-sdk/google-vertex/edge')).vertex;

      let callCount = 0;
      generateText.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve({
          text: 'data:image/png;base64,successImageData',
        });
      });

      vertex.mockReturnValue({ modelId: 'gemini-2.5-flash-image-preview' });
      vi.spyOn(client, 'sleep').mockResolvedValue(undefined);

      const result = await client.generateImage({
        prompt: 'Test prompt',
      });

      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('successImageData');
      expect(generateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('editImage', () => {
    beforeEach(() => {
      client = new NanoBananaClient(mockEnv);
    });

    it('baseImageが提供されていない場合エラーを返す', async () => {
      const result = await client.editImage({
        prompt: 'Edit prompt',
        baseImage: undefined as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Base image is required for editing');
    });
  });

  describe('createNanoBananaClient', () => {
    it('ファクトリ関数が正しくクライアントを作成する', async () => {
      const { createNanoBananaClient } = await import('./nano-banana-client');
      const client = createNanoBananaClient(mockEnv);
      expect(client).toBeInstanceOf(NanoBananaClient);
    });
  });
});