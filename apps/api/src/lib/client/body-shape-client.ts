import type { BodyShapeOptions, GeneratedImage,Subject, TargetWeight } from '@/types';
import { Env } from '@/types';

import { GeminiClient } from './gemini-client';

/**
 * プロンプト部品の定数定義
 */

// 体型変化の詳細説明
export const WEIGHT_LOSS_DESCRIPTION = 'Fat is reduced. The body becomes slimmer.';
export const WEIGHT_GAIN_DESCRIPTION = 'The body becomes fuller.';

// 保持指示
export const PRESERVATION_INSTRUCTION = 'No changes to any element other than his/her physique will be permitted.';

// 構造化XMLプロンプトテンプレート
export const STRUCTURED_PROMPT_TEMPLATE = `<subject>
Height: {height} cm, Weight: {currentWeight} kg (BMI: {currentBMI}, {currentCategory})
</subject>

<transformation>
Target weight: {targetWeight} kg (Target BMI: {targetBMI}, {targetCategory})
Change: {weightDiff} kg {direction}. {description}
</transformation>

<bmi_reference>
BMI Categories: Severe thinness (<16.0), Moderate thinness (16.0-16.9), Mild thinness (17.0-18.49), Normal weight (18.5-24.9), Overweight (25.0-29.9), Obesity Class 1 (30.0-34.9), Obesity Class 2 (35.0-39.9), Obesity Class 3 (≥40.0)
</bmi_reference>

<constraints>
{preservationInstruction}
</constraints>`;

/**
 * テンプレート文字列の {key} を対応する値で置換するヘルパー関数
 */
