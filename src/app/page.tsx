"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { CostInfo } from "@/lib/types";

// 天気の選択肢（雪・台風・猛暑・花粉を追加）
const WEATHER_OPTIONS = [
  { value: "晴れ", icon: "☀️" },
  { value: "曇り", icon: "☁️" },
  { value: "雨", icon: "🌧️" },
  { value: "雪", icon: "❄️" },
  { value: "台風", icon: "🌀" },
  { value: "猛暑", icon: "🔥" },
  { value: "花粉", icon: "🤧" },
] as const;

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 曜日連動メッセージ
const WEEKDAY_MESSAGES: Record<number, string> = {
  0: "日曜日はリラックスの日。大切な人とゆったり過ごすことで絆が深まります。",
  1: "月曜日は週の始まり。新しいコミュニケーションを意識しましょう。",
  2: "火曜日は行動力の日。思い切って連絡してみましょう。",
  3: "水曜日は週の折り返し。周囲への気配りが好印象につながります。",
  4: "木曜日は調和の日。相手の話にじっくり耳を傾けてみましょう。",
  5: "金曜日は感謝の日。今週お世話になった人にお礼を伝えましょう。",
  6: "土曜日は充電の日。自分を労わることで来週の対人力が上がります。",
};

// ダッシュボードイベント型
interface DashboardEvent {
  type: "birthday" | "anniversary";
  personId: string;
  nickname: string;
  honorific: string | null;
  daysUntil: number;
  dateLabel: string;
}

// 未相談人物型
interface InactivePerson {
  id: string;
  nickname: string;
  honorific: string | null;
  relationship: string;
  intimacyScore: number | null;
  daysSinceConsult: number;
  lastConsultDate: string | null;
}

