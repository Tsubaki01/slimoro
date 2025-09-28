/**
 * 対象人物の現在の体格情報
 * @description 体型変化生成の基準となる人物の身長・体重情報を含む
 */
export interface Subject {
  /** 身長（cm） - 120〜220cmの範囲 */
  heightCm: number;
  /** 現在体重（kg） - 20〜300kgの範囲 */
  currentWeightKg: number;
}

/**
 * 目標体重設定
 * @description 生成したい体型の目標体重と識別用ラベル
 */
export interface TargetWeight {
  /** 目標体重（kg） - 20〜300kgの範囲 */
  weightKg: number;
  /**
   * 生成画像の識別用ラベル
   * @example "slim", "normal", "muscular"
   */
  label?: string;
}

/**
 * 体型変化生成のオプション設定
 * @description 画像生成の出力形式や再現性の制御に使用
 */
export interface BodyShapeOptions {
  /**
   * 出力画像のMIMEタイプ
   * @default "image/png"
   * @description Geminiが返すmimeTypeが優先され、これはフォールバックとして使用
   */
  returnMimeType?: 'image/png' | 'image/jpeg';
  /**
   * 生成のシード値
   * @description 同じシード値を使用することで再現性のある生成が可能
   */
  seed?: number;
}

/**
 * 体型変化APIのリクエスト型（HTTPエンドポイント用）
 * @description multipart/form-dataで受け取るリクエストの型定義
 * @deprecated 実際の実装ではZodスキーマを使用しており、この型は参照用
 */
export interface BodyShapeGenerationRequest {
  /** 入力画像ファイル（JPEG/PNG/WebP、最大10MB） */
  image: File;
  /** 現在の体格情報 */
  subject: Subject;
  /** 目標体重の配列（1〜2要素） */
  targets: TargetWeight[];
  /** 生成オプション */
  options?: BodyShapeOptions;
}

/**
 * 生成された画像データ
 * @description AIによって生成された体型変化画像の情報
 */
export interface GeneratedImage {
  /**
   * 画像の識別ラベル
   * @description TargetWeightで指定されたラベルが設定される
   */
  label?: string;
  /**
   * Base64エンコードされた画像データ
   * @description data:image/png;base64,などのプレフィックスは含まない
   */
  base64: string;
  /**
   * 画像のMIMEタイプ
   * @example "image/png", "image/jpeg", "image/webp"
   */
  mimeType: string;
  /** 画像の幅（ピクセル） */
  width: number;
  /** 画像の高さ（ピクセル） */
  height: number;
}

/**
 * 体型変化APIのレスポンス型（HTTPエンドポイント用）
 * @description 成功・失敗を含むAPIレスポンスの統一型
 * @deprecated 実際の実装ではsuccessResponse/errorResponseヘルパーを使用
 */
export interface BodyShapeGenerationResponse {
  /** 成否フラグ */
  success: boolean;
  /** 生成された画像の配列（成功時） */
  images?: GeneratedImage[];
  /**
   * 処理メタデータ（成功時）
   */
  metadata?: {
    /** 処理時間（ミリ秒） */
    processingTimeMs: number;
    /** 生成の信頼度（0.0〜1.0） */
    confidence: number;
    /** 使用したモデル名 */
    model: string;
  };
  /** エラーコード（失敗時） */
  code?: string;
  /** エラーメッセージ（失敗時） */
  message?: string;
  /** 詳細エラー情報（失敗時） */
  details?: {
    /** フィールド別のエラーメッセージ */
    fieldErrors?: Record<string, string[]>;
  };
}

/**
 * 体型変化画像生成のパラメータ
 * @description Gemini AIを使用した体型変化画像生成に必要な全パラメータ
 */
export interface BodyShapeGenerationOptions {
  /**
   * 入力画像のBase64文字列
   * @description data:image/png;base64,などのプレフィックスは含まない
   */
  imageBase64: string;
  /**
   * 入力画像のMIMEタイプ
   * @example "image/png", "image/jpeg", "image/webp"
   */
  mimeType: string;
  /**
   * 対象人物の現在の体格情報
   * @description 身長・現在体重を含む基準情報
   */
  subject: Subject;
  /**
   * 生成したい目標体重の配列
   * @description 1〜2個の目標体重を並列生成可能
   */
  targets: TargetWeight[];
  /**
   * 追加オプション設定
   * @description 出力形式やシード値などの制御パラメータ
   */
  options: BodyShapeOptions;
}

/**
 * 体型変化画像生成の結果
 * @description 生成の成否、画像データ、メタ情報を含む結果オブジェクト
 */
export interface BodyShapeGenerationResult {
  /** 処理の成否フラグ */
  success: boolean;
  /**
   * 生成された画像の配列
   * @description 成功時のみ設定される。複数ターゲット指定時は複数の画像を含む
   */
  images?: GeneratedImage[];
  /**
   * 処理メタデータ
   * @description 成功時に処理時間や使用モデル等の情報を含む
   */
  metadata?: {
    /** 処理時間（ミリ秒） */
    processingTimeMs: number;
    /** 生成の信頼度（0.0〜1.0） */
    confidence: number;
    /** 使用したAIモデル名 */
    model: string;
    /** 部分的に失敗した生成の数 */
    partialFailures?: number;
  };
  /**
   * エラーメッセージ
   * @description 失敗時のエラー内容
   */
  error?: string;
}

/**
 * 体型変化プロンプト設定
 * @deprecated 現在使用されていない
 * @description 将来のプロンプトカスタマイズ機能用に予約
 */
export interface BodyShapeTransformationPrompt {
  /** 基本プロンプト */
  basePrompt: string;
  /**
   * 変化の種類
   * - "slimmer": 痩せる方向の変化
   * - "heavier": 太る方向の変化
   */
  transformationType: 'slimmer' | 'heavier';
  /**
   * 変化の強度レベル
   * @description 0.0〜1.0の範囲で指定（高いほど変化が大きい）
   */
  intensityLevel: number;
}
