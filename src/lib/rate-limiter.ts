// メモリベースの簡易レート制限（MVP用）
// Vercelのサーバーレス環境ではインスタンス間で共有されないが、
// 単一ユーザーのテスト用途には十分

const dailyCounts: Map<string, { count: number; date: string }> = new Map();

export function checkRateLimit(
  key: string,
  maxPerDay: number
): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split("T")[0];
  const current = dailyCounts.get(key);

  if (!current || current.date !== today) {
    dailyCounts.set(key, { count: 1, date: today });
    return { allowed: true, remaining: maxPerDay - 1 };
  }

  if (current.count >= maxPerDay) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: maxPerDay - current.count };
}

// 機能別の1日あたり上限
export const RATE_LIMITS = {
  consultation: 5,
  quick_analysis: 3,
  deep_analysis: 3,
  memory_compress: 3,
  global: parseInt(process.env.DAILY_API_LIMIT || "50", 10),
} as const;

// レート制限エラーレスポンス用のヘルパー
export function rateLimitError(remaining: number) {
  return {
    error: "本日の利用上限に達しました",
    remaining,
  };
}
