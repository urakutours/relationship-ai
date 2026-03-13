// GET /api/guidance/weekly
// Sonnet で週次ガイダンスを生成・キャッシュ（月次コンテキスト参照）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcDivinationProfile } from "@/lib/divination";
import { generateWeeklyGuidance } from "@/lib/ai/sonnet";
import { getISOWeekKey, getMonthKey, formatWeekRange } from "@/lib/date-utils";

export async function GET() {
  try {
    const now = new Date();
    const weekKey = getISOWeekKey(now);
    const monthKey = getMonthKey(now);

    // キャッシュチェック
    const cached = await prisma.guidanceCache.findUnique({
      where: { type_periodKey: { type: "weekly", periodKey: weekKey } },
    });

    if (cached) {
      return NextResponse.json({
        guidance: JSON.parse(cached.content),
        periodKey: weekKey,
        weekRange: formatWeekRange(now),
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

    // 月次キャッシュを取得（コンテキストとして渡す）
    const monthlyCache = await prisma.guidanceCache.findUnique({
      where: { type_periodKey: { type: "monthly", periodKey: monthKey } },
    });

    const weekRangeStr = formatWeekRange(now);

    // Sonnet で生成
    const result = await generateWeeklyGuidance(
      {
        nickname: userProfile.nickname,
        mbti: userProfile.mbti,
        gender: userProfile.gender,
        memoTags: userProfile.memoTags
          ? (JSON.parse(userProfile.memoTags) as string[])
          : [],
      },
      div,
      weekKey,
      weekRangeStr,
      monthlyCache?.content ?? null
    );

    // DB保存
    await prisma.guidanceCache.create({
      data: {
        type: "weekly",
        periodKey: weekKey,
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
      periodKey: weekKey,
      weekRange: weekRangeStr,
      generatedAt: new Date().toISOString(),
      fromCache: false,
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("週次ガイダンス生成エラー:", error);
    return NextResponse.json(
      { error: "週次ガイダンスの生成に失敗しました" },
      { status: 500 }
    );
  }
}
