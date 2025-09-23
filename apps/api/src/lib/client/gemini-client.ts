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
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async generateImage(
    options: GeminiImageGenerationOptions
  ): Promise<GeminiImageGenerationResult> {
    const { prompt, imageBase64, mimeType } = options;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
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
        const response = await this.genAI.models.generateContent(requestPayload);

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
        if (attempt < this.maxRetries) {
          if (error instanceof Error && error.message.includes('429')) {
            const delay = this.retryDelay * Math.pow(2, attempt);
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