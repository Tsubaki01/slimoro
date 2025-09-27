import { Env } from '@/types';
import type { Subject, TargetWeight, BodyShapeOptions, GeneratedImage } from '@/types';
import { GeminiClient } from './gemini-client';

/**
 * プロンプト部品の定数定義
 */

// 基本情報のテンプレート
export const SUBJECT_INFO_TEMPLATE = 'The subject in the photo is {height} cm tall and weighs {currentWeight} kg.';

// 体型変化の指示テンプレート
export const BODY_CHANGE_TEMPLATE = 'Change the subject\'s body shape to one {weightDiff} kg {direction}.';

// 体型変化の詳細説明
export const WEIGHT_LOSS_DESCRIPTION = 'Fat is reduced. The body becomes slimmer.';
export const WEIGHT_GAIN_DESCRIPTION = 'The body becomes fuller.';

// 保持指示
export const PRESERVATION_INSTRUCTION = 'No changes to any element other than his/her physique will be permitted.';

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
 * プロンプト組み合わせ関数群
 */

/**
 * 被写体情報を生成する
 */
function createSubjectInfo(heightCm: number, currentWeightKg: number): string {
  return replaceTemplate(SUBJECT_INFO_TEMPLATE, {
    height: heightCm,
    currentWeight: currentWeightKg
  });
}

/**
 * 体型変化指示を生成する
 */
function createBodyChangeInstruction(weightDiff: number, direction: string): string {
  return replaceTemplate(BODY_CHANGE_TEMPLATE, {
    weightDiff,
    direction
  });
}

/**
 * 減量プロンプトを生成する
 */
function createWeightLossPrompt(subject: Subject, target: TargetWeight): string {
  const weightDiff = subject.currentWeightKg - target.weightKg;
  const subjectInfo = createSubjectInfo(subject.heightCm, subject.currentWeightKg);
  const bodyChange = createBodyChangeInstruction(weightDiff, 'lighter');

  return [
    subjectInfo,
    bodyChange,
    WEIGHT_LOSS_DESCRIPTION,
    PRESERVATION_INSTRUCTION
  ].join(' ');
}

/**
 * 増量プロンプトを生成する
 */
function createWeightGainPrompt(subject: Subject, target: TargetWeight): string {
  const weightDiff = target.weightKg - subject.currentWeightKg;
  const subjectInfo = createSubjectInfo(subject.heightCm, subject.currentWeightKg);
  const bodyChange = createBodyChangeInstruction(weightDiff, 'heavier');

  return [
    subjectInfo,
    bodyChange,
    WEIGHT_GAIN_DESCRIPTION,
    PRESERVATION_INSTRUCTION
  ].join(' ');
}

/**
 * 対象者情報と目標体重から、シンプルな体型変化のプロンプトを生成する。
 */
export function generateBodyShapePrompt(
  subject: Subject,
  target: TargetWeight
): string {
  const weightDiff = target.weightKg - subject.currentWeightKg;

  if (weightDiff < 0) {
    return createWeightLossPrompt(subject, target);
  } else if (weightDiff > 0) {
    return createWeightGainPrompt(subject, target);
  } else {
    // 体重変化なしの場合はエラーとして扱われるべきだが、
    // プロンプト生成の段階では一応対応しておく
    throw new Error('No body shape change needed when target weight equals current weight');
  }
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