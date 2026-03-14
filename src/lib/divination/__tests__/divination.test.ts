// 占術計算ロジックの単体テスト
import { describe, it, expect } from "vitest";
import { calculateSolarSign } from "../solar-sign";
import { calculateNumerology } from "../numerology";
import { calculateKyusei, calculateKyuseiFromBirth, getKyuseiYear } from "../kyusei";
import { calculateDayPillar, calculateYearPillar } from "../shichusuimei";
import { calculateWuxingProfile, getDominantElement } from "../wuxing";
import { calculateAllDivinations, calcDivinationProfile } from "../index";

// ============================================================
// 西洋星座
// ============================================================
describe("西洋星座計算", () => {
  it("牡羊座を正しく判定する（3月21日〜4月19日）", () => {
    expect(calculateSolarSign("1990-03-25")).toBe("牡羊座");
    expect(calculateSolarSign("1990-04-10")).toBe("牡羊座");
  });

  it("山羊座を正しく判定する（12月22日〜1月19日、年をまたぐ）", () => {
    expect(calculateSolarSign("1990-12-25")).toBe("山羊座");
    expect(calculateSolarSign("1991-01-10")).toBe("山羊座");
  });

  it("境界日を正しく判定する", () => {
    expect(calculateSolarSign("1990-03-21")).toBe("牡羊座");
    expect(calculateSolarSign("1990-03-20")).toBe("魚座");
    expect(calculateSolarSign("1990-01-19")).toBe("山羊座");
    expect(calculateSolarSign("1990-01-20")).toBe("水瓶座");
  });

  it("各星座が正しく判定される", () => {
    expect(calculateSolarSign("1990-02-15")).toBe("水瓶座");
    expect(calculateSolarSign("1990-05-15")).toBe("牡牛座");
    expect(calculateSolarSign("1990-06-15")).toBe("双子座");
    expect(calculateSolarSign("1990-07-15")).toBe("蟹座");
    expect(calculateSolarSign("1990-08-15")).toBe("獅子座");
    expect(calculateSolarSign("1990-09-15")).toBe("乙女座");
    expect(calculateSolarSign("1990-10-15")).toBe("天秤座");
    expect(calculateSolarSign("1990-11-15")).toBe("蠍座");
    expect(calculateSolarSign("1990-12-10")).toBe("射手座");
  });

  it("nullの場合はnullを返す", () => {
    expect(calculateSolarSign(null)).toBeNull();
    expect(calculateSolarSign("")).toBeNull();
  });
});

