export interface Subject {
  heightCm: number;
  currentWeightKg: number;
}

export interface TargetWeight {
  weightKg: number;
  label?: string;
}

export interface BodyShapeOptions {
  returnMimeType?: 'image/png' | 'image/jpeg';
  preserveBackground?: boolean;
  seed?: number;
}

export interface BodyShapeGenerationRequest {
  image: File;
  subject: Subject;
  targets: TargetWeight[];
  options?: BodyShapeOptions;
}

export interface GeneratedImage {
  label?: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface BodyShapeGenerationResponse {
  success: boolean;
  images?: GeneratedImage[];
  metadata?: {
    processingTimeMs: number;
    confidence: number;
    model: string;
  };
  code?: string;
  message?: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
  };
}

export interface BodyShapeGenerationOptions {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

export interface BodyShapeTransformationPrompt {
  basePrompt: string;
  transformationType: 'slimmer' | 'heavier';
  intensityLevel: number;
}