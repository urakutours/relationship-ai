// 西洋星座（太陽星座）計算ロジック

/** 12星座の定義 */
export const SOLAR_SIGNS = [
  "牡羊座",
  "牡牛座",
  "双子座",
  "蟹座",
  "獅子座",
  "乙女座",
  "天秤座",
  "蠍座",
  "射手座",
  "山羊座",
  "水瓶座",
  "魚座",
] as const;

export type SolarSign = (typeof SOLAR_SIGNS)[number];

/** 各星座の基本特性 */
export const SOLAR_SIGN_TRAITS: Record<SolarSign, string> = {
  牡羊座: "行動力・リーダーシップ・衝動的・競争心が強い・率直・短気",
  牡牛座: "安定志向・忍耐力・感覚的・頑固・堅実・所有欲が強い",
  双子座: "知的好奇心・コミュニケーション能力・二面性・飽きやすい・柔軟",
  蟹座: "感受性・家庭的・防衛的・情緒的・世話好き・記憶力が良い",
  獅子座: "自信・創造性・プライドが高い・寛大・ドラマチック・承認欲求",
  乙女座: "分析力・完璧主義・実務的・批判的・奉仕精神・細かい",
  天秤座: "調和・社交的・優柔不断・美意識・公正・パートナーシップ重視",
  蠍座: "洞察力・情熱的・秘密主義・執着心・変容力・直感的",
  射手座: "楽観的・自由奔放・哲学的・率直すぎる・冒険心・教養",
  山羊座: "野心的・責任感・慎重・権威志向・実績重視・自己抑制",
  水瓶座: "独創的・人道的・反体制的・距離感・理想主義・客観的",
  魚座: "共感力・直感的・夢見がち・自己犠牲・芸術的・境界が曖昧",
};

/** 各星座の五行属性（木火土金水のバランス） */
export const SOLAR_SIGN_WUXING: Record<
  SolarSign,
  { wood: number; fire: number; earth: number; metal: number; water: number }
> = {
  牡羊座: { wood: 1, fire: 3, earth: 0, metal: 1, water: 0 },
  牡牛座: { wood: 1, fire: 0, earth: 3, metal: 1, water: 0 },
  双子座: { wood: 2, fire: 1, earth: 0, metal: 1, water: 1 },
  蟹座: { wood: 1, fire: 0, earth: 0, metal: 0, water: 3 },
  獅子座: { wood: 0, fire: 3, earth: 1, metal: 0, water: 0 },
  乙女座: { wood: 1, fire: 0, earth: 3, metal: 1, water: 0 },
  天秤座: { wood: 0, fire: 0, earth: 1, metal: 3, water: 1 },
  蠍座: { wood: 0, fire: 1, earth: 0, metal: 0, water: 3 },
  射手座: { wood: 1, fire: 3, earth: 0, metal: 0, water: 0 },
  山羊座: { wood: 0, fire: 0, earth: 3, metal: 1, water: 1 },
  水瓶座: { wood: 1, fire: 0, earth: 0, metal: 2, water: 2 },
  魚座: { wood: 1, fire: 0, earth: 0, metal: 0, water: 3 },
};

// 星座の日付範囲（月, 開始日, 終了日）
// 各星座の開始月日を定義
const SIGN_DATE_RANGES: Array<{
  sign: SolarSign;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}> = [
  { sign: "山羊座", startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
  { sign: "水瓶座", startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { sign: "魚座", startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
  { sign: "牡羊座", startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { sign: "牡牛座", startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { sign: "双子座", startMonth: 5, startDay: 21, endMonth: 6, endDay: 21 },
  { sign: "蟹座", startMonth: 6, startDay: 22, endMonth: 7, endDay: 22 },
  { sign: "獅子座", startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { sign: "乙女座", startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { sign: "天秤座", startMonth: 9, startDay: 23, endMonth: 10, endDay: 23 },
  { sign: "蠍座", startMonth: 10, startDay: 24, endMonth: 11, endDay: 22 },
  { sign: "射手座", startMonth: 11, startDay: 23, endMonth: 12, endDay: 21 },
];

/**
 * 生年月日から西洋星座を判定する
 * @param birthDate YYYY-MM-DD形式の文字列
 * @returns 星座名またはnull
 */
export function calculateSolarSign(birthDate: string | null): SolarSign | null {
  if (!birthDate) return null;

  const parts = birthDate.split("-");
  if (parts.length !== 3) return null;

  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(month) || isNaN(day)) return null;

  for (const range of SIGN_DATE_RANGES) {
    // 山羊座は年をまたぐので特別処理
    if (range.startMonth > range.endMonth) {
      if (
        (month === range.startMonth && day >= range.startDay) ||
        (month === range.endMonth && day <= range.endDay)
      ) {
        return range.sign;
      }
    } else {
      if (
        (month === range.startMonth && day >= range.startDay) ||
        (month === range.endMonth && day <= range.endDay) ||
        (month > range.startMonth && month < range.endMonth)
      ) {
        return range.sign;
      }
    }
  }

  return null;
}
