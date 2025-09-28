import { GoogleGenAI } from '@google/genai';
import { beforeEach, describe, expect, it, Mock,vi } from 'vitest';

import type { BodyShapeOptions,Subject, TargetWeight } from '@/types';

import { generateBodyShapeImages,generateBodyShapePrompt } from './body-shape-client';

vi.mock('@google/genai');

// 最小限のモック型を定義して any を排除
type MockGoogleGenAI = { models: { generateContent: Mock } };

describe('BodyShapeClient - Body Shape Generation', () => {
  let mockGenAI: MockGoogleGenAI;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenAI = {
      models: {
        generateContent: vi.fn() as Mock,
      },
    };
    const MockedGoogleGenAI = GoogleGenAI as unknown as Mock;
    MockedGoogleGenAI.mockImplementation(() => mockGenAI);
  });

  describe('BMI計算と分類判定', () => {
    it('BMI計算が正確に行われる', () => {
      // calculateBMI関数は非公開なので、generateBodyShapePromptを通じてテストする
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 60 };

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('BMI: 24.2, Normal weight');
      expect(prompt).toContain('Target BMI: 20.8, Normal weight');
    });

    it('BMI分類が正確に判定される', () => {
      const testCases = [
        { heightCm: 170, weightKg: 45, expectedCategory: 'Mild thinness' }, // BMI: 15.6
        { heightCm: 170, weightKg: 55, expectedCategory: 'Normal weight' }, // BMI: 19.0
        { heightCm: 170, weightKg: 80, expectedCategory: 'Overweight' }, // BMI: 27.7
        { heightCm: 170, weightKg: 90, expectedCategory: 'Obesity, Class 1' }, // BMI: 31.1
        { heightCm: 170, weightKg: 120, expectedCategory: 'Obesity, Class 3' }, // BMI: 41.5
      ];

      testCases.forEach(({ heightCm, weightKg, expectedCategory }) => {
        const subject: Subject = { heightCm, currentWeightKg: weightKg };
        const target: TargetWeight = { weightKg: weightKg + 1 }; // 1kg増加で変化を作る

        const prompt = generateBodyShapePrompt(subject, target);

        expect(prompt).toContain(expectedCategory);
      });
    });

    it('BMI境界値での分類が正確に判定される', () => {
      const boundaryTestCases = [
        { heightCm: 170, weightKg: 46.2, expectedCategory: 'Mild thinness' }, // BMI: 16.0 (境界)
        { heightCm: 170, weightKg: 53.4, expectedCategory: 'Normal weight' }, // BMI: 18.5 (境界)
        { heightCm: 170, weightKg: 72.3, expectedCategory: 'Overweight' }, // BMI: 25.0 (境界)
        { heightCm: 170, weightKg: 86.7, expectedCategory: 'Obesity, Class 1' }, // BMI: 30.0 (境界)
      ];

      boundaryTestCases.forEach(({ heightCm, weightKg, expectedCategory }) => {
        const subject: Subject = { heightCm, currentWeightKg: weightKg };
        const target: TargetWeight = { weightKg: weightKg + 1 };

        const prompt = generateBodyShapePrompt(subject, target);

        expect(prompt).toContain(expectedCategory);
      });
    });
  });

  describe('generateBodyShapePrompt', () => {
    it('痩せるターゲット（BMI減少）の場合、適切なプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 60, label: 'slim' };

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('<subject>');
      expect(prompt).toContain('Height: 170 cm, Weight: 70 kg');
      expect(prompt).toContain('BMI: 24.2, Normal weight');
      expect(prompt).toContain('<transformation>');
      expect(prompt).toContain('Target weight: 60 kg');
      expect(prompt).toContain('Target BMI: 20.8, Normal weight');
      expect(prompt).toContain('10 kg lighter');
      expect(prompt).toContain('Fat is reduced');
      expect(prompt).toContain('body becomes slimmer');
      expect(prompt).toContain('<bmi_reference>');
      expect(prompt).toContain('BMI Categories:');
      expect(prompt).toContain('<constraints>');
      expect(prompt).toContain('No changes to any element other than his/her physique will be permitted');
    });

    it('太るターゲット（BMI増加）の場合、適切なプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 85, label: 'heavier' };

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('<subject>');
      expect(prompt).toContain('Height: 170 cm, Weight: 70 kg');
      expect(prompt).toContain('BMI: 24.2, Normal weight');
      expect(prompt).toContain('<transformation>');
      expect(prompt).toContain('Target weight: 85 kg');
      expect(prompt).toContain('Target BMI: 29.4, Overweight');
      expect(prompt).toContain('15 kg heavier');
      expect(prompt).toContain('body becomes fuller');
      expect(prompt).toContain('<bmi_reference>');
      expect(prompt).toContain('<constraints>');
      expect(prompt).toContain('No changes to any element other than his/her physique will be permitted');
    });

    it('現在と同じ体重の場合、エラーをスローする', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 70, label: 'current' };

      expect(() => generateBodyShapePrompt(subject, target)).toThrow('No body shape change needed when target weight equals current weight');
    });

    it('極端なBMI変化の場合でも構造化プロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 40 }; // 極端に軽い

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('<subject>');
      expect(prompt).toContain('BMI: 24.2, Normal weight');
      expect(prompt).toContain('<transformation>');
      expect(prompt).toContain('Target BMI: 13.8, Severe thinness');
      expect(prompt).toContain('30 kg lighter');
      expect(prompt).toContain('Fat is reduced');
      expect(prompt).toContain('body becomes slimmer');
      expect(prompt).toContain('<bmi_reference>');
      expect(prompt).toContain('<constraints>');
      expect(prompt).toContain('No changes to any element other than his/her physique will be permitted');
    });

    it('すべてのプロンプトに構造化されたXMLタグと保持指示が含まれている', () => {
      const subject: Subject = { heightCm: 160, currentWeightKg: 55 };
      const target: TargetWeight = { weightKg: 50 };

      const prompt = generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('<subject>');
      expect(prompt).toContain('<transformation>');
      expect(prompt).toContain('<bmi_reference>');
      expect(prompt).toContain('<constraints>');
      expect(prompt).toContain('No changes to any element other than his/her physique will be permitted');
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
      expect(result.images?.length).toBe(1);
      expect(result.images?.[0]?.label).toBe('slim');
      expect(result.images?.[0]?.base64).toBe('base64-generated-image');
      expect(result.images?.[0]?.mimeType).toBe('image/png');
      expect(result.metadata?.model).toBe('gemini-2.5-flash-image-preview');
    });

    it('GeminiからのmimeTypeを優先して使用する', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64-generated-image',
                    mimeType: 'image/webp',
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
        options: {
          returnMimeType: 'image/png',
        },
      }, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.images?.[0]?.mimeType).toBe('image/webp');
    });

    it('GeminiからmimeTypeがない場合はreturnMimeTypeを使用する', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64-generated-image',
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
        options: {
          returnMimeType: 'image/jpeg',
        },
      }, 'test-api-key');

      expect(result.success).toBe(true);
      expect(result.images?.[0]?.mimeType).toBe('image/jpeg');
    });

    it('GeminiからもreturnMimeTypeもない場合はデフォルトのimage/pngを使用する', async () => {
      mockGenAI.models.generateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: 'base64-generated-image',
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
      expect(result.images?.[0]?.mimeType).toBe('image/png');
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
      expect(result.images?.length).toBe(2);
      expect(result.images?.[0]?.label).toBe('slim');
      expect(result.images?.[1]?.label).toBe('fat');
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
      expect(result.images?.length).toBe(1);
      expect(result.images?.[0]?.label).toBe('slim');
      expect(result.metadata?.partialFailures).toBe(1);
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
      expect(result.metadata).toBeDefined();
      const meta = result.metadata as NonNullable<typeof result.metadata>;
      expect(meta.processingTimeMs).toBeGreaterThan(90);
      expect(meta.model).toBe('gemini-2.5-flash-image-preview');
      expect(meta.confidence).toBeGreaterThan(0);
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