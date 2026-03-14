"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * 開発環境のみ表示するフローティングコストバッジ
 * 画面右下に今日のAPI合計コスト(JPY)を表示し、クリックで /admin/costs に遷移
 */
export function CostBadge() {
  const [todayJPY, setTodayJPY] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 開発環境でのみ表示
    if (process.env.NODE_ENV !== "development") return;
    setVisible(true);

    // 初回読み込み
    const fetchCost = () => {
      fetch("/api/costs")
        .then((res) => res.json())
        .then((data) => {
          if (data.today?.totalJPY != null) {
            setTodayJPY(data.today.totalJPY);
          }
        })
        .catch(() => {
          // エラー時は表示しない
        });
    };

    fetchCost();

    // 60秒ごとに更新
    const interval = setInterval(fetchCost, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!visible || todayJPY === null) return null;

  return (
    <Link
      href="/admin/costs"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 bg-surface border border-gold-dim rounded-full px-3 py-1.5 shadow-lg hover:border-gold transition-all duration-300 group"
      title="APIコストダッシュボード"
    >
      <span className="text-[11px] text-text-muted group-hover:text-gold transition-colors font-mono">
        今日: &yen;{todayJPY.toFixed(2)}
      </span>
    </Link>
  );
}
