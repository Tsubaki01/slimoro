import { describe, expect, it } from 'vitest';

import type { ApiResponse } from './response';
import {
  isErrorResponse,
  isSuccessResponse,
  isValidationError,
} from './response';

describe('types/response - type guards', () => {
  describe('isSuccessResponse', () => {
    it('success=true のレスポンスを真と判定', () => {
      const res: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
        metadata: { version: '1.0.0' },
      };

      expect(isSuccessResponse(res)).toBe(true);
      expect(isErrorResponse(res)).toBe(false);
      expect(isValidationError(res)).toBe(false);
    });

    it('data が無い success=true でも真と判定', () => {
      const res: ApiResponse = {
        success: true,
        metadata: { processingTimeMs: 10 },
      };
      expect(isSuccessResponse(res)).toBe(true);
    });
  });

  describe('isErrorResponse', () => {
    it('success=false のエラーレスポンスを真と判定', () => {
      const res: ApiResponse = {
        success: false,
        error: {
          code: 'SYS001' as unknown as never,
          message: 'Internal error',
        },
        metadata: { requestId: 'req-1' },
      };

      expect(isErrorResponse(res)).toBe(true);
      expect(isSuccessResponse(res)).toBe(false);
      expect(isValidationError(res)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('エラーコードが VAL で始まる場合に真と判定', () => {
      const res: ApiResponse = {
        success: false,
        error: {
          code: 'VAL001' as unknown as never,
          message: 'Validation failed',
          details: { fieldErrors: { email: ['Invalid email'] } },
        },
      };

      expect(isValidationError(res)).toBe(true);
      expect(isErrorResponse(res)).toBe(true);
      expect(isSuccessResponse(res)).toBe(false);
    });

    it('VAL 以外のコードは偽と判定', () => {
      const res: ApiResponse = {
        success: false,
        error: { code: 'FILE001' as unknown as never, message: 'File error' },
      };
      expect(isValidationError(res)).toBe(false);
    });

    it('コードが文字列でない（不正形状）の場合は偽と判定', () => {
      const res = {
        success: false,
        error: { code: 123, message: 'bad' },
      } as unknown as ApiResponse;
      expect(isValidationError(res)).toBe(false);
    });
  });
});
