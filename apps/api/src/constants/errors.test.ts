import { describe, expect, it } from 'vitest';
import {
  API_ERRORS,
  type ApiErrorKey,
  getErrorByCode,
  getAllErrorCodes,
} from './errors';
import { HTTP_STATUS } from './http-status';

describe('API_ERRORS定義', () => {
  describe('エラー構造の検証', () => {
    it('すべてのエラーがcode、message、httpStatusプロパティを持つ', () => {
      Object.values(API_ERRORS).forEach((error) => {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('httpStatus');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(typeof error.httpStatus).toBe('number');
        expect(error.code.length).toBeGreaterThan(0);
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.httpStatus).toBeGreaterThanOrEqual(100);
        expect(error.httpStatus).toBeLessThan(600);
      });
    });

    it('エラーコードが命名規則に従う', () => {
      const validPattern = /^(VAL|FILE|GEN|AUTH|SYS)\d{3}$/;

      Object.values(API_ERRORS).forEach((error) => {
        expect(error.code).toMatch(validPattern);
      });
    });

    it('各エラーのcodeプロパティとキー名が一致する', () => {
      Object.entries(API_ERRORS).forEach(([key, error]) => {
        expect(error.code).toBe(key);
      });
    });
  });

  describe('エラーコードの一意性', () => {
    it('エラーコードが重複していない', () => {
      const codes = Object.values(API_ERRORS).map((error) => error.code);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('エラーメッセージが重複していない', () => {
      const messages = Object.values(API_ERRORS).map((error) => error.message);
      const uniqueMessages = new Set(messages);

      expect(messages.length).toBe(uniqueMessages.size);
    });
  });

  describe('カテゴリ別検証', () => {
    it('VALカテゴリのエラーが存在する', () => {
      const valErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('VAL')
      );

      expect(valErrors.length).toBeGreaterThan(0);
      valErrors.forEach((error) => {
        expect(error.message).toBeTruthy();
      });
    });

    it('FILEカテゴリのエラーが存在する', () => {
      const fileErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('FILE')
      );

      expect(fileErrors.length).toBeGreaterThan(0);
      fileErrors.forEach((error) => {
        expect(error.message).toBeTruthy();
      });
    });

    it('GENカテゴリのエラーが存在する', () => {
      const genErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('GEN')
      );

      expect(genErrors.length).toBeGreaterThan(0);
      genErrors.forEach((error) => {
        expect(error.message).toBeTruthy();
      });
    });

    it('SYSカテゴリのエラーが存在する', () => {
      const sysErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('SYS')
      );

      expect(sysErrors.length).toBeGreaterThan(0);
      sysErrors.forEach((error) => {
        expect(error.message).toBeTruthy();
      });
    });
  });

  describe('型安全性の検証', () => {
    it('ApiErrorKey型にすべてのエラーコードが含まれる', () => {
      const errorKeys: ApiErrorKey[] = Object.keys(API_ERRORS) as ApiErrorKey[];

      errorKeys.forEach((key) => {
        expect(API_ERRORS[key]).toBeDefined();
        expect(API_ERRORS[key].code).toBe(key);
      });
    });

    it('存在しないエラーキーアクセス時にTypeScriptエラーになる', () => {
      // TypeScriptコンパイル時にエラーになることを確認するためのテスト
      // @ts-expect-error - 存在しないキーへのアクセス
      const invalidError = API_ERRORS.INVALID_KEY;
      expect(invalidError).toBeUndefined();
    });
  });

  describe('ヘルパー関数の検証', () => {
    it('getErrorByCodeが正しいエラーを返す', () => {
      const validCodes = Object.keys(API_ERRORS) as ApiErrorKey[];

      validCodes.forEach((code) => {
        const error = getErrorByCode(code);
        expect(error).toBeDefined();
        expect(error?.code).toBe(code);
        expect(error?.message).toBe(API_ERRORS[code].message);
      });
    });

    it('getErrorByCodeが存在しないコードでundefinedを返す', () => {
      // @ts-expect-error - 存在しないコード
      const error = getErrorByCode('INVALID_CODE');
      expect(error).toBeUndefined();
    });

    it('getAllErrorCodesがすべてのエラーコードを返す', () => {
      const allCodes = getAllErrorCodes();
      const expectedCodes = Object.keys(API_ERRORS);

      expect(allCodes).toEqual(expectedCodes);
      expect(allCodes.length).toBe(expectedCodes.length);
    });
  });

  describe('エラーメッセージの内容検証', () => {
    it('バリデーションエラーメッセージが適切', () => {
      const val001 = API_ERRORS.VAL001;
      expect(val001.message).toContain('required');

      const val002 = API_ERRORS.VAL002;
      expect(val002.message).toContain('required');

      const val003 = API_ERRORS.VAL003;
      expect(val003.message).toContain('size');
    });

    it('ファイルエラーメッセージが適切', () => {
      const file001 = API_ERRORS.FILE001;
      expect(file001.message.length).toBeGreaterThan(0);
    });

    it('生成エラーメッセージが適切', () => {
      const gen001 = API_ERRORS.GEN001;
      expect(gen001.message).toContain('generate');
    });

    it('システムエラーメッセージが適切', () => {
      const sys001 = API_ERRORS.SYS001;
      expect(sys001.message).toContain('error');
    });
  });

  describe('拡張性の検証', () => {
    it('新しいカテゴリ追加時の命名規則チェック', () => {
      // 将来的なカテゴリ追加をシミュレート
      const futureErrorPatterns = [
        'AUTH001', // 認証エラー（既存）
        'NET001', // ネットワークエラー
        'CACHE001', // キャッシュエラー（5文字カテゴリ）
      ];

      futureErrorPatterns.forEach((pattern) => {
        // 3-5文字カテゴリ + 3桁数字の形式をチェック
        const validPattern = /^[A-Z]{3,5}\d{3}$/;
        expect(pattern).toMatch(validPattern);
      });
    });

    it('エラーコード数の上限チェック', () => {
      // カテゴリあたり999個まで対応可能
      const categories = ['VAL', 'FILE', 'GEN', 'SYS'];

      categories.forEach((category) => {
        const categoryErrors = Object.values(API_ERRORS).filter((error) =>
          error.code.startsWith(category)
        );

        expect(categoryErrors.length).toBeLessThanOrEqual(999);
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のエラーコード検索が高速', () => {
      const startTime = performance.now();

      // 1000回検索を実行
      for (let i = 0; i < 1000; i++) {
        const randomKey = Object.keys(API_ERRORS)[
          Math.floor(Math.random() * Object.keys(API_ERRORS).length)
        ] as ApiErrorKey;
        getErrorByCode(randomKey);
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 1000回の検索が100ms以内に完了することを期待
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('互換性テスト', () => {
    it('既存のエラーコードが変更されていない', () => {
      // 重要: 既存のエラーコードは変更してはならない（後方互換性）
      const criticalErrorCodes = [
        'VAL001',
        'VAL002',
        'VAL003',
        'FILE001',
        'GEN001',
        'SYS001',
      ];

      criticalErrorCodes.forEach((code) => {
        expect(API_ERRORS[code as ApiErrorKey]).toBeDefined();
        expect(API_ERRORS[code as ApiErrorKey].code).toBe(code);
      });
    });
  });

  describe('HTTPステータスコードの検証', () => {
    it('バリデーションエラーが適切なHTTPステータスコードを持つ', () => {
      const valErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('VAL')
      );

      valErrors.forEach((error) => {
        // バリデーションエラーは通常400番台
        expect(error.httpStatus).toBeGreaterThanOrEqual(400);
        expect(error.httpStatus).toBeLessThan(500);
      });
    });

    it('ファイル処理エラーが適切なHTTPステータスコードを持つ', () => {
      const fileErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('FILE')
      );

      fileErrors.forEach((error) => {
        // ファイルエラーは主に400番台
        expect(error.httpStatus).toBeGreaterThanOrEqual(400);
        expect(error.httpStatus).toBeLessThan(600);
      });
    });

    it('生成エラーが適切なHTTPステータスコードを持つ', () => {
      const genErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('GEN')
      );

      genErrors.forEach((error) => {
        // 生成エラーは400番台または500番台
        expect(error.httpStatus).toBeGreaterThanOrEqual(400);
        expect(error.httpStatus).toBeLessThan(600);
      });
    });

    it('認証エラーが適切なHTTPステータスコードを持つ', () => {
      const authErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('AUTH')
      );

      authErrors.forEach((error) => {
        // 認証エラーは主に401や403
        expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.FORBIDDEN]).toContain(
          error.httpStatus
        );
      });
    });

    it('システムエラーが適切なHTTPステータスコードを持つ', () => {
      const sysErrors = Object.values(API_ERRORS).filter((error) =>
        error.code.startsWith('SYS')
      );

      sysErrors.forEach((error) => {
        // システムエラーは主に500番台
        expect(error.httpStatus).toBeGreaterThanOrEqual(500);
        expect(error.httpStatus).toBeLessThan(600);
      });
    });

    it('HTTPステータスコード定数が正しくインポートされている', () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.PAYLOAD_TOO_LARGE).toBe(413);
      expect(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE).toBe(415);
    });
  });
});
