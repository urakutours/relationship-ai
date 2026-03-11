// バイオリズム（今日のアドバイス）API（Haiku呼び出し）
import { NextRequest, NextResponse } from "next/server";
import { generateBiorhythmAdvice } from "@/lib/ai/haiku";

export async function POST(request: NextRequest) {
  try {
    const { weather = "晴れ" } = await request.json();

    // 今日の日付
    const today = new Date();
    const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    // Haiku呼び出し
    const result = await generateBiorhythmAdvice(todayStr, weather);

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
