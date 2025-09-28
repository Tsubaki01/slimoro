import { describe, expect, it } from 'vitest';

import type { Context } from 'hono';
import type { RedirectStatusCode, StatusCode } from 'hono/utils/http-status';
import type { ApiResponse } from '../types/response';
import {
  errorResponse,
  noContentResponse,
  paginatedResponse,
  redirectResponse,
  successResponse,
  validationErrorResponse,
} from './response-helper';

type JsonRecord = { body: unknown; status?: number };
type TextRecord = { body: string; status?: number };
type RedirectRecord = { url: string; status?: number };

type TestContext = Context & {
  getJsonResponses(): JsonRecord[];
  getTextResponses(): TextRecord[];
  getRedirectResponses(): RedirectRecord[];
};

// Hono コンテキストの極小モック
function createMockContext(): TestContext {
  const jsonResponses: JsonRecord[] = [];
  const textResponses: TextRecord[] = [];
  const redirectResponses: RedirectRecord[] = [];
  let currentStatus: number | undefined;

  const ctx = {
    status: (code: number) => {
      currentStatus = code;
    },
    json: (body: unknown, status?: number) => {
      const responseStatus = status ?? currentStatus ?? 200;
      jsonResponses.push({ body, status: responseStatus });
      currentStatus = undefined;
      return new Response(JSON.stringify(body ?? null), {
        status: responseStatus,
        headers: { 'content-type': 'application/json' },
      });
    },
    text: (body: string, status?: number) => {
      const responseStatus = status ?? currentStatus ?? 200;
      textResponses.push({ body, status: responseStatus });
      currentStatus = undefined;
      const responseBody =
        responseStatus === 204 || responseStatus === 205 ? null : body ?? '';
      return new Response(responseBody, { status: responseStatus });
    },
    redirect: (url: string, status?: number) => {
      const responseStatus = status ?? currentStatus ?? 302;
      redirectResponses.push({ url, status: responseStatus });
      currentStatus = undefined;
      return new Response(null, {
        status: responseStatus,
        headers: { Location: url },
      });
    },
    getJsonResponses: () => jsonResponses,
    getTextResponses: () => textResponses,
    getRedirectResponses: () => redirectResponses,
  } as unknown as TestContext;

  return ctx;
}

