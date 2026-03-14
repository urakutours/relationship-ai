// 九星気学（年盤）計算ロジック
// 立春（2月4日固定）を年の境界として使用

/** 九星の定義 */
export const KYUSEI_NAMES = [
  "一白水星",
  "二黒土星",
  "三碧木星",
  "四緑木星",
  "五黄土星",
  "六白金星",
  "七赤金星",
  "八白土星",
  "九紫火星",
] as const;

export type KyuseiName = (typeof KYUSEI_NAMES)[number];

/** 各九星の基本特性 */
export const KYUSEI_TRAITS: Record<KyuseiName, string> = {
  一白水星:
    "柔軟・社交的・秘密主義・忍耐力・孤独を恐れる・水のように相手に合わせる",
  二黒土星:
    "堅実・努力家・母性的・受動的・縁の下の力持ち・慎重で保守的",
  三碧木星:
    "行動力・若々しい・短気・率直・新しいことが好き・声が大きい",
  四緑木星:
    "穏やか・社交的・優柔不断・信頼される・風のように自由・調和を重んじる",
  五黄土星:
    "カリスマ性・支配的・頑固・中心にいたい・強い意志・親分肌",
  六白金星:
    "完璧主義・プライドが高い・指導力・独善的・高い理想を持つ・天の気質",
  七赤金星:
    "社交的・楽観的・話し上手・浪費傾向・華やかさ・喜びを追求する",
  八白土星:
    "変化・蓄積・頑固・山のように安定・革新的・蓄財の才能",
  九紫火星:
    "知性・情熱的・二面性・華やか・直感的・別れと出会いが多い",
};

/** 各九星の五行属性 */
export const KYUSEI_WUXING: Record<
  KyuseiName,
  { wood: number; fire: number; earth: number; metal: number; water: number }
> = {
  一白水星: { wood: 0, fire: 0, earth: 0, metal: 1, water: 3 },
  二黒土星: { wood: 0, fire: 1, earth: 3, metal: 0, water: 0 },
  三碧木星: { wood: 3, fire: 1, earth: 0, metal: 0, water: 1 },
  四緑木星: { wood: 3, fire: 0, earth: 0, metal: 0, water: 1 },
  五黄土星: { wood: 0, fire: 1, earth: 3, metal: 1, water: 0 },
  六白金星: { wood: 0, fire: 0, earth: 1, metal: 3, water: 0 },
  七赤金星: { wood: 0, fire: 0, earth: 1, metal: 3, water: 0 },
  八白土星: { wood: 0, fire: 0, earth: 3, metal: 0, water: 0 },
  九紫火星: { wood: 1, fire: 3, earth: 0, metal: 0, water: 0 },
};

/** 立春の日付（MVPでは2月4日固定） */
export const LICHUN_MONTH = 2;
export const LICHUN_DAY = 4;

/**
 * 立春を考慮した九星計算用の年を取得する
 * 1月1日〜2月3日生まれ → 前年扱い
 *
 * @param year 西暦の生まれた年
 * @param month 月（1-12）
 * @param day 日（1-31）
 * @returns 九星計算に使用する年
 */
export function getKyuseiYear(year: number, month: number, day: number): number {
  // 立春（2月4日）より前に生まれた場合は前年扱い
  if (month < LICHUN_MONTH || (month === LICHUN_MONTH && day < LICHUN_DAY)) {
    return year - 1;
  }
  return year;
}

/**
 * 生まれた年から九星を計算する
 *
 * 九星の計算式:
 * 年の各桁を合計して1桁にする → (11 - 1桁の数) が九星番号
 *
 * @param year 西暦の生まれた年（立春補正済みの値を渡すこと）
 * @returns 九星名またはnull
 */
export function calculateKyusei(year: number | null): KyuseiName | null {
  if (year === null || year === undefined) return null;
  if (year < 1 || !Number.isInteger(year)) return null;

  // 年の各桁を合計して1桁にする
  let digitSum = year
    .toString()
    .split("")
    .reduce((sum, d) => sum + parseInt(d, 10), 0);

  while (digitSum >= 10) {
    digitSum = digitSum
      .toString()
      .split("")
      .reduce((sum, d) => sum + parseInt(d, 10), 0);
  }

  // 九星番号を計算（11から引く、結果が9を超えたら9を引く）
  let kyuseiNumber = 11 - digitSum;
  if (kyuseiNumber > 9) {
    kyuseiNumber -= 9;
  }

  // 配列のインデックスは0始まり
  return KYUSEI_NAMES[kyuseiNumber - 1] ?? null;
}

/**
 * 生年月日から九星を計算する（立春境界を考慮）
 *
 * @param birthDate YYYY-MM-DD形式の文字列
 * @param birthYear 生まれた年（birthDateがない場合のフォールバック）
 * @returns 九星名またはnull
 */
export function calculateKyuseiFromBirth(
  birthDate: string | null,
  birthYear: number | null
): KyuseiName | null {
  if (birthDate) {
    const parts = birthDate.split("-");
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // 立春を考慮した年で計算
        const kyuseiYear = getKyuseiYear(year, month, day);
        return calculateKyusei(kyuseiYear);
      }
    }
    // 月日が取れない場合は年だけで計算
    const yearOnly = parseInt(parts[0], 10);
    if (!isNaN(yearOnly)) return calculateKyusei(yearOnly);
  }
  // birthDateがない場合はbirthYearで計算（立春補正なし）
  return calculateKyusei(birthYear);
}
