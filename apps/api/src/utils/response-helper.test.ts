import { describe, expect, it } from 'vitest';
import { Context } from 'hono';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
  noContentResponse,
  redirectResponse,
} from './response-helper';
import type { ApiResponse } from '../types/response';

// Honoコンテキストのモック
function createMockContext(): Context {
  const jsonResponses: Array<{ body: unknown; status?: number }> = [];
  const textResponses: Array<{ body: string; status?: number }> = [];
  const redirectResponses: Array<{ url: string; status?: number }> = [];
  let currentStatus: number | undefined;

  return {
    status: (code: number) => {
      currentStatus = code;
    },
    json: (body: unknown, status?: number) => {
      const responseStatus = status || currentStatus;
      jsonResponses.push({ body, status: responseStatus });
      currentStatus = undefined; // リセット
      return { body, status: responseStatus } as any;
    },
    text: (body: string, status?: number) => {
      const responseStatus = status || currentStatus;
      textResponses.push({ body, status: responseStatus });
      currentStatus = undefined; // リセット
      return { body, status: responseStatus } as any;
    },
    redirect: (url: string, status?: number) => {
      const responseStatus = status || currentStatus;
      redirectResponses.push({ url, status: responseStatus });
      currentStatus = undefined; // リセット
      return { url, status: responseStatus } as any;
    },
    getJsonResponses: () => jsonResponses,
    getTextResponses: () => textResponses,
    getRedirectResponses: () => redirectResponses,
  } as any;
}

