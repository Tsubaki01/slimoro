import { Env } from '@/types';
import type { Subject, TargetWeight, BodyShapeOptions, GeneratedImage } from '@/types';
import { GeminiClient } from './gemini-client';

/**
 * 体型変化の英語プロンプト定数。
 * 役割: 体型変化の最終プロンプト文面のテンプレート。
 * 日本語訳:
 * - この人物の体型が {strengthModifier} {transformationDescriptor}{safetyModifier} に見えるように変換してください。
 * - 変換は自然で現実的で、体格に釣り合うものにしてください。
 * - 顔立ち、服装、ポーズはそのまま維持してください。
 * - {backgroundInstruction}
 * - 結果は照明と影が一貫した自然な写真として見えるようにしてください。
 */
export const BODY_SHAPE_PROMPT_TEMPLATE = `Transform this person's body to appear {strengthModifier} {transformationDescriptor}{safetyModifier}.
The transformation should look natural, realistic, and proportional to their body frame.
Maintain facial features, clothing, and pose exactly as shown.
{backgroundInstruction}
Ensure the result appears as a natural photograph with consistent lighting and shadows.`;

/**
 * 背景保持の指示プロンプト。
 * 役割: 背景を完全に維持するように指示する固定文。
 * 日本語訳: 背景を完全に変更せず、すべての環境ディテールを保持してください。
 */
export const BACKGROUND_KEEP_INSTRUCTION = 'Keep the background completely unchanged and preserve all environmental details.';

/**
 * 背景を大きく変えず構図維持の指示プロンプト。
 * 役割: シーンの構図を維持しつつ体型変化に集中させる固定文。
 * 日本語訳: 体型の変化に集中しつつ、全体のシーン構図を維持してください。
 */
export const BACKGROUND_MAINTAIN_INSTRUCTION = 'Maintain the overall scene composition while focusing on the body transformation.';

/**
 * テンプレート中の {key} を対応する値で置換する軽量ユーティリティ。
 */
function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : '';
  });
}

/**
 * 強度修飾子 (strength modifier)。
 * 役割: 変化の強さを表す副詞を統一管理。
 * 日本語訳: high=劇的に, medium=大きく, low=適度に。
 */
export const STRENGTH_MODIFIER_HIGH = 'dramatically';
export const STRENGTH_MODIFIER_MEDIUM = 'significantly';
export const STRENGTH_MODIFIER_LOW = 'moderately';

/**
 * 変化の説明 (transformation descriptor)。
 * 役割: 体型変化の方向・度合いを定型文で表現。
 * 日本語訳の要旨:
 * - MAINTAIN: 現状維持で最小限の調整
 * - SLIMMER_(HIGH/MEDIUM/LOW): 劇的/目に見える/わずかな減量
 * - HEAVIER_(HIGH/MEDIUM/LOW): 大きく/目に見える/適度な増量
 */
export const TRANSFORMATION_DESCRIPTOR_MAINTAIN = 'current body shape with minimal adjustments';
export const TRANSFORMATION_DESCRIPTOR_SLIMMER_HIGH = 'dramatically thinner and more toned';
export const TRANSFORMATION_DESCRIPTOR_SLIMMER_MEDIUM = 'noticeably slimmer with visible weight loss';
export const TRANSFORMATION_DESCRIPTOR_SLIMMER_LOW = 'slightly thinner with subtle weight loss';
export const TRANSFORMATION_DESCRIPTOR_HEAVIER_HIGH = 'significantly fuller and heavier';
export const TRANSFORMATION_DESCRIPTOR_HEAVIER_MEDIUM = 'noticeably heavier with visible weight gain';
export const TRANSFORMATION_DESCRIPTOR_HEAVIER_LOW = 'slightly fuller with moderate weight gain';

/**
 * 安全修飾子 (safety modifier)。
 * 役割: 極端な変化に健康的・自然さの制約を付与する表現。
 * 日本語訳: 健康的で現実的/自然で健康的な形で。
 */