describe('response-helper', () => {
  describe('successResponse', () => {
    it('データ付き成功レスポンスを生成', () => {
      const ctx = createMockContext();
      const data = { id: 1, name: 'Test' };

      successResponse(ctx, data);
      const responses = ctx.getJsonResponses();

      expect(responses).toHaveLength(1);
      expect(responses[0].body).toEqual({ success: true, data });
      expect(responses[0].status).toBe(200);
    });

    it('メタデータを付与すると timestamp が追加される', () => {
      const ctx = createMockContext();

      successResponse(ctx, { ok: true }, { metadata: { custom: 'v' } });
      const body = ctx.getJsonResponses()[0].body as ApiResponse;

      expect(body.metadata?.timestamp).toBeDefined();
      expect(new Date(String(body.metadata?.timestamp)).toISOString()).toBe(
        body.metadata?.timestamp
      );
      expect(body.metadata).toEqual(
        expect.objectContaining({ custom: 'v', timestamp: expect.any(String) })
      );
    });
  });

  describe('errorResponse', () => {
    it('定義済みエラーコードの httpStatus を使用', () => {
      const ctx = createMockContext();

      errorResponse(ctx, 'SYS001', 'Something');
      const res = ctx.getJsonResponses();

      expect(res[0].status).toBe(500);
      expect(res[0].body).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SYS001',
            message: 'Something',
          }),
          metadata: expect.objectContaining({ timestamp: expect.any(String) }),
        })
      );
    });

    it('details と status の上書きができる', () => {
      const ctx = createMockContext();
      errorResponse(ctx, 'FILE001', undefined, {
        status: 422 as StatusCode,
        details: { fileName: 'x.png' },
        metadata: { requestId: 'req-1' },
      });

      const res = ctx.getJsonResponses();
      expect(res[0].status).toBe(422);
      expect(res[0].body).toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FILE001',
            details: expect.objectContaining({ fileName: 'x.png' }),
          }),
          metadata: expect.objectContaining({ requestId: 'req-1' }),
        })
      );
    });
  });

  describe('validationErrorResponse', () => {
    it('フィールドエラーを含む 400 を返す', () => {
      const ctx = createMockContext();
      const fieldErrors = { email: ['Invalid'] };

      validationErrorResponse(ctx, fieldErrors);
      const res = ctx.getJsonResponses();
      const body = res[0].body as {
        success: false;
        error: {
          code: string;
          details?: { fieldErrors?: Record<string, string[] | undefined> };
        };
        metadata?: Record<string, unknown>;
      };

      expect(res[0].status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toMatch(/^VAL\d{3}$/);
      expect(body.error.details?.fieldErrors).toEqual(fieldErrors);
      expect(body.metadata?.timestamp).toBeDefined();
    });

    it('カスタムメッセージと追加詳細を含められる', () => {
      const ctx = createMockContext();
      const fieldErrors = { size: ['Too large'] };
      const additionalDetails = { max: '10MB' };

      validationErrorResponse(ctx, fieldErrors, {
        message: 'Too big',
        additionalDetails,
        metadata: { requestId: 'r1' },
      });

      const res = ctx.getJsonResponses();
      const body = res[0].body as {
        success: false;
        error: { message: string; details?: Record<string, unknown> };
        metadata?: Record<string, unknown>;
      };
      expect(body.error.message).toBe('Too big');
      expect(body.error.details).toEqual(
        expect.objectContaining({ fieldErrors, ...additionalDetails })
      );
      expect(body.metadata).toEqual(
        expect.objectContaining({
          requestId: 'r1',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('paginatedResponse', () => {
    it('ページネーション情報を付与して成功レスポンスを返す', () => {
      const ctx = createMockContext();
      const items = [{ id: 1 }, { id: 2 }];

      paginatedResponse(ctx, items, { page: 1, pageSize: 10, totalItems: 2 });
      const res = ctx.getJsonResponses();
      const body = res[0].body as ApiResponse;

      expect(body.success).toBe(true);
      expect(body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            items,
            pagination: expect.objectContaining({
              page: 1,
              pageSize: 10,
              totalItems: 2,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            }),
          }),
        })
      );
    });

    it('pageSize=0 の場合 totalPages は Infinity', () => {
      const ctx = createMockContext();

      paginatedResponse(ctx, [], { page: 1, pageSize: 0, totalItems: 100 });
      const body = ctx.getJsonResponses()[0].body as ApiResponse;
      // @ts-expect-error Infinity を許容 (仕様)
      expect(body.data?.pagination.totalPages).toBe(Infinity);
    });

    it('メタデータを付与できる', () => {
      const ctx = createMockContext();

      paginatedResponse(
        ctx,
        [{ id: 1 }],
        { page: 1, pageSize: 10, totalItems: 1 },
        { metadata: { query: 'q' } }
      );
      const body = ctx.getJsonResponses()[0].body as ApiResponse;
      expect(body.metadata).toEqual(
        expect.objectContaining({ query: 'q', timestamp: expect.any(String) })
      );
    });
  });

  describe('noContentResponse', () => {
    it('204 空レスポンスを返す', () => {
      const ctx = createMockContext();

      noContentResponse(ctx);
      const res = ctx.getTextResponses();

      expect(res).toHaveLength(1);
      expect(res[0].body).toBe('');
      expect(res[0].status).toBe(204);
    });
  });

  describe('redirectResponse', () => {
    it('302 リダイレクトを返す', () => {
      const ctx = createMockContext();

      redirectResponse(ctx, '/next');
      const res = ctx.getRedirectResponses();

      expect(res).toHaveLength(1);
      expect(res[0].url).toBe('/next');
      expect(res[0].status).toBe(302);
    });

    it('カスタムステータスでリダイレクトする', () => {
      const ctx = createMockContext();

      redirectResponse(ctx, '/moved', 301 as RedirectStatusCode);
      const res = ctx.getRedirectResponses();

      expect(res[0].url).toBe('/moved');
      expect(res[0].status).toBe(301);
    });
  });
});
