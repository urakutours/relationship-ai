"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { CostInfo } from "@/lib/types";

// 天気の選択肢
const WEATHER_OPTIONS = ["晴れ", "曇り", "雨", "雪", "低気圧"] as const;

export default function HomePage() {
  const [weather, setWeather] = useState<string>("晴れ");
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  // セッション中のキャッシュ
  const [cachedWeather, setCachedWeather] = useState<string | null>(null);
  // プロフィール未登録チェック
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfileExists(data.exists ?? false))
      .catch(() => setProfileExists(false));
  }, []);

  // 天気が変わったらキャッシュをクリア
  useEffect(() => {
    if (weather !== cachedWeather) {
      setAdvice(null);
      setCostInfo(null);
    }
  }, [weather, cachedWeather]);

  const fetchAdvice = async () => {
    // 同じ天気のキャッシュがあればスキップ
    if (advice && weather === cachedWeather) return;

    setLoading(true);
    try {
      const res = await fetch("/api/biorhythm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdvice(data.advice);
        setCostInfo(data.costInfo ?? null);
        setCachedWeather(weather);
      } else {
        setAdvice(data.error || "アドバイスを取得できませんでした");
      }
    } catch {
      setAdvice("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          人間関係ナビゲーション
        </h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          東洋・西洋の占術と行動観察を統合し、人間関係の具体的なアクションプランを提案します。
        </p>
      </div>

      {/* プロフィール未登録バナー */}
      {profileExists === false && (
        <Link
          href="/profile"
          className="block bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors"
        >
          <p className="text-amber-800 font-medium">
            まず自分のプロフィールを登録してください
          </p>
          <p className="text-amber-600 text-sm mt-1">
            相性分析やディープ相談の精度が向上します。クリックして設定
          </p>
        </Link>
      )}

      {/* 今日のバイオリズム */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          今日のアドバイス
        </h2>
        <div className="flex items-end gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              今日の天気
            </label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchAdvice}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "生成中..." : "アドバイスを取得"}
          </button>
        </div>

        {advice && (
          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-gray-800 leading-relaxed">{advice}</p>
          </div>
        )}

        {/* コスト表示（開発環境のみ） */}
        {costInfo && (
          <div className="mt-3 p-3 bg-gray-100 rounded text-xs text-gray-500 font-mono">
            <p>
              入力: {costInfo.inputTokens} | 出力: {costInfo.outputTokens} |
              キャッシュ読取: {costInfo.cacheReadTokens} | キャッシュ作成:{" "}
              {costInfo.cacheCreationTokens} | 推定コスト: ¥
              {costInfo.estimatedCostJPY.toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* ナビゲーションカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/persons/new"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            人物を登録する
          </h2>
          <p className="text-sm text-gray-600">
            関わりのある人の情報を登録して、より良い関係構築のヒントを得ましょう。
          </p>
        </Link>

        <Link
          href="/persons"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            人物一覧を見る
          </h2>
          <p className="text-sm text-gray-600">
            登録済みの人物情報と占術分析結果を確認できます。
          </p>
        </Link>

        <Link
          href="/consult"
          className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            ディープ相談
          </h2>
          <p className="text-sm text-gray-600">
            具体的な場面に対するアクションプランをAIが提案します。
          </p>
        </Link>
      </div>
    </div>
  );
}
