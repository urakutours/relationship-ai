// GET /api/guidance/monthly
// Sonnet で月次ガイダンスを生成・キャッシュ
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcDivinationProfile } from "@/lib/divination";
import { generateMonthlyGuidance } from "@/lib/ai/sonnet";
import { getMonthKey } from "@/lib/date-utils";

export async function GET() {
  try {
    const monthKey = getMonthKey(new Date());

    // キャッシュチェック
    const cached = await prisma.guidanceCache.findUnique({
      where: { type_periodKey: { type: "monthly", periodKey: monthKey } },
    });

    if (cached) {
      return NextResponse.json({
        guidance: JSON.parse(cached.content),
        periodKey: monthKey,
        generatedAt: cached.generatedAt.toISOString(),
        fromCache: true,
      });
    }

    // ユーザープロフィール取得
    const userProfile = await prisma.userProfile.findUnique({ where: { id: 1 } });
    if (!userProfile) {
      return NextResponse.json(
        { error: "プロフィールが登録されていません" },
        { status: 404 }
      );
    }

    // 占術計算
    const div = calcDivinationProfile({
      birthDate: userProfile.birthDate,
      birthYear: userProfile.birthYear,
    });

    // Sonnet で生成
    const result = await generateMonthlyGuidance(
      {
        nickname: userProfile.nickname,
        mbti: userProfile.mbti,
        gender: userProfile.gender,
        memoTags: userProfile.memoTags
          ? (JSON.parse(userProfile.memoTags) as string[])
          : [],
      },
      div,
      monthKey
    );

    // DB保存
    await prisma.guidanceCache.create({
      data: {
        type: "monthly",
        periodKey: monthKey,
        content: result.content,
      },
    });

    // JSONパースして返却
    let guidance;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      guidance = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.content };
    } catch {
      guidance = { raw: result.content };
    }

    return NextResponse.json({
      guidance,
      periodKey: monthKey,
      generatedAt: new Date().toISOString(),
      fromCache: false,
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("月次ガイダンス生成エラー:", error);
    return NextResponse.json(
      { error: "月次ガイダンスの生成に失敗しました" },
      { status: 500 }
    );
  }
}