export default function HomePage() {
  const [weather, setWeather] = useState<string>("晴れ");
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  const [cachedWeather, setCachedWeather] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  // ダッシュボードデータ
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [inactivePersons, setInactivePersons] = useState<InactivePerson[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const today = new Date();
  const weekdayMessage = WEEKDAY_MESSAGES[today.getDay()];

  // debug パラメータ検出
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get("debug") === "true");
  }, []);

  // プロフィール＆ダッシュボードデータ取得
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfileExists(data.exists ?? false))
      .catch(() => setProfileExists(false));

    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setInactivePersons(data.inactivePersons || []);
      })
      .catch(console.error)
      .finally(() => setDashboardLoading(false));
  }, []);

  // 天気が変わったらキャッシュをクリア
  useEffect(() => {
    if (weather !== cachedWeather) {
      setAdvice(null);
      setCostInfo(null);
    }
  }, [weather, cachedWeather]);

  const fetchAdvice = async () => {
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

  /** 敬称付き名前 */
  const displayName = (nickname: string, honorific: string | null) => {
    const suffix = honorific || "さん";
    // 既に敬称で終わっている場合は付けない
    const endings = ["さん", "ちゃん", "くん", "様", "先生", "殿", "氏"];
    if (endings.some((e) => nickname.endsWith(e))) return nickname;
    return `${nickname}${suffix}`;
  };

  return (
    <div className="space-y-8">
      {/* 日付表示 */}
      <div className="text-center py-6">
        <p className="font-display text-[56px] font-light text-gold leading-none tracking-wide">
          {today.getMonth() + 1}.{today.getDate()}
        </p>
        <p className="font-display text-lg text-text-secondary mt-1">
          {today.getFullYear()} — {WEEKDAYS[today.getDay()]}曜日
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

      {/* ===== ウィジェット1: 今日のガイダンス ===== */}
      <div className="card">
        <h2 className="font-display text-xl text-gold mb-3 tracking-wide">
          今日のガイダンス
        </h2>

        {/* 曜日連動メッセージ */}
        <p className="text-text-secondary text-[13px] leading-relaxed mb-5">
          {weekdayMessage}
        </p>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {/* 天気選択アイコン */}
          <div className="flex gap-1.5 flex-wrap">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWeather(w.value)}
                title={w.value}
                className={`
                  w-9 h-9 rounded-[4px] text-base flex items-center justify-center
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
            className="btn-ghost text-sm"
          >
            {loading ? "まとめています..." : "アドバイスを取得"}
          </button>
        </div>

        {/* アドバイス表示 */}
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

        {/* コスト表示（debug=true パラメータ時のみ） */}
        {debugMode && costInfo && (
          <div className="mt-4 py-2 px-3 bg-base rounded-[4px] text-[10px] text-text-muted font-display tracking-wide">
            IN:{costInfo.inputTokens} | OUT:{costInfo.outputTokens} |
            CACHE_R:{costInfo.cacheReadTokens} | CACHE_W:{costInfo.cacheCreationTokens} |
            COST: &yen;{costInfo.estimatedCostJPY.toFixed(4)}
          </div>
        )}
      </div>

      {/* ===== ウィジェット2: 今日・近日中のイベント（該当なし時は非表示）===== */}
      {!dashboardLoading && events.length > 0 && (
        <div className="card">
          <h2 className="font-display text-xl text-gold mb-4 tracking-wide">
            近日中のイベント
          </h2>
          <div className="space-y-3">
            {events.map((ev, i) => (
              <Link
                key={`${ev.personId}-${ev.type}-${i}`}
                href={`/persons/${ev.personId}`}
                className="flex items-start gap-3 group hover:bg-surface-hover rounded-lg px-3 py-2 -mx-3 transition-colors"
              >
                <span className="text-xl leading-none mt-0.5">
                  {ev.type === "birthday" ? "🎂" : "🎉"}
                </span>
                <div className="flex-1 min-w-0">
                  {ev.daysUntil === 0 ? (
                    <p className="text-text-primary text-sm">
                      <span className="text-gold font-medium">今日</span>は
                      <span className="text-gold font-medium">
                        {displayName(ev.nickname, ev.honorific)}
                      </span>
                      の{ev.type === "birthday" ? "誕生日" : "記念日"}です
                    </p>
                  ) : (
                    <p className="text-text-primary text-sm">
                      <span className="text-gold font-medium">
                        {ev.daysUntil}日後
                      </span>
                      に
                      <span className="text-gold font-medium">
                        {displayName(ev.nickname, ev.honorific)}
                      </span>
                      の{ev.type === "birthday" ? "誕生日" : "記念日"}
                    </p>
                  )}
                  <p className="text-text-muted text-xs mt-0.5">
                    {ev.dateLabel}
                  </p>
                </div>
                <span className="text-text-muted group-hover:text-gold text-xs transition-colors mt-1">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ===== ウィジェット3: 最近相談していない人物 ===== */}
      {!dashboardLoading && inactivePersons.length > 0 && (
        <div className="card">
          <h2 className="font-display text-xl text-gold mb-4 tracking-wide">
            最近相談していない人物
          </h2>
          <div className="space-y-2">
            {inactivePersons.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm">
                    {displayName(p.nickname, p.honorific)}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {p.lastConsultDate
                      ? `最終相談：${p.daysSinceConsult}日前`
                      : `登録から${p.daysSinceConsult}日（未相談）`}
                  </p>
                </div>
                <Link
                  href={`/persons/${p.id}`}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 border border-jade-dim text-jade text-xs rounded-[4px] hover:bg-jade hover:text-base transition-all duration-300"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  </svg>
                  相談する
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ウィジェット4: クイックアクション ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/persons/new"
          className="card hover:border-gold transition-all duration-300 group flex items-center gap-4"
        >
          <span className="w-10 h-10 rounded-lg bg-gold/10 border border-gold-dim flex items-center justify-center text-gold shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </span>
          <div>
            <h3 className="font-display text-base text-gold group-hover:text-gold tracking-wide">
              人物を登録
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              関わりのある人の情報を登録
            </p>
          </div>
        </Link>

        <Link
          href="/consult/new"
          className="card hover:border-gold transition-all duration-300 group flex items-center gap-4"
        >
          <span className="w-10 h-10 rounded-lg bg-jade/10 border border-jade-dim flex items-center justify-center text-jade shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
          </span>
          <div>
            <h3 className="font-display text-base text-jade group-hover:text-jade tracking-wide">
              相談する
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              AIがアクションプランを提案
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
