import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGeminiClient, GeminiClient } from './gemini-client';

// @google/genai をモック（グローバルに generateContent を保持して参照可能にする）
vi.mock('@google/genai', () => {
  const generateContentMock = vi.fn();
  // グローバルへ参照を公開
  (
    globalThis as unknown as {
      __genai_generateContent: ReturnType<typeof vi.fn>;
    }
  ).__genai_generateContent = generateContentMock;

  const GoogleGenAI = vi.fn().mockImplementation(() => ({
    models: {
      generateContent: generateContentMock,
    },
  }));

  return { GoogleGenAI };
});

function getGenerateContentMock(): ReturnType<typeof vi.fn> {
  return (
    globalThis as unknown as {
      __genai_generateContent: ReturnType<typeof vi.fn>;
    }
  ).__genai_generateContent;
}

describe('GeminiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('API キー未指定でエラーを投げる', () => {
    expect(() => new GeminiClient('')).toThrow('Gemini API key is required');
  });

  it('成功レスポンスから最初の inline 画像を抽出して返す（mimeType含む）', async () => {
    const client = new GeminiClient('key');
    const gen = getGenerateContentMock();
    gen.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: 'base64data', mimeType: 'image/png' } },
            ],
          },
        },
      ],
    });

    const result = await client.generateImage({
      prompt: 'p',
      imageBase64: 'i',
      mimeType: 'image/png',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.imageBase64).toBe('base64data');
      expect(result.mimeType).toBe('image/png');
    }
  });

  it('無効引数の場合は success:false を返す', async () => {
    const client = new GeminiClient('key');
    const result = await client.generateImage({
      prompt: '',
      imageBase64: '',
      mimeType: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Invalid arguments/);
    }
  });

  it('候補に画像が無い場合は最終的に失敗を返す', async () => {
    const client = new GeminiClient('key', { maxRetries: 0 });
    const gen = getGenerateContentMock();
    gen.mockResolvedValue({ candidates: [{ content: { parts: [] } }] });

    const result = await client.generateImage({
      prompt: 'p',
      imageBase64: 'i',
      mimeType: 'image/png',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('リトライ可能エラー時に再試行する', async () => {
    const client = new GeminiClient('key', {
      maxRetries: 1,
      baseRetryDelayMs: 0,
    });
    const gen = getGenerateContentMock();
    gen
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { data: 'd', mimeType: 'image/jpeg' } }],
            },
          },
        ],
      });

    const result = await client.generateImage({
      prompt: 'p',
      imageBase64: 'i',
      mimeType: 'image/jpeg',
    });

    expect(gen).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it('generationConfig を渡した場合にリクエストへ含める', async () => {
    const client = new GeminiClient('key');
    const gen = getGenerateContentMock();
    gen.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'x' } }] } }],
    });

    const result = await client.generateImage({
      prompt: 'p',
      imageBase64: 'i',
      mimeType: 'image/png',
      generationConfig: { seed: 42 },
    });

    expect(result.success).toBe(true);
    const callArg = gen.mock.calls[0][0];
    expect(callArg).toEqual(
      expect.objectContaining({
        generationConfig: expect.objectContaining({ seed: 42 }),
      })
    );
  });

  it('createGeminiClient は env からキーを読み取る', () => {
    const client = createGeminiClient({
      GEMINI_API_KEY: 'env-key',
    } as unknown as { GEMINI_API_KEY: string });
    expect(client).toBeInstanceOf(GeminiClient);
  });
});
