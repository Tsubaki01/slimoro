/**
 * API エラーコードとメッセージの定数定義
 *
 * エラーコード命名規則: [カテゴリ][連番3桁]
 * - VAL: バリデーションエラー (001-999)
 * - FILE: ファイル処理エラー (001-999)
 * - GEN: 画像生成エラー (001-999)
 * - AUTH: 認証エラー (001-999)
 * - SYS: システムエラー (001-999)
 *
 * 注意: 既存のエラーコードは後方互換性のため変更禁止
 */

import {
  HTTP_STATUS,
} from './http-status';

/**
 * APIエラー定義オブジェクト
 *
 * 各エラーは以下の構造を持つ:
 * - code: ユニークなエラーコード
 * - message: 人間が読めるエラーメッセージ
 * - httpStatus: HTTPステータスコード
 */
export const API_ERRORS = {
  // ═══════════════════════════════════════════════════════════════
  // バリデーションエラー (VAL001-999)
  // ═══════════════════════════════════════════════════════════════

  /** プロンプトが未入力 */
  VAL001: {
    code: 'VAL001',
    message: 'Prompt is required',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** 画像ファイルが未選択 */
  VAL002: {
    code: 'VAL002',
    message: 'Image file is required',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** ファイルサイズが制限を超過 */
  VAL003: {
    code: 'VAL003',
    message: 'File size must be less than 10MB',
    httpStatus: HTTP_STATUS.PAYLOAD_TOO_LARGE
  },

  /** サポートされていないファイル形式 */
  VAL004: {
    code: 'VAL004',
    message: 'File type must be one of: image/jpeg, image/png, image/webp',
    httpStatus: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE
  },

  /** プロンプトの文字数制限超過 */
  VAL005: {
    code: 'VAL005',
    message: 'Prompt must be less than 1000 characters',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** 身長の値が範囲外 */
  VAL006: {
    code: 'VAL006',
    message: 'Height must be between 120 and 220 cm',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** 体重の値が範囲外 */
  VAL007: {
    code: 'VAL007',
    message: 'Weight must be between 20 and 300 kg',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** 目標体重の値が範囲外 */
  VAL008: {
    code: 'VAL008',
    message: 'Target weight must be between 20 and 300 kg',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** 被写体情報が不正なJSON */
  VAL009: {
    code: 'VAL009',
    message: 'Subject must be valid JSON with heightCm and currentWeightKg',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** ターゲット情報が不正なJSON配列 */
  VAL010: {
    code: 'VAL010',
    message: 'Targets must be valid JSON array',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** ターゲット配列の要素数が範囲外 */
  VAL011: {
    code: 'VAL011',
    message: 'Targets array must have 1 to 2 elements',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  /** オプション情報が不正なJSON */
  VAL012: {
    code: 'VAL012',
    message: 'Options must be valid JSON',
    httpStatus: HTTP_STATUS.BAD_REQUEST
  },

  // ═══════════════════════════════════════════════════════════════
  // ファイル処理エラー (FILE001-999)
  // ═══════════════════════════════════════════════════════════════

  /** ファイルからBase64への変換失敗 */
  FILE001: {
    code: 'FILE001',
    message: 'ファイルの変換に失敗しました',
    httpStatus: HTTP_STATUS.UNPROCESSABLE_ENTITY
  },

  /** ファイル読み込みエラー */
  FILE002: {
    code: 'FILE002',
    message: 'ファイルの読み込みに失敗しました',
    httpStatus: HTTP_STATUS.UNPROCESSABLE_ENTITY
  },

  /** ファイル形式の検証エラー */
  FILE003: {
    code: 'FILE003',
    message: 'ファイル形式の検証に失敗しました',
    httpStatus: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE
  },

  // ═══════════════════════════════════════════════════════════════
  // 画像生成エラー (GEN001-999)
  // ═══════════════════════════════════════════════════════════════

  /** 一般的な画像生成失敗 */
  GEN001: {
    code: 'GEN001',
    message: 'Failed to generate image',
    httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR
  },

  /** 体型変化画像の生成失敗 */
  GEN002: {
    code: 'GEN002',
    message: 'Failed to generate body shape images',
    httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR
  },

  /** AI APIからの不正なレスポンス */
  GEN003: {
    code: 'GEN003',
    message: 'Invalid response from AI service',
    httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR
  },

  /** AI APIの利用制限に達した */
  GEN004: {
    code: 'GEN004',
    message: 'AI service rate limit exceeded',
    httpStatus: HTTP_STATUS.TOO_MANY_REQUESTS
  },

  // ═══════════════════════════════════════════════════════════════
  // 認証エラー (AUTH001-999)
  // ═══════════════════════════════════════════════════════════════

  /** 認証トークンが無効 */
  AUTH001: {
    code: 'AUTH001',
    message: 'Invalid authentication token',
    httpStatus: HTTP_STATUS.UNAUTHORIZED
  },

  /** 認証トークンの有効期限切れ */
  AUTH002: {
    code: 'AUTH002',
    message: 'Authentication token expired',
    httpStatus: HTTP_STATUS.UNAUTHORIZED
  },

  /** アクセス権限不足 */
  AUTH003: {
    code: 'AUTH003',
    message: 'Insufficient permissions',
    httpStatus: HTTP_STATUS.FORBIDDEN
  },

  // ═══════════════════════════════════════════════════════════════
  // システムエラー (SYS001-999)
  // ═══════════════════════════════════════════════════════════════

  /** 一般的な内部サーバーエラー */
  SYS001: {
    code: 'SYS001',
    message: 'Internal server error',
    httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR
  },

  /** データベース接続エラー */
  SYS002: {
    code: 'SYS002',
    message: 'Database connection error',
    httpStatus: HTTP_STATUS.SERVICE_UNAVAILABLE
  },

  /** 外部APIサービスエラー */
  SYS003: {
    code: 'SYS003',
    message: 'External service error',
    httpStatus: HTTP_STATUS.SERVICE_UNAVAILABLE
  },

  /** 設定エラー */
  SYS004: {
    code: 'SYS004',
    message: 'Configuration error',
    httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR
  },

  /** リソース不足エラー */
  SYS005: {
    code: 'SYS005',
    message: 'Resource unavailable',
    httpStatus: HTTP_STATUS.SERVICE_UNAVAILABLE
  }
} as const;

/**
 * エラーキーの型定義
 * API_ERRORSのキーから自動生成される
 */
export type ApiErrorKey = keyof typeof API_ERRORS;

/**
 * エラーコードの型定義
 * API_ERRORSから自動生成されるすべてのエラーコードを含む
 */
export type ErrorCode = ApiErrorKey | (typeof API_ERRORS)[ApiErrorKey]['code'];

/**
 * エラーオブジェクトの型定義
 * API_ERRORSの値から自動生成される
 */
export type ApiError = typeof API_ERRORS[ApiErrorKey];

/**
 * エラーコードからエラー情報を取得
 *
 * @param code - エラーコード
 * @returns エラー情報オブジェクト、存在しない場合はundefined
 *
 * @example
 * ```typescript
 * const error = getErrorByCode('VAL001');
 * console.log(error?.message); // "Prompt is required"
 * ```
 */
export function getErrorByCode(code: ApiErrorKey): ApiError | undefined {
  return API_ERRORS[code];
}

/**
 * すべてのエラーコードを配列で取得
 *
 * @returns エラーコードの配列
 *
 * @example
 * ```typescript
 * const allCodes = getAllErrorCodes();
 * console.log(allCodes); // ["VAL001", "VAL002", ...]
 * ```
 */
export function getAllErrorCodes(): ApiErrorKey[] {
  return Object.keys(API_ERRORS) as ApiErrorKey[];
}

/**
 * カテゴリ別のエラーコードを取得
 *
 * @param category - エラーカテゴリ（VAL, FILE, GEN, AUTH, SYS）
 * @returns 指定カテゴリのエラーコード配列
 *
 * @example
 * ```typescript
 * const validationErrors = getErrorsByCategory('VAL');
 * console.log(validationErrors); // ["VAL001", "VAL002", ...]
 * ```
 */
export function getErrorsByCategory(category: 'VAL' | 'FILE' | 'GEN' | 'AUTH' | 'SYS'): ApiErrorKey[] {
  return getAllErrorCodes().filter(code => code.startsWith(category));
}

/**
 * エラーコードの重複チェック
 *
 * @returns 重複があればtrue、なければfalse
 *
 * @example
 * ```typescript
 * const hasDuplicates = hasErrorCodeDuplicates();
 * console.log(hasDuplicates); // false (正常時)
 * ```
 */
export function hasErrorCodeDuplicates(): boolean {
  const codes = Object.values(API_ERRORS).map(error => error.code);
  const uniqueCodes = new Set(codes);
  return codes.length !== uniqueCodes.size;
}

/**
 * エラーコードの命名規則チェック
 *
 * @param code - チェックするエラーコード
 * @returns 命名規則に従っていればtrue
 *
 * @example
 * ```typescript
 * const isValid = isValidErrorCodeFormat('VAL001');
 * console.log(isValid); // true
 * ```
 */
export function isValidErrorCodeFormat(code: string): boolean {
  const pattern = /^(VAL|FILE|GEN|AUTH|SYS)\d{3}$/;
  return pattern.test(code);
}