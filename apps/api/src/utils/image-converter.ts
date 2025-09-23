/**
 * 画像変換に関するエラークラス
 */
export class ImageConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageConversionError';
    Object.setPrototypeOf(this, ImageConversionError.prototype);
  }
}

/**
 * FileオブジェクトをBase64文字列に変換する
 *
 * @param file - 変換するFileオブジェクト
 * @returns Base64エンコードされた文字列
 * @throws {ImageConversionError} ファイルの読み込みや変換に失敗した場合
 *
 * @example
 * ```typescript
 * const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
 * const base64 = await fileToBase64(file);
 * ```
 */
export async function fileToBase64(file: File): Promise<string> {
  // 入力検証
  if (!file || !(file instanceof File)) {
    throw new ImageConversionError('有効なファイルオブジェクトが必要です');
  }

  try {
    // ファイルをArrayBufferとして読み込む
    const arrayBuffer = await file.arrayBuffer();

    // ArrayBufferの検証
    if (!arrayBuffer) {
      throw new ImageConversionError('ファイルの内容を読み込めませんでした');
    }

    // Uint8Arrayに変換
    const uint8Array = new Uint8Array(arrayBuffer);

    // 空のファイルの処理
    if (uint8Array.length === 0) {
      return '';
    }

    // Uint8ArrayをBase64文字列に変換
    // String.fromCharCodeを使用してバイナリ文字列を作成
    const binaryString = Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');

    // btoaでBase64エンコード
    return btoa(binaryString);
  } catch (error) {
    // 既にImageConversionErrorの場合はそのままスロー
    if (error instanceof ImageConversionError) {
      throw error;
    }

    // その他のエラーはラップして返す
    throw new ImageConversionError(
      `ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    );
  }
}