// プロフィール用占術プレビューAPI
// 生年月日/生まれ年からリアルタイムで占術結果を返す
import { NextRequest, NextResponse } from "next/server";
import { calcDivinationProfile } from "@/lib/divination";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const birthDate = searchParams.get("birthDate") || null;
    const birthYearStr = searchParams.get("birthYear");
    const birthYear = birthYearStr ? parseInt(birthYearStr, 10) : null;

    const divination = calcDivinationProfile({
      birthDate,
      birthYear: isNaN(birthYear as number) ? null : birthYear,
    });

    return NextResponse.json({ divination });
  } catch (error) {
    console.error("占術プレビューエラー:", error);
    return NextResponse.json(
      { error: "占術計算に失敗しました" },
      { status: 500 }
    );
  }
}
