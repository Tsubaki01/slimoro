import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, Mock,vi } from 'vitest';

import { createBodyShapeClient } from '@/lib';

import app from './index';

vi.mock('@/lib', () => ({
  createBodyShapeClient: vi.fn(),
}));

vi.mock('@/utils', async () => {
  const actual = await vi.importActual('@/utils');
  return {
    ...actual,
    fileToBase64: vi.fn(),
  };
});

describe('POST /api/generate-image/body-shape', () => {
  const mockBodyShapeClient = {
    generateBodyShapeImages: vi.fn(),
    generateBodyShapePrompt: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    (createBodyShapeClient as Mock).mockReturnValue(mockBodyShapeClient);

    // fileToBase64のモックを成功で初期化
    const { fileToBase64 } = await import('@/utils');
    (fileToBase64 as Mock).mockResolvedValue('mocked-base64-data');
  });

  describe('バリデーションテスト', () => {
    it('画像ファイルが未指定の場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Image file is required');
    });

    it('subjectが未指定の場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Subject is required');
    });

    it('targetsが未指定の場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Targets is required');
    });

    it('画像ファイルサイズが10MBを超える場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const largeImageBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'image/jpeg' });
      const file = new File([largeImageBlob], 'large.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('File size must be less than 10MB');
    });

    it('許可されていない画像形式の場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const gifBlob = new Blob(['test gif'], { type: 'image/gif' });
      const file = new File([gifBlob], 'test.gif', { type: 'image/gif' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('File type must be one of: image/jpeg, image/png, image/webp');
    });

    it('身長が範囲外（119cm）の場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 119, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Subject must be valid JSON');
    });

    it('体重が範囲外（19kg）の場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 19 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Subject must be valid JSON');
    });

    it('targetsの配列長が3以上の場合、400エラーを返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([
        { weightKg: 60, label: 'slim' },
        { weightKg: 80, label: 'normal' },
        { weightKg: 90, label: 'fat' }
      ]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('Targets array must have 1 to 2 elements');
    });
  });

  describe('成功テスト', () => {
    it('正常なリクエストで複数画像生成に成功する', async () => {
      (mockBodyShapeClient.generateBodyShapeImages as Mock).mockResolvedValue({
        success: true,
        images: [
          {
            label: 'slim',
            base64: 'base64-slim-image',
            mimeType: 'image/png',
            width: 1024,
            height: 1024,
          },
          {
            label: 'fat',
            base64: 'base64-fat-image',
            mimeType: 'image/png',
            width: 1024,
            height: 1024,
          }
        ],
        metadata: {
          processingTimeMs: 4210,
          confidence: 0.94,
          model: 'gemini-image-edit',
        },
      });

      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([
        { weightKg: 60, label: 'slim' },
        { weightKg: 85, label: 'fat' }
      ]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.images).toHaveLength(2);
      expect(json.images[0].label).toBe('slim');
      expect(json.images[1].label).toBe('fat');
      expect(json.metadata).toBeDefined();
      expect(json.metadata.model).toBe('gemini-image-edit');
    });

    it('単一ターゲットでの画像生成に成功する', async () => {
      (mockBodyShapeClient.generateBodyShapeImages as Mock).mockResolvedValue({
        success: true,
        images: [
          {
            label: 'slim',
            base64: 'base64-slim-image',
            mimeType: 'image/png',
            width: 1024,
            height: 1024,
          }
        ],
        metadata: {
          processingTimeMs: 3150,
          confidence: 0.92,
          model: 'gemini-image-edit',
        },
      });

      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.images).toHaveLength(1);
      expect(json.images[0].label).toBe('slim');
    });

    it('体重変化なしの場合、元の画像をそのまま返す', async () => {
      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 70, label: 'current' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.images).toHaveLength(1);
      expect(json.images[0].label).toBe('current');
      expect(json.images[0].base64).toBe('mocked-base64-data');
      expect(json.metadata.model).toBe('original-image');
      expect(json.metadata.note).toContain('No body shape change needed');
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('Gemini APIエラーの場合、500エラーを返す', async () => {
      (mockBodyShapeClient.generateBodyShapeImages as Mock).mockResolvedValue({
        success: false,
        error: 'Gemini API rate limit exceeded',
      });

      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('GENERATION_ERROR');
      expect(json.message).toContain('Gemini API rate limit exceeded');
    });

    it('ファイル変換エラーの場合、500エラーを返す', async () => {
      const { fileToBase64 } = await import('@/utils');
      const { ImageConversionError } = await vi.importActual('@/utils');
      (fileToBase64 as Mock).mockRejectedValue(new (ImageConversionError as any)('Failed to convert image'));

      const client = testClient(app, {
        GEMINI_API_KEY: 'test-key',
      });

      const formData = new FormData();
      const imageBlob = new Blob(['test image'], { type: 'image/jpeg' });
      const file = new File([imageBlob], 'test.jpg', { type: 'image/jpeg' });
      formData.append('image', file);
      formData.append('subject', JSON.stringify({ heightCm: 170, currentWeightKg: 70 }));
      formData.append('targets', JSON.stringify([{ weightKg: 60, label: 'slim' }]));

      const res = await client.index.$post({
        form: Object.fromEntries(formData.entries()),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('FILE_CONVERSION_ERROR');
      expect(json.message).toContain('Failed to convert image');
    });
  });
});