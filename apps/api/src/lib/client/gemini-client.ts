import { GoogleGenAI } from '@google/genai';
import { Env } from '@/types';

export interface GeminiImageGenerationOptions {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

export interface GeminiImageGenerationResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

export class GeminiClient {
  private genAI: GoogleGenAI;
  private maxRetries = 2;
  private retryDelay = 1000;

  constructor(apiKey: string) {
    console.log('[GeminiClient] APIキーの状態:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 8) || 'N/A'
    });
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async generateImage(
    options: GeminiImageGenerationOptions
  ): Promise<GeminiImageGenerationResult> {
    const { prompt, imageBase64, mimeType } = options;
    console.log('[GeminiClient] 画像生成開始:', {
      promptLength: prompt.length,
      imageSize: imageBase64.length,
      mimeType
    });

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      console.log(`[GeminiClient] 試行 ${attempt + 1}/${this.maxRetries + 1}`);
      try {
        const requestPayload = {
          model: 'gemini-2.5-flash-image-preview',
          contents: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        };
        console.log('[GeminiClient] APIリクエスト送信中...');
        const response = await this.genAI.models.generateContent(requestPayload);
        console.log('[GeminiClient] APIレスポンス受信:', {
          candidatesCount: response.candidates?.length || 0
        });

        const candidates = response.candidates;

        if (!candidates?.length) {
          throw new Error('No candidates returned from Gemini API');
        }

        const parts = candidates[0]?.content?.parts ?? [];

        for (const part of parts) {
          if (part.inlineData) {
            return {
              success: true,
              imageBase64: part.inlineData.data,
            };
          }
        }

        throw new Error('No image generated in response');
      } catch (error) {
        console.error(`[GeminiClient] 試行 ${attempt + 1} 失敗:`, error);
        if (attempt < this.maxRetries) {
          if (error instanceof Error && error.message.includes('429')) {
            const delay = this.retryDelay * Math.pow(2, attempt);
            console.log(`[GeminiClient] レート制限で${delay}ms待機...`);
            await this.sleep(delay);
            continue;
          }
        }

        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred during image generation',
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createGeminiClient(env: Env['Bindings']): GeminiClient {
  return new GeminiClient(env.GEMINI_API_KEY);
}