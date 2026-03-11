// 相性スコアAPI（Haiku呼び出し）
// personId1 に "myself" を指定すると、UserProfile(id=1) を自分として使用
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllDivinations, calcDivinationProfile } from "@/lib/divination";
import { generateCompatibilityScore } from "@/lib/ai/haiku";
import type { DivinationResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { personId1, personId2 } = await request.json();

    if (!personId1 || !personId2) {
      return NextResponse.json(
        { error: "2人の人物IDが必要です" },
        { status: 400 }
      );
    }

    // person1の情報を取得（"myself"の場合はUserProfileを使用）
    let name1: string;
    let traits1: string[];
    let div1: DivinationResult;

    if (personId1 === "myself") {
      const profile = await prisma.userProfile.findUnique({
        where: { id: 1 },
      });
      if (!profile) {
        return NextResponse.json(
          { error: "自分のプロフィールが未登録です" },
          { status: 404 }
        );
      }
      name1 = profile.nickname;
      let memoTags: string[] = [];
      try {
        memoTags = JSON.parse(profile.memoTags || "[]");
      } catch {
        memoTags = [];
      }
      traits1 = memoTags;
      div1 = calcDivinationProfile({
        birthDate: profile.birthDate,
        birthYear: profile.birthYear,
      });
    } else {
      const person1 = await prisma.person.findUnique({
        where: { id: personId1 },
        include: { observations: true },
      });
      if (!person1) {
        return NextResponse.json(
          { error: "人物1が見つかりません" },
          { status: 404 }
        );
      }
      name1 = person1.nickname;
      traits1 = person1.observations.map((o) => o.content);
      div1 = calculateAllDivinations(person1.birthDate, person1.birthYear);
    }

    // person2の情報を取得
    const person2 = await prisma.person.findUnique({
      where: { id: personId2 },
      include: { observations: true },
    });

    if (!person2) {
      return NextResponse.json(
        { error: "人物2が見つかりません" },
        { status: 404 }
      );
    }

    const div2 = calculateAllDivinations(
      person2.birthDate,
      person2.birthYear
    );

    // Haiku呼び出し
    const result = await generateCompatibilityScore(
      name1,
      traits1,
      div1,
      person2.nickname,
      person2.observations.map((o) => o.content),
      div2
    );

    return NextResponse.json({
      score: result.score,
      comment: result.comment,
      person1: { nickname: name1, divination: div1 },
      person2: { nickname: person2.nickname, divination: div2 },
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("相性スコア生成エラー:", error);
    return NextResponse.json(
      { error: "相性スコアの生成に失敗しました" },
      { status: 500 }
    );
  }
}
