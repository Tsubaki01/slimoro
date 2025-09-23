# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<language>Japanese</language>
<character_code>UTF-8</character_code>

## Service Overview

APIサービス層の共通ユーティリティ関数群です。
プロジェクト全体で再利用可能な汎用的な処理を提供します。

## Directory Structure

```
utils/
├── image-converter.ts    # 画像変換ユーティリティ
├── image-converter.test.ts # 画像変換テスト
└── CLAUDE.md            # このファイル
```

## Utility Guidelines

### 設計原則
- 単一責任原則を厳守
- 純粋関数として実装
- 副作用を持たない
- エラーハンドリングを明確に

### テスト要件
- 全関数に対して網羅的なテストを作成
- 正常系・異常系・境界値を網羅
- モックを使用して外部依存を分離

### 命名規則
- ファイル名: kebab-case
- 関数名: camelCase
- 定数: UPPER_SNAKE_CASE

## Import Guidelines

このディレクトリのユーティリティは以下の方法でインポート：
```typescript
import { functionName } from '@/utils/file-name';
```