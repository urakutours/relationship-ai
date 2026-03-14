// APIコスト計算・ログ記録ユーティリティ

import type { CostInfo } from "@/lib/types";
import { prisma } from "@/lib/prisma";

// Claude APIの料金（USD/1Mトークン）
const PRICING = {
  "claude-haiku-4-5-20251001": {
    input: 1.0,
    output: 5.0,
    cacheRead: 0.1, // 入力の10%
    cacheWrite: 1.25, // 入力の125%
  },
  "claude-sonnet-4-6": {
    input: 3.0,
    output: 15.0,
    cacheRead: 0.3, // 入力の10%
    cacheWrite: 3.75, // 入力の125%
  },
} as const;

// USD→JPYの概算レート（将来変更可能）
export const USD_TO_JPY = 150;

type ModelId = keyof typeof PRICING;

/** 機能名の型定義 */
export type FeatureName =
  | "daily_guidance"
  | "weekly_guidance"
  | "monthly_guidance"
  | "consultation"
  | "compatibility"
  | "memory_compress"
  | "quick_analysis"
  | "deep_analysis"
  | "deep_analysis_continue";

/**
 * APIレスポンスのusage情報からコスト情報を計算する（開発環境用表示）
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheCreationTokens: number = 0
): CostInfo {
  const pricing = PRICING[model as ModelId] ?? PRICING["claude-haiku-4-5-20251001"];

  const inputCostUSD = (inputTokens / 1_000_000) * pricing.input;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.output;
  const cacheReadCostUSD = (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  const cacheWriteCostUSD =
    (cacheCreationTokens / 1_000_000) * pricing.cacheWrite;

  const totalCostUSD =
    inputCostUSD + outputCostUSD + cacheReadCostUSD + cacheWriteCostUSD;

  const estimatedCostJPY = Math.round(totalCostUSD * USD_TO_JPY * 10000) / 10000;

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    estimatedCostJPY,
  };
}

/**
 * コスト情報をフォーマットして表示用文字列を生成する
 */
export function formatCostInfo(cost: CostInfo): string {
  return [
    `入力: ${cost.inputTokens}トークン`,
    `出力: ${cost.outputTokens}トークン`,
    `キャッシュ読取: ${cost.cacheReadTokens}トークン`,
    `キャッシュ作成: ${cost.cacheCreationTokens}トークン`,
    `推定コスト: ¥${cost.estimatedCostJPY.toFixed(4)}`,
  ].join(" | ");
}

/**
 * USDコストを計算する（DB保存用）
 */
export function calcCostUSD(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheWriteTokens: number = 0
): number {
  const pricing = PRICING[model as ModelId] ?? PRICING["claude-haiku-4-5-20251001"];

  // キャッシュ読み取り分を入力トークンから除外（二重課金防止）
  const pureInputTokens = inputTokens - cacheReadTokens;

  return (
    (pureInputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output +
    (cacheReadTokens / 1_000_000) * pricing.cacheRead +
    (cacheWriteTokens / 1_000_000) * pricing.cacheWrite
  );
}

/**
 * APIコストログをDBに非同期で書き込む
 * レスポンスをブロックしないよう、エラーはログ出力のみ
 */
export function logApiCost(
  feature: FeatureName,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheWriteTokens: number = 0
): void {
  const costUSD = calcCostUSD(model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens);
  const costJPY = Math.round(costUSD * USD_TO_JPY * 10000) / 10000;

  // 非同期でDB書き込み（レスポンスをブロックしない）
  prisma.apiCostLog
    .create({
      data: {
        feature,
        model,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
        costUSD,
        costJPY,
      },
    })
    .catch((err: unknown) => {
      console.error("コストログ書き込みエラー:", err);
    });
}
