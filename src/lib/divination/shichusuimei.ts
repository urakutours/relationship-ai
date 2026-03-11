// 四柱推命・日柱（簡易版）計算ロジック

/** 十干の定義 */
export const TEN_STEMS = [
  "甲", // きのえ（木の兄）
  "乙", // きのと（木の弟）
  "丙", // ひのえ（火の兄）
  "丁", // ひのと（火の弟）
  "戊", // つちのえ（土の兄）
  "己", // つちのと（土の弟）
  "庚", // かのえ（金の兄）
  "辛", // かのと（金の弟）
  "壬", // みずのえ（水の兄）
  "癸", // みずのと（水の弟）
] as const;

export type TenStem = (typeof TEN_STEMS)[number];

/** 十二支の定義 */
export const TWELVE_BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

export type TwelveBranch = (typeof TWELVE_BRANCHES)[number];

/** 日干の基本特性 */
export const DAY_KAN_TRAITS: Record<TenStem, string> = {
  甲: "大木の性質・真っ直ぐ・リーダー気質・頑固・上昇志向・正義感が強い",
  乙: "草花の性質・柔軟・協調性・したたか・人間関係を大切にする・粘り強い",
  丙: "太陽の性質・明るい・情熱的・大らか・注目を浴びたい・率直",
  丁: "灯火の性質・繊細・知的・内面が熱い・神秘的・洞察力がある",
  戊: "山の性質・安定・包容力・頑固・信頼感・動じない",
  己: "大地の性質・面倒見がいい・実務的・心配性・母性的・几帳面",
  庚: "鉄の性質・決断力・正義感・攻撃的になりやすい・義理堅い・改革的",
  辛: "宝石の性質・繊細・美意識・プライドが高い・完璧主義・傷つきやすい",
  壬: "大海の性質・自由・知恵・楽天的・スケールが大きい・放浪的",
  癸: "雨の性質・繊細・直感的・優しい・想像力豊か・内向的",
};

/**
 * 日柱を計算するための基準日からの日数差分を求める
 *
 * 日柱の計算方法（簡易版）:
 * 1. 基準日（1900年1月1日 = 甲子）からの経過日数を計算
 * 2. 経過日数 mod 60 で六十干支のインデックスを求める
 * 3. インデックスから天干と地支を求める
 *
 * 注意: 本来の四柱推命では、日の変わり目が23:00のため
 * 厳密な計算には出生時刻が必要。MVPでは日付のみで計算する。
 */

// 基準日: 1900年1月1日は「甲子」（六十干支の1番目）
// ただし実際の暦では1900年1月1日は「庚子」（干支番号37）
const REFERENCE_DATE = new Date(1900, 0, 1); // 1900-01-01
const REFERENCE_KANSHI_INDEX = 36; // 庚子のインデックス（0始まり）

/**
 * 日付間の日数差を計算する（UTCベースで計算し、タイムゾーンの影響を排除）
 */
function daysBetween(date1: Date, date2: Date): number {
  const utc1 = Date.UTC(
    date1.getFullYear(),
    date1.getMonth(),
    date1.getDate()
  );
  const utc2 = Date.UTC(
    date2.getFullYear(),
    date2.getMonth(),
    date2.getDate()
  );
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * 六十干支のインデックスから天干（日干）を求める
 */
function getStemFromIndex(index: number): TenStem {
  return TEN_STEMS[index % 10];
}

/**
 * 六十干支のインデックスから地支を求める
 */
function getBranchFromIndex(index: number): TwelveBranch {
  return TWELVE_BRANCHES[index % 12];
}

/**
 * 生年月日から日柱（日干と日支）を計算する
 *
 * @param birthDate YYYY-MM-DD形式の文字列
 * @returns { dayKan: 天干, dayBranch: 地支, pillar: 干支の組み合わせ } またはnull
 */
export function calculateDayPillar(
  birthDate: string | null
): { dayKan: TenStem; dayBranch: TwelveBranch; pillar: string } | null {
  if (!birthDate) return null;

  const parts = birthDate.split("-");
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Dateの月は0始まり
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const targetDate = new Date(year, month, day);

  // 日数差を計算
  const days = daysBetween(REFERENCE_DATE, targetDate);

  // 六十干支のインデックスを求める（0〜59）
  let kanshiIndex = (REFERENCE_KANSHI_INDEX + days) % 60;
  if (kanshiIndex < 0) kanshiIndex += 60;

  const dayKan = getStemFromIndex(kanshiIndex);
  const dayBranch = getBranchFromIndex(kanshiIndex);

  return {
    dayKan,
    dayBranch,
    pillar: `${dayKan}${dayBranch}`,
  };
}
