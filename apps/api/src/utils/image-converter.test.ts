import { describe, it, expect, vi } from 'vitest';
import { fileToBase64, ImageConversionError } from './image-converter';

describe('image-converter', () => {
  describe('fileToBase64', () => {
    // 正常系テスト
    describe('正常系', () => {
      it('JPEGファイルを正しくBase64に変換できる', async () => {
        const mockFile = new File(['test image data'], 'test.jpg', {
          type: 'image/jpeg',
        });

        const arrayBufferSpy = vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('test image data').buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe(btoa('test image data'));
        expect(arrayBufferSpy).toHaveBeenCalledTimes(1);
      });

      it('PNGファイルを正しくBase64に変換できる', async () => {
        const mockFile = new File(['png image data'], 'test.png', {
          type: 'image/png',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('png image data').buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe(btoa('png image data'));
      });

      it('WebPファイルを正しくBase64に変換できる', async () => {
        const mockFile = new File(['webp image data'], 'test.webp', {
          type: 'image/webp',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('webp image data').buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe(btoa('webp image data'));
      });

      it('バイナリデータを含むファイルを正しく変換できる', async () => {
        const binaryData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
        const mockFile = new File([binaryData], 'test.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(binaryData.buffer);

        const result = await fileToBase64(mockFile);

        const expectedBase64 = btoa(String.fromCharCode(...binaryData));
        expect(result).toBe(expectedBase64);
      });

      it('空のファイルを変換できる', async () => {
        const mockFile = new File([''], 'empty.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new ArrayBuffer(0)
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe('');
      });
    });

    // 境界値テスト
    describe('境界値', () => {
      it('1バイトのファイルを変換できる', async () => {
        const mockFile = new File(['a'], 'small.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('a').buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe(btoa('a'));
      });

      it('大きなファイル（10MB）を変換できる', async () => {
        const largeData = new Uint8Array(10 * 1024 * 1024).fill(65); // 10MB of 'A'
        const mockFile = new File([largeData], 'large.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(largeData.buffer);

        const result = await fileToBase64(mockFile);

        expect(result).toContain('QUFB'); // Base64 for 'AAA'
        expect(result.length).toBeGreaterThan(10000000);
      });

      it('特殊文字を含むファイル名のファイルを変換できる', async () => {
        const mockFile = new File(['test data'], 'テスト画像.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('test data').buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe(btoa('test data'));
      });
    });

    // 異常系テスト
    describe('異常系', () => {
      it('nullを渡した場合エラーをスローする', async () => {
        await expect(fileToBase64(null as any)).rejects.toThrow(ImageConversionError);
        await expect(fileToBase64(null as any)).rejects.toThrow('有効なファイルオブジェクトが必要です');
      });

      it('undefinedを渡した場合エラーをスローする', async () => {
        await expect(fileToBase64(undefined as any)).rejects.toThrow(ImageConversionError);
        await expect(fileToBase64(undefined as any)).rejects.toThrow('有効なファイルオブジェクトが必要です');
      });

      it('Fileオブジェクト以外を渡した場合エラーをスローする', async () => {
        await expect(fileToBase64({} as any)).rejects.toThrow(ImageConversionError);
        await expect(fileToBase64('not a file' as any)).rejects.toThrow(ImageConversionError);
        await expect(fileToBase64(123 as any)).rejects.toThrow(ImageConversionError);
      });

      it('arrayBuffer()がエラーをスローした場合、適切なエラーメッセージを返す', async () => {
        const mockFile = new File(['test'], 'test.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockRejectedValue(new Error('Read error'));

        await expect(fileToBase64(mockFile)).rejects.toThrow(ImageConversionError);
        await expect(fileToBase64(mockFile)).rejects.toThrow('ファイルの読み込みに失敗しました: Read error');
      });

      it('arrayBuffer()がnullを返した場合エラーをスローする', async () => {
        const mockFile = new File(['test'], 'test.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(null as any);

        await expect(fileToBase64(mockFile)).rejects.toThrow(ImageConversionError);
        await expect(fileToBase64(mockFile)).rejects.toThrow('ファイルの内容を読み込めませんでした');
      });

      it('Uint8Array変換でエラーが発生した場合エラーをスローする', async () => {
        const mockFile = new File(['test'], 'test.jpg', {
          type: 'image/jpeg',
        });

        // arrayBufferをモックして異常な値を返す
        vi.spyOn(mockFile, 'arrayBuffer').mockImplementation(() => {
          throw new Error('Buffer conversion failed');
        });

        await expect(fileToBase64(mockFile)).rejects.toThrow(ImageConversionError);
        await expect(fileToBase64(mockFile)).rejects.toThrow('ファイルの読み込みに失敗しました: Buffer conversion failed');
      });
    });

    // エッジケース
    describe('エッジケース', () => {
      it('Base64パディングが必要なデータを正しく変換できる', async () => {
        const data = 'ab'; // 2バイトなのでパディングが必要
        const mockFile = new File([data], 'test.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode(data).buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe('YWI='); // 'ab'のBase64エンコード
        expect(result).toMatch(/=$/); // パディング文字で終わる
      });

      it('日本語を含むデータを正しく変換できる', async () => {
        const data = '画像データ';
        const mockFile = new File([data], 'test.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode(data).buffer
        );

        const result = await fileToBase64(mockFile);

        // UTF-8エンコードされた日本語のBase64
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      });

      it('連続して同じファイルを変換しても正しい結果を返す', async () => {
        const mockFile = new File(['test data'], 'test.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('test data').buffer
        );

        const result1 = await fileToBase64(mockFile);
        const result2 = await fileToBase64(mockFile);
        const result3 = await fileToBase64(mockFile);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toBe(btoa('test data'));
      });

      it('異なるファイルを並行して変換できる', async () => {
        const file1 = new File(['data1'], 'test1.jpg', { type: 'image/jpeg' });
        const file2 = new File(['data2'], 'test2.jpg', { type: 'image/jpeg' });
        const file3 = new File(['data3'], 'test3.jpg', { type: 'image/jpeg' });

        vi.spyOn(file1, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('data1').buffer
        );
        vi.spyOn(file2, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('data2').buffer
        );
        vi.spyOn(file3, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('data3').buffer
        );

        const [result1, result2, result3] = await Promise.all([
          fileToBase64(file1),
          fileToBase64(file2),
          fileToBase64(file3),
        ]);

        expect(result1).toBe(btoa('data1'));
        expect(result2).toBe(btoa('data2'));
        expect(result3).toBe(btoa('data3'));
      });
    });

    // セキュリティテスト
    describe('セキュリティ', () => {
      it('悪意のあるスクリプトを含むファイル名を安全に処理できる', async () => {
        const mockFile = new File(['safe data'], '<script>alert("XSS")</script>.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('safe data').buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe(btoa('safe data'));
      });

      it('SQLインジェクションを試みるファイル名を安全に処理できる', async () => {
        const mockFile = new File(['safe data'], "'; DROP TABLE users; --.jpg", {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
          new TextEncoder().encode('safe data').buffer
        );

        const result = await fileToBase64(mockFile);

        expect(result).toBe(btoa('safe data'));
      });
    });

    // パフォーマンステスト
    describe('パフォーマンス', () => {
      it('変換処理が妥当な時間内に完了する', async () => {
        const largeData = new Uint8Array(5 * 1024 * 1024); // 5MB
        const mockFile = new File([largeData], 'large.jpg', {
          type: 'image/jpeg',
        });

        vi.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(largeData.buffer);

        const startTime = Date.now();
        await fileToBase64(mockFile);
        const endTime = Date.now();

        const elapsedTime = endTime - startTime;
        expect(elapsedTime).toBeLessThan(5000); // 5秒以内
      });
    });
  });

  describe('ImageConversionError', () => {
    it('カスタムエラークラスが正しく機能する', () => {
      const error = new ImageConversionError('テストエラー');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ImageConversionError);
      expect(error.message).toBe('テストエラー');
      expect(error.name).toBe('ImageConversionError');
    });

    it('スタックトレースが保持される', () => {
      const error = new ImageConversionError('スタックトレーステスト');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ImageConversionError');
      expect(error.stack).toContain('スタックトレーステスト');
    });
  });
});