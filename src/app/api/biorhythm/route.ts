// バイオリズム（今日のアドバイス）API（Haiku呼び出し）
// 月次ガイダンスのコンテキストとユーザープロフィールを活用
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBiorhythmAdvice } from "@/lib/ai/haiku";
import { getMonthKey } from "@/lib/date-utils";

export async function POST(request: NextRequest) {
  try {
    const { weather = "晴れ" } = await request.json();

    // 今日の日付
    const today = new Date();
    const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    // ユーザープロフィール取得
    const userProfile = await prisma.userProfile.findUnique({ where: { id: 1 } });

    // 月次ガイダンスキャッシュ取得（コンテキストとして渡す）
    const monthKey = getMonthKey(today);
    const monthlyCache = await prisma.guidanceCache.findUnique({
      where: { type_periodKey: { type: "monthly", periodKey: monthKey } },
    });

    // Haiku呼び出し（月次コンテキスト＋プロフィール連動）
    const result = await generateBiorhythmAdvice(
      todayStr,
      weather,
      monthlyCache?.content ?? null,
      userProfile
        ? { mbti: userProfile.mbti, gender: userProfile.gender }
        : null
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
