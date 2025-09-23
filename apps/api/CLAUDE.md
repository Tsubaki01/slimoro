# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<language>Japanese</language>
<character_code>UTF-8</character_code>

## Service Overview

SlimoroプロジェクトのAPIサービス層です。
Hono frameworkとCloudflare Workersを使用して構築されています。

## Architecture

### ディレクトリ構造
```
apps/api/
├── src/
│   ├── index.ts        # エントリーポイント
│   ├── app/         # APIルート定義
│   ├── middleware/     # ミドルウェア
│   ├── lib/           # ユーティリティ
│   └── types/         # 型定義
├── tests/             # テストファイル
├── wrangler.toml      # Cloudflare Workers設定
└── vitest.config.ts   # テスト設定
```

### 主要技術スタック
- **Framework**: Hono v4
- **Runtime**: Cloudflare Workers
- **AI SDK**: @ai-sdk/google-vertex (Vertex AI)
- **Validation**: Zod + @hono/zod-validator
- **Testing**: Vitest
- **Build**: Vite + Wrangler

## Development Commands

```bash
# 開発サーバー起動
pnpm nx serve api

# ビルド
pnpm nx build api

# テスト実行
pnpm nx test api

# 型チェック
pnpm nx typecheck api

# Cloudflare Workersへデプロイ
pnpm nx deploy api
```

## API Design Principles

### RESTful API設計
- 適切なHTTPメソッドの使用
- ステータスコードの正確な返却
- JSONレスポンス形式の統一

### エラーハンドリング
```typescript
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // Optional
  }
}
```

### バリデーション
Zodスキーマによる入力検証を徹底

## Testing Guidelines

### TDD原則
1. テストファースト開発
2. 全ケース網羅（正常系・異常系・境界値）
3. モックを使用した外部依存の分離

### テストファイル命名規則
- ユニットテスト: `*.test.ts`
- 統合テスト: `*.integration.test.ts`

## Security Considerations

- CORS設定の適切な管理
- 入力値のサニタイゼーション
- レート制限の実装
- 環境変数によるシークレット管理

## Deployment

### 環境
- Development: `wrangler dev`
- Staging: 自動デプロイ（ブランチプッシュ時）
- Production: 手動デプロイ（タグ作成時）

### 環境変数
- 開発環境: ルートの``./.dev.vars``で設定
- 本番環境: Cloudflare Workersのダッシュボードで設定

### Vertex AI 設定
画像生成にはGoogle Cloud Service Account認証が必要です。

**環境変数の設定:**
- `GOOGLE_CLIENT_EMAIL`: サービスアカウントのメールアドレス
- `GOOGLE_PRIVATE_KEY`: サービスアカウントの秘密鍵
- `GOOGLE_PRIVATE_KEY_ID`: 秘密鍵ID（オプション）
- `GOOGLE_LOCATION`: Vertex AIロケーション（オプション）

### 地理情報ベースの動的ロケーション選択

`GOOGLE_LOCATION`が設定されていない場合、Cloudflareの地理情報から最適なVertex AIリージョンを自動選択します。

**優先順位:**
1. 環境変数での明示的設定（`GOOGLE_LOCATION`）
2. Cloudflare Coloコードからのマッピング
3. 国コードからのマッピング
4. 大陸コードからのマッピング
5. デフォルト値（`us-central1`）

**地理的マッピング例:**
- 日本（NRT）→ `asia-northeast1`
- シンガポール（SIN）→ `asia-southeast1`
- ダラス（DFW）→ `us-central1`
- ロンドン（LHR）→ `europe-west2`

この機能により、ユーザーの地理的位置に最も近いVertex AIリージョンが自動選択され、レイテンシーが最小化されます。

**サポートされているモデル:**
- imagen-3.0-generate-001
- imagen-3.0-generate-002
- imagen-3.0-fast-generate-001
- imagen-4.0-generate-preview-06-06
- imagen-4.0-fast-generate-preview-06-06
- imagen-4.0-ultra-generate-preview-06-06