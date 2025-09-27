import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GoogleGenAI } from '@google/genai';

import { generateBodyShapePrompt, generateBodyShapeImages } from './body-shape-client';
import { GeminiClient } from './gemini-client';
import type { Subject, TargetWeight, BodyShapeOptions } from '@/types';

vi.mock('@google/genai');

describe('BodyShapeClient - Body Shape Generation', () => {
  let mockGenAI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenAI = {
      models: {
        generateContent: vi.fn(),
      },
    };
    (GoogleGenAI as any).mockImplementation(() => mockGenAI);
  });

  describe('generateBodyShapePrompt', () => {
    it('痩せるターゲット（BMI減少）の場合、適切なプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 60, label: 'slim' };

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('170 cm tall and weighs 70 kg');
      expect(prompt).toContain('10 kg lighter');
      expect(prompt).toContain('Fat is reduced');
      expect(prompt).toContain('body becomes slimmer');
      expect(prompt).toContain('Keep the background, composition, clothing');
      expect(prompt).toContain('Only change the body shape as specified');
    });

    it('太るターゲット（BMI増加）の場合、適切なプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 85, label: 'heavier' };

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('170 cm tall and weighs 70 kg');
      expect(prompt).toContain('15 kg heavier');
      expect(prompt).toContain('body becomes fuller');
      expect(prompt).toContain('Keep the background, composition, clothing');
    });

    it('現在と同じ体重の場合、エラーをスローする', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 70, label: 'current' };

      expect(() => generateBodyShapePrompt(subject, target)).toThrow('No body shape change needed when target weight equals current weight');
    });

    it('極端なBMI変化の場合でもシンプルなプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 40 }; // 極端に軽い

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('30 kg lighter');
      expect(prompt).toContain('Fat is reduced');
      expect(prompt).toContain('body becomes slimmer');
      expect(prompt).toContain('Keep the background, composition, clothing');
    });

    it('すべてのプロンプトに保持指示が含まれている', () => {
      const subject: Subject = { heightCm: 160, currentWeightKg: 55 };
      const target: TargetWeight = { weightKg: 50 };

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('Keep the background, composition, clothing, pose, facial features, and all other elements exactly the same');
      expect(prompt).toContain('Only change the body shape as specified');
    });
  });

  describe('generateBodyShapeImages', () => {
    it('単一ターゲットで画像生成に成功する', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64-generated-image',
                    mimeType: 'image/png',
                  },
                },
              ],
            },
          },
        ],
      });

      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [{ weightKg: 60, label: 'slim' }];

      const result = await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      }, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.images).toHaveLength(1);
      expect(result.images![0].label).toBe('slim');
      expect(result.images![0].base64).toBe('base64-generated-image');
      expect(result.images![0].mimeType).toBe('image/png');
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.model).toBe('gemini-2.5-flash-image-preview');
    });

    it('複数ターゲットで並列画像生成に成功する', async () => {
      mockGenAI.models.generateContent
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64-slim-image',
                      mimeType: 'image/png',
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64-fat-image',
                      mimeType: 'image/png',
                    },
                  },
                ],
              },
            },
          ],
        });

      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [
        { weightKg: 60, label: 'slim' },
        { weightKg: 85, label: 'fat' },
      ];

      const result = await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      }, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.images).toHaveLength(2);
      expect(result.images![0].label).toBe('slim');
      expect(result.images![1].label).toBe('fat');
      expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(2);
    });

    it('一部の画像生成が失敗した場合、成功した画像のみ返す', async () => {
      mockGenAI.models.generateContent
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64-slim-image',
                      mimeType: 'image/png',
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [
        { weightKg: 60, label: 'slim' },
        { weightKg: 85, label: 'fat' },
      ];

      const result = await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      }, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.images).toHaveLength(1);
      expect(result.images![0].label).toBe('slim');
      expect(result.metadata!.partialFailures).toBe(1);
    });

    it('全ての画像生成が失敗した場合、エラーを返す', async () => {
      mockGenAI.models.generateContent
        .mockRejectedValueOnce(new Error('API error 1'))
        .mockRejectedValueOnce(new Error('API error 2'));

      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [
        { weightKg: 60, label: 'slim' },
        { weightKg: 85, label: 'fat' },
      ];

      const result = await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      }, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('All image generations failed');
    });

    it('カスタムオプションが正しく適用される', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64-image',
                    mimeType: 'image/jpeg',
                  },
                },
              ],
            },
          },
        ],
      });

      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [{ weightKg: 60, label: 'slim' }];
      const options: BodyShapeOptions = {
        returnMimeType: 'image/jpeg',
        seed: 12345,
      };

      await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options,
      }, 'test-api-key');

      const callArgs = mockGenAI.models.generateContent.mock.calls[0][0];
      expect(callArgs.generationConfig?.seed).toBe(12345);
    });

    it('処理時間とメタデータが正しく記録される', async () => {
      mockGenAI.models.generateContent.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        inlineData: {
                          data: 'base64-image',
                          mimeType: 'image/png',
                        },
                      },
                    ],
                  },
                },
              ],
            });
          }, 100);
        })
      );

      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [{ weightKg: 60, label: 'slim' }];

      const result = await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      }, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.metadata!.processingTimeMs).toBeGreaterThan(90);
      expect(result.metadata!.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.metadata!.confidence).toBeGreaterThan(0);
    });

    it('体重変化なしの場合、エラーを返す', async () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [{ weightKg: 70, label: 'current' }];

      const result = await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      }, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Body shape generation is not needed when target weight equals current weight');
    });

    it('体重変化ありと体重変化なしが混在している場合、エラーを返す', async () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const targets: TargetWeight[] = [
        { weightKg: 60, label: 'slim' },
        { weightKg: 70, label: 'current' },
      ];

      const result = await generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      }, 'test-api-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Body shape generation is not needed when target weight equals current weight');
    });
  });

});