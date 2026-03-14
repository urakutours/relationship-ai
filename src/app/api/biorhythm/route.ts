// バイオリズム（今日のアドバイス）API（Haiku呼び出し・軽量版）
// 月次・週次ガイダンスキャッシュを文脈として渡し、占術DBは直接渡さない
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBiorhythmAdvice } from "@/lib/ai/haiku";
import { getMonthKey, getISOWeekKey } from "@/lib/date-utils";
import { checkRateLimit, RATE_LIMITS, rateLimitError } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const globalCheck = checkRateLimit("global", RATE_LIMITS.global);
    if (!globalCheck.allowed) return NextResponse.json(rateLimitError(globalCheck.remaining), { status: 429 });

    const { weather = "晴れ" } = await request.json();

    // 今日の日付
    const today = new Date();
    const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    // 並列取得: プロフィール、月次キャッシュ、週次キャッシュ、人物数、直近相談
    const monthKey = getMonthKey(today);
    const weekKey = getISOWeekKey(today);

    const [userProfile, monthlyCache, weeklyCache, personCount, lastConsult] =
      await Promise.all([
        prisma.userProfile.findUnique({ where: { id: 1 } }),
        prisma.guidanceCache.findUnique({
          where: { type_periodKey: { type: "monthly", periodKey: monthKey } },
        }),
        prisma.guidanceCache.findUnique({
          where: { type_periodKey: { type: "weekly", periodKey: weekKey } },
        }),
        prisma.person.count(),
        prisma.consultationLog.findFirst({
          orderBy: { createdAt: "desc" },
          include: { person: { select: { nickname: true } } },
        }),
      ]);

    // Haiku呼び出し（軽量版: 月次・週次コンテキスト＋プロフィール連動）
    const result = await generateBiorhythmAdvice(
      todayStr,
      weather,
      monthlyCache?.content ?? null,
      weeklyCache?.content ?? null,
      userProfile
        ? { mbti: userProfile.mbti, gender: userProfile.gender }
        : null,
      { personCount, lastConsultedPerson: lastConsult?.person?.nickname ?? null }
    );

    return NextResponse.json({
      advice: result.advice,
      date: todayStr,
      weather,
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("バイオリズム生成エラー:", error);
    return NextResponse.json(
      { error: "アドバイスの生成に失敗しました" },
      { status: 500 }
    );
  }
}