// ============================================================
// 数秘術（マスターナンバー対応）
// ============================================================
describe("数秘術計算", () => {
  it("1985/02/04 → 11（マスターナンバー）を正しく計算する", () => {
    // 1+9+8+5+0+2+0+4 = 29 → 2+9 = 11 → マスターナンバー
    expect(calculateNumerology("1985-02-04")).toBe(11);
  });

  it("1990/12/25 → 11（マスターナンバー）を正しく計算する", () => {
    // 1+9+9+0+1+2+2+5 = 29 → 2+9 = 11 → マスターナンバー
    expect(calculateNumerology("1990-12-25")).toBe(11);
  });

  it("1990/05/23 → 11（マスターナンバー）を正しく計算する", () => {
    // 1+9+9+0+0+5+2+3 = 29 → 2+9 = 11 → マスターナンバー
    expect(calculateNumerology("1990-05-23")).toBe(11);
  });

  it("1985/12/15 の誕生数を正しく計算する", () => {
    // 1+9+8+5+1+2+1+5 = 32 → 3+2 = 5
    expect(calculateNumerology("1985-12-15")).toBe(5);
  });

  it("2000/01/01 の誕生数を正しく計算する", () => {
    // 2+0+0+0+0+1+0+1 = 4
    expect(calculateNumerology("2000-01-01")).toBe(4);
  });

  it("1975/03/15 の誕生数を正しく計算する", () => {
    // 1+9+7+5+0+3+1+5 = 31 → 3+1 = 4
    expect(calculateNumerology("1975-03-15")).toBe(4);
  });

  it("マスターナンバー22を正しく判定する", () => {
    // 適切な日付を探す: 各桁の合計が22になる例
    // 1993-09-28 → 1+9+9+3+0+9+2+8 = 41 → 4+1 = 5（22にならない）
    // 直接的に22になる: 各桁合計=22 → 2+2=4（22じゃない）
    // 各桁合計が40→4+0=4、31→3+1=4、49→4+9=13→1+3=4...
    // 22になる例: 1978-04-08 → 1+9+7+8+0+4+0+8 = 37 → 3+7=10 → 1+0=1
    // 計算上22になる日付: 各桁合計が22の倍数ではなく、途中で22を通過する例
    // 例: 1999-11-29 → 1+9+9+9+1+1+2+9 = 41 → 4+1 = 5
    // 各桁合計が31 → 3+1=4, 40→4+0=4, 22→マスター, 13→1+3=4...
    // 各桁合計が22: 1949-12-29 → 1+9+4+9+1+2+2+9 = 37 → 3+7=10→1+0=1
    // 各桁合計が31→3+1=4... 22にはなりにくい
    // 合計が22になる日付: 2+0+0+8+0+3+0+9 = 22 → マスターナンバー!
    expect(calculateNumerology("2008-03-09")).toBe(22);
  });

  it("マスターナンバー33を正しく判定する", () => {
    // 合計が33になる日付: 1+9+7+9+0+8+0+8 = 42 → 4+2=6
    // 合計が33: 1+9+8+6+0+9+0+9 = 42→6, nope
    // 2+0+1+9+1+2+0+9 = 24→2+4=6, nope
    // 合計が33: 1+9+9+5+0+9+0+9 = 42→6, nope
    // 合計が42→4+2=6, 51→5+1=6, 60→6+0=6
    // 33 directly: 3+3=6... 合計が33なら33を返す
    // 1+9+8+8+0+8+0+8 = 42→4+2=6
    // 1+9+9+6+0+8+0+9 = 42→6
    // 合計=33: 8+7+0+9+0+9 = 33... needs 8 digits
    // 2+0+0+5+0+8+0+9 = 24→2+4=6
    // 1+9+7+7+0+9+0+9 = 42→4+2=6
    // 1978-08-09 → 1+9+7+8+0+8+0+9 = 42→4+2=6
    // 合計33: 日付8桁で33になるには...
    // 1+9+6+8+0+9+0+9 = 42→6
    // 各桁合計=33は8桁では実は可能: 例 "19590930"→1+9+5+9+0+9+3+0=36→3+6=9
    // 19590912→1+9+5+9+0+9+1+2=36→9
    // 各桁合計=33: "19590903"→1+9+5+9+0+9+0+3=36 still not
    // "19870825"→1+9+8+7+0+8+2+5=40→4+0=4
    // "19591228"→1+9+5+9+1+2+2+8=37→10→1
    // "19870915"→1+9+8+7+0+9+1+5=40→4
    // 合計=33にする例: "19780906"→1+9+7+8+0+9+0+6=40→4
    // 各桁合計=33: 4文字年+2月+2日 = max 9*8=72
    // 例: 1995-08-19 → 1+9+9+5+0+8+1+9 = 42→6
    // 例: 1992-09-12 → 1+9+9+2+0+9+1+2 = 33 → マスター!
    expect(calculateNumerology("1992-09-12")).toBe(33);
  });

  it("nullの場合はnullを返す", () => {
    expect(calculateNumerology(null)).toBeNull();
  });
});

