# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<language>Japanese</language>
<character_code>UTF-8</character_code>

## Service Overview

このプロジェクトはダイエットAIスマホアプリ「Slimoro」に関するプロジェクトです。
Slimoroは、ダイエットが失敗してしまう人向けのダイエット支援アプリです。AIを使って自分の痩せた姿や太った姿を生成し、それを見ることでダイエットのやる気を継続させることができます。

## 主要機能
- 毎日の体型撮影と体重などの記録機能
- 写真から痩せた姿と太った姿を生成するAI機能
- 体重などのデータをグラフ化する機能

## Development Commands

### API開発コマンド
```bash
# 開発サーバー起動（ポート8788）
pnpm api:dev

# ビルド（デプロイ前の検証）
pnpm api:build

# テスト実行
pnpm api:test

# Lint実行
pnpm api:lint
```

### 全体テストコマンド
```bash
# 全プロジェクトのテスト実行
pnpm test

# 全プロジェクトのテストをウォッチモードで実行
pnpm test:watch

# 変更されたファイルに関連するテストのみ実行
pnpm test:affected
```

## Architecture & Design

### Clean Architecture層構造

1. **Domain層** (`src/domain/`)

   - 純粋なビジネスロジックとエンティティ
   - バリデーション付きValue Objects
   - 外部依存なし
   - Effect-basedエラーハンドリング

2. **Application層** (`src/application/`)

   - ユースケースとビジネスワークフロー
   - リポジトリインターフェース
   - アプリケーション固有のDTO

3. **Infrastructure層** (`src/infrastructure/`)

   - 外部サービス実装
   - データベースリポジトリ
   - サードパーティAPI統合

4. **Interface層** (`src/interface/`)
   - Next.jsルートとAPIエンドポイント
   - Reactコンポーネントとフック
   - UI層のロジック

### 主要な技術スタック

#### フロントエンド
- React Native
- Expo
- Gluestack UI
- Victory Native
- react-native-calendars

#### バックエンド
- Hono
- Cloudflare Workers

#### AI
- Gemini 2.5 Flash Image（Nano Banana） API

#### その他
- Nx  // プロジェクト管理
- pnpm  // パッケージ管理
- TypeScript  // 言語

## Essential Development Guidelines

### 必須参照ドキュメント

開発開始前に必ず以下のドキュメントを読み込んでください：
<!-- 後で追加する -->

### インポート順序（厳守）


## Task Management

### Slimoroタスク管理8原則

実装開始前に必ず`./.claude/todos/`ディレクトリに機能名を含むTODOファイルを作成し、以下の階層構造で段階的にタスクを定義：

```
L1. イシュー解決レベル（プロダクトレベル）
  L2. 機能の追加・更新・削除
    L3. アーキテクチャレベル（レイヤー設計）
      L4. レイヤーごとの実装計画
        L5. 実装フロー詳細
          L6. 実装タスク（100行以内）
```

ステータス記号：

- `[✓]` 完了
- `[→]` 作業中
- `[×]` ブロック

### Slimoro開発ログ10原則

実装開始時に`./.claude/logs/`ディレクトリに日付と機能名を含むログファイル（YYYY-MM-DD\_機能名.md）を作成し、以下を記録：

- 実装時の意図と設計判断の理由
- 技術的課題と解決策
- 設計変更の詳細と影響範囲
- エラー・バグの原因分析と再発防止策

## Development Workflow

### Claude Code使用時の作業手順

1. **関連ドキュメントを並行読み込み**

   - 該当機能を検索
   - `/doc/*.md`を読み込み
   - プロジェクト構造を理解

2. **既存コードパターンを確認**

   - 類似機能の実装を参照
   - アーキテクチャ制約を確認
   - エラーハンドリングパターンを理解

3. **実装・修正作業**
   - ドメイン層から開始
   - 依存関係の方向を遵守
   - テスト駆動開発を実践

### 開発時の必須チェック項目

- 実装TODOsを`/.claude/todos/`に作成

## Critical Implementation Patterns
<!-- 後で追加予定 -->

## Conclusion

このガイドラインと参照ドキュメントに従って、保守性が高く、拡張性のあるコードを開発してください。
