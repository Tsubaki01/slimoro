# Slimoro

**Slimoro（スリモロ）** は、ダイエットが続かない人向けのAI搭載ダイエット支援スマートフォンアプリです。

## 主要機能

- **毎日の体型撮影と記録**: 体重、体脂肪率などの健康データを簡単に記録
- **AI画像生成**: 現在の写真から「痩せた未来の姿」と「太った未来の姿」をAIが自動生成
- **データ可視化**: 体重や体脂肪率の推移をグラフで確認
- **モチベーション維持**: AI生成画像を見ることで、ダイエットのやる気を継続

## プロジェクト構成

このリポジトリは[Nx](https://nx.dev)を使用したモノレポ構成で、以下のアプリケーションとパッケージを含みます：

```
slimoro/
├── apps/
│   ├── api/          # バックエンドAPI (Cloudflare Workers + Hono)
│   └── mobile/       # モバイルアプリ (React Native + Expo)
└── packages/         # 共有パッケージ（将来的に追加予定）
```

## 技術スタック

### フロントエンド（Mobile）
- React Native
- Expo (~54.0.12)
- Expo Router
- TypeScript

### バックエンド（API）
- Hono (Webフレームワーク)
- Cloudflare Workers
- Google Gemini API (AI画像生成)
- Zod (バリデーション)

### 開発ツール
- Nx (モノレポ管理)
- pnpm (パッケージマネージャー)
- Vitest (テスト)
- ESLint (Lint)
- TypeScript

## セットアップ

### 前提条件

- Node.js v20以上
- pnpm

### インストール

```bash
# 依存関係のインストール
pnpm install
```

## 開発コマンド

### モバイルアプリ開発

```bash
# 開発サーバー起動
pnpm mobile:start

# Android
pnpm mobile:android

# iOS
pnpm mobile:ios

# Web
pnpm mobile:web

# Lint
pnpm mobile:lint
```

詳細は [apps/mobile/README.md](apps/mobile/README.md) を参照してください。

### API開発

```bash
# 開発サーバー起動（ポート8788）
pnpm api:dev

# ビルド
pnpm api:build

# テスト
pnpm api:test
```

詳細は [apps/api/README.md](apps/api/README.md) を参照してください。

### 全体コマンド

```bash
# すべてのプロジェクトのLint
pnpm lint

# Lint自動修正
pnpm lint:fix

# すべてのプロジェクトの型チェック
pnpm typecheck

# すべてのプロジェクトのビルド
pnpm build

# すべてのプロジェクトのテスト
pnpm test

# テスト（ウォッチモード）
pnpm test:watch

# 変更されたプロジェクトのみテスト
pnpm test:affected
```

## プロジェクトグラフの可視化

```bash
npx nx graph
```

Nxの依存関係グラフを視覚的に確認できます。

## Nx について

このプロジェクトは[Nx](https://nx.dev)を使用しています。Nxは以下の機能を提供します：

- **モノレポ管理**: 複数のアプリケーションとライブラリを1つのリポジトリで管理
- **タスク実行の最適化**: 影響を受けるプロジェクトのみをテスト・ビルド
- **キャッシング**: ビルドやテストの結果をキャッシュして高速化
- **依存関係の可視化**: プロジェクト間の依存関係をグラフで表示

### Nxの便利なコマンド

```bash
# 特定のプロジェクトのタスク実行
npx nx <target> <project-name>

# 例: APIのテスト
npx nx test api

# 例: モバイルアプリのLint
npx nx lint mobile

# 影響を受けるプロジェクトのみテスト
npx nx affected -t test

# TypeScriptプロジェクト参照の同期
npx nx sync

# CI環境での同期チェック
npx nx sync:check
```

## 開発ガイドライン

このプロジェクトでは以下のガイドラインに従って開発を進めてください：

- **CLAUDE.md**: プロジェクト固有の開発ガイドラインは [CLAUDE.md](CLAUDE.md) を参照
- **TDD**: テスト駆動開発を推奨
- **Clean Architecture**: ドメイン層、アプリケーション層、インフラ層、インターフェース層の分離

## ライセンス

MIT