// ============================================================
// 九星気学（立春境界対応）
// ============================================================
describe("九星気学計算", () => {
  it("1990年生まれ → 一白水星を正しく計算する", () => {
    // 1+9+9+0 = 19 → 1+9 = 10 → 1+0 = 1 → 11-1 = 10 → 10-9 = 1 → 一白水星
    expect(calculateKyusei(1990)).toBe("一白水星");
  });

  it("1985年生まれ → 六白金星を正しく計算する", () => {
    // 1+9+8+5 = 23 → 2+3 = 5 → 11-5 = 6 → 六白金星
    expect(calculateKyusei(1985)).toBe("六白金星");
  });

  it("1975年生まれ → 七赤金星を正しく計算する", () => {
    // 1+9+7+5 = 22 → 2+2 = 4 → 11-4 = 7 → 七赤金星
    expect(calculateKyusei(1975)).toBe("七赤金星");
  });

  it("2000年生まれ → 九紫火星を正しく計算する", () => {
    // 2+0+0+0 = 2 → 11-2 = 9 → 九紫火星
    expect(calculateKyusei(2000)).toBe("九紫火星");
  });

  it("1999年生まれ → 一白水星を正しく計算する", () => {
    // 1+9+9+9 = 28 → 2+8 = 10 → 1+0 = 1 → 11-1 = 10 → 10-9 = 1 → 一白水星
    expect(calculateKyusei(1999)).toBe("一白水星");
  });

  it("nullの場合はnullを返す", () => {
    expect(calculateKyusei(null)).toBeNull();
    expect(calculateKyuseiFromBirth(null, null)).toBeNull();
  });
});

describe("九星気学 立春境界", () => {
  it("getKyuseiYear: 2月4日以降は当年", () => {
    expect(getKyuseiYear(2000, 2, 4)).toBe(2000);
    expect(getKyuseiYear(2000, 3, 1)).toBe(2000);
    expect(getKyuseiYear(2000, 12, 31)).toBe(2000);
  });

  it("getKyuseiYear: 2月3日以前は前年扱い", () => {
    expect(getKyuseiYear(2000, 1, 1)).toBe(1999);
    expect(getKyuseiYear(2000, 1, 15)).toBe(1999);
    expect(getKyuseiYear(2000, 2, 3)).toBe(1999);
  });

  it("2000年1月15日生まれ → 前年(1999)で計算 → 一白水星", () => {
    // 1月15日は立春前なので1999年として計算
    // 1999: 1+9+9+9=28→2+8=10→1+0=1→11-1=10→1→一白水星
    expect(calculateKyuseiFromBirth("2000-01-15", null)).toBe("一白水星");
  });

  it("1985年2月4日生まれ → 当年(1985)で計算 → 六白金星", () => {
    // 2月4日は立春当日なので1985年として計算
    expect(calculateKyuseiFromBirth("1985-02-04", null)).toBe("六白金星");
  });

  it("1985年2月3日生まれ → 前年(1984)で計算 → 七赤金星", () => {
    // 2月3日は立春前なので1984年として計算
    // 1984: 1+9+8+4=22→2+2=4→11-4=7→七赤金星
    expect(calculateKyuseiFromBirth("1985-02-03", null)).toBe("七赤金星");
  });

  it("birthDateがない場合はbirthYearで計算（立春補正なし）", () => {
    expect(calculateKyuseiFromBirth(null, 1985)).toBe("六白金星");
    expect(calculateKyuseiFromBirth(null, 1990)).toBe("一白水星");
  });
});

// ============================================================
// 四柱推命・日柱
// ============================================================
describe("四柱推命・日柱計算", () => {
  it("日柱を計算し、天干と地支を返す", () => {
    const result = calculateDayPillar("1990-05-23");
    expect(result).not.toBeNull();
    expect(result!.dayKan).toBeDefined();
    expect(result!.dayBranch).toBeDefined();
    expect(result!.pillar).toBe(`${result!.dayKan}${result!.dayBranch}`);
  });

  it("異なる日付では異なる日柱が返る可能性がある", () => {
    const result1 = calculateDayPillar("1990-05-23");
    const result2 = calculateDayPillar("1990-05-24");
    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    // 連続する日は異なる日柱になる
    expect(result1!.pillar).not.toBe(result2!.pillar);
  });

  it("60日周期で同じ干支に戻る", () => {
    const result1 = calculateDayPillar("2000-01-01");
    const result2 = calculateDayPillar("2000-03-01"); // 60日後
    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.pillar).toBe(result2!.pillar);
  });

  it("nullの場合はnullを返す", () => {
    expect(calculateDayPillar(null)).toBeNull();
    expect(calculateDayPillar("")).toBeNull();
  });
});

