"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// 機能別内訳の型
interface FeatureBreakdown {
  feature: string;
  featureLabel: string;
  count: number;
  totalJPY: number;
  totalUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
}

// 直近ログの型
interface RecentLog {
  id: number;
  feature: string;
  featureLabel: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cacheHitRate: number;
  costJPY: number;
  costUSD: number;
  createdAt: string;
}

// 月間推計の型
interface MonthlyEstimateItem {
  unitCost: number;
  times: number;
  total: number;
}

interface MonthlyEstimate {
  daily: MonthlyEstimateItem;
  weekly: MonthlyEstimateItem;
  monthly: MonthlyEstimateItem;
  consultation: MonthlyEstimateItem;
  total: number;
}

// APIレスポンスの型
interface CostData {
  today: { totalJPY: number; totalUSD: number; count: number };
  allTime: { totalJPY: number; totalUSD: number };
  monthlyEstimate: MonthlyEstimate;
  featureBreakdown: FeatureBreakdown[];
  recentLogs: RecentLog[];
  exchangeRate: number;
}

/** モデル名を短縮表示する */
function shortModel(model: string): string {
  if (model.includes("haiku")) return "Haiku";
  if (model.includes("sonnet")) return "Sonnet";
  return model;
}

export default function CostDashboardPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // URLパラメータからadminパスワードを取得してAPIに渡す
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get("admin");
    const url = adminParam ? `/api/costs?admin=${encodeURIComponent(adminParam)}` : "/api/costs";

    fetch(url)
      .then((res) => {
        if (res.status === 403) {
          throw new Error("管理者パスワードが正しくありません。URLに ?admin=パスワード を付けてください。");
        }
        return res.json();
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message || "データの取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted animate-pulse">コストデータを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="text-gold text-sm mt-4 inline-block hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-gold tracking-wide">
          APIコストダッシュボード
        </h1>
        <Link
          href="/"
          className="text-text-muted text-sm hover:text-gold transition-colors"
        >
          ← ホーム
        </Link>
      </div>

      {/* 今日の合計 + 累計 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-text-muted text-[11px] tracking-widest mb-2">
            TODAY
          </h2>
          <p className="font-display text-3xl text-gold">
            &yen;{data.today.totalJPY.toFixed(2)}
          </p>
          <p className="text-text-muted text-xs mt-1">
            ${data.today.totalUSD.toFixed(6)} USD / {data.today.count} calls
          </p>
        </div>
        <div className="card">
          <h2 className="text-text-muted text-[11px] tracking-widest mb-2">
            ALL TIME
          </h2>
          <p className="font-display text-3xl text-gold">
            &yen;{data.allTime.totalJPY.toFixed(2)}
          </p>
          <p className="text-text-muted text-xs mt-1">
            ${data.allTime.totalUSD.toFixed(6)} USD / Rate: &yen;{data.exchangeRate}/USD
          </p>
        </div>
      </div>

      {/* 月間推計 */}
      {data.monthlyEstimate && (
        <div className="card">
          <h2 className="font-display text-lg text-gold mb-4 tracking-wide">
            月間推計
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { label: "日次ガイダンス", item: data.monthlyEstimate.daily, desc: "×30回/月" },
              { label: "週次ガイダンス", item: data.monthlyEstimate.weekly, desc: "×4回/月" },
              { label: "月次ガイダンス", item: data.monthlyEstimate.monthly, desc: "×1回/月" },
              { label: "相談", item: data.monthlyEstimate.consultation, desc: "×8回/月（想定）" },
            ].map(({ label, item, desc }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-border-subtle/30">
                <div>
                  <span className="text-text-primary">{label}</span>
                  <span className="text-text-muted text-xs ml-2">
                    &yen;{item.unitCost.toFixed(2)} {desc}
                  </span>
                </div>
                <span className="text-text-secondary font-mono text-xs">
                  &yen;{item.total.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-text-primary font-medium">合計月間推計</span>
              <span className={`font-display text-xl font-mono ${data.monthlyEstimate.total <= 10 ? "text-jade" : data.monthlyEstimate.total <= 20 ? "text-gold" : "text-red-400"}`}>
                &yen;{data.monthlyEstimate.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 機能別内訳 */}
      <div className="card">
        <h2 className="font-display text-lg text-gold mb-4 tracking-wide">
          機能別内訳
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-2 text-text-muted text-[11px] tracking-widest">
                  機能
                </th>
                <th className="text-right py-2 text-text-muted text-[11px] tracking-widest">
                  回数
                </th>
                <th className="text-right py-2 text-text-muted text-[11px] tracking-widest">
                  入力
                </th>
                <th className="text-right py-2 text-text-muted text-[11px] tracking-widest">
                  出力
                </th>
                <th className="text-right py-2 text-text-muted text-[11px] tracking-widest">
                  CACHE%
                </th>
                <th className="text-right py-2 text-text-muted text-[11px] tracking-widest">
                  コスト
                </th>
              </tr>
            </thead>
            <tbody>
              {data.featureBreakdown
                .sort((a, b) => b.totalJPY - a.totalJPY)
                .map((f) => {
                  const cacheRate =
                    f.totalInputTokens > 0
                      ? Math.round(
                          (f.totalCacheReadTokens / f.totalInputTokens) * 100
                        )
                      : 0;
                  return (
                    <tr
                      key={f.feature}
                      className="border-b border-border-subtle/50"
                    >
                      <td className="py-2.5 text-text-primary">
                        {f.featureLabel}
                      </td>
                      <td className="py-2.5 text-right text-text-secondary">
                        {f.count}
                      </td>
                      <td className="py-2.5 text-right text-text-secondary font-mono text-xs">
                        {f.totalInputTokens.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-text-secondary font-mono text-xs">
                        {f.totalOutputTokens.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={
                            cacheRate >= 80
                              ? "text-jade"
                              : cacheRate >= 50
                                ? "text-gold"
                                : "text-text-muted"
                          }
                        >
                          {cacheRate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-gold font-mono text-xs">
                        &yen;{f.totalJPY.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 直近20件のログ */}
      <div className="card">
        <h2 className="font-display text-lg text-gold mb-4 tracking-wide">
          直近のAPI呼び出し
        </h2>
        <div className="space-y-2">
          {data.recentLogs.map((log) => {
            const dt = new Date(log.createdAt);
            const timeStr = dt.toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 py-2.5 border-b border-border-subtle/30 last:border-0"
              >
                {/* 機能名 + モデル */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary text-sm">
                      {log.featureLabel}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        log.model.includes("sonnet")
                          ? "bg-gold/10 text-gold border border-gold-dim"
                          : "bg-jade/10 text-jade border border-jade-dim"
                      }`}
                    >
                      {shortModel(log.model)}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5 font-mono">
                    IN:{log.inputTokens.toLocaleString()} OUT:
                    {log.outputTokens.toLocaleString()} CACHE:{log.cacheHitRate}
                    %
                    {log.cacheWriteTokens > 0 && (
                      <span className="text-gold">
                        {" "}
                        W:{log.cacheWriteTokens.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* コスト + 時刻 */}
                <div className="text-right shrink-0">
                  <p className="text-gold text-sm font-mono">
                    &yen;{log.costJPY.toFixed(4)}
                  </p>
                  <p className="text-text-muted text-[10px]">{timeStr}</p>
                </div>
              </div>
            );
          })}

          {data.recentLogs.length === 0 && (
            <p className="text-text-muted text-sm py-4 text-center">
              まだAPIコールのログがありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
