# RelationshipAI - 人間関係ナビゲーションアプリ

東洋・西洋の占術と観察情報を統合し、人間関係のアクションプランを出力するアプリ。

## 技術スタック

- Next.js 16 / TypeScript / Tailwind CSS v4
- PostgreSQL（Supabase）/ Prisma v6
- Anthropic Claude API（Haiku + Sonnet）

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local に値を設定
npx prisma migrate dev --name init
npm run dev
```

## デプロイ手順

### 前提

- Vercelアカウント（GitHubのrelationship-aiリポジトリ接続済み）
- Supabaseプロジェクト作成済み

### Supabase接続情報の取得

- **DATABASE_URL**: Supabase → Settings → Database → Connection string (URI)
  - Transaction mode (port 6543) を使用
- **DIRECT_URL**: Supabase → Settings → Database → Connection string (URI)
  - Session mode (port 5432) を使用

### 手順

1. Supabaseダッシュボードから接続情報を取得
2. Vercelダッシュボード → Settings → Environment Variables に設定:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `ANTHROPIC_API_KEY`
   - `BETA_PASSWORD`（ベータテスト用ログインパスワード）
   - `ADMIN_PASSWORD`（コスト管理画面のパスワード）
   - `NEXT_PUBLIC_APP_ENV=production`
   - `DAILY_API_LIMIT=100`（任意、APIレート制限）
3. Vercelダッシュボード → Settings → General → Root Directory がプロジェクトルートになっていることを確認
4. GitHubにpush → 自動デプロイ
5. デプロイ後、Vercelの提供するURLでアクセス
6. ログイン画面で`BETA_PASSWORD`を入力
7. コスト管理画面: `/admin/costs?admin=ADMIN_PASSWORD` でアクセス

### 注意事項

- Vercelの無料プラン（Hobby）で十分
- SupabaseのFreeプランで十分（テスト用）
- 本番リリース時にSupabase Auth + Stripe課金に置き換え予定
