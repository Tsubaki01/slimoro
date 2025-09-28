import type { Context } from 'hono';
import type { RedirectStatusCode, StatusCode } from 'hono/utils/http-status';

import { API_ERRORS, type ApiErrorKey, type ErrorCode } from '../constants/errors';
import {
  HTTP_STATUS,
} from '../constants/http-status';
import type {
  ErrorDetails,
  ErrorResponse,
  PaginatedData,
  ResponseMetadata,
  SuccessResponse,
  ValidationErrorResponse,
} from '../types/response';

/**
 * 成功レスポンスオプション
 */
interface SuccessOptions {
  /** HTTPステータスコード（デフォルト: 200） */
  status?: StatusCode;
  /** レスポンスメタデータ */
  metadata?: ResponseMetadata;
}

/**
 * エラーレスポンスオプション
 */
interface ErrorOptions {
  /** HTTPステータスコード */
  status?: StatusCode;
  /** エラー詳細情報 */
  details?: ErrorDetails;
  /** レスポンスメタデータ */
  metadata?: ResponseMetadata;
}

/**
 * バリデーションエラーオプション
 */
interface ValidationErrorOptions {
  /** カスタムエラーメッセージ */
  message?: string;
  /** 追加の詳細情報 */
  additionalDetails?: Record<string, unknown>;
  /** レスポンスメタデータ */
  metadata?: ResponseMetadata;
}

/**
 * ページネーションオプション
 */
interface PaginationOptions {
  /** 現在のページ番号 */
  page: number;
  /** ページサイズ */
  pageSize: number;
  /** 総アイテム数 */
  totalItems: number;
}

/**
 * 現在のタイムスタンプを生成
 *
 * @returns ISO 8601形式のタイムスタンプ
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * メタデータにタイムスタンプを追加
 *
 * @param metadata - 既存のメタデータ
 * @returns タイムスタンプ付きメタデータ
 */
function enrichMetadata(metadata?: ResponseMetadata): ResponseMetadata {
  return {
    timestamp: getCurrentTimestamp(),
    ...metadata,
  };
}

/**
 * 成功レスポンスを生成
 *
 * @param c - Honoコンテキスト
 * @param data - レスポンスデータ
 * @param options - レスポンスオプション
 * @returns Honoレスポンス
 *
 * @example
 * ```typescript
 * // 基本的な成功レスポンス
 * return successResponse(c, { id: 1, name: "Example" });
 *
 * // メタデータ付き成功レスポンス
 * return successResponse(c, result, {
 *   metadata: { processingTimeMs: 150 }
 * });
 *
 * // 201 Createdレスポンス
 * return successResponse(c, newResource, { status: 201 });
 * ```
 */
export function successResponse<T>(
  c: Context,
  data?: T,
  options: SuccessOptions = {}
): Response {
  const { status = HTTP_STATUS.OK, metadata } = options;

  const response: SuccessResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
  };

  // メタデータが明示的に提供された場合のみ追加
  if (metadata) {
    response.metadata = enrichMetadata(metadata);
  }

  c.status(status);
  return c.json(response);
}

/**
 * エラーレスポンスを生成（エラー定数使用）
 *
 * @param c - Honoコンテキスト
 * @param errorKey - エラーキー（API_ERRORSのキー）
 * @param customMessage - カスタムメッセージ（省略時は定義済みメッセージを使用）
 * @param options - エラーオプション
 * @returns Honoレスポンス
 *
 * @example
 * ```typescript
 * // 定義済みエラーを使用
 * return errorResponse(c, 'VAL001'); // "Prompt is required"
 *
 * // カスタムメッセージで上書き
 * return errorResponse(c, 'VAL001', 'プロンプトを入力してください');
 *
 * // 詳細付きエラーレスポンス
 * return errorResponse(c, 'FILE001', undefined, {
 *   details: { fileName: 'image.jpg', size: '15MB' }
 * });
 * ```
 */