export const SAFETY_MODIFIER_HEALTHY_REALISTIC = ' in a healthy and realistic way';
export const SAFETY_MODIFIER_NATURAL_HEALTHY = ' in a natural and healthy way';

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
 * 体型変化のプロンプト生成と画像生成を行う高水準クライアント。
 * - 複数ターゲットを並列に生成
 * - seed を指定可能 (Gemini 側の generationConfig を委譲)
 */
export class BodyShapeClient {
  private geminiClient: GeminiClient;

  constructor(apiKey: string) {
    this.geminiClient = new GeminiClient(apiKey);
  }

  /**
   * 対象者情報と目標体重から、自然で安全な体型変化のプロンプトを生成する。
   */
  generateBodyShapePrompt(
    subject: Subject,
    target: TargetWeight,
    options?: BodyShapeOptions
  ): string {
    const currentBMI = this.calculateBMI(subject.heightCm, subject.currentWeightKg);
    const targetBMI = this.calculateBMI(subject.heightCm, target.weightKg);
    const bmiDiff = targetBMI - currentBMI;
    const intensity = this.calculateIntensity(currentBMI, targetBMI);
    const strength = options?.strength ?? 0.7;

    let transformationDescriptor: string;
    let safetyModifier = '';

    if (Math.abs(bmiDiff) < 0.5) {
      transformationDescriptor = TRANSFORMATION_DESCRIPTOR_MAINTAIN;
    } else if (bmiDiff < 0) {
      if (intensity > 0.8) {
        transformationDescriptor = TRANSFORMATION_DESCRIPTOR_SLIMMER_HIGH;
        safetyModifier = SAFETY_MODIFIER_HEALTHY_REALISTIC;
      } else if (intensity > 0.5) {
        transformationDescriptor = TRANSFORMATION_DESCRIPTOR_SLIMMER_MEDIUM;
      } else {
        transformationDescriptor = TRANSFORMATION_DESCRIPTOR_SLIMMER_LOW;
      }
    } else {
      if (intensity > 0.8) {
        transformationDescriptor = TRANSFORMATION_DESCRIPTOR_HEAVIER_HIGH;
        safetyModifier = SAFETY_MODIFIER_NATURAL_HEALTHY;
      } else if (intensity > 0.5) {
        transformationDescriptor = TRANSFORMATION_DESCRIPTOR_HEAVIER_MEDIUM;
      } else {
        transformationDescriptor = TRANSFORMATION_DESCRIPTOR_HEAVIER_LOW;
      }
    }

    const strengthModifier = strength > 0.8
      ? STRENGTH_MODIFIER_HIGH
      : strength > 0.5
        ? STRENGTH_MODIFIER_MEDIUM
        : STRENGTH_MODIFIER_LOW;
    const backgroundInstruction = options?.preserveBackground
      ? BACKGROUND_KEEP_INSTRUCTION
      : BACKGROUND_MAINTAIN_INSTRUCTION;

    return fillTemplate(BODY_SHAPE_PROMPT_TEMPLATE, {
      strengthModifier,
      transformationDescriptor,
      safetyModifier,
      backgroundInstruction,
    });
  }

  /** BMI を算出する (kg/m^2)。 */
  calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  /** 体型変化の強度を 0..1 に正規化して返す。 */
  calculateIntensity(currentBMI: number, targetBMI: number): number {
    const diff = Math.abs(targetBMI - currentBMI);
    return Math.min(diff / 10, 1.0);
  }

  /**
   * 指定されたターゲット一覧に対し、体型変化画像を生成する。
   * 内部で GeminiClient を利用し、必要に応じて seed を付与する。
   */
  async generateBodyShapeImages(
    options: BodyShapeGenerationOptions
  ): Promise<BodyShapeGenerationResult> {
    const { imageBase64, mimeType, subject, targets, options: bodyOptions } = options;
    const startTime = Date.now();
    let failedCount = 0;

    const generatePromises: Array<Promise<GeneratedImage | null>> = targets.map(async (target): Promise<GeneratedImage | null> => {
      try {
        const prompt = this.generateBodyShapePrompt(subject, target, bodyOptions);
        const { success, imageBase64: generatedImageBase64, error } = await this.geminiClient.generateImage({
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
}

export function createBodyShapeClient(env: Env['Bindings']): BodyShapeClient {
  return new BodyShapeClient(env.GEMINI_API_KEY);
}