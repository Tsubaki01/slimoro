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
```toml
# wrangler.toml
[vars]
ENVIRONMENT = "development"

[env.production.vars]
ENVIRONMENT = "production"
```