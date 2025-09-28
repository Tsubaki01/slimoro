/**
 * 標準化されたAPIレスポンス型定義
 *
 * すべてのAPIエンドポイントで統一されたレスポンス形式を提供します。
 */

import type { ErrorCode } from '../constants/errors';

/**
 * レスポンスメタデータ
 *
 * レスポンスに付加される追加情報。
 * タイムスタンプ、処理時間、その他の診断情報を含みます。
 */
export interface ResponseMetadata {
  /** ISO 8601形式のタイムスタンプ */
  timestamp?: string;
  /** 処理時間（ミリ秒） */
  processingTimeMs?: number;
  /** APIバージョン */
  version?: string;
  /** リクエストID（トレーシング用） */
  requestId?: string;
  /** その他の任意のメタデータ */
  [key: string]: unknown;
}

/**
 * エラー詳細情報
 *
 * エラーの詳細情報を格納する構造体。
 */
export interface ErrorDetails {
  /** フィールドレベルのエラー（バリデーション用） */
  fieldErrors?: Record<string, string[] | undefined>;
  /** エラーのスタックトレース（開発環境のみ） */
  stack?: string;
  /** その他の任意の詳細情報 */
  [key: string]: unknown;
}

/**
 * 成功レスポンス型
 *
 * APIリクエストが成功した場合のレスポンス形式。
 *
 * @template T - レスポンスデータの型
 *
 * @example
 * ```typescript
 * const response: SuccessResponse<{ id: number; name: string }> = {
 *   success: true,
 *   data: { id: 1, name: "Example" },
 *   metadata: { processingTimeMs: 150 }
 * };
 * ```
 */
export interface SuccessResponse<T = unknown> {
  /** 成功フラグ（常にtrue） */
  success: true;
  /** レスポンスデータ */
  data?: T;
  /** レスポンスメタデータ */
  metadata?: ResponseMetadata;
}

/**
 * エラーレスポンス型
 *
 * APIリクエストが失敗した場合のレスポンス形式。
 *
 * @example
 * ```typescript
 * const response: ErrorResponse = {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'Invalid input data',
 *     details: { fieldErrors: { email: ['Invalid email format'] } }
 *   }
 * };
 * ```
 */
export interface ErrorResponse {
  /** 成功フラグ（常にfalse） */
  success: false;
  /** エラー情報 */
  error: {
    /** エラーコード */
    code: ErrorCode;
    /** 人間が読めるエラーメッセージ */
    message: string;
    /** エラーの詳細情報 */
    details?: ErrorDetails;
  };
  /** レスポンスメタデータ */
  metadata?: ResponseMetadata;
}

/**
 * バリデーションエラーレスポンス型
 *
 * バリデーションエラー専用のレスポンス形式。
 * ErrorResponseのサブタイプで、詳細なフィールドエラー情報を含みます。
 *
 * @example
 * ```typescript
 * const response: ValidationErrorResponse = {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'Validation failed',
 *     details: {
 *       fieldErrors: {
 *         height: ['Must be between 120 and 220'],
 *         weight: ['Must be positive number']
 *       }
 *     }
 *   }
 * };
 * ```
 */
export interface ValidationErrorResponse extends ErrorResponse {
  error: {
    code: ErrorCode; // VAL001-VAL012などのバリデーションエラーコード
    message: string;
    details?: {
      fieldErrors?: Record<string, string[] | undefined>;
      [key: string]: unknown;
    };
  };
}

/**
 * 統合APIレスポンス型
 *
 * 成功とエラーの両方のケースを含む統合型。
 * 型ガードを使用して、成功/失敗を判定できます。
 *
 * @template T - 成功時のレスポンスデータ型
 *
 * @example
 * ```typescript
 * function handleResponse<T>(response: ApiResponse<T>) {
 *   if (response.success) {
 *     // TypeScript knows response.data exists here
 *     console.log(response.data);
 *   } else {
 *     // TypeScript knows response.error exists here
 *     console.error(response.error.message);
 *   }
 * }
 * ```
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * ページネーション情報
 *
 * リスト系APIで使用するページネーション情報の標準形式。
 */
export interface PaginationInfo {
  /** 現在のページ番号（1始まり） */
  page: number;
  /** ページサイズ */
  pageSize: number;
  /** 総アイテム数 */
  totalItems: number;
  /** 総ページ数 */
  totalPages: number;
  /** 次ページの有無 */
  hasNextPage?: boolean;
  /** 前ページの有無 */
  hasPreviousPage?: boolean;
}

/**
 * ページネーション付きレスポンスデータ
 *
 * @template T - アイテムの型
 */
export interface PaginatedData<T> {
  /** アイテムのリスト */
  items: T[];
  /** ページネーション情報 */
  pagination: PaginationInfo;
}

/**
 * 型ガード: 成功レスポンスかどうかを判定
 *
 * @param response - 判定対象のレスポンス
 * @returns 成功レスポンスの場合true
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * 型ガード: エラーレスポンスかどうかを判定
 *
 * @param response - 判定対象のレスポンス
 * @returns エラーレスポンスの場合true
 */
export function isErrorResponse(
  response: ApiResponse
): response is ErrorResponse {
  return response.success === false;
}

/**
 * 型ガード: バリデーションエラーかどうかを判定
 *
 * @param response - 判定対象のレスポンス
 * @returns バリデーションエラーの場合true
 */
export function isValidationError(
  response: ApiResponse
): response is ValidationErrorResponse {
  return (
    response.success === false &&
    typeof response.error.code === 'string' &&
    response.error.code.startsWith('VAL')
  );
}