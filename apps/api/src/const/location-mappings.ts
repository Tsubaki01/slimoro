/**
 * Google Cloud ロケーションマッピング定数
 *
 * Cloudflareの地理情報からVertex AIリージョンへのマッピング定義
 */

/**
 * サポートされているGoogle Cloud ロケーション
 * Imagen対応リージョンのみを含む
 */
export const SUPPORTED_LOCATIONS = [
  'us-central1',
  'us-east1',
  'us-east4',
  'us-east5',
  'us-south1',
  'us-west1',
  'us-west4',
  'asia-northeast1',
  'asia-northeast3',
  'asia-southeast1',
  'europe-west1',
  'europe-west2',
  'europe-west3',
  'europe-west4',
] as const;

/**
 * デフォルトロケーション
 * 最も安定したリージョンとして us-central1 を使用
 */
export const DEFAULT_LOCATION = 'us-central1';

/**
 * CloudflareのColoからVertex AIリージョンへのマッピング
 * データセンターの場所に基づいて最適なリージョンを選択
 */
export const COLO_TO_VERTEX_REGION: Record<string, string> = {
  // アジア太平洋 - 東京リージョン
  'NRT': 'asia-northeast1',     // 東京成田
  'KIX': 'asia-northeast1',     // 大阪関西
  'ICN': 'asia-northeast1',     // ソウル仁川
  'TPE': 'asia-northeast1',     // 台北桃園

  // アジア太平洋 - シンガポールリージョン
  'SIN': 'asia-southeast1',     // シンガポール
  'KUL': 'asia-southeast1',     // クアラルンプール
  'BKK': 'asia-southeast1',     // バンコク
  'MNL': 'asia-southeast1',     // マニラ

  // 北米 - 中央リージョン
  'DFW': 'us-central1',         // ダラス
  'ORD': 'us-central1',         // シカゴ
  'DEN': 'us-central1',         // デンバー
  'MCI': 'us-central1',         // カンザスシティ

  // 北米 - 西海岸リージョン
  'LAX': 'us-west1',            // ロサンゼルス
  'SJC': 'us-west1',            // サンノゼ
  'SEA': 'us-west1',            // シアトル
  'PDX': 'us-west1',            // ポートランド

  // 北米 - 東海岸リージョン
  'IAD': 'us-east1',            // バージニア
  'EWR': 'us-east1',            // ニューヨーク
  'BOS': 'us-east1',            // ボストン
  'ATL': 'us-east1',            // アトランタ

  // ヨーロッパ - ロンドンリージョン
  'LHR': 'europe-west2',        // ロンドンヒースロー
  'MAN': 'europe-west2',        // マンチェスター
  'DUB': 'europe-west2',        // ダブリン

  // ヨーロッパ - フランクフルトリージョン
  'FRA': 'europe-west3',        // フランクフルト
  'MUC': 'europe-west3',        // ミュンヘン
  'VIE': 'europe-west3',        // ウィーン
  'ZUR': 'europe-west3',        // チューリッヒ

  // ヨーロッパ - アムステルダムリージョン
  'AMS': 'europe-west4',        // アムステルダム
  'CPH': 'europe-west4',        // コペンハーゲン
  'OSL': 'europe-west4',        // オスロ
};

/**
 * 国コードからVertex AIリージョンへのマッピング
 * 国に基づいて最適なリージョンを選択
 */
export const COUNTRY_TO_VERTEX_REGION: Record<string, string> = {
  // アジア太平洋 - 東京リージョン
  'JP': 'asia-northeast1',      // 日本
  'KR': 'asia-northeast1',      // 韓国
  'TW': 'asia-northeast1',      // 台湾
  'HK': 'asia-northeast1',      // 香港
  'MO': 'asia-northeast1',      // マカオ

  // アジア太平洋 - シンガポールリージョン
  'SG': 'asia-southeast1',      // シンガポール
  'MY': 'asia-southeast1',      // マレーシア
  'TH': 'asia-southeast1',      // タイ
  'ID': 'asia-southeast1',      // インドネシア
  'PH': 'asia-southeast1',      // フィリピン
  'VN': 'asia-southeast1',      // ベトナム

  // 北米
  'US': 'us-central1',          // アメリカ
  'CA': 'us-central1',          // カナダ
  'MX': 'us-central1',          // メキシコ

  // ヨーロッパ - ロンドンリージョン
  'GB': 'europe-west2',         // イギリス
  'IE': 'europe-west2',         // アイルランド
  'IS': 'europe-west2',         // アイスランド

  // ヨーロッパ - フランクフルトリージョン
  'DE': 'europe-west3',         // ドイツ
  'AT': 'europe-west3',         // オーストリア
  'CH': 'europe-west3',         // スイス
  'CZ': 'europe-west3',         // チェコ
  'PL': 'europe-west3',         // ポーランド

  // ヨーロッパ - アムステルダムリージョン
  'NL': 'europe-west4',         // オランダ
  'BE': 'europe-west4',         // ベルギー
  'DK': 'europe-west4',         // デンマーク
  'NO': 'europe-west4',         // ノルウェー
  'SE': 'europe-west4',         // スウェーデン
  'FI': 'europe-west4',         // フィンランド

  // ヨーロッパ - その他
  'FR': 'europe-west1',         // フランス
  'ES': 'europe-west1',         // スペイン
  'PT': 'europe-west1',         // ポルトガル
  'IT': 'europe-west1',         // イタリア
};

/**
 * 大陸コードからVertex AIリージョンへのマッピング
 * 大陸レベルでの最適なリージョンを選択
 */
export const CONTINENT_TO_VERTEX_REGION: Record<string, string> = {
  'AS': 'asia-northeast1',    // アジア
  'NA': 'us-central1',        // 北米
  'EU': 'europe-west4',       // ヨーロッパ
  'SA': 'us-central1',        // 南米
  'AF': 'europe-west1',       // アフリカ
  'OC': 'asia-southeast1',    // オセアニア
};