// ============================================================
// 四柱推命・年柱（立春境界対応）
// ============================================================
describe("四柱推命・年柱計算", () => {
  it("1985年2月4日 → 乙丑（きのとうし）", () => {
    // 1985年: (1985-4)=1981 → stem=1981%10=1(乙), branch=1981%12=1(丑)
    const result = calculateYearPillar("1985-02-04", null);
    expect(result).not.toBeNull();
    expect(result!.pillar).toBe("乙丑");
  });

  it("1990年12月25日 → 庚午", () => {
    // 1990年: (1990-4)=1986 → stem=1986%10=6(庚), branch=1986%12=6(午)
    const result = calculateYearPillar("1990-12-25", null);
    expect(result).not.toBeNull();
    expect(result!.pillar).toBe("庚午");
  });

  it("2000年1月15日 → 立春前なので1999年 → 己卯", () => {
    // 1999年: (1999-4)=1995 → stem=1995%10=5(己), branch=1995%12=3(卯)
    const result = calculateYearPillar("2000-01-15", null);
    expect(result).not.toBeNull();
    expect(result!.pillar).toBe("己卯");
  });

  it("2000年2月4日 → 立春当日なので2000年 → 庚辰", () => {
    // 2000年: (2000-4)=1996 → stem=1996%10=6(庚), branch=1996%12=4(辰)
    const result = calculateYearPillar("2000-02-04", null);
    expect(result).not.toBeNull();
    expect(result!.pillar).toBe("庚辰");
  });

  it("birthDateがない場合はbirthYearで計算", () => {
    const result = calculateYearPillar(null, 1985);
    expect(result).not.toBeNull();
    expect(result!.pillar).toBe("乙丑");
  });

  it("nullの場合はnullを返す", () => {
    expect(calculateYearPillar(null, null)).toBeNull();
  });
});

// ============================================================
// 五行プロフィール
// ============================================================
describe("五行プロフィール計算", () => {
  it("星座と九星の組み合わせから五行プロフィールを計算する", () => {
    const profile = calculateWuxingProfile("牡羊座", "一白水星");
    expect(profile).not.toBeNull();
    expect(profile!.wood).toBeGreaterThanOrEqual(0);
    expect(profile!.fire).toBeGreaterThanOrEqual(0);
    expect(profile!.earth).toBeGreaterThanOrEqual(0);
    expect(profile!.metal).toBeGreaterThanOrEqual(0);
    expect(profile!.water).toBeGreaterThanOrEqual(0);
  });

  it("星座のみでも計算できる", () => {
    const profile = calculateWuxingProfile("獅子座", null);
    expect(profile).not.toBeNull();
    expect(profile!.fire).toBe(3); // 獅子座は火が3
  });

  it("九星のみでも計算できる", () => {
    const profile = calculateWuxingProfile(null, "九紫火星");
    expect(profile).not.toBeNull();
    expect(profile!.fire).toBe(3); // 九紫火星は火が3
  });

  it("最も強い要素を取得できる", () => {
    const profile = calculateWuxingProfile("獅子座", "九紫火星");
    expect(profile).not.toBeNull();
    const dominant = getDominantElement(profile!);
    expect(dominant).toBe("火");
  });

  it("両方nullの場合はnullを返す", () => {
    expect(calculateWuxingProfile(null, null)).toBeNull();
  });
});

// ============================================================
// 統合テストケース（ユーザー指定のテストケース）
// ============================================================
describe("テストケース1: 1985年2月4日生まれ", () => {
  const result = calcDivinationProfile({ birthDate: "1985-02-04" });

  it("太陽星座: 水瓶座（1/20〜2/18）", () => {
    expect(result.solarSign).toBe("水瓶座");
  });

  it("九星気学: 六白金星（1985年、立春当日→当年扱い）", () => {
    expect(result.kyusei).toBe("六白金星");
  });

  it("数秘術: マスターナンバー11（29→11）", () => {
    // 1+9+8+5+0+2+0+4 = 29 → 2+9 = 11 → マスターナンバー
    expect(result.numerology).toBe(11);
  });

  it("年柱: 乙丑", () => {
    expect(result.yearPillar).toBe("乙丑");
  });
});

