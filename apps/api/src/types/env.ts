// Honoで使用する環境変数の型を定義
type Env = {
  Bindings: {
    GEMINI_API_KEY: string;
    // CORS_ORIGIN: string[];
    // SENTRY_DSN: string;
    // SENTRY_AUTH_TOKEN: string;
  };
  // Variables: {
  // };
};

export type { Env };