# Slimoro API

SlimoroのバックエンドAPIサーバーです。Cloudflare Workers上で動作し、HonoフレームワークとGoogle Gemini APIを使用しています。

## 技術スタック

- **フレームワーク**: [Hono](https://hono.dev/) - 高速で軽量なWebフレームワーク
- **ランタイム**: [Cloudflare Workers](https://workers.cloudflare.com/) - エッジコンピューティング環境
- **AI**: Google Gemini API - 画像生成AI機能
- **バリデーション**: Zod + @hono/zod-validator
- **テスト**: Vitest
- **ビルドツール**: Wrangler

## 開発コマンド

### 開発サーバー起動

```bash
# ルートディレクトリから
pnpm api:dev

# または apps/api ディレクトリから
pnpm dev
```

開発サーバーは `http://localhost:8788` で起動します。

### ビルド

```bash
# ルートディレクトリから
pnpm api:build

# または apps/api ディレクトリから
pnpm build
```

### テスト

```bash
# ルートディレクトリから
pnpm api:test

# または apps/api ディレクトリから
pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジ付き
pnpm test:coverage
```

### Lint

```bash
# ルートディレクトリから（全プロジェクト対象）
pnpm lint

# API プロジェクトのみ
nx run api:lint
```

### 型チェック

```bash
nx run api:typecheck
```

### デプロイ

```bash
nx run api:deploy
```

## プロジェクト構成

```
apps/api/
├── src/
│   ├── index.ts          # エントリーポイント
│   └── ...
├── wrangler.toml         # Cloudflare Workers設定
├── package.json
├── project.json          # Nx プロジェクト設定
└── tsconfig.json
```

## 環境変数

環境変数は `wrangler.toml` または Cloudflare Workersダッシュボードで設定します。

## API エンドポイント

詳細なAPIドキュメントは開発中のエンドポイントを参照してください。
