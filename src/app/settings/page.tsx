"use client";

export default function SettingsPage() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <h1 className="font-display text-[32px] font-light text-gold tracking-wide">
        設定
      </h1>

      {/* アプリ情報 */}
      <div className="card space-y-3">
        <h2 className="font-display text-base text-gold tracking-wide">アプリ情報</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">バージョン</span>
            <span className="text-text-muted">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">環境</span>
            <span className="text-text-muted">{isDev ? "開発" : "本番"}</span>
          </div>
        </div>
      </div>

      {/* データ管理 */}
      <div className="card space-y-3">
        <h2 className="font-display text-base text-gold tracking-wide">データ管理</h2>
        <p className="text-text-muted text-xs">
          データはローカルのSQLiteデータベースに保存されています。
        </p>
      </div>

      {/* 開発者情報（開発環境のみ） */}
      {isDev && (
        <div className="card space-y-3 border-jade-dim">
          <h2 className="font-display text-base text-jade tracking-wide">開発者ツール</h2>
          <div className="space-y-2 text-sm">
            <p className="text-text-muted text-xs">
              開発環境でのみ表示されます。API使用量は各画面で <code className="text-jade text-[11px]">?debug=true</code> を付けると表示されます。
            </p>
            <a
              href="http://localhost:5555"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-jade text-xs hover:text-gold transition-colors"
            >
              Prisma Studio を開く →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
