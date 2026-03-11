# 人間関係ナビゲーションアプリ

## プロジェクト概要
東洋・西洋の占術と観察情報を統合し、人間関係のアクションプランを出力するWebアプリ（ローカルMVP）。

## 技術スタック
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Prisma v6 + SQLite (ローカルDB)
- Anthropic SDK (Claude API)
- Vitest (テスト)

## 開発コマンド
```bash
npm run dev        # 開発サーバー起動 (port 3000)
npx next build     # プロダクションビルド
npx vitest run     # テスト実行
npx prisma migrate dev  # DBマイグレーション
npx prisma generate     # Prismaクライアント再生成
```

## 環境変数
`.env.local` に `ANTHROPIC_API_KEY` を設定。
`.env` に `DATABASE_URL="file:./dev.db"` が設定済み。

## ディレクトリ構成
- `src/app/` - Next.js App Routerのページとルート
- `src/lib/divination/` - 占術計算ロジック（星座、数秘術、九星、四柱推命、五行）
- `src/lib/ai/` - AI呼び出し（Haiku/Sonnet）とプロンプト定義
- `src/lib/` - Prismaクライアント、型定義、コスト計算
- `prisma/` - DBスキーマとマイグレーション

## コーディング規約
- コメントは日本語
- TypeScript strictモード
- APIキーはハードコード禁止（環境変数から読み込み）
- コスト可視化は `process.env.NODE_ENV === 'development'` のみ

## AIモデル
- Haiku (`claude-haiku-4-5-20251001`): 相性スコア、バイオリズム（軽量処理）
- Sonnet (`claude-sonnet-4-6`): ディープ相談（アクションプラン生成）
- システムプロンプトに `cache_control: { type: "ephemeral" }` を設定
