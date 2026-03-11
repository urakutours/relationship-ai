// 占術計算ロジックの単体テスト
import { describe, it, expect } from "vitest";
import { calculateSolarSign } from "../solar-sign";
import { calculateNumerology } from "../numerology";
import { calculateKyusei, calculateKyuseiFromBirth } from "../kyusei";
import { calculateDayPillar } from "../shichusuimei";
import { calculateWuxingProfile, getDominantElement } from "../wuxing";
import { calculateAllDivinations } from "../index";

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

describe("数秘術計算", () => {
  it("1990/05/23 → 2 を正しく計算する", () => {
    // 1+9+9+0+0+5+2+3 = 29 → 2+9 = 11 → 1+1 = 2
    expect(calculateNumerology("1990-05-23")).toBe(2);
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

  it("nullの場合はnullを返す", () => {
    expect(calculateNumerology(null)).toBeNull();
  });
});

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

  it("生年月日から九星を計算できる", () => {
    expect(calculateKyuseiFromBirth("1990-05-23", null)).toBe("一白水星");
    expect(calculateKyuseiFromBirth(null, 1985)).toBe("六白金星");
  });

  it("nullの場合はnullを返す", () => {
    expect(calculateKyusei(null)).toBeNull();
    expect(calculateKyuseiFromBirth(null, null)).toBeNull();
  });
});

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

describe("全占術一括計算", () => {
  it("生年月日ありの場合、すべての計算結果が返る", () => {
    const result = calculateAllDivinations("1990-05-23", null);
    expect(result.solarSign).toBe("双子座");
    expect(result.numerology).toBe(2);
    expect(result.kyusei).toBe("一白水星");
    expect(result.dayKan).not.toBeNull();
    expect(result.dayPillar).not.toBeNull();
    expect(result.wuxingProfile).not.toBeNull();
  });

  it("生まれ年のみの場合、九星のみ計算される", () => {
    const result = calculateAllDivinations(null, 1985);
    expect(result.solarSign).toBeNull();
    expect(result.numerology).toBeNull();
    expect(result.kyusei).toBe("六白金星");
    expect(result.dayKan).toBeNull();
    expect(result.dayPillar).toBeNull();
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
    expect(result.wuxingProfile).toBeNull();
  });
});
