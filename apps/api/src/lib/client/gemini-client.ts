import { GoogleGenAI } from '@google/genai';

import { Env } from '@/types';
import type { Subject, TargetWeight, BodyShapeOptions, GeneratedImage } from '@/types';

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

export interface BodyShapeGenerationOptions {
  imageBase64: string;
  mimeType: string;
  subject: Subject;
  targets: TargetWeight[];
  options: BodyShapeOptions;
}

export interface BodyShapeGenerationResult {
  success: boolean;
  images?: GeneratedImage[];
  metadata?: {
    processingTimeMs: number;
    confidence: number;
    model: string;
    partialFailures?: number;
  };
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

  generateBodyShapePrompt(
    subject: Subject,
    target: TargetWeight,
    options?: BodyShapeOptions
  ): string {
    const currentBMI = this.calculateBMI(subject.heightCm, subject.currentWeightKg);
    const targetBMI = this.calculateBMI(subject.heightCm, target.weightKg);
    const bmiDiff = targetBMI - currentBMI;
    const intensity = this.calculateIntensity(currentBMI, targetBMI);
    const strength = options?.strength ?? 0.7;

    let transformationType: string;
    let transformationDescriptor: string;
    let safetyModifier = '';

    if (Math.abs(bmiDiff) < 0.5) {
      transformationType = 'maintain';
      transformationDescriptor = 'current body shape with minimal adjustments';
    } else if (bmiDiff < 0) {
      transformationType = 'slimmer';
      if (intensity > 0.8) {
        transformationDescriptor = 'dramatically thinner and more toned';
        safetyModifier = ' in a healthy and realistic way';
      } else if (intensity > 0.5) {
        transformationDescriptor = 'noticeably slimmer with visible weight loss';
      } else {
        transformationDescriptor = 'slightly thinner with subtle weight loss';
      }
    } else {
      transformationType = 'heavier';
      if (intensity > 0.8) {
        transformationDescriptor = 'significantly fuller and heavier';
        safetyModifier = ' in a natural and healthy way';
      } else if (intensity > 0.5) {
        transformationDescriptor = 'noticeably heavier with visible weight gain';
      } else {
        transformationDescriptor = 'slightly fuller with moderate weight gain';
      }
    }

    const strengthModifier = strength > 0.8 ? 'dramatically' : strength > 0.5 ? 'significantly' : 'moderately';
    const backgroundInstruction = options?.preserveBackground
      ? 'Keep the background completely unchanged and preserve all environmental details.'
      : 'Maintain the overall scene composition while focusing on the body transformation.';

    return `Transform this person's body to appear ${strengthModifier} ${transformationDescriptor}${safetyModifier}.
The transformation should look natural, realistic, and proportional to their body frame.
Maintain facial features, clothing, and pose exactly as shown.
${backgroundInstruction}
Ensure the result appears as a natural photograph with consistent lighting and shadows.`;
  }

  calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  calculateIntensity(currentBMI: number, targetBMI: number): number {
    const diff = Math.abs(targetBMI - currentBMI);
    return Math.min(diff / 10, 1.0);
  }

  async generateBodyShapeImages(
    options: BodyShapeGenerationOptions
  ): Promise<BodyShapeGenerationResult> {
    const { imageBase64, mimeType, subject, targets, options: bodyOptions } = options;
    const startTime = Date.now();
    const results: GeneratedImage[] = [];
    let failedCount = 0;

    const generatePromises = targets.map(async (target) => {
      try {
        const prompt = this.generateBodyShapePrompt(subject, target, bodyOptions);

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
          generationConfig: bodyOptions?.seed ? { seed: bodyOptions.seed } : undefined,
        };

        const response = await this.genAI.models.generateContent(requestPayload);
        const candidates = response.candidates;

        if (!candidates?.length) {
          throw new Error('No candidates returned from Gemini API');
        }

        const parts = candidates[0]?.content?.parts ?? [];

        for (const part of parts) {
          if (part.inlineData) {
            const outputMimeType = bodyOptions?.returnMimeType || 'image/png';
            return {
              label: target.label,
              base64: part.inlineData.data,
              mimeType: outputMimeType,
              width: 1024, // Default size, could be extracted from actual image
              height: 1024,
            };
          }
        }

        throw new Error('No image generated in response');
      } catch (error) {
        failedCount++;
        return null;
      }
    });

    const generatedImages = await Promise.all(generatePromises);
    const successfulImages = generatedImages.filter((img): img is GeneratedImage => img !== null);

    if (successfulImages.length === 0) {
      return {
        success: false,
        error: 'All image generations failed',
      };
    }

    const processingTime = Date.now() - startTime;
    const confidence = Math.max(0.8, 1.0 - (failedCount / targets.length) * 0.2);

    return {
      success: true,
      images: successfulImages,
      metadata: {
        processingTimeMs: processingTime,
        confidence,
        model: 'gemini-2.5-flash-image-preview',
        ...(failedCount > 0 && { partialFailures: failedCount }),
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createGeminiClient(env: Env['Bindings']): GeminiClient {
  return new GeminiClient(env.GEMINI_API_KEY);
}