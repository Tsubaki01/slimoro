/**
 * ロケーション解決関連の型定義
 */

/**
 * Cloudflare CFオブジェクトのインターフェース
 * リクエストの地理情報を含む
 */
export interface CloudflareCfObject {
  /** 国コード（ISO 3166-1 Alpha-2） */
  country?: string;
  /** 州/地域コード */
  region?: string;
  /** 都市名 */
  city?: string;
  /** データセンターのIATA空港コード */
  colo?: string;
  /** 大陸コード */
  continent?: string;
  /** 緯度 */
  latitude?: string;
  /** 経度 */
  longitude?: string;
  /** 郵便番号 */
  postalCode?: string;
  /** タイムゾーン */
  timezone?: string;
  /** ASN番号 */
  asn?: number;
  /** ASN組織名 */
  asOrganization?: string;
}

/**
 * ロケーション解決の結果
 */
export interface LocationResolutionResult {
  /** 解決されたロケーション */
  location: string;
  /** 解決方法 */
  resolutionMethod: 'explicit' | 'colo' | 'country' | 'continent' | 'default';
  /** 元の地理情報（デバッグ用） */
  geographicInfo?: {
    country?: string;
    colo?: string;
    continent?: string;
  };
}

/**
 * ロケーション解決のオプション
 */
export interface LocationResolutionOptions {
  /** 明示的なロケーション設定 */
  explicitLocation?: string;
  /** リクエストオブジェクト（Cloudflare地理情報用） */
  request?: Request;
  /** デバッグモード */
  debug?: boolean;
}