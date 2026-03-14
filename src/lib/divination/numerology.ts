// 数秘術（誕生数）計算ロジック
// マスターナンバー（11, 22, 33）を保持する

/** 各誕生数の基本特性 */
export const NUMEROLOGY_TRAITS: Record<number, string> = {
  1: "リーダーシップ・独立心・先駆者・意志が強い・自己中心的になりやすい",
  2: "協調性・感受性・仲裁者・依存しやすい・パートナーシップを重視",
  3: "表現力・社交的・楽観的・散漫になりやすい・創造性が高い",
  4: "堅実・秩序・努力家・融通が利かない・基盤を築く力がある",
  5: "自由・変化・冒険心・不安定・多才で適応力がある",
  6: "責任感・調和・美意識・過干渉・家庭や共同体を大切にする",
  7: "分析力・探求心・内省的・孤独になりやすい・スピリチュアルな素質",
  8: "権力・物質的成功・組織力・支配的・ビジネス感覚が鋭い",
  9: "博愛・完成・理想主義・執着を手放しにくい・人類愛に溢れる",
  // マスターナンバー
  11: "直感力・霊感・高い理想・繊細・インスピレーションの伝達者・二面性を持つ",
  22: "マスタービルダー・大きなビジョンを実現する力・実践的な理想主義者・プレッシャーに弱い",
  33: "マスターティーチャー・無条件の愛・献身・自己犠牲・精神的な導き手",
};

/** マスターナンバーの定義 */
const MASTER_NUMBERS = [11, 22, 33] as const;

/**
 * 数字の各桁を合計する
 */
function sumDigits(num: number): number {
  return Math.abs(num)
    .toString()
    .split("")
    .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
}

/**
 * 生年月日から誕生数を計算する
 * 各桁を足してマスターナンバー（11, 22, 33）または1桁になるまで繰り返す
 *
 * 例: 1985/02/04 → 1+9+8+5+0+2+0+4 = 29 → 2+9 = 11 → マスターナンバー11
 * 例: 1975/03/15 → 1+9+7+5+0+3+1+5 = 31 → 3+1 = 4
 *
 * @param birthDate YYYY-MM-DD形式の文字列
 * @returns 誕生数（1〜9 または 11, 22, 33）またはnull
 */
export function calculateNumerology(birthDate: string | null): number | null {
  if (!birthDate) return null;

  // 日付文字列からハイフンを除去して数字のみにする
  const digits = birthDate.replace(/-/g, "");

  if (!/^\d+$/.test(digits)) return null;

  // 全桁の合計を計算
  let total = digits
    .split("")
    .reduce((sum, digit) => sum + parseInt(digit, 10), 0);

  // マスターナンバーまたは1桁になるまで繰り返す
  while (total >= 10) {
    // マスターナンバーチェック
    if ((MASTER_NUMBERS as readonly number[]).includes(total)) {
      return total;
    }
    total = sumDigits(total);
  }

  // 1〜9の範囲チェック
  if (total < 1 || total > 9) return null;

  return total;
}