describe('レスポンスヘルパー関数', () => {
  describe('successResponse', () => {
    it('データ付き成功レスポンスを生成', () => {
      const ctx = createMockContext();
      const data = { id: 1, name: 'Test User' };

      const result = successResponse(ctx, data);
      const responses = (ctx as any).getJsonResponses();

      expect(responses).toHaveLength(1);
      expect(responses[0].body).toEqual({
        success: true,
        data,
      });
      expect(responses[0].status).toBe(200);
    });

    it('メタデータ付き成功レスポンスを生成', () => {
      const ctx = createMockContext();
      const data = { result: 'processed' };
      const metadata = { processingTimeMs: 150, version: '1.0.0' };

      successResponse(ctx, data, { metadata });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body).toEqual({
        success: true,
        data,
        metadata: expect.objectContaining({
          processingTimeMs: 150,
          version: '1.0.0',
          timestamp: expect.any(String),
        }),
      });
    });

    it('カスタムステータスコードで成功レスポンスを生成', () => {
      const ctx = createMockContext();
      const data = { created: true };

      successResponse(ctx, data, { status: 201 });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].status).toBe(201);
    });

    it('データなし成功レスポンスを生成', () => {
      const ctx = createMockContext();

      successResponse(ctx);
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body).toEqual({
        success: true,
      });
    });

    it('自動的にタイムスタンプを追加', () => {
      const ctx = createMockContext();

      successResponse(ctx, { id: 1 }, { metadata: { custom: 'value' } });
      const responses = (ctx as any).getJsonResponses();
      const body = responses[0].body as ApiResponse;

      expect(body.metadata?.timestamp).toBeDefined();
      expect(new Date(body.metadata?.timestamp as string).toISOString())
        .toBe(body.metadata?.timestamp);
    });
  });

  describe('errorResponse', () => {
    it('基本的なエラーレスポンスを生成', () => {
      const ctx = createMockContext();

      errorResponse(ctx, 'SYS001', 'Something went wrong');
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body).toEqual({
        success: false,
        error: {
          code: 'SYS001',
          message: 'Something went wrong',
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
      expect(responses[0].status).toBe(500);
    });

    it('詳細付きエラーレスポンスを生成', () => {
      const ctx = createMockContext();
      const details = {
        reason: 'Connection timeout',
        host: 'api.example.com',
        retries: 3,
      };

      errorResponse(ctx, 'SYS001', 'API call failed', {
        details,
        status: 503,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body).toEqual({
        success: false,
        error: {
          code: 'SYS001',
          message: 'API call failed',
          details,
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
      expect(responses[0].status).toBe(503);
    });

    it('エラーコードに応じた適切なステータスコードを自動設定', () => {
      const ctx = createMockContext();

      // VAL001 -> 400 (バリデーションエラー)
      errorResponse(ctx, 'VAL001', 'Validation failed');
      let responses = (ctx as any).getJsonResponses();
      expect(responses[0].status).toBe(400);

      // FILE001 -> 422 (ファイル変換エラー - UNPROCESSABLE_ENTITY)
      errorResponse(ctx, 'FILE001', 'File conversion failed');
      responses = (ctx as any).getJsonResponses();
      expect(responses[1].status).toBe(422);

      // GEN001 -> 500 (生成エラー)
      errorResponse(ctx, 'GEN001', 'Generation failed');
      responses = (ctx as any).getJsonResponses();
      expect(responses[2].status).toBe(500);

      // SYS001 -> 500 (システムエラー)
      errorResponse(ctx, 'SYS001', 'System error');
      responses = (ctx as any).getJsonResponses();
      expect(responses[3].status).toBe(500);
    });

    it('カスタムメタデータを含むエラーレスポンスを生成', () => {
      const ctx = createMockContext();

      errorResponse(ctx, 'SYS001', 'Custom error occurred', {
        metadata: {
          requestId: 'req_123',
          region: 'us-west-2',
        },
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.metadata).toEqual(expect.objectContaining({
        requestId: 'req_123',
        region: 'us-west-2',
        timestamp: expect.any(String),
      }));
    });
  });

  describe('validationErrorResponse', () => {
    it('フィールドエラー付きバリデーションエラーを生成', () => {
      const ctx = createMockContext();
      const fieldErrors = {
        email: ['Invalid email format', 'Email already exists'],
        password: ['Too short'],
      };

      validationErrorResponse(ctx, fieldErrors);
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body).toEqual({
        success: false,
        error: {
          code: expect.stringMatching(/^VAL\d{3}$/), // VAL001-VAL012などのバリデーションエラーコード
          message: 'Validation failed',
          details: {
            fieldErrors,
          },
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
      expect(responses[0].status).toBe(400);
    });

    it('カスタムメッセージ付きバリデーションエラーを生成', () => {
      const ctx = createMockContext();
      const fieldErrors = {
        age: ['Must be at least 18'],
      };

      validationErrorResponse(ctx, fieldErrors, {
        message: 'Age verification failed',
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.error.message).toBe('Age verification failed');
    });

    it('追加詳細情報付きバリデーションエラーを生成', () => {
      const ctx = createMockContext();
      const fieldErrors = {
        file: ['File too large'],
      };
      const additionalDetails = {
        maxSize: '10MB',
        actualSize: '15MB',
      };

      validationErrorResponse(ctx, fieldErrors, {
        additionalDetails,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.error.details).toEqual({
        fieldErrors,
        ...additionalDetails,
      });
    });

    it('空のフィールドエラーでも適切に処理', () => {
      const ctx = createMockContext();

      validationErrorResponse(ctx, {});
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.error.details.fieldErrors).toEqual({});
    });

    it('フィールドごとに複数のエラーメッセージを処理', () => {
      const ctx = createMockContext();
      const fieldErrors = {
        username: [
          'Must be at least 3 characters',
          'Can only contain letters and numbers',
          'Username already taken',
        ],
      };

      validationErrorResponse(ctx, fieldErrors);
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.error.details.fieldErrors.username).toHaveLength(3);
    });
  });

  describe('paginatedResponse', () => {
    it('ページネーション付きレスポンスを生成', () => {
      const ctx = createMockContext();
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      paginatedResponse(ctx, items, {
        page: 1,
        pageSize: 10,
        totalItems: 3,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body).toEqual({
        success: true,
        data: {
          items,
          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: 3,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });
    });

    it('複数ページの場合の計算を正しく処理', () => {
      const ctx = createMockContext();
      const items = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));

      paginatedResponse(ctx, items.slice(10, 20), {
        page: 2,
        pageSize: 10,
        totalItems: 50,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.data.pagination).toEqual({
        page: 2,
        pageSize: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('最初のページの判定を正しく処理', () => {
      const ctx = createMockContext();

      paginatedResponse(ctx, [], {
        page: 1,
        pageSize: 20,
        totalItems: 100,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.data.pagination.hasPreviousPage).toBe(false);
      expect(responses[0].body.data.pagination.hasNextPage).toBe(true);
    });

    it('最後のページの判定を正しく処理', () => {
      const ctx = createMockContext();

      paginatedResponse(ctx, [], {
        page: 5,
        pageSize: 20,
        totalItems: 100,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.data.pagination.hasPreviousPage).toBe(true);
      expect(responses[0].body.data.pagination.hasNextPage).toBe(false);
    });

    it('空のリストでも適切に処理', () => {
      const ctx = createMockContext();

      paginatedResponse(ctx, [], {
        page: 1,
        pageSize: 10,
        totalItems: 0,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.data.items).toEqual([]);
      expect(responses[0].body.data.pagination.totalPages).toBe(0);
      expect(responses[0].body.data.pagination.hasNextPage).toBe(false);
      expect(responses[0].body.data.pagination.hasPreviousPage).toBe(false);
    });

    it('追加メタデータを含むページネーションレスポンス', () => {
      const ctx = createMockContext();

      paginatedResponse(
        ctx,
        [{ id: 1 }],
        {
          page: 1,
          pageSize: 10,
          totalItems: 1,
        },
        {
          metadata: {
            query: 'search term',
            filters: { active: true },
          },
        }
      );
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.metadata).toEqual(expect.objectContaining({
        query: 'search term',
        filters: { active: true },
        timestamp: expect.any(String),
      }));
    });
  });

  describe('noContentResponse', () => {
    it('204 No Contentレスポンスを生成', () => {
      const ctx = createMockContext();

      noContentResponse(ctx);
      const responses = (ctx as any).getTextResponses();

      expect(responses).toHaveLength(1);
      expect(responses[0].body).toBe('');
      expect(responses[0].status).toBe(204);
    });
  });

  describe('redirectResponse', () => {
    it('302リダイレクトレスポンスを生成', () => {
      const ctx = createMockContext();

      redirectResponse(ctx, 'https://example.com');
      const responses = (ctx as any).getRedirectResponses();

      expect(responses).toHaveLength(1);
      expect(responses[0].url).toBe('https://example.com');
      expect(responses[0].status).toBe(302);
    });

    it('カスタムステータスコードでリダイレクト', () => {
      const ctx = createMockContext();

      redirectResponse(ctx, '/new-location', 301 as any);
      const responses = (ctx as any).getRedirectResponses();

      expect(responses[0].url).toBe('/new-location');
      expect(responses[0].status).toBe(301);
    });
  });

  describe('エッジケースとエラー処理', () => {
    it('undefinedフィールドを持つフィールドエラーを処理', () => {
      const ctx = createMockContext();
      const fieldErrors = {
        field1: ['Error 1'],
        field2: undefined,
        field3: ['Error 3'],
      };

      validationErrorResponse(ctx, fieldErrors as any);
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.error.details.fieldErrors).toEqual({
        field1: ['Error 1'],
        field2: undefined,
        field3: ['Error 3'],
      });
    });

    it('非常に大きなページ番号でもページネーションを処理', () => {
      const ctx = createMockContext();

      paginatedResponse(ctx, [], {
        page: 1000000,
        pageSize: 10,
        totalItems: 50,
      });
      const responses = (ctx as any).getJsonResponses();

      expect(responses[0].body.data.pagination.page).toBe(1000000);
      expect(responses[0].body.data.pagination.totalPages).toBe(5);
      expect(responses[0].body.data.pagination.hasNextPage).toBe(false);
      expect(responses[0].body.data.pagination.hasPreviousPage).toBe(true);
    });

    it('ゼロまたは負のページサイズでも計算エラーを回避', () => {
      const ctx = createMockContext();

      paginatedResponse(ctx, [], {
        page: 1,
        pageSize: 0,
        totalItems: 100,
      });
      const responses = (ctx as any).getJsonResponses();

      // ページサイズが0の場合、総ページ数は無限大になるが、Infinityとして処理
      expect(responses[0].body.data.pagination.totalPages).toBe(Infinity);
    });

    it('メタデータのタイムスタンプが有効なISO 8601形式', () => {
      const ctx = createMockContext();

      successResponse(ctx, { test: true }, { metadata: { custom: 'value' } });
      const responses = (ctx as any).getJsonResponses();
      const timestamp = responses[0].body.metadata?.timestamp;

      expect(timestamp).toBeDefined();
      expect(() => new Date(timestamp as string)).not.toThrow();
      expect(new Date(timestamp as string).toISOString()).toBe(timestamp);
    });
  });
});