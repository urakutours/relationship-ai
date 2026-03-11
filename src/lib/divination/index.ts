// 占術計算の統合エントリポイント

import type { DivinationResult } from "@/lib/types";
import { calculateSolarSign } from "./solar-sign";
import { calculateNumerology } from "./numerology";
import { calculateKyuseiFromBirth } from "./kyusei";
import { calculateDayPillar } from "./shichusuimei";
import { calculateWuxingProfile } from "./wuxing";

export {
  calculateSolarSign,
  SOLAR_SIGN_TRAITS,
  SOLAR_SIGNS,
} from "./solar-sign";
export { calculateNumerology, NUMEROLOGY_TRAITS } from "./numerology";
export {
  calculateKyusei,
  calculateKyuseiFromBirth,
  KYUSEI_TRAITS,
  KYUSEI_NAMES,
} from "./kyusei";
export { calculateDayPillar, DAY_KAN_TRAITS, TEN_STEMS } from "./shichusuimei";
export {
  calculateWuxingProfile,
  getDominantElement,
  getWeakestElement,
  WUXING_NAMES,
} from "./wuxing";

/**
 * 占術計算の共通入力型
 * Person と UserProfile の両方から使えるようにする
 */
export interface DivinationInput {
  birthDate?: string | null; // YYYY-MM-DD形式
  birthYear?: number | null;
  birthCountry?: string | null;
}

/**
 * 占術プロフィールを一括計算する共通関数
 * Person・UserProfile の両方から呼ばれる
 *
 * @param input 生年月日・生まれ年・出身国
 * @returns 全占術の計算結果
 */
export function calcDivinationProfile(input: DivinationInput): DivinationResult {
  const birthDate = input.birthDate ?? null;
  const birthYear = input.birthYear ?? null;

  const solarSign = calculateSolarSign(birthDate);
  const numerology = calculateNumerology(birthDate);
  const kyusei = calculateKyuseiFromBirth(birthDate, birthYear);
  const dayPillarResult = calculateDayPillar(birthDate);
  const wuxingProfile = calculateWuxingProfile(solarSign, kyusei);

  return {
    solarSign,
    numerology,
    kyusei,
    dayKan: dayPillarResult?.dayKan ?? null,
    dayPillar: dayPillarResult?.pillar ?? null,
    wuxingProfile,
  };
}

/**
 * 人物の情報から全占術を一括計算する（後方互換ラッパー）
 *
 * @param birthDate YYYY-MM-DD形式の生年月日（null可）
 * @param birthYear 生まれた年（null可、birthDateがない場合のフォールバック）
 * @returns 全占術の計算結果
 */
export function calculateAllDivinations(
  birthDate: string | null,
  birthYear: number | null
): DivinationResult {
  return calcDivinationProfile({ birthDate, birthYear });
}
