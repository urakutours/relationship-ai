// 相性スコアAPI（Haiku呼び出し）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAllDivinations } from "@/lib/divination";
import { generateCompatibilityScore } from "@/lib/ai/haiku";

export async function POST(request: NextRequest) {
  try {
    const { personId1, personId2 } = await request.json();

    if (!personId1 || !personId2) {
      return NextResponse.json(
        { error: "2人の人物IDが必要です" },
        { status: 400 }
      );
    }

    // 人物情報を取得
    const [person1, person2] = await Promise.all([
      prisma.person.findUnique({
        where: { id: personId1 },
        include: { observations: true },
      }),
      prisma.person.findUnique({
        where: { id: personId2 },
        include: { observations: true },
      }),
    ]);

    if (!person1 || !person2) {
      return NextResponse.json(
        { error: "人物が見つかりません" },
        { status: 404 }
      );
    }

    // 占術計算
    const div1 = calculateAllDivinations(
      person1.birthDate,
      person1.birthYear
    );
    const div2 = calculateAllDivinations(
      person2.birthDate,
      person2.birthYear
    );

    // Haiku呼び出し
    const result = await generateCompatibilityScore(
      person1.nickname,
      person1.observations.map((o) => o.content),
      div1,
      person2.nickname,
      person2.observations.map((o) => o.content),
      div2
    );

    return NextResponse.json({
      score: result.score,
      comment: result.comment,
      person1: { nickname: person1.nickname, divination: div1 },
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
