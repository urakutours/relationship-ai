// GET /api/costs
// コストダッシュボード用データ取得（開発環境のみUI表示、データは全環境で記録済み）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USD_TO_JPY } from "@/lib/cost-tracker";

/** 機能名の日本語表示マップ */
const FEATURE_LABELS: Record<string, string> = {
  daily_guidance: "日次ガイダンス",
  weekly_guidance: "週次ガイダンス",
  monthly_guidance: "月次ガイダンス",
  consultation: "ディープ相談",
  compatibility: "相性スコア",
  memory_compress: "記憶圧縮",
  quick_analysis: "クイック分析",
  deep_analysis: "深掘り分析",
  deep_analysis_continue: "深掘り続き",
};

export async function GET() {
  try {
    // 今日の0:00（JST）を計算
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // UTC+9
    const jstNow = new Date(now.getTime() + jstOffset);
    const jstTodayStart = new Date(
      Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate())
    );
    const todayStartUTC = new Date(jstTodayStart.getTime() - jstOffset);

    // 今日のログ・全ログ・直近20件を並列取得
    const [todayLogs, allTimeLogs, recentLogs] = await Promise.all([
      prisma.apiCostLog.findMany({
        where: { createdAt: { gte: todayStartUTC } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.apiCostLog.groupBy({
        by: ["feature"],
        _sum: { costJPY: true, costUSD: true, inputTokens: true, outputTokens: true, cacheReadTokens: true },
        _count: true,
      }),
      prisma.apiCostLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // 今日の合計コスト
    const todayTotalJPY = todayLogs.reduce((sum, l) => sum + l.costJPY, 0);
    const todayTotalUSD = todayLogs.reduce((sum, l) => sum + l.costUSD, 0);

    // 機能別内訳
    const featureBreakdown = allTimeLogs.map((g) => ({
      feature: g.feature,
      featureLabel: FEATURE_LABELS[g.feature] ?? g.feature,
      count: g._count,
      totalJPY: Math.round((g._sum.costJPY ?? 0) * 10000) / 10000,
      totalUSD: Math.round((g._sum.costUSD ?? 0) * 1000000) / 1000000,
      totalInputTokens: g._sum.inputTokens ?? 0,
      totalOutputTokens: g._sum.outputTokens ?? 0,
      totalCacheReadTokens: g._sum.cacheReadTokens ?? 0,
    }));

    // 直近20件のログ
    const recentEntries = recentLogs.map((l) => ({
      id: l.id,
      feature: l.feature,
      featureLabel: FEATURE_LABELS[l.feature] ?? l.feature,
      model: l.model,
      inputTokens: l.inputTokens,
      outputTokens: l.outputTokens,
      cacheReadTokens: l.cacheReadTokens,
      cacheWriteTokens: l.cacheWriteTokens,
      cacheHitRate:
        l.inputTokens > 0
          ? Math.round((l.cacheReadTokens / l.inputTokens) * 100)
          : 0,
      costJPY: Math.round(l.costJPY * 10000) / 10000,
      costUSD: Math.round(l.costUSD * 1000000) / 1000000,
      createdAt: l.createdAt.toISOString(),
    }));

    // 累計
    const allTimeTotalJPY = featureBreakdown.reduce((sum, f) => sum + f.totalJPY, 0);
    const allTimeTotalUSD = featureBreakdown.reduce((sum, f) => sum + f.totalUSD, 0);

    // 月間推計: 各機能の平均単価 × 月間想定回数
    const avgCost = (feature: string): number => {
      const f = featureBreakdown.find((b) => b.feature === feature);
      if (!f || f.count === 0) return 0;
      return f.totalJPY / f.count;
    };

    const MONTHLY_CONSULT_ESTIMATE = 8; // 月間想定相談回数
    const monthlyEstimate = {
      daily: { unitCost: avgCost("daily_guidance"), times: 30, total: avgCost("daily_guidance") * 30 },
      weekly: { unitCost: avgCost("weekly_guidance"), times: 4, total: avgCost("weekly_guidance") * 4 },
      monthly: { unitCost: avgCost("monthly_guidance"), times: 1, total: avgCost("monthly_guidance") * 1 },
      consultation: { unitCost: avgCost("consultation"), times: MONTHLY_CONSULT_ESTIMATE, total: avgCost("consultation") * MONTHLY_CONSULT_ESTIMATE },
      total: 0,
    };
    monthlyEstimate.total = Math.round(
      (monthlyEstimate.daily.total + monthlyEstimate.weekly.total + monthlyEstimate.monthly.total + monthlyEstimate.consultation.total) * 10000
    ) / 10000;

    return NextResponse.json({
      today: {
        totalJPY: Math.round(todayTotalJPY * 10000) / 10000,
        totalUSD: Math.round(todayTotalUSD * 1000000) / 1000000,
        count: todayLogs.length,
      },
      allTime: {
        totalJPY: Math.round(allTimeTotalJPY * 10000) / 10000,
        totalUSD: Math.round(allTimeTotalUSD * 1000000) / 1000000,
      },
      monthlyEstimate,
      featureBreakdown,
      recentLogs: recentEntries,
      exchangeRate: USD_TO_JPY,
    });
  } catch (error) {
    console.error("コストデータ取得エラー:", error);
    return NextResponse.json(
      { error: "コストデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
