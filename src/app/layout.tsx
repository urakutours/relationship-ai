import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "人間関係ナビ",
  description: "東洋・西洋の占術と観察情報を統合した人間関係ナビゲーションアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
        {/* ナビゲーションバー */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-indigo-600">
              人間関係ナビ
            </Link>
            <Link
              href="/persons"
              className="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
            >
              人物一覧
            </Link>
            <Link
              href="/persons/new"
              className="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
            >
              人物登録
            </Link>
            <Link
              href="/consult"
              className="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
            >
              ディープ相談
            </Link>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
