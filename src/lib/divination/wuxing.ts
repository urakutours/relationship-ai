// 五行プロフィール計算ロジック

import type { WuxingProfile } from "@/lib/types";
import type { SolarSign } from "./solar-sign";
import { SOLAR_SIGN_WUXING } from "./solar-sign";
import type { KyuseiName } from "./kyusei";
import { KYUSEI_WUXING } from "./kyusei";

/**
 * 五行の相生関係（育てる関係）
 * 木→火→土→金→水→木
 */
export const WUXING_GENERATE: Record<string, string> = {
  wood: "fire", // 木生火
  fire: "earth", // 火生土
  earth: "metal", // 土生金
  metal: "water", // 金生水
  water: "wood", // 水生木
};

/**
 * 五行の相克関係（抑える関係）
 * 木→土→水→火→金→木
 */
export const WUXING_OVERCOME: Record<string, string> = {
  wood: "earth", // 木克土
  earth: "water", // 土克水
  water: "fire", // 水克火
  fire: "metal", // 火克金
  metal: "wood", // 金克木
};

/**
 * 五行の日本語名
 */
export const WUXING_NAMES: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

/**
 * 西洋星座と九星の組み合わせから五行プロフィールを計算する
 *
 * @param solarSign 西洋星座
 * @param kyusei 九星
 * @returns 五行プロフィール（各要素のスコア）またはnull
 */
export function calculateWuxingProfile(
  solarSign: SolarSign | null,
  kyusei: KyuseiName | null
): WuxingProfile | null {
  // 少なくとも1つのデータが必要
  if (!solarSign && !kyusei) return null;

  const profile: WuxingProfile = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  // 西洋星座からの五行スコアを加算
  if (solarSign && SOLAR_SIGN_WUXING[solarSign]) {
    const solarWuxing = SOLAR_SIGN_WUXING[solarSign];
    profile.wood += solarWuxing.wood;
    profile.fire += solarWuxing.fire;
    profile.earth += solarWuxing.earth;
    profile.metal += solarWuxing.metal;
    profile.water += solarWuxing.water;
  }

  // 九星からの五行スコアを加算
  if (kyusei && KYUSEI_WUXING[kyusei]) {
    const kyuseiWuxing = KYUSEI_WUXING[kyusei];
    profile.wood += kyuseiWuxing.wood;
    profile.fire += kyuseiWuxing.fire;
    profile.earth += kyuseiWuxing.earth;
    profile.metal += kyuseiWuxing.metal;
    profile.water += kyuseiWuxing.water;
  }

  return profile;
}

/**
 * 五行プロフィールから最も強い要素を返す
 */
export function getDominantElement(profile: WuxingProfile): string {
  const entries = Object.entries(profile) as Array<[string, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  return WUXING_NAMES[entries[0][0]];
}

/**
 * 五行プロフィールから最も弱い要素を返す
 */
export function getWeakestElement(profile: WuxingProfile): string {
  const entries = Object.entries(profile) as Array<[string, number]>;
  entries.sort((a, b) => a[1] - b[1]);
  return WUXING_NAMES[entries[0][0]];
}
