import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GoogleGenAI } from '@google/genai';

import { GeminiClient } from './gemini-client';
import type { Subject, TargetWeight, BodyShapeOptions } from '@/types';

vi.mock('@google/genai');

describe('GeminiClient - Body Shape Generation', () => {
  let client: GeminiClient;
  let mockGenAI: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenAI = {
      models: {
        generateContent: vi.fn(),
      },
    };
    (GoogleGenAI as any).mockImplementation(() => mockGenAI);
    client = new GeminiClient('test-api-key');
  });

  describe('generateBodyShapePrompt', () => {
    it('痩せるターゲット（BMI減少）の場合、適切なプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 60, label: 'slim' };
      const options: BodyShapeOptions = { strength: 0.7 };

      const prompt = client.generateBodyShapePrompt(subject, target, options);

      expect(prompt).toContain('significantly');
      expect(prompt).toContain('thinner');
      expect(prompt).toContain('natural');
      expect(prompt).toContain('realistic');
    });

    it('太るターゲット（BMI増加）の場合、適切なプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 85, label: 'heavier' };
      const options: BodyShapeOptions = { strength: 0.6 };

      const prompt = client.generateBodyShapePrompt(subject, target, options);

      expect(prompt).toContain('significantly');
      expect(prompt).toContain('heavier');
      expect(prompt).toContain('natural');
      expect(prompt).toContain('realistic');
    });

    it('現在と同じ体重の場合、最小限の変更プロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 70, label: 'current' };
      const options: BodyShapeOptions = { strength: 0.3 };

      const prompt = client.generateBodyShapePrompt(subject, target, options);

      expect(prompt).toContain('minimal');
      expect(prompt).toContain('natural');
      expect(prompt).toContain('realistic');
    });

    it('強度オプションが反映されたプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 55, label: 'very-slim' };
      const options: BodyShapeOptions = { strength: 1.0 };

      const prompt = client.generateBodyShapePrompt(subject, target, options);

      expect(prompt).toContain('dramatically');
      expect(prompt).toContain('natural');
    });

    it('背景保持オプションが反映されたプロンプトを生成する', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 60 };
      const options: BodyShapeOptions = { preserveBackground: true };

      const prompt = client.generateBodyShapePrompt(subject, target, options);

      expect(prompt).toContain('background completely unchanged');
      expect(prompt).toContain('preserve');
    });

    it('極端なBMI変化の場合、安全制限が適用される', () => {
      const subject: Subject = { heightCm: 170, currentWeightKg: 70 };
      const target: TargetWeight = { weightKg: 40 }; // 極端に軽い

      const prompt = client.generateBodyShapePrompt(subject, target);

      expect(prompt).toContain('dramatically');
      expect(prompt).toContain('natural');
      expect(prompt).toContain('in a healthy and realistic way');
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

      const result = await client.generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      });

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

      const result = await client.generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      });

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

      const result = await client.generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      });

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

      const result = await client.generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      });

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
        strength: 0.8,
        returnMimeType: 'image/jpeg',
        preserveBackground: true,
        seed: 12345,
      };

      await client.generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options,
      });

      const callArgs = mockGenAI.models.generateContent.mock.calls[0][0];
      const prompt = callArgs.contents[0].text;

      expect(prompt).toContain('preserve');
      expect(prompt).toContain('background');
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

      const result = await client.generateBodyShapeImages({
        imageBase64: 'input-base64',
        mimeType: 'image/jpeg',
        subject,
        targets,
        options: {},
      });

      expect(result.success).toBe(true);
      expect(result.metadata!.processingTimeMs).toBeGreaterThan(90);
      expect(result.metadata!.model).toBe('gemini-2.5-flash-image-preview');
      expect(result.metadata!.confidence).toBeGreaterThan(0);
    });
  });

  describe('BMI計算', () => {
    it('正しいBMIを計算する', () => {
      const bmi1 = client.calculateBMI(170, 70); // 170cm, 70kg
      expect(bmi1).toBeCloseTo(24.22, 2);

      const bmi2 = client.calculateBMI(160, 50); // 160cm, 50kg
      expect(bmi2).toBeCloseTo(19.53, 2);
    });

    it('BMI変化の強度を正しく計算する', () => {
      const intensity1 = client.calculateIntensity(24.22, 20.76); // 70kg -> 60kg at 170cm
      expect(intensity1).toBeCloseTo(0.346, 2);

      const intensity2 = client.calculateIntensity(24.22, 29.41); // 70kg -> 85kg at 170cm
      expect(intensity2).toBeCloseTo(0.519, 2);

      const intensity3 = client.calculateIntensity(24.22, 24.22); // same weight
      expect(intensity3).toBe(0);
    });
  });
});