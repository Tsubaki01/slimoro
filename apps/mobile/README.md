# Slimoro Mobile

Slimoroのモバイルアプリケーションです。React NativeとExpoを使用して、iOS・Android・Webに対応したクロスプラットフォームアプリを構築しています。

## 技術スタック

- **フレームワーク**: [React Native](https://reactnative.dev/) - クロスプラットフォームモバイル開発
- **開発プラットフォーム**: [Expo](https://expo.dev/) (~54.0.12) - React Native開発ツール
- **ルーティング**: [Expo Router](https://docs.expo.dev/router/introduction/) (~6.0.10) - ファイルベースルーティング
- **ナビゲーション**: [@react-navigation](https://reactnavigation.org/) - ナビゲーションライブラリ
- **UI**: React Native + Expo標準コンポーネント
- **アニメーション**: react-native-reanimated, react-native-gesture-handler
- **言語**: TypeScript (~5.9.2)

## 開発コマンド

### 開発サーバー起動

```bash
# ルートディレクトリから
pnpm mobile:start

# または apps/mobile ディレクトリから
pnpm start
```

起動後、以下の方法でアプリを実行できます：
- `a` - Androidエミュレーター/実機で開く
- `i` - iOSシミュレーター/実機で開く
- `w` - Webブラウザで開く
- QRコード - Expo Goアプリでスキャン

### プラットフォーム別起動

```bash
# Android
pnpm mobile:android

# iOS
pnpm mobile:ios

# Web
pnpm mobile:web
```

### ビルド・プリビルド

```bash
# ネイティブプロジェクトの生成
pnpm mobile:prebuild

# または
nx run mobile:prebuild
```

### Lint

```bash
# ルートディレクトリから
pnpm mobile:lint

# または apps/mobile ディレクトリから
pnpm lint
```

## プロジェクト構成

```
apps/mobile/
├── app/                  # Expo Routerのルート（ファイルベースルーティング）
│   ├── (tabs)/          # タブナビゲーション
│   ├── +not-found.tsx   # 404ページ
│   └── _layout.tsx      # ルートレイアウト
├── assets/              # 画像・フォントなどの静的リソース
├── components/          # 再利用可能なReactコンポーネント
├── constants/           # 定数定義
├── hooks/               # カスタムフック
├── scripts/             # ビルド・開発用スクリプト
├── app.json             # Expo設定
├── package.json
├── project.json         # Nx プロジェクト設定
└── tsconfig.json
```

## 開発環境のセットアップ

### 前提条件

- Node.js (推奨: v20以上)
- pnpm
- iOS開発の場合: Xcode (macOSのみ)
- Android開発の場合: Android Studio

### 初回セットアップ

1. 依存関係のインストール（プロジェクトルートで実行）:
```bash
pnpm install
```

2. 開発サーバーの起動:
```bash
pnpm mobile:start
```

## Expo Router について

このプロジェクトでは[Expo Router](https://docs.expo.dev/router/introduction/)を使用しています。

- `app/` ディレクトリ内のファイル構造がそのままルーティングになります
- `(tabs)/` のような括弧付きディレクトリはグループ化のためのもので、URLには含まれません
- `_layout.tsx` はレイアウトコンポーネントを定義します

## デバッグ

開発中は以下のツールが利用できます：
- **React DevTools**: デバッグ用
- **Expo Go**: 実機でのクイックテスト
- **Development Build**: より本番に近い環境でのテスト

## 参考リンク

- [Expo公式ドキュメント](https://docs.expo.dev/)
- [React Nativeドキュメント](https://reactnative.dev/docs/getting-started)
- [Expo Routerガイド](https://docs.expo.dev/router/introduction/)
