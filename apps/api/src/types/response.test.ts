import { describe, expect, it } from 'vitest';
import type {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  ValidationErrorResponse,
} from './response';
import type { ErrorCode } from '../constants/errors';
import { API_ERRORS } from '../constants/errors';

describe('APIレスポンス型定義', () => {
  describe('SuccessResponse型', () => {
    it('成功レスポンスの基本構造を検証', () => {
      const response: SuccessResponse<{ id: number; name: string }> = {
        success: true,
        data: {
          id: 1,
          name: 'test',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1, name: 'test' });
    });

    it('メタデータ付き成功レスポンスを検証', () => {
      const response: SuccessResponse<{ result: string }> = {
        success: true,
        data: {
          result: 'processed',
        },
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          processingTimeMs: 150,
          version: '1.0.0',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data?.result).toBe('processed');
      expect(response.metadata?.processingTimeMs).toBe(150);
    });

    it('データなし成功レスポンスを許可', () => {
      const response: SuccessResponse = {
        success: true,
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
    });
  });

  describe('ErrorResponse型', () => {
    it('エラーレスポンスの基本構造を検証', () => {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'SYS001',
          message: 'Internal server error',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('SYS001');
      expect(response.error.message).toBe('Internal server error');
    });

    it('詳細付きエラーレスポンスを検証', () => {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'SYS002',
          message: 'Database connection error',
          details: {
            host: 'localhost',
            port: 5432,
            retries: 3,
          },
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.details).toEqual({
        host: 'localhost',
        port: 5432,
        retries: 3,
      });
    });

    it('メタデータ付きエラーレスポンスを検証', () => {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'GEN004',
          message: 'AI service rate limit exceeded',
        },
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'req_123',
        },
      };

      expect(response.success).toBe(false);
      expect(response.metadata?.requestId).toBe('req_123');
    });
  });

  describe('ValidationErrorResponse型', () => {
    it('バリデーションエラーの基本構造を検証', () => {
      const response: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VAL001',
          message: 'Prompt is required',
          details: {
            fieldErrors: {
              prompt: ['Prompt is required'],
            },
          },
        },
      };

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VAL001');
      expect(response.error.details?.fieldErrors?.prompt).toContain('Prompt is required');
    });

    it('複数フィールドのバリデーションエラーを検証', () => {
      const response: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VAL006',
          message: 'Height must be between 120 and 220 cm',
          details: {
            fieldErrors: {
              height: ['Height must be between 120 and 220 cm'],
              weight: ['Weight must be between 20 and 300 kg'],
              image: ['File size must be less than 10MB', 'File type must be one of: image/jpeg, image/png, image/webp'],
            },
            summary: '3 fields failed validation',
          },
        },
      };

      expect(response.error.details?.fieldErrors).toBeDefined();
      expect(Object.keys(response.error.details?.fieldErrors || {})).toHaveLength(3);
      expect(response.error.details?.summary).toBe('3 fields failed validation');
    });
  });

  describe('ApiResponse統合型', () => {
    it('成功レスポンスとして使用可能', () => {
      const response: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
      };

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data).toEqual({ id: 1 });
      }
    });

    it('エラーレスポンスとして使用可能', () => {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'FILE002',
          message: 'ファイルの読み込みに失敗しました',
        },
      };

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('FILE002');
      }
    });

    it('型ガードによる分岐を検証', () => {
      const responses: ApiResponse<{ value: number }>[] = [
        { success: true, data: { value: 42 } },
        { success: false, error: { code: 'GEN001', message: 'Failed to generate image' } },
      ];

      responses.forEach(response => {
        if (response.success) {
          // TypeScript型推論: response.dataが存在
          expect(response.data).toBeDefined();
          expect(response.error).toBeUndefined();
        } else {
          // TypeScript型推論: response.errorが存在
          expect(response.error).toBeDefined();
          expect(response.data).toBeUndefined();
        }
      });
    });
  });

  describe('ErrorCode型', () => {
    it('標準エラーコードを定義', () => {
      // constants/errors.tsで定義されたエラーコードを使用
      const errorCodes: ErrorCode[] = [
        'VAL001',
        'VAL002',
        'VAL006',
        'VAL007',
        'FILE001',
        'FILE002',
        'GEN001',
        'GEN002',
        'AUTH001',
        'SYS001',
      ];

      errorCodes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });

    it('定義済みエラーコードを使用', () => {
      const error: ErrorResponse = {
        success: false,
        error: {
          code: 'VAL005' as ErrorCode,
          message: API_ERRORS.VAL005.message,
        },
      };

      expect(error.error.code).toBe('VAL005');
      expect(error.error.message).toBe('Prompt must be less than 1000 characters');
    });
  });

  describe('レスポンス生成パターン', () => {
    it('ページネーション付きレスポンス', () => {
      interface PaginatedData<T> {
        items: T[];
        pagination: {
          page: number;
          pageSize: number;
          totalItems: number;
          totalPages: number;
        };
      }

      const response: SuccessResponse<PaginatedData<{ id: number; name: string }>> = {
        success: true,
        data: {
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: 2,
            totalPages: 1,
          },
        },
      };

      expect(response.data?.items).toHaveLength(2);
      expect(response.data?.pagination.totalItems).toBe(2);
    });

    it('部分的成功レスポンス', () => {
      const response: SuccessResponse<{
        processed: number;
        failed: number;
        errors: Array<{ index: number; reason: string }>;
      }> = {
        success: true,
        data: {
          processed: 8,
          failed: 2,
          errors: [
            { index: 3, reason: 'Invalid format' },
            { index: 7, reason: 'Size limit exceeded' },
          ],
        },
        metadata: {
          partialSuccess: true,
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data?.failed).toBe(2);
      expect(response.metadata?.partialSuccess).toBe(true);
    });

    it('非同期処理レスポンス', () => {
      const response: SuccessResponse<{
        jobId: string;
        status: 'pending' | 'processing' | 'completed';
        progress?: number;
      }> = {
        success: true,
        data: {
          jobId: 'job_abc123',
          status: 'processing',
          progress: 45,
        },
        metadata: {
          estimatedCompletionTime: '2024-01-01T00:05:00Z',
          pollInterval: 1000,
        },
      };

      expect(response.data?.status).toBe('processing');
      expect(response.data?.progress).toBe(45);
      expect(response.metadata?.pollInterval).toBe(1000);
    });
  });

  describe('エッジケース', () => {
    it('空配列データの成功レスポンス', () => {
      const response: SuccessResponse<{ items: string[] }> = {
        success: true,
        data: {
          items: [],
        },
      };

      expect(response.data?.items).toEqual([]);
      expect(response.data?.items).toHaveLength(0);
    });

    it('null値を含むレスポンス', () => {
      const response: SuccessResponse<{
        id: number;
        optionalField: string | null;
      }> = {
        success: true,
        data: {
          id: 1,
          optionalField: null,
        },
      };

      expect(response.data?.optionalField).toBeNull();
    });

    it('深くネストしたエラー詳細', () => {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'SYS003',
          message: 'External service error',
          details: {
            level1: {
              level2: {
                level3: {
                  actualError: 'Deep error message',
                  context: { key: 'value' },
                },
              },
            },
          },
        },
      };

      expect(response.error.details?.level1?.level2?.level3?.actualError)
        .toBe('Deep error message');
    });

    it('大きな数値を含むメタデータ', () => {
      const response: SuccessResponse = {
        success: true,
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          largeNumber: Number.MAX_SAFE_INTEGER,
          precision: 0.0000001,
        },
      };

      expect(response.metadata?.largeNumber).toBe(Number.MAX_SAFE_INTEGER);
      expect(response.metadata?.precision).toBe(0.0000001);
    });
  });
});