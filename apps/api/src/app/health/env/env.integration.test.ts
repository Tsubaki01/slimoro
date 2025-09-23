import { describe, it, expect } from 'vitest';

describe('Environment Validation Integration Test', () => {
  describe('環境変数検証エンドポイントの基本動作', () => {
    it('開発サーバーでの環境変数検証エンドポイントテスト', async () => {
      // 開発サーバーが起動している場合のテスト
      const devServerUrl = 'http://localhost:8788';

      try {
        const response = await fetch(`${devServerUrl}/health/env`);

        // レスポンスがJSONであることを確認
        const contentType = response.headers.get('content-type');
        expect(contentType).toContain('application/json');

        const data = await response.json();

        // レスポンスの基本構造確認
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('environment');
        expect(data).toHaveProperty('googleCloud');
        expect(data).toHaveProperty('summary');

        // Google Cloud設定の検証結果確認
        expect(data.googleCloud).toHaveProperty('validation');
        expect(data.googleCloud).toHaveProperty('existence');
        expect(data.googleCloud).toHaveProperty('maskedValues');

        // サマリー情報の確認
        expect(data.summary).toHaveProperty('status');
        expect(data.summary).toHaveProperty('message');
        expect(data.summary).toHaveProperty('errors');
        expect(data.summary).toHaveProperty('warnings');

        console.log('✅ 環境変数検証エンドポイントは正常に動作しています');
        console.log(`   ステータス: ${data.summary.status}`);
        console.log(`   メッセージ: ${data.summary.message}`);

        if (data.summary.errors.length > 0) {
          console.log('   エラー:');
          data.summary.errors.forEach((error: string) => console.log(`     - ${error}`));
        }

        if (data.summary.warnings.length > 0) {
          console.log('   警告:');
          data.summary.warnings.forEach((warning: string) => console.log(`     - ${warning}`));
        }

      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log('⚠️  開発サーバーが起動していないため統合テストをスキップします');
          console.log('   統合テストを実行するには:');
          console.log('   1. pnpm api:dev');
          console.log('   2. 別ターミナルでテスト実行');
          console.log('   3. GET /health/env で環境変数確認');
          return;
        }
        throw error;
      }
    });

    it('環境変数設定のガイダンス', () => {
      console.log('\n📋 環境変数設定ガイド:');
      console.log('1. .dev.vars.example を .dev.vars にコピー');
      console.log('2. Google Cloud Service Account認証情報を設定');
      console.log('3. pnpm api:dev で開発サーバー起動');
      console.log('4. http://localhost:8788/health/env で設定確認');
    });
  });
});