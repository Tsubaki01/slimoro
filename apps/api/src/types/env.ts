// Honoで使用する環境変数の型を定義
type Env = {
  Bindings: {
    // Google Cloud Service Account認証情報
    GOOGLE_CLIENT_EMAIL: string;
    GOOGLE_PRIVATE_KEY: string;
    GOOGLE_PRIVATE_KEY_ID?: string; // オプション
    GOOGLE_PROJECT_ID: string;
    GOOGLE_LOCATION?: string; // Vertex AI ロケーション（オプション）
    // CORS_ORIGIN: string[];
    // SENTRY_DSN: string;
    // SENTRY_AUTH_TOKEN: string;
  };
  // Variables: {
  // };
};

export type { Env };