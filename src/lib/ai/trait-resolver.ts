// 占術特性テキストの動的解決モジュール
// 対象者の占術結果に該当するパターンのみを返し、トークン数を削減する

import { SOLAR_SIGN_TRAITS } from "@/lib/divination/solar-sign";
import { KYUSEI_TRAITS } from "@/lib/divination/kyusei";
import { DAY_KAN_TRAITS } from "@/lib/divination/shichusuimei";
import { NUMEROLOGY_TRAITS } from "@/lib/divination/numerology";
import type { DivinationResult } from "@/lib/types";

/**
 * 占術結果から該当する特性テキストを付与して返す
 * システムプロンプトの全43パターンの代わりに、対象者分のみ（4パターン）を返す
 *
 * 例:
 * 西洋星座: 蟹座（感受性・家庭的・防衛的・情緒的・世話好き・記憶力が良い）
 * 数秘術（誕生数）: 7（分析力・探求心・内省的・孤独になりやすい・スピリチュアルな素質）
 * 九星: 一白水星（柔軟・社交的・秘密主義・忍耐力・孤独を恐れる・水のように相手に合わせる）
 * 日干: 甲（大木の性質・真っ直ぐ・リーダー気質・頑固・上昇志向・正義感が強い）
 */
export function resolveTraits(div: DivinationResult): string {
  const lines: string[] = [];

  // 西洋星座
  if (div.solarSign) {
    const traits = SOLAR_SIGN_TRAITS[div.solarSign as keyof typeof SOLAR_SIGN_TRAITS];
    lines.push(`西洋星座: ${div.solarSign}${traits ? `（${traits}）` : ""}`);
  } else {
    lines.push("西洋星座: 不明");
  }

  // 数秘術
  if (div.numerology !== null && div.numerology !== undefined) {
    const traits = NUMEROLOGY_TRAITS[div.numerology];
    lines.push(`数秘術（誕生数）: ${div.numerology}${traits ? `（${traits}）` : ""}`);
  } else {
    lines.push("数秘術（誕生数）: 不明");
  }

  // 九星
  if (div.kyusei) {
    const traits = KYUSEI_TRAITS[div.kyusei as keyof typeof KYUSEI_TRAITS];
    lines.push(`九星: ${div.kyusei}${traits ? `（${traits}）` : ""}`);
  } else {
    lines.push("九星: 不明");
  }

  // 日干
  if (div.dayKan) {
    const traits = DAY_KAN_TRAITS[div.dayKan as keyof typeof DAY_KAN_TRAITS];
    lines.push(`日干: ${div.dayKan}${traits ? `（${traits}）` : ""}`);
  } else {
    lines.push("日干: 不明");
  }

  return lines.join("\n");
}

/** 五行バランスをフォーマットする */
export function formatWuxing(div: DivinationResult): string {
  if (!div.wuxingProfile) return "不明";
  const w = div.wuxingProfile;
  return `木${w.wood} 火${w.fire} 土${w.earth} 金${w.metal} 水${w.water}`;
}
