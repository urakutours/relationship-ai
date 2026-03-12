"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { CostInfo } from "@/lib/types";

// 天気の選択肢
const WEATHER_OPTIONS = [
  { value: "晴れ", icon: "\u2600\uFE0F" },
  { value: "曇り", icon: "\u2601\uFE0F" },
  { value: "雨", icon: "\uD83C\uDF27\uFE0F" },
] as const;

// 多言語化を考慮した構造
const LOCALE = "ja-JP";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function HomePage() {
  const [weather, setWeather] = useState<string>("晴れ");
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  // セッション中のキャッシュ
  const [cachedWeather, setCachedWeather] = useState<string | null>(null);
  // プロフィール未登録チェック
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  const today = new Date();

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
    <div className="space-y-10">
      {/* 日付表示 */}
      <div className="text-center py-6">
        <p className="font-display text-[56px] font-light text-gold leading-none tracking-wide">
          {today.getMonth() + 1}.{today.getDate()}
        </p>
        <p className="font-display text-lg text-text-secondary mt-1">
          {today.getFullYear()} — {WEEKDAYS[today.getDay()]}曜日
        </p>
        <p className="text-xs text-text-muted mt-1">
          {today.toLocaleDateString(LOCALE, { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* プロフィール未登録バナー */}
      {profileExists === false && (
        <Link
          href="/profile"
          className="block card border-jade-dim hover:border-jade transition-colors duration-300"
        >
          <p className="text-jade text-sm font-medium">
            まず自分のプロフィールを登録してください
          </p>
          <p className="text-text-muted text-xs mt-1">
            相性分析やディープ相談の精度が向上します
          </p>
        </Link>
      )}

      {/* 今日のアドバイス */}
      <div className="card">
        <h2 className="font-display text-xl text-gold mb-5 tracking-wide">
          Today&apos;s Guidance
        </h2>

        <div className="flex items-center gap-6 mb-6">
          {/* 天気選択アイコン */}
          <div className="flex gap-2">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWeather(w.value)}
                className={`
                  w-10 h-10 rounded-[4px] text-lg flex items-center justify-center
                  transition-all duration-200 border
                  ${
                    weather === w.value
                      ? "border-gold bg-gold-subtle"
                      : "border-border-subtle hover:border-gold-dim"
                  }
                `}
              >
                {w.icon}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAdvice}
            disabled={loading}
            className="btn-ghost"
          >
            {loading ? "まとめています..." : "アドバイスを取得"}
          </button>
        </div>

        {/* アドバイス表示 - 巻物風 */}
        {advice && (
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
            <div className="py-5 px-4">
              <p className="text-text-primary leading-[2] text-[15px]">
                {advice}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
          </div>
        )}

        {/* コスト表示（開発環境のみ） */}
        {costInfo && (
          <div className="mt-4 py-2 px-3 bg-base rounded-[4px] text-[10px] text-text-muted font-display tracking-wide">
            IN:{costInfo.inputTokens} | OUT:{costInfo.outputTokens} |
            CACHE_R:{costInfo.cacheReadTokens} | CACHE_W:{costInfo.cacheCreationTokens} |
            COST: &yen;{costInfo.estimatedCostJPY.toFixed(4)}
          </div>
        )}
      </div>

      {/* ナビゲーションカード */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            href: "/persons/new",
            title: "Register",
            subtitle: "人物を登録する",
            desc: "関わりのある人の情報を登録",
          },
          {
            href: "/persons",
            title: "People",
            subtitle: "人物一覧",
            desc: "登録済みの人物情報を確認",
          },
          {
            href: "/consult",
            title: "Consult",
            subtitle: "ディープ相談",
            desc: "AIがアクションプランを提案",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card hover:border-gold transition-all duration-300 group"
          >
            <h3 className="font-display text-lg text-gold group-hover:text-gold tracking-wide">
              {item.title}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {item.subtitle}
            </p>
            <p className="text-xs text-text-muted mt-3 leading-relaxed">
              {item.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
