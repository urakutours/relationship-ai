// 日付ユーティリティ（ISO週番号・月キー・日キー）

/**
 * ISO 8601 週番号を取得
 * 例: 2024年3月13日 → 11
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // 木曜日に合わせる（ISO 8601 規定）
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * ISO週番号のISO年を取得（年末年始で暦年と異なる場合がある）
 */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

/**
 * ISO週キーを取得 "YYYY-WNN"
 * 例: 2024-W11
 */
export function getISOWeekKey(date: Date): string {
  const year = getISOWeekYear(date);
  const week = getISOWeekNumber(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * 月キーを取得 "YYYY-MM"
 * 例: 2024-03
 */
export function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * 日キーを取得 "YYYY-MM-DD"
 * 例: 2024-03-15
 */
export function getDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * ISO週の月曜〜日曜を取得
 */
export function getISOWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay() || 7; // 日曜=7
  d.setDate(d.getDate() - day + 1); // 月曜
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 6); // 日曜
  return { start, end };
}

/**
 * 月の初日と最終日を取得
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

/**
 * ISO週キーから表示用の日付範囲文字列を生成
 * 例: "3/11(月)〜3/17(日)"
 */
export function formatWeekRange(date: Date): string {
  const { start, end } = getISOWeekRange(date);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const s = `${start.getMonth() + 1}/${start.getDate()}(${weekdays[start.getDay()]})`;
  const e = `${end.getMonth() + 1}/${end.getDate()}(${weekdays[end.getDay()]})`;
  return `${s}〜${e}`;
}