export function errorResponse(
  c: Context,
  errorKey: ApiErrorKey,
  customMessage?: string,
  options: ErrorOptions = {}
): Response {
  const errorDef = API_ERRORS[errorKey];
  const message = customMessage || errorDef.message;

  const {
    status = errorDef.httpStatus, // 新しいhttpStatusプロパティを直接使用
    details,
    metadata,
  } = options;

  const response: ErrorResponse = {
    success: false,
    error: {
      code: errorDef.code as ErrorCode,
      message,
      ...(details && { details }),
    },
    metadata: enrichMetadata(metadata),
  };

  c.status(status);
  return c.json(response);
}

/**
 * バリデーションエラーレスポンスを生成
 *
 * @param c - Honoコンテキスト
 * @param fieldErrors - フィールドレベルのエラー
 * @param options - バリデーションエラーオプション
 * @returns Honoレスポンス
 *
 * @example
 * ```typescript
 * // 基本的なバリデーションエラー
 * return validationErrorResponse(c, {
 *   email: ['Invalid format'],
 *   password: ['Too short']
 * });
 *
 * // カスタムメッセージ付き
 * return validationErrorResponse(c, fieldErrors, {
 *   message: 'Registration validation failed'
 * });
 *
 * // 追加情報付き
 * return validationErrorResponse(c, fieldErrors, {
 *   additionalDetails: { attemptNumber: 3 }
 * });
 * ```
 */
export function validationErrorResponse(
  c: Context,
  fieldErrors: Record<string, string[] | undefined>,
  options: ValidationErrorOptions = {}
): Response {
  const {
    message = 'Validation failed',
    additionalDetails,
    metadata,
  } = options;

  const response: ValidationErrorResponse = {
    success: false,
    error: {
      code: 'VAL001', // デフォルトのバリデーションエラーコード
      message,
      details: {
        fieldErrors,
        ...additionalDetails,
      },
    },
    metadata: enrichMetadata(metadata),
  };

  c.status(HTTP_STATUS.BAD_REQUEST);
  return c.json(response);
}

/**
 * ページネーション付き成功レスポンスを生成
 *
 * @param c - Honoコンテキスト
 * @param items - アイテムのリスト
 * @param pagination - ページネーション情報
 * @param options - レスポンスオプション
 * @returns Honoレスポンス
 *
 * @example
 * ```typescript
 * // ページネーション付きレスポンス
 * return paginatedResponse(c, users, {
 *   page: 2,
 *   pageSize: 20,
 *   totalItems: 100
 * });
 *
 * // メタデータ付き
 * return paginatedResponse(c, results, pagination, {
 *   metadata: { query: searchTerm }
 * });
 * ```
 */
export function paginatedResponse<T>(
  c: Context,
  items: T[],
  pagination: PaginationOptions,
  options: SuccessOptions = {}
): Response {
  const { page, pageSize, totalItems } = pagination;
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : Infinity;

  const paginatedData: PaginatedData<T> = {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };

  return successResponse(c, paginatedData, options);
}

/**
 * 204 No Contentレスポンスを生成
 *
 * @param c - Honoコンテキスト
 * @returns Honoレスポンス
 *
 * @example
 * ```typescript
 * // DELETE操作の成功レスポンス
 * await deleteResource(id);
 * return noContentResponse(c);
 * ```
 */
export function noContentResponse(c: Context): Response {
  c.status(HTTP_STATUS.NO_CONTENT);
  return c.text('');
}

/**
 * リダイレクトレスポンスを生成
 *
 * @param c - Honoコンテキスト
 * @param location - リダイレクト先URL
 * @param status - HTTPステータスコード（デフォルト: 302）
 * @returns Honoレスポンス
 *
 * @example
 * ```typescript
 * // 一時的なリダイレクト（302）
 * return redirectResponse(c, '/new-location');
 *
 * // 恒久的なリダイレクト（301）
 * return redirectResponse(c, '/permanent-location', 301);
 * ```
 */
export function redirectResponse(
  c: Context,
  location: string,
  status: RedirectStatusCode = HTTP_STATUS.FOUND
): Response {
  return c.redirect(location, status);
}