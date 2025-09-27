import { beforeEach,describe, expect, it, vi } from 'vitest';

import { GeminiClient } from './gemini-client';

// @google/genai のモック
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn(),
    },
  })),
}));

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(() => new GeminiClient('')).toThrow('Gemini API key is required');
    });

    it('should create client with valid API key', () => {
      expect(() => new GeminiClient('test-api-key')).not.toThrow();
    });
  });

  describe('generateImage', () => {
    beforeEach(() => {
      client = new GeminiClient('test-api-key');
    });

    it('should generate image successfully', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64ImageData',
                  },
                },
              ],
            },
          },
        ],
      });

       
      const GoogleGenAI = (await import('@google/genai')).GoogleGenAI as any;
      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      client = new GeminiClient('test-api-key');

      const result = await client.generateImage({
        prompt: 'Test prompt',
        imageBase64: 'inputImageBase64',
        mimeType: 'image/png',
      });

      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('base64ImageData');
      expect(result.error).toBeUndefined();
    });

    it('should handle no candidates error', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        candidates: [],
      });

       
      const GoogleGenAI = (await import('@google/genai')).GoogleGenAI as any;
      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      client = new GeminiClient('test-api-key');

      const result = await client.generateImage({
        prompt: 'Test prompt',
        imageBase64: 'inputImageBase64',
        mimeType: 'image/png',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No image generated in response');
    });

    it('should handle no image in response', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Some text response',
                },
              ],
            },
          },
        ],
      });

       
      const GoogleGenAI = (await import('@google/genai')).GoogleGenAI as any;
      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      client = new GeminiClient('test-api-key');

      const result = await client.generateImage({
        prompt: 'Test prompt',
        imageBase64: 'inputImageBase64',
        mimeType: 'image/png',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No image generated in response');
    });

    it('should retry on 429 error', async () => {
      let callCount = 0;
      const mockGenerateContent = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('429 Rate limit exceeded');
        }
        return Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64ImageData',
                    },
                  },
                ],
              },
            },
          ],
        });
      });

       
      const GoogleGenAI = (await import('@google/genai')).GoogleGenAI as any;
      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      client = new GeminiClient('test-api-key');
       
      vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

      const result = await client.generateImage({
        prompt: 'Test prompt',
        imageBase64: 'inputImageBase64',
        mimeType: 'image/png',
      });

      expect(result.success).toBe(true);
      expect(result.imageBase64).toBe('base64ImageData');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should return error after max retries exceeded', async () => {
      const mockGenerateContent = vi
        .fn()
        .mockRejectedValue(new Error('429 Rate limit exceeded'));

       
      const GoogleGenAI = (await import('@google/genai')).GoogleGenAI as any;
      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      client = new GeminiClient('test-api-key');
       
      vi.spyOn(client as any, 'sleep').mockResolvedValue(undefined);

      const result = await client.generateImage({
        prompt: 'Test prompt',
        imageBase64: 'inputImageBase64',
        mimeType: 'image/png',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('429 Rate limit exceeded');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3); // 初回 + 2リトライ
    });

    it('should handle unknown errors', async () => {
      const mockGenerateContent = vi
        .fn()
        .mockRejectedValue('Non-error object');

       
      const GoogleGenAI = (await import('@google/genai')).GoogleGenAI as any;
      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      client = new GeminiClient('test-api-key');

      const result = await client.generateImage({
        prompt: 'Test prompt',
        imageBase64: 'inputImageBase64',
        mimeType: 'image/png',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('"Non-error object"');
    });
  });
});