function replaceTemplate(template: string, replacements: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = replacements[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * BMI計算関数
 * @param heightCm 身長（cm）
 * @param weightKg 体重（kg）
 * @returns BMI値（小数点以下1桁まで）
 */
function calculateBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

/**
 * BMI分類判定関数
 * @param bmi BMI値
 * @returns BMI分類の英語表現
 */
function getBMICategory(bmi: number): string {
  if (bmi < 16.0) return 'Severe thinness';
  if (bmi < 17.0) return 'Moderate thinness';
  if (bmi < 18.5) return 'Mild thinness';
  if (bmi < 25.0) return 'Normal weight';
  if (bmi < 30.0) return 'Overweight';
  if (bmi < 35.0) return 'Obesity, Class 1';
  if (bmi < 40.0) return 'Obesity, Class 2';
  return 'Obesity, Class 3';
}

/**
 * プロンプト組み合わせ関数群
 */

/**
 * 構造化プロンプトを生成する（減量・増量共通）
 */
function createStructuredPrompt(subject: Subject, target: TargetWeight): string {
  const currentBMI = calculateBMI(subject.heightCm, subject.currentWeightKg);
  const targetBMI = calculateBMI(subject.heightCm, target.weightKg);
  const currentCategory = getBMICategory(currentBMI);
  const targetCategory = getBMICategory(targetBMI);

  const weightDiff = Math.abs(target.weightKg - subject.currentWeightKg);
  const isWeightLoss = target.weightKg < subject.currentWeightKg;
  const direction = isWeightLoss ? 'lighter' : 'heavier';
  const description = isWeightLoss ? WEIGHT_LOSS_DESCRIPTION : WEIGHT_GAIN_DESCRIPTION;

  return replaceTemplate(STRUCTURED_PROMPT_TEMPLATE, {
    height: subject.heightCm,
    currentWeight: subject.currentWeightKg,
    currentBMI,
    currentCategory,
    targetWeight: target.weightKg,
    targetBMI,
    targetCategory,
    weightDiff,
    direction,
    description,
    preservationInstruction: PRESERVATION_INSTRUCTION
  });
}

/**
 * 対象者情報と目標体重から、構造化された体型変化のプロンプトを生成する。
 */
export function generateBodyShapePrompt(
  subject: Subject,
  target: TargetWeight
): string {
  const weightDiff = target.weightKg - subject.currentWeightKg;

  if (weightDiff === 0) {
    // 体重変化なしの場合はエラーとして扱われるべきだが、
    // プロンプト生成の段階では一応対応しておく
    throw new Error('No body shape change needed when target weight equals current weight');
  }

  return createStructuredPrompt(subject, target);
}

/**
 * 体型変化の画像生成に必要な入力パラメータ。
 */
export type BodyShapeGenerationOptions = {
  /** 入力画像の Base64 文字列 (プレフィックス無し)。 */
  imageBase64: string;
  /** 入力画像の MIME タイプ。例: 'image/png' */
  mimeType: string;
  /** 対象人物情報。身長・現在体重などを含む。 */
  subject: Subject;
  /** 生成したい目標体重の配列 (複数ターゲットを並列生成)。 */
  targets: TargetWeight[];
  /** 追加オプション。強度、背景保持、戻り MIME、seed 等。 */
  options: BodyShapeOptions;
};

/**
 * 体型変化の画像生成結果。
 */
export type BodyShapeGenerationResult = {
  /** 成否フラグ。成功時のみ images が設定される。 */
  success: boolean;
  /** 生成された画像群。 */
  images?: GeneratedImage[];
  /** 実行メタデータ。 */
  metadata?: {
    processingTimeMs: number;
    confidence: number;
    model: string;
    partialFailures?: number;
  };
  /** 失敗時のエラーメッセージ。 */
  error?: string;
};

/**
 * 指定されたターゲット一覧に対し、体型変化画像を生成する。
 * 内部で GeminiClient を利用し、必要に応じて seed を付与する。
 */
export async function generateBodyShapeImages(
  options: BodyShapeGenerationOptions,
  apiKey: string
): Promise<BodyShapeGenerationResult> {
  const { imageBase64, mimeType, subject, targets, options: bodyOptions } = options;

  // 体重変化なしのターゲットをチェック
  const noChangeTargets = targets.filter(target => target.weightKg === subject.currentWeightKg);
  if (noChangeTargets.length > 0) {
    return {
      success: false,
      error: 'Body shape generation is not needed when target weight equals current weight',
    };
  }

  const geminiClient = new GeminiClient(apiKey);
  const startTime = Date.now();
  let failedCount = 0;

  const generatePromises: Array<Promise<GeneratedImage | null>> = targets.map(async (target): Promise<GeneratedImage | null> => {
    try {
      const prompt = generateBodyShapePrompt(subject, target);
      const { success, imageBase64: generatedImageBase64, error } = await geminiClient.generateImage({
        prompt,
        imageBase64,
        mimeType,
        generationConfig: bodyOptions?.seed !== undefined ? { seed: bodyOptions.seed } : undefined,
      });

      if (!success || !generatedImageBase64) {
        throw new Error(error || 'No image generated in response');
      }

      const outputMimeType = bodyOptions?.returnMimeType || 'image/png';
      const generated: GeneratedImage = {
        label: target.label,
        base64: generatedImageBase64,
        mimeType: outputMimeType,
        width: 1024, // Default size, could be extracted from actual image
        height: 1024,
      };
      return generated;
    } catch {
      failedCount++;
      return null;
    }
  });

  const generatedImages: Array<GeneratedImage | null> = await Promise.all(generatePromises);
  const successfulImages: GeneratedImage[] = generatedImages.filter((img): img is GeneratedImage => img !== null);

  if (successfulImages.length === 0) {
    return {
      success: false,
      error: 'All image generations failed',
    };
  }

  const processingTime = Date.now() - startTime;
  const confidence = Math.max(0.8, 1.0 - (failedCount / targets.length) * 0.2);

  return {
    success: true,
    images: successfulImages,
    metadata: {
      processingTimeMs: processingTime,
      confidence,
      model: 'gemini-2.5-flash-image-preview',
      ...(failedCount > 0 && { partialFailures: failedCount }),
    },
  };
}

export function createBodyShapeClient(env: Env['Bindings']) {
  return {
    generateBodyShapeImages: (options: BodyShapeGenerationOptions) =>
      generateBodyShapeImages(options, env.GEMINI_API_KEY),
    generateBodyShapePrompt,
  };
}