# 人間関係ナビゲーションアプリ

## WHY
東洋・西洋の占術と観察情報を統合し、
人間関係のアクションプランを出力するアプリのMVP。

## WHAT
- Next.js 14 / TypeScript / Tailwind CSS
- SQLite（Prisma）
- Anthropic Claude API（Haiku + Sonnet）

## HOW

### コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npx prisma db push   # DBスキーマ反映
npx prisma studio    # DB確認
```

### 重要ルール
- 占術の根拠をUI上に表示しない
- AIへのシステムプロンプトは必ずcache_controlを設定する
- 軽量処理はHaiku、ディープ相談はSonnetを使う
- コスト表示は開発環境のみ

### 主要ファイル
- `src/lib/ai/prompts.ts` — システムプロンプト（変更時は慎重に）
- `src/lib/divination/` — 占術計算ロジック
- `prisma/schema.prisma` — データモデル
