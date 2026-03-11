import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SidebarNav } from "./sidebar-nav";

export const metadata: Metadata = {
  title: "Relationship AI",
  description: "東洋・西洋の占術と観察情報を統合した人間関係ナビゲーションアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex">
        {/* 左サイドバー */}
        <aside className="w-[240px] min-h-screen bg-surface border-r border-border-subtle flex flex-col fixed top-0 left-0">
          {/* ロゴ */}
          <div className="px-6 pt-8 pb-6">
            <Link href="/" className="block">
              <h1 className="font-display text-[22px] font-semibold tracking-[0.08em] text-gold uppercase leading-tight">
                Relationship<br />AI
              </h1>
              <p className="text-[11px] text-text-secondary mt-1.5 tracking-[0.15em]">
                人間関係の羅針盤
              </p>
            </Link>
          </div>

          {/* ナビゲーション */}
          <nav className="flex-1 px-3">
            <SidebarNav />
          </nav>

          {/* フッター */}
          <div className="px-6 py-4 border-t border-border-subtle">
            <p className="text-[10px] text-text-muted tracking-wider font-display">
              DIVINATION &times; OBSERVATION
            </p>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="ml-[240px] flex-1 min-h-screen">
          <div className="max-w-4xl mx-auto px-10 py-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
