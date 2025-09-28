/**
 * HTTPステータスコードの定数定義
 *
 * RFC 9110 (HTTP Semantics) に準拠したHTTPステータスコード
 * https://www.rfc-editor.org/rfc/rfc9110
 */

import type { StatusCode } from 'hono/utils/http-status';

/**
 * HTTPステータスコード定数オブジェクト
 * Honoの型安全性を活用してContentfulStatusCode型で定義
 */
export const HTTP_STATUS = {
  // ═══════════════════════════════════════════════════════════════
  // 成功レスポンス (2xx)
  // ═══════════════════════════════════════════════════════════════

  /** リクエストが成功し、レスポンスとともに要求されたリソースが返される */
  OK: 200,

  /** リクエストが成功し、新たなリソースが作成された */
  CREATED: 201,

  /** リクエストは受理されたが、処理は完了していない */
  ACCEPTED: 202,

  /** リクエストは成功したが、返すコンテンツがない (ContentlessStatusCode) */
  NO_CONTENT: 204,

  // ═══════════════════════════════════════════════════════════════
  // リダイレクション (3xx)
  // ═══════════════════════════════════════════════════════════════

  /** リソースが恒久的に移動した */
  MOVED_PERMANENTLY: 301,

  /** リソースが一時的に移動した */
  FOUND: 302,

  /** 別のリソースを参照すべき */
  SEE_OTHER: 303,

  /** リソースは更新されていない（条件付きGETで使用）(ContentlessStatusCode) */
  NOT_MODIFIED: 304,

  /** リソースが一時的に別のURIに存在する */
  TEMPORARY_REDIRECT: 307,

  /** リソースが恒久的に別のURIに存在する */
  PERMANENT_REDIRECT: 308,

  // ═══════════════════════════════════════════════════════════════
  // クライアントエラー (4xx)
  // ═══════════════════════════════════════════════════════════════

  /** リクエストが不正である */
  BAD_REQUEST: 400,

  /** 認証が必要である */
  UNAUTHORIZED: 401,

  /** 支払いが必要である（将来の使用のために予約） */
  PAYMENT_REQUIRED: 402,

  /** アクセス権限がない */
  FORBIDDEN: 403,

  /** リソースが見つからない */
  NOT_FOUND: 404,

  /** 許可されていないメソッド */
  METHOD_NOT_ALLOWED: 405,

  /** 受理できないコンテンツタイプ */
  NOT_ACCEPTABLE: 406,

  /** プロキシ認証が必要 */
  PROXY_AUTHENTICATION_REQUIRED: 407,

  /** リクエストタイムアウト */
  REQUEST_TIMEOUT: 408,

  /** 競合が発生 */
  CONFLICT: 409,

  /** リソースが恒久的に削除された */
  GONE: 410,

  /** Content-Lengthヘッダが必要 */
  LENGTH_REQUIRED: 411,

  /** 前提条件が満たされていない */
  PRECONDITION_FAILED: 412,

  /** ペイロードが大きすぎる */
  PAYLOAD_TOO_LARGE: 413,

  /** URIが長すぎる */
  URI_TOO_LONG: 414,

  /** サポートされていないメディアタイプ */
  UNSUPPORTED_MEDIA_TYPE: 415,

  /** 要求された範囲が満たせない */
  RANGE_NOT_SATISFIABLE: 416,

  /** 期待が満たせない */
  EXPECTATION_FAILED: 417,

  /** エンティティを処理できない */
  UNPROCESSABLE_ENTITY: 422,

  /** リソースがロックされている */
  LOCKED: 423,

  /** 依存関係で失敗 */
  FAILED_DEPENDENCY: 424,

  /** アップグレードが必要 */
  UPGRADE_REQUIRED: 426,

  /** 前提条件が必要 */
  PRECONDITION_REQUIRED: 428,

  /** リクエスト数が多すぎる */
  TOO_MANY_REQUESTS: 429,

  /** リクエストヘッダーフィールドが大きすぎる */
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,

  /** 法的理由により利用不可 */
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,

  // ═══════════════════════════════════════════════════════════════
  // サーバーエラー (5xx)
  // ═══════════════════════════════════════════════════════════════

  /** サーバー内部エラー */
  INTERNAL_SERVER_ERROR: 500,

  /** 実装されていない */
  NOT_IMPLEMENTED: 501,

  /** 不正なゲートウェイ */
  BAD_GATEWAY: 502,

  /** サービス利用不可 */
  SERVICE_UNAVAILABLE: 503,

  /** ゲートウェイタイムアウト */
  GATEWAY_TIMEOUT: 504,

  /** HTTPバージョンがサポートされていない */
  HTTP_VERSION_NOT_SUPPORTED: 505,

  /** Variant Also Negotiates */
  VARIANT_ALSO_NEGOTIATES: 506,

  /** ストレージ不足 */
  INSUFFICIENT_STORAGE: 507,

  /** ループを検出 */
  LOOP_DETECTED: 508,

  /** 拡張が必要 */
  NOT_EXTENDED: 510,

  /** ネットワーク認証が必要 */
  NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const satisfies Record<string, StatusCode>;

/**
 * HTTPステータスコードのカテゴリを判定
 */
export const isInformational = (status: number): boolean => status >= 100 && status < 200;
export const isSuccess = (status: number): boolean => status >= 200 && status < 300;
export const isRedirect = (status: number): boolean => status >= 300 && status < 400;
export const isClientError = (status: number): boolean => status >= 400 && status < 500;
export const isServerError = (status: number): boolean => status >= 500 && status < 600;
export const isError = (status: number): boolean => status >= 400;

/**
 * HTTPステータスコードのテキスト説明を取得
 */
export const HTTP_STATUS_TEXT: Record<number, string> = {
  // 2xx Success
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',

  // 3xx Redirection
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',

  // 4xx Client Error
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',

  // 5xx Server Error
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
};
