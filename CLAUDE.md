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
  - `src/app/profile/` - 自分のプロフィール登録ページ
  - `src/app/api/profile/` - プロフィールAPI（GET/POST upsert）
  - `src/app/api/profile/divination/` - プロフィール用占術プレビューAPI
- `src/lib/divination/` - 占術計算ロジック（星座、数秘術、九星、四柱推命、五行）
  - `calcDivinationProfile()` - Person/UserProfile共通の占術計算関数
- `src/lib/ai/` - AI呼び出し（Haiku/Sonnet）とプロンプト定義
- `src/lib/` - Prismaクライアント、型定義、コスト計算
- `prisma/` - DBスキーマとマイグレーション

## 主要モデル
- `Person` - 相手の人物情報
- `Observation` - 人物への観察メモ
- `UserProfile` - 自分のプロフィール（id=1のシングルトン）

## コーディング規約
- コメントは日本語
- TypeScript strictモード
- APIキーはハードコード禁止（環境変数から読み込み）
- コスト可視化は `process.env.NODE_ENV === 'development'` のみ
- 占術計算は `calcDivinationProfile()` を使用（Person/UserProfile共通）
- AI相談時は `MyselfInfo` を含め、myself/target の関係性を考慮する

## AIモデル
- Haiku (`claude-haiku-4-5-20251001`): 相性スコア、バイオリズム（軽量処理）
- Sonnet (`claude-sonnet-4-6`): ディープ相談（アクションプラン生成）
- システムプロンプトに `cache_control: { type: "ephemeral" }` を設定
- 相性スコアAPIは `personId1: "myself"` で自分との相性を計算可能
