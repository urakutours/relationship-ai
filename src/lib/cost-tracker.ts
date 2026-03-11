// APIコスト計算ユーティリティ（開発環境用）

import type { CostInfo } from "@/lib/types";

// 2024年時点のClaude APIの料金（USD/1Mトークン）
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

// USD→JPYの概算レート
const USD_TO_JPY = 150;

type ModelId = keyof typeof PRICING;

/**
 * APIレスポンスのusage情報からコストを計算する
 *
 * @param model モデルID
 * @param inputTokens 入力トークン数
 * @param outputTokens 出力トークン数
 * @param cacheReadTokens キャッシュ読み取りトークン数
 * @param cacheCreationTokens キャッシュ作成トークン数
 * @returns コスト情報
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number = 0,
  cacheCreationTokens: number = 0
): CostInfo {
  const pricing = PRICING[model as ModelId] ?? PRICING["claude-haiku-4-5-20251001"];

  // コスト計算（USD）
  const inputCostUSD = (inputTokens / 1_000_000) * pricing.input;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.output;
  const cacheReadCostUSD = (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  const cacheWriteCostUSD =
    (cacheCreationTokens / 1_000_000) * pricing.cacheWrite;

  const totalCostUSD =
    inputCostUSD + outputCostUSD + cacheReadCostUSD + cacheWriteCostUSD;

  // 円換算
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