describe("テストケース2: 1990年12月25日生まれ", () => {
  const result = calcDivinationProfile({ birthDate: "1990-12-25" });

  it("太陽星座: 山羊座", () => {
    expect(result.solarSign).toBe("山羊座");
  });

  it("九星気学: 一白水星", () => {
    expect(result.kyusei).toBe("一白水星");
  });

  it("数秘術: マスターナンバー11（29→11）", () => {
    // 1+9+9+0+1+2+2+5 = 29 → 2+9 = 11 → マスターナンバー
    expect(result.numerology).toBe(11);
  });

  it("年柱: 庚午", () => {
    expect(result.yearPillar).toBe("庚午");
  });
});

describe("テストケース3: 2000年1月15日生まれ（立春前＝前年扱い）", () => {
  const result = calcDivinationProfile({ birthDate: "2000-01-15" });

  it("太陽星座: 山羊座", () => {
    expect(result.solarSign).toBe("山羊座");
  });

  it("九星気学: 1999年で計算 → 一白水星", () => {
    // 1月15日は立春前なので1999年扱い
    // 1999: 1+9+9+9=28→2+8=10→1+0=1→11-1=10→1→一白水星
    expect(result.kyusei).toBe("一白水星");
  });

  it("年柱: 1999年で計算 → 己卯", () => {
    expect(result.yearPillar).toBe("己卯");
  });
});

// ============================================================
// 全占術一括計算（後方互換）
// ============================================================
describe("全占術一括計算", () => {
  it("生年月日ありの場合、すべての計算結果が返る", () => {
    const result = calculateAllDivinations("1990-05-23", null);
    expect(result.solarSign).toBe("双子座");
    expect(result.numerology).toBe(11); // マスターナンバー対応
    expect(result.kyusei).toBe("一白水星");
    expect(result.dayKan).not.toBeNull();
    expect(result.dayPillar).not.toBeNull();
    expect(result.yearPillar).not.toBeNull();
    expect(result.wuxingProfile).not.toBeNull();
  });

  it("生まれ年のみの場合、九星と年柱が計算される", () => {
    const result = calculateAllDivinations(null, 1985);
    expect(result.solarSign).toBeNull();
    expect(result.numerology).toBeNull();
    expect(result.kyusei).toBe("六白金星");
    expect(result.dayKan).toBeNull();
    expect(result.dayPillar).toBeNull();
    expect(result.yearPillar).toBe("乙丑"); // 年柱も計算される
    // 九星のみの場合も五行プロフィールは計算される
    expect(result.wuxingProfile).not.toBeNull();
  });

  it("情報なしの場合、すべてnull", () => {
    const result = calculateAllDivinations(null, null);
    expect(result.solarSign).toBeNull();
    expect(result.numerology).toBeNull();
    expect(result.kyusei).toBeNull();
    expect(result.dayKan).toBeNull();
    expect(result.dayPillar).toBeNull();
    expect(result.yearPillar).toBeNull();
    expect(result.wuxingProfile).toBeNull();
  });
});

describe("共通関数 calcDivinationProfile", () => {
  it("DivinationInput形式で同じ結果を返す", () => {
    const result = calcDivinationProfile({ birthDate: "1990-05-23" });
    expect(result.solarSign).toBe("双子座");
    expect(result.numerology).toBe(11); // マスターナンバー対応
    expect(result.kyusei).toBe("一白水星");
    expect(result.dayKan).not.toBeNull();
    expect(result.yearPillar).not.toBeNull();
  });

  it("birthYearのみでも九星と年柱が計算される", () => {
    const result = calcDivinationProfile({ birthYear: 1985 });
    expect(result.kyusei).toBe("六白金星");
    expect(result.yearPillar).toBe("乙丑");
    expect(result.solarSign).toBeNull();
  });

  it("空入力でもエラーにならない", () => {
    const result = calcDivinationProfile({});
    expect(result.solarSign).toBeNull();
    expect(result.kyusei).toBeNull();
    expect(result.yearPillar).toBeNull();
    expect(result.wuxingProfile).toBeNull();
  });

  it("calculateAllDivinationsと同じ結果を返す（後方互換）", () => {
    const a = calculateAllDivinations("1975-03-15", null);
    const b = calcDivinationProfile({ birthDate: "1975-03-15" });
    expect(a).toEqual(b);
  });
